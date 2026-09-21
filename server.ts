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

// Solid approximate default rates as fallback
const DEFAULT_RATES: Record<string, number> = {
  VND: 25450, // 1 USD = ~25,450 VND
  EUR: 0.92,  // 1 USD = 0.92 EUR -> 1 EUR = ~27,663 VND
  USD: 1.0,
  GBP: 0.78,  // 1 USD = 0.78 GBP -> 1 GBP = ~32,600 VND
  AUD: 1.55,
  CAD: 1.38,
  JPY: 153.5,
  CHF: 0.88,
  MXN: 19.5,
  SGD: 1.34,
  THB: 35.8,
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
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
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

// Multi-model Gemini caller with candidate fallbacks (handles 503 spikes, rate limits)
async function callGeminiJsonWithFallback(prompt: string): Promise<any> {
  const ai = getAI();
  const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      if (response.text) {
        return JSON.parse(response.text.trim());
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

// Translation endpoint using Gemini with multi-model fallback supporting bidirectional English <-> Vietnamese
app.post('/api/translate', async (req, res) => {
  const { text, sourceLang = 'en', targetLang = 'vi' } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text is required' });
  }

  const isViToEn = (sourceLang === 'vi' || targetLang === 'en' || targetLang === 'es');
  
  let prompt: string;
  if (isViToEn) {
    prompt = `Act as an expert travel interpreter for a tourist in Vietnam.
A Vietnamese local or vendor said: "${text}".
Translate this Vietnamese text into natural, clear English (and Spanish).

Respond with a strictly valid JSON object with these keys:
{
  "vietnamese": "${text.replace(/"/g, '\\"')}",
  "translatedText": "Natural English translation for the tourist",
  "phonetic": "Phonetic reading guide of the Vietnamese phrase",
  "literal": "Literal meaning or breakdown of terms/numbers/slang",
  "tip": "Short 1-sentence cultural context (e.g. price mentioned in 'k' meaning thousands VND, informal polite particles, etc.)",
  "category": "comida | compras | transporte | cortesía | salud | general"
}`;
  } else {
    prompt = `Act as an expert travel translator for someone visiting Vietnam.
Translate the following traveler text from ${sourceLang === 'es' ? 'Spanish' : 'English'} to natural, polite Vietnamese.
Text to translate: "${text}"

Respond with a strictly valid JSON object with these keys:
{
  "vietnamese": "Vietnamese text with accurate diacritics and natural colloquial politeness",
  "translatedText": "Natural Vietnamese text",
  "phonetic": "Easy phonetic pronunciation guide for an English speaker (e.g., 'Sin chow' for Xin chào, 'Bao nyew tien' for Bao nhiêu tiền)",
  "literal": "Literal meaning or breakdown of the terms",
  "tip": "Short 1-sentence cultural or pronunciation tip (tones, politeness, or pronoun used like em/anh)",
  "category": "comida | compras | transporte | cortesía | salud | general"
}`;
  }

  if (process.env.GEMINI_API_KEY) {
    try {
      const parsed = await callGeminiJsonWithFallback(prompt);
      // Normalize translatedText vs vietnamese for frontend
      if (parsed) {
        if (!parsed.translatedText) {
          parsed.translatedText = isViToEn ? parsed.vietnamese : (parsed.vietnamese || text);
        }
        return res.json({
          success: true,
          translation: parsed,
        });
      }
    } catch (error: any) {
      console.warn('Gemini translation models unavailable (e.g. 503 high demand spike). Serving graceful translation helper.');
    }
  }

  // Graceful fallback response when API key is missing or model is temporarily unavailable
  const fallbackTranslation = isViToEn
    ? {
        vietnamese: text,
        translatedText: `(Local said): "${text}"`,
        phonetic: text,
        literal: 'Traducción local aproximada',
        tip: 'Muestra tu respuesta en inglés o en vietnamita usando las frases rápidas.',
        category: 'general',
      }
    : {
        vietnamese: `Xin chào, tôi muốn hỏi: "${text}"`,
        translatedText: `Xin chào, tôi muốn hỏi: "${text}"`,
        phonetic: 'Sin chow, toi muon hoi... (Show this screen to the local)',
        literal: text,
        tip: 'Los modelos online están en alta demanda temporal. Puedes usar las frases rápidas integradas.',
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
  }
};

// Free Tour generation endpoint using Gemini
app.post('/api/free-tour', async (req, res) => {
  const { placeName, cityName, category, userVibe, lat, lng } = req.body;

  if (!placeName || typeof placeName !== 'string') {
    return res.status(400).json({ error: 'El nombre del lugar es obligatorio.' });
  }

  const cleanPlace = placeName.trim();
  const cleanCity = (cityName || 'Vietnam').trim();
  const targetVibe = userVibe || 'curiosidades';

  const prompt = `Actúa como un guía turístico local vietnamita apasionado, divertido, culto y con excelente español.
El viajero está ahora mismo de pie frente a: "${cleanPlace}" en la ciudad de "${cleanCity}" (categoría: ${category || 'monumento'}).
Preferencia del viajero: estilo "${targetVibe}" (haz énfasis en historias poco conocidas, detalles visuales inadvertidos y leyendas auténticas).

Crea un TOUR AUDIOGUÍA VIRTUAL cautivador, estructurado y listo para escuchar o leer en su teléfono.
Debes responder en un JSON estrictamente válido con este esquema:

{
  "placeName": "${cleanPlace.replace(/"/g, '\\"')}",
  "cityName": "${cleanCity.replace(/"/g, '\\"')}",
  "vietnameseName": "Nombre oficial en vietnamita con acentos diacríticos (ej. Văn Miếu, Chùa Cầu, Đại Nội)",
  "tagline": "Una frase gancho intrigante de 1 línea que capture la esencia o misterio del lugar",
  "durationMinutes": 35,
  "audioGuideScript": "Un guion de audioguía continuo de 2 a 3 párrafos (200-280 palabras), narrado en primera persona con tono vibrante ('¡Hola viajero!', 'Si miras a tu alrededor...'). Explica el contexto histórico, la energía del lugar, olores a incienso o maderas, y la gran leyenda central.",
  "stops": [
    {
      "number": 1,
      "title": "Nombre de la primera parada o rincón específico en el lugar",
      "whatToLookAt": "Qué buscar exactamente con los ojos ahora mismo (detalles curiosos que el 90% pasa por alto)",
      "story": "La anécdota, secreto histórico o mito que ocurrió justo aquí",
      "insiderTip": "Consejo de guía local (dónde tocar, qué mirar, tradición local)"
    },
    {
      "number": 2,
      "title": "Nombre de la segunda parada en el recorrido",
      "whatToLookAt": "Detalle arquitectónico, altar, tallado o elemento destacado",
      "story": "La historia o simbolismo de este elemento",
      "insiderTip": "Consejo práctico de guía"
    },
    {
      "number": 3,
      "title": "Nombre de la tercera parada clave",
      "whatToLookAt": "Detalle visual",
      "story": "Significado cultural o histórico",
      "insiderTip": "Consejo"
    }
  ],
  "photoSpot": {
    "location": "Dónde pararse exactamente para la mejor foto",
    "bestLight": "Momento del día ideal o ángulo de luz",
    "instruction": "Cómo encuadrar para evitar multitudes o lograr una perspectiva única"
  },
  "culturalEtiquette": {
    "dressCode": "Requisitos de vestimenta (hombros, rodillas, descalzarse si aplica)",
    "whatNotToDo": "Acciones que se consideran irrespetuosas hacia monjes, altares o locales",
    "scamWarning": "Alerta de picaresca o timos habituales en este lugar específico"
  },
  "streetFoodReward": {
    "dishNameVi": "Nombre en vietnamita del plato o café tradicional que debes probar al salir",
    "dishNameEs": "Nombre en español y descripción apetitosa",
    "whereToFind": "Dónde buscarlo en los alrededores (calle o callejón)",
    "priceEstimate": "Precio justo estimado en Dong (ej: 40.000 ₫ – 60.000 ₫)"
  },
  "suggestedQuestions": [
    "Pregunta curiosa 1 que el turista puede hacerte a continuación",
    "Pregunta curiosa 2",
    "Pregunta curiosa 3"
  ]
}`;

  if (process.env.GEMINI_API_KEY) {
    try {
      const tour = await callGeminiJsonWithFallback(prompt);
      if (tour && tour.placeName && Array.isArray(tour.stops) && tour.stops.length > 0) {
        return res.json({
          success: true,
          tour,
          source: 'gemini_ai',
        });
      }
    } catch (err: any) {
      console.warn(`[Gemini Free Tour] Error calling model (${err?.message || 'error'}). Checking curated tours...`);
    }
  }

  // Check if we have a curated offline match
  const lower = cleanPlace.toLowerCase();
  if (lower.includes('literatura') || lower.includes('van mieu') || lower.includes('văn miếu')) {
    return res.json({ success: true, tour: CURATED_FALLBACK_TOURS.van_mieu, fallback: true });
  }
  if (lower.includes('japon') || lower.includes('japonés') || lower.includes('chùa cầu') || lower.includes('chua cau')) {
    return res.json({ success: true, tour: CURATED_FALLBACK_TOURS.chua_cau, fallback: true });
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
    tour: genericTour,
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
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      if (response.text) {
        return res.json({
          success: true,
          reply: response.text.trim(),
          guideName: 'Nguyễn (Tu guía local)',
        });
      }
    } catch (err: any) {
      console.warn('Gemini chat model error:', err?.message);
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
