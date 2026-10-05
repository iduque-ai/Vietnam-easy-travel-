import { ExchangeRatesData, ItineraryPlan, ItineraryStop, AllergyCardData, FreeTourData } from '../types';
import { DEFAULT_ITINERARIES } from '../data/defaultItineraries';
import { POINTS_OF_INTEREST } from '../data/pois';

const RATES_KEY = 'vietnam_travel_exchange_rates_v1';
const DOWNLOADED_PACKS_KEY = 'vietnam_travel_downloaded_packs_v1';
const FAVORITE_POIS_KEY = 'vietnam_travel_favorite_pois_v1';
const ALLERGY_CARDS_KEY = 'vietnam_travel_allergy_cards_v1';
const ITINERARIES_KEY = 'vietnam_travel_itineraries_v1';
const ACTIVE_ITINERARY_ID_KEY = 'vietnam_travel_active_itinerary_id_v1';

// Default solid baseline rates (updated to current ~29k VND / 1 EUR and ~26k / 1 USD)
export const DEFAULT_FALLBACK_RATES: ExchangeRatesData = {
  timestamp: Date.now(),
  date: new Date().toISOString().split('T')[0],
  base: 'USD',
  rates: {
    VND: 26000,
    EUR: 0.8965, // 26000 / 0.8965 = ~29001 ₫ por 1 €
    USD: 1.0,    // 26000 ₫ por 1 $
    GBP: 0.76,   // ~34200 ₫ por 1 £
    AUD: 1.51,   // ~17200 ₫ por 1 A$
    CAD: 1.36,   // ~19100 ₫ por 1 C$
    JPY: 151.0,
    CHF: 0.86,
    MXN: 19.3,
    SGD: 1.31,
    THB: 34.5,
  },
  source: 'offline_fallback',
};

// Rates storage
export function getSavedRates(): ExchangeRatesData {
  try {
    const raw = localStorage.getItem(RATES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.rates && parsed.rates.VND) {
        // Upgrade check: If user had the old 27k offline fallback cached, update to 29k baseline
        const effectiveEurRate = parsed.rates.VND / (parsed.rates.EUR || 1);
        if (parsed.source === 'offline_fallback' && effectiveEurRate < 28200) {
          saveRates(DEFAULT_FALLBACK_RATES);
          return DEFAULT_FALLBACK_RATES;
        }
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed reading rates from storage:', e);
  }
  return DEFAULT_FALLBACK_RATES;
}

export function saveRates(data: ExchangeRatesData): void {
  try {
    localStorage.setItem(RATES_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed saving rates to storage:', e);
  }
}

export function isRatesStale(ratesData: ExchangeRatesData): boolean {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  return Date.now() - ratesData.timestamp > ONE_DAY_MS;
}

// Downloaded offline map packs
export function getDownloadedPackIds(): string[] {
  try {
    const raw = localStorage.getItem(DOWNLOADED_PACKS_KEY);
    return raw ? JSON.parse(raw) : ['reg-hanoi-north']; // pre-cache Hanoi by default!
  } catch {
    return ['reg-hanoi-north'];
  }
}

export function saveDownloadedPackIds(ids: string[]): void {
  try {
    localStorage.setItem(DOWNLOADED_PACKS_KEY, JSON.stringify(ids));
  } catch (e) {
    console.error(e);
  }
}

// Favorite POIs
export function getFavoritePoiIds(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITE_POIS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveFavoritePoiIds(ids: string[]): void {
  try {
    localStorage.setItem(FAVORITE_POIS_KEY, JSON.stringify(ids));
  } catch (e) {
    console.error(e);
  }
}

// Pre-cache and get best available voice for language
let cachedVoices: SpeechSynthesisVoice[] = [];

if (typeof window !== 'undefined' && window.speechSynthesis) {
  const updateVoices = () => {
    try {
      cachedVoices = window.speechSynthesis.getVoices();
    } catch {}
  };
  updateVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = updateVoices;
  }
}

function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  if (cachedVoices.length === 0) {
    try {
      cachedVoices = window.speechSynthesis.getVoices();
    } catch {}
  }
  return cachedVoices;
}

// Clean text for speech synthesis (strip emojis, unwanted brackets, etc.)
function cleanTextForSpeech(text: string): string {
  return text
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export * from './speechSynthesis';
import {
  playNaturalSpeech,
  speakVietnameseNatural,
  speakSpanishNatural,
  speakEnglishNatural,
  stopAllSpeech,
} from './speechSynthesis';

// Enhanced Text-to-speech pronunciation in Vietnamese (Natural Neural / Calibrated)
export function speakVietnamese(text: string, id?: string): boolean {
  if (!text) return false;
  return speakVietnameseNatural(text, id);
}

// Enhanced Text-to-speech pronunciation in Spanish (Natural & Warm)
export function speakSpanish(text: string, id?: string): boolean {
  if (!text) return false;
  return speakSpanishNatural(text, id);
}

// Enhanced Text-to-speech pronunciation in English
export function speakEnglish(text: string, id?: string): boolean {
  if (!text) return false;
  return speakEnglishNatural(text, id);
}

// Launch Google Translate in text mode (English <-> Vietnamese)
export function openGoogleTranslate(sourceLang: string = 'en', targetLang: string = 'vi', text?: string): void {
  if (typeof window === 'undefined') return;

  const textParam = text && text.trim() ? `&text=${encodeURIComponent(text.trim())}` : '';
  const webUrl = `https://translate.google.com/?sl=${sourceLang}&tl=${targetLang}${textParam}&op=translate`;

  const isAndroid = /Android/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (isAndroid) {
    // Android intent for Google Translate app in text mode, falling back to web
    const intentUrl = `intent://translate.google.com/?sl=${sourceLang}&tl=${targetLang}${textParam}&op=translate#Intent;scheme=https;package=com.google.android.apps.translate;action=android.intent.action.VIEW;end`;
    try {
      window.location.href = intentUrl;
      setTimeout(() => {
        window.open(webUrl, '_blank', 'noopener,noreferrer');
      }, 1000);
      return;
    } catch {
      window.open(webUrl, '_blank', 'noopener,noreferrer');
      return;
    }
  }

  if (isIOS) {
    // iOS custom scheme if app is installed, falling back to web
    const iosScheme = `googletranslate://?sl=${sourceLang}&tl=${targetLang}${textParam}`;
    try {
      window.location.href = iosScheme;
      setTimeout(() => {
        window.open(webUrl, '_blank', 'noopener,noreferrer');
      }, 1000);
      return;
    } catch {
      window.open(webUrl, '_blank', 'noopener,noreferrer');
      return;
    }
  }

  // Desktop or fallback
  window.open(webUrl, '_blank', 'noopener,noreferrer');
}

// Alias for backwards compatibility
export const openGoogleTranslateConversation = openGoogleTranslate;

const DEFAULT_TRANSLATOR_SUBTAB_KEY = 'vietnam_travel_default_translator_subtab';

export function getDefaultTranslatorSubTab(): string {
  try {
    return localStorage.getItem(DEFAULT_TRANSLATOR_SUBTAB_KEY) || 'conversation';
  } catch {
    return 'conversation';
  }
}

export function setDefaultTranslatorSubTab(subTab: string): void {
  try {
    localStorage.setItem(DEFAULT_TRANSLATOR_SUBTAB_KEY, subTab);
  } catch (e) {
    console.warn('Failed saving default translator tab:', e);
  }
}

// ================= ITINERARY STORAGE =================
export const BLANK_INITIAL_PLAN: ItineraryPlan = {
  id: 'plan-my-trip',
  title: 'Mi Viaje a Vietnam',
  description: 'Ruta personalizada',
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
  destinations: ['Hà Nội'],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  days: [
    {
      id: 'day-1',
      dayNumber: 1,
      destinationCity: 'Hà Nội',
      title: 'Día 1: Hanói',
      notes: '',
      stops: [],
    },
  ],
};

export function getItineraryPlans(): ItineraryPlan[] {
  try {
    const raw = localStorage.getItem(ITINERARIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // If the only stored plan was the old hardcoded generic template, start fresh with blank personal plan
        const hasUserPlan = parsed.some((p) => p.id !== 'plan-classic-north-south-14d');
        if (hasUserPlan) {
          return parsed;
        }
      }
    }
  } catch (e) {
    console.error('Failed reading itineraries from localStorage:', e);
  }
  // Initialize with blank starting plan
  try {
    localStorage.setItem(ITINERARIES_KEY, JSON.stringify([BLANK_INITIAL_PLAN]));
    localStorage.setItem(ACTIVE_ITINERARY_ID_KEY, BLANK_INITIAL_PLAN.id);
  } catch {}
  return [BLANK_INITIAL_PLAN];
}

export function saveItineraryPlans(plans: ItineraryPlan[]): void {
  try {
    localStorage.setItem(ITINERARIES_KEY, JSON.stringify(plans));
  } catch (e) {
    console.error('Failed saving itineraries to localStorage:', e);
  }
}

export function getActivePlanId(): string {
  try {
    const raw = localStorage.getItem(ACTIVE_ITINERARY_ID_KEY);
    if (raw && raw !== 'plan-classic-north-south-14d') return raw;
  } catch {}
  const plans = getItineraryPlans();
  return plans.length > 0 ? plans[0].id : BLANK_INITIAL_PLAN.id;
}

export function saveActivePlanId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_ITINERARY_ID_KEY, id);
  } catch (e) {
    console.error(e);
  }
}

export function addPoiToItineraryDay(
  planId: string,
  dayId: string,
  poiId: string,
  timeSlot?: string,
  notes?: string
): boolean {
  try {
    const plans = getItineraryPlans();
    const planIndex = plans.findIndex((p) => p.id === planId);
    if (planIndex === -1) return false;

    const plan = plans[planIndex];
    const dayIndex = plan.days.findIndex((d) => d.id === dayId);
    if (dayIndex === -1) return false;

    const poi = POINTS_OF_INTEREST.find((p) => p.id === poiId);

    const newStop: ItineraryStop = {
      id: 'stop-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      poiId,
      timeSlot: timeSlot || 'Horario libre',
      ticketVnd: poi ? poi.ticketVnd : 0,
      notes: notes || (poi ? poi.travelerTips : ''),
      isVisited: false,
    };

    plan.days[dayIndex].stops.push(newStop);
    plan.updatedAt = Date.now();
    plans[planIndex] = plan;

    saveItineraryPlans(plans);
    return true;
  } catch (e) {
    console.error('Error adding POI to itinerary:', e);
    return false;
  }
}

// ================= ALLERGY & DIETARY CARDS STORAGE =================
export const DEFAULT_ALLERGY_CARDS: AllergyCardData[] = [
  {
    id: 'card-peanut-tree-nuts',
    title: 'Alergia a Cacahuetes y Frutos Secos',
    personName: 'Ficha Principal',
    conditions: ['Cacahuetes y maní', 'Frutos secos (anacardos, nueces)', 'Aceite de cacahuete'],
    vietnameseLarge: 'XIN CHÀO! TÔI BỊ DỊ ỨNG NGUY HIỂM TÍNH MẠNG VỚI ĐẬU PHỘNG (LẠC) VÀ CÁC LOẠI HẠT.\n\nXin vui lòng:\n1. TUYỆT ĐỐI KHÔNG CHO đậu phộng, dầu lạc, hạt điều vào món ăn của tôi.\n2. KHÔNG DÙNG dầu đã chiên qua đậu phộng.\n\nĂn phải sẽ bị sốc phản vệ nguy hiểm. Xin cảm ơn!',
    phonetic: 'Sin chao! Toi bi di ung: Tuyet doi khong an dau phong, hat dieu. Xin cam on!',
    allowedFoods: ['Cơm trắng', 'Trứng chiên', 'Thịt luộc', 'Rau luộc', 'Phở bò chín không lạc'],
    forbiddenIngredients: ['Đậu phộng / Lạc', 'Dầu lạc', 'Hạt điều', 'Bơ đậu phộng', 'Muối mè đậu phộng'],
    emergencyNote: 'Nếu tôi có dấu hiệu khó thở hoặc sốc phản vệ, vui lòng gọi cấp cứu 115 ngay lập tức.',
    createdAt: 1726900000000,
  },
  {
    id: 'card-seafood-shellfish',
    title: 'Alergia a Marisco y Crustáceos',
    personName: 'Ficha Marisco',
    conditions: ['Marisco y crustáceos', 'Gambas y langostinos', 'Calamar', 'Cangrejo'],
    vietnameseLarge: 'XIN CHÀO! TÔI BỊ DỊ ỨNG RẤT NẶNG VỚI HẢI SẢN (TÔM, CUA, MỰC, NGHÊU, SÒ).\n\nXin vui lòng:\n1. TUYỆT ĐỐI KHÔNG DÙNG bất kỳ loại hải sản nào.\n2. KHÔNG DÙNG nước luộc hải sản để nấu món ăn cho tôi.\n\nĂn phải sẽ rất nguy hiểm. Xin cảm ơn!',
    phonetic: 'Sin chao! Toi bi di ung rat nang voi hai san: tom, cua, muc. Xin cam on!',
    allowedFoods: ['Thịt gà', 'Thịt bò', 'Thịt heo', 'Cơm trắng', 'Trứng chiên'],
    forbiddenIngredients: ['Tôm / Tép', 'Cua / Ghẹ', 'Mực', 'Mắm ruốc / Mắm tôm', 'Nước dùng ninh hải sản'],
    emergencyNote: 'Nếu tôi bị sưng thanh quản hoặc khó thở, vui lòng gọi cấp cứu 115 ngay lập tức.',
    createdAt: 1726900100000,
  },
  {
    id: 'card-vegetarian-strict',
    title: 'Dieta Vegetariana y Vegana (Ăn Chay)',
    personName: 'Dieta Vegetariana',
    conditions: ['Carne y pollo', 'Pescado y marisco', 'Salsa de pescado tradicional', 'Manteca y grasa animal'],
    vietnameseLarge: 'XIN CHÀO! TÔI ĂN CHAY THANH TỊNH (THUẦN CHAY).\n\nXin vui lòng:\n1. KHÔNG CHO thịt, cá, hải sản, mỡ động vật.\n2. TUYỆT ĐỐI KHÔNG DÙNG nước mắm cá truyền thống (xin dùng nước tương / xì dầu hoặc nước mắm chay).\n\nXin cảm ơn nhà hàng!',
    phonetic: 'Sin chao! Toi an chay thanh tinh. Khong an thit, ca, hai san, nuoc mam. Xin cam on!',
    allowedFoods: ['Đậu phụ / Đậu hũ', 'Rau xào xì dầu', 'Nấm các loại', 'Cơm trắng', 'Bún chay'],
    forbiddenIngredients: ['Nước mắm cá', 'Mỡ heo', 'Thịt các loại', 'Hạt nêm thịt heo', 'Tép khô'],
    emergencyNote: 'Xin vui lòng đảm bảo chảo và muôi không dính mỡ động vật.',
    createdAt: 1726900200000,
  },
];

export function getSavedAllergyCards(): AllergyCardData[] {
  try {
    const raw = localStorage.getItem(ALLERGY_CARDS_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed reading allergy cards from localStorage:', e);
  }
  return [];
}

export function saveAllergyCards(cards: AllergyCardData[]): void {
  try {
    localStorage.setItem(ALLERGY_CARDS_KEY, JSON.stringify(cards));
  } catch (e) {
    console.error('Failed saving allergy cards to localStorage:', e);
  }
}

export function saveSingleAllergyCard(card: AllergyCardData): AllergyCardData[] {
  const current = getSavedAllergyCards();
  const existingIdx = current.findIndex((c) => c.id === card.id);
  let updated: AllergyCardData[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = card;
  } else {
    updated = [card, ...current];
  }
  saveAllergyCards(updated);
  return updated;
}

export function deleteSavedAllergyCard(cardId: string): AllergyCardData[] {
  const current = getSavedAllergyCards();
  const updated = current.filter((c) => c.id !== cardId);
  saveAllergyCards(updated);
  return updated;
}

const SAVED_TOURS_KEY = 'vietnam_travel_saved_free_tours_v1';

export function getSavedFreeTours(): FreeTourData[] {
  try {
    const raw = localStorage.getItem(SAVED_TOURS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed reading saved free tours from localStorage:', e);
  }
  return [];
}

export function saveFreeTour(tour: FreeTourData): FreeTourData[] {
  const current = getSavedFreeTours();
  const existingIdx = current.findIndex(
    (t) => t.placeName.toLowerCase() === tour.placeName.toLowerCase()
  );
  let updated: FreeTourData[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = tour;
  } else {
    updated = [tour, ...current];
  }
  try {
    localStorage.setItem(SAVED_TOURS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed saving free tour to localStorage:', e);
  }
  return updated;
}

export function deleteSavedFreeTour(placeName: string): FreeTourData[] {
  const current = getSavedFreeTours();
  const updated = current.filter(
    (t) => t.placeName.toLowerCase() !== placeName.toLowerCase()
  );
  try {
    localStorage.setItem(SAVED_TOURS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed deleting free tour from localStorage:', e);
  }
  return updated;
}

const CUSTOM_TRANSLATION_CARDS_KEY = 'vietnam_travel_custom_translation_cards_v1';

export interface CustomTranslationCard {
  id: string;
  label: string;
  category: 'precios' | 'comida' | 'transporte' | 'cortesia' | 'emergencia';
  en: string;
  es: string;
  vi: string;
  phonetic: string;
  tip?: string;
  createdAt: number;
}

export function getSavedCustomCards(): CustomTranslationCard[] {
  try {
    const raw = localStorage.getItem(CUSTOM_TRANSLATION_CARDS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed reading custom translation cards from localStorage:', e);
  }
  return [];
}

export function saveCustomCard(card: CustomTranslationCard): CustomTranslationCard[] {
  const current = getSavedCustomCards();
  const existingIdx = current.findIndex((c) => c.id === card.id);
  let updated: CustomTranslationCard[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = card;
  } else {
    // Custom cards appear first
    updated = [card, ...current];
  }
  try {
    localStorage.setItem(CUSTOM_TRANSLATION_CARDS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed saving custom card to localStorage:', e);
  }
  return updated;
}

export function deleteSavedCustomCard(id: string): CustomTranslationCard[] {
  const current = getSavedCustomCards();
  const updated = current.filter((c) => c.id !== id);
  try {
    localStorage.setItem(CUSTOM_TRANSLATION_CARDS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed deleting custom card from localStorage:', e);
  }
  return updated;
}


