export type ActiveTabType = 'converter' | 'translator' | 'maps' | 'itinerary' | 'freetour';

export type CurrencyCode = 'EUR' | 'USD' | 'GBP' | 'AUD' | 'CAD' | 'JPY' | 'CHF' | 'MXN' | 'SGD' | 'THB';

export interface ExchangeRatesData {
  timestamp: number;
  date: string;
  base: string;
  rates: Record<string, number>;
  source: 'live_network' | 'server_cache' | 'offline_fallback' | 'local_storage';
}

export interface PhraseItem {
  id: string;
  category: 'compras' | 'comida' | 'transporte' | 'emergencias' | 'cortesia' | 'numeros';
  spanish: string;
  vietnamese: string;
  phonetic: string;
  toneTip?: string;
  audioText?: string;
  priority?: boolean;
}

export interface DishItem {
  id: string;
  nameVi: string;
  nameEs: string;
  phonetic: string;
  region: 'Norte' | 'Centro' | 'Sur' | 'Nacional';
  category: 'Sopa / Fideos' | 'Plato Principal' | 'Bocadillo / Street' | 'Bebida / Café' | 'Postre';
  description: string;
  ingredients: string[];
  howToOrderTip: string;
  dietaryNotes: string; // e.g. "Suele llevar cilantro", "Contiene salsa de pescado"
}

export interface PointOfInterest {
  id: string;
  regionId: string;
  nameVi: string;
  nameEs: string;
  category: 'Monumento' | 'Gastronomía' | 'Naturaleza' | 'Mercado' | 'Cultura' | 'Transporte';
  lat: number;
  lng: number;
  city: string;
  rating: number;
  ticketVnd: number; // 0 if free
  openingHours: string;
  bestTime: string;
  description: string;
  travelerTips: string;
  scamAlert?: string;
  howToGet: string;
  grabFriendly: boolean;
}

export interface RegionMapPack {
  id: string;
  name: string;
  vietnameseName: string;
  subtitle: string;
  sizeMb: string;
  description: string;
  centerLat: number;
  centerLng: number;
  zoom: number;
  poiIds: string[];
  highlights: string[];
}

export interface ItineraryStop {
  id: string;
  poiId?: string; // Optional reference to a PointOfInterest from maps
  customName?: string;
  timeSlot?: string; // e.g. "Mañana", "Tarde", "Noche", "09:30"
  ticketVnd?: number;
  notes?: string;
  isVisited: boolean;
}

export interface ItineraryDay {
  id: string;
  dayNumber: number;
  date?: string; // e.g. "2026-10-15"
  destinationCity: string; // e.g. "Hà Nội", "Hạ Long", "Ninh Bình", "Huế", "Hội An", "Đà Nẵng", "TP. Hồ Chí Minh"
  title: string;
  notes?: string;
  stops: ItineraryStop[];
}

export interface ItineraryPlan {
  id: string;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  destinations: string[];
  createdAt: number;
  updatedAt: number;
  days: ItineraryDay[];
}

export interface AllergyCardData {
  id: string;
  title: string;
  vietnameseLarge: string;
  phonetic?: string;
  allowedFoods?: string[];
  forbiddenIngredients?: string[];
  emergencyNote?: string;
  conditions: string[];
  createdAt: number;
  personName?: string;
}

export interface FreeTourStop {
  number: number;
  title: string;
  whatToLookAt: string;
  story: string;
  insiderTip: string;
}

export interface FreeTourData {
  placeName: string;
  cityName: string;
  vietnameseName?: string;
  tagline: string;
  audioGuideScript: string;
  durationMinutes: number;
  stops: FreeTourStop[];
  photoSpot: {
    location: string;
    bestLight: string;
    instruction: string;
  };
  culturalEtiquette: {
    dressCode: string;
    whatNotToDo: string;
    scamWarning?: string;
  };
  streetFoodReward: {
    dishNameVi: string;
    dishNameEs: string;
    whereToFind: string;
    priceEstimate: string;
  };
  suggestedQuestions: string[];
}

export interface TourChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}


