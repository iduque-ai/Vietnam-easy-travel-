import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  MapPin,
  Search,
  X,
  Crosshair,
  Check,
  Compass,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Globe,
  Loader2,
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
}

const LOCAL_STORAGE_RECENT_CITIES_KEY = 'vietnam_travel_recent_cities';

export const CitySelectionModal: React.FC<CitySelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectCity,
  currentCityName,
  reasonMessage,
  onRetryGps,
  isLocatingGps = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegionFilter, setSelectedRegionFilter] = useState<'all' | 'north' | 'central' | 'south'>('all');
  const [recentCities, setRecentCities] = useState<VietnamCityDestination[]>([]);
  const [liveResults, setLiveResults] = useState<VietnamCityDestination[]>([]);
  const [isSearchingLive, setIsSearchingLive] = useState(false);
  const [liveSearchError, setLiveSearchError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Load recent custom or visited cities from localStorage
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

  // Reset search state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setLiveResults([]);
      setIsSearchingLive(false);
      setLiveSearchError(null);
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

  // Save selected city to recent cities list
  const handleCityPicked = (city: VietnamCityDestination) => {
    try {
      const updated = [city, ...recentCities.filter((c) => c.name.toLowerCase() !== city.name.toLowerCase())].slice(0, 6);
      setRecentCities(updated);
      localStorage.setItem(LOCAL_STORAGE_RECENT_CITIES_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
    onSelectCity(city);
    onClose();
  };

  // Filter curated catalog
  const filteredCuratedCities = useMemo(() => {
    return VIETNAM_CITIES_CATALOG.filter((city) => {
      // Region filter
      if (selectedRegionFilter === 'north' && !city.regionId.includes('north')) return false;
      if (selectedRegionFilter === 'central' && !city.regionId.includes('central')) return false;
      if (selectedRegionFilter === 'south' && !city.regionId.includes('south')) return false;

      // Text query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = city.name.toLowerCase().includes(q) || city.nameVi.toLowerCase().includes(q);
        const matchesRegion = city.region.toLowerCase().includes(q);
        const matchesDesc = city.description.toLowerCase().includes(q);
        const matchesDishes = city.famousDishes.some((d) => d.toLowerCase().includes(q));
        const matchesHighlights = city.highlights.some((h) => h.toLowerCase().includes(q));
        return matchesName || matchesRegion || matchesDesc || matchesDishes || matchesHighlights;
      }
      return true;
    });
  }, [searchQuery, selectedRegionFilter]);

  // Debounced live search across all Vietnam (Nominatim API via server route with client fallback)
  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setLiveResults([]);
      setIsSearchingLive(false);
      setLiveSearchError(null);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsSearchingLive(true);
    setLiveSearchError(null);

    const timer = setTimeout(async () => {
      try {
        // Try server-side proxy route first
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
          // fallback to direct Nominatim if server is unreachable
        }

        // Direct Nominatim fallback if server didn't return results
        if (foundCities.length === 0 && !controller.signal.aborted) {
          try {
            const osmUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
              query + ', Vietnam'
            )}&format=json&addressdetails=1&limit=6&countrycodes=vn`;
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
                      addr.county ||
                      item.name ||
                      query;
                    const state = addr.state || addr.province || 'Vietnam';
                    const lat = parseFloat(item.lat);
                    const lon = parseFloat(item.lon);

                    return {
                      id: `osm-${item.place_id || Math.random().toString(36).substring(7)}`,
                      name,
                      nameVi: item.name || name,
                      nameEs: `${name} (${state})`,
                      region: `${state} • Vietnam`,
                      regionId: lat > 18 ? 'reg-hanoi-north' : lat > 13 ? 'reg-central' : 'reg-saigon-south',
                      lat,
                      lng: lon,
                      zoom: 13,
                      icon: '📍',
                      badge: 'En vivo OSM',
                      description: item.display_name,
                      highlights: [name, state],
                      famousDishes: ['Comida callejera y mercados locales', 'Especialidades regionales'],
                    };
                  });
              }
            }
          } catch {
            // ignore fallback error
          }
        }

        // Filter out cities that already match curated catalog names exactly
        const curatedNames = new Set(VIETNAM_CITIES_CATALOG.map((c) => c.name.toLowerCase()));
        const uniqueLive = foundCities.filter((c) => !curatedNames.has(c.name.toLowerCase()));

        if (!controller.signal.aborted) {
          setLiveResults(uniqueLive);
          setIsSearchingLive(false);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setIsSearchingLive(false);
        }
      }
    }, 380);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="city-modal-title"
    >
      <div className="relative w-full max-w-2xl bg-[#FAF8F5] rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] border border-stone-200/90 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header - Luxury Noir & Gold */}
        <div className="p-5 sm:p-6 border-b border-stone-800 bg-[#141210] text-stone-100">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/25 font-bold shadow-inner">
                <MapPin className="w-5 h-5 text-amber-400" />
              </span>
              <div>
                <h3 id="city-modal-title" className="text-base sm:text-lg font-serif font-bold text-stone-100 leading-tight tracking-wide">
                  Selecciona tu ciudad en Vietnam
                </h3>
                <p className="text-xs text-stone-400 font-light mt-1">
                  Explora 23+ destinos optimizados o busca cualquier provincia o localidad en tiempo real.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800/80 rounded-xl transition cursor-pointer border border-transparent hover:border-stone-700"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Reason Notification Banner */}
          {reasonMessage && (
            <div className="mt-3 p-3 bg-amber-50/90 border border-amber-200/80 rounded-2xl text-xs text-amber-950 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span className="leading-snug">{reasonMessage}</span>
              </div>
              {onRetryGps && (
                <div className="flex items-center gap-2 pt-1 border-t border-amber-200/50">
                  <button
                    type="button"
                    onClick={onRetryGps}
                    disabled={isLocatingGps}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <Crosshair className={`w-3.5 h-3.5 ${isLocatingGps ? 'animate-spin' : ''}`} />
                    <span>{isLocatingGps ? 'Localizando con satélites...' : 'Reintentar GPS'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Search Bar & Region Filters */}
          <div className="mt-3.5 space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar ciudad o provincia..."
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className="w-full pl-9 pr-8 py-2.5 sm:py-2 bg-white border border-stone-200 rounded-xl text-base sm:text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition shadow-2xs font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Region Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
              <span className="text-[11px] font-semibold text-stone-400 mr-1 shrink-0">Zona:</span>
              {(
                [
                  { id: 'all', label: 'Todos (23+)' },
                  { id: 'north', label: 'Norte (Sa Pa, Hanói, Hà Giang, Mai Châu...)' },
                  { id: 'central', label: 'Centro (Đà Nẵng, Hội An, Huế, Nha Trang...)' },
                  { id: 'south', label: 'Sur (Saigón, Mekong, Phú Quốc, Mũi Né...)' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedRegionFilter(tab.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                    selectedRegionFilter === tab.id
                      ? 'bg-stone-900 text-white font-bold shadow-2xs'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cities Grid (Scrollable) */}
        <div className="p-3 sm:p-5 overflow-y-auto space-y-4 overscroll-contain flex-1">
          {/* Live search indicator */}
          {isSearchingLive && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-800 rounded-xl text-xs border border-amber-200/70">
              <Loader2 className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
              <span>Buscando en vivo en OpenStreetMap para todo Vietnam...</span>
            </div>
          )}

          {/* Section 1: Curated Destination Cards */}
          {filteredCuratedCities.length > 0 && (
            <div className="space-y-2">
              {searchQuery && (
                <div className="flex items-center justify-between text-xs font-bold text-stone-700 px-1">
                  <span>Destinos destacados guardados ({filteredCuratedCities.length})</span>
                  <span className="text-[10px] text-stone-400 font-normal">Con gastronomía y notas offline</span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filteredCuratedCities.map((city) => {
                  const isSelected = currentCityName === city.name;
                  const isSapa = city.name === 'Sa Pa';

                  return (
                    <button
                      key={city.id}
                      type="button"
                      onClick={() => handleCityPicked(city)}
                      className={`text-left p-3 rounded-2xl border transition-all cursor-pointer relative group flex flex-col justify-between ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500 shadow-xs ring-2 ring-amber-500/20'
                          : isSapa
                          ? 'bg-emerald-50/50 hover:bg-emerald-50 border-emerald-300/80 hover:border-emerald-400 shadow-2xs'
                          : 'bg-white hover:bg-stone-50/90 border-stone-200 hover:border-stone-300 shadow-2xs'
                      }`}
                    >
                      <div>
                        {/* Top Header of Card */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl shrink-0 p-1.5 bg-white rounded-xl shadow-2xs border border-stone-100">
                              {city.icon}
                            </span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h4 className="font-bold text-sm text-stone-900 group-hover:text-amber-600 transition-colors">
                                  {city.name}
                                </h4>
                                {city.badge && (
                                  <span
                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                      isSapa
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                                    }`}
                                  >
                                    {city.badge}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-stone-500 font-medium block truncate">
                                {city.region}
                              </span>
                            </div>
                          </div>

                          {isSelected ? (
                            <span className="p-1 rounded-full bg-amber-500 text-stone-950 shadow-2xs shrink-0">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="p-1 rounded-full text-stone-300 group-hover:text-stone-700 transition shrink-0 opacity-0 group-hover:opacity-100">
                              <ArrowRight className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>

                        {/* Description */}
                        <p className="text-[11px] text-stone-600 mt-2 line-clamp-2 leading-relaxed">
                          {city.description}
                        </p>

                        {/* Famous Dishes Pill */}
                        {city.famousDishes && city.famousDishes.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-stone-100 flex flex-wrap gap-1">
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-500/10 px-1.5 py-0.5 rounded">
                              🍜 {city.famousDishes[0]}
                            </span>
                            {city.famousDishes[1] && (
                              <span className="text-[10px] text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded truncate max-w-[140px]">
                                {city.famousDishes[1]}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Coordinates & Action hint */}
                      <div className="mt-2.5 flex items-center justify-between text-[10px] text-stone-400 font-mono">
                        <span>
                          {city.lat.toFixed(3)}°N, {city.lng.toFixed(3)}°E
                        </span>
                        <span className="text-amber-600 font-sans font-semibold group-hover:underline">
                          {isSelected ? 'Ciudad activa' : 'Seleccionar →'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 2: Live OpenStreetMap Search Results */}
          {liveResults.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-stone-200">
              <div className="flex items-center justify-between text-xs font-bold text-stone-800 px-1">
                <span className="flex items-center gap-1.5 text-emerald-800">
                  <Globe className="w-4 h-4 text-emerald-600" />
                  <span>Encontrado en vivo en Vietnam ({liveResults.length})</span>
                </span>
                <span className="text-[10px] text-stone-400 font-normal">Geocodificado con OpenStreetMap</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {liveResults.map((liveCity) => {
                  const isSelected = currentCityName === liveCity.name;
                  return (
                    <button
                      key={liveCity.id}
                      type="button"
                      onClick={() => handleCityPicked(liveCity)}
                      className={`text-left p-3 rounded-2xl border transition-all cursor-pointer relative group flex flex-col justify-between ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500 shadow-xs ring-2 ring-amber-500/20'
                          : 'bg-emerald-50/30 hover:bg-emerald-50 border-emerald-200 hover:border-emerald-300 shadow-2xs'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl shrink-0 p-1.5 bg-white rounded-xl shadow-2xs border border-emerald-100">
                              📍
                            </span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h4 className="font-bold text-sm text-stone-900 group-hover:text-emerald-700 transition-colors">
                                  {liveCity.name}
                                </h4>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  En vivo
                                </span>
                              </div>
                              <span className="text-[10px] text-stone-500 font-medium block truncate">
                                {liveCity.region}
                              </span>
                            </div>
                          </div>

                          {isSelected ? (
                            <span className="p-1 rounded-full bg-amber-500 text-stone-950 shadow-2xs shrink-0">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="p-1 rounded-full text-stone-300 group-hover:text-stone-700 transition shrink-0 opacity-0 group-hover:opacity-100">
                              <ArrowRight className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-stone-600 mt-2 line-clamp-2 leading-relaxed">
                          {liveCity.description}
                        </p>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between text-[10px] text-stone-400 font-mono">
                        <span>
                          {liveCity.lat.toFixed(3)}°N, {liveCity.lng.toFixed(3)}°E
                        </span>
                        <span className="text-emerald-700 font-sans font-semibold group-hover:underline">
                          Fijar ubicación →
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 3: Recent Custom Cities (if no search query and available) */}
          {!searchQuery && recentCities.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-stone-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-600 px-1">
                <Clock className="w-3.5 h-3.5 text-stone-400" />
                <span>Ubicaciones recientes</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentCities.map((rec) => (
                  <button
                    key={`rec-${rec.name}`}
                    type="button"
                    onClick={() => handleCityPicked(rec)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-medium transition cursor-pointer"
                  >
                    <span>{rec.icon || '📍'}</span>
                    <span>{rec.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Empty state when neither curated nor live found */}
          {filteredCuratedCities.length === 0 && liveResults.length === 0 && !isSearchingLive && (
            <div className="text-center py-10 px-4 space-y-2">
              <Compass className="w-10 h-10 text-stone-300 mx-auto" />
              <p className="text-sm font-semibold text-stone-700">No encontramos coincidencias para "{searchQuery}"</p>
              <p className="text-xs text-stone-400 max-w-sm mx-auto">
                Puedes buscar cualquier ciudad, pueblo, provincia o isla de Vietnam escribiendo su nombre en vietnamita o español.
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-2 px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Ver todas las ciudades
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-stone-500 text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>
              Centra el mapa base y ajusta automáticamente la búsqueda de restaurantes locales.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 font-semibold cursor-pointer transition text-xs"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
