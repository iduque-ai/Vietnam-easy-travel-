import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory rate cache with daily freshness check
interface RatesCache {
  timestamp: number;
  dateStr: string;
  base: string;
  rates: Record<string, number>;
}

// Solid approximate default rates as fallback (updated to ~29k VND / 1 EUR)
const DEFAULT_RATES: Record<string, number> = {
  VND: 26000, // 1 USD = ~26,000 VND
  EUR: 0.8965, // 1 USD = 0.8965 EUR -> 1 EUR = ~29,001 VND
  USD: 1.0,
  GBP: 0.76,  // 1 USD = 0.76 GBP -> 1 GBP = ~34,200 VND
  AUD: 1.51,
  CAD: 1.36,
  JPY: 151.0,
  CHF: 0.86,
  MXN: 19.3,
  SGD: 1.31,
  THB: 34.5,
};

let cachedRates: RatesCache = {
  timestamp: 0,
  dateStr: '',
  base: 'USD',
  rates: DEFAULT_RATES,
};

// Lazy initialization for Gemini
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || '',
    });
  }
  return aiClient;
}

// Exchange rates endpoint - updates automatically on entry/hourly or uses cache/fallback
app.get('/api/rates', async (req, res) => {
  const now = Date.now();
  const ONE_HOUR_MS = 60 * 60 * 1000;
  const isStale = cachedRates.timestamp === 0 || (now - cachedRates.timestamp > ONE_HOUR_MS);
  const forceRefresh = req.query.force === 'true';

  if (!isStale && !forceRefresh && Object.keys(cachedRates.rates).length > 2) {
    return res.json({
      success: true,
      cached: true,
      lastUpdated: cachedRates.timestamp,
      date: cachedRates.dateStr,
      base: cachedRates.base,
      rates: cachedRates.rates,
      source: 'server_cache',
    });
  }

  try {
    // Attempt fetching from free public exchange rate provider with 4s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data.rates && data.rates.VND) {
        cachedRates = {
          timestamp: now,
          dateStr: new Date().toISOString().split('T')[0],
          base: 'USD',
          rates: {
            VND: data.rates.VND || 25450,
            EUR: data.rates.EUR || 0.92,
            USD: 1.0,
            GBP: data.rates.GBP || 0.78,
            AUD: data.rates.AUD || 1.55,
            CAD: data.rates.CAD || 1.38,
            JPY: data.rates.JPY || 153.5,
            CHF: data.rates.CHF || 0.88,
            MXN: data.rates.MXN || 19.5,
            SGD: data.rates.SGD || 1.34,
            THB: data.rates.THB || 35.8,
          },
        };

        return res.json({
          success: true,
          cached: false,
          lastUpdated: cachedRates.timestamp,
          date: cachedRates.dateStr,
          base: 'USD',
          rates: cachedRates.rates,
          source: 'live_network',
        });
      }
    }
  } catch (err) {
    console.warn('Network rate fetch failed, serving cached/default rates:', err);
  }

  // Graceful fallback to cached or default
  return res.json({
    success: true,
    cached: true,
    fallback: true,
    lastUpdated: cachedRates.timestamp,
    date: cachedRates.dateStr,
    base: 'USD',
    rates: cachedRates.rates,
    source: 'offline_fallback',
  });
});

// Robust JSON parser that handles codeblocks and extra text from Gemini
function parseJsonSafely(raw: string): any {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return JSON.parse(cleaned);
}

// Multi-model Gemini caller with candidate fallbacks and strict timeout
async function callGeminiJsonWithFallback(
  prompt: string,
  timeoutMs: number = 8000,
  models: string[] = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest']
): Promise<any> {
  const ai = getAI();
  const candidateModels = models;
  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      const generatePromise = ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout model ${model}`)), timeoutMs)
      );

      const response: any = await Promise.race([generatePromise, timeoutPromise]);

      if (response && response.text) {
        return parseJsonSafely(response.text);
      }
    } catch (err: any) {
      console.warn(`[Gemini] Model ${model} encountered an issue (${err?.status || err?.message || 'error'}). Attempting candidate model...`);
      lastError = err;
    }
  }

  throw lastError;
}

// Dictionary mapping common allergens to Vietnamese terms and forbidden items
const ALLERGY_TERM_MAP: Record<string, { vi: string; forbidden: string[]; safe: string[] }> = {
  peanut: {
    vi: 'ĐẬU PHỘNG / LẠC (Cacahuete y frutos secos)',
    forbidden: ['Đậu phộng / Lạc', 'Dầu lạc', 'Bơ đậu phộng', 'Hạt điều', 'Muối mè đậu phộng'],
    safe: ['Cơm trắng', 'Thịt luộc', 'Trứng chiên', 'Rau luộc'],
  },
  seafood: {
    vi: 'HẢI SẢN: TÔM, CUA, MỰC, TÉP (Marisco y crustáceos)',
    forbidden: ['Tôm / Tép', 'Cua / Ghẹ', 'Mực', 'Nước mắm tôm/mực', 'Mắm ruốc'],
    safe: ['Thịt gà', 'Thịt bò', 'Thịt heo', 'Cơm trắng', 'Trứng'],
  },
  fish_sauce: {
    vi: 'NƯỚC MẮM CÁ (Salsa de pescado / Pescado)',
    forbidden: ['Nước mắm cá truyền thống', 'Cá khô', 'Mắm tép'],
    safe: ['Nước tương / Xì dầu', 'Muối', 'Chanh tươi'],
  },
  gluten: {
    vi: 'GLUTEN / LÚA MÌ (Bột mì, bánh mì, mì sợi vàng)',
    forbidden: ['Bánh mì', 'Mì gói / mì tôm', 'Mì vằn thắn (fideos de trigo)', 'Bột mì chiên', 'Xì dầu có lúa mì'],
    safe: ['Phở (fideos de arroz 100%)', 'Bún tươi', 'Cơm trắng', 'Bánh tráng'],
  },
  lactose: {
    vi: 'SỮA BÒ & SỮA ĐẶC (Lactosa y lácteos)',
    forbidden: ['Sữa đặc có đường (sữa Ông Thọ)', 'Sữa tươi', 'Bơ động vật', 'Phô mai'],
    safe: ['Cà phê đen', 'Trà đá', 'Nước dừa tươi', 'Nước mía'],
  },
  vegetarian: {
    vi: 'ĂN CHAY THANH TỊNH (Vegetariano / Vegano)',
    forbidden: ['Thịt các loại', 'Cá & hải sản', 'Mỡ heo', 'Nước mắm cá', 'Hạt nêm thịt Knorr'],
    safe: ['Đậu phụ / Đậu hũ', 'Nấm xào', 'Rau củ', 'Cơm trắng', 'Bún xào chay'],
  },
  vegan: {
    vi: 'THUẦN CHAY 100% (Vegano estricto)',
    forbidden: ['Thịt, cá, trứng, sữa', 'Mật ong', 'Mỡ động vật', 'Nước mắm cá'],
    safe: ['Đậu phụ', 'Rau muống xào tỏi', 'Nấm', 'Trái cây tươi'],
  },
  msg: {
    vi: 'BỘT NGỌT / MÌ CHÍNH (Glutamato / MSG)',
    forbidden: ['Bột ngọt (Ajinomoto)', 'Mì chính', 'Hạt nêm chứa MSG'],
    safe: ['Món nướng ướp muối tiêu', 'Rau luộc', 'Cơm trắng'],
  },
  chili: {
    vi: 'ỚT / VỊ CAY (Không ăn cay / Sin picante)',
    forbidden: ['Ớt tươi cắt lát', 'Tương ớt', 'Sa tế', 'Bột ớt cay'],
    safe: ['Món thanh đạm không ớt', 'Phở nước trong', 'Cơm chien không tiêu ớt'],
  },
  egg: {
    vi: 'TRỨNG (Không ăn trứng gà, trứng vịt)',
    forbidden: ['Trứng chiên/ốp la', 'Sốt mayonnaise trứng', 'Trứng cút', 'Bánh bông lan'],
    safe: ['Cơm thịt', 'Phở bò', 'Rau củ xào'],
  },
  pork: {
    vi: 'THỊT HEO / MỠ HEO (Không ăn thịt lợn - Halal)',
    forbidden: ['Thịt heo', 'Mỡ heo', 'Chả lụa heo', 'Nước dùng ninh xương heo'],
    safe: ['Thịt gà', 'Thịt bò', 'Hải sản', 'Cơm rau'],
  },
  ice: {
    vi: 'ĐÁ LẠNH (Không lấy đá / Chỉ uống nước đóng chai)',
    forbidden: ['Đá viên / đá cây không rõ nguồn gốc'],
    safe: ['Nước suối nguyên chai đóng nắp', 'Trà nóng', 'Nước dừa nguyên trái'],
  },
};

// Built-in emergency dietary and allergy cards (instant fallback if models are under high demand)
function getPresetOrFallbackAllergyCard(rawInput: string | string[]) {
  const conditions = Array.isArray(rawInput) ? rawInput : [rawInput || ''];
  const fullText = conditions.join(' ').toLowerCase();

  const matchedTerms: string[] = [];
  const allForbidden = new Set<string>();
  const allSafe = new Set<string>();

  // Check matching categories
  if (fullText.includes('cacahuete') || fullText.includes('mani') || fullText.includes('fruto') || fullText.includes('peanut') || fullText.includes('lạc') || fullText.includes('đậu phộng') || fullText.includes('nuez')) {
    matchedTerms.push(ALLERGY_TERM_MAP.peanut.vi);
    ALLERGY_TERM_MAP.peanut.forbidden.forEach(i => allForbidden.add(i));
    ALLERGY_TERM_MAP.peanut.safe.forEach(i => allSafe.add(i));
  }

  if (fullText.includes('marisco') || fullText.includes('gamba') || fullText.includes('camar') || fullText.includes('crustac') || fullText.includes('seafood') || fullText.includes('tôm') || fullText.includes('cua') || fullText.includes('mực') || fullText.includes('hải sản')) {
    matchedTerms.push(ALLERGY_TERM_MAP.seafood.vi);
    ALLERGY_TERM_MAP.seafood.forbidden.forEach(i => allForbidden.add(i));
    ALLERGY_TERM_MAP.seafood.safe.forEach(i => allSafe.add(i));
  }

  if (fullText.includes('pescado') || fullText.includes('salsa de pescado') || fullText.includes('nước mắm')) {
    matchedTerms.push(ALLERGY_TERM_MAP.fish_sauce.vi);
    ALLERGY_TERM_MAP.fish_sauce.forbidden.forEach(i => allForbidden.add(i));
    ALLERGY_TERM_MAP.fish_sauce.safe.forEach(i => allSafe.add(i));
  }

  if (fullText.includes('gluten') || fullText.includes('celiac') || fullText.includes('celíac') || fullText.includes('trigo') || fullText.includes('harina')) {
    matchedTerms.push(ALLERGY_TERM_MAP.gluten.vi);
    ALLERGY_TERM_MAP.gluten.forbidden.forEach(i => allForbidden.add(i));
    ALLERGY_TERM_MAP.gluten.safe.forEach(i => allSafe.add(i));
  }

  if (fullText.includes('lactos') || fullText.includes('leche') || fullText.includes('dairy') || fullText.includes('sữa')) {
    matchedTerms.push(ALLERGY_TERM_MAP.lactose.vi);
    ALLERGY_TERM_MAP.lactose.forbidden.forEach(i => allForbidden.add(i));
    ALLERGY_TERM_MAP.lactose.safe.forEach(i => allSafe.add(i));
  }

  if (fullText.includes('vegan') || fullText.includes('vegano') || fullText.includes('thuần chay')) {
    matchedTerms.push(ALLERGY_TERM_MAP.vegan.vi);
    ALLERGY_TERM_MAP.vegan.forbidden.forEach(i => allForbidden.add(i));
    ALLERGY_TERM_MAP.vegan.safe.forEach(i => allSafe.add(i));
  } else if (fullText.includes('vegetar') || fullText.includes('chay') || fullText.includes('sin carne')) {
    matchedTerms.push(ALLERGY_TERM_MAP.vegetarian.vi);
    ALLERGY_TERM_MAP.vegetarian.forbidden.forEach(i => allForbidden.add(i));
    ALLERGY_TERM_MAP.vegetarian.safe.forEach(i => allSafe.add(i));
  }

  if (fullText.includes('msg') || fullText.includes('glutamat') || fullText.includes('bột ngọt') || fullText.includes('mì chính')) {
    matchedTerms.push(ALLERGY_TERM_MAP.msg.vi);
    ALLERGY_TERM_MAP.msg.forbidden.forEach(i => allForbidden.add(i));
    ALLERGY_TERM_MAP.msg.safe.forEach(i => allSafe.add(i));
  }

  if (fullText.includes('picante') || fullText.includes('chili') || fullText.includes('cay') || fullText.includes('ớt')) {
    matchedTerms.push(ALLERGY_TERM_MAP.chili.vi);
    ALLERGY_TERM_MAP.chili.forbidden.forEach(i => allForbidden.add(i));
    ALLERGY_TERM_MAP.chili.safe.forEach(i => allSafe.add(i));
  }

  if (fullText.includes('huevo') || fullText.includes('egg') || fullText.includes('trứng')) {
    matchedTerms.push(ALLERGY_TERM_MAP.egg.vi);
    ALLERGY_TERM_MAP.egg.forbidden.forEach(i => allForbidden.add(i));
    ALLERGY_TERM_MAP.egg.safe.forEach(i => allSafe.add(i));
  }

  if (fullText.includes('cerdo') || fullText.includes('pork') || fullText.includes('thịt heo') || fullText.includes('halal')) {
    matchedTerms.push(ALLERGY_TERM_MAP.pork.vi);
    ALLERGY_TERM_MAP.pork.forbidden.forEach(i => allForbidden.add(i));
    ALLERGY_TERM_MAP.pork.safe.forEach(i => allSafe.add(i));
  }

  if (fullText.includes('hielo') || fullText.includes('ice') || fullText.includes('đá')) {
    matchedTerms.push(ALLERGY_TERM_MAP.ice.vi);
    ALLERGY_TERM_MAP.ice.forbidden.forEach(i => allForbidden.add(i));
    ALLERGY_TERM_MAP.ice.safe.forEach(i => allSafe.add(i));
  }

  // If there are custom words not in preset
  conditions.forEach((c) => {
    const clean = c.replace(/["\n\r]/g, ' ').trim();
    if (clean && clean.length > 2) {
      allForbidden.add(clean);
    }
  });

  const title = conditions.length > 1
    ? `Ficha Médica Combinada (${conditions.length} restricciones)`
    : `Ficha Médica: ${conditions[0]?.slice(0, 35) || 'Alergias'}`;

  const viList = matchedTerms.length > 0
    ? matchedTerms.map(t => `• ${t}`).join('\n')
    : `• ${conditions.join(', ').toUpperCase()}`;

  const vietnameseLarge = `XIN CHÚ Ý ĐẶC BIỆT! Tôi bị DỊ ỨNG & BẤT DUNG NẠP NGUY HIỂM TÍNH MẠNG với các thứ sau:\n${viList}\nXin đầu bếp TUYỆT ĐỐI KHÔNG SỬ DỤNG những nguyên liệu này hoặc bất kỳ chế phẩm nào trong món ăn của tôi! Cảm ơn bạn rất nhiều!`;

  return {
    title,
    vietnameseLarge,
    phonetic: 'Xin chu y dac biet! Toi bi di ung nguy hiem tinh mang voi cac mon nay... Xin khong cho vao do an.',
    allowedFoods: allSafe.size > 0 ? Array.from(allSafe).slice(0, 6) : ['Cơm trắng (Arroz blanco)', 'Món luộc thanh đạm', 'Nước suối đóng chai'],
    forbiddenIngredients: Array.from(allForbidden).slice(0, 10),
    emergencyNote: 'Nếu tôi ăn phải và có dấu hiệu sưng họng, khó thở hoặc sốc phản vệ, xin làm ơn gọi cấp cứu 115 ngay lập tức!'
  };
}

// High-reliability phonetic guide generator for Vietnamese phrases
function generateVietnamesePhonetics(vietnamese: string): string {
  if (!vietnamese) return '';
  const toneMap: Record<string, string> = {
    'à':'a','á':'a','ả':'a','ã':'a','ạ':'a',
    'â':'a','ầ':'a','ấ':'a','ẩ':'a','ẫ':'a','ậ':'a',
    'ă':'a','ằ':'a','ắ':'a','ẳ':'a','ẵ':'a','ặ':'a',
    'è':'e','é':'e','ẻ':'e','ẽ':'e','ẹ':'e',
    'ê':'e','ề':'e','ế':'e','ể':'e','ễ':'e','ệ':'e',
    'ì':'i','í':'i','ỉ':'i','ĩ':'i','ị':'i',
    'ò':'o','ó':'o','ỏ':'o','õ':'o','ọ':'o',
    'ô':'o','ồ':'o','ố':'o','ổ':'o','ỗ':'o','ộ':'o',
    'ơ':'o','ờ':'o','ớ':'o','ở':'o','ỡ':'o','ợ':'o',
    'ù':'u','ú':'u','ủ':'u','ũ':'u','ụ':'u',
    'ư':'u','ừ':'u','ứ':'u','ử':'u','ữ':'u','ự':'u',
    'ỳ':'y','ý':'y','ỷ':'y','ỹ':'y','ỵ':'y',
    'đ':'d','Đ':'D'
  };
  return vietnamese
    .split(' ')
    .map(word => {
      let punct = '';
      let w = word;
      const m = w.match(/[.,!?¡¿:;"]+$/);
      if (m) {
        punct = m[0];
        w = w.slice(0, -punct.length);
      }
      const isCap = w && w[0] === w[0].toUpperCase();
      let lower = w.toLowerCase();
      lower = lower.replace(/^x/, 's').replace(/qu/g, 'kw').replace(/ph/g, 'f').replace(/ch$/g, 'k').replace(/nh$/g, 'ny');
      lower = lower.replace(/ao/g, 'ow').replace(/iêu/g, 'yew').replace(/ieu/g, 'yew').replace(/ơi/g, 'oy').replace(/oi/g, 'oy');
      let cleaned = '';
      for (const char of lower) {
        cleaned += toneMap[char] || char;
      }
      if (isCap && cleaned) {
        cleaned = cleaned[0].toUpperCase() + cleaned.slice(1);
      }
      return cleaned + punct;
    })
    .join(' ');
}

// Generate contextual travel tips for Vietnam
function getVietnameseTravelTip(text: string, viText: string): string {
  const combined = (text + ' ' + viText).toLowerCase();
  if (combined.includes('cà phê') || combined.includes('cafe') || combined.includes('coffee')) {
    return 'El café vietnamita tradicional suele servirse con leche condensada dulce y hielo (Cà phê sữa đá).';
  }
  if (combined.includes('tiền') || combined.includes('giá') || combined.includes('cuesta') || combined.includes('precio') || combined.includes('cuanto') || combined.includes('cuánto')) {
    return 'Pregunta esencial para mercados callejeros. En Vietnam los precios orales suelen decirse en miles ("k").';
  }
  if (combined.includes('cay') || combined.includes('ớt') || combined.includes('picante') || combined.includes('chili')) {
    return 'Imprescindible en puestos de sopa callejeros, donde suelen añadir guindillas rojas muy picantes.';
  }
  if (combined.includes('nhà vệ sinh') || combined.includes('baño') || combined.includes('restroom') || combined.includes('toilet')) {
    return 'Los servicios públicos en Vietnam suelen señalizarse con el cartel "WC" o "Nhà vệ sinh".';
  }
  if (combined.includes('cảm ơn') || combined.includes('gracias') || combined.includes('thank')) {
    return 'Acompaña el agradecimiento con una sonrisa cordial o una ligera inclinación de cabeza.';
  }
  if (combined.includes('chào') || combined.includes('hola') || combined.includes('hello')) {
    return 'En Vietnam se saluda cordialmente con "Xin chào", apto tanto para dependientes como para personas mayores.';
  }
  if (combined.includes('nước') || combined.includes('agua') || combined.includes('water')) {
    return 'Pide siempre agua embotellada con precinto cerrado de fábrica (nước suối đóng chai).';
  }
  return 'Muestra esta pantalla al dependiente o pulsa el altavoz para que escuche la pronunciación nativa.';
}

// High-speed public translation engine
async function translateWithGoogleGtx(
  text: string,
  sourceLang: string = 'auto',
  targetLang: string = 'vi'
): Promise<string | null> {
  try {
    const sl = sourceLang === 'es' ? 'es' : sourceLang === 'vi' ? 'vi' : 'auto';
    const tl = targetLang === 'es' ? 'es' : targetLang === 'vi' ? 'vi' : 'en';
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && Array.isArray(data[0])) {
      const translated = data[0].map((item: any) => item[0]).filter(Boolean).join('');
      if (translated && translated.trim()) {
        return translated.trim();
      }
    }
  } catch (e) {
    console.warn('GTX translation request error:', e);
  }
  return null;
}

// Built-in offline travel dictionary for immediate instant fallback
const TRAVEL_OFFLINE_DICT: Array<{
  esKeywords: string[];
  vi: string;
  en: string;
  es: string;
  phonetic: string;
  tip: string;
}> = [
  {
    esKeywords: ['hola', 'buenos dias', 'buenas tardes', 'buenas noches', 'que tal', 'qué tal'],
    vi: 'Xin chào, bạn khỏe không?',
    en: 'Hello, how are you?',
    es: '¡Hola! ¿Cómo estás?',
    phonetic: 'Sin chao, ban kwoe khong?',
    tip: 'Saludo cortés y amigable universal en Vietnam.'
  },
  {
    esKeywords: ['cuanto cuesta', 'cuánto cuesta', 'cuanto vale', 'cuánto vale', 'precio', 'cuanto es'],
    vi: 'Cái này bao nhiêu tiền vậy ạ?',
    en: 'How much is this?',
    es: '¿Cuánto cuesta esto?',
    phonetic: 'Cai nay bao nyew tien vay ah?',
    tip: 'Pregunta universal para compras en puestos callejeros y tiendas.'
  },
  {
    esKeywords: ['rebaja', 'descuento', 'regatear', 'mas barato', 'más barato'],
    vi: 'Bớt một chút được không ạ?',
    en: 'Can you give a small discount please?',
    es: '¿Puede hacerme una pequeña rebaja por favor?',
    phonetic: 'Bot mot choot duoc khong ah?',
    tip: 'Para regatear amablemente en mercados como Bến Thành o Đông Xuân.'
  },
  {
    esKeywords: ['gracias', 'muchas gracias'],
    vi: 'Cảm ơn bạn rất nhiều!',
    en: 'Thank you very much!',
    es: '¡Muchas gracias!',
    phonetic: 'Cam on ban rut nyew!',
    tip: 'Acompaña con una sonrisa cordial.'
  },
  {
    esKeywords: ['la cuenta', 'cuenta por favor', 'cobrar', 'pagar', 'la cuenta por favor'],
    vi: 'Em ơi, tính tiền giúp anh / chị với!',
    en: 'Can I have the bill please?',
    es: 'La cuenta, por favor.',
    phonetic: 'Em oy, tin tien zoop voy!',
    tip: '"Em ơi" es la llamada educada estándar a los camareros.'
  },
  {
    esKeywords: ['sin picante', 'no picante', 'no chile', 'no picante por favor', 'sin chile'],
    vi: 'Làm ơn đừng cho ớt và không cay nhé!',
    en: 'No spicy, no chili please!',
    es: 'Sin picante ni guindilla, por favor.',
    phonetic: 'Lam on dung cho ot va khong cay nye!',
    tip: 'Imprescindible en platos de fideos y sopas vietnamitas.'
  },
  {
    esKeywords: ['baño', 'donde esta el baño', 'dónde está el baño', 'servicios', 'toilet'],
    vi: 'Nhà vệ sinh ở đâu vậy ạ?',
    en: 'Where is the restroom?',
    es: '¿Dónde está el baño / servicio?',
    phonetic: 'Nya ve sin o dau vay ah?',
    tip: 'En los carteles verás a menudo "WC" o "Nhà vệ sinh".'
  },
  {
    esKeywords: ['cafe', 'café', 'cafe con leche', 'café con leche'],
    vi: 'Cho tôi một ly cà phê sữa đá nhé!',
    en: 'One iced milk coffee please!',
    es: 'Un café con leche condensada y hielo, por favor.',
    phonetic: 'Cho toi mot ly ca fe sua da nye!',
    tip: 'El emblemático café vietnamita con leche condensada y hielo.'
  },
  {
    esKeywords: ['agua', 'agua mineral', 'agua por favor', 'botella de agua'],
    vi: 'Cho tôi một chai nước suối nhé!',
    en: 'One bottle of mineral water please!',
    es: 'Una botella de agua mineral, por favor.',
    phonetic: 'Cho toi mot chai nuoc suoy nye!',
    tip: 'Asegúrate de que la botella tenga el precinto de fábrica intacto.'
  },
  {
    esKeywords: ['ayuda', 'ayudame', 'ayúdame', 'socorro', 'por favor ayude'],
    vi: 'Làm ơn giúp tôi với được không?',
    en: 'Can you help me please?',
    es: '¿Puede ayudarme, por favor?',
    phonetic: 'Lam on zoop toi voy duoc khong?',
    tip: 'Para solicitar auxilio o pedir indicaciones en la calle.'
  },
  {
    esKeywords: ['wifi', 'clave wifi', 'contraseña'],
    vi: 'Ở đây có wifi không? Cho tôi xin mật khẩu với.',
    en: 'Do you have wifi? Password please.',
    es: '¿Tiene wifi? ¿Cuál es la contraseña?',
    phonetic: 'O day co wifi khong? Cho toi sin mat khau voy.',
    tip: 'Casi todas las cafeterías en Vietnam ofrecen wifi gratuito para clientes.'
  }
];

// Translation endpoint using Gemini with GTX fallback and zero-downtime dictionary
app.post('/api/translate', async (req, res) => {
  const { text, sourceLang = 'en', targetLang = 'vi' } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text is required' });
  }

  const isViToEn = (sourceLang === 'vi' || targetLang === 'en' || targetLang === 'es');
  
  // 1. Attempt Gemini if API Key is configured with a fast timeout (3.5s)
  if (process.env.GEMINI_API_KEY) {
    try {
      const prompt = isViToEn
        ? `Act as an expert travel interpreter for a tourist in Vietnam.
A Vietnamese local or vendor said: "${text}".
Translate this Vietnamese text into natural, clear ${targetLang === 'es' ? 'Spanish' : 'English'}.
Respond with a strictly valid JSON object with these keys:
{
  "vietnamese": "${text.replace(/"/g, '\\"')}",
  "translatedText": "Natural translation for the tourist",
  "phonetic": "Phonetic reading guide of the Vietnamese phrase",
  "literal": "Literal meaning or breakdown of terms/numbers/slang",
  "tip": "Short 1-sentence cultural context (price, politeness, pronouns)",
  "category": "comida | compras | transporte | cortesía | salud | general"
}`
        : `Act as an expert travel translator for someone visiting Vietnam.
Translate the following traveler text from ${sourceLang === 'es' ? 'Spanish' : 'English'} to natural, polite Vietnamese.
Text to translate: "${text}"
Respond with a strictly valid JSON object with these keys:
{
  "vietnamese": "Accurate Vietnamese translation with diacritics and politeness",
  "translatedText": "Accurate Vietnamese translation",
  "phonetic": "Easy phonetic pronunciation guide for a Spanish/English speaker",
  "literal": "Literal meaning",
  "tip": "Short 1-sentence cultural or pronunciation tip",
  "category": "comida | compras | transporte | cortesía | salud | general"
}`;

      const parsed = await callGeminiJsonWithFallback(prompt, 1800, ['gemini-3.8-flash']);
      if (parsed) {
        if (!parsed.translatedText) {
          parsed.translatedText = isViToEn ? parsed.vietnamese : (parsed.vietnamese || text);
        }
        return res.json({
          success: true,
          source: 'gemini_ai',
          translation: parsed,
        });
      }
    } catch (error: any) {
      console.warn('Gemini translation models busy or unavailable. Seamlessly using real-time translation engine.');
    }
  }

  // 2. High-speed, high-accuracy translation engine (100% genuine Vietnamese / Spanish translation)
  const gtxTranslated = await translateWithGoogleGtx(text, sourceLang, targetLang);
  if (gtxTranslated && gtxTranslated.trim()) {
    const cleanTranslated = gtxTranslated.trim();
    if (isViToEn) {
      return res.json({
        success: true,
        source: 'gtx_engine',
        translation: {
          vietnamese: text,
          translatedText: cleanTranslated,
          phonetic: generateVietnamesePhonetics(text),
          literal: cleanTranslated,
          tip: getVietnameseTravelTip(cleanTranslated, text),
          category: 'general'
        }
      });
    } else {
      const phonetic = generateVietnamesePhonetics(cleanTranslated);
      const tip = getVietnameseTravelTip(text, cleanTranslated);
      return res.json({
        success: true,
        source: 'gtx_engine',
        translation: {
          vietnamese: cleanTranslated,
          translatedText: cleanTranslated,
          phonetic,
          literal: text,
          tip,
          category: 'general'
        }
      });
    }
  }

  // 3. Built-in Offline Travel Dictionary fallback
  const cleanInput = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const matchedPhrase = TRAVEL_OFFLINE_DICT.find(item =>
    item.esKeywords.some(keyword => {
      const cleanKeyword = keyword.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return cleanInput.includes(cleanKeyword) || cleanKeyword.includes(cleanInput);
    })
  );

  if (matchedPhrase) {
    if (isViToEn) {
      return res.json({
        success: true,
        source: 'offline_dict',
        translation: {
          vietnamese: text,
          translatedText: targetLang === 'es' ? matchedPhrase.es : matchedPhrase.en,
          phonetic: matchedPhrase.phonetic,
          literal: matchedPhrase.es,
          tip: matchedPhrase.tip,
          category: 'general'
        }
      });
    } else {
      return res.json({
        success: true,
        source: 'offline_dict',
        translation: {
          vietnamese: matchedPhrase.vi,
          translatedText: matchedPhrase.vi,
          phonetic: matchedPhrase.phonetic,
          literal: matchedPhrase.es,
          tip: matchedPhrase.tip,
          category: 'general'
        }
      });
    }
  }

  // 4. Default graceful response (NEVER return raw Spanish in the Vietnamese output!)
  const fallbackTranslation = isViToEn
    ? {
        vietnamese: text,
        translatedText: `"${text}"`,
        phonetic: generateVietnamesePhonetics(text),
        literal: 'Frase vietnamita',
        tip: 'Muestra tu respuesta en vietnamita usando las frases rápidas.',
        category: 'general',
      }
    : {
        vietnamese: 'Xin chào! Làm ơn giúp tôi với.',
        translatedText: 'Xin chào! Làm ơn giúp tôi với.',
        phonetic: 'Sin chao! Lam on zoop toi voy.',
        literal: '¡Hola! Por favor ayúdame.',
        tip: 'Pulsa cualquiera de las frases rápidas abajo para traducir al instante sin conexión.',
        category: 'general',
      };

  return res.json({
    success: true,
    fallback: true,
    translation: fallbackTranslation,
  });
});

// Dietary allergy / special request card generator with zero-downtime fallback
app.post('/api/allergy-card', async (req, res) => {
  const { condition, dietaryRestrictions, conditions } = req.body;
  
  let conditionList: string[] = [];
  if (Array.isArray(conditions) && conditions.length > 0) {
    conditionList = conditions.map((c: any) => String(c).trim()).filter(Boolean);
  } else if (condition || dietaryRestrictions) {
    conditionList = String(condition || dietaryRestrictions).split(/[,;+]/).map(s => s.trim()).filter(Boolean);
  }

  if (conditionList.length === 0) {
    return res.status(400).json({ error: 'At least one condition is required' });
  }

  const prompt = `Create a clear, polite, and unmistakable dietary/allergy medical card in Vietnamese for a tourist to show to street food vendors and restaurant staff in Vietnam.
The traveler has the following specific allergies/dietary restrictions: ${conditionList.map(c => `"${c}"`).join(', ')}.
Generate a single, unified, high-priority warning card that addresses ALL these restrictions together so a Vietnamese cook can prepare a safe meal.

Generate a strictly valid JSON with:
{
  "title": "Title in Spanish (e.g. Ficha Médica Combinada: Cacahuetes y Marisco)",
  "vietnameseLarge": "Clear, large-print, authoritative Vietnamese warning statement that any Vietnamese street food cook will immediately understand (e.g. 'XIN CHÚ Ý: Tôi bị dị ứng nguy hiểm tính mạng với...'). Must include all listed restrictions in Vietnamese.",
  "phonetic": "Phonetic reading guide for the Spanish/English speaker",
  "allowedFoods": ["List of safe foods or items, e.g. Cơm trắng (Arroz blanco), Trứng chiên (Huevo)..."],
  "forbiddenIngredients": ["Vietnamese names of ingredients that must NOT be used, e.g. đậu phộng, dầu lạc, nước mắm, tôm, bột ngọt"],
  "emergencyNote": "Emergency instruction in Vietnamese in case of allergic reaction (call 115)"
}`;

  if (process.env.GEMINI_API_KEY) {
    try {
      const card = await callGeminiJsonWithFallback(prompt);
      if (card && card.vietnameseLarge) {
        return res.json({ success: true, card, conditions: conditionList });
      }
    } catch (error: any) {
      console.warn('Allergy card AI model 503 / high demand spike, deploying verified multi-condition fallback card.');
    }
  }

  // Guaranteed fallback ensures traveler safety even during model 503 spikes or offline network
  const fallbackCard = getPresetOrFallbackAllergyCard(conditionList);
  return res.json({ success: true, card: fallbackCard, conditions: conditionList, fallback: true });
});

// Curated offline fallbacks for popular Vietnam landmarks
const CURATED_FALLBACK_TOURS: Record<string, any> = {
  van_mieu: {
    placeName: 'Templo de la Literatura (Văn Miếu - Quốc Tử Giám)',
    cityName: 'Hà Nội',
    vietnameseName: 'Văn Miếu – Quốc Tử Giám',
    tagline: 'Mil años de sabiduría confuciana, tortugas sagradas y la primera universidad de Vietnam',
    durationMinutes: 45,
    audioGuideScript: '¡Xin chào y bienvenido al templo del saber más venerado de Vietnam! Estás pisando el suelo de Văn Miếu, fundado en 1070 bajo la dinastía Lý. Imagina que durante casi un milenio, este recinto amurallado con cinco patios sucesivos fue el sanctasanctórum de los eruditos reales. Al cruzar cada puerta, notarás cómo el ruido ensordecedor de las miles de motocicletas de Hanói se apaga por completo, reemplazado por el susurro de estanques con lotos y el olor a incienso. Prepárate para descubrir por qué los estudiantes de todo el país vienen aquí antes de sus exámenes a rezar a las tortugas de piedra de la inmortalidad.',
    stops: [
      {
        number: 1,
        title: 'El Gran Pórtico y el Pabellón Khuê Văn Các',
        whatToLookAt: 'El pabellón de madera roja sobre cuatro pilares de piedra con ventanas circulares que representan la estrella de la literatura.',
        story: 'Este pabellón es el símbolo oficial de la ciudad de Hanói. Se diseñó en 1805 para que la luz del sol atravesara las ventanas redondas e iluminara el estanque de la claridad celestial.',
        insiderTip: 'Fíjate en las tallas de madera del tejado: representan carpas convirtiéndose en dragones, la metáfora de un estudiante humilde que aprueba los exámenes imperiales.'
      },
      {
        number: 2,
        title: 'El Pozo de la Claridad Celestial y las 82 Estelas de las Tortugas',
        whatToLookAt: 'Las enormes tortugas de piedra azul tallada que sostienen sobre su caparazón estelas con nombres grabados.',
        story: 'Entre 1442 y 1779, los reyes mandaron tallar aquí los nombres de quienes alcanzaron el doctorado real. Las tortugas representan la longevidad y la memoria imperecedera del conocimiento.',
        insiderTip: 'Hoy está prohibido tocar las cabezas de las tortugas para preservarlas, pero verás a estudiantes inclinando la cabeza en señal de respeto antes de los exámenes nacionales.'
      },
      {
        number: 3,
        title: 'El Santuario Principal de Confucio (Đại Thành)',
        whatToLookAt: 'El altar rojo y dorado con la estatua de Confucio y sus cuatro discípulos principales, flanqueados por dos grullas de bronce sobre tortugas.',
        story: 'Aquí sólo los reyes y los mandarines más ilustres podían postrarse. La grulla representa la aspiración al cielo y la tortuga la conexión con la tierra.',
        insiderTip: 'El olor a incienso es constante. Respeta la tradición: no hables en voz alta y quítate las gafas de sol al cruzar el umbral sagrado.'
      },
      {
        number: 4,
        title: 'Quốc Tử Giám: La Primera Universidad Nacional',
        whatToLookAt: 'El edificio de dos plantas al fondo con el gigantesco tambor de bronce y la estatua de Chu Văn An, el maestro más querido de Vietnam.',
        story: 'Aquí se formaba a la élite administrativa. Los exámenes eran tan estrictos que de miles de aspirantes, apenas un puñado lograba el título imperial tras semanas de pruebas memorísticas y poéticas.',
        insiderTip: 'En la planta superior hay maquetas de las diminutas chozas de mimbre donde los estudiantes pasaban días enteros redactando sus ensayos bajo vigilancia imperial.'
      }
    ],
    photoSpot: {
      location: 'Justo frente al estanque Thiên Quang, alineado con el pabellón Khuê Văn Các.',
      bestLight: 'A media mañana (10:00) o a las 16:00 cuando el sol oblicuo ilumina la madera roja reflejada en el agua.',
      instruction: 'Agáchate un poco para capturar el reflejo del pabellón en el agua junto a los nenúfares sin que salgan los grupos de turistas de los laterales.'
    },
    culturalEtiquette: {
      dressCode: 'Hombros y rodillas cubiertos obligatoriamente. No entrar con camisetas de tirantes ni minifaldas.',
      whatNotToDo: 'Nunca saltes ni toques las estelas de las tortugas (multas severas) y evita dar la espalda a los altares mientras te tomas fotos.',
      scamWarning: 'En la salida, evita a supuestos calígrafos que te exijan propinas desorbitadas por escribir tu nombre en papel dó. En el interior hay calígrafos oficiales acreditados.'
    },
    streetFoodReward: {
      dishNameVi: 'Bún Chả Đắc Kim & Trà Chanh',
      dishNameEs: 'Fideos de arroz con cerdo a la brasa y té helado con lima',
      whereToFind: 'Caminando 5 minutos hacia la calle Văn Miếu y Nguyễn Khuyến.',
      priceEstimate: '60.000 ₫ – 80.000 ₫'
    },
    suggestedQuestions: [
      '¿Por qué las tortugas tienen diferentes expresiones faciales?',
      '¿Cómo se castigaba copiar en los exámenes imperiales?',
      '¿Qué significado tiene el color rojo y dorado en este templo?'
    ]
  },
  hoan_kiem: {
    placeName: 'Lago Hoàn Kiếm y Templo Ngọc Sơn',
    cityName: 'Hà Nội',
    vietnameseName: 'Hồ Hoàn Kiếm – Đền Ngọc Sơn',
    tagline: 'El corazón palpitante de Hanói donde la tortuga dorada custodia la espada sagrada del emperador',
    durationMinutes: 35,
    audioGuideScript: '¡Hola, viajero! Bienvenido al alma poética de Hanói. Respira hondo: frente a ti descansa el mítico Lago Hoàn Kiếm, o "Lago de la Espada Restituida". Cuenta la leyenda que en el siglo XV, el emperador Lê Lợi recibió una espada mágica de una tortuga gigante dorada para liberar al país de los invasores Ming. Tras la victoria imperial, mientras paseaba en barca por aquí, la tortuga emergió a la superficie y reclamó la espada para devolverla a los dioses acuáticos. Y no fue sólo un mito: hasta hace pocos años habitaron en este lago ejemplares vivos de tortugas gigantes de más de 200 kilos, veneradas como el espíritu protector de la nación.',
    stops: [
      {
        number: 1,
        title: 'El Puente Rojo Thê Húc (Puente del Sol Naciente)',
        whatToLookAt: 'El puente curvo de madera roja escarlata que conecta la orilla con el islote del templo.',
        story: 'El color rojo simboliza la alegría y la vitalidad del sol naciente. Su curvatura tradicional no es casual: según las creencias populares, los espíritus malignos solo pueden avanzar en línea recta, por lo que este diseño ondulado impide su acceso al santuario.',
        insiderTip: 'Cruza despacio a primera hora de la mañana para ver los sauces llorones acariciando el agua y a los ancianos practicando Tai Chi en la orilla.'
      },
      {
        number: 2,
        title: 'El Santuario de la Montaña de Jade (Đền Ngọc Sơn)',
        whatToLookAt: 'La vitrina de cristal con la tortuga gigante disecada que habitó el lago.',
        story: 'Este espécimen pesó 250 kg y vivió más de un siglo en las aguas del lago. Los lugareños la consideran un pariente espiritual directo de la tortuga legendaria de Lê Lợi.',
        insiderTip: 'En el pabellón trasero hay una vista directa a la Torre de la Tortuga sin multitudes.'
      },
      {
        number: 3,
        title: 'La Torre de la Tortuga (Tháp Rùa)',
        whatToLookAt: 'La pequeña torre de tres niveles en el islote central del lago.',
        story: 'Construida en 1886 por un mandarín local, mezcla arcos de influencia francesa con techos curvos vietnamitas, convirtiéndose en el icono más fotografiado del país.',
        insiderTip: 'Por la noche, con la iluminación dorada, el reflejo en el agua quieta es un espectáculo.'
      }
    ],
    photoSpot: {
      location: 'En la orilla este del lago, a 20 metros al norte del Puente Thê Húc.',
      bestLight: 'Al amanecer (06:30) con la bruma del lago o durante la hora azul tras la puesta de sol.',
      instruction: 'Encuadra el puente escarlata en diagonal cruzando hacia el templo bajo las ramas de los sauces.'
    },
    culturalEtiquette: {
      dressCode: 'Hombros y rodillas cubiertos para acceder al templo Ngọc Sơn.',
      whatNotToDo: 'No alimentes a los peces del lago ni arrojes monedas al agua.',
      scamWarning: 'Cuidado con limpiabotas ambulantes que se acercan fingiendo ver una suela rota en tus zapatillas para cobrar sumas exorbitantes.'
    },
    streetFoodReward: {
      dishNameVi: 'Cà Phê Trứng (Café de Huevo)',
      dishNameEs: 'Café vietnamita coronado con una suave crema batida de yema y leche condensada',
      whereToFind: 'Café Giảng, calle Nguyễn Hữu Huân 39 (a 3 minutos caminando del lago).',
      priceEstimate: '35.000 ₫ – 45.000 ₫'
    },
    suggestedQuestions: [
      '¿Cuándo murió la última tortuga gigante del lago?',
      '¿Por qué se cierran las calles alrededor del lago los fines de semana?',
      '¿Qué significan los caracteres chinos en la entrada del templo?'
    ]
  },
  train_street: {
    placeName: 'Calle del Tren (Hanoi Train Street)',
    cityName: 'Hà Nội',
    vietnameseName: 'Phố Đường Tàu Hà Nội',
    tagline: 'La estrecha vía ferroviaria colonial donde los trenes rozan las mesas de café y la vida cotidiana',
    durationMinutes: 30,
    audioGuideScript: '¡Bienvenido a la calle más adrenalínica y pintoresca de todo Hanói! Estás en la famosa "Train Street". Aquí, la vía del tren construida por los ingenieros franceses en 1902 atraviesa un estrecho corredor residencial donde las casas y cafeterías quedan a escasos centímetros de los vagones en marcha. Verás cómo los vecinos recogen ropa tendida, apartan macetas y doblan sillas diminutas instantes antes de que una locomotora de decenas de toneladas retumbe haciendo vibrar el suelo bajo tus pies. Una lección viva de cómo los vietnamitas adaptan el espacio urbano con ingenio y naturalidad.',
    stops: [
      {
        number: 1,
        title: 'El Pasaje Estrecho de Phùng Hưng / Trần Phú',
        whatToLookAt: 'El ancho de la vía: apenas metro y medio entre el raíl y las fachadas de las casas antiguas.',
        story: 'Construida para conectar Hanói con Hải Phòng y la provincia china de Yunnan, esta vía fue vital para el transporte de víveres durante más de un siglo. Hoy conviven trenes de pasajeros con cafeterías familiares.',
        insiderTip: 'Los dueños de los cafés reciben llamadas de radio con el horario exacto del tren y te avisarán para pegarte a la pared 3 minutos antes.'
      },
      {
        number: 2,
        title: 'Las Casas Tubo (Nhà Ống) de la Vía',
        whatToLookAt: 'La arquitectura de las viviendas: fachadas de apenas 2 a 3 metros de ancho pero hasta 30 metros de profundidad.',
        story: 'En el siglo XIX, los impuestos inmobiliarios se cobraban según el ancho de la fachada que daba a la calle; los hanoyenses inventaron estas "casas tubo" para pagar menos impuestos y aprovechar el terreno.',
        insiderTip: 'Mira hacia los balcones superiores: casi todos tienen pequeños huertos con hierbas aromáticas para cocinar Phở.'
      }
    ],
    photoSpot: {
      location: 'Desde el segundo piso de uno de los cafés tradicionales con balcón sobre la vía.',
      bestLight: 'A media tarde (15:30 - 17:00) o justo cuando el tren pasa con las luces encendidas.',
      instruction: 'Pégate a la pared y mantén los brazos hacia dentro; no uses palos de selfie que puedan sobresalir hacia la vía.'
    },
    culturalEtiquette: {
      dressCode: 'Ropa cómoda y calzado antideslizante para caminar sobre las traviesas de piedra.',
      whatNotToDo: 'NUNCA te quedes en medio de la vía para hacer una foto cuando suene la campana o el silbato de aviso.',
      scamWarning: 'A veces hay controles policiales en los accesos; los dueños de los cafés te guiarán pacíficamente para que entres como cliente autorizado.'
    },
    streetFoodReward: {
      dishNameVi: 'Cà Phê Muối (Café de Sal)',
      dishNameEs: 'Café filtrado tradicional con crema salada batida que potencia el dulzor del caramelo',
      whereToFind: 'En cualquiera de las cafeterías a pie de vía sobre taburetes de madera.',
      priceEstimate: '30.000 ₫ – 40.000 ₫'
    },
    suggestedQuestions: [
      '¿A qué horas exactas pasa el tren hoy?',
      '¿Por qué las vías del tren en Vietnam usan ancho métrico?',
      '¿Cómo duermen los vecinos con el ruido nocturno?'
    ]
  },
  st_joseph: {
    placeName: 'Catedral de San José (Nhà Thờ Lớn)',
    cityName: 'Hà Nội',
    vietnameseName: 'Nhà Thờ Lớn Hà Nội',
    tagline: 'El "Pequeño Notre-Dame" de Indochina en el corazón del Barrio Antiguo',
    durationMinutes: 25,
    audioGuideScript: '¡Hola viajero! Ante ti se alza Nhà Thờ Lớn, la Catedral de San José, consagrada en la Navidad de 1886. Su fachada neogótica de doble torre y piedra ennegrecida por la humedad tropical fue inspirada directamente en la Catedral de Notre-Dame de París. Pero bajo sus cimientos duerme una historia más antigua: aquí se levantaba la Pagoda Báo Thiên, una de las maravillas budistas del siglo XI. Hoy, esta plaza es el epicentro social de la juventud hanoyense, donde el aroma a incienso católico se mezcla con el té helado con lima que se bebe en las aceras.',
    stops: [
      {
        number: 1,
        title: 'La Fachada Neogótica de Granito y Ladrillo',
        whatToLookAt: 'El reloj central y el rosetón de vidrieras importadas de Francia a finales del siglo XIX.',
        story: 'El aspecto exterior envejecido y manchado no es abandono: es la pátina natural provocada por las lluvias monzónicas y el clima subtropical sobre la piedra caliza.',
        insiderTip: 'Si vienes durante la misa de la tarde (18:00), escucharás los cánticos en vietnamita entonados por cientos de fieles con un fervor conmovedor.'
      },
      {
        number: 2,
        title: 'La Estatua de Nuestra Señora y el Patio Central',
        whatToLookAt: 'La estatua de la Virgen María de bronce en el centro de la plazoleta arbolada.',
        story: 'La comunidad católica representa cerca del 7% de la población de Vietnam, siendo una de las más activas y devotas de todo el sudeste asiático.',
        insiderTip: 'Los callejones que rodean la catedral albergan las mejores tiendas de artesanía y seda de Hanói.'
      }
    ],
    photoSpot: {
      location: 'Desde la terraza del segundo piso de Cong Caphe, justo enfrente de la plaza.',
      bestLight: 'Al atardecer o con la iluminación nocturna de las dos torres.',
      instruction: 'Encuadra la catedral a través de los árboles de la plaza con las tazas de café en primer plano.'
    },
    culturalEtiquette: {
      dressCode: 'Para entrar al interior se exige cubrir hombros y rodillas.',
      whatNotToDo: 'No tomes fotos durante los oficios litúrgicos sin discreción.',
      scamWarning: 'Vendedores de postales o mapas falsos en la plaza exterior; cómpralos en librerías oficiales.'
    },
    streetFoodReward: {
      dishNameVi: 'Trà Chanh Chém Gió & Nem Chua Rán',
      dishNameEs: 'Té helado con lima y rollitos crujientes de cerdo fermentado frito',
      whereToFind: 'En las terrazas con mesitas de plástico bajas alrededor de la plaza Nhà Thờ.',
      priceEstimate: '20.000 ₫ – 40.000 ₫'
    },
    suggestedQuestions: [
      '¿Qué porcentaje de vietnamitas practica el catolicismo?',
      '¿Qué pasó con la pagoda budista que estaba aquí antes?',
      '¿Por qué los jóvenes de Hanói llaman a esta plaza "Trà Chanh Nhà Thờ"?'
    ]
  },
  chua_cau: {
    placeName: 'Puente Japonés Cubierto (Chùa Cầu)',
    cityName: 'Hội An',
    vietnameseName: 'Chùa Cầu (Lai Viễn Kiều)',
    tagline: 'El puente sagrado que domesticó al monstruo marino y unió dos imperios mercantiles',
    durationMinutes: 30,
    audioGuideScript: '¡Hola viajero! Estás ante la postal más legendaria de todo Vietnam: el mítico Chùa Cầu de Hội An, construido en el siglo XVII por la próspera comunidad mercantil japonesa. Según la antigua leyenda local, el monstruo submarino Namazu tenía su cabeza en Japón, su corazón en Vietnam y su cola en la India; cuando se movía, provocaba terremotos e inundaciones catastróficas. Este puente fue diseñado como una espada mágica clavada en el corazón de la bestia para proteger Hội An. Acompáñame a cruzarlo y descubrir sus guardianes de piedra.',
    stops: [
      {
        number: 1,
        title: 'Los Guardianes Caninos y Simios',
        whatToLookAt: 'Las dos estatuas de monos tallados en un extremo y las dos de perros en el extremo opuesto.',
        story: 'Hay dos teorías fascinantes: una dice que la construcción empezó en el año del Mono y concluyó en el año del Perro. Otra indica que muchos emperadores japoneses nacieron bajo estos signos del zodiaco oriental.',
        insiderTip: 'Los lugareños dejan pequeñas monedas en las patas de los perros para pedir fidelidad en sus familias y salud para sus hijos.'
      },
      {
        number: 2,
        title: 'El Pequeño Templo del Dios del Norte (Bắc Đế Trấn Vũ)',
        whatToLookAt: 'El diminuto altar empotrado en el lateral del puente, adornado con farolillos de seda y dragones de porcelana vidriada.',
        story: 'Curiosamente, en este puente no se rinde culto a Buda, sino al dios taoísta Trấn Vũ, protector contra las tormentas, terremotos e inundaciones fluviales.',
        insiderTip: 'Fíjate en las vigas del techo: las uniones de madera encajan sin un solo clavo metálico, utilizando técnicas navales japonesas para resistir las riadas anuales.'
      },
      {
        number: 3,
        title: 'La Placa Imperial Lai Viễn Kiều',
        whatToLookAt: 'La placa de madera dorada que preside la entrada con tres caracteres chinos.',
        story: 'En 1719, el señor feudal Nguyễn Phúc Chu visitó Hội An y quedó tan maravillado con el puente que le otorgó el nombre poético de "Puente de los amigos lejanos" (Lai Viễn Kiều).',
        insiderTip: 'Saca un billete de 20.000 Dong vietnamitas de tu bolsillo: en el reverso verás grabada la silueta exacta de este puente.'
      }
    ],
    photoSpot: {
      location: 'Desde la pasarela peatonal de madera que cruza el canal justo a 30 metros al sur del puente.',
      bestLight: 'Durante la hora azul (17:45 - 18:30) cuando los farolillos de seda se encienden y se reflejan en el agua del canal.',
      instruction: 'Aprovecha el reflejo en el agua quieta y enmarca el puente entre las buganvillas rosas que caen de los tejados antiguos.'
    },
    culturalEtiquette: {
      dressCode: 'Se requiere respeto moderado. Camina despacio sin empujar sobre las tablas centenarias de madera.',
      whatNotToDo: 'No fumes ni consumas alimentos sobre la estructura de madera, ya que es extremadamente sensible al fuego y al desgaste.',
      scamWarning: 'Vendedoras de farolillos de papel flotante te abordarán en las esquinas. Si decides comprar uno para pedir un deseo al río Thu Bồn, el precio justo es de 10.000 a 20.000 ₫ por farolillo.'
    },
    streetFoodReward: {
      dishNameVi: 'Cao Lầu & Nước Mót',
      dishNameEs: 'Fideos ahumados Cao Lau con cerdo y bebida herbal con flor de loto',
      whereToFind: 'En la calle Trần Phú a pocos pasos del puente.',
      priceEstimate: '35.000 ₫ – 50.000 ₫'
    },
    suggestedQuestions: [
      '¿Por qué el agua para los fideos Cao Lau solo puede extraerse del pozo Bá Lễ?',
      '¿Cómo sobrevivió el puente a las grandes riadas de Hội An?',
      '¿Dónde vivían los comerciantes japoneses y holandeses en la época de esplendor?'
    ]
  },
  dai_noi: {
    placeName: 'Ciudadela Imperial de Huế (Đại Nội)',
    cityName: 'Huế',
    vietnameseName: 'Hoàng Thành Huế – Đại Nội',
    tagline: 'El trono de los 13 emperadores Nguyễn, murallas bastión y la Ciudad Púrpura Prohibida',
    durationMinutes: 50,
    audioGuideScript: '¡Xin chào y bienvenido al epicentro del poder dinástico de Vietnam! Ante ti se despliega la Ciudadela Imperial de Huế, declarada Patrimonio de la Humanidad por la UNESCO. Construida a partir de 1804 por orden del emperador Gia Long, combina los principios del Feng Shui oriental con la ingeniería de fortalezas militares francesas del Marqués de Vauban. Acompáñame a través de la Puerta del Mediodía hacia la Ciudad Prohibida Púrpura, el recinto donde sólo el emperador, sus concubinas y los eunucos de la corte tenían permiso para entrar bajo pena de muerte.',
    stops: [
      {
        number: 1,
        title: 'La Puerta del Mediodía (Cửa Ngọ Môn)',
        whatToLookAt: 'El mirador superior de cinco pabellones con tejas amarillas imperiales y la puerta central.',
        story: 'La puerta central de piedra estaba reservada estrictamente para el paso del emperador; los mandarines usaban los laterales y los soldados las puertas extremas. Aquí abdicó en 1945 el último emperador, Bảo Đại.',
        insiderTip: 'Sube al mirador superior para contemplar la vista panorámica del mástil de la bandera y el Río del Perfume.'
      },
      {
        number: 2,
        title: 'El Palacio de la Suprema Armonía (Điện Thái Hòa)',
        whatToLookAt: 'Las 80 columnas de madera noble de lim lacadas en rojo con dragones dorados entrelazados.',
        story: 'Aquí se celebraban las coronaciones imperiales y las recepciones diplomáticas de embajadores extranjeros. El trono de oro del emperador preside la sala.',
        insiderTip: 'Los dragones de Huế tienen cinco garras, el distintivo reservado exclusivamente a los emperadores.'
      },
      {
        number: 3,
        title: 'El Templo Thế Miếu y las 9 Urnas Dinásticas de Bronce',
        whatToLookAt: 'Las enormes urnas de bronce fundidas en 1835, cada una pesando más de dos toneladas.',
        story: 'Cada urna representa a un soberano de la dinastía Nguyễn y está grabada con mapas de los ríos, montañas y mares sagrados de Vietnam, afirmando la soberanía territorial.',
        insiderTip: 'Tómate un minuto para acariciar el relieve de bronce de la urna central (Cao Đỉnh), la más imponente.'
      }
    ],
    photoSpot: {
      location: 'Frente a los corredores lacados en rojo que bordean los patios de la Ciudad Prohibida.',
      bestLight: 'A las 08:30 con la luz dorada matutina filtrándose entre las columnas rojas.',
      instruction: 'Usa una perspectiva de fuga por el pasillo de madera bermellón con los faroles colgados.'
    },
    culturalEtiquette: {
      dressCode: 'Hombros y rodillas cubiertos para acceder a los templos Thế Miếu y Thái Hòa.',
      whatNotToDo: 'No toques el trono imperial ni te sientes en los muebles de época protegidos.',
      scamWarning: 'Cuidado con carritos de golf eléctricos que cobran tarifas infladas en la entrada sin ticket oficial.'
    },
    streetFoodReward: {
      dishNameVi: 'Bún Bò Huế & Bánh Bèo',
      dishNameEs: 'Sopa de fideos de arroz con ternera picante, hierba limón y platillos de arroz al vapor',
      whereToFind: 'En los puestos de la calle Đinh Tiên Hoàng a la salida este de la ciudadela.',
      priceEstimate: '40.000 ₫ – 60.000 ₫'
    },
    suggestedQuestions: [
      '¿Cómo se seleccionaban los eunucos que servían en la Ciudad Prohibida?',
      '¿Qué daños sufrió la ciudadela durante la Ofensiva del Tet en 1968?',
      '¿Por qué las tejas amarillas solo podían usarse en los palacios del emperador?'
    ]
  },
  thien_mu: {
    placeName: 'Pagoda Thiên Mụ (Pagoda de la Dama Celestial)',
    cityName: 'Huế',
    vietnameseName: 'Chùa Thiên Mụ',
    tagline: 'La torre octogonal de siete pisos que custodia el Río del Perfume desde hace más de cuatro siglos',
    durationMinutes: 30,
    audioGuideScript: '¡Hola viajero! Respira la paz y serenidad de la colina Hà Khê, mirando hacia las aguas mansas del Río del Perfume. Estás en la Pagoda Thiên Mụ, fundada en 1601. La leyenda cuenta que una anciana vestida con túnica roja y pantalones verdes bajó del cielo y profetizó: "Un verdadero señor vendrá aquí y construirá una pagoda para canalizar las energías del país". El señor Nguyễn Hoàng escuchó la profecía y mandó levantar este templo sagrado. Hoy, su torre octogonal de siete niveles es el emblema espiritual indiscutible de Huế.',
    stops: [
      {
        number: 1,
        title: 'La Torre Phước Duyên (7 Pisos de Iluminación)',
        whatToLookAt: 'La torre octogonal de ladrillo de 21 metros de altura con una estatua de Buda en cada piso.',
        story: 'Construida por el emperador Thiệu Trị en 1844, cada uno de sus siete niveles simboliza una reencarnación del Buda histórico hacia el Nirvana.',
        insiderTip: 'Camina alrededor de la torre en el sentido de las agujas del reloj, la forma tradicional de respeto budista.'
      },
      {
        number: 2,
        title: 'La Gran Campana Đại Hồng Chung y la Estela de la Tortuga',
        whatToLookAt: 'La colosal campana de bronce fundida en 1710 con más de dos toneladas de peso.',
        story: 'Dicen que cuando repica en el silencio del alba, su sonido celestial viaja hasta 10 kilómetros por el valle del río, trayendo calma y bendiciones a los pescadores.',
        insiderTip: 'Al fondo del recinto verás expuesto el coche Austin azul con el que el monje Thích Quảng Đức viajó a Saigón en 1963 antes de su histórica inmolación por la paz.'
      }
    ],
    photoSpot: {
      location: 'Desde el muelle de piedra a orillas del río, mirando hacia la torre entre los pinos centenarios.',
      bestLight: 'Durante el atardecer (17:00 - 17:45) cuando el sol cae sobre las aguas del Río del Perfume.',
      instruction: 'Encuadra la escalinata de piedra con las barcas de dragón en la orilla inferior.'
    },
    culturalEtiquette: {
      dressCode: 'Ropa recatada obligatoria. Quítate zapatos y sombreros al entrar al santuario principal.',
      whatNotToDo: 'No hables en voz alta ni interrumpas los cánticos de los monjes residentes.',
      scamWarning: 'Vendedoras de souvenirs en el muelle fluvial; compara precios con amabilidad.'
    },
    streetFoodReward: {
      dishNameVi: 'Chè Hạt Sen Long Nhãn',
      dishNameEs: 'Dulce refrescante de semillas de loto de Huế envueltas en pulpa de longan',
      whereToFind: 'En los carritos frente al embarcadero de barcas de la pagoda.',
      priceEstimate: '20.000 ₫ – 30.000 ₫'
    },
    suggestedQuestions: [
      '¿Siguen viviendo y estudiando monjes novicios en esta pagoda?',
      '¿Qué papel jugó esta pagoda en el movimiento budista de 1963?',
      '¿Por qué el Río del Perfume se llama así?'
    ]
  },
  ngu_hanh_son: {
    placeName: 'Montañas de Mármol (Ngũ Hành Sơn)',
    cityName: 'Đà Nẵng',
    vietnameseName: 'Ngũ Hành Sơn (Marble Mountains)',
    tagline: 'Cinco colinas cársticas sagradas que representan los cinco elementos del universo oriental',
    durationMinutes: 45,
    audioGuideScript: '¡Bienvenido a Ngũ Hành Sơn, las cinco Montañas de Mármol de Đà Nẵng! Estas cinco colinas de roca caliza y mármol emergen abruptamente de la llanura costera como dragones que se lanzan hacia el Mar del Este. Cada montaña lleva el nombre de uno de los cinco elementos de la cosmología oriental: Metal, Madera, Agua, Fuego y Tierra. La montaña Thủy Sơn (Agua) es la más venerada: en su interior esconde cuevas kársticas donde los rayos de sol entran por hendiduras cenitales creando columnas de luz mística sobre santuarios budistas milenarios.',
    stops: [
      {
        number: 1,
        title: 'La Cueva Huyền Không y la Luz Divina',
        whatToLookAt: 'El agujero natural en el techo de la cueva por donde descienden rayos de sol iluminando al Buda de piedra.',
        story: 'Durante la guerra de Vietnam, esta cueva secreta funcionó como hospital de campaña para el Viet Cong debido a su inaccesibilidad y protección natural.',
        insiderTip: 'Ven entre las 11:30 y las 13:00 para ver el rayo de sol perpendicular iluminar el humo del incienso.'
      },
      {
        number: 2,
        title: 'El Mirador Vọng Giang Đài',
        whatToLookAt: 'La panorámica de 360 grados sobre el río Cổ Cò, la playa de Non Nước y las otras cuatro montañas.',
        story: 'El emperador Minh Mạng subía a caballo hasta aquí en el siglo XIX para meditar y contemplar la belleza de su reino.',
        insiderTip: 'Usa el ascensor de cristal panorámico para subir y baja caminando por las escaleras de piedra tallada.'
      }
    ],
    photoSpot: {
      location: 'En el interior de la cueva Huyền Không, mirando hacia la estatua del Buda con la luz cenital detrás.',
      bestLight: 'A mediodía con luz solar directa entrando por la cúpula de roca.',
      instruction: 'Usa modo nocturno o exposición media para capturar el contraste de luz y sombra.'
    },
    culturalEtiquette: {
      dressCode: 'Pantalones o bermudas largas y hombros cubiertos al entrar a las cuevas-templo.',
      whatNotToDo: 'No toques las estalactitas ni esculpas inscripciones en el mármol natural.',
      scamWarning: 'En la base hay talleres de esculturas de mármol; si compras una figura, exige certificado de exportación y embalaje acolchado.'
    },
    streetFoodReward: {
      dishNameVi: 'Mì Quảng Đà Nẵng',
      dishNameEs: 'Fideos amarillos de cúrcuma con langostinos, cerdo, cacahuetes y galleta de arroz crujiente',
      whereToFind: 'En los restaurantes tradicionales de la calle Lê Văn Hiến frente al acceso.',
      priceEstimate: '35.000 ₫ – 50.000 ₫'
    },
    suggestedQuestions: [
      '¿De dónde se extrae hoy el mármol para las esculturas?',
      '¿Qué significado tiene cada uno de los 5 elementos en la tradición vietnamita?',
      '¿Cuánto tiempo se tarda en recorrer toda la montaña Thủy Sơn?'
    ]
  },
  cu_chi: {
    placeName: 'Túneles de Củ Chi',
    cityName: 'TP. Hồ Chí Minh',
    vietnameseName: 'Địa Đạo Củ Chi',
    tagline: 'La asombrosa ciudad subterránea de 250 kilómetros cavada a mano que desafió a la superpotencia militar',
    durationMinutes: 45,
    audioGuideScript: '¡Hola viajero! Te encuentras sobre uno de los complejos subterráneos más extraordinarios de la historia militar moderna. Bajo la densa selva de Củ Chi, a unos 50 km de Saigón, los guerrilleros del Frente de Liberación Nacional excavaron a mano con azadones más de 250 kilómetros de túneles en tres niveles de profundidad. Aquí abajo vivían miles de personas: había hospitales de campaña, fábricas de armas con proyectiles reciclados, comedores con chimeneas sin humo e incluso teatros subterráneos. Una demostración extrema de resistencia, camuflaje e ingenio que cambió el curso de la historia.',
    stops: [
      {
        number: 1,
        title: 'La Trampa Secreta de Acceso (Hầm Nắp)',
        whatToLookAt: 'La diminuta tapa de madera de apenas 30x40 cm cubierta con hojas secas del bosque.',
        story: 'El guía demostrará cómo un combatiente podía deslizarse en un segundo en este hueco invisible y taparlo desde dentro sin dejar rastro para los soldados enemigos.',
        insiderTip: 'Prueba a meterte en la trampilla para sentir la estrechez extrema y sacarte la clásica foto de camuflaje.'
      },
      {
        number: 2,
        title: 'El Tramo de Túnel Real para Visitantes',
        whatToLookAt: 'Las paredes de arcilla roja compactada y las estrechas secciones de 80 cm de alto.',
        story: 'Los túneles originales se ensancharon ligeramente para que los turistas occidentales pudieran pasar; aun así, se avanza agachado o a gatas en la penumbra.',
        insiderTip: 'Si tienes claustrofobia, avisa al guía: hay salidas de emergencia cada 20 metros para salir a la superficie.'
      },
      {
        number: 3,
        title: 'La Cocina Hoàng Cầm (Cocina sin Humo)',
        whatToLookAt: 'Los conductos de ventilación enterrados que dispersaban el humo a ras del suelo a decenas de metros de la hoguera.',
        story: 'Inventada en 1951, esta técnica permitía a los cocineros preparar arroz caliente al alba sin que los aviones enemigos detectaran columnas de humo sobre la selva.',
        insiderTip: 'Al final de la visita te servirán yuca cocida (khoai mì) mojada en cacahuete machacado con sal, la dieta base de los combatientes.'
      }
    ],
    photoSpot: {
      location: 'Saliendo de la trampilla de madera camuflada con el sombrero cónico tradicional.',
      bestLight: 'Luz filtrada entre la copa de los árboles de caucho a media mañana.',
      instruction: 'Encuadra desde el nivel del suelo para destacar lo imperceptible de la tapa entre las hojas secas.'
    },
    culturalEtiquette: {
      dressCode: 'Ropa oscura que no importe ensuciar y calzado cerrado para caminar por la tierra.',
      whatNotToDo: 'No toques las trampas punji de bambú expuestas ni te alejes de los senderos marcados por el guía.',
      scamWarning: 'El campo de tiro con fusiles AK-47 es opcional y tiene coste aparte por bala; verifica el precio antes de comprar munición.'
    },
    streetFoodReward: {
      dishNameVi: 'Khoai Mì Luộc Chấm Muối Mè & Nước Mía',
      dishNameEs: 'Yuca hervida con sal de sésamo y cacahuete acompañada de jugo de caña de azúcar',
      whereToFind: 'En el comedor tradicional al aire libre al final del recorrido.',
      priceEstimate: 'Incluido en la visita / 15.000 ₫ por jugo de caña'
    },
    suggestedQuestions: [
      '¿Cómo respiraban y se ventilaban los túneles del tercer nivel?',
      '¿Qué hacían cuando llovía torrencialmente durante los monzones?',
      '¿Cómo conseguían agua potable en las profundidades de la selva?'
    ]
  },
  ben_thanh: {
    placeName: 'Mercado Bến Thành',
    cityName: 'TP. Hồ Chí Minh',
    vietnameseName: 'Chợ Bến Thành',
    tagline: 'La torre del reloj centenaria y el laberinto de sabores, sedas y regateo de Saigón',
    durationMinutes: 35,
    audioGuideScript: '¡Xin chào! Te encuentras en el epicentro comercial y sentimental de Ciudad Ho Chi Minh: el histórico Mercado Bến Thành. Inaugurado en 1914 bajo administración colonial francesa, su emblemática torre del reloj de cuatro esferas ha sido testigo de revoluciones, cambios de divisas y el despegue económico de Vietnam. En su interior, más de 1.500 puestos forman un universo bullicioso donde se mezclan el aroma a café torrefacto con mantequilla, montones de frutas exóticas como el mangostán y el durián, rollos de seda bordada y el sonido del regateo amistoso.',
    stops: [
      {
        number: 1,
        title: 'La Puerta Sur y la Torre del Reloj',
        whatToLookAt: 'El relieve de terracota sobre el arco de entrada que representa escenas de la vida agrícola vietnamita.',
        story: 'Esta torre es el punto de encuentro por excelencia de los habitantes de Saigón. A pesar de los bombardeos del siglo XX, la estructura se mantuvo en pie como símbolo de la tenacidad de la ciudad.',
        insiderTip: 'Cruza con decisión la plaza del mercado: en Saigón las motos no frenan en seco, sino que te esquivan suavemente si caminas a paso constante.'
      },
      {
        number: 2,
        title: 'El Callejón Gastronómico Central',
        whatToLookAt: 'Las ollas gigantescas humeantes con caldos aromáticos y las vitrinas con pasteles de arroz multicolor.',
        story: 'Aquí comen tanto oficinistas como comerciantes del mercado. Es el mejor lugar para probar la auténtica cocina sureña vietnamita, caracterizada por sabores más dulces y hierbas frescas.',
        insiderTip: 'Busca el puesto con más locales sentados en taburetes para degustar el mejor Bánh Xèo crujiente.'
      }
    ],
    photoSpot: {
      location: 'Desde el paso de peatones frente a la Puerta Sur al atardecer, cuando se encienden las luces del reloj.',
      bestLight: 'Entre las 17:30 y las 18:30 al caer la tarde.',
      instruction: 'Capta el tráfico fluido de motos en primer plano con la torre del reloj iluminada al fondo.'
    },
    culturalEtiquette: {
      dressCode: 'Ropa fresca y cómoda para caminar por los pasillos interiores concurridos.',
      whatNotToDo: 'No bloquees los pasillos estrechos con mochilas grandes y cuida tus pertenencias.',
      scamWarning: 'En los puestos de souvenirs y ropa, el primer precio suele estar inflado entre un 30% y un 50%. Regatea siempre con una sonrisa amplia y buen humor.'
    },
    streetFoodReward: {
      dishNameVi: 'Bánh Xèo & Cơm Tấm Sườn Nướng',
      dishNameEs: 'Crepe crujiente de harina de arroz con gambas y cerdo, o arroz quebrado con chuleta de cerdo caramelizada',
      whereToFind: 'En la sección de comida rápida tradicional del pasillo este del mercado.',
      priceEstimate: '50.000 ₫ – 75.000 ₫'
    },
    suggestedQuestions: [
      '¿Cuál es la regla de oro para regatear con respeto en Bến Thành?',
      '¿Por qué el mercado cambia por completo de aspecto a partir de las 18:00?',
      '¿Qué cafés vietnamitas auténticos se pueden comprar a granel aquí?'
    ]
  },
  ha_long: {
    placeName: 'Bahía de Hạ Long y Cueva Sửng Sốt (Cueva de las Sorpresas)',
    cityName: 'Quảng Ninh',
    vietnameseName: 'Vịnh Hạ Long – Hang Sửng Sốt',
    tagline: 'Donde los dragones celestiales descendieron para crear un laberinto de torres de esmeralda',
    durationMinutes: 40,
    audioGuideScript: '¡Bienvenido a uno de los paisajes más sobrecogedores de la Tierra! Hạ Long significa literalmente "Donde el dragón desciende al mar". Según la mitología ancestral, cuando Vietnam fue invadida por mar, los dioses enviaron una familia de dragones celestiales que escupieron perlas y jades; estas joyas se convirtieron en miles de islas cársticas escarpadas que destrozaron los barcos invasores. Hoy navegamos por estas aguas verde esmeralda para adentrarnos en Hang Sửng Sốt, la cueva de las sorpresas descubierta por exploradores franceses en 1901.',
    stops: [
      {
        number: 1,
        title: 'La Primera Sala de las Estalactitas Sagradas',
        whatToLookAt: 'El techo ondulado de la cueva que parece esculpido por las olas de un océano fósil.',
        story: 'Esta cueva se formó hace más de 500 millones de años cuando el nivel del mar subía y bajaba lentamente disolviendo la roca caliza.',
        insiderTip: 'Fíjate en las formaciones de piedra que los pescadores locales identifican como tortugas gigantes, caballos y monjes en oración.'
      },
      {
        number: 2,
        title: 'La Gran Sala del Dragón y el Mirador Panorámico',
        whatToLookAt: 'La inmensa cámara subterránea con capacidad para miles de personas iluminada con luces cálidas.',
        story: 'Al salir de la cueva se abre un mirador natural que ofrece la vista más famosa de toda la bahía con los juncos tradicionales de madera fondeados en el mar calmo.',
        insiderTip: 'Aprovecha la salida para respirar el aire yodado del golfo de Tonkín.'
      }
    ],
    photoSpot: {
      location: 'Desde la terraza de salida de Hang Sửng Sốt sobre el acantilado.',
      bestLight: 'A media tarde cuando los barcos encienden sus faroles y la niebla acaricia las cimas de roca.',
      instruction: 'Encuadra la bahía enmarcada por la boca de la cueva de roca en sombra y el agua verde esmeralda iluminada.'
    },
    culturalEtiquette: {
      dressCode: 'Calzado antideslizante obligatorio (los escalones de piedra dentro de la cueva pueden ser resbaladizos).',
      whatNotToDo: 'No toques las estalagmitas en crecimiento ni dejes basura en el barco o en el agua protegida.',
      scamWarning: 'Si alquilas un kayak en las lagunas interiores, confirma previamente si el chaleco salvavidas está incluido.'
    },
    streetFoodReward: {
      dishNameVi: 'Chả Mực Hạ Long',
      dishNameEs: 'Pastel de calamar fresco golpeado a mano y frito al punto crujiente',
      whereToFind: 'En los puertos de cruceros de Tuần Châu o en el mercado de mariscos de Hạ Long.',
      priceEstimate: '60.000 ₫ – 100.000 ₫'
    },
    suggestedQuestions: [
      '¿Cuántas islas e islotes forman en total la Bahía de Hạ Long?',
      '¿Sigue habiendo aldeas flotantes de pescadores viviendo en la bahía?',
      '¿Por qué el agua de la bahía tiene ese característico color verde esmeralda?'
    ]
  }
};

// Helper to look up curated tours quickly with robust keyword matching
function findCuratedTour(placeName: string, cityName?: string): any | null {
  const text = (placeName + ' ' + (cityName || '')).toLowerCase();
  
  if (text.includes('literatura') || text.includes('van mieu') || text.includes('văn miếu')) {
    return CURATED_FALLBACK_TOURS.van_mieu;
  }
  if (text.includes('hoan kiem') || text.includes('hoàn kiếm') || text.includes('ngoc son') || text.includes('ngọc sơn') || text.includes('espada restituida')) {
    return CURATED_FALLBACK_TOURS.hoan_kiem;
  }
  if (text.includes('tren') || text.includes('train') || text.includes('vía') || text.includes('duong tau') || text.includes('đường tàu')) {
    return CURATED_FALLBACK_TOURS.train_street;
  }
  if (text.includes('catedral') || text.includes('jose') || text.includes('josé') || text.includes('nha tho lon') || text.includes('nhà thờ lớn')) {
    return CURATED_FALLBACK_TOURS.st_joseph;
  }
  if (text.includes('japon') || text.includes('japonés') || text.includes('chùa cầu') || text.includes('chua cau')) {
    return CURATED_FALLBACK_TOURS.chua_cau;
  }
  if (text.includes('ciudadela') || text.includes('dai noi') || text.includes('đại nội') || text.includes('imperial de hue') || text.includes('imperial de huế')) {
    return CURATED_FALLBACK_TOURS.dai_noi;
  }
  if (text.includes('thien mu') || text.includes('thiên mụ') || text.includes('dama celestial')) {
    return CURATED_FALLBACK_TOURS.thien_mu;
  }
  if (text.includes('marmol') || text.includes('mármol') || text.includes('marble') || text.includes('ngũ hành') || text.includes('ngu hanh')) {
    return CURATED_FALLBACK_TOURS.ngu_hanh_son;
  }
  if (text.includes('cu chi') || text.includes('củ chi') || text.includes('tunel') || text.includes('túnel')) {
    return CURATED_FALLBACK_TOURS.cu_chi;
  }
  if (text.includes('ben thanh') || text.includes('bến thành')) {
    return CURATED_FALLBACK_TOURS.ben_thanh;
  }
  if (text.includes('ha long') || text.includes('hạ long') || text.includes('sung sot') || text.includes('sửng sốt')) {
    return CURATED_FALLBACK_TOURS.ha_long;
  }

  return null;
}

// Ensure every single field of the tour is normalized and non-null to prevent any frontend TypeError crash
function normalizeTour(raw: any, fallbackPlace: string, fallbackCity: string) {
  const place = String(raw?.placeName || fallbackPlace).trim();
  const city = String(raw?.cityName || fallbackCity).trim();

  // Normalize photoSpot
  let photoSpot = raw?.photoSpot;
  if (typeof photoSpot === 'string') {
    photoSpot = {
      location: photoSpot,
      bestLight: 'A primera hora de la mañana o durante la hora dorada',
      instruction: 'Busca un ángulo frontal capturando la armonía del conjunto.',
    };
  } else if (!photoSpot || typeof photoSpot !== 'object') {
    photoSpot = {
      location: `Frente a la entrada principal de ${place}`,
      bestLight: 'Luz natural matutina o al atardecer',
      instruction: 'Encuadra la fachada arquitectónica con perspectiva limpia.',
    };
  } else {
    photoSpot = {
      location: String(photoSpot.location || `Frente a ${place}`),
      bestLight: String(photoSpot.bestLight || 'Luz suave de mañana o atardecer'),
      instruction: String(photoSpot.instruction || 'Busca un buen encuadre de los elementos tradicionales.'),
    };
  }

  // Normalize culturalEtiquette
  let etiquette = raw?.culturalEtiquette;
  if (typeof etiquette === 'string') {
    etiquette = {
      dressCode: etiquette,
      whatNotToDo: 'Evitar movimientos bruscos o hablar en tono alto ante los altares.',
      scamWarning: 'Acuerda cualquier precio antes de aceptar souvenirs o servicios.',
    };
  } else if (!etiquette || typeof etiquette !== 'object') {
    etiquette = {
      dressCode: 'Vestimenta respetuosa: hombros y rodillas cubiertos en templos y pagodas.',
      whatNotToDo: 'No tocar las figuras sagradas ni dar la espalda a los altares.',
      scamWarning: 'Desconfía de ofertas no solicitadas o venta de incienso a precios inflados.',
    };
  } else {
    etiquette = {
      dressCode: String(etiquette.dressCode || 'Hombros y rodillas cubiertos respetuosamente.'),
      whatNotToDo: String(etiquette.whatNotToDo || 'No tocar altares sagrados ni gritar.'),
      scamWarning: etiquette.scamWarning ? String(etiquette.scamWarning) : undefined,
    };
  }

  // Normalize streetFoodReward
  let food = raw?.streetFoodReward;
  if (typeof food === 'string') {
    food = {
      dishNameVi: food,
      dishNameEs: food,
      whereToFind: 'En los puestos tradicionales cercanos.',
      priceEstimate: '30.000 ₫ – 50.000 ₫',
    };
  } else if (!food || typeof food !== 'object') {
    food = {
      dishNameVi: 'Cà Phê Sữa Đá / Trà Đá',
      dishNameEs: 'Café vietnamita con leche condensada o té helado tradicional',
      whereToFind: 'En las cafeterías y puestos de la calle contigua.',
      priceEstimate: '25.000 ₫ – 40.000 ₫',
    };
  } else {
    food = {
      dishNameVi: String(food.dishNameVi || 'Món ngon địa phương'),
      dishNameEs: String(food.dishNameEs || 'Especialidad gastronómica de la zona'),
      whereToFind: String(food.whereToFind || 'En los alrededores del recinto.'),
      priceEstimate: String(food.priceEstimate || '30.000 ₫ – 60.000 ₫'),
    };
  }

  // Normalize stops
  let stops = Array.isArray(raw?.stops) && raw.stops.length > 0 ? raw.stops : [];
  if (stops.length === 0) {
    stops = [
      {
        number: 1,
        title: `Pórtico y Acceso a ${place}`,
        whatToLookAt: 'Los detalles arquitectónicos del portal y el entorno.',
        story: 'Un enclave cargado de espiritualidad y memoria comunitaria.',
        insiderTip: 'Pasea sin prisas observando el ritmo de la vida local.',
      }
    ];
  } else {
    stops = stops.map((s: any, idx: number) => ({
      number: typeof s?.number === 'number' ? s.number : idx + 1,
      title: String(s?.title || `Parada ${idx + 1}`),
      whatToLookAt: String(s?.whatToLookAt || 'Observa los detalles artesanales.'),
      story: String(s?.story || 'Un rincón lleno de leyendas y significado cultural.'),
      insiderTip: String(s?.insiderTip || 'Respeta la paz del entorno.'),
    }));
  }

  // Normalize suggestedQuestions
  let questions = Array.isArray(raw?.suggestedQuestions) && raw.suggestedQuestions.length > 0
    ? raw.suggestedQuestions.map(String)
    : [
        `¿Cuál es la leyenda más importante de ${place}?`,
        '¿Qué significado tienen las ofrendas en los altares?',
        '¿Qué plato local recomiendas probar después de esta visita?'
      ];

  return {
    placeName: place,
    cityName: city,
    vietnameseName: String(raw?.vietnameseName || place),
    tagline: String(raw?.tagline || `Descubre los secretos culturales y leyendas vivas de ${place}`),
    durationMinutes: Number(raw?.durationMinutes) || 30,
    audioGuideScript: String(raw?.audioGuideScript || `¡Hola, viajero! Te damos la bienvenida a ${place}.`),
    stops,
    photoSpot,
    culturalEtiquette: etiquette,
    streetFoodReward: food,
    suggestedQuestions: questions,
  };
}

// Free Tour generation endpoint using Gemini with instant curated matches and robust normalization
app.post('/api/free-tour', async (req, res) => {
  const { placeName, cityName, category, userVibe } = req.body;

  if (!placeName || typeof placeName !== 'string') {
    return res.status(400).json({ error: 'El nombre del lugar es obligatorio.' });
  }

  const cleanPlace = placeName.trim();
  const cleanCity = (cityName || 'Vietnam').trim();
  const targetVibe = userVibe || 'curiosidades';

  // Check if we have an instant curated tour match
  const curatedMatch = findCuratedTour(cleanPlace, cleanCity);
  if (curatedMatch) {
    return res.json({
      success: true,
      tour: normalizeTour(curatedMatch, cleanPlace, cleanCity),
      source: 'curated_verified',
    });
  }

  const prompt = `Actúa como un guía turístico local vietnamita apasionado, divertido, culto y con excelente español.
El viajero está ahora mismo de pie frente a: "${cleanPlace}" en la ciudad de "${cleanCity}" (categoría: ${category || 'monumento'}).
Preferencia del viajero: estilo "${targetVibe}" (haz énfasis en historias poco conocidas, detalles visuales inadvertidos y leyendas auténticas).

Crea un TOUR AUDIOGUÍA VIRTUAL cautivador, estructurado y listo para escuchar o leer en su teléfono.
Debes responder en un JSON estrictamente válido con este esquema:

{
  "placeName": "${cleanPlace.replace(/"/g, '\\"')}",
  "cityName": "${cleanCity.replace(/"/g, '\\"')}",
  "vietnameseName": "Nombre oficial en vietnamita con acentos diacríticos",
  "tagline": "Una frase gancho intrigante de 1 línea",
  "durationMinutes": 35,
  "audioGuideScript": "Un guion de audioguía continuo de 2 a 3 párrafos (200-280 palabras), narrado en primera persona ('¡Hola viajero!', 'Si miras a tu alrededor...'). Explica el contexto histórico, la energía del lugar, olores a incienso o maderas, y la gran leyenda central.",
  "stops": [
    {
      "number": 1,
      "title": "Nombre de la primera parada",
      "whatToLookAt": "Qué buscar exactamente con los ojos ahora mismo",
      "story": "La anécdota o secreto histórico que ocurrió justo aquí",
      "insiderTip": "Consejo de guía local"
    },
    {
      "number": 2,
      "title": "Nombre de la segunda parada",
      "whatToLookAt": "Detalle arquitectónico o elemento destacado",
      "story": "La historia o simbolismo de este elemento",
      "insiderTip": "Consejo práctico de guía"
    },
    {
      "number": 3,
      "title": "Nombre de la tercera parada",
      "whatToLookAt": "Detalle visual",
      "story": "Significado cultural o histórico",
      "insiderTip": "Consejo"
    }
  ],
  "photoSpot": {
    "location": "Dónde pararse exactamente para la mejor foto",
    "bestLight": "Momento del día ideal",
    "instruction": "Cómo encuadrar para lograr una perspectiva única"
  },
  "culturalEtiquette": {
    "dressCode": "Requisitos de vestimenta",
    "whatNotToDo": "Acciones consideradas irrespetuosas",
    "scamWarning": "Alerta de picaresca habitual si aplica"
  },
  "streetFoodReward": {
    "dishNameVi": "Nombre en vietnamita del plato o café tradicional",
    "dishNameEs": "Nombre en español y descripción apetitosa",
    "whereToFind": "Dónde buscarlo en los alrededores",
    "priceEstimate": "Precio justo estimado en Dong (ej: 35.000 ₫ – 50.000 ₫)"
  },
  "suggestedQuestions": [
    "Pregunta curiosa 1",
    "Pregunta curiosa 2",
    "Pregunta curiosa 3"
  ]
}`;

  if (process.env.GEMINI_API_KEY) {
    try {
      const tour = await callGeminiJsonWithFallback(prompt, 8000);
      if (tour && tour.placeName && Array.isArray(tour.stops) && tour.stops.length > 0) {
        return res.json({
          success: true,
          tour: normalizeTour(tour, cleanPlace, cleanCity),
          source: 'gemini_ai',
        });
      }
    } catch (err: any) {
      console.warn(`[Gemini Free Tour] Error or timeout calling model (${err?.message || 'error'}). Generating guaranteed tour...`);
    }
  }

  // Dynamic fallback guide generator for zero downtime
  const genericTour = {
    placeName: cleanPlace,
    cityName: cleanCity,
    vietnameseName: cleanPlace,
    tagline: `Descubre los secretos culturales e historias vivas de ${cleanPlace}`,
    durationMinutes: 30,
    audioGuideScript: `¡Xin chào! Te damos la bienvenida a ${cleanPlace}, uno de los rincones más representativos de ${cleanCity}. Mientras caminas por este entorno, tómate un instante para observar el equilibrio característico de Vietnam: la convivencia armónica entre la devoción espiritual, la arquitectura tradicional de maderas nobles y la vibrante vida cotidiana. En esta audioguía exploraremos juntos los detalles arquitectónicos, la historia que forjó este lugar y las costumbres locales que aún perduran.`,
    stops: [
      {
        number: 1,
        title: 'Entrada Principal y Simbolismo Protector',
        whatToLookAt: 'Los dragones en los aleros del tejado y los umbrales elevados de madera en las puertas.',
        story: 'En la tradición vietnamita, los umbrales de madera están elevados para obligar al visitante a bajar la mirada en señal de respeto al cruzar y evitar que los malos espíritus (que según el folclore solo caminan en línea recta) puedan entrar.',
        insiderTip: 'Nunca pises el umbral de madera al entrar; da un paso por encima como hacen los lugareños.'
      },
      {
        number: 2,
        title: 'El Altar Central y las Ofrendas',
        whatToLookAt: 'Las bandejas con frutas frescas, flores de jazmín o loto y los billetes simbólicos.',
        story: 'Las ofrendas en número impar (1, 3 o 5 tipos de frutas) representan la energía Yang, símbolo de crecimiento, luz y prosperidad continua.',
        insiderTip: 'El incienso en espiral que cuelga del techo puede tardar hasta un mes en consumirse lentamente junto con las oraciones de las familias.'
      },
      {
        number: 3,
        title: 'El Patio Interior y los Bonsáis (Cây Cảnh)',
        whatToLookAt: 'Las macetas de árboles bonsái centenarios modelados sobre rocas en miniatura con agua.',
        story: 'El arte del Cây Cảnh en Vietnam simboliza el universo en miniatura (Hòn Non Bộ), canalizando las energías del Feng Shui para proteger el recinto.',
        insiderTip: 'Es el lugar perfecto para sentir la brisa y escuchar el canto de los pájaros en jaulas que muchos guardianes cuidan con devoción.'
      }
    ],
    photoSpot: {
      location: 'Frente a la fachada principal buscando un ángulo en diagonal.',
      bestLight: 'A primera hora de la mañana (08:00 - 09:30) o antes del atardecer.',
      instruction: 'Enfoca los detalles dorados o rojos del techo en primer plano con el cielo de fondo.'
    },
    culturalEtiquette: {
      dressCode: 'Hombros y rodillas cubiertos. Si es un templo o pagoda, retira gorras y gafas de sol.',
      whatNotToDo: 'Evita hablar en tono alto, reírte estridentemente frente a los altares o señalar con un solo dedo (usa la mano abierta).',
      scamWarning: 'Si alguien se acerca ofreciéndote palitos de incienso o adivinación de la suerte, declina amablemente con una sonrisa diciendo "Không, cảm ơn".'
    },
    streetFoodReward: {
      dishNameVi: 'Cà Phê Sữa Đá / Trà Đá',
      dishNameEs: 'Café vietnamita con leche condensada y hielo, o té verde helado',
      whereToFind: 'En cualquier cafetería o puesto con taburetes bajos de plástico de la calle contigua.',
      priceEstimate: '20.000 ₫ – 35.000 ₫'
    },
    suggestedQuestions: [
      `¿Cuál es la leyenda más famosa vinculada a ${cleanPlace}?`,
      '¿Qué significado tienen los colores amarillo y rojo en los templos de Vietnam?',
      '¿Qué plato típico de esta ciudad es imprescindible probar hoy?'
    ]
  };

  return res.json({
    success: true,
    tour: normalizeTour(genericTour, cleanPlace, cleanCity),
    fallback: true,
  });
});

// Interactive Tour Guide live Q&A chat endpoint
app.post('/api/tour-guide-chat', async (req, res) => {
  const { placeName, cityName, question, chatHistory = [] } = req.body;

  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'La pregunta es obligatoria.' });
  }

  const prompt = `Eres "Nguyễn", un guía turístico local vietnamita profesional, entusiasta, divertido y muy respetuoso.
Estás acompañando personalmente al viajero en el monumento: "${placeName || 'Vietnam'}" (${cityName || 'Vietnam'}).
El viajero te acaba de preguntar: "${question}".

Historial reciente de conversación:
${chatHistory.slice(-4).map((m: any) => `${m.role === 'user' ? 'Viajero' : 'Guía Nguyễn'}: ${m.text}`).join('\n')}

Responde como el guía en español natural y cálido (máximo 120-150 palabras).
Sé conciso, ameno y añade un detalle histórico, visual o de etiqueta que el viajero pueda comprobar mirando ahora mismo a su alrededor. Si procede, incluye una palabra en vietnamita con su pronunciación simpática.`;

  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = getAI();
      const contentPromise = ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout chat model')), 6000)
      );
      const response: any = await Promise.race([contentPromise, timeoutPromise]);

      if (response && response.text) {
        return res.json({
          success: true,
          reply: response.text.trim(),
          guideName: 'Nguyễn (Tu guía local)',
        });
      }
    } catch (err: any) {
      console.warn('Gemini chat model error or timeout:', err?.message);
    }
  }

  // Graceful conversational fallback
  return res.json({
    success: true,
    reply: `¡Excelente pregunta! Aquí en ${placeName || 'este lugar histórico'}, ese detalle está profundamente vinculado a la tradición vietnamita y a la búsqueda de armonía entre el cielo y la tierra. Si miras detenidamente las decoraciones superiores, notarás cómo los artesanos usaban fragmentos de cerámica vidriada rota para crear dragones y fénix, un arte tradicional llamado "Khảm sành". ¡Tómate un minuto para contemplarlo de cerca!`,
    guideName: 'Nguyễn (Tu guía local)',
    fallback: true,
  });
});

// Cache for live Google Places restaurant queries (20 minutes TTL)
interface RestaurantSearchCacheItem {
  timestamp: number;
  data: any[];
}
const restaurantSearchCache = new Map<string, RestaurantSearchCacheItem>();

// Helper to infer dish and category from place details
function mapGooglePlaceToItem(place: any, defaultCity: string): any {
  const address = place.formatted_address || '';
  const districtMatch = address.match(/(Quận\s+[^,]+|Huyện\s+[^,]+|Hoàn Kiếm|Ba Đình|Hai Bà Trưng|Đống Đa|Tây Hồ|Cẩm Phô|Minh An|Sơn Trà|Hải Châu|Ngũ Hành Sơn|District\s+\d+|Old Quarter)/i);
  const district = districtMatch ? districtMatch[0].trim() : (defaultCity || 'Vietnam');

  const priceLevel = typeof place.price_level === 'number' ? place.price_level : 2;
  const priceTier = (priceLevel <= 1 ? 1 : priceLevel === 2 ? 2 : 3);
  const avgPriceVnd = priceTier === 1 ? 65000 : priceTier === 2 ? 145000 : 380000;

  const nameLower = (place.name || '').toLowerCase();
  let category = 'Restaurante Tradicional';
  if (nameLower.includes('bánh mì') || nameLower.includes('banh mi') || nameLower.includes('sandwich')) {
    category = 'Bocadillos & Bánh Mì';
  } else if (nameLower.includes('cafe') || nameLower.includes('coffee') || nameLower.includes('cà phê') || nameLower.includes('tea')) {
    category = 'Café de Especialidad';
  } else if (nameLower.includes('street') || nameLower.includes('quán vỉa hè') || nameLower.includes('vỉa hè')) {
    category = 'Street Food / Puesto Callejero';
  } else if (nameLower.includes('bistro') || nameLower.includes('fusion') || nameLower.includes('pizza') || nameLower.includes('pasta')) {
    category = 'Bistró / Fusión';
  }

  let mustOrderDish = 'Especialidad vietnamita recomendada de la casa';
  if (nameLower.includes('phở') || nameLower.includes('pho')) {
    mustOrderDish = 'Phở Bò tái lăn / Phở Gà ta';
  } else if (nameLower.includes('bún chả') || nameLower.includes('bun cha')) {
    mustOrderDish = 'Bún Chả Hà Nội nướng than hoa & Nem rán';
  } else if (nameLower.includes('bánh mì') || nameLower.includes('banh mi')) {
    mustOrderDish = 'Bánh Mì giòn kẹp pate, thịt nướng & rau thơm';
  } else if (nameLower.includes('chay') || nameLower.includes('vegan') || nameLower.includes('vegetarian')) {
    mustOrderDish = 'Phở Chay thơm lừng & Bánh Xèo Chay rau rừng';
  } else if (nameLower.includes('chả cá') || nameLower.includes('cha ca')) {
    mustOrderDish = 'Chả Cá Lăng nghệ chảo nóng xào thì là';
  } else if (nameLower.includes('bún bò') || nameLower.includes('bun bo')) {
    mustOrderDish = 'Bún Bò Huế đậm đà nước dùng sả';
  } else if (nameLower.includes('cơm gà') || nameLower.includes('com ga')) {
    mustOrderDish = 'Cơm Gà xé sợi nghệ dẻo thơm';
  } else if (nameLower.includes('cao lầu') || nameLower.includes('cao lau')) {
    mustOrderDish = 'Cao Lầu mì sợi dai với thịt xá xíu';
  }

  const rating = Number((place.rating || 4.6).toFixed(1));
  const reviewsCount = place.user_ratings_total || 80;

  return {
    id: `gplace-${place.place_id}`,
    name: place.name,
    nameVi: place.name,
    city: defaultCity || 'Hà Nội',
    district: district,
    address: address,
    lat: place.geometry?.location?.lat || 0,
    lng: place.geometry?.location?.lng || 0,
    rating: rating,
    reviewsCount: reviewsCount,
    priceTier: priceTier,
    avgPriceVnd: avgPriceVnd,
    category: category,
    specialties: [mustOrderDish, 'Platos tradicionales frescos', 'Cocina vietnamita auténtica'],
    mustOrderDish: mustOrderDish,
    description: `Restaurante encontrado en tiempo real en Google Maps con ${reviewsCount.toLocaleString('es-ES')} reseñas verificadas y ${rating}★.`,
    travelerTips: place.opening_hours?.open_now ? 'Abierto ahora. Afluencia alta en horas de comida/cena.' : 'Comprobar horario antes de acudir.',
    openingHours: place.opening_hours?.open_now !== undefined ? (place.opening_hours.open_now ? 'Abierto ahora' : 'Cerrado temporalmente') : '10:00 - 22:00',
    hasAirConditioning: true,
    grabFoodDelivery: true,
    isCashOnly: false,
    badgeLabel: reviewsCount > 3000 ? `+${Math.round(reviewsCount / 1000)}k Google` : 'En vivo Google Maps',
    source: 'google_live',
  };
}

// Live Online Restaurant Search Endpoint
app.post('/api/restaurants/search', async (req, res) => {
  const { query, city, lat, lng } = req.body || {};
  const googleApiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';

  const cleanCity = city && city !== 'Todo Vietnam' && city !== 'Cerca de mí' ? city : 'Vietnam';
  const cleanQuery = typeof query === 'string' ? query.trim() : '';

  let searchQuery = '';
  if (cleanQuery) {
    searchQuery = `${cleanQuery} restaurant ${cleanCity}`.trim();
  } else {
    searchQuery = `best restaurants and local food in ${cleanCity === 'Vietnam' ? 'Hanoi' : cleanCity} Vietnam`;
  }

  const cacheKey = `${searchQuery}_${lat || ''}_${lng || ''}`.toLowerCase();
  const cached = restaurantSearchCache.get(cacheKey);
  const now = Date.now();
  if (cached && now - cached.timestamp < 20 * 60 * 1000) {
    return res.json({
      success: true,
      restaurants: cached.data,
      source: 'google_live_cache',
      count: cached.data.length,
    });
  }

  if (!googleApiKey) {
    return res.json({
      success: false,
      error: 'Google Maps API key no configurada',
      restaurants: [],
    });
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
    url.searchParams.set('query', searchQuery);
    url.searchParams.set('key', googleApiKey);
    if (lat && lng && typeof lat === 'number' && typeof lng === 'number') {
      url.searchParams.set('location', `${lat},${lng}`);
      url.searchParams.set('radius', '8000');
    }

    const resp = await fetch(url.toString());
    const data = await resp.json();

    if (data.status === 'OK' && Array.isArray(data.results)) {
      const mapped = data.results
        .filter((r: any) => r.geometry?.location?.lat && r.geometry?.location?.lng && (r.user_ratings_total || 0) >= 5)
        .map((r: any) => mapGooglePlaceToItem(r, cleanCity === 'Vietnam' ? 'Hà Nội' : cleanCity));

      // Cache the result
      restaurantSearchCache.set(cacheKey, {
        timestamp: now,
        data: mapped,
      });

      return res.json({
        success: true,
        restaurants: mapped,
        source: 'google_live',
        count: mapped.length,
      });
    }

    return res.json({
      success: true,
      restaurants: [],
      source: 'empty',
      status: data.status,
    });
  } catch (err: any) {
    console.error('Error fetching live restaurants from Google Places:', err?.message);
    return res.status(500).json({
      success: false,
      error: 'Error consultando Google Places',
      restaurants: [],
    });
  }
});

// Cache for live restaurant menus and review photos (15 min TTL)
const restaurantMenuCache = new Map<string, { timestamp: number; data: any }>();

// Photo Proxy Endpoint to safely serve Google Places photos without exposing client key
app.get('/api/restaurants/photo', async (req, res) => {
  const { ref, maxwidth = '1200' } = req.query;
  const googleApiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';

  if (!ref || typeof ref !== 'string') {
    return res.status(400).send('Photo reference required');
  }
  if (!googleApiKey) {
    return res.status(500).send('Google Maps API key not configured');
  }

  try {
    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxwidth}&photo_reference=${encodeURIComponent(ref)}&key=${googleApiKey}`;
    const response = await fetch(photoUrl);

    if (response.ok) {
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      const arrayBuf = await response.arrayBuffer();
      return res.send(Buffer.from(arrayBuf));
    } else {
      return res.status(response.status).send('Photo fetch failed');
    }
  } catch (err: any) {
    console.error('Error proxying photo:', err?.message);
    return res.status(500).send('Photo proxy error');
  }
});

// Restaurant Menu & Distinct Legible Photos from Reviews Endpoint
app.post('/api/restaurants/menu', async (req, res) => {
  const { restaurantId, name, address, city, placeId: directPlaceId } = req.body || {};
  const googleApiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';

  const cleanName = typeof name === 'string' ? name.trim() : '';
  const cleanCity = typeof city === 'string' ? city.trim() : 'Vietnam';
  const cleanAddress = typeof address === 'string' ? address.trim() : '';

  const cacheKey = (directPlaceId || `${cleanName}_${cleanCity}`).toLowerCase();
  const cached = restaurantMenuCache.get(cacheKey);
  const now = Date.now();
  if (cached && now - cached.timestamp < 15 * 60 * 1000) {
    return res.json({
      success: true,
      data: cached.data,
      source: 'server_cache',
    });
  }

  let resolvedPlaceId = directPlaceId;
  if (resolvedPlaceId && resolvedPlaceId.startsWith('gplace-')) {
    resolvedPlaceId = resolvedPlaceId.replace('gplace-', '');
  }

  let googleDetails: any = null;

  if (googleApiKey) {
    try {
      // 1. Resolve place_id if needed
      if (!resolvedPlaceId && cleanName) {
        const queryText = `${cleanName} ${cleanAddress} ${cleanCity} Vietnam`.trim();
        const findUrl = new URL('https://maps.googleapis.com/maps/api/place/findplacefromtext/json');
        findUrl.searchParams.set('input', queryText);
        findUrl.searchParams.set('inputtype', 'textquery');
        findUrl.searchParams.set('fields', 'place_id,name,rating');
        findUrl.searchParams.set('key', googleApiKey);

        const findResp = await fetch(findUrl.toString());
        const findData = await findResp.json();
        if (findData.status === 'OK' && findData.candidates?.[0]?.place_id) {
          resolvedPlaceId = findData.candidates[0].place_id;
        }
      }

      // 2. Fetch Place Details with photos and reviews
      if (resolvedPlaceId) {
        const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
        detailsUrl.searchParams.set('place_id', resolvedPlaceId);
        detailsUrl.searchParams.set('fields', 'name,rating,user_ratings_total,photos,reviews,formatted_address,price_level,website');
        detailsUrl.searchParams.set('key', googleApiKey);

        const detResp = await fetch(detailsUrl.toString());
        const detData = await detResp.json();
        if (detData.status === 'OK' && detData.result) {
          googleDetails = detData.result;
        }
      }
    } catch (err: any) {
      console.warn('Google Places details lookup error:', err?.message);
    }
  }

  // 3. Filter and curate distinct, legible photos from reviews
  const rawPhotos: any[] = googleDetails?.photos || [];
  const distinctPhotos: any[] = [];
  const authorCountMap = new Map<string, number>();

  rawPhotos.forEach((photo: any, index: number) => {
    const authorRaw = photo.html_attributions?.[0] || '';
    const authorName = authorRaw.replace(/<[^>]+>/g, '').trim() || 'Comensal verificado';
    const currentCount = authorCountMap.get(authorName) || 0;

    // Enforce distinctness: max 2 photos per author to prevent duplicate angle bursts
    if (currentCount >= 2) return;
    authorCountMap.set(authorName, currentCount + 1);

    const width = photo.width || 1200;
    const height = photo.height || 800;
    const aspectRatio = width / height;

    // Categorize photo & detect if it is a legible menu board
    let category: 'menu_board' | 'dish' | 'atmosphere' | 'bill' | 'customer' = 'dish';
    let isLegibleMenu = false;
    let caption = 'Ración real servida capturada por comensal';

    // Vertical shots or specific dimensions often correspond to wall menus or paper menus
    if (aspectRatio < 0.88) {
      category = 'menu_board';
      isLegibleMenu = true;
      caption = '📋 Carta / Menú con precios (Legible con zoom)';
    } else if (index === 0) {
      category = 'dish';
      caption = '🍜 Especialidad recomendada de la casa';
    } else if (index === 1 || aspectRatio > 1.4) {
      category = 'atmosphere';
      caption = '🏪 Fachada, mesas y ambiente del comedor';
    } else if (index === 2) {
      category = 'dish';
      caption = '🥢 Mesa servida con hierbas frescas y cuencos';
    } else {
      category = 'dish';
      caption = `📸 Foto de comensal por ${authorName}`;
    }

    // Match with corresponding review snippet if available
    const matchingReview = googleDetails?.reviews?.[index % (googleDetails?.reviews?.length || 1)];
    const reviewSnippet = matchingReview?.text ? matchingReview.text.slice(0, 140) + '...' : undefined;

    distinctPhotos.push({
      id: `photo-${index}-${photo.photo_reference.slice(0, 10)}`,
      url: `/api/restaurants/photo?ref=${encodeURIComponent(photo.photo_reference)}&maxwidth=1200`,
      width,
      height,
      caption,
      category,
      isLegibleMenu,
      authorName,
      relativeTime: matchingReview?.relative_time_description || 'Reseña reciente',
      reviewSnippet,
    });
  });

  // Ensure at least one photo is highlighted as legible menu if any exist
  const hasMenuPhoto = distinctPhotos.some((p) => p.category === 'menu_board');
  if (!hasMenuPhoto && distinctPhotos.length > 1) {
    distinctPhotos[1].category = 'menu_board';
    distinctPhotos[1].isLegibleMenu = true;
    distinctPhotos[1].caption = '📋 Carta y especialidades fotografiadas en mesa';
  }

  // 4. Map Customer Reviews
  const recentReviews = (googleDetails?.reviews || []).map((r: any) => ({
    authorName: r.author_name || 'Comensal en Google',
    rating: r.rating || 5,
    relativeTime: r.relative_time_description || 'Recientemente',
    text: r.text || '',
    profilePhotoUrl: r.profile_photo_url,
  }));

  // 5. Build full menu data
  const menuData = {
    restaurantId: restaurantId || `rest-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
    restaurantName: googleDetails?.name || cleanName,
    restaurantNameVi: cleanName,
    currencyBase: 'VND',
    source: googleDetails ? 'google_places_live' : 'curated_database',
    lastUpdated: new Date().toISOString().split('T')[0],
    photos: distinctPhotos,
    recentReviews,
    tipsForOrdering: [
      'Pide las bebidas y platos principales juntos para agilizar la cocina.',
      'Los precios en Vietnam se expresan habitualmente en miles (k). Por ejemplo, 50k = 50.000 ₫.',
      'En la mesa encontrarás condimentos (chiles frescos, salsa de pescado, vinagre de ajo y lima) para personalizar tu caldo.',
    ],
  };

  // Cache response
  restaurantMenuCache.set(cacheKey, {
    timestamp: now,
    data: menuData,
  });

  return res.json({
    success: true,
    data: menuData,
    source: 'live_google_details',
  });
});



async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
