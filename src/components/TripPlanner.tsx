import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Calendar,
  MapPin,
  Clock,
  Ticket,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Navigation,
  ExternalLink,
  Volume2,
  Sparkles,
  Share2,
  Copy,
  Check,
  ChevronRight,
  ChevronDown,
  Info,
  Compass,
  AlertTriangle,
  Download,
  Layers,
  Wand2,
  X,
  Edit2,
  Eye,
  Map as MapIcon,
  Maximize2,
  Minimize2,
  Flame,
  ArrowRight,
} from 'lucide-react';
import {
  ItineraryPlan,
  ItineraryDay,
  ItineraryStop,
  PointOfInterest,
  ExchangeRatesData,
  CurrencyCode,
} from '../types';
import { ItineraryState } from '../utils/useItineraryState';
import { POINTS_OF_INTEREST, REGION_PACKS } from '../data/pois';
import { VIETNAM_CITIES_CATALOG, VietnamCityDestination } from '../data/cities';
import { DEFAULT_ITINERARIES } from '../data/defaultItineraries';
import { TripInteractiveMap } from './TripInteractiveMap';
import { speakVietnamese } from '../utils/storage';
import { optimizeStopsOrder, buildMultiStopGoogleMapsUrl } from '../utils/routeOptimizer';
import { getCurrencyInfo, calculateForeignToVndRate } from '../utils/currencyUtils';
import { useScrollLock } from '../hooks/useScrollLock';

interface TripPlannerProps {
  ratesData: ExchangeRatesData;
  isOnline: boolean;
  itineraryState: ItineraryState;
  selectedCurrency?: CurrencyCode;
  onStartFreeTour?: (poi: PointOfInterest) => void;
  onOpenPermissionsModal?: () => void;
}

export const TripPlanner: React.FC<TripPlannerProps> = ({
  ratesData,
  isOnline,
  itineraryState,
  selectedCurrency = 'EUR',
  onStartFreeTour,
  onOpenPermissionsModal,
}) => {
  const {
    plans,
    activePlan,
    activePlanId,
    selectedDayId,
    currentDay,
    setSelectedDayId,
    setActivePlanId,
    updatePlans,
    addPoiToDay,
    addCustomStopToDay,
    removeStopFromDay,
    toggleStopVisited,
    reorderStopsInDay,
    addDay,
    removeDay,
    updateDay,
    updatePlanTitle,
    createNewPersonalPlan,
    clearPlanStops,
  } = itineraryState;

  // Currency calculations
  const foreignToVndRate = calculateForeignToVndRate(ratesData.rates, selectedCurrency);
  const currInfo = getCurrencyInfo(selectedCurrency);

  const formatVndToForeign = useCallback(
    (vnd: number) => {
      const val = vnd / foreignToVndRate;
      if (selectedCurrency === 'JPY') {
        return `${Math.round(val).toLocaleString('es-ES')} ¥`;
      }
      return `${val.toFixed(2).replace('.', ',')} ${currInfo.symbol}`;
    },
    [foreignToVndRate, selectedCurrency, currInfo]
  );

  // Layout View mode: 'split' (Map on top/side + Stops) vs 'map-expanded' vs 'list-only'
  const [mapExpanded, setMapExpanded] = useState<boolean>(false);
  const [mapEngine, setMapEngine] = useState<'google' | 'osm'>(() => {
    return isOnline ? 'google' : 'osm';
  });

  useEffect(() => {
    setMapEngine(isOnline ? 'google' : 'osm');
  }, [isOnline]);

  // Modal states
  const [isAddPoiModalOpen, setIsAddPoiModalOpen] = useState<boolean>(false);
  const [isCustomStopModalOpen, setIsCustomStopModalOpen] = useState<boolean>(false);
  const [isCitySelectorOpen, setIsCitySelectorOpen] = useState<boolean>(false);
  const [isInspirationModalOpen, setIsInspirationModalOpen] = useState<boolean>(false);
  const [isEditTripTitleOpen, setIsEditTripTitleOpen] = useState<boolean>(false);
  const [selectedPoiDetail, setSelectedPoiDetail] = useState<PointOfInterest | null>(null);

  // Form states
  const [customStopName, setCustomStopName] = useState<string>('');
  const [customStopTimeSlot, setCustomStopTimeSlot] = useState<string>('Mañana 10:00');
  const [customStopCostVnd, setCustomStopCostVnd] = useState<number>(0);
  const [customStopNotes, setCustomStopNotes] = useState<string>('');
  const [newTripTitleInput, setNewTripTitleInput] = useState<string>('');

  // Lock background scrolling when any modal is open
  const isAnyModalOpen = Boolean(
    selectedPoiDetail ||
    isAddPoiModalOpen ||
    isCustomStopModalOpen ||
    isCitySelectorOpen ||
    isInspirationModalOpen ||
    isEditTripTitleOpen
  );
  useScrollLock(isAnyModalOpen);

  // Toast / notification banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedGrabId, setCopiedGrabId] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Current Day info
  const day = currentDay || activePlan?.days[0] || null;

  // Find destination city configuration
  const currentCityConfig = useMemo(() => {
    if (!day) return VIETNAM_CITIES_CATALOG[1]; // default Hanoi
    const found = VIETNAM_CITIES_CATALOG.find(
      (c) =>
        c.name.toLowerCase() === day.destinationCity.toLowerCase() ||
        c.nameVi.toLowerCase() === day.destinationCity.toLowerCase() ||
        c.nameEs.toLowerCase().includes(day.destinationCity.toLowerCase())
    );
    return found || VIETNAM_CITIES_CATALOG[1];
  }, [day]);

  // Recommended POIs for current city
  const cityRecommendedPois = useMemo(() => {
    if (!day) return [];
    return POINTS_OF_INTEREST.filter(
      (p) =>
        p.city.toLowerCase() === day.destinationCity.toLowerCase() ||
        p.regionId === currentCityConfig.regionId
    );
  }, [day, currentCityConfig]);

  // Stops of current day mapped with coordinates
  const dayStopsWithPois = useMemo(() => {
    if (!day) return [];
    return day.stops.map((stop, index) => {
      const poi = stop.poiId ? POINTS_OF_INTEREST.find((p) => p.id === stop.poiId) : undefined;
      return {
        stop,
        stopId: stop.id,
        isVisited: stop.isVisited,
        timeSlot: stop.timeSlot,
        index: index + 1,
        poi,
        title: stop.customName || poi?.nameEs || 'Parada',
        vietnameseTitle: poi?.nameVi || '',
        lat: poi ? poi.lat : currentCityConfig.lat + (index * 0.005 - 0.01),
        lng: poi ? poi.lng : currentCityConfig.lng + (index * 0.005 - 0.01),
        ticketVnd: stop.ticketVnd || poi?.ticketVnd || 0,
      };
    });
  }, [day, currentCityConfig]);

  // Map route polyline coordinates
  const mapRouteCoordinates = useMemo(() => {
    return dayStopsWithPois
      .filter((s) => s.poi !== undefined)
      .map((s) => ({
        lat: s.lat,
        lng: s.lng,
        label: `${s.index}. ${s.title}`,
      }));
  }, [dayStopsWithPois]);

  // Total stats for the day
  const dayStats = useMemo(() => {
    if (!day) return { total: 0, visited: 0, ticketsVnd: 0 };
    const total = day.stops.length;
    const visited = day.stops.filter((s) => s.isVisited).length;
    const ticketsVnd = day.stops.reduce((acc, s) => acc + (s.ticketVnd || 0), 0);
    return { total, visited, ticketsVnd };
  }, [day]);

  // Total stats for whole trip
  const tripStats = useMemo(() => {
    if (!activePlan) return { totalDays: 0, totalStops: 0, visitedStops: 0, totalTicketsVnd: 0 };
    let totalStops = 0;
    let visitedStops = 0;
    let totalTicketsVnd = 0;
    activePlan.days.forEach((d) => {
      totalStops += d.stops.length;
      visitedStops += d.stops.filter((s) => s.isVisited).length;
      totalTicketsVnd += d.stops.reduce((acc, s) => acc + (s.ticketVnd || 0), 0);
    });
    return {
      totalDays: activePlan.days.length,
      totalStops,
      visitedStops,
      totalTicketsVnd,
    };
  }, [activePlan]);

  // Handle Grab Address copy
  const handleCopyGrabAddress = (stopItem: (typeof dayStopsWithPois)[0]) => {
    const textToCopy = stopItem.vietnameseTitle
      ? `${stopItem.vietnameseTitle}, ${day?.destinationCity || 'Vietnam'}`
      : `${stopItem.title}, ${day?.destinationCity || 'Vietnam'}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
    }
    setCopiedGrabId(stopItem.stop.id);
    showToast(`🚕 Dirección en vietnamita copiada para Grab: "${textToCopy}"`);
    setTimeout(() => setCopiedGrabId(null), 2500);
  };

  // Optimize stops order
  const handleOptimizeRoute = () => {
    if (!activePlan || !day || day.stops.length < 2) return;
    const optimized = optimizeStopsOrder(day.stops);
    reorderStopsInDay(activePlan.id, day.id, optimized.orderedStops);
    showToast('✨ Paradas reordenadas para minimizar desplazamientos en taxi.');
  };

  // Open in Google Maps
  const handleOpenGoogleMapsRoute = () => {
    if (!day) return;
    const url = buildMultiStopGoogleMapsUrl(day.stops);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Export trip summary to text
  const handleExportTripToText = () => {
    if (!activePlan) return;
    let text = `🇻🇳 ${activePlan.title.toUpperCase()}\n`;
    text += `Días: ${tripStats.totalDays} | Paradas: ${tripStats.totalStops} | Presupuesto entradas: ${tripStats.totalTicketsVnd.toLocaleString('es-ES')} ₫ (${formatVndToForeign(tripStats.totalTicketsVnd)})\n`;
    text += `----------------------------------------------------\n\n`;

    activePlan.days.forEach((d) => {
      text += `📅 DÍA ${d.dayNumber}: ${d.destinationCity.toUpperCase()} - ${d.title}\n`;
      if (d.stops.length === 0) {
        text += `   (Día libre / Sin paradas programadas)\n`;
      } else {
        d.stops.forEach((s, idx) => {
          const poi = s.poiId ? POINTS_OF_INTEREST.find((p) => p.id === s.poiId) : undefined;
          text += `   ${idx + 1}. [${s.timeSlot || 'Libre'}] ${s.customName || poi?.nameEs} ${s.isVisited ? '✓' : ''}\n`;
          if (poi?.nameVi) text += `      🇻🇳 ${poi.nameVi}\n`;
          if (s.ticketVnd && s.ticketVnd > 0) {
            text += `      🎟️ ${s.ticketVnd.toLocaleString('es-ES')} ₫\n`;
          }
        });
      }
      text += `\n`;
    });

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast('📋 Itinerario completo copiado al portapapeles.');
    }
  };

  // Handle adding custom stop
  const handleSaveCustomStop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePlan || !day || !customStopName.trim()) return;
    addCustomStopToDay(
      activePlan.id,
      day.id,
      customStopName.trim(),
      customStopTimeSlot,
      customStopCostVnd,
      customStopNotes.trim()
    );
    setCustomStopName('');
    setCustomStopCostVnd(0);
    setCustomStopNotes('');
    setIsCustomStopModalOpen(false);
    showToast(`✓ Parada "${customStopName}" añadida al Día ${day.dayNumber}`);
  };

  // Change destination city of current day
  const handleChangeDayCity = (city: VietnamCityDestination) => {
    if (!day) return;
    updateDay(day.id, {
      destinationCity: city.name,
      title: `Día ${day.dayNumber}: ${city.name}`,
    });
    setIsCitySelectorOpen(false);
    showToast(`📍 Ciudad del Día ${day.dayNumber} cambiada a ${city.name}`);
  };

  return (
    <div className="space-y-4 pb-12 animate-fade-in text-stone-100">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 max-w-sm bg-stone-900 text-stone-100 px-4 py-3 rounded-2xl shadow-2xl border border-amber-500/40 text-xs flex items-center gap-2.5 backdrop-blur-md animate-slide-in">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Top Trip Header Card */}
      <section className="bg-stone-900/90 border border-stone-800 rounded-3xl p-4 sm:p-5 shadow-xl relative overflow-hidden backdrop-blur-sm">
        {/* Subtle decorative background gradient */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                Mi Viaje a Vietnam
              </span>
              <button
                onClick={() => {
                  setNewTripTitleInput(activePlan?.title || 'Mi Viaje');
                  setIsEditTripTitleOpen(true);
                }}
                className="text-stone-400 hover:text-stone-200 transition cursor-pointer p-1"
                title="Editar nombre del viaje"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white font-serif mt-1 tracking-tight">
              {activePlan?.title || 'Mi Viaje Personalizado'}
            </h1>
          </div>

          {/* Quick Action Toolbar */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <button
              onClick={handleExportTripToText}
              className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700/80 border border-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-xs"
              title="Copiar resumen del viaje en texto para notas o WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Compartir</span>
            </button>

            <button
              onClick={() => setIsInspirationModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-stone-800/80 hover:bg-stone-700 border border-stone-700 text-stone-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer active:scale-95"
              title="Ver sugerencias de rutas clásicas"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Plantillas</span>
            </button>

            <button
              onClick={() => {
                if (window.confirm('¿Quieres crear un nuevo viaje en blanco desde cero?')) {
                  createNewPersonalPlan('Mi Nueva Ruta');
                  showToast('✓ Nuevo viaje en blanco creado.');
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-sm"
              title="Comenzar una nueva ruta"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Viaje</span>
            </button>
          </div>
        </div>

        {/* Trip Stats Bar */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-3.5 border-t border-stone-800/80 text-center">
          <div className="bg-stone-950/60 rounded-2xl py-2 px-3 border border-stone-800/60">
            <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider font-mono">
              Duración
            </span>
            <span className="text-base sm:text-lg font-black text-white font-mono">
              {tripStats.totalDays} {tripStats.totalDays === 1 ? 'Día' : 'Días'}
            </span>
          </div>

          <div className="bg-stone-950/60 rounded-2xl py-2 px-3 border border-stone-800/60">
            <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider font-mono">
              Progreso
            </span>
            <span className="text-base sm:text-lg font-black text-emerald-400 font-mono">
              {tripStats.visitedStops} / {tripStats.totalStops}
            </span>
            <span className="text-[9px] text-stone-400 block font-medium">visitadas</span>
          </div>

          <div className="bg-stone-950/60 rounded-2xl py-2 px-3 border border-stone-800/60">
            <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider font-mono">
              Entradas Est.
            </span>
            <span className="text-base sm:text-lg font-black text-amber-300 font-mono">
              {(tripStats.totalTicketsVnd / 1000).toLocaleString('es-ES')}k ₫
            </span>
            <span className="text-[9px] text-stone-400 block font-mono">
              ≈ {formatVndToForeign(tripStats.totalTicketsVnd)}
            </span>
          </div>
        </div>
      </section>

      {/* Days Horizontal Timeline Selector */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-stone-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            Días de tu viaje
          </span>

          <button
            onClick={() => {
              const lastCity = day?.destinationCity || 'Hà Nội';
              addDay(lastCity);
              showToast(`✓ Día añadido a tu viaje`);
            }}
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Añadir Día</span>
          </button>
        </div>

        {/* Scrollable Day Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-stone-800 -mx-1 px-1">
          {activePlan?.days.map((d) => {
            const isSelected = d.id === day?.id;
            const stopsCount = d.stops.length;
            const isCompleted = stopsCount > 0 && d.stops.every((s) => s.isVisited);

            return (
              <button
                key={d.id}
                onClick={() => setSelectedDayId(d.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-medium whitespace-nowrap transition cursor-pointer active:scale-95 border shrink-0 ${
                  isSelected
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-bold border-amber-400 shadow-md shadow-amber-500/20'
                    : 'bg-stone-900/90 text-stone-300 hover:text-white hover:bg-stone-800 border-stone-800'
                }`}
              >
                <span>Día {d.dayNumber}: {d.destinationCity}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    isSelected
                      ? 'bg-stone-950/30 text-stone-950'
                      : isCompleted
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                      : 'bg-stone-800 text-stone-400'
                  }`}
                >
                  {isCompleted ? '✓' : stopsCount}
                </span>
              </button>
            );
          })}

          <button
            onClick={() => {
              const lastCity = day?.destinationCity || 'Hà Nội';
              addDay(lastCity);
              showToast(`✓ Día añadido a tu viaje`);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold text-stone-400 hover:text-amber-400 bg-stone-900/50 hover:bg-stone-900 border border-dashed border-stone-800 hover:border-amber-500/40 transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo día</span>
          </button>
        </div>
      </section>

      {/* Main Day Workspace: Split (Map + Stops List) */}
      {day && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Column: Interactive Map of the Day (5 cols on lg) */}
          <div className={`space-y-2 ${mapExpanded ? 'lg:col-span-12' : 'lg:col-span-5'}`}>
            <div className="bg-stone-900/90 border border-stone-800 rounded-3xl overflow-hidden shadow-xl">
              {/* Map Header with City changer, Engine selector & expand toggle */}
              <div className="px-3.5 py-2 bg-stone-950/80 border-b border-stone-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <button
                    onClick={() => setIsCitySelectorOpen(true)}
                    className="font-bold text-xs text-stone-100 hover:text-amber-300 flex items-center gap-1 truncate cursor-pointer transition"
                    title="Cambiar la ciudad o destino de este día"
                  >
                    <span>{day.destinationCity}</span>
                    <ChevronDown className="w-3 h-3 text-stone-400" />
                  </button>
                  <span className="text-[10px] text-stone-500 font-mono">
                    ({dayStopsWithPois.length})
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Map Engine Selector (Google vs OSM) placed cleanly in header - takes ZERO space from map! */}
                  <div className="bg-stone-900/90 rounded-lg p-0.5 border border-stone-800 flex items-center gap-0.5 select-none">
                    <button
                      type="button"
                      onClick={() => setMapEngine('google')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer leading-tight ${
                        mapEngine === 'google'
                          ? 'bg-amber-500 text-stone-950 shadow-xs'
                          : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                      }`}
                      title="Usar Google Maps (Modo Online)"
                    >
                      Google
                    </button>
                    <button
                      type="button"
                      onClick={() => setMapEngine('osm')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer leading-tight ${
                        mapEngine === 'osm'
                          ? 'bg-amber-500 text-stone-950 shadow-xs'
                          : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                      }`}
                      title="Usar OpenStreetMap / MapLibre"
                    >
                      OSM
                    </button>
                  </div>

                  <button
                    onClick={() => setMapExpanded(!mapExpanded)}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition cursor-pointer"
                    title={mapExpanded ? 'Vista dividida' : 'Ampliar mapa'}
                  >
                    {mapExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Map Canvas */}
              <div className="relative">
                <TripInteractiveMap
                  center={{ lat: currentCityConfig.lat, lng: currentCityConfig.lng }}
                  zoom={currentCityConfig.zoom || 13}
                  isOnline={isOnline}
                  mapEngine={mapEngine}
                  onMapEngineChange={setMapEngine}
                  dayNumber={day.dayNumber}
                  dayStops={dayStopsWithPois}
                  recommendedPois={cityRecommendedPois}
                  onOpenPoiDetail={(poi) => setSelectedPoiDetail(poi)}
                  onAddPoiToDay={(poi) => {
                    addPoiToDay(activePlan.id, day.id, poi.id);
                    showToast(`✓ "${poi.nameEs}" añadido al Día ${day.dayNumber}`);
                  }}
                  onRemoveStop={(stopId) => {
                    removeStopFromDay(activePlan.id, day.id, stopId);
                    showToast('Parada retirada del día');
                  }}
                  className={mapExpanded ? 'h-[460px] sm:h-[580px]' : 'h-[300px] sm:h-[380px]'}
                />
              </div>
            </div>

            {/* Quick City Highlights Card */}
            <div className="bg-stone-900/60 border border-stone-800/80 rounded-2xl p-3 text-xs text-stone-300 flex items-start gap-2.5">
              <span className="text-xl shrink-0">{currentCityConfig.icon}</span>
              <div className="min-w-0">
                <span className="font-bold text-stone-200 block text-xs">
                  {currentCityConfig.nameEs}
                </span>
                <p className="text-[11px] text-stone-400 line-clamp-2 mt-0.5 leading-relaxed">
                  {currentCityConfig.description}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => setIsAddPoiModalOpen(true)}
                    className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Ver imprescindibles de {day.destinationCity}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Stops of the Day List (7 cols on lg) */}
          <div className={`space-y-3 ${mapExpanded ? 'lg:col-span-12' : 'lg:col-span-7'}`}>
            {/* Day Header Card */}
            <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-400 uppercase font-mono">
                    Día {day.dayNumber} en {day.destinationCity}
                  </span>
                  {activePlan.days.length > 1 && (
                    <button
                      onClick={() => {
                        if (window.confirm(`¿Seguro que deseas eliminar el Día ${day.dayNumber}?`)) {
                          removeDay(day.id);
                          showToast('Día eliminado');
                        }
                      }}
                      className="text-stone-500 hover:text-rose-400 p-1 transition cursor-pointer"
                      title="Eliminar este día"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
                  {day.title}
                </h2>
              </div>

              {/* Day Quick Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {day.stops.length >= 2 && (
                  <button
                    onClick={handleOptimizeRoute}
                    className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer active:scale-95"
                    title="Ordenar paradas automáticamente para recorrerlas en el orden más corto"
                  >
                    <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Optimizar</span>
                  </button>
                )}

                {day.stops.length > 0 && (
                  <button
                    onClick={handleOpenGoogleMapsRoute}
                    className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer active:scale-95"
                    title="Abrir la ruta de hoy en Google Maps"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                    <span>En Maps</span>
                  </button>
                )}
              </div>
            </div>

            {/* Stops List */}
            {day.stops.length === 0 ? (
              /* Empty State for Day: Welcoming and simple */
              <div className="bg-stone-900/50 border border-dashed border-stone-800 rounded-3xl p-6 sm:p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-2xl">
                  {currentCityConfig.icon}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Aún no tienes paradas en {day.destinationCity}
                  </h3>
                  <p className="text-xs text-stone-400 max-w-sm mx-auto mt-1 leading-relaxed">
                    Crea tu día personalizado. Elige entre los monumentos y templos imprescindibles o añade tus propios planes (hotel, café, tren, etc.).
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                  <button
                    onClick={() => setIsAddPoiModalOpen(true)}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer active:scale-95 shadow-md shadow-amber-500/15"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Elegir imprescindibles de {day.destinationCity}</span>
                  </button>

                  <button
                    onClick={() => setIsCustomStopModalOpen(true)}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer active:scale-95"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-stone-400" />
                    <span>Añadir parada personalizada</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Populated Stops List */
              <div className="space-y-2.5">
                {dayStopsWithPois.map((item) => {
                  const { stop, index, poi, title, vietnameseTitle, ticketVnd } = item;
                  const isCopied = copiedGrabId === stop.id;

                  return (
                    <div
                      key={stop.id}
                      className={`bg-stone-900/90 border rounded-2xl p-3.5 transition-all shadow-md ${
                        stop.isVisited
                          ? 'border-stone-800/60 bg-stone-950/40 opacity-70'
                          : 'border-stone-800 hover:border-stone-700'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox & Order Index */}
                        <button
                          onClick={() => toggleStopVisited(activePlan.id, day.id, stop.id)}
                          className="mt-0.5 text-stone-400 hover:text-emerald-400 transition cursor-pointer shrink-0"
                          title={stop.isVisited ? 'Marcar como pendiente' : 'Marcar como visitado'}
                        >
                          {stop.isVisited ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <Circle className="w-5 h-5 text-stone-500 hover:text-amber-400" />
                          )}
                        </button>

                        {/* Order badge */}
                        <span className="w-5 h-5 rounded-full bg-stone-800 text-amber-300 font-mono text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {index}
                        </span>

                        {/* Title and details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <h4
                              className={`text-sm font-bold text-white truncate ${
                                stop.isVisited ? 'line-through text-stone-400' : ''
                              }`}
                            >
                              {title}
                            </h4>
                            {stop.timeSlot && (
                              <span className="text-[10px] text-amber-400/90 font-mono bg-amber-500/10 px-1.5 py-0.2 rounded-md">
                                {stop.timeSlot}
                              </span>
                            )}
                          </div>

                          {/* Vietnamese Name + Speaker button */}
                          {vietnameseTitle && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-xs text-stone-400 font-serif italic">
                                {vietnameseTitle}
                              </span>
                              <button
                                onClick={() => speakVietnamese(vietnameseTitle)}
                                className="text-stone-400 hover:text-amber-400 transition cursor-pointer p-0.5"
                                title="Escuchar pronunciación en vietnamita"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {/* Ticket Price & Notes */}
                          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-stone-400 flex-wrap">
                            {ticketVnd > 0 ? (
                              <span className="font-mono text-stone-300 flex items-center gap-1 font-semibold">
                                <Ticket className="w-3 h-3 text-amber-400" />
                                {ticketVnd.toLocaleString('es-ES')} ₫ ({formatVndToForeign(ticketVnd)})
                              </span>
                            ) : (
                              <span className="text-emerald-400 font-medium">Entrada libre</span>
                            )}

                            {stop.notes && (
                              <span className="text-stone-400 truncate max-w-xs">
                                • {stop.notes}
                              </span>
                            )}
                          </div>

                          {/* Quick action buttons on stop */}
                          <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-stone-800/60 flex-wrap">
                            {/* Copy Grab */}
                            <button
                              onClick={() => handleCopyGrabAddress(item)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition cursor-pointer active:scale-95 ${
                                isCopied
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                                  : 'bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700'
                              }`}
                              title="Copiar nombre y dirección en vietnamita para Grab / Taxi"
                            >
                              {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3 text-amber-400" />}
                              <span>{isCopied ? '¡Copiado!' : 'Copiar para Grab'}</span>
                            </button>

                            {/* View details */}
                            {poi && (
                              <button
                                onClick={() => setSelectedPoiDetail(poi)}
                                className="px-2 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 text-[10px] font-semibold flex items-center gap-1 transition cursor-pointer"
                              >
                                <Info className="w-3 h-3 text-blue-400" />
                                <span>Detalles & Consejos</span>
                              </button>
                            )}

                            {/* Audio guide */}
                            {poi && onStartFreeTour && (
                              <button
                                onClick={() => onStartFreeTour(poi)}
                                className="px-2 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 border border-stone-700 text-[10px] font-semibold flex items-center gap-1 transition cursor-pointer"
                                title="Escuchar audioguía completa con IA de este lugar"
                              >
                                <Sparkles className="w-3 h-3 text-amber-400" />
                                <span>Audioguía IA</span>
                              </button>
                            )}

                            {/* Delete */}
                            <button
                              onClick={() => removeStopFromDay(activePlan.id, day.id, stop.id)}
                              className="ml-auto text-stone-500 hover:text-rose-400 p-1 transition cursor-pointer"
                              title="Eliminar parada de este día"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Add More Stops Buttons Row */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => setIsAddPoiModalOpen(true)}
                    className="flex-1 py-2.5 px-3 rounded-2xl bg-stone-900 hover:bg-stone-800 border border-amber-500/30 hover:border-amber-400 text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir lugar recomendado</span>
                  </button>

                  <button
                    onClick={() => setIsCustomStopModalOpen(true)}
                    className="py-2.5 px-3 rounded-2xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-stone-400" />
                    <span>Parada propia</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= MODALS ================= */}

      {/* 1. Modal: Add Recommended POI to Day */}
      {isAddPoiModalOpen && day && (
        <div
          onClick={() => setIsAddPoiModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up"
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base">
                  Lugares imprescindibles de {day.destinationCity}
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Toca en «+ Añadir» para incluirlo en el Día {day.dayNumber}.
                </p>
              </div>
              <button
                onClick={() => setIsAddPoiModalOpen(false)}
                className="p-1.5 rounded-xl bg-stone-800 text-stone-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: List of POIs */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cityRecommendedPois.length === 0 ? (
                <div className="text-center py-8 text-stone-400 text-xs">
                  No hay lugares catalogados para esta ciudad específica. Puedes añadir cualquier parada propia.
                </div>
              ) : (
                cityRecommendedPois.map((poi) => {
                  const alreadyInDay = day.stops.some((s) => s.poiId === poi.id);

                  return (
                    <div
                      key={poi.id}
                      className="bg-stone-950/70 border border-stone-800 rounded-2xl p-3 flex items-center justify-between gap-3 hover:border-stone-700 transition"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white truncate">
                            {poi.nameEs}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-stone-800 text-amber-400 font-mono">
                            {poi.category}
                          </span>
                        </div>
                        <span className="text-xs text-stone-400 block font-serif italic">
                          {poi.nameVi}
                        </span>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-stone-400">
                          <span>
                            {poi.ticketVnd > 0
                              ? `${poi.ticketVnd.toLocaleString('es-ES')} ₫ (${formatVndToForeign(poi.ticketVnd)})`
                              : 'Gratis'}
                          </span>
                          <span>• Horario: {poi.openingHours}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {alreadyInDay ? (
                          <span className="px-3 py-1.5 rounded-xl bg-stone-800 text-stone-400 text-xs font-semibold">
                            ✓ Añadido
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              addPoiToDay(activePlan.id, day.id, poi.id);
                              showToast(`✓ "${poi.nameEs}" añadido al Día ${day.dayNumber}`);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1 transition cursor-pointer active:scale-95 shadow-sm"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Añadir</span>
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedPoiDetail(poi)}
                          className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition cursor-pointer"
                          title="Ver consejos y detalles"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal: Add Custom Stop to Day */}
      {isCustomStopModalOpen && day && (
        <div
          onClick={() => setIsCustomStopModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-md p-5 shadow-2xl animate-scale-up"
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <h3 className="font-bold text-white text-base">
                Añadir parada propia al Día {day.dayNumber}
              </h3>
              <button
                onClick={() => setIsCustomStopModalOpen(false)}
                className="p-1 rounded-xl text-stone-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomStop} className="space-y-3.5 mt-4">
              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1">
                  Nombre del lugar o plan:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Café Giang (Huevo), Hotel Metropole, Tren nocturno..."
                  value={customStopName}
                  onChange={(e) => setCustomStopName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-stone-300 block mb-1">
                    Horario / Bloque:
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Mañana 09:30 o Noche"
                    value={customStopTimeSlot}
                    onChange={(e) => setCustomStopTimeSlot(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-300 block mb-1">
                    Coste estimado (VND):
                  </label>
                  <input
                    type="number"
                    step="10000"
                    placeholder="0"
                    value={customStopCostVnd || ''}
                    onChange={(e) => setCustomStopCostVnd(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs font-mono text-white placeholder-stone-500 focus:outline-none focus:border-amber-400"
                  />
                  {customStopCostVnd > 0 && (
                    <span className="text-[10px] text-stone-400 font-mono mt-0.5 block">
                      ≈ {formatVndToForeign(customStopCostVnd)}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-300 block mb-1">
                  Notas personales (reserva, vestimenta, tips):
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: Código de vestimenta con hombros cubiertos, llegar antes de las 17:00..."
                  value={customStopNotes}
                  onChange={(e) => setCustomStopNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCustomStopModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-stone-400 hover:text-white transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition cursor-pointer active:scale-95 shadow-md shadow-amber-500/20"
                >
                  Guardar Parada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal: Change City Destination for Day */}
      {isCitySelectorOpen && day && (
        <div
          onClick={() => setIsCitySelectorOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl animate-scale-up overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base">
                  Destino para el Día {day.dayNumber}
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Elige la ciudad en la que transcurre esta jornada.
                </p>
              </div>
              <button
                onClick={() => setIsCitySelectorOpen(false)}
                className="p-1 rounded-xl text-stone-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {VIETNAM_CITIES_CATALOG.map((city) => {
                const isSelected = city.name.toLowerCase() === day.destinationCity.toLowerCase();
                return (
                  <button
                    key={city.id}
                    onClick={() => handleChangeDayCity(city)}
                    className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between gap-3 transition cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500 text-white font-bold'
                        : 'bg-stone-950/70 border-stone-800 hover:border-stone-700 text-stone-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{city.icon}</span>
                      <div>
                        <span className="font-bold text-xs block text-white">{city.nameEs}</span>
                        <span className="text-[10px] text-stone-400 block">{city.region}</span>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-amber-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal: POI Detail Card & Advice */}
      {selectedPoiDetail && (
        <div
          onClick={() => setSelectedPoiDetail(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl animate-scale-up overflow-hidden"
          >
            {/* Header with image/gradient */}
            <div className="relative p-5 bg-gradient-to-b from-stone-800 to-stone-900 border-b border-stone-800">
              <button
                onClick={() => setSelectedPoiDetail(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-stone-950/80 text-stone-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold uppercase tracking-wider font-mono">
                  {selectedPoiDetail.category}
                </span>
                <span className="text-xs text-stone-400">★ {selectedPoiDetail.rating}</span>
              </div>

              <h3 className="text-lg sm:text-xl font-black text-white font-serif">
                {selectedPoiDetail.nameEs}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-stone-400 font-serif italic">
                  {selectedPoiDetail.nameVi}
                </span>
                <button
                  onClick={() => speakVietnamese(selectedPoiDetail.nameVi)}
                  className="text-amber-400 hover:text-amber-300 transition cursor-pointer p-0.5"
                  title="Escuchar pronunciación"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3.5 text-xs text-stone-300">
              {/* Practical details grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-stone-950/80 p-3 rounded-2xl border border-stone-800/80">
                  <span className="text-[10px] text-stone-400 block font-semibold uppercase tracking-wider">
                    🎟️ Entrada
                  </span>
                  <span className="font-bold text-amber-300 text-sm font-mono mt-0.5 block">
                    {selectedPoiDetail.ticketVnd > 0
                      ? `${selectedPoiDetail.ticketVnd.toLocaleString('es-ES')} ₫`
                      : 'Gratis'}
                  </span>
                  {selectedPoiDetail.ticketVnd > 0 && (
                    <span className="text-[10px] text-stone-400 font-mono">
                      ≈ {formatVndToForeign(selectedPoiDetail.ticketVnd)}
                    </span>
                  )}
                </div>

                <div className="bg-stone-950/80 p-3 rounded-2xl border border-stone-800/80">
                  <span className="text-[10px] text-stone-400 block font-semibold uppercase tracking-wider">
                    ⏰ Horario
                  </span>
                  <span className="font-medium text-stone-200 text-xs mt-0.5 block">
                    {selectedPoiDetail.openingHours}
                  </span>
                </div>
              </div>

              {/* Tips & Recommendations */}
              <div className="bg-stone-950/60 p-3.5 rounded-2xl border border-stone-800/80 space-y-2">
                <div>
                  <span className="font-bold text-stone-200 block text-xs mb-1">
                    💡 Consejos para la visita:
                  </span>
                  <p className="text-stone-300 leading-relaxed text-xs">
                    {selectedPoiDetail.travelerTips}
                  </p>
                </div>

                {selectedPoiDetail.scamAlert && (
                  <div className="mt-2 p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-[11px] flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Alerta común:</span>
                      <span>{selectedPoiDetail.scamAlert}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* How to get there */}
              <div className="bg-stone-950/60 p-3 rounded-2xl border border-stone-800/80">
                <span className="font-bold text-stone-200 block text-xs mb-1">
                  🚕 Cómo llegar en taxi o Grab:
                </span>
                <p className="text-stone-300 text-xs">
                  {selectedPoiDetail.howToGet}
                </p>
              </div>
            </div>

            {/* Footer with action button */}
            <div className="p-4 border-t border-stone-800 bg-stone-950/80 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  const text = `${selectedPoiDetail.nameVi}, ${selectedPoiDetail.city}`;
                  if (navigator.clipboard) navigator.clipboard.writeText(text);
                  showToast(`🚕 Copiado para Grab: "${text}"`);
                }}
                className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-amber-400" />
                <span>Copiar para Grab</span>
              </button>

              {day && (
                <button
                  onClick={() => {
                    addPoiToDay(activePlan.id, day.id, selectedPoiDetail.id);
                    setSelectedPoiDetail(null);
                    showToast(`✓ "${selectedPoiDetail.nameEs}" añadido al Día ${day.dayNumber}`);
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-md shadow-amber-500/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Añadir al Día {day.dayNumber}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal: Trip Inspiration Templates (Optional) */}
      {isInspirationModalOpen && (
        <div
          onClick={() => setIsInspirationModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl animate-scale-up overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base">
                  Plantillas de ruta recomendadas
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Si deseas una estructura de referencia, puedes cargar una plantilla clásica.
                </p>
              </div>
              <button
                onClick={() => setIsInspirationModalOpen(false)}
                className="p-1 rounded-xl text-stone-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {DEFAULT_ITINERARIES.map((template) => (
                <div
                  key={template.id}
                  className="bg-stone-950/70 border border-stone-800 rounded-2xl p-4 space-y-2 hover:border-amber-500/40 transition"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white text-sm">
                      {template.title}
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono font-bold">
                      {template.days.length} días
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    {template.description}
                  </p>
                  <div className="text-[11px] text-stone-400 flex items-center gap-1.5 flex-wrap">
                    <span>Ciudades:</span>
                    {template.destinations.map((city, idx) => (
                      <span key={idx} className="bg-stone-800 px-1.5 py-0.2 rounded text-stone-300 text-[10px]">
                        {city}
                      </span>
                    ))}
                  </div>

                  <div className="pt-2 flex items-center justify-end">
                    <button
                      onClick={() => {
                        if (
                          window.confirm(
                            `¿Cargar "${template.title}"? Se añadirá como un nuevo plan a tu lista sin borrar tus planes anteriores.`
                          )
                        ) {
                          const newPlan = {
                            ...template,
                            id: `plan-template-${Date.now()}`,
                            title: `${template.title} (Copia)`,
                            createdAt: Date.now(),
                            updatedAt: Date.now(),
                          };
                          updatePlans([newPlan, ...plans]);
                          setActivePlanId(newPlan.id);
                          setIsInspirationModalOpen(false);
                          showToast(`✓ Plantilla "${template.title}" cargada.`);
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition cursor-pointer active:scale-95 shadow-sm"
                    >
                      Cargar esta plantilla
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal: Edit Trip Title */}
      {isEditTripTitleOpen && (
        <div
          onClick={() => setIsEditTripTitleOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-sm p-5 shadow-2xl animate-scale-up"
          >
            <h3 className="font-bold text-white text-base mb-3">
              Nombre de tu viaje
            </h3>
            <input
              type="text"
              value={newTripTitleInput}
              onChange={(e) => setNewTripTitleInput(e.target.value)}
              placeholder="Ej: Vietnam 2026 con Amigos"
              className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
            />
            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                onClick={() => setIsEditTripTitleOpen(false)}
                className="px-3 py-1.5 rounded-xl text-xs text-stone-400 hover:text-white transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (newTripTitleInput.trim()) {
                    updatePlanTitle(newTripTitleInput.trim());
                    setIsEditTripTitleOpen(false);
                    showToast('✓ Título actualizado');
                  }
                }}
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition cursor-pointer active:scale-95"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
