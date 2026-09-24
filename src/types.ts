export type ActiveTabType = 'converter' | 'translator' | 'restaurants' | 'maps' | 'itinerary' | 'freetour';

export type CurrencyCode = 'EUR' | 'USD' | 'GBP' | 'AUD' | 'CAD' | 'JPY' | 'CHF' | 'MXN' | 'SGD' | 'THB';

export type BudgetPreference = 'all' | 'budget' | 'moderate' | 'fine';

export type RestaurantSortOption =
  | 'algorithm' // Algoritmo inteligente (puntuación + volumen + presupuesto)
  | 'rating' // Mayor puntuación bayesiana
  | 'reviews' // Mayor número de reseñas verificadas
  | 'distance' // Más cercano (GPS / centro seleccionado)
  | 'value' // Mejor relación calidad/precio
  | 'price_asc'; // Precio más económico primero

export interface RestaurantItem {
  id: string;
  name: string;
  nameVi: string;
  city: string; // e.g. "Hà Nội", "Huế", "Đà Nẵng", "Hội An", "TP. Hồ Chí Minh", "Ninh Bình"
  district: string;
  address: string;
  lat: number;
  lng: number;
  rating: number; // e.g. 4.8
  reviewsCount: number; // e.g. 2450
  priceTier: 1 | 2 | 3 | 4; // 1: <60k VND, 2: 60k-180k VND, 3: 180k-400k VND, 4: >400k VND
  avgPriceVnd: number; // e.g. 45000, 120000
  category:
    | 'Street Food / Puesto Callejero'
    | 'Restaurante Tradicional'
    | 'Bocadillos & Bánh Mì'
    | 'Café de Especialidad'
    | 'Bistró / Fusión'
    | 'Alta Cocina / Michelin';
  specialties: string[];
  mustOrderDish: string;
  description: string;
  travelerTips: string;
  openingHours: string;
  hasAirConditioning: boolean;
  michelinGuide?: '1 Star' | 'Bib Gourmand' | 'Selected';
  grabFoodDelivery: boolean;
  isCashOnly: boolean;
  badgeLabel?: string;
  imageUrl?: string;
  source?: 'google_live' | 'offline_curated';
  menuData?: RestaurantMenuData;
}

export interface RestaurantMenuItem {
  id: string;
  nameVi: string;
  nameEs: string;
  phonetic?: string;
  description: string;
  priceVnd: number;
  category: 'Platos Principales' | 'Entrantes & Frituras' | 'Bebidas & Cafés' | 'Postres & Extras';
  dietary?: string[];
  isSignature?: boolean;
  portionSize?: string;
  imageUrl?: string;
}

export interface RestaurantReviewPhoto {
  id: string;
  url: string;
  width: number;
  height: number;
  caption: string;
  category: 'menu_board' | 'dish' | 'atmosphere' | 'bill' | 'customer';
  authorName?: string;
  relativeTime?: string;
  isLegibleMenu?: boolean;
  reviewSnippet?: string;
}

export interface RestaurantReviewItem {
  authorName: string;
  rating: number;
  relativeTime: string;
  text: string;
  profilePhotoUrl?: string;
}

export interface RestaurantMenuData {
  restaurantId: string;
  restaurantName: string;
  restaurantNameVi?: string;
  currencyBase: 'VND';
  items: RestaurantMenuItem[];
  photos: RestaurantReviewPhoto[];
  recentReviews?: RestaurantReviewItem[];
  tipsForOrdering?: string[];
  lastUpdated?: string;
  source: 'google_places_live' | 'curated_database' | 'ai_extracted';
}

export interface RestaurantScoreBreakdown {
  bayesianRating: number; // Puntuación ponderada amortiguada
  volumeBonus: number; // Multiplicador de confianza por volumen
  budgetMatchMultiplier: number; // Factor de encaje de presupuesto
  valueScore: number; // Relación calidad/precio
  distanceKm?: number; // Distancia en km desde el usuario
  finalScore: number; // Puntuación final calculada
}

export interface ExchangeRatesData {
  timestamp: number;
  date: string;
  base: string;
  rates: Record<string, number>;
  source: 'live_network' | 'server_cache' | 'offline_fallback' | 'local_storage' | 'manual_custom';
}

export interface PhraseItem {
  id: string;
  category: 'compras' | 'comida' | 'transporte' | 'emergencias' | 'cortesia' | 'numeros' | 'guardadas';
  spanish: string;
  vietnamese: string;
  phonetic: string;
  toneTip?: string;
  audioText?: string;
  priority?: boolean;
  isCustom?: boolean;
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
  category: 'Monumento' | 'Gastronomía' | 'Naturaleza' | 'Mercado' | 'Cultura' | 'Transporte' | 'Fotografía';
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
  isIconic?: boolean;
  isHiddenGem?: boolean;
  badgeLabel?: string;
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


