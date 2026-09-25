import React, { useState, useMemo, useEffect } from 'react';
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

  // Reset search when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
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

  // Filtered cities list
  const filteredCities = useMemo(() => {
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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="city-modal-title"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-100 bg-linear-to-r from-amber-500/10 via-stone-50 to-emerald-500/10">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-2xl bg-amber-500 text-stone-950 font-bold shadow-md">
                <MapPin className="w-5 h-5" />
              </span>
              <div>
                <h3 id="city-modal-title" className="text-base sm:text-lg font-bold text-stone-900 leading-tight">
                  Selecciona tu ciudad actual en Vietnam
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Ajusta el buscador de restaurantes locales y centra el mapa base al instante.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition cursor-pointer"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Reason Alert (if GPS was imprecise or unavailable) */}
          {reasonMessage && (
            <div className="mt-3 p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-950 text-xs space-y-2.5 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">{reasonMessage}</span>
                </div>
                {onRetryGps && (
                  <button
                    type="button"
                    onClick={onRetryGps}
                    disabled={isLocatingGps}
                    className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shrink-0 cursor-pointer flex items-center gap-1.5 transition shadow-xs disabled:opacity-50 self-start sm:self-auto"
                  >
                    <Crosshair className={`w-3.5 h-3.5 ${isLocatingGps ? 'animate-spin' : ''}`} />
                    <span>{isLocatingGps ? 'Buscando GPS...' : 'Reintentar GPS'}</span>
                  </button>
                )}
              </div>

              {/* Specific guidance for visor iframe in mobile */}
              {typeof window !== 'undefined' && window.self !== window.top && (
                <div className="pt-2.5 border-t border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white/60 p-2.5 rounded-xl">
                  <div className="space-y-0.5">
                    <p className="font-bold text-stone-900 text-[11px] flex items-center gap-1">
                      <span>💡 ¿Cómo activar el GPS en tiempo real?</span>
                    </p>
                    <p className="text-[11px] text-stone-600">
                      Estás en el visor embebido de AI Studio. Safari/Chrome bloquean la antena GPS dentro de marcos. Ábrela en Safari directo para permitir el GPS nativo.
                    </p>
                  </div>
                  <a
                    href={typeof window !== 'undefined' ? window.location.href : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                    <span>Abrir en Safari / Chrome</span>
                  </a>
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
                placeholder="Buscar ciudad (Sa Pa, Hanói, Đà Nẵng, Ninh Bình...)"
                autoFocus
                className="w-full pl-9 pr-8 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition shadow-2xs font-medium"
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
                  { id: 'all', label: 'Todas las ciudades' },
                  { id: 'north', label: 'Norte (Sa Pa, Hanói, Ninh Bình)' },
                  { id: 'central', label: 'Centro (Đà Nẵng, Hội An, Huế)' },
                  { id: 'south', label: 'Sur (Saigón, Mekong, Phú Quốc)' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedRegionFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition cursor-pointer text-[11px] shrink-0 ${
                    selectedRegionFilter === tab.id
                      ? 'bg-stone-900 text-white font-bold shadow-2xs'
                      : 'bg-white hover:bg-stone-100 text-stone-600 border border-stone-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cities Grid (Scrollable) */}
        <div className="p-3 sm:p-5 overflow-y-auto space-y-2.5 overscroll-contain flex-1">
          {filteredCities.length === 0 ? (
            <div className="text-center py-10 px-4 space-y-2">
              <Compass className="w-10 h-10 text-stone-300 mx-auto" />
              <p className="text-sm font-semibold text-stone-700">No encontramos ninguna ciudad con "{searchQuery}"</p>
              <p className="text-xs text-stone-400">Intenta buscar por provincia o selecciona una ciudad de la lista principal.</p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-2 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Limpiar búsqueda
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {filteredCities.map((city) => {
                const isSelected = currentCityName === city.name;
                const isSapa = city.name === 'Sa Pa';

                return (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => {
                      onSelectCity(city);
                      onClose();
                    }}
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
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                  isSapa
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                                }`}>
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

                      {/* Description & Food highlights */}
                      <p className="text-[11px] text-stone-600 mt-2 line-clamp-2 leading-relaxed">
                        {city.description}
                      </p>

                      {/* Famous Dishes Pill */}
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
                    </div>

                    {/* Coordinates & Action hint */}
                    <div className="mt-2.5 flex items-center justify-between text-[10px] text-stone-400 font-mono">
                      <span>{city.lat.toFixed(3)}°N, {city.lng.toFixed(3)}°E</span>
                      <span className="text-amber-600 font-sans font-semibold group-hover:underline">
                        {isSelected ? 'Ciudad activa' : 'Seleccionar →'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-stone-500 text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>
              Centra el mapa base y filtra automáticamente los restaurantes locales con más de 4.5★.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 font-semibold cursor-pointer transition text-xs"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
