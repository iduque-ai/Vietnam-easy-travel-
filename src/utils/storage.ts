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

// Text-to-speech pronunciation in Vietnamese
export function speakVietnamese(text: string): boolean {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return false;
  }

  try {
    window.speechSynthesis.cancel(); // Stop any pending speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.rate = 0.85; // Slightly slower for clarity
    utterance.pitch = 1.0;

    // Check if a vi-VN voice exists
    const voices = window.speechSynthesis.getVoices();
    const viVoice = voices.find((v) => v.lang.startsWith('vi'));
    if (viVoice) {
      utterance.voice = viVoice;
    }

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    console.warn('Speech synthesis error:', err);
    return false;
  }
}

// Text-to-speech pronunciation in English
export function speakEnglish(text: string): boolean {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return false;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find((v) => v.lang.startsWith('en'));
    if (enVoice) {
      utterance.voice = enVoice;
    }

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    console.warn('English speech synthesis error:', err);
    return false;
  }
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
export function getItineraryPlans(): ItineraryPlan[] {
  try {
    const raw = localStorage.getItem(ITINERARIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed reading itineraries from localStorage:', e);
  }
  // Initialize with curated defaults
  try {
    localStorage.setItem(ITINERARIES_KEY, JSON.stringify(DEFAULT_ITINERARIES));
  } catch {}
  return DEFAULT_ITINERARIES;
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
    if (raw) return raw;
  } catch {}
  const plans = getItineraryPlans();
  return plans.length > 0 ? plans[0].id : 'plan-classic-north-south-14d';
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
    conditions: ['Cacahuetes / Maní', 'Frutos secos (anacardos, nueces)', 'Aceite de cacahuete'],
    vietnameseLarge: 'XIN CHÚ Ý ĐẶC BIỆT! Tôi bị DỊ ỨNG NGUY HIỂM TÍNH MẠNG với ĐẬU PHỘNG (LẠC) và CÁC LOẠI HẠT. Xin TUYỆT ĐỐI KHÔNG CHO đậu phộng, dầu lạc, hạt điều vào thức ăn của tôi. Cảm ơn bạn!',
    phonetic: 'Sin choo ee dac biet! Toi bi di ung nguy hiem tinh mang voi dau phong (lac)...',
    allowedFoods: ['Cơm trắng (Arroz blanco)', 'Trứng chiên (Huevo frito)', 'Thịt luộc (Carne cocida)', 'Rau luộc (Verdura hervida)', 'Phở bò không lạc'],
    forbiddenIngredients: ['Đậu phộng / Lạc (Cacahuete)', 'Dầu lạc (Aceite cacahuete)', 'Bơ đậu phộng', 'Hạt điều (Anacardo)', 'Muối mè đậu phộng'],
    emergencyNote: 'Nếu tôi ăn phải đậu phộng, tôi sẽ bị sốc phản vệ và nghẹt thở. Vui lòng gọi cấp cứu 115 ngay lập tức!',
    createdAt: 1726900000000,
  },
  {
    id: 'card-seafood-shellfish',
    title: 'Alergia a Marisco y Crustáceos',
    personName: 'Ficha Marisco',
    conditions: ['Marisco', 'Gambas / Camarones', 'Calamar', 'Cangrejo'],
    vietnameseLarge: 'TÔI BỊ DỊ ỨNG RẤT NẶNG VỚI HẢI SẢN (TÔM, CUA, MỰC, TÉP, NGHÊU, SÒ). Xin KHÔNG DÙNG bất kỳ loại hải sản nào hoặc nước luộc hải sản để nấu cho tôi!',
    phonetic: 'Toi bi di ung rat nang voi hai san: tom, cua, muc, tep...',
    allowedFoods: ['Thịt gà (Pollo)', 'Thịt bò (Ternera)', 'Thịt heo (Cerdo)', 'Cơm trắng', 'Trứng chiên'],
    forbiddenIngredients: ['Tôm / Tép (Gambas)', 'Cua / Ghẹ (Cangrejo)', 'Mực (Calamar)', 'Mắm ruốc / Mắm tôm', 'Nước dùng ninh hải sản'],
    emergencyNote: 'Tôi sẽ bị sưng thanh quản và khó thở nếu dính hải sản. Cần gọi cấp cứu 115.',
    createdAt: 1726900100000,
  },
  {
    id: 'card-vegetarian-strict',
    title: 'Vegetariano / Vegano Estricto (Ăn Chay)',
    personName: 'Dieta Vegetariana',
    conditions: ['Carne y pollo', 'Pescado y marisco', 'Salsa de pescado tradicional', 'Grasa animal'],
    vietnameseLarge: 'TÔI ĂN CHAY (THANH TỊNH). Xin KHÔNG CHO: thịt, cá, hải sản, mỡ động vật và TUYỆT ĐỐI KHÔNG DÙNG NƯỚC MẮM thường. Xin dùng xì dầu (nước tương) hoặc nước mắm chay. Cảm ơn bạn!',
    phonetic: 'Toi an chay thanh tinh. Xin khong cho thit, ca, hai san, nuoc mam ca...',
    allowedFoods: ['Đậu phụ / Đậu hũ (Tofu)', 'Rau xào xì dầu', 'Nấm các loại (Setas)', 'Cơm trắng', 'Bún chay'],
    forbiddenIngredients: ['Nước mắm cá (Salsa de pescado)', 'Mỡ heo (Manteca)', 'Hạt nêm thịt Knorr', 'Tép khô'],
    emergencyNote: 'Xin đảm bảo chảo và muôi không dính mỡ động vật.',
    createdAt: 1726900200000,
  },
];

export function getSavedAllergyCards(): AllergyCardData[] {
  try {
    const raw = localStorage.getItem(ALLERGY_CARDS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed reading allergy cards from localStorage:', e);
  }
  // Store default cards
  try {
    localStorage.setItem(ALLERGY_CARDS_KEY, JSON.stringify(DEFAULT_ALLERGY_CARDS));
  } catch {}
  return DEFAULT_ALLERGY_CARDS;
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


