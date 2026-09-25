import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Download,
  Check,
  MapPin,
  Star,
  Clock,
  Ticket,
  AlertTriangle,
  Navigation,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  FileText,
  Share2,
  Compass,
  Eye,
  Filter,
  CalendarPlus,
  X,
  Sparkles,
  Layers,
  Crosshair,
  Locate,
  Map as MapIcon,
  Route,
  Globe,
  Plus,
  Calendar,
  CheckCircle2,
  ArrowRight,
  ListFilter,
  Volume2,
  Info,
  Radio,
} from 'lucide-react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  useMap,
} from '@vis.gl/react-google-maps';
import { PointOfInterest, RegionMapPack, ExchangeRatesData } from '../types';
import { REGION_PACKS, POINTS_OF_INTEREST } from '../data/pois';
import {
  getDownloadedPackIds,
  saveDownloadedPackIds,
  getFavoritePoiIds,
  saveFavoritePoiIds,
  speakVietnamese,
} from '../utils/storage';
import {
  getSmartGeolocation,
  watchSmartGeolocation,
  createSimulatedResult,
  VIETNAM_SIMULATION_PRESETS,
  SmartGeoResult,
  SmartGeoError,
} from '../utils/geolocation';
import { ItineraryState } from '../utils/useItineraryState';
import { MapItineraryPanel } from './MapItineraryPanel';
import { InteractiveOpenStreetMap } from './InteractiveOpenStreetMap';

const GOOGLE_MAPS_API_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_MAPS_API_KEY) || '';

// Camera controller component to smoothly pan/zoom map on region/poi change
const MapCameraController: React.FC<{
  regionCenter: { lat: number; lng: number };
  regionZoom: number;
  selectedLocation: { lat: number; lng: number } | null;
}> = ({ regionCenter, regionZoom, selectedLocation }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    map.panTo(regionCenter);
    map.setZoom(regionZoom);
  }, [map, regionCenter.lat, regionCenter.lng, regionZoom]);

  useEffect(() => {
    if (!map || !selectedLocation) return;
    map.panTo(selectedLocation);
  }, [map, selectedLocation?.lat, selectedLocation?.lng]);

  return null;
};

interface DownloadableMapsProps {
  ratesData: ExchangeRatesData;
  isOnline: boolean;
  onNavigateToItinerary?: () => void;
  onStartFreeTour?: (poi: PointOfInterest) => void;
  itineraryState: ItineraryState;
  initialRegionId?: string;
}

export const DownloadableMaps: React.FC<DownloadableMapsProps> = ({
  ratesData,
  isOnline,
  onNavigateToItinerary,
  onStartFreeTour,
  itineraryState,
  initialRegionId,
}) => {
  const [downloadedPacks, setDownloadedPacks] = useState<string[]>(getDownloadedPackIds);
  const [favoritePois, setFavoritePois] = useState<string[]>(getFavoritePoiIds);
  const [selectedRegionId, setSelectedRegionId] = useState<string>(
    initialRegionId || 'reg-hanoi-north'
  );
  const [selectedPoi, setSelectedPoi] = useState<PointOfInterest | null>(POINTS_OF_INTEREST[0]);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('todas');
  const [mapPinsFilter, setMapPinsFilter] = useState<'all' | 'itinerary' | 'day'>('all');
  const [isDownloadingPack, setIsDownloadingPack] = useState<string | null>(null);

  // Layout view mode: unified split view vs pure map view
  const [unifiedViewMode, setUnifiedViewMode] = useState<'split' | 'map-only'>('split');

  // Quick add state
  const [targetQuickDayId, setTargetQuickDayId] = useState<string>('');
  const [targetTimeSlot, setTargetTimeSlot] = useState<string>('Mañana 09:30');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Map engine state (Google Maps Platform vs Leaflet OpenStreetMap)
  const [mapDisplayMode, setMapDisplayMode] = useState<'google' | 'osm'>(() => {
    return GOOGLE_MAPS_API_KEY ? 'google' : 'osm';
  });
  const [showPoiCard, setShowPoiCard] = useState<boolean>(false);
  const [selectedLocationTarget, setSelectedLocationTarget] = useState<{ lat: number; lng: number } | null>(null);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
    accuracy?: number;
    provider?: string;
  } | null>(null);
  const [userLocationLabel, setUserLocationLabel] = useState<string>('Tu ubicación actual');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isLiveTracking, setIsLiveTracking] = useState<boolean>(false);
  const stopLiveWatchRef = useRef<(() => void) | null>(null);

  const [locationToast, setLocationToast] = useState<string | null>(null);
  const [gpsDiagnostic, setGpsDiagnostic] = useState<{
    type: 'success_vietnam' | 'success_abroad' | 'error';
    title: string;
    description: string;
    isIframeBlocked?: boolean;
    details?: string;
    exactCoords?: { lat: number; lng: number; accuracy?: number };
  } | null>(null);
  const [showGpsHelper, setShowGpsHelper] = useState<boolean>(false);

  const { activePlan, currentDay, selectedDayId, addPoiToDay, removeStopFromDay, getPoiInclusionStatus } = itineraryState;

  // Cleanup live tracking on unmount
  useEffect(() => {
    return () => {
      if (stopLiveWatchRef.current) {
        stopLiveWatchRef.current();
        stopLiveWatchRef.current = null;
      }
    };
  }, []);

  // Sync region if prop changes
  useEffect(() => {
    if (initialRegionId) {
      setSelectedRegionId(initialRegionId);
    }
  }, [initialRegionId]);

  // Keep targetQuickDayId in sync with itineraryState.selectedDayId
  useEffect(() => {
    if (selectedDayId) {
      setTargetQuickDayId(selectedDayId);
    } else if (activePlan && activePlan.days.length > 0) {
      setTargetQuickDayId(activePlan.days[0].id);
    }
  }, [selectedDayId, activePlan]);

  const toggleLiveTracking = () => {
    if (isLiveTracking) {
      if (stopLiveWatchRef.current) {
        stopLiveWatchRef.current();
        stopLiveWatchRef.current = null;
      }
      setIsLiveTracking(false);
      setLocationToast('Seguimiento GPS en vivo pausado');
      setTimeout(() => setLocationToast(null), 3000);
    } else {
      setIsLiveTracking(true);
      setLocationToast('🔴 Modo en marcha activado: el GPS actualiza tu posición continuamente');
      stopLiveWatchRef.current = watchSmartGeolocation(
        (result) => {
          const { coords, isInsideVietnam, closestPoi, distanceToClosestPoiKm, recommendedRegionId } = result;
          const accuracyStr = coords.accuracy ? `±${Math.round(coords.accuracy)}m` : '±8m';
          const loc = {
            lat: coords.latitude,
            lng: coords.longitude,
            accuracy: coords.accuracy,
            provider: 'gps_high_accuracy',
          };
          setUserLocation(loc);
          if (isInsideVietnam) {
            setUserLocationLabel(`GPS en vivo (${accuracyStr})`);
            setSelectedRegionId(recommendedRegionId);
            setSelectedLocationTarget(loc);
          } else {
            setUserLocationLabel(`GPS (${coords.latitude.toFixed(4)}°, ${coords.longitude.toFixed(4)}°)`);
          }
        },
        (err) => {
          setIsLiveTracking(false);
          setLocationToast(`Aviso GPS: ${err.message}`);
        }
      );
    }
  };

  const handleLocateMe = async () => {
    setIsLocating(true);
    setLocationToast('🛰️ Fijando satélites GPS con antena de alta precisión...');
    setGpsDiagnostic(null);

    const result = await getSmartGeolocation();
    setIsLocating(false);

    if (result.success) {
      const { coords, isInsideVietnam, distanceToVietnamKm, closestPoi, distanceToClosestPoiKm, recommendedRegionId, provider } = result.data;
      const accuracyStr = coords.accuracy ? `±${Math.round(coords.accuracy)}m` : 'alta precisión';
      const loc = {
        lat: coords.latitude,
        lng: coords.longitude,
        accuracy: coords.accuracy,
        provider,
      };
      setUserLocation(loc);

      if (isInsideVietnam) {
        setUserLocationLabel(`Tu GPS en Vietnam (${accuracyStr})`);
        setSelectedRegionId(recommendedRegionId);
        setSelectedLocationTarget(loc);
        setLocationToast(`🎯 Posición exacta fijada (${accuracyStr}) • Cerca de ${closestPoi.nameEs} (${distanceToClosestPoiKm} km)`);
        setGpsDiagnostic({
          type: 'success_vietnam',
          title: `¡Señal GPS fijada con precisión ${accuracyStr}!`,
          description: `Estás en la región de ${closestPoi.city} (${coords.latitude.toFixed(5)}° N, ${coords.longitude.toFixed(5)}° E), a ~${distanceToClosestPoiKm < 1 ? Math.round(distanceToClosestPoiKm * 1000) + ' m' : distanceToClosestPoiKm + ' km'} de ${closestPoi.nameEs}.`,
          exactCoords: { lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy },
        });
        setTimeout(() => setLocationToast(null), 5000);
      } else {
        // Traveler is testing from abroad (Spain, Latin America, Europe, etc.)
        setUserLocationLabel(`Tu GPS real: ${coords.latitude.toFixed(4)}°, ${coords.longitude.toFixed(4)}° (${accuracyStr})`);
        // Center directly on their EXACT detected coordinates
        setSelectedLocationTarget(loc);
        setLocationToast(`🎯 Ubicación exacta detectada: ${coords.latitude.toFixed(4)}°, ${coords.longitude.toFixed(4)}° (${accuracyStr})`);
        setGpsDiagnostic({
          type: 'success_abroad',
          title: `🎯 Ubicación exacta detectada (${accuracyStr})`,
          description: `Tus satélites te sitúan en tus coordenadas exactas: ${coords.latitude.toFixed(5)}° N, ${coords.longitude.toFixed(5)}° E con precisión de ${accuracyStr} (${provider === 'gps_high_accuracy' ? 'Antena GPS directa' : 'Red/WiFi'}). Estás a ~${distanceToVietnamKm.toLocaleString()} km de Vietnam.`,
          details: 'El mapa se ha centrado en tu posición exacta con radio de precisión azul. Si deseas explorar los monumentos de Vietnam o planificar tus visitas, usa los accesos directos abajo.',
          exactCoords: { lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy },
        });
        setTimeout(() => setLocationToast(null), 3000);
      }
    } else {
      setLocationToast('Señal GPS no disponible temporalmente.');
      setTimeout(() => setLocationToast(null), 2500);
    }
  };

  const handleSimulateLocation = (presetId: string) => {
    const sim = createSimulatedResult(presetId);
    const loc = { lat: sim.coords.latitude, lng: sim.coords.longitude, accuracy: sim.coords.accuracy, provider: 'simulated' };
    setUserLocation(loc);
    setUserLocationLabel(`📍 Posición en Vietnam: ${sim.simulatedName}`);
    setSelectedRegionId(sim.recommendedRegionId);
    setSelectedLocationTarget(loc);
    setShowGpsHelper(false);
    setGpsDiagnostic({
      type: 'success_vietnam',
      title: `Ubicación situada en: ${sim.simulatedName}`,
      description: `Marcador situado en ${sim.closestPoi.city}. Todos los cálculos de distancia y monumentos se muestran desde este punto.`,
      exactCoords: { lat: sim.coords.latitude, lng: sim.coords.longitude, accuracy: 15 },
    });
    setLocationToast(`📍 Situado en ${sim.simulatedName}`);
    setTimeout(() => setLocationToast(null), 3500);
  };

  const handleRecenterRegion = () => {
    setSelectedLocationTarget(null);
  };

  const usdVndRate = ratesData.rates['VND'] || 26000;
  const eurRate = ratesData.rates['EUR'] || 0.8965;
  const eurToVnd = usdVndRate / eurRate;

  const currentRegion = useMemo(() => {
    return REGION_PACKS.find((r) => r.id === selectedRegionId) || REGION_PACKS[0];
  }, [selectedRegionId]);

  // Points in this region filtered by category and mapPinsFilter
  const regionPois = useMemo(() => {
    return POINTS_OF_INTEREST.filter((poi) => {
      const inRegion = poi.regionId === selectedRegionId;
      const matchesCategory =
        activeCategoryFilter === 'todas' || poi.category === activeCategoryFilter;

      if (!inRegion || !matchesCategory) return false;

      if (mapPinsFilter === 'itinerary') {
        const status = getPoiInclusionStatus(poi.id);
        return status.inPlan;
      }

      if (mapPinsFilter === 'day') {
        const status = getPoiInclusionStatus(poi.id);
        return status.occurrences.some((o) => o.dayId === selectedDayId);
      }

      return true;
    });
  }, [selectedRegionId, activeCategoryFilter, mapPinsFilter, getPoiInclusionStatus, selectedDayId]);

  const isCurrentPackDownloaded = downloadedPacks.includes(selectedRegionId);

  const handleToggleDownloadPack = (packId: string) => {
    setIsDownloadingPack(packId);
    setTimeout(() => {
      let updated: string[];
      if (downloadedPacks.includes(packId)) {
        updated = downloadedPacks.filter((id) => id !== packId);
      } else {
        updated = [...downloadedPacks, packId];
      }
      setDownloadedPacks(updated);
      saveDownloadedPackIds(updated);
      setIsDownloadingPack(null);
    }, 600);
  };

  const handleToggleFavorite = (poiId: string) => {
    let updated: string[];
    if (favoritePois.includes(poiId)) {
      updated = favoritePois.filter((id) => id !== poiId);
    } else {
      updated = [...favoritePois, poiId];
    }
    setFavoritePois(updated);
    saveFavoritePoiIds(updated);
  };

  // Direct 1-click add from Pin or InfoWindow
  const handleQuickAddPoiToItinerary = (poi: PointOfInterest, targetDay?: string) => {
    if (!activePlan) return;
    const dayId = targetDay || targetQuickDayId || currentDay?.id || activePlan.days[0]?.id;
    if (!dayId) return;

    const res = addPoiToDay(
      activePlan.id,
      dayId,
      poi.id,
      targetTimeSlot || 'Mañana 09:30',
      poi.travelerTips
    );

    if (res.success) {
      const targetDayObj = activePlan.days.find((d) => d.id === dayId);
      const dayName = targetDayObj
        ? `Día ${targetDayObj.dayNumber} (${targetDayObj.destinationCity})`
        : 'tu itinerario';
      setToastMessage(`¡"${poi.nameEs}" añadido al ${dayName}!`);
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  // Direct 1-click remove from Pin or InfoWindow
  const handleQuickRemovePoiFromItinerary = (poiId: string, dayId?: string) => {
    if (!activePlan) return;
    const status = getPoiInclusionStatus(poiId);
    if (!status.inPlan || status.occurrences.length === 0) return;

    const occ = dayId
      ? status.occurrences.find((o) => o.dayId === dayId) || status.occurrences[0]
      : status.occurrences[0];

    const removed = removeStopFromDay(activePlan.id, occ.dayId, occ.stopId);
    if (removed) {
      setToastMessage(`Eliminado del Día ${occ.dayNumber} (${occ.dayCity})`);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Generate offline downloadable text guide
  const handleDownloadOfflineGuide = (region: RegionMapPack) => {
    const poisInRegion = POINTS_OF_INTEREST.filter((p) => p.regionId === region.id);
    let content = `====================================================\n`;
    content += `GUÍA DE VIAJE OFFLINE: ${region.name.toUpperCase()}\n`;
    content += `${region.vietnameseName} - Vietnam Travel Companion\n`;
    content += `====================================================\n\n`;
    content += `DESCRIPCIÓN: ${region.description}\n\n`;
    content += `PUNTOS DE INTERÉS CLAVE & COORDENADAS:\n`;
    content += `----------------------------------------------------\n`;

    poisInRegion.forEach((poi, index) => {
      content += `${index + 1}. ${poi.nameEs} (${poi.nameVi})\n`;
      content += `   • Ciudad: ${poi.city} | Categoría: ${poi.category}\n`;
      content += `   • Coordenadas GPS: ${poi.lat}, ${poi.lng}\n`;
      content += `   • Entrada: ${
        poi.ticketVnd > 0
          ? `${poi.ticketVnd.toLocaleString('es-ES')} ₫ (≈ ${(poi.ticketVnd / eurToVnd).toFixed(2)} €)`
          : 'Gratis'
      }\n`;
      content += `   • Horario: ${poi.openingHours}\n`;
      content += `   • Mejor momento: ${poi.bestTime}\n`;
      content += `   • Consejos: ${poi.travelerTips}\n`;
      if (poi.scamAlert) {
        content += `   • ⚠️ ALERTA ESTAFA: ${poi.scamAlert}\n`;
      }
      content += `   • Cómo llegar: ${poi.howToGet}\n\n`;
    });

    content += `\nEMERGENCIAS EN VIETNAM:\n`;
    content += `• Policía: 113\n• Ambulancia / Médico: 115\n• Bomberos: 114\n`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Guia_Offline_${region.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Selected POI inclusion state
  const selectedPoiInclusion = selectedPoi ? getPoiInclusionStatus(selectedPoi.id) : null;

  // Render modern docked Floating POI Card on top of Map (replaces cramped in-canvas InfoWindow)
  const renderFloatingPoiCard = () => {
    if (!showPoiCard || !selectedPoi) return null;

    const poiStatus = getPoiInclusionStatus(selectedPoi.id);

    return (
      <div className="absolute bottom-2 left-2 right-2 sm:bottom-3 sm:left-3 sm:right-auto sm:max-w-md bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-stone-200/90 p-3.5 sm:p-4 z-20 animate-fade-in transition-all">
        {/* Header: Category Badge + Price + Close Button */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-950 border border-amber-200">
              {selectedPoi.city} • {selectedPoi.category}
            </span>
            <span className="text-xs font-bold text-emerald-700">
              {selectedPoi.ticketVnd > 0
                ? `${(selectedPoi.ticketVnd / 1000).toLocaleString('es-ES')}k ₫`
                : 'Entrada gratis'}
            </span>
          </div>
          <button
            onClick={() => setShowPoiCard(false)}
            className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer shrink-0"
            title="Cerrar panel de lugar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Title & Vietnamese Pronunciation */}
        <div className="mb-2">
          <h4 className="font-bold text-sm sm:text-base text-stone-900 leading-snug">
            {selectedPoi.nameEs}
          </h4>
          <div className="flex items-center gap-2 text-xs text-amber-900 font-medium mt-0.5">
            <span>🇻🇳 {selectedPoi.nameVi}</span>
            <button
              onClick={() => speakVietnamese(selectedPoi.nameVi)}
              className="p-0.5 px-1.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-800 transition cursor-pointer flex items-center gap-1 text-[11px]"
              title="Escuchar pronunciación para el conductor"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Pronunciar</span>
            </button>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed mb-3">
          {selectedPoi.description}
        </p>

        {/* Itinerary Status & Quick Add */}
        <div className="mb-3">
          {poiStatus.inPlan ? (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-900 flex items-center gap-1.5 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    En tu itinerario: Día {poiStatus.occurrences[0].dayNumber} ({poiStatus.occurrences[0].dayCity})
                  </span>
                </span>
                <button
                  onClick={() => handleQuickRemovePoiFromItinerary(selectedPoi.id)}
                  className="text-[11px] text-rose-700 hover:text-rose-900 font-semibold underline cursor-pointer ml-2"
                >
                  Quitar
                </button>
              </div>
              {activePlan && activePlan.days.length > 1 && (
                <div className="flex items-center gap-1.5 pt-1.5 border-t border-emerald-200/70 text-[11px]">
                  <span className="text-emerald-900 font-medium shrink-0">Sumar a otro día:</span>
                  <select
                    value={targetQuickDayId}
                    onChange={(e) => {
                      setTargetQuickDayId(e.target.value);
                      handleQuickAddPoiToItinerary(selectedPoi, e.target.value);
                    }}
                    className="bg-white border border-emerald-300 rounded-lg px-2 py-0.5 text-emerald-950 font-medium text-xs focus:outline-none cursor-pointer flex-1"
                  >
                    {activePlan.days.map((d) => (
                      <option key={d.id} value={d.id}>
                        Día {d.dayNumber}: {d.destinationCity}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <button
                onClick={() => handleQuickAddPoiToItinerary(selectedPoi, targetQuickDayId)}
                className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer active:scale-98"
              >
                <Plus className="w-4 h-4" />
                <span>
                  Añadir a Día {currentDay?.dayNumber || 1} ({currentDay?.destinationCity || 'Itinerario'})
                </span>
              </button>

              {activePlan && activePlan.days.length > 1 && (
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-stone-500 shrink-0">O en:</span>
                  <select
                    value={targetQuickDayId}
                    onChange={(e) => {
                      setTargetQuickDayId(e.target.value);
                      handleQuickAddPoiToItinerary(selectedPoi, e.target.value);
                    }}
                    className="text-xs bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-lg px-2 py-1.5 text-stone-800 focus:outline-none cursor-pointer font-medium"
                  >
                    {activePlan.days.map((d) => (
                      <option key={d.id} value={d.id}>
                        Día {d.dayNumber}: {d.destinationCity}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action buttons row */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-stone-100 flex-wrap">
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPoi.lat},${selectedPoi.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs flex items-center gap-1 transition"
          >
            <Navigation className="w-3.5 h-3.5 text-sky-600" />
            <span>Cómo llegar</span>
            <ExternalLink className="w-3 h-3 text-stone-400" />
          </a>

          <button
            onClick={() => {
              document.getElementById('poi-detail-inspector')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium text-xs flex items-center gap-1 transition cursor-pointer"
          >
            <Info className="w-3.5 h-3.5 text-stone-500" />
            <span>Ver consejos & estafas</span>
          </button>

          {onStartFreeTour && (
            <button
              onClick={() => {
                setShowPoiCard(false);
                onStartFreeTour(selectedPoi);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer border border-amber-500/30 ml-auto"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Free Tour con IA</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Region Selector & Offline Pack Status */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-stone-900 flex items-center gap-2">
              <Compass className="w-5 h-5 text-amber-600" />
              <span>Mapas & Lugares de Vietnam</span>
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Toca cualquier pin del mapa para ver detalles y añadir a tu itinerario.
            </p>
          </div>

          {/* Download & View Controls */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <button
              onClick={() =>
                setUnifiedViewMode(unifiedViewMode === 'split' ? 'map-only' : 'split')
              }
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border min-h-[40px] ${
                unifiedViewMode === 'split'
                  ? 'bg-amber-50 text-amber-950 border-amber-300 shadow-2xs'
                  : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
              }`}
              title="Alternar panel de itinerario en mapa"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
              <span>
                {unifiedViewMode === 'split' ? 'Ocultar Itinerario' : 'Ver Itinerario'}
              </span>
            </button>

            <button
              onClick={() => handleToggleDownloadPack(selectedRegionId)}
              disabled={isDownloadingPack !== null}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs min-h-[40px] ${
                isCurrentPackDownloaded
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 hover:bg-emerald-100'
                  : 'bg-amber-500 hover:bg-amber-600 text-stone-950'
              }`}
            >
              {isDownloadingPack === selectedRegionId ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : isCurrentPackDownloaded ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Guardado ({currentRegion.sizeMb})</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar ({currentRegion.sizeMb})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Region Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {REGION_PACKS.map((pack) => {
            const isSelected = selectedRegionId === pack.id;
            const isDownloaded = downloadedPacks.includes(pack.id);
            return (
              <button
                key={pack.id}
                onClick={() => {
                  setSelectedRegionId(pack.id);
                  setSelectedLocationTarget(null);
                  const firstPoi = POINTS_OF_INTEREST.find((p) => p.regionId === pack.id);
                  if (firstPoi) setSelectedPoi(firstPoi);
                }}
                className={`px-3 py-2 rounded-xl border text-left transition cursor-pointer shrink-0 min-h-[42px] flex items-center gap-2 ${
                  isSelected
                    ? 'border-amber-500 bg-amber-500 text-stone-950 font-bold shadow-xs'
                    : 'border-stone-200 bg-stone-50 hover:bg-white text-stone-700'
                }`}
              >
                <span>{pack.name}</span>
                {isDownloaded && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-stone-950' : 'bg-emerald-500'}`}
                    title="Guardado offline"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Unified Itinerary Panel (Docked Above/Alongside Map) */}
      {unifiedViewMode === 'split' && (
        <MapItineraryPanel
          itineraryState={itineraryState}
          eurToVnd={eurToVnd}
          onLocatePoi={(poi) => {
            setSelectedPoi(poi);
            setSelectedLocationTarget({ lat: poi.lat, lng: poi.lng });
            setShowPoiCard(true);
            if (poi.regionId !== selectedRegionId) {
              setSelectedRegionId(poi.regionId);
            }
          }}
          onNavigateToItinerary={onNavigateToItinerary}
          onQuickAddPoi={(poi) => handleQuickAddPoiToItinerary(poi)}
          availableRegionPois={regionPois}
        />
      )}

      {/* Main Map Viewer & POIs Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT / TOP: Interactive Map Canvas & Highlights */}
        <div className="lg:col-span-7 space-y-3">
          {/* Interactive Map Container */}
          <div className="bg-stone-900 text-stone-100 rounded-2xl p-3 sm:p-4 border border-stone-800 shadow-md relative overflow-hidden space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                  {currentRegion.name}
                </h3>
                <span className="text-[11px] text-stone-400">
                  {currentRegion.vietnameseName}
                </span>
              </div>

              {/* Map Engine Toggle & GPS Action */}
              <div className="flex items-center gap-1.5">
                <div className="inline-flex p-0.5 bg-stone-950 rounded-xl border border-stone-800">
                  <button
                    onClick={() => setMapDisplayMode('google')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                      mapDisplayMode === 'google'
                        ? 'bg-amber-500 text-stone-950 font-bold'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    <MapIcon className="w-3.5 h-3.5" />
                    <span>Google</span>
                  </button>
                  <button
                    onClick={() => setMapDisplayMode('osm')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                      mapDisplayMode === 'osm'
                        ? 'bg-amber-500 text-stone-950 font-bold'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Vector</span>
                  </button>
                </div>

                <button
                  onClick={handleLocateMe}
                  disabled={isLocating}
                  className="p-1.5 bg-stone-800 hover:bg-stone-700 text-sky-400 rounded-xl border border-stone-700 transition cursor-pointer disabled:opacity-50"
                  title="Mi ubicación GPS"
                >
                  <Locate className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Subtle temporary toast if user taps GPS */}
            {locationToast && (
              <div className="bg-stone-800/90 border border-stone-700 text-stone-200 px-3 py-1 rounded-lg text-xs flex items-center justify-between gap-2 animate-fade-in">
                <span>{locationToast}</span>
                <button
                  onClick={() => setLocationToast(null)}
                  className="text-stone-400 hover:text-white text-xs cursor-pointer font-bold"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Map Canvas: Google Maps OR Vector Map */}
            {mapDisplayMode === 'google' ? (
              <div className="relative w-full h-[320px] sm:h-[450px] rounded-xl overflow-hidden border border-stone-800 bg-stone-950 shadow-inner">
                <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['marker']}>
                  <Map
                    mapId="DEMO_MAP_ID"
                    internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
                    defaultCenter={{ lat: currentRegion.centerLat, lng: currentRegion.centerLng }}
                    defaultZoom={currentRegion.zoom}
                    gestureHandling="greedy"
                    disableDefaultUI={false}
                    mapTypeControl={true}
                    streetViewControl={true}
                    fullscreenControl={true}
                    zoomControl={true}
                    style={{ width: '100%', height: '100%' }}
                  >
                    <MapCameraController
                      regionCenter={{ lat: currentRegion.centerLat, lng: currentRegion.centerLng }}
                      regionZoom={currentRegion.zoom}
                      selectedLocation={selectedLocationTarget}
                    />

                    {/* Markers for Points of Interest in current region */}
                    {regionPois.map((poi, idx) => {
                      const isSelected = selectedPoi?.id === poi.id;
                      const inclusion = getPoiInclusionStatus(poi.id);
                      const inCurrentDay = inclusion.occurrences.some(
                        (o) => o.dayId === selectedDayId
                      );

                      // Determine pin background and badge based on itinerary inclusion
                      let pinBg = '#ef4444'; // default red
                      let glyphText = `${idx + 1}`;

                      if (inCurrentDay) {
                        pinBg = '#059669'; // Emerald: in current selected day
                        glyphText = `✓`;
                      } else if (inclusion.inPlan) {
                        pinBg = '#d97706'; // Amber: in itinerary (other day)
                        glyphText = `D${inclusion.occurrences[0].dayNumber}`;
                      }

                      return (
                        <AdvancedMarker
                          key={poi.id}
                          position={{ lat: poi.lat, lng: poi.lng }}
                          title={`${poi.nameEs} ${
                            inclusion.inPlan ? `(En Itinerario Día ${inclusion.occurrences[0].dayNumber})` : ''
                          }`}
                          onClick={() => {
                            setSelectedPoi(poi);
                            setSelectedLocationTarget({ lat: poi.lat, lng: poi.lng });
                            setShowPoiCard(true);
                          }}
                        >
                          <Pin
                            background={isSelected ? '#f59e0b' : pinBg}
                            borderColor="#ffffff"
                            glyphColor="#ffffff"
                            scale={isSelected ? 1.35 : inclusion.inPlan ? 1.15 : 1.0}
                          >
                            <span className="text-[10px] font-black text-white font-mono">
                              {glyphText}
                            </span>
                          </Pin>
                        </AdvancedMarker>
                      );
                    })}

                    {/* User Location Marker */}
                    {userLocation && (
                      <AdvancedMarker position={userLocation} title={userLocationLabel}>
                        <div className="relative flex items-center justify-center">
                          <div className="w-5 h-5 bg-sky-500 rounded-full border-2 border-white shadow-xl z-10 flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                          <div className="absolute -inset-3 bg-sky-400/40 rounded-full animate-ping" />
                          <div className="absolute -inset-2 bg-sky-500/30 rounded-full animate-pulse" />
                        </div>
                      </AdvancedMarker>
                    )}
                  </Map>
                </APIProvider>

                {/* Floating Docked POI Card */}
                {renderFloatingPoiCard()}

                {/* Floating map helper overlay (hidden when POI card is open to prevent overlap) */}
                {!showPoiCard && (
                  <div className="absolute bottom-2 left-2 bg-stone-900/90 backdrop-blur-xs px-2.5 py-1 rounded-md text-[10px] text-stone-300 border border-stone-800 shadow-sm pointer-events-none z-10 flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>
                      Verde: En día activo • Ámbar: En itinerario • Rojo: Por explorar
                    </span>
                  </div>
                )}
              </div>
            ) : (
              /* High Performance Leaflet OpenStreetMap Engine */
              <div className="relative w-full h-[460px] rounded-xl overflow-hidden border border-stone-800 bg-stone-950 shadow-inner">
                <InteractiveOpenStreetMap
                  center={{ lat: currentRegion.centerLat, lng: currentRegion.centerLng }}
                  zoom={currentRegion.zoom}
                  pois={regionPois}
                  selectedPoiId={selectedPoi?.id}
                  onSelectPoi={(poi) => {
                    setSelectedPoi(poi);
                    setSelectedLocationTarget({ lat: poi.lat, lng: poi.lng });
                    setShowPoiCard(true);
                  }}
                  userLocation={userLocation}
                  userLocationLabel={userLocationLabel}
                  selectedLocationTarget={selectedLocationTarget}
                  poiInclusionLookup={getPoiInclusionStatus}
                  selectedDayId={selectedDayId}
                  className="h-[460px]"
                />

                {/* Floating Docked POI Card for OpenStreetMap */}
                {renderFloatingPoiCard()}
              </div>
            )}

            {/* Clean Single-Row Filter Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2 border-t border-stone-800 text-xs">
              <button
                onClick={() => setMapPinsFilter(mapPinsFilter === 'itinerary' ? 'all' : 'itinerary')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  mapPinsFilter === 'itinerary'
                    ? 'bg-amber-500 text-stone-950 font-bold shadow-xs'
                    : 'bg-stone-800 text-stone-300 hover:text-white'
                }`}
              >
                <span>★ Mi Itinerario</span>
              </button>

              <div className="h-4 w-px bg-stone-700 shrink-0 mx-0.5" />

              {[
                { id: 'todas', label: 'Todo' },
                { id: 'Monumento', label: 'Monumentos' },
                { id: 'Cultura', label: 'Cultura' },
                { id: 'Naturaleza', label: 'Naturaleza' },
                { id: 'Mercado', label: 'Mercados' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategoryFilter(cat.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap transition cursor-pointer shrink-0 font-medium ${
                    activeCategoryFilter === cat.id
                      ? 'bg-white text-stone-950 font-bold'
                      : 'bg-stone-800/80 text-stone-400 hover:text-white hover:bg-stone-800'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* List of Region Points with Quick Cards */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center justify-between">
              <span>Lugares en {currentRegion.name} ({regionPois.length}):</span>
              <span className="text-stone-400 font-normal">Toca para centrar en mapa</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {regionPois.map((poi, idx) => {
                const isSelected = selectedPoi?.id === poi.id;
                const isFav = favoritePois.includes(poi.id);
                const status = getPoiInclusionStatus(poi.id);
                const inCurrentDay = status.occurrences.some(
                  (o) => o.dayId === selectedDayId
                );

                return (
                  <div
                    key={poi.id}
                    onClick={() => {
                      setSelectedPoi(poi);
                      setSelectedLocationTarget({ lat: poi.lat, lng: poi.lng });
                      setShowPoiCard(true);
                    }}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/70 ring-1 ring-amber-500 shadow-2xs'
                        : 'border-stone-200 bg-white hover:border-amber-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-100 text-stone-700">
                          #{idx + 1} {poi.category}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {status.inPlan && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                                inCurrentDay
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              <Check className="w-3 h-3" />
                              <span>Día {status.occurrences[0].dayNumber}</span>
                            </span>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFavorite(poi.id);
                            }}
                            className="text-stone-400 hover:text-amber-500 transition cursor-pointer"
                            title="Guardar en favoritos"
                          >
                            {isFav ? (
                              <BookmarkCheck className="w-4 h-4 text-amber-500 fill-amber-500" />
                            ) : (
                              <Bookmark className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <h4 className="font-bold text-sm text-stone-900 mt-1 line-clamp-1">
                        {poi.nameEs}
                      </h4>
                      <div className="text-xs text-amber-900 font-medium line-clamp-1">
                        {poi.nameVi}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-stone-500 mt-2 pt-2 border-t border-stone-100">
                      <span>
                        {poi.ticketVnd > 0
                          ? `${(poi.ticketVnd / 1000).toLocaleString('es-ES')}k ₫`
                          : 'Gratis'}
                      </span>

                      {/* 1-Click Itinerary Button */}
                      {status.inPlan ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickRemovePoiFromItinerary(poi.id);
                          }}
                          className="text-rose-600 hover:text-rose-800 font-medium text-[11px] underline cursor-pointer"
                        >
                          Quitar
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickAddPoiToItinerary(poi);
                          }}
                          className="text-amber-700 hover:text-amber-900 font-bold flex items-center gap-1 transition cursor-pointer"
                          title="Añadir a mi itinerario activo"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Sumar a Día {currentDay?.dayNumber || 1}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT: Selected Point of Interest Detailed Inspector Card */}
        <div className="lg:col-span-5">
          {selectedPoi ? (
            <div id="poi-detail-inspector" className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200 shadow-sm space-y-4 sticky top-24">
              {/* Header with Title and Speech */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                    {selectedPoi.city} • {selectedPoi.category}
                  </span>

                  <button
                    onClick={() => handleToggleFavorite(selectedPoi.id)}
                    className="p-1 text-stone-400 hover:text-amber-500 transition cursor-pointer"
                  >
                    {favoritePois.includes(selectedPoi.id) ? (
                      <BookmarkCheck className="w-5 h-5 text-amber-500 fill-amber-500" />
                    ) : (
                      <Bookmark className="w-5 h-5" />
                    )}
                  </button>
                </div>

                <h3 className="text-xl font-black text-stone-900 mt-1.5 leading-snug">
                  {selectedPoi.nameEs}
                </h3>

                {/* Vietnamese Name with Pronounce button */}
                <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-100 mt-2 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-stone-400 uppercase font-semibold block">
                      Nombre en Vietnamita (muestra a taxistas / Grab):
                    </span>
                    <span className="text-base font-bold text-stone-900 font-sans">
                      {selectedPoi.nameVi}
                    </span>
                  </div>
                  <button
                    onClick={() => speakVietnamese(selectedPoi.nameVi)}
                    className="p-2 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 transition cursor-pointer"
                    title="Escuchar pronunciación"
                  >
                    <Navigation className="w-4 h-4 text-amber-700" />
                  </button>
                </div>
              </div>

              {/* UNIFIED ITINERARY QUICK ACTIONS CARD */}
              <div className="bg-stone-50/80 p-4 rounded-xl border border-stone-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                    <CalendarPlus className="w-4 h-4 text-amber-600" />
                    <span>Tu Itinerario Activo</span>
                  </span>
                  {selectedPoiInclusion?.inPlan && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>Ya incluido</span>
                    </span>
                  )}
                </div>

                {selectedPoiInclusion?.inPlan ? (
                  <div className="space-y-2">
                    <div className="text-xs text-stone-700">
                      Este lugar está programado en:
                      {selectedPoiInclusion.occurrences.map((occ) => (
                        <div
                          key={occ.stopId}
                          className="flex items-center justify-between p-2 rounded-lg bg-white border border-stone-200 mt-1"
                        >
                          <div>
                            <span className="font-bold text-xs text-stone-900">
                              Día {occ.dayNumber}: {occ.dayCity}
                            </span>
                            {occ.timeSlot && (
                              <span className="text-[10px] text-stone-500 block">
                                Horario: {occ.timeSlot}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() =>
                              removeStopFromDay(activePlan!.id, occ.dayId, occ.stopId)
                            }
                            className="text-xs text-rose-600 hover:text-rose-800 font-semibold underline cursor-pointer"
                          >
                            Eliminar
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Button to also add to another day */}
                    {activePlan && activePlan.days.length > 1 && (
                      <div className="pt-2 border-t border-stone-200">
                        <label className="text-[10px] font-bold text-stone-500 block mb-1">
                          Añadir también a otro día:
                        </label>
                        <div className="flex items-center gap-2">
                          <select
                            value={targetQuickDayId}
                            onChange={(e) => setTargetQuickDayId(e.target.value)}
                            className="flex-1 px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-900 focus:outline-none"
                          >
                            {activePlan.days.map((d) => (
                              <option key={d.id} value={d.id}>
                                Día {d.dayNumber}: {d.destinationCity}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() =>
                              handleQuickAddPoiToItinerary(selectedPoi, targetQuickDayId)
                            }
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs rounded-lg transition cursor-pointer shrink-0"
                          >
                            + Añadir
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-stone-500 block mb-1">
                          Día de destino:
                        </label>
                        <select
                          value={targetQuickDayId}
                          onChange={(e) => setTargetQuickDayId(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        >
                          {activePlan?.days.map((d) => (
                            <option key={d.id} value={d.id}>
                              Día {d.dayNumber}: {d.destinationCity}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-stone-500 block mb-1">
                          Momento sugerido:
                        </label>
                        <select
                          value={targetTimeSlot}
                          onChange={(e) => setTargetTimeSlot(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        >
                          <option value="Mañana 09:30">Mañana 09:30</option>
                          <option value="Mediodía 12:30">Mediodía 12:30</option>
                          <option value="Tarde 15:30">Tarde 15:30</option>
                          <option value="Puesta de sol 17:30">Puesta de sol 17:30</option>
                          <option value="Noche 19:30">Noche 19:30</option>
                          <option value="Horario libre">Horario libre</option>
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={() => handleQuickAddPoiToItinerary(selectedPoi, targetQuickDayId)}
                      className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Añadir a mi Itinerario Activo</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Practical details (Price & Hours) */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                  <span className="text-stone-500 flex items-center gap-1">
                    <Ticket className="w-3.5 h-3.5 text-stone-400" /> Precio Entrada:
                  </span>
                  <div className="font-bold font-mono text-sm text-stone-900 mt-0.5">
                    {selectedPoi.ticketVnd > 0 ? (
                      <>
                        {selectedPoi.ticketVnd.toLocaleString('es-ES')} ₫
                        <span className="text-[10px] text-stone-500 font-normal block">
                          ≈ {(selectedPoi.ticketVnd / eurToVnd).toFixed(2)} €
                        </span>
                      </>
                    ) : (
                      <span className="text-emerald-700 font-bold">Gratis</span>
                    )}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                  <span className="text-stone-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-stone-400" /> Horario:
                  </span>
                  <div className="font-semibold text-xs text-stone-900 mt-0.5">
                    {selectedPoi.openingHours}
                  </div>
                </div>
              </div>

              {/* Best time to visit */}
              <div className="text-xs bg-amber-50/70 p-3 rounded-xl border border-amber-200/80 text-amber-950">
                <strong>⏰ Mejor momento para visitar:</strong> {selectedPoi.bestTime}
              </div>

              {/* Description */}
              <div>
                <span className="text-xs font-bold text-stone-700 block mb-1">
                  Descripción & Qué ver:
                </span>
                <p className="text-xs text-stone-600 leading-relaxed">
                  {selectedPoi.description}
                </p>
              </div>

              {/* Tips */}
              <div>
                <span className="text-xs font-bold text-stone-700 block mb-1">
                  💡 Consejos de viajeros experimentados:
                </span>
                <p className="text-xs text-stone-600 leading-relaxed bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                  {selectedPoi.travelerTips}
                </p>
              </div>

              {/* Local Scam Alert if present */}
              {selectedPoi.scamAlert && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-950 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>¡Alerta de Estafas Frecuentes!</span>
                  </div>
                  <p className="text-[11px] text-rose-900 leading-relaxed">
                    {selectedPoi.scamAlert}
                  </p>
                </div>
              )}

              {/* How to get there */}
              <div className="text-xs text-stone-500 pt-2 border-t border-stone-100 flex items-center justify-between">
                <span>
                  🚗 <strong>Cómo llegar:</strong> {selectedPoi.howToGet}
                </span>
              </div>

              {/* Actions: Free Tour and Google Maps */}
              <div className="pt-2 space-y-2">
                {onStartFreeTour && (
                  <button
                    onClick={() => onStartFreeTour(selectedPoi)}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-stone-900 to-amber-950 hover:from-stone-800 hover:to-amber-900 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs border border-amber-500/30"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Hacer Free Tour con Gemini aquí</span>
                  </button>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPoi.lat},${selectedPoi.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition text-center"
                  >
                    <Route className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>Cómo llegar</span>
                  </a>

                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${selectedPoi.lat},${selectedPoi.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition text-center"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <span>Abrir Maps</span>
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 border border-stone-200 text-center text-stone-500">
              Selecciona un punto en el mapa o en la lista para ver todos sus detalles.
            </div>
          )}
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-stone-100 px-4 py-3 rounded-2xl shadow-xl border border-amber-500/40 text-xs flex items-center gap-3 animate-fade-in">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
          {onNavigateToItinerary && (
            <button
              onClick={onNavigateToItinerary}
              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-[11px] transition cursor-pointer shrink-0 ml-1"
            >
              Ver Itinerario →
            </button>
          )}
        </div>
      )}
    </div>
  );
};
