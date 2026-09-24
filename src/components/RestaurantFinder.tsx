import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  UtensilsCrossed,
  Star,
  MapPin,
  Volume2,
  Navigation,
  Plus,
  Check,
  Search,
  Crosshair,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  Map as MapIcon,
  List,
  RefreshCw,
  Globe,
  BookOpen,
} from 'lucide-react';
import {
  RestaurantItem,
  BudgetPreference,
  RestaurantSortOption,
  ExchangeRatesData,
} from '../types';
import { RAW_RESTAURANTS_DATA } from '../data/restaurants';
import {
  filterStrictRestaurants,
  sortRestaurants,
  BUDGET_TIER_CONFIG,
} from '../utils/restaurantAlgorithm';
import { RestaurantMap, getRestaurantTheme } from './RestaurantMap';
import { RestaurantMenuModal } from './RestaurantMenuModal';
import { speakVietnamese } from '../utils/storage';
import { useItineraryState } from '../utils/useItineraryState';

interface RestaurantFinderProps {
  ratesData: ExchangeRatesData;
  isOnline: boolean;
  itineraryState: ReturnType<typeof useItineraryState>;
  onNavigateToItinerary?: () => void;
  onToggleOnlineMode?: () => void;
}

const CITY_COORDINATES: Record<string, { lat: number; lng: number; zoom: number }> = {
  'Hà Nội': { lat: 21.0285, lng: 105.8542, zoom: 14 },
  'Hội An': { lat: 15.8801, lng: 108.3300, zoom: 15 },
  'Đà Nẵng': { lat: 16.0680, lng: 108.2208, zoom: 14 },
  'Huế': { lat: 16.4637, lng: 107.5909, zoom: 14 },
  'TP. Hồ Chí Minh': { lat: 10.7769, lng: 106.7009, zoom: 14 },
  'Ninh Bình': { lat: 20.2506, lng: 105.9745, zoom: 13 },
  'Todo Vietnam': { lat: 16.0471, lng: 108.2062, zoom: 6 },
};

export const RestaurantFinder: React.FC<RestaurantFinderProps> = ({
  ratesData,
  isOnline,
  itineraryState,
  onNavigateToItinerary,
  onToggleOnlineMode,
}) => {
  // Budget & Filter State
  const [budgetPref, setBudgetPref] = useState<BudgetPreference>('all');
  const [selectedCity, setSelectedCity] = useState<string>('Hà Nội');
  const [sortOption, setSortOption] = useState<RestaurantSortOption>('algorithm');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // View state: 'split' | 'map' | 'list'
  const [viewMode, setViewMode] = useState<'split' | 'map' | 'list'>('split');
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantItem | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // Modal states
  const [showAddToItineraryModal, setShowAddToItineraryModal] = useState<RestaurantItem | null>(null);
  const [viewingMenuRestaurant, setViewingMenuRestaurant] = useState<RestaurantItem | null>(null);
  const [selectedDayIdForAdd, setSelectedDayIdForAdd] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('Almuerzo 13:00');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Geolocation State
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Live online Google Places search state
  const [liveRestaurants, setLiveRestaurants] = useState<RestaurantItem[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState<boolean>(false);
  const [liveSearchError, setLiveSearchError] = useState<string | null>(null);

  // Trigger toast notification
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  }, []);

  // Strict quality filter for offline curated dataset: only >4.5★ and >=10 reviews
  const { filtered: approvedRestaurants } = useMemo(() => {
    return filterStrictRestaurants(RAW_RESTAURANTS_DATA);
  }, []);

  // Live Online Google Places fetching when in online mode
  useEffect(() => {
    if (!isOnline) {
      setLiveRestaurants([]);
      setIsSearchingOnline(false);
      return;
    }

    const controller = new AbortController();
    setIsSearchingOnline(true);
    setLiveSearchError(null);

    const timer = setTimeout(async () => {
      try {
        const response = await fetch('/api/restaurants/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: searchQuery,
            city: selectedCity,
            lat: userCoords?.lat,
            lng: userCoords?.lng,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Error al conectar con la búsqueda en vivo');
        }

        const data = await response.json();
        if (data.success && Array.isArray(data.restaurants)) {
          setLiveRestaurants(data.restaurants);
        } else {
          setLiveRestaurants([]);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Live restaurant fetch failed:', err?.message);
          setLiveSearchError('Búsqueda online no disponible momentáneamente. Usando catálogo local.');
        }
      } finally {
        setIsSearchingOnline(false);
      }
    }, searchQuery.trim() ? 350 : 20);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [isOnline, searchQuery, selectedCity, userCoords?.lat, userCoords?.lng]);

  // Combined Pool: In Online mode, displays all live Google Places results + enriched curated highlights
  const displayPool = useMemo(() => {
    // OFFLINE MODE: strictly filter offline catalog
    if (!isOnline) {
      return approvedRestaurants.filter((restaurant) => {
        if (selectedCity !== 'Todo Vietnam' && restaurant.city !== selectedCity) {
          return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesName =
            restaurant.name.toLowerCase().includes(q) ||
            restaurant.nameVi.toLowerCase().includes(q);
          const matchesSpecialties = restaurant.specialties.some((s) => s.toLowerCase().includes(q));
          const matchesMustOrder = restaurant.mustOrderDish.toLowerCase().includes(q);
          const matchesDistrict = restaurant.district.toLowerCase().includes(q);
          const matchesDesc = restaurant.description.toLowerCase().includes(q);

          if (!matchesName && !matchesSpecialties && !matchesMustOrder && !matchesDistrict && !matchesDesc) {
            return false;
          }
        }

        return true;
      });
    }

    // ONLINE MODE: merge live Google Places results with curated favorites
    const combined: RestaurantItem[] = [];
    const seenNames = new Set<string>();

    const normalizeName = (n: string) =>
      n.toLowerCase().replace(/restaurant|quán|nhà hàng|vietnamese|food|&|cafe|bistro/gi, '').trim();

    // 1. Add live results from Google Places API
    liveRestaurants.forEach((item) => {
      const key = normalizeName(item.name);
      if (!seenNames.has(key)) {
        seenNames.add(key);
        combined.push(item);
      }
    });

    // 2. Add or enrich with verified curated recommendations
    approvedRestaurants.forEach((curated) => {
      if (selectedCity !== 'Todo Vietnam' && curated.city !== selectedCity) {
        return;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName =
          curated.name.toLowerCase().includes(q) ||
          curated.nameVi.toLowerCase().includes(q);
        const matchesSpecialties = curated.specialties.some((s) => s.toLowerCase().includes(q));
        const matchesMustOrder = curated.mustOrderDish.toLowerCase().includes(q);
        const matchesDistrict = curated.district.toLowerCase().includes(q);
        const matchesDesc = curated.description.toLowerCase().includes(q);

        if (!matchesName && !matchesSpecialties && !matchesMustOrder && !matchesDistrict && !matchesDesc) {
          return;
        }
      }

      const key = normalizeName(curated.name);
      const existingIdx = combined.findIndex((c) => normalizeName(c.name) === key);
      if (existingIdx >= 0) {
        // Enrich Google Maps place with curated tips, michelin notes & dish picks
        combined[existingIdx] = {
          ...combined[existingIdx],
          mustOrderDish: curated.mustOrderDish || combined[existingIdx].mustOrderDish,
          specialties: curated.specialties?.length ? curated.specialties : combined[existingIdx].specialties,
          travelerTips: curated.travelerTips || combined[existingIdx].travelerTips,
          michelinGuide: curated.michelinGuide,
          badgeLabel: curated.badgeLabel || combined[existingIdx].badgeLabel,
          category: curated.category,
        };
      } else {
        combined.push({
          ...curated,
          source: 'offline_curated',
        });
      }
    });

    return combined;
  }, [isOnline, approvedRestaurants, liveRestaurants, selectedCity, searchQuery]);

  // Algorithmic sorting with budget affinity
  const sortedScoredEntries = useMemo(() => {
    return sortRestaurants(displayPool, sortOption, budgetPref, userCoords);
  }, [displayPool, sortOption, budgetPref, userCoords]);

  // Base map center for current city/area
  // Intentionally independent of selectedRestaurant so closing or deselecting a restaurant NEVER triggers recentering or zoom out
  const currentMapCenter = useMemo(() => {
    if (userCoords && selectedCity === 'Cerca de mí') {
      return { lat: userCoords.lat, lng: userCoords.lng };
    }
    return CITY_COORDINATES[selectedCity] || CITY_COORDINATES['Hà Nội'];
  }, [userCoords, selectedCity]);

  // Format currency helpers
  const usdToVnd = ratesData.rates['VND'] || 26000;
  const eurRate = ratesData.rates['EUR'] || 0.8965;
  const eurToVnd = Math.round(usdToVnd / eurRate);

  const formatVndToEur = useCallback(
    (vnd: number) => {
      const eur = vnd / eurToVnd;
      return `${eur.toFixed(1)} €`;
    },
    [eurToVnd]
  );

  // Handle GPS location request
  const handleRequestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      showToast('Tu navegador no soporta geolocalización.');
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setUserCoords({ lat: latitude, lng: longitude, accuracy });
        setIsLocating(false);
        setSortOption('distance');
        showToast('📍 GPS activado. Ordenado por cercanía.');
      },
      (error) => {
        console.warn('Geolocation error:', error);
        setIsLocating(false);
        showToast('No se pudo acceder al GPS.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [showToast]);

  // Handle selecting a restaurant and optionally scrolling to the map (toggle off if clicked again)
  const handleSelectRestaurant = useCallback(
    (restaurant: RestaurantItem, scrollToMap: boolean = false) => {
      setSelectedRestaurant((prev) => (prev?.id === restaurant.id ? null : restaurant));
      if (scrollToMap) {
        const mapSection = document.getElementById('restaurant-map-section');
        if (mapSection) {
          mapSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    },
    []
  );

  // Handle Add to Itinerary
  const handleConfirmAddToItinerary = () => {
    if (!showAddToItineraryModal) return;
    const activePlan = itineraryState.activePlan;
    if (!activePlan || activePlan.days.length === 0) {
      showToast('Crea un itinerario primero en la pestaña "Itinerario"');
      setShowAddToItineraryModal(null);
      return;
    }

    const dayId = selectedDayIdForAdd || activePlan.days[0].id;
    const targetDay = activePlan.days.find((d) => d.id === dayId) || activePlan.days[0];
    const notes = `🍽️ Recomendación: ${showAddToItineraryModal.mustOrderDish} | 📍 ${showAddToItineraryModal.address}`;

    itineraryState.addCustomStopToDay(
      activePlan.id,
      targetDay.id,
      `${showAddToItineraryModal.name} (${showAddToItineraryModal.nameVi})`,
      selectedTimeSlot,
      showAddToItineraryModal.avgPriceVnd,
      notes
    );

    showToast(`¡Añadido al Día ${targetDay.dayNumber}!`);
    setShowAddToItineraryModal(null);
  };

  const toggleExpandCard = (id: string) => {
    setExpandedCardId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-amber-500/50 flex items-center gap-2 text-xs font-semibold animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Clean Streamlined Filter Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200/90 shadow-xs space-y-3.5">
        {/* Row 1: Header Title & City Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <UtensilsCrossed className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-stone-900 leading-tight">
                Dónde Comer en Vietnam
              </h2>
              <p className="text-xs text-stone-500">
                Locales auténticos seleccionados con más de 4.5★
              </p>
            </div>
          </div>

          {/* City Selection Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            <button
              onClick={handleRequestLocation}
              disabled={isLocating}
              title="Filtrar por cercanía a mi posición GPS"
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                userCoords
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              <Crosshair className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
              <span>{isLocating ? 'GPS...' : userCoords ? 'Cerca de mí' : 'GPS'}</span>
            </button>

            {Object.keys(CITY_COORDINATES).map((city) => {
              const isSelected = selectedCity === city;
              return (
                <button
                  key={city}
                  type="button"
                  onClick={() => {
                    setSelectedCity(city);
                    setSelectedRestaurant(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-stone-900 text-white font-bold shadow-xs'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                  }`}
                >
                  {city}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Budget Pills, Search & View Toggle */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Budget Selector Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            <span className="text-xs font-semibold text-stone-400 mr-1 shrink-0">Presupuesto:</span>
            {(['all', 'budget', 'moderate', 'fine'] as BudgetPreference[]).map((tierKey) => {
              const isSelected = budgetPref === tierKey;
              const labels: Record<BudgetPreference, string> = {
                all: 'Todos',
                budget: '🍜 Callejero (<2,5€)',
                moderate: '🥢 Medio (2,5-7€)',
                fine: '⭐ Gourmet (>7€)',
              };
              return (
                <button
                  key={tierKey}
                  type="button"
                  onClick={() => setBudgetPref(tierKey)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-amber-500 text-stone-950 font-bold shadow-xs'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                  }`}
                >
                  {labels[tierKey]}
                </button>
              );
            })}
          </div>

          {/* Search Bar + View Toggle */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isOnline
                    ? "Buscar en vivo (ej: TÉP, vegetariano, phở...)"
                    : "Buscar en catálogo offline..."
                }
                className="w-full pl-8 pr-7 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="inline-flex p-1 bg-stone-100 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                  viewMode === 'split' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-900'
                }`}
                title="Vista Mapa + Lista"
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ambos</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                  viewMode === 'list' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-900'
                }`}
                title="Solo Lista"
              >
                <List className="w-3.5 h-3.5" />
                <span>Lista</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('map')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                  viewMode === 'map' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-900'
                }`}
                title="Solo Mapa"
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span>Mapa</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Online / Offline Mode Indicator Banner */}
      <div
        className={`px-4 py-2.5 rounded-2xl border text-xs flex flex-wrap items-center justify-between gap-3 transition-all ${
          isOnline
            ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900 shadow-2xs'
            : 'bg-amber-50/90 border-amber-200 text-amber-900 shadow-2xs'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            {isOnline && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
          </span>

          <div className="min-w-0">
            <div className="font-bold flex items-center gap-2 flex-wrap">
              <span>{isOnline ? 'Modo Online Activo' : 'Modo Offline (Sin Conexión)'}</span>
              {isSearchingOnline ? (
                <span className="text-[11px] text-emerald-700 font-medium inline-flex items-center gap-1 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                  <RefreshCw className="w-3 h-3 animate-spin text-emerald-600" />
                  Buscando en Google Maps...
                </span>
              ) : isOnline ? (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full border border-emerald-200/80">
                  Google Places en directo
                </span>
              ) : (
                <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full border border-amber-200/80">
                  Catálogo local guardado
                </span>
              )}
              {liveSearchError && isOnline && (
                <span className="text-[11px] text-amber-700 font-normal">({liveSearchError})</span>
              )}
            </div>
            <p className="text-[11px] opacity-80 mt-0.5">
              {isOnline
                ? `Mostrando ${sortedScoredEntries.length} restaurantes encontrados en Google Maps y selección local para ${selectedCity}.`
                : `Mostrando catálogo de restaurantes verificados descargados para viajar sin consumir datos.`}
            </p>
          </div>
        </div>

        {onToggleOnlineMode && (
          <button
            type="button"
            onClick={onToggleOnlineMode}
            className={`px-3 py-1 rounded-xl text-xs font-semibold border transition cursor-pointer shrink-0 shadow-2xs ${
              isOnline
                ? 'bg-white hover:bg-emerald-100/70 border-emerald-300 text-emerald-800'
                : 'bg-white hover:bg-amber-100/70 border-amber-300 text-amber-800'
            }`}
          >
            {isOnline ? 'Pasar a Modo Offline' : 'Activar Modo Online'}
          </button>
        )}
      </div>

      {/* Main Content: Map & Uncluttered Cards */}
      <div className="space-y-4">
        {/* Interactive Map (when in split or map mode) */}
        {viewMode !== 'list' && (
          <div id="restaurant-map-section" className="bg-white rounded-2xl p-2 sm:p-3 border border-stone-200/90 shadow-xs">
            <RestaurantMap
              center={currentMapCenter}
              zoom={CITY_COORDINATES[selectedCity]?.zoom || 14}
              items={sortedScoredEntries}
              selectedRestaurantId={selectedRestaurant?.id}
              onSelectRestaurant={(restaurant) => {
                setSelectedRestaurant(restaurant);
                const cardEl = document.getElementById(`restaurant-card-${restaurant.id}`);
                if (cardEl) {
                  cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
              }}
              onDeselectRestaurant={() => {
                setSelectedRestaurant(null);
              }}
              onViewMenu={(r) => {
                setViewingMenuRestaurant(r);
              }}
              userLocation={userCoords}
              userLocationLabel="Tu ubicación"
              className={viewMode === 'map' ? 'h-[580px]' : 'h-[360px] sm:h-[400px]'}
            />

            {/* Selected Restaurant Quick Action Pill directly under the map */}
            {selectedRestaurant && (
              <div className="mt-2.5 p-3 sm:p-3.5 bg-stone-900 text-white rounded-xl shadow-lg border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-amber-500 text-stone-950 font-bold text-xs flex items-center justify-center shrink-0 shadow-md">
                    {Math.max(1, sortedScoredEntries.findIndex((e) => e.restaurant.id === selectedRestaurant.id) + 1)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-stone-100 truncate">{selectedRestaurant.name}</h4>
                      <span className="text-[11px] text-stone-400 italic shrink-0">({selectedRestaurant.nameVi})</span>
                      <span className="inline-flex items-center text-amber-400 font-bold text-xs shrink-0">
                        ★ {selectedRestaurant.rating.toFixed(1)}
                      </span>
                    </div>
                    <p className="text-xs text-amber-300 font-medium truncate mt-0.5">
                      🍲 {selectedRestaurant.mustOrderDish} • <span className="text-stone-300 font-mono">{(selectedRestaurant.avgPriceVnd / 1000).toLocaleString('es-ES')}k ₫</span> ({formatVndToEur(selectedRestaurant.avgPriceVnd)})
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setViewingMenuRestaurant(selectedRestaurant)}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1 border border-amber-500/40 transition cursor-pointer shadow-xs"
                    title="Ver carta de platos, precios y fotos de reviews"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                    <span>Ver Carta</span>
                  </button>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedRestaurant.lat},${selectedRestaurant.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-1 border border-stone-700 transition"
                  >
                    <Navigation className="w-3.5 h-3.5 text-sky-400" />
                    <span>Cómo llegar</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setShowAddToItineraryModal(selectedRestaurant)}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRestaurant(null)}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition cursor-pointer flex items-center gap-1 text-xs"
                    title="Cerrar y mantener zoom"
                    aria-label="Cerrar restaurante seleccionado"
                  >
                    <X className="w-4 h-4" />
                    <span className="hidden sm:inline text-[11px]">Cerrar</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Clean Restaurant Cards List (when in split or list mode) */}
        {viewMode !== 'map' && (
          <div className="space-y-3">
            {sortedScoredEntries.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-stone-300 space-y-2">
                <UtensilsCrossed className="w-8 h-8 text-stone-300 mx-auto" />
                <h4 className="font-bold text-stone-800 text-sm">No hay restaurantes con estos filtros</h4>
                <p className="text-xs text-stone-500">
                  Prueba a seleccionar "Todos" en presupuesto o cambiar de ciudad.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setBudgetPref('all');
                    setSelectedCity('Hà Nội');
                  }}
                  className="px-3 py-1.5 bg-amber-500 text-stone-950 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Restablecer filtros
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sortedScoredEntries.map((entry, index) => {
                  const { restaurant, breakdown } = entry;
                  const isTop1 = index === 0;
                  const number = index + 1;
                  const isExpanded = expandedCardId === restaurant.id;
                  const isSelected = selectedRestaurant?.id === restaurant.id;
                  const eurPrice = formatVndToEur(restaurant.avgPriceVnd);
                  const theme = getRestaurantTheme(index, restaurant.priceTier);

                  return (
                    <div
                      key={restaurant.id}
                      id={`restaurant-card-${restaurant.id}`}
                      onClick={() => handleSelectRestaurant(restaurant, false)}
                      className={`bg-white rounded-2xl p-4 border transition-all duration-200 flex flex-col justify-between cursor-pointer ${
                        isSelected
                          ? 'border-amber-500 ring-2 ring-amber-400 bg-amber-50/20 shadow-md'
                          : isTop1
                          ? 'border-amber-400 ring-1 ring-amber-400/40 shadow-xs hover:border-amber-500'
                          : 'border-stone-200/90 hover:border-amber-300 hover:shadow-xs'
                      }`}
                    >
                      <div>
                        {/* Top Line: Number Badge, Name, Vietnamese Audio, Rating & Price */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5 min-w-0 flex-1">
                            {/* Matching Circular Number Badge identical to Map Pin */}
                            <div
                              className={`w-9 h-9 rounded-full border-2 flex items-center justify-center font-bold text-xs shrink-0 shadow-xs transition-all ${
                                isSelected
                                  ? 'bg-amber-500 border-white text-stone-950 ring-2 ring-amber-400 shadow-md scale-105'
                                  : `${theme.bg} ${theme.border} ${theme.text}`
                              }`}
                              title={`Restaurante #${number} en el mapa`}
                            >
                              <span>{isTop1 ? '👑 1' : number}</span>
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {isTop1 && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-stone-950">
                                    Recomendado #1
                                  </span>
                                )}
                                {restaurant.michelinGuide && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                    Michelin {restaurant.michelinGuide}
                                  </span>
                                )}
                                {restaurant.source === 'google_live' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                    <Globe className="w-2.5 h-2.5 text-emerald-600" />
                                    <span>{restaurant.badgeLabel || 'Google Maps en vivo'}</span>
                                  </span>
                                )}
                                {restaurant.badgeLabel && restaurant.source !== 'google_live' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                    {restaurant.badgeLabel}
                                  </span>
                                )}
                                {isSelected && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>
                                    En el mapa
                                  </span>
                                )}
                              </div>

                              <h3 className="font-bold text-sm sm:text-base text-stone-900 leading-snug mt-1">
                                {restaurant.name}
                              </h3>

                              <div className="flex items-center gap-1.5 text-xs text-stone-600 mt-0.5">
                                <span>{restaurant.nameVi}</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    speakVietnamese(restaurant.nameVi);
                                  }}
                                  className="p-0.5 rounded text-amber-700 hover:text-amber-800 transition cursor-pointer"
                                  title="Escuchar pronunciación"
                                >
                                  <Volume2 className="w-3.5 h-3.5" />
                                </button>
                                <span className="text-stone-300">•</span>
                                <span className="text-[11px] text-stone-400">{restaurant.district}</span>
                              </div>
                            </div>
                          </div>

                          {/* Price & Rating Box */}
                          <div className="text-right shrink-0">
                            <div className="flex items-center justify-end gap-1 font-bold text-amber-900 text-xs">
                              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />
                              <span>{restaurant.rating.toFixed(1)}</span>
                              <span className="text-stone-400 font-normal text-[11px]">
                                ({restaurant.reviewsCount.toLocaleString()})
                              </span>
                            </div>
                            <div className="font-mono font-bold text-stone-900 text-xs mt-0.5">
                              {(restaurant.avgPriceVnd / 1000).toLocaleString('es-ES')}k ₫
                              <span className="text-emerald-700 text-[11px] font-semibold ml-1">
                                (~{eurPrice})
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Dish Highlight: What to order */}
                        <div className="mt-2.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200/80 text-xs flex items-center gap-2">
                          <span className="font-bold text-amber-950 shrink-0">🍲 Pedir:</span>
                          <span className="text-amber-900 font-medium truncate">
                            {restaurant.mustOrderDish}
                          </span>
                        </div>

                        {/* Expandable Extra Details (Accordion to avoid cognitive overload) */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-stone-100 text-xs text-stone-600 space-y-2 animate-fade-in">
                            <p className="leading-relaxed">{restaurant.description}</p>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-500">
                              <span className="px-2 py-0.5 rounded-md bg-stone-100">
                                ⏰ {restaurant.openingHours}
                              </span>
                              {restaurant.hasAirConditioning && (
                                <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-700">
                                  ❄️ Aire Acondicionado
                                </span>
                              )}
                              {restaurant.isCashOnly && (
                                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800">
                                  💵 Solo efectivo
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-stone-400 flex items-start gap-1">
                              <MapPin className="w-3 h-3 text-stone-400 shrink-0 mt-0.5" />
                              <span>{restaurant.address}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons: Clean & Direct */}
                      <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpandCard(restaurant.id);
                          }}
                          className="text-[11px] font-semibold text-stone-500 hover:text-stone-800 flex items-center gap-0.5 cursor-pointer py-1"
                        >
                          <span>{isExpanded ? 'Menos info' : 'Más detalles'}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Ver Carta & Fotos button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingMenuRestaurant(restaurant);
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs transition flex items-center gap-1 cursor-pointer border border-amber-300/80 shadow-xs"
                            title="Ver carta de platos, precios en VND/EUR y fotos de reviews"
                          >
                            <BookOpen className="w-3.5 h-3.5 text-amber-700" />
                            <span>Ver Carta</span>
                          </button>

                          {/* Quick button to locate on map */}
                          {viewMode !== 'list' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectRestaurant(restaurant, true);
                              }}
                              className={`px-2.5 py-1.5 rounded-xl font-semibold text-xs transition flex items-center gap-1 cursor-pointer ${
                                isSelected
                                  ? 'bg-amber-500 text-stone-950 font-bold shadow-xs'
                                  : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80'
                              }`}
                              title={`Ubicar #${number} en el mapa interactivo`}
                            >
                              <MapPin className="w-3.5 h-3.5 text-amber-600" />
                              <span>{isSelected ? `Pin #${number}` : `Ubicar #${number}`}</span>
                            </button>
                          )}

                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${restaurant.lat},${restaurant.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs transition flex items-center gap-1 cursor-pointer"
                            title="Abrir indicaciones en Google Maps"
                          >
                            <Navigation className="w-3.5 h-3.5 text-sky-600" />
                            <span>Maps</span>
                          </a>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowAddToItineraryModal(restaurant);
                              const activePlan = itineraryState.activePlan;
                              if (activePlan && activePlan.days.length > 0) {
                                setSelectedDayIdForAdd(activePlan.days[0].id);
                              }
                            }}
                            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs transition cursor-pointer flex items-center gap-1 shadow-xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Itinerario</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Restaurant to Itinerary Modal */}
      {showAddToItineraryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-fade-overlay">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-stone-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-100 text-amber-900">
                  <UtensilsCrossed className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-bold text-sm text-stone-900">
                    Añadir al Itinerario
                  </h3>
                  <p className="text-xs text-stone-500 truncate max-w-[200px]">
                    {showAddToItineraryModal.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddToItineraryModal(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Día del viaje:
                </label>
                {itineraryState.activePlan?.days && itineraryState.activePlan.days.length > 0 ? (
                  <select
                    value={selectedDayIdForAdd}
                    onChange={(e) => setSelectedDayIdForAdd(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2 text-xs text-stone-800 font-semibold focus:outline-none"
                  >
                    {itineraryState.activePlan.days.map((day) => (
                      <option key={day.id} value={day.id}>
                        Día {day.dayNumber}: {day.destinationCity}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-amber-800 bg-amber-50 p-2 rounded-lg">
                    Crea un itinerario primero en la pestaña "Itinerario".
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Momento del día:
                </label>
                <select
                  value={selectedTimeSlot}
                  onChange={(e) => setSelectedTimeSlot(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2 text-xs text-stone-800 font-semibold focus:outline-none"
                >
                  <option value="Desayuno 08:30">Desayuno (08:30)</option>
                  <option value="Almuerzo 12:30">Almuerzo (12:30)</option>
                  <option value="Merienda / Café 16:30">Merienda / Café (16:30)</option>
                  <option value="Cena 19:30">Cena (19:30)</option>
                </select>
              </div>

              <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-stone-600">
                <span className="font-semibold text-stone-800">Plato: </span>
                <span>{showAddToItineraryModal.mustOrderDish}</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddToItineraryModal(null)}
                className="px-3 py-1.5 rounded-xl text-stone-600 hover:bg-stone-100 font-semibold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAddToItinerary}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1 shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirmar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restaurant Menu & Reviews Photos Modal */}
      {viewingMenuRestaurant && (
        <RestaurantMenuModal
          restaurant={viewingMenuRestaurant}
          onClose={() => setViewingMenuRestaurant(null)}
          eurRate={ratesData?.rates?.VND || 27000}
        />
      )}

      {/* Mobile Floating Map / List Toggle */}
      <div className="md:hidden fixed bottom-20 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
        <button
          type="button"
          onClick={() => {
            const nextMode = viewMode === 'map' ? 'list' : 'map';
            setViewMode(nextMode);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="px-4 py-2.5 rounded-full bg-stone-900/95 backdrop-blur-md text-white font-bold text-xs shadow-xl border border-stone-700/80 flex items-center gap-2 active:scale-95 transition-transform"
        >
          {viewMode === 'map' ? (
            <>
              <List className="w-4 h-4 text-amber-400" />
              <span>Ver Lista</span>
            </>
          ) : (
            <>
              <MapIcon className="w-4 h-4 text-amber-400" />
              <span>Ver Mapa ({sortedScoredEntries.length})</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
