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
