import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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
  ExternalLink,
  ShieldAlert,
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
import { CitySelectionModal } from './CitySelectionModal';
import { speakVietnamese } from '../utils/storage';
import { useItineraryState } from '../utils/useItineraryState';
import {
  getRobustBrowserGeolocation,
  getSmartGeolocation,
  watchSmartGeolocation,
} from '../utils/geolocation';
import { CITY_COORDINATES_MAP, VietnamCityDestination } from '../data/cities';

interface RestaurantFinderProps {
  ratesData: ExchangeRatesData;
  isOnline: boolean;
  itineraryState: ReturnType<typeof useItineraryState>;
  onNavigateToItinerary?: () => void;
  onToggleOnlineMode?: () => void;
  onNavigateToAllergies?: () => void;
}

const CITY_COORDINATES = CITY_COORDINATES_MAP;

export const RestaurantFinder: React.FC<RestaurantFinderProps> = ({
  ratesData,
  isOnline,
  itineraryState,
  onNavigateToItinerary,
  onToggleOnlineMode,
  onNavigateToAllergies,
}) => {
  // Budget & Filter State
  const [budgetPref, setBudgetPref] = useState<BudgetPreference>('all');
  const [selectedCity, setSelectedCity] = useState<string>(() => {
    try {
      return localStorage.getItem('vietnam_travel_selected_city') || 'Sa Pa';
    } catch {
      return 'Sa Pa';
    }
  });
  const [sortOption, setSortOption] = useState<RestaurantSortOption>('algorithm');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleSelectCity = useCallback((city: string) => {
    setSelectedCity(city);
    setSelectedRestaurant(null);
    try {
      localStorage.setItem('vietnam_travel_selected_city', city);
    } catch {}
  }, []);

  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantItem | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // Modal states
  const [showAddToItineraryModal, setShowAddToItineraryModal] = useState<RestaurantItem | null>(null);
  const [viewingMenuRestaurant, setViewingMenuRestaurant] = useState<RestaurantItem | null>(null);
  const [selectedDayIdForAdd, setSelectedDayIdForAdd] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('Almuerzo 13:00');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Manual City Selection Modal State
  const [isCityModalOpen, setIsCityModalOpen] = useState<boolean>(false);
  const [cityModalReason, setCityModalReason] = useState<string | null>(null);

  // Quality Rating Filter: always strictly active (>=4.5★ & >=10 reviews)
  const strictRatingFilter = true;

  // Geolocation State
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isLiveTracking, setIsLiveTracking] = useState<boolean>(false);
  const stopWatchRef = useRef<(() => void) | null>(null);

  // Clean up live watch on unmount
  useEffect(() => {
    return () => {
      if (stopWatchRef.current) {
        stopWatchRef.current();
        stopWatchRef.current = null;
      }
    };
  }, []);

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

  // Handle manual city selection from modal
  const handleSelectCityFromModal = useCallback(
    (city: VietnamCityDestination) => {
      if (stopWatchRef.current) {
        stopWatchRef.current();
        stopWatchRef.current = null;
      }
      setIsLiveTracking(false);
      setSelectedCity(city.name);
      setUserCoords({ lat: city.lat, lng: city.lng, accuracy: 25 });
      setSelectedRestaurant(null);
      setSortOption('algorithm');
      try {
        localStorage.setItem('vietnam_travel_selected_city', city.name);
      } catch {}
      showToast(`📍 Ubicación ajustada a ${city.name}. Buscador y mapa centrados.`);
      setIsCityModalOpen(false);
      setCityModalReason(null);
    },
    [showToast]
  );

  // Toggle continuous real-time live GPS tracking
  const toggleLiveTracking = useCallback(() => {
    // If active, pause
    if (isLiveTracking) {
      if (stopWatchRef.current) {
        stopWatchRef.current();
        stopWatchRef.current = null;
      }
      setIsLiveTracking(false);
      showToast('⏸️ Rastreo en tiempo real pausado.');
      return;
    }

    if (stopWatchRef.current) {
      stopWatchRef.current();
      stopWatchRef.current = null;
    }

    showToast('🛰️ Conectando sensor GPS en tiempo real...');
    setIsLocating(true);

    const stopFn = watchSmartGeolocation(
      (result) => {
        setIsLocating(false);
        setIsLiveTracking(true);
        const { coords, isInsideVietnam, closestCity, distanceToVietnamKm } = result;

        // Set user coordinates regardless of country
        setUserCoords({ lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy });

        if (isInsideVietnam) {
          setSelectedCity('Cerca de mí');
          setSortOption('distance');
          const acc = coords.accuracy ? `(±${Math.round(coords.accuracy)}m)` : '';
          showToast(`📍 Posición en tiempo real actualizada en ${closestCity || 'Vietnam'} ${acc}`);
        } else {
          showToast(`🛰️ GPS en tiempo real activo: ${coords.latitude.toFixed(3)}°N, ${coords.longitude.toFixed(3)}°E (a ${distanceToVietnamKm.toLocaleString()} km de Vietnam).`);
        }
      },
      (error) => {
        setIsLocating(false);
        setIsLiveTracking(false);
        if (stopWatchRef.current) {
          stopWatchRef.current();
          stopWatchRef.current = null;
        }

        const isIframe = typeof window !== 'undefined' && window.self !== window.top;
        if (error.code === 'PERMISSION_DENIED') {
          setCityModalReason(
            isIframe
              ? 'El visor de AI Studio bloquea el GPS por seguridad en iframe. Abre la app en el navegador directo para activar la antena GPS en tiempo real o selecciona tu ciudad:'
              : 'Permiso de ubicación no concedido en el navegador. Revisa los permisos o elige tu ciudad en el modal:'
          );
          setIsCityModalOpen(true);
        } else {
          showToast(`Aviso GPS: ${error.message}`);
        }
      }
    );

    stopWatchRef.current = stopFn;
  }, [isLiveTracking, showToast]);

  // Dynamic filter thresholds
  const minRatingThreshold = strictRatingFilter ? 4.5 : 4.0;
  const minReviewsThreshold = strictRatingFilter ? 10 : 5;

  // Quality filter for offline curated dataset
  const { filtered: approvedRestaurants, discarded: discardedCurated } = useMemo(() => {
    return filterStrictRestaurants(RAW_RESTAURANTS_DATA, minRatingThreshold, minReviewsThreshold);
  }, [minRatingThreshold, minReviewsThreshold]);

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

  // Count how many matching venues were excluded by strict quality filter
  const hiddenMatchingCount = useMemo(() => {
    if (!strictRatingFilter) return 0;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return 0;

    let count = 0;
    // Check in raw curated offline
    RAW_RESTAURANTS_DATA.forEach((r) => {
      const isLowQuality = r.rating < 4.5 || r.reviewsCount < 10;
      if (isLowQuality) {
        const matches =
          r.name.toLowerCase().includes(q) ||
          r.nameVi.toLowerCase().includes(q) ||
          r.specialties.some((s) => s.toLowerCase().includes(q)) ||
          r.mustOrderDish.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q);
        if (matches) count++;
      }
    });

    // Check in live online results
    liveRestaurants.forEach((r) => {
      if (r.rating < 4.5 || r.reviewsCount < 10) {
        const matches =
          r.name.toLowerCase().includes(q) ||
          r.nameVi.toLowerCase().includes(q) ||
          r.mustOrderDish.toLowerCase().includes(q);
        if (matches) count++;
      }
    });

    return count;
  }, [strictRatingFilter, searchQuery, liveRestaurants]);

  // Combined Pool: In Online mode, displays all live Google Places results + enriched curated highlights
  const displayPool = useMemo(() => {
    const hasSearch = searchQuery.trim().length > 0;

    // OFFLINE MODE: filter offline catalog
    if (!isOnline) {
      const sourceList = hasSearch ? RAW_RESTAURANTS_DATA : approvedRestaurants;
      return sourceList.filter((restaurant) => {
        if (hasSearch) {
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

          // If manual search query is typed and matches, let it through even if in another city
          if (selectedCity !== 'Todo Vietnam' && selectedCity !== 'Cerca de mí') {
            if (restaurant.city === selectedCity) return true;
            return matchesName;
          }
          return true;
        }

        if (
          selectedCity !== 'Todo Vietnam' &&
          selectedCity !== 'Cerca de mí' &&
          restaurant.city !== selectedCity
        ) {
          return false;
        }

        return true;
      });
    }

    // ONLINE MODE: merge live Google Places results with curated favorites
    const combined: RestaurantItem[] = [];
    const seenNames = new Set<string>();

    const normalizeName = (n: string) =>
      n.toLowerCase().replace(/restaurant|quán|nhà hàng|vietnamese|food|&|cafe|bistro/gi, '').trim();

    // 1. Add results from Google Places API
    // When searching manually, keep all matching results (ratings and review counts are clearly displayed on cards)
    const qualityLive = liveRestaurants.filter((item) => {
      if (hasSearch) return true;
      if (item.rating < minRatingThreshold || item.reviewsCount < minReviewsThreshold) {
        return false;
      }
      return true;
    });

    qualityLive.forEach((item) => {
      const key = normalizeName(item.name);
      if (!seenNames.has(key)) {
        seenNames.add(key);
        combined.push(item);
      }
    });

    // 2. Add or enrich with curated recommendations (when searching, search entire catalog)
    const curatedSource = hasSearch ? RAW_RESTAURANTS_DATA : approvedRestaurants;
    curatedSource.forEach((curated) => {
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

        if (selectedCity !== 'Todo Vietnam' && selectedCity !== 'Cerca de mí') {
          if (curated.city !== selectedCity && !matchesName) {
            return;
          }
        }
      } else if (
        selectedCity !== 'Todo Vietnam' &&
        selectedCity !== 'Cerca de mí' &&
        curated.city !== selectedCity
      ) {
        return;
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
  }, [
    isOnline,
    approvedRestaurants,
    liveRestaurants,
    selectedCity,
    searchQuery,
    minRatingThreshold,
    minReviewsThreshold,
  ]);

  // Algorithmic sorting with budget affinity
  const sortedScoredEntries = useMemo(() => {
    return sortRestaurants(displayPool, sortOption, budgetPref, userCoords);
  }, [displayPool, sortOption, budgetPref, userCoords]);

  // Base map center for current city/area
  const currentMapCenter = useMemo(() => {
    if (userCoords && (selectedCity === 'Cerca de mí' || !CITY_COORDINATES[selectedCity])) {
      return { lat: userCoords.lat, lng: userCoords.lng };
    }
    return CITY_COORDINATES[selectedCity] || CITY_COORDINATES['Sa Pa'] || { lat: 22.3356, lng: 103.8415, zoom: 14 };
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

  // Handle GPS location request with robust browser geolocation and precision filter
  const handleRequestLocation = useCallback(async () => {
    if (userCoords && selectedCity === 'Cerca de mí') {
      setUserCoords(null);
      setSelectedCity('Sa Pa');
      setSortOption('algorithm');
      showToast('📍 Modo GPS desactivado. Mostrando restaurantes de Sa Pa.');
      return;
    }

    setIsLocating(true);
    showToast('🛰️ Leyendo coordenadas GPS con filtro de precisión...');

    try {
      // Robust browser API call with precision filter
      const res = await getRobustBrowserGeolocation({ maxAccuracyMeters: 2500, timeoutMs: 7000 });
      setIsLocating(false);

      if (res.success) {
        const { coords, isInsideVietnam, closestPoi, distanceToClosestPoiKm, closestCity, distanceToVietnamKm } = res.data;
        setUserCoords({ lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy });

        if (isInsideVietnam) {
          setSelectedCity('Cerca de mí');
          setSortOption('distance');
          const cityName = closestCity || closestPoi.city || 'Sa Pa';
          const accInfo = coords.accuracy ? ` (±${Math.round(coords.accuracy)}m)` : '';
          showToast(
            `📍 GPS exacto fijado en ${cityName}${accInfo} • Cerca de ${closestPoi.nameEs} (${distanceToClosestPoiKm} km). Ordenado por cercanía.`
          );
        } else {
          // User is outside Vietnam -> User coords are set so blue dot is visible!
          showToast(
            `🛰️ GPS detectado en ${coords.latitude.toFixed(3)}°N, ${coords.longitude.toFixed(3)}°E (a ${distanceToVietnamKm.toLocaleString()} km de Vietnam). Punto azul activo en mapa.`
          );
        }
      } else {
        // Failed exact reading or failed precision filter
        const err = res.error;
        if (err.rawCoords) {
          setUserCoords({ lat: err.rawCoords.latitude, lng: err.rawCoords.longitude, accuracy: err.rawCoords.accuracy });
        }
        let reason = 'No se pudo obtener la posición GPS exacta del navegador.';
        if (err.code === 'LOW_ACCURACY') {
          reason = `🛰️ Precisión GPS moderada (±${err.accuracy}m). Se ha fijado tu punto aproximado en el mapa. Si prefieres afinarlo a tu ciudad actual, selecciónala:`;
        } else if (err.code === 'PERMISSION_DENIED') {
          reason = 'Permiso de ubicación no concedido en el navegador o bloqueado por el visor web. Selecciona manualmente tu ciudad:';
        } else if (err.code === 'POSITION_UNAVAILABLE' || err.code === 'TIMEOUT') {
          reason = 'Señal satelital no disponible o tiempo de espera agotado. Elige tu ciudad para ajustar el mapa y buscador:';
        }

        setCityModalReason(reason);
        setIsCityModalOpen(true);
        showToast('📍 Abre el selector manual para ajustar tu ciudad.');
      }
    } catch {
      setIsLocating(false);
      setCityModalReason('No se pudo conectar al sensor GPS del navegador. Elige tu ciudad actual:');
      setIsCityModalOpen(true);
    }
  }, [userCoords, selectedCity, showToast]);

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
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-stone-200/90 shadow-[0_4px_24px_rgba(28,25,23,0.04)] space-y-4">
        {/* Row 1: Header Title & City Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 shrink-0">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-xl sm:text-2xl text-stone-900 leading-tight">
                Dónde Comer en Vietnam
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Selección gastronómica verificada con más de 4.5★ y platos emblemáticos
              </p>
            </div>
          </div>

          {/* Action buttons: GPS + City Selector (opens modal) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Real-time Continuous Live GPS Toggle Button */}
            <button
              type="button"
              onClick={toggleLiveTracking}
              disabled={isLocating}
              title={
                isLiveTracking
                  ? 'Rastreo en tiempo real activo. Haz clic para pausar.'
                  : 'Activar sensor GPS en tiempo real para seguir mi posición mientras camino o me muevo'
              }
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0 active:scale-95 shadow-2xs ${
                isLiveTracking
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-4 ring-emerald-100'
                  : userCoords && selectedCity === 'Cerca de mí'
                  ? 'bg-sky-600 hover:bg-sky-700 text-white'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
              }`}
            >
              {isLiveTracking ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                  </span>
                  <span>🔴 GPS En Vivo</span>
                </>
              ) : (
                <>
                  <Crosshair className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin text-sky-500' : ''}`} />
                  <span>{isLocating ? 'GPS...' : userCoords ? 'GPS Activo' : 'GPS'}</span>
                </>
              )}
            </button>

            {/* City Selector Button (Opens the city modal) */}
            <button
              type="button"
              onClick={() => {
                setCityModalReason(null);
                setIsCityModalOpen(true);
              }}
              title="Cambiar ciudad actual en Vietnam"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 transition cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0 active:scale-95"
            >
              <MapPin className="w-3.5 h-3.5 stroke-[2.2]" />
              <span className="font-bold">{selectedCity}</span>
              <span className="text-[10px] opacity-70">▼</span>
            </button>
          </div>
        </div>

        {/* Row 2: Search Input & Budget Pills (Combined view always, strict filter always active) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Bar: short, clean placeholder that is 100% visible on mobile */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar plato o restaurante..."
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="w-full pl-9 pr-8 py-2 bg-stone-50 border border-stone-200 rounded-xl text-base sm:text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Budget Selector Pills & Allergy Trigger */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 shrink-0">
            <span className="text-xs font-semibold text-stone-400 mr-1 shrink-0">Precio:</span>
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
                      ? 'bg-stone-900 text-white font-bold shadow-xs'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                  }`}
                >
                  {labels[tierKey]}
                </button>
              );
            })}

            {onNavigateToAllergies && (
              <button
                type="button"
                onClick={onNavigateToAllergies}
                title="Abrir tarjetas de alergias alimentarias en vietnamita para mostrar al camarero"
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1.5 transition cursor-pointer shrink-0 active:scale-95 shadow-2xs ml-1"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                <span>Alergias Camarero</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Streamlined Live Status Bar (Only appears when live searching or tracking) */}
      {(isSearchingOnline || isLiveTracking) && (
        <div className="px-3.5 py-2 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-2 bg-stone-900 text-stone-100 border-stone-800 shadow-xs animate-fade-in">
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <div className="text-stone-300 text-[11px] truncate">
              {isSearchingOnline ? (
                <span className="text-amber-300 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Buscando en Google Maps...
                </span>
              ) : (
                <span>📍 GPS en vivo activo {userCoords ? `(${userCoords.lat.toFixed(3)}°, ${userCoords.lng.toFixed(3)}°)` : ''}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isLiveTracking && (
              <button
                type="button"
                onClick={toggleLiveTracking}
                className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold cursor-pointer transition"
              >
                Pausar GPS
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Content: Map & Cards in Unified Combined View */}
      <div className="space-y-4">
        {/* Interactive Map */}
        <div id="restaurant-map-section" className="bg-white rounded-2xl p-2 sm:p-3 border border-stone-200/90 shadow-xs space-y-2">
          <div className="flex items-center justify-between px-2 pt-1 pb-0.5 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="text-stone-700 font-semibold truncate">
                {selectedCity === 'Cerca de mí' ? 'Cerca de tu ubicación GPS' : selectedCity} · {sortedScoredEntries.length} locales seleccionados (≥ 4.5★)
              </span>
            </div>
          </div>

          <RestaurantMap
            center={currentMapCenter}
            zoom={selectedCity === 'Cerca de mí' ? 15 : (CITY_COORDINATES[selectedCity]?.zoom || 14)}
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
            userLocationLabel={isLiveTracking ? 'Tu posición en tiempo real' : 'Tu ubicación'}
            isLiveTracking={isLiveTracking}
            onToggleLiveTracking={toggleLiveTracking}
            className="h-[320px] sm:h-[380px]"
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
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selectedRestaurant.name} ${selectedRestaurant.address || selectedRestaurant.city || 'Vietnam'}`.trim())}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-1 border border-stone-700 transition"
                  title={`Ver ${selectedRestaurant.name} en Google Maps`}
                >
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  <span>Ver en Maps</span>
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

        {/* Clean Restaurant Cards List (Always visible in combined view) */}
        <div className="space-y-3">
            {/* Active search query feedback banner */}
            {searchQuery.trim() && (
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-stone-800 animate-fade-in">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-amber-500 text-stone-950 font-bold shrink-0">
                    <Search className="w-3.5 h-3.5" />
                  </span>
                  <div>
                    <span>
                      Resultados para <strong>"{searchQuery}"</strong> ({sortedScoredEntries.length} {sortedScoredEntries.length === 1 ? 'opción encontrada' : 'opciones encontradas'}). Búsqueda directa sin restricciones de ciudad.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-2.5 py-1 bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-lg text-xs font-semibold cursor-pointer transition self-start sm:self-auto shrink-0 shadow-2xs"
                >
                  Limpiar búsqueda
                </button>
              </div>
            )}

            {sortedScoredEntries.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-stone-300 space-y-3">
                <UtensilsCrossed className="w-8 h-8 text-stone-300 mx-auto" />
                <h4 className="font-bold text-stone-800 text-sm">No hay restaurantes con los filtros actuales</h4>
                <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
                  Prueba a limpiar la búsqueda o selecciona "Todos" en la categoría de precio.
                </p>
                <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setBudgetPref('all');
                    }}
                    className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-xs"
                  >
                    Restablecer búsqueda y precio
                  </button>
                </div>
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
                      className={`bg-white rounded-3xl p-5 border transition-all duration-200 flex flex-col justify-between cursor-pointer ${
                        isSelected
                          ? 'border-amber-500 ring-4 ring-amber-400/20 bg-amber-50/[0.15] shadow-lg'
                          : isTop1
                          ? 'border-amber-400/90 shadow-md hover:border-amber-500'
                          : 'border-stone-200/90 hover:border-amber-300 hover:shadow-md shadow-[0_2px_16px_rgba(28,25,23,0.03)]'
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
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-stone-950 shadow-2xs">
                                    Recomendado #1
                                  </span>
                                )}
                                {restaurant.michelinGuide && (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 shadow-2xs">
                                    Michelin {restaurant.michelinGuide}
                                  </span>
                                )}
                                {restaurant.badgeLabel &&
                                  restaurant.source !== 'google_live' &&
                                  !restaurant.badgeLabel.toLowerCase().includes('google') && (
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
                                {restaurant.city !== selectedCity && selectedCity !== 'Todo Vietnam' && selectedCity !== 'Cerca de mí' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-800 border border-sky-200">
                                    📍 En {restaurant.city}
                                  </span>
                                )}
                                {restaurant.hasAirConditioning && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-800 border border-sky-200" title="Local climatizado con aire acondicionado">
                                    ❄️ A/C
                                  </span>
                                )}
                              </div>

                              <h3 className="font-serif font-bold text-base sm:text-lg text-stone-900 leading-snug mt-1">
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
                            {restaurant.description &&
                              !restaurant.description.includes('tiempo real en Google Maps') &&
                              !restaurant.description.includes('reseñas verificadas') && (
                                <p className="leading-relaxed">{restaurant.description}</p>
                              )}
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

                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${restaurant.name} ${restaurant.address || restaurant.city || 'Vietnam'}`.trim())}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs transition flex items-center gap-1 cursor-pointer"
                            title="Ver restaurante en Google Maps"
                          >
                            <MapPin className="w-3.5 h-3.5 text-rose-600" />
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

      {/* Manual City Selection Modal */}
      <CitySelectionModal
        isOpen={isCityModalOpen}
        onClose={() => {
          setIsCityModalOpen(false);
          setCityModalReason(null);
        }}
        onSelectCity={handleSelectCityFromModal}
        currentCityName={selectedCity}
        reasonMessage={cityModalReason}
        onRetryGps={handleRequestLocation}
        isLocatingGps={isLocating}
      />
    </div>
  );
};
