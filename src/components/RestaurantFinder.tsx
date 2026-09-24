import React, { useState, useMemo, useCallback } from 'react';
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
import { RestaurantMap } from './RestaurantMap';
import { speakVietnamese } from '../utils/storage';
import { useItineraryState } from '../utils/useItineraryState';

interface RestaurantFinderProps {
  ratesData: ExchangeRatesData;
  isOnline: boolean;
  itineraryState: ReturnType<typeof useItineraryState>;
  onNavigateToItinerary?: () => void;
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
  const [selectedDayIdForAdd, setSelectedDayIdForAdd] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('Almuerzo 13:00');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Geolocation State
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Trigger toast notification
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  }, []);

  // Strict quality filter: only >4.5★ and >=10 reviews
  const { filtered: approvedRestaurants } = useMemo(() => {
    return filterStrictRestaurants(RAW_RESTAURANTS_DATA);
  }, []);

  // City & Search Query Filtering
  const displayPool = useMemo(() => {
    return approvedRestaurants.filter((restaurant) => {
      // City Filter
      if (selectedCity !== 'Todo Vietnam' && restaurant.city !== selectedCity) {
        return false;
      }

      // Search Query
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
  }, [approvedRestaurants, selectedCity, searchQuery]);

  // Algorithmic sorting with budget affinity
  const sortedScoredEntries = useMemo(() => {
    return sortRestaurants(displayPool, sortOption, budgetPref, userCoords);
  }, [displayPool, sortOption, budgetPref, userCoords]);

  // Map center logic
  const currentMapCenter = useMemo(() => {
    if (selectedRestaurant) {
      return { lat: selectedRestaurant.lat, lng: selectedRestaurant.lng };
    }
    if (userCoords && selectedCity === 'Cerca de mí') {
      return { lat: userCoords.lat, lng: userCoords.lng };
    }
    return CITY_COORDINATES[selectedCity] || CITY_COORDINATES['Hà Nội'];
  }, [selectedRestaurant, userCoords, selectedCity]);

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
                placeholder="Buscar plato, local..."
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

      {/* Main Content: Map & Uncluttered Cards */}
      <div className="space-y-4">
        {/* Interactive Map (when in split or map mode) */}
        {viewMode !== 'list' && (
          <div className="bg-white rounded-2xl p-2 sm:p-3 border border-stone-200/90 shadow-xs">
            <RestaurantMap
              center={currentMapCenter}
              zoom={CITY_COORDINATES[selectedCity]?.zoom || 14}
              items={sortedScoredEntries}
              selectedRestaurantId={selectedRestaurant?.id}
              onSelectRestaurant={(restaurant) => {
                setSelectedRestaurant(restaurant);
              }}
              userLocation={userCoords}
              userLocationLabel="Tu ubicación"
              className={viewMode === 'map' ? 'h-[580px]' : 'h-[360px] sm:h-[400px]'}
            />
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
                  const isExpanded = expandedCardId === restaurant.id;
                  const isSelected = selectedRestaurant?.id === restaurant.id;
                  const eurPrice = formatVndToEur(restaurant.avgPriceVnd);

                  return (
                    <div
                      key={restaurant.id}
                      id={`restaurant-card-${restaurant.id}`}
                      className={`bg-white rounded-2xl p-4 border transition-all duration-150 flex flex-col justify-between ${
                        isTop1
                          ? 'border-amber-400 ring-1 ring-amber-400/40 shadow-xs'
                          : isSelected
                          ? 'border-amber-500 shadow-xs'
                          : 'border-stone-200/90 hover:border-amber-300'
                      }`}
                    >
                      <div>
                        {/* Top Line: Name, Vietnamese Audio, Rating & Price */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {isTop1 && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-stone-950">
                                  👑 Recomendado #1
                                </span>
                              )}
                              {restaurant.michelinGuide && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                  Michelin {restaurant.michelinGuide}
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
                                onClick={() => speakVietnamese(restaurant.nameVi)}
                                className="p-0.5 rounded text-amber-700 hover:text-amber-800 transition cursor-pointer"
                                title="Escuchar pronunciación"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-stone-300">•</span>
                              <span className="text-[11px] text-stone-400">{restaurant.district}</span>
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
                          onClick={() => toggleExpandCard(restaurant.id)}
                          className="text-[11px] font-semibold text-stone-500 hover:text-stone-800 flex items-center gap-0.5 cursor-pointer py-1"
                        >
                          <span>{isExpanded ? 'Menos info' : 'Más detalles'}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>

                        <div className="flex items-center gap-1.5">
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${restaurant.lat},${restaurant.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs transition flex items-center gap-1 cursor-pointer"
                            title="Abrir indicaciones en Google Maps"
                          >
                            <Navigation className="w-3.5 h-3.5 text-sky-600" />
                            <span>Maps</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => {
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
    </div>
  );
};
