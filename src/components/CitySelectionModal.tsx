import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  MapPin,
  Search,
  X,
  Crosshair,
  Check,
  Compass,
  AlertTriangle,
  ChevronRight,
  Loader2,
  Globe,
  Clock,
} from 'lucide-react';
import { VIETNAM_CITIES_CATALOG, VietnamCityDestination } from '../data/cities';

interface CitySelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCity: (city: VietnamCityDestination) => void;
  currentCityName?: string;
  reasonMessage?: string | null;
  onRetryGps?: () => void;
  isLocatingGps?: boolean;
  onOpenPermissionsModal?: () => void;
}

const LOCAL_STORAGE_RECENT_CITIES_KEY = 'vietnam_travel_recent_cities_v3';

// Quick access top cities
const POPULAR_CITY_IDS = [
  'city-hanoi',
  'city-sapa',
  'city-hoian',
  'city-danang',
  'city-ninhbinh',
  'city-saigon',
  'city-hue',
  'city-phuquoc',
  'city-hagiang',
  'city-halong',
  'city-dalat',
  'city-catba',
];

// Helper to remove accents and diacritics for instant flexible search
function normalizeSearchText(text: string): string {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

export const CitySelectionModal: React.FC<CitySelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectCity,
  currentCityName,
  reasonMessage,
  onRetryGps,
  isLocatingGps = false,
  onOpenPermissionsModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegionFilter, setSelectedRegionFilter] = useState<'all' | 'popular' | 'north' | 'central' | 'south'>('all');
  const [recentCities, setRecentCities] = useState<VietnamCityDestination[]>([]);
  const [liveResults, setLiveResults] = useState<VietnamCityDestination[]>([]);
  const [isSearchingLive, setIsSearchingLive] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Load recent visited cities
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_RECENT_CITIES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentCities(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, [isOpen]);

  // Reset search and autofocus input on open
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setLiveResults([]);
      setIsSearchingLive(false);
      setSelectedRegionFilter('all');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleCityPicked = (city: VietnamCityDestination) => {
    try {
      const updated = [city, ...recentCities.filter((c) => c.name.toLowerCase() !== city.name.toLowerCase())].slice(0, 5);
      setRecentCities(updated);
      localStorage.setItem(LOCAL_STORAGE_RECENT_CITIES_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
    onSelectCity(city);
    onClose();
  };

  // Filter curated catalog with diacritic-resilient search
  const filteredCuratedCities = useMemo(() => {
    const query = normalizeSearchText(searchQuery);

    return VIETNAM_CITIES_CATALOG.filter((city) => {
      // Region / Popular filter (only if no active search text)
      if (!query) {
        if (selectedRegionFilter === 'popular' && !POPULAR_CITY_IDS.includes(city.id)) return false;
        if (selectedRegionFilter === 'north' && !city.regionId.includes('north')) return false;
        if (selectedRegionFilter === 'central' && !city.regionId.includes('central')) return false;
        if (selectedRegionFilter === 'south' && !city.regionId.includes('south')) return false;
      }

      // Search match
      if (query) {
        const nameNorm = normalizeSearchText(city.name);
        const nameViNorm = normalizeSearchText(city.nameVi);
        const nameEsNorm = normalizeSearchText(city.nameEs);
        const regionNorm = normalizeSearchText(city.region);

        return (
          nameNorm.includes(query) ||
          nameViNorm.includes(query) ||
          nameEsNorm.includes(query) ||
          regionNorm.includes(query)
        );
      }

      return true;
    });
  }, [searchQuery, selectedRegionFilter]);

  // Debounced live search across all Vietnam (for specific towns/villages)
  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setLiveResults([]);
      setIsSearchingLive(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsSearchingLive(true);

    const timer = setTimeout(async () => {
      try {
        let foundCities: VietnamCityDestination[] = [];

        try {
          const res = await fetch(`/api/cities/search?q=${encodeURIComponent(query)}`, {
            signal: controller.signal,
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.cities) && data.cities.length > 0) {
              foundCities = data.cities;
            }
          }
        } catch {
          // fallback
        }

        if (foundCities.length === 0 && !controller.signal.aborted) {
          try {
            const osmUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
              query + ', Vietnam'
            )}&format=json&addressdetails=1&limit=5&countrycodes=vn`;
            const osmRes = await fetch(osmUrl, { signal: controller.signal });
            if (osmRes.ok) {
              const osmData = await osmRes.json();
              if (Array.isArray(osmData)) {
                foundCities = osmData
                  .filter((item: any) => {
                    const lat = parseFloat(item.lat);
                    const lon = parseFloat(item.lon);
                    return lat >= 8.0 && lat <= 24.0 && lon >= 102.0 && lon <= 110.0;
                  })
                  .map((item: any) => {
                    const addr = item.address || {};
                    const name =
                      addr.city ||
                      addr.town ||
                      addr.village ||
                      addr.municipality ||
                      item.name ||
                      query;
                    const state = addr.state || addr.province || 'Vietnam';
                    const lat = parseFloat(item.lat);
                    const lon = parseFloat(item.lon);

                    return {
                      id: `osm-${item.place_id || Math.random().toString(36).substring(7)}`,
                      name,
                      nameVi: item.name || name,
                      nameEs: name,
                      region: state,
                      regionId: lat > 18 ? 'reg-hanoi-north' : lat > 13 ? 'reg-central' : 'reg-saigon-south',
                      lat,
                      lng: lon,
                      zoom: 13,
                      icon: '📍',
                      badge: 'OSM',
                      description: item.display_name,
                      highlights: [],
                      famousDishes: [],
                    };
                  });
              }
            }
          } catch {
            // ignore
          }
        }

        const curatedNormalized = new Set(VIETNAM_CITIES_CATALOG.map((c) => normalizeSearchText(c.name)));
        const uniqueLive = foundCities.filter((c) => !curatedNormalized.has(normalizeSearchText(c.name)));

        if (!controller.signal.aborted) {
          setLiveResults(uniqueLive);
          setIsSearchingLive(false);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setIsSearchingLive(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/80 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="city-modal-title"
    >
      {/* Modal Container: fixed height ratio so inner list scrolls reliably */}
      <div className="relative w-full max-w-lg bg-[#FAF8F5] rounded-2xl shadow-2xl border border-stone-300 overflow-hidden flex flex-col h-[85vh] max-h-[640px]">
        {/* Header (fixed at top) */}
        <div className="p-4 border-b border-stone-800 bg-[#141210] text-stone-100 shrink-0 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-amber-400 shrink-0" />
              <h3 id="city-modal-title" className="text-base font-bold text-white tracking-wide">
                Selecciona tu Ciudad
              </h3>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition cursor-pointer"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Simple compact failure warning if GPS failed */}
          {reasonMessage && (
            <div className="p-2.5 bg-amber-950/60 border border-amber-500/40 rounded-xl text-xs text-amber-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="truncate">Sin señal GPS. Elige tu destino:</span>
              </div>

              {onRetryGps && (
                <button
                  type="button"
                  onClick={onRetryGps}
                  disabled={isLocatingGps}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-[11px] rounded-lg transition flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <Crosshair className={`w-3 h-3 ${isLocatingGps ? 'animate-spin' : ''}`} />
                  <span>{isLocatingGps ? 'Buscando...' : 'Mi ubicación'}</span>
                </button>
              )}
            </div>
          )}

          {/* Instant Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar ciudad (ej: Sapa, Hanoi, Hoi An, Saigon...)"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="w-full pl-9 pr-8 py-2 bg-stone-900 border border-stone-700 text-stone-100 placeholder:text-stone-400 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-amber-400 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills (hidden during active search to keep view clean) */}
          {!searchQuery && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs pt-0.5">
              {[
                { id: 'all', label: 'Todas' },
                { id: 'popular', label: 'Populares' },
                { id: 'north', label: 'Norte' },
                { id: 'central', label: 'Centro' },
                { id: 'south', label: 'Sur' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedRegionFilter(tab.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    selectedRegionFilter === tab.id
                      ? 'bg-amber-500 text-stone-950 font-bold'
                      : 'bg-stone-900 text-stone-300 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Scrollable List Container (clean native vertical scrolling) */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 divide-y-0" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* Live search indicator */}
          {isSearchingLive && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-800 rounded-lg text-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600 shrink-0" />
              <span>Buscando en mapa de Vietnam...</span>
            </div>
          )}

          {/* Curated Cities List (Clean, compact 1-line rows) */}
          {filteredCuratedCities.map((city) => {
            const isSelected = currentCityName === city.name;

            return (
              <button
                key={city.id}
                type="button"
                onClick={() => handleCityPicked(city)}
                className={`w-full text-left px-3 py-2.5 rounded-xl border transition flex items-center justify-between gap-3 cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-500 text-stone-950 font-bold'
                    : 'bg-white hover:bg-stone-100/90 border-stone-200 text-stone-800'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xl shrink-0">{city.icon}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-bold text-sm text-stone-900">{city.name}</span>
                      {city.nameEs && city.nameEs !== city.name && (
                        <span className="text-xs text-stone-500 font-normal truncate hidden sm:inline">
                          ({city.nameEs})
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-stone-500 truncate block">
                      {city.region}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1">
                  {isSelected ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500 text-stone-950 text-xs font-bold">
                      <Check className="w-3 h-3" />
                      <span>Activa</span>
                    </span>
                  ) : (
                    <ChevronRight className="w-4 h-4 text-stone-400" />
                  )}
                </div>
              </button>
            );
          })}

          {/* OpenStreetMap Live Geocoded Results (if any) */}
          {liveResults.map((liveCity) => {
            const isSelected = currentCityName === liveCity.name;
            return (
              <button
                key={liveCity.id}
                type="button"
                onClick={() => handleCityPicked(liveCity)}
                className={`w-full text-left px-3 py-2.5 rounded-xl border transition flex items-center justify-between gap-3 cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-500 text-stone-950 font-bold'
                    : 'bg-emerald-50/50 hover:bg-emerald-50 border-emerald-200 text-stone-800'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-lg shrink-0">📍</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-bold text-sm text-stone-900">{liveCity.name}</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">
                        OSM
                      </span>
                    </div>
                    <span className="text-[11px] text-stone-500 truncate block">
                      {liveCity.region}
                    </span>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
              </button>
            );
          })}

          {/* Empty state */}
          {filteredCuratedCities.length === 0 && liveResults.length === 0 && !isSearchingLive && (
            <div className="text-center py-8 px-4 space-y-2">
              <Compass className="w-8 h-8 text-stone-400 mx-auto" />
              <p className="text-xs font-semibold text-stone-700">Sin resultados para "{searchQuery}"</p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs text-amber-600 font-bold underline cursor-pointer"
              >
                Ver todas las ciudades
              </button>
            </div>
          )}
        </div>

        {/* Footer (compact) */}
        <div className="p-3 bg-stone-100 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500 shrink-0">
          <span>{filteredCuratedCities.length} destinos disponibles</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 font-semibold rounded-lg transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
