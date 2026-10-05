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
  Clock,
} from 'lucide-react';
import {
  RestaurantItem,
  BudgetPreference,
  CuisineFilterType,
  RestaurantSortOption,
  ExchangeRatesData,
  CurrencyCode,
} from '../types';
import { getCurrencyInfo, calculateForeignToVndRate } from '../utils/currencyUtils';
import { RAW_RESTAURANTS_DATA } from '../data/restaurants';
import {
  filterStrictRestaurants,
  sortRestaurants,
  matchesCuisineFilter,
  CUISINE_OPTIONS_CONFIG,
  BUDGET_TIER_CONFIG,
} from '../utils/restaurantAlgorithm';
import { checkRestaurantOpenStatus, formatFullOpeningHours } from '../utils/openingHours';
import { useScrollLock } from '../hooks/useScrollLock';
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
  onOpenPermissionsModal?: () => void;
  selectedCurrency?: CurrencyCode;
}

const CITY_COORDINATES = CITY_COORDINATES_MAP;

export const RestaurantFinder: React.FC<RestaurantFinderProps> = ({
  ratesData,
  isOnline,
  itineraryState,
  onNavigateToItinerary,
  onToggleOnlineMode,
  onNavigateToAllergies,
  onOpenPermissionsModal,
  selectedCurrency = 'EUR',
}) => {
  // Budget & Filter State
  const [budgetPref, setBudgetPref] = useState<BudgetPreference>('all');
  const [cuisineFilter, setCuisineFilter] = useState<CuisineFilterType>('all');
  const [onlyOpenNow, setOnlyOpenNow] = useState<boolean>(false);
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
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  // Modal states
  const [showAddToItineraryModal, setShowAddToItineraryModal] = useState<RestaurantItem | null>(null);
  useScrollLock(Boolean(showAddToItineraryModal));
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

  // Algorithmic sorting with budget affinity, cuisine filter and open now filter
  const sortedScoredEntries = useMemo(() => {
    let list = displayPool.filter((r) => matchesCuisineFilter(r, cuisineFilter));
    if (onlyOpenNow) {
      list = list.filter((r) => checkRestaurantOpenStatus(r.openingHours).isOpen);
    }
    return sortRestaurants(list, sortOption, budgetPref, userCoords);
  }, [displayPool, cuisineFilter, onlyOpenNow, sortOption, budgetPref, userCoords]);

  // Total count of currently open restaurants in current view pool
  const openCount = useMemo(() => {
    const cuisineFiltered = displayPool.filter((r) => matchesCuisineFilter(r, cuisineFilter));
    return cuisineFiltered.filter((r) => checkRestaurantOpenStatus(r.openingHours).isOpen).length;
  }, [displayPool, cuisineFilter]);

  // Base map center for current city/area
  const currentMapCenter = useMemo(() => {
    if (userCoords && (selectedCity === 'Cerca de mí' || !CITY_COORDINATES[selectedCity])) {
      return { lat: userCoords.lat, lng: userCoords.lng };
    }
    return CITY_COORDINATES[selectedCity] || CITY_COORDINATES['Sa Pa'] || { lat: 22.3356, lng: 103.8415, zoom: 14 };
  }, [userCoords, selectedCity]);

  // Format currency helpers
  const foreignToVndRate = calculateForeignToVndRate(ratesData.rates, selectedCurrency);
  const currInfo = getCurrencyInfo(selectedCurrency);

  const formatVndToEur = useCallback(
    (vnd: number) => {
      const val = vnd / foreignToVndRate;
      if (selectedCurrency === 'JPY') {
        return `${Math.round(val).toLocaleString('es-ES')} ¥`;
      }
      return `${val.toFixed(1)} ${currInfo.symbol}`;
    },
    [foreignToVndRate, selectedCurrency, currInfo]
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
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-stone-200/90 shadow-[0_4px_24px_rgba(28,25,23,0.04)] space-y-3.5">
        {/* Row 1: Header Title & City / Location Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 shrink-0">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-xl sm:text-2xl text-stone-900 leading-tight">
                Dónde Comer
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Selección verificada con más de 4.5★
              </p>
            </div>
          </div>

          {/* Action buttons: Location / Cerca de mí + City Selector */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Real-time Continuous Live Location Toggle Button */}
            <button
              type="button"
              onClick={toggleLiveTracking}
              disabled={isLocating}
              title={
                isLiveTracking
                  ? 'Ubicación en tiempo real activa. Haz clic para pausar.'
                  : 'Buscar restaurantes cercanos a mi ubicación actual'
              }
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0 active:scale-95 shadow-2xs ${
                isLiveTracking
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-200'
                  : userCoords && selectedCity === 'Cerca de mí'
                  ? 'bg-sky-600 hover:bg-sky-700 text-white'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200/80'
              }`}
            >
              {isLiveTracking ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                  </span>
                  <span>Cerca de mí</span>
                </>
              ) : (
                <>
                  <Crosshair className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin text-sky-500' : 'text-stone-500'}`} />
                  <span>{isLocating ? 'Buscando...' : 'Cerca de mí'}</span>
                </>
              )}
            </button>

            {/* City Selector Button */}
            <button
              type="button"
              onClick={() => {
                setCityModalReason(null);
                setIsCityModalOpen(true);
              }}
              title="Cambiar ciudad actual en Vietnam"
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 transition cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0 active:scale-95"
            >
              <MapPin className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>{selectedCity}</span>
              <span className="text-[10px] opacity-70">▼</span>
            </button>
          </div>
        </div>

        {/* Row 2: Unified Filter Bar (Tipo de cocina + Filtros rápidos) */}
        <div className="space-y-2">
          {/* Cuisines Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {CUISINE_OPTIONS_CONFIG.map((opt) => {
              const isSelected = cuisineFilter === opt.id;
              const shortLabels: Record<string, string> = {
                all: 'Todas',
                local: 'Local',
                street_food: 'Street Food',
                vegetarian: 'Vegetariana',
                western: 'Occidental',
                seafood: 'Marisco',
                cafe: 'Café',
              };
              const displayLabel = shortLabels[opt.id] || opt.label;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setCuisineFilter(opt.id)}
                  title={opt.shortDescription}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 shrink-0 active:scale-95 ${
                    isSelected
                      ? 'bg-amber-500 text-stone-950 font-bold shadow-xs'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-600 border border-stone-200/50'
                  }`}
                >
                  <span>{opt.icon}</span>
                  <span>{displayLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Price & Open Status in a single compact row */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 border-t border-stone-100">
            {/* Price Filter Chips */}
            {(['all', 'budget', 'moderate', 'fine'] as BudgetPreference[]).map((tierKey) => {
              const isSelected = budgetPref === tierKey;
              const labels: Record<BudgetPreference, string> = {
                all: 'Todos',
                budget: '<3€',
                moderate: '3–7€',
                fine: '>7€',
              };
              return (
                <button
                  key={tierKey}
                  type="button"
                  onClick={() => setBudgetPref(tierKey)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer shrink-0 active:scale-95 ${
                    isSelected
                      ? 'bg-stone-900 text-white font-bold shadow-xs'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-600 border border-stone-200/50'
                  }`}
                >
                  {labels[tierKey]}
                </button>
              );
            })}

            <span className="text-stone-300 select-none">|</span>

            {/* Open Now Toggle Chip */}
            <button
              type="button"
              onClick={() => setOnlyOpenNow(!onlyOpenNow)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 shrink-0 active:scale-95 ${
                onlyOpenNow
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-600 border border-stone-200/50'
              }`}
              title="Mostrar únicamente locales abiertos ahora"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  onlyOpenNow ? 'bg-white' : 'bg-emerald-500'
                }`}
              />
              <span>Abierto ahora</span>
              <span
                className={`text-[10px] px-1 rounded-sm font-bold ${
                  onlyOpenNow ? 'bg-emerald-800 text-emerald-100' : 'bg-stone-200 text-stone-600'
                }`}
              >
                {openCount}
              </span>
            </button>
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
                  <RefreshCw className="w-3 h-3 animate-spin" /> Buscando restaurantes cercanos...
                </span>
              ) : (
                <span>📍 Mostrando restaurantes cerca de ti</span>
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
                Pausar ubicación
              </button>
            )}
          </div>
        </div>
      )}

      {/* View Mode Switcher Toolbar (Mapa vs Lista) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-stone-200 shadow-2xs">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center p-1 bg-stone-100 rounded-xl border border-stone-200/80">
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'map'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>Mapa</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <List className="w-3.5 h-3.5 text-amber-400" />
              <span>Lista ({sortedScoredEntries.length})</span>
            </button>
          </div>

          <span className="text-xs text-stone-500 font-medium">
            {selectedCity === 'Cerca de mí' ? 'Cerca de ti' : selectedCity} • {sortedScoredEntries.length} locales
          </span>
        </div>

        {viewMode === 'map' && (
          <div className="text-xs text-stone-500 truncate hidden sm:block">
            Toca cualquier número en el mapa para ver sus detalles en la parte inferior
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {viewMode === 'map' ? (
        /* MAP VIEW: Only shows map and the selected restaurant card at the bottom */
        <div className="space-y-3">
          <div id="restaurant-map-section" className="bg-white rounded-3xl p-3 sm:p-4 border border-stone-200 shadow-xs space-y-3">
            <RestaurantMap
              center={currentMapCenter}
              zoom={selectedCity === 'Cerca de mí' ? 15 : (CITY_COORDINATES[selectedCity]?.zoom || 14)}
              items={sortedScoredEntries}
              selectedRestaurantId={selectedRestaurant?.id || (sortedScoredEntries.length > 0 ? sortedScoredEntries[0].restaurant.id : null)}
              onSelectRestaurant={(restaurant) => {
                setSelectedRestaurant(restaurant);
              }}
              onDeselectRestaurant={() => {
                // Keep selected to maintain the bottom bar
              }}
              onViewMenu={(r) => {
                setViewingMenuRestaurant(r);
              }}
              userLocation={userCoords}
              userLocationLabel={isLiveTracking ? 'Tu posición en tiempo real' : 'Tu ubicación'}
              isLiveTracking={isLiveTracking}
              onToggleLiveTracking={toggleLiveTracking}
              className="h-[420px] sm:h-[480px]"
            />

            {/* Selected Restaurant Card: Docked at the bottom of the map view */}
            {(() => {
              const activeRestaurant = selectedRestaurant || (sortedScoredEntries.length > 0 ? sortedScoredEntries[0].restaurant : null);
              if (!activeRestaurant) return null;

              const activeRankIndex = sortedScoredEntries.findIndex((e) => e.restaurant.id === activeRestaurant.id);
              const rankNumber = activeRankIndex >= 0 ? activeRankIndex + 1 : 1;
              const isTop1 = activeRankIndex === 0;
              const theme = getRestaurantTheme(activeRankIndex >= 0 ? activeRankIndex : 0, activeRestaurant.priceTier);
              const eurPrice = formatVndToEur(activeRestaurant.avgPriceVnd);
              const isExpanded = expandedCardId === activeRestaurant.id;

              return (
                <div className="p-4 bg-stone-900 text-white rounded-2xl shadow-xl border border-stone-800 space-y-3 animate-fade-in">
                  {/* Row 1: Rank Badge + Name + Speaker Button (Vertically centered) */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${theme.bg} ${theme.border} ${theme.text}`}
                      title={`Restaurante #${rankNumber}`}
                    >
                      <span>{isTop1 ? '👑 1' : rankNumber}</span>
                    </div>

                    <div className="min-w-0 flex-1 flex flex-col justify-center">
                      <h4 className="font-bold text-base sm:text-lg text-white leading-tight">
                        {activeRestaurant.name}
                      </h4>
                      {activeRestaurant.nameVi && activeRestaurant.nameVi !== activeRestaurant.name && (
                        <p className="text-xs text-stone-400 italic truncate mt-0.5" title={activeRestaurant.nameVi}>
                          {activeRestaurant.nameVi}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => speakVietnamese(activeRestaurant.nameVi)}
                        className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-400 hover:text-amber-300 border border-stone-700/60 transition cursor-pointer flex items-center justify-center shadow-xs"
                        title={`Escuchar pronunciación: ${activeRestaurant.nameVi}`}
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Rating, Reviews & Price Line (VND + EUR + Live Status + Service Icons) */}
                  <div className="flex items-center gap-2 flex-wrap text-xs text-stone-300 pt-0.5">
                    <span className="text-amber-400 font-bold flex items-center gap-0.5">
                      ★ {activeRestaurant.rating.toFixed(1)}
                    </span>
                    <span className="text-stone-400 text-xs">
                      ({activeRestaurant.reviewsCount.toLocaleString('es-ES')} reseñas)
                    </span>
                    <span className="text-stone-600">•</span>
                    <span className="text-emerald-400 font-mono font-bold text-xs sm:text-sm">
                      {(activeRestaurant.avgPriceVnd / 1000).toLocaleString('es-ES')}k ₫
                    </span>
                    <span className="text-stone-300 text-xs font-semibold bg-stone-800 px-2 py-0.5 rounded-md border border-stone-700/60">
                      {eurPrice}
                    </span>
                    {(() => {
                      const status = checkRestaurantOpenStatus(activeRestaurant.openingHours);
                      return (
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-semibold flex items-center gap-1 ${
                            status.isOpen
                              ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-800/70'
                              : 'bg-stone-800 text-stone-400 border border-stone-700/60'
                          }`}
                          title={status.statusText}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              status.isOpen ? 'bg-emerald-400' : 'bg-rose-400'
                            }`}
                          />
                          <span>{status.isOpen ? 'Abierto' : 'Cerrado'}</span>
                        </span>
                      );
                    })()}

                    {/* Service Badges directly next to Open / Closed status */}
                    <div className="flex items-center gap-1">
                      {activeRestaurant.hasAirConditioning && (
                        <span
                          className="px-1.5 py-0.5 rounded-md bg-sky-950/90 text-sky-300 border border-sky-800/60 text-[11px] flex items-center justify-center cursor-default select-none"
                          title="❄️ Aire Acondicionado disponible"
                        >
                          ❄️
                        </span>
                      )}
                      {activeRestaurant.isCashOnly ? (
                        <span
                          className="px-1.5 py-0.5 rounded-md bg-amber-950/90 text-amber-300 border border-amber-800/60 text-[11px] flex items-center justify-center cursor-default select-none"
                          title="💵 Solo pago en efectivo (VND)"
                        >
                          💵
                        </span>
                      ) : (
                        <span
                          className="px-1.5 py-0.5 rounded-md bg-stone-800/90 text-stone-300 border border-stone-700/60 text-[11px] flex items-center justify-center cursor-default select-none"
                          title="💳 Acepta pago con tarjeta"
                        >
                          💳
                        </span>
                      )}
                      {activeRestaurant.grabFoodDelivery && (
                        <span
                          className="px-1.5 py-0.5 rounded-md bg-emerald-950/90 text-emerald-300 border border-emerald-800/60 text-[11px] flex items-center justify-center cursor-default select-none"
                          title="🛵 Servicio a domicilio GrabFood disponible"
                        >
                          🛵
                        </span>
                      )}
                      {activeRestaurant.michelinGuide && (
                        <span
                          className="px-1.5 py-0.5 rounded-md bg-rose-950/90 text-rose-300 border border-rose-800/60 text-[11px] flex items-center justify-center cursor-default select-none"
                          title={`⭐ Guía Michelin (${activeRestaurant.michelinGuide})`}
                        >
                          ⭐
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Action Buttons */}
                  <div className="flex items-center gap-2 pt-1 border-t border-stone-800/80 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setViewingMenuRestaurant(activeRestaurant)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
                      title="Ver carta de platos, precios y fotos"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Carta</span>
                    </button>

                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${activeRestaurant.name} ${activeRestaurant.address || activeRestaurant.city || 'Vietnam'}`.trim())}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-rose-300 border border-stone-700 font-medium text-xs flex items-center gap-1.5 transition"
                      title="Abrir en Google Maps"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Google Maps</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        setShowAddToItineraryModal(activeRestaurant);
                        const activePlan = itineraryState.activePlan;
                        if (activePlan && activePlan.days.length > 0) {
                          setSelectedDayIdForAdd(activePlan.days[0].id);
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 border border-stone-700 font-medium text-xs flex items-center gap-1.5 transition cursor-pointer"
                      title="Añadir a un día del itinerario"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Itinerario</span>
                    </button>
                  </div>

                  {/* Row 3: Recommended Dish Highlight Box (Plato Imprescindible) */}
                  <div className="p-3 rounded-xl bg-stone-950/80 border border-amber-500/30 text-xs sm:text-sm text-amber-200 leading-relaxed flex items-start gap-2.5 shadow-inner">
                    <span className="text-base shrink-0 select-none">🍲</span>
                    <div className="min-w-0 flex-1">
                      <span className="text-amber-400 font-bold mr-1.5">Plato estrella:</span>
                      <span className="font-medium text-amber-100">{activeRestaurant.mustOrderDish}</span>
                    </div>
                  </div>

                  {/* Row 4: Desplegable Más info (Debajo del plato estrella) */}
                  <div className="flex items-center justify-end -mt-1">
                    <button
                      type="button"
                      onClick={() => toggleExpandCard(activeRestaurant.id)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold text-stone-400 hover:text-stone-200 hover:bg-stone-800/80 flex items-center gap-1 cursor-pointer transition"
                    >
                      <span>{isExpanded ? 'Menos info' : 'Más info'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5 text-stone-400" />}
                    </button>
                  </div>

                  {/* Row 5: Expandable Details */}
                  {isExpanded && (
                    <div className="pt-2.5 border-t border-stone-800 text-xs text-stone-300 space-y-2.5 animate-fade-in">
                      {activeRestaurant.description &&
                        !activeRestaurant.description.includes('tiempo real en Google Maps') &&
                        !activeRestaurant.description.includes('reseñas verificadas') && (
                          <p className="leading-relaxed text-stone-300/90 bg-stone-950/60 p-2.5 rounded-xl border border-stone-800/80">
                            {activeRestaurant.description}
                          </p>
                        )}

                      {/* Horario */}
                      {activeRestaurant.openingHours && (
                        <div className="p-2.5 rounded-xl bg-stone-950/80 border border-stone-800/80 flex items-start gap-2 text-xs text-stone-300">
                          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <span className="font-semibold text-stone-200 mr-1.5">Horario:</span>
                            <span className="text-amber-200/95 font-medium">
                              {formatFullOpeningHours(activeRestaurant.openingHours)}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Servicios del local (directo y conciso) */}
                      <div className="p-2.5 rounded-xl bg-stone-950/80 border border-stone-800/80 text-xs text-stone-300 space-y-2">
                        <span className="font-semibold text-stone-200 block">Servicios del local:</span>
                        <div className="flex flex-wrap items-center gap-2">
                          {activeRestaurant.hasAirConditioning && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-950/80 border border-sky-800/60 text-sky-200 font-medium text-xs">
                              <span>❄️</span>
                              <span>Aire acondicionado</span>
                            </span>
                          )}
                          {activeRestaurant.isCashOnly ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/80 border border-amber-800/60 text-amber-200 font-medium text-xs">
                              <span>💵</span>
                              <span>Solo efectivo</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-800/90 border border-stone-700/60 text-stone-200 font-medium text-xs">
                              <span>💳</span>
                              <span>Pago con tarjeta</span>
                            </span>
                          )}
                          {activeRestaurant.grabFoodDelivery && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-800/60 text-emerald-200 font-medium text-xs">
                              <span>🛵</span>
                              <span>GrabFood</span>
                            </span>
                          )}
                          {activeRestaurant.michelinGuide && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-950/80 border border-rose-800/60 text-rose-200 font-medium text-xs">
                              <span>⭐</span>
                              <span>Guía Michelin ({activeRestaurant.michelinGuide})</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {activeRestaurant.travelerTips &&
                        !activeRestaurant.travelerTips.toLowerCase().includes('abierto ahora') &&
                        !activeRestaurant.travelerTips.toLowerCase().includes('comprobar horario') && (
                          <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-900/30 text-xs text-amber-200/90 flex items-start gap-2">
                            <span className="text-amber-400 shrink-0 select-none text-sm">💡</span>
                            <div className="flex-1 min-w-0 leading-relaxed">
                              <span className="font-bold text-amber-300 mr-1.5">Consejo:</span>
                              <span>{activeRestaurant.travelerTips}</span>
                            </div>
                          </div>
                        )}

                      {activeRestaurant.address && (
                        <div className="text-xs text-stone-400 flex items-start gap-1.5 pt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                          <span className="leading-snug">{activeRestaurant.address}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      ) : (
        /* LIST VIEW: Full List of Restaurant Cards matching the sleek Map Card design */
        <div className="space-y-3">
          {sortedScoredEntries.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-stone-300 space-y-3">
              <UtensilsCrossed className="w-8 h-8 text-stone-300 mx-auto" />
              <h4 className="font-bold text-stone-800 text-sm">No hay restaurantes con los filtros actuales</h4>
              <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
                Prueba a seleccionar "Todos" en el precio o "Todas" en el tipo de comida.
              </p>
              <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setBudgetPref('all');
                    setCuisineFilter('all');
                    setOnlyOpenNow(false);
                  }}
                  className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  Restablecer todos los filtros
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sortedScoredEntries.map((entry, index) => {
                const { restaurant } = entry;
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
                    className={`p-4 bg-stone-900 text-white rounded-2xl shadow-xl border transition-all duration-200 space-y-3 ${
                      isSelected
                        ? 'border-amber-500 ring-2 ring-amber-400/40 bg-stone-900'
                        : isTop1
                        ? 'border-amber-500/80'
                        : 'border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    {/* Row 1: Rank Badge + Name + Speaker Button (Vertically centered) */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${theme.bg} ${theme.border} ${theme.text}`}
                        title={`Restaurante #${number}`}
                      >
                        <span>{isTop1 ? '👑 1' : number}</span>
                      </div>

                      <div className="min-w-0 flex-1 flex flex-col justify-center">
                        <h4 className="font-bold text-base sm:text-lg text-white leading-tight">
                          {restaurant.name}
                        </h4>
                        {restaurant.nameVi && restaurant.nameVi !== restaurant.name && (
                          <p className="text-xs text-stone-400 italic truncate mt-0.5" title={restaurant.nameVi}>
                            {restaurant.nameVi}
                          </p>
                        )}
                      </div>

                      <div className="shrink-0 flex items-center justify-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            speakVietnamese(restaurant.nameVi);
                          }}
                          className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-400 hover:text-amber-300 border border-stone-700/60 transition cursor-pointer flex items-center justify-center shadow-xs"
                          title={`Escuchar pronunciación: ${restaurant.nameVi}`}
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Rating, Reviews count & Price & Status & Service Icons */}
                    <div className="flex items-center gap-2 flex-wrap text-xs text-stone-300 pt-0.5">
                      <span className="text-amber-400 font-bold flex items-center gap-0.5">
                        ★ {restaurant.rating.toFixed(1)}
                      </span>
                      <span className="text-stone-400 text-xs">
                        ({restaurant.reviewsCount.toLocaleString('es-ES')} reseñas)
                      </span>
                      <span className="text-stone-600">•</span>
                      <span className="text-emerald-400 font-mono font-bold text-xs sm:text-sm">
                        {(restaurant.avgPriceVnd / 1000).toLocaleString('es-ES')}k ₫
                      </span>
                      <span className="text-stone-300 text-xs font-semibold bg-stone-800 px-2 py-0.5 rounded-md border border-stone-700/60">
                        {eurPrice}
                      </span>
                      {(() => {
                        const status = checkRestaurantOpenStatus(restaurant.openingHours);
                        return (
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold flex items-center gap-1 ${
                              status.isOpen
                                ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-800/70'
                                : 'bg-stone-800 text-stone-400 border border-stone-700/60'
                            }`}
                            title={status.statusText}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                status.isOpen ? 'bg-emerald-400' : 'bg-rose-400'
                              }`}
                            />
                            <span>{status.isOpen ? 'Abierto' : 'Cerrado'}</span>
                          </span>
                        );
                      })()}

                      {/* Service Badges directly next to Open / Closed status */}
                      <div className="flex items-center gap-1">
                        {restaurant.hasAirConditioning && (
                          <span
                            className="px-1.5 py-0.5 rounded-md bg-sky-950/90 text-sky-300 border border-sky-800/60 text-[11px] flex items-center justify-center cursor-default select-none"
                            title="❄️ Aire Acondicionado disponible"
                          >
                            ❄️
                          </span>
                        )}
                        {restaurant.isCashOnly ? (
                          <span
                            className="px-1.5 py-0.5 rounded-md bg-amber-950/90 text-amber-300 border border-amber-800/60 text-[11px] flex items-center justify-center cursor-default select-none"
                            title="💵 Solo pago en efectivo (VND)"
                          >
                            💵
                          </span>
                        ) : (
                          <span
                            className="px-1.5 py-0.5 rounded-md bg-stone-800/90 text-stone-300 border border-stone-700/60 text-[11px] flex items-center justify-center cursor-default select-none"
                            title="💳 Acepta pago con tarjeta"
                          >
                            💳
                          </span>
                        )}
                        {restaurant.grabFoodDelivery && (
                          <span
                            className="px-1.5 py-0.5 rounded-md bg-emerald-950/90 text-emerald-300 border border-emerald-800/60 text-[11px] flex items-center justify-center cursor-default select-none"
                            title="🛵 Servicio a domicilio GrabFood disponible"
                          >
                            🛵
                          </span>
                        )}
                        {restaurant.michelinGuide && (
                          <span
                            className="px-1.5 py-0.5 rounded-md bg-rose-950/90 text-rose-300 border border-rose-800/60 text-[11px] flex items-center justify-center cursor-default select-none"
                            title={`⭐ Guía Michelin (${restaurant.michelinGuide})`}
                          >
                            ⭐
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Row 2: Action Buttons & Expand Toggle */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-800/80 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Ver en Mapa button */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRestaurant(restaurant);
                            setViewMode('map');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition"
                          title="Ver este restaurante en el mapa"
                        >
                          <MapIcon className="w-3.5 h-3.5" />
                          <span>Ver en Mapa</span>
                        </button>

                        {/* Ver Carta button */}
                        <button
                          type="button"
                          onClick={() => setViewingMenuRestaurant(restaurant)}
                          className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 font-medium text-xs flex items-center gap-1.5 transition cursor-pointer"
                          title="Ver carta de platos, precios y fotos"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                          <span>Carta</span>
                        </button>

                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${restaurant.name} ${restaurant.address || restaurant.city || 'Vietnam'}`.trim())}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-rose-300 border border-stone-700 font-medium text-xs flex items-center gap-1.5 transition"
                          title="Abrir en Google Maps"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>Google Maps</span>
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
                          className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 border border-stone-700 font-medium text-xs flex items-center gap-1.5 transition cursor-pointer"
                          title="Añadir a un día del itinerario"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Itinerario</span>
                        </button>
                      </div>
                    </div>

                    {/* Row 3: Recommended Dish Highlight Box (Plato Imprescindible) */}
                    <div className="p-3 rounded-xl bg-stone-950/80 border border-amber-500/30 text-xs sm:text-sm text-amber-200 leading-relaxed flex items-start gap-2.5 shadow-inner">
                      <span className="text-base shrink-0 select-none">🍲</span>
                      <div className="min-w-0 flex-1">
                        <span className="text-amber-400 font-bold mr-1.5">Plato estrella:</span>
                        <span className="font-medium text-amber-100">{restaurant.mustOrderDish}</span>
                      </div>
                    </div>

                    {/* Row 4: Desplegable Más info (Debajo del plato estrella) */}
                    <div className="flex items-center justify-end -mt-1">
                      <button
                        type="button"
                        onClick={() => toggleExpandCard(restaurant.id)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold text-stone-400 hover:text-stone-200 hover:bg-stone-800/80 flex items-center gap-1 cursor-pointer transition"
                      >
                        <span>{isExpanded ? 'Menos info' : 'Más info'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5 text-stone-400" />}
                      </button>
                    </div>

                    {/* Row 5: Expandable Details */}
                    {isExpanded && (
                      <div className="pt-2.5 border-t border-stone-800 text-xs text-stone-300 space-y-2.5 animate-fade-in">
                        {restaurant.description &&
                          !restaurant.description.includes('tiempo real en Google Maps') &&
                          !restaurant.description.includes('reseñas verificadas') && (
                            <p className="leading-relaxed text-stone-300/90 bg-stone-950/60 p-2.5 rounded-xl border border-stone-800/80">
                              {restaurant.description}
                            </p>
                          )}

                        {/* Horario */}
                        {restaurant.openingHours && (
                          <div className="p-2.5 rounded-xl bg-stone-950/80 border border-stone-800/80 flex items-start gap-2 text-xs text-stone-300">
                            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <span className="font-semibold text-stone-200 mr-1.5">Horario:</span>
                              <span className="text-amber-200/95 font-medium">
                                {formatFullOpeningHours(restaurant.openingHours)}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Servicios del local (directo y conciso) */}
                        <div className="p-2.5 rounded-xl bg-stone-950/80 border border-stone-800/80 text-xs text-stone-300 space-y-2">
                          <span className="font-semibold text-stone-200 block">Servicios del local:</span>
                          <div className="flex flex-wrap items-center gap-2">
                            {restaurant.hasAirConditioning && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-950/80 border border-sky-800/60 text-sky-200 font-medium text-xs">
                                <span>❄️</span>
                                <span>Aire acondicionado</span>
                              </span>
                            )}
                            {restaurant.isCashOnly ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/80 border border-amber-800/60 text-amber-200 font-medium text-xs">
                                <span>💵</span>
                                <span>Solo efectivo</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-800/90 border border-stone-700/60 text-stone-200 font-medium text-xs">
                                <span>💳</span>
                                <span>Pago con tarjeta</span>
                              </span>
                            )}
                            {restaurant.grabFoodDelivery && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-800/60 text-emerald-200 font-medium text-xs">
                                <span>🛵</span>
                                <span>GrabFood</span>
                              </span>
                            )}
                            {restaurant.michelinGuide && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-950/80 border border-rose-800/60 text-rose-200 font-medium text-xs">
                                <span>⭐</span>
                                <span>Guía Michelin ({restaurant.michelinGuide})</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {restaurant.travelerTips &&
                          !restaurant.travelerTips.toLowerCase().includes('abierto ahora') &&
                          !restaurant.travelerTips.toLowerCase().includes('comprobar horario') && (
                            <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-900/30 text-xs text-amber-200/90 flex items-start gap-2">
                              <span className="text-amber-400 shrink-0 select-none text-sm">💡</span>
                              <div className="flex-1 min-w-0 leading-relaxed">
                                <span className="font-bold text-amber-300 mr-1.5">Consejo:</span>
                                <span>{restaurant.travelerTips}</span>
                              </div>
                            </div>
                          )}

                        {restaurant.address && (
                          <div className="text-xs text-stone-400 flex items-start gap-1.5 pt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                            <span className="leading-snug">{restaurant.address}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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
          ratesData={ratesData}
          selectedCurrency={selectedCurrency}
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
        onOpenPermissionsModal={onOpenPermissionsModal}
      />
    </div>
  );
};
