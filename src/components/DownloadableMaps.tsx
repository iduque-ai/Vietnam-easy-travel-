import React, { useState, useMemo, useEffect } from 'react';
import { Download, Check, MapPin, Star, Clock, Ticket, AlertTriangle, Navigation, ExternalLink, Bookmark, BookmarkCheck, FileText, Share2, Compass, Eye, Filter, CalendarPlus, X, Sparkles, Layers, Crosshair, Locate, Map as MapIcon, Route, Globe } from 'lucide-react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps';
import { PointOfInterest, RegionMapPack, ExchangeRatesData, CurrencyCode, ItineraryPlan } from '../types';
import { REGION_PACKS, POINTS_OF_INTEREST } from '../data/pois';
import { getDownloadedPackIds, saveDownloadedPackIds, getFavoritePoiIds, saveFavoritePoiIds, speakVietnamese, getItineraryPlans, addPoiToItineraryDay, getActivePlanId } from '../utils/storage';

const GOOGLE_MAPS_API_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_MAPS_API_KEY) ||
  'AIzaSyDBPIkdp1W4Z9iTjNZaNfS3DMCje7TM4tU';

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
}

export const DownloadableMaps: React.FC<DownloadableMapsProps> = ({
  ratesData,
  isOnline,
  onNavigateToItinerary,
  onStartFreeTour,
}) => {
  const [downloadedPacks, setDownloadedPacks] = useState<string[]>(getDownloadedPackIds);
  const [favoritePois, setFavoritePois] = useState<string[]>(getFavoritePoiIds);
  const [selectedRegionId, setSelectedRegionId] = useState<string>('reg-hanoi-north');
  const [selectedPoi, setSelectedPoi] = useState<PointOfInterest | null>(POINTS_OF_INTEREST[0]);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('todas');
  const [isDownloadingPack, setIsDownloadingPack] = useState<string | null>(null);

  // Itinerary modal state
  const [isAddToItineraryOpen, setIsAddToItineraryOpen] = useState<boolean>(false);
  const [poiToAdd, setPoiToAdd] = useState<PointOfInterest | null>(null);
  const [targetPlanId, setTargetPlanId] = useState<string>(getActivePlanId);
  const [targetDayId, setTargetDayId] = useState<string>('');
  const [targetTimeSlot, setTargetTimeSlot] = useState<string>('Mañana 09:30');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Google Maps state
  const [mapDisplayMode, setMapDisplayMode] = useState<'google' | 'vector'>('google');
  const [infoWindowOpen, setInfoWindowOpen] = useState<boolean>(true);
  const [selectedLocationTarget, setSelectedLocationTarget] = useState<{ lat: number; lng: number } | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationToast, setLocationToast] = useState<string | null>(null);

  const handleLocateMe = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationToast('Geolocalización no soportada en este navegador');
      setTimeout(() => setLocationToast(null), 3000);
      return;
    }
    setIsLocating(true);
    setLocationToast(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setSelectedLocationTarget(loc);
        setIsLocating(false);
        setLocationToast('¡Ubicación GPS actual localizada!');
        setTimeout(() => setLocationToast(null), 3000);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setIsLocating(false);
        setLocationToast('No se pudo obtener la ubicación GPS');
        setTimeout(() => setLocationToast(null), 3500);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleRecenterRegion = () => {
    setSelectedLocationTarget(null);
  };

  const itineraryPlans = useMemo(() => {
    return getItineraryPlans();
  }, [isAddToItineraryOpen]);

  const selectedPlan = useMemo(() => {
    return itineraryPlans.find((p) => p.id === targetPlanId) || itineraryPlans[0];
  }, [itineraryPlans, targetPlanId]);

  const handleOpenAddToItinerary = (poi: PointOfInterest) => {
    setPoiToAdd(poi);
    const currentPlans = getItineraryPlans();
    const currentActiveId = getActivePlanId();
    const plan = currentPlans.find((p) => p.id === currentActiveId) || currentPlans[0];
    if (plan) {
      setTargetPlanId(plan.id);
      const matchingDay = plan.days.find(
        (d) =>
          d.destinationCity.toLowerCase().includes(poi.city.toLowerCase()) ||
          poi.city.toLowerCase().includes(d.destinationCity.toLowerCase())
      );
      setTargetDayId(matchingDay ? matchingDay.id : (plan.days[0]?.id || ''));
    }
    setIsAddToItineraryOpen(true);
  };

  const handleConfirmAddToItinerary = () => {
    if (!poiToAdd || !targetPlanId || !targetDayId) return;
    const success = addPoiToItineraryDay(
      targetPlanId,
      targetDayId,
      poiToAdd.id,
      targetTimeSlot,
      poiToAdd.travelerTips
    );
    if (success) {
      setIsAddToItineraryOpen(false);
      setToastMessage(`¡"${poiToAdd.nameEs}" añadido al itinerario!`);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const usdVndRate = ratesData.rates['VND'] || 25450;
  const eurRate = ratesData.rates['EUR'] || 0.92;
  const eurToVnd = usdVndRate / eurRate;

  const currentRegion = useMemo(() => {
    return REGION_PACKS.find((r) => r.id === selectedRegionId) || REGION_PACKS[0];
  }, [selectedRegionId]);

  // Points in this region
  const regionPois = useMemo(() => {
    return POINTS_OF_INTEREST.filter((poi) => {
      const inRegion = poi.regionId === selectedRegionId;
      const matchesCategory = activeCategoryFilter === 'todas' || poi.category === activeCategoryFilter;
      return inRegion && matchesCategory;
    });
  }, [selectedRegionId, activeCategoryFilter]);

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

  // Generate offline downloadable text/print itinerary guide
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
      content += `   • Entrada: ${poi.ticketVnd > 0 ? `${poi.ticketVnd.toLocaleString('es-ES')} ₫ (≈ ${(poi.ticketVnd / eurToVnd).toFixed(2)} €)` : 'Gratis'}\n`;
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Region Selector & Offline Pack Status */}
      <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
              <Compass className="w-5 h-5 text-amber-600" />
              <span>Mapas Descargables por Regiones de Vietnam</span>
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Guarda los mapas y lugares clave en tu dispositivo para navegar y consultar sin conexión a internet.
            </p>
          </div>

          {/* Download Current Pack Button */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <button
              onClick={() => handleToggleDownloadPack(selectedRegionId)}
              disabled={isDownloadingPack === selectedRegionId}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer ${
                isCurrentPackDownloaded
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                  : 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-sm'
              }`}
            >
              {isCurrentPackDownloaded ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Guardado Offline</span>
                </>
              ) : (
                <>
                  <Download className={`w-4 h-4 ${isDownloadingPack === selectedRegionId ? 'animate-bounce' : ''}`} />
                  <span>{isDownloadingPack === selectedRegionId ? 'Descargando...' : `Descargar Pack (${currentRegion.sizeMb})`}</span>
                </>
              )}
            </button>

            <button
              onClick={() => handleDownloadOfflineGuide(currentRegion)}
              className="p-2 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 transition cursor-pointer"
              title="Descargar Ficha / Guía en texto para imprimir o llevar en notas"
            >
              <FileText className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Region Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
          {REGION_PACKS.map((pack) => {
            const isDownloaded = downloadedPacks.includes(pack.id);
            const isSelected = selectedRegionId === pack.id;
            return (
              <button
                key={pack.id}
                onClick={() => {
                  setSelectedRegionId(pack.id);
                  const firstPoi = POINTS_OF_INTEREST.find((p) => p.regionId === pack.id);
                  if (firstPoi) setSelectedPoi(firstPoi);
                }}
                className={`p-3 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-amber-500 bg-amber-50/60 shadow-xs'
                    : 'border-stone-200 bg-stone-50/50 hover:bg-stone-100/70'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold font-mono text-stone-500">
                      {pack.vietnameseName}
                    </span>
                    {isDownloaded && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500" title="Guardado sin conexión" />
                    )}
                  </div>
                  <div className="font-bold text-sm text-stone-900 mt-1 line-clamp-1">
                    {pack.name}
                  </div>
                </div>
                <div className="text-[10px] text-stone-500 mt-2">
                  {pack.poiIds.length} Puntos clave • {pack.sizeMb}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Map Viewer & POIs Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT / TOP: Interactive Vector Map Canvas & Highlights */}
        <div className="lg:col-span-7 space-y-4">
          {/* Interactive Google Map & Vector Map Container */}
          <div className="bg-stone-900 text-stone-100 rounded-2xl p-4 sm:p-5 border border-stone-800 shadow-md relative overflow-hidden space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 uppercase font-bold tracking-wider">
                    <Globe className="w-3.5 h-3.5" />
                    Google Maps Platform
                  </span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded-full font-semibold">
                    En vivo
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white mt-0.5">
                  {currentRegion.name} ({currentRegion.vietnameseName})
                </h3>
              </div>

              {/* Map Mode Toggle & GPS Quick actions */}
              <div className="flex flex-wrap items-center gap-1.5">
                <div className="inline-flex p-0.5 bg-stone-950 rounded-xl border border-stone-800">
                  <button
                    onClick={() => setMapDisplayMode('google')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                      mapDisplayMode === 'google'
                        ? 'bg-amber-500 text-stone-950 shadow-xs'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    <MapIcon className="w-3.5 h-3.5" />
                    <span>Google Maps</span>
                  </button>
                  <button
                    onClick={() => setMapDisplayMode('vector')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                      mapDisplayMode === 'vector'
                        ? 'bg-amber-500 text-stone-950 shadow-xs'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Esquemático</span>
                  </button>
                </div>

                <button
                  onClick={handleLocateMe}
                  disabled={isLocating}
                  className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl border border-stone-700 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  title="Centrar en mi ubicación GPS"
                >
                  <Locate className={`w-3.5 h-3.5 text-sky-400 ${isLocating ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{isLocating ? 'Buscando...' : 'Mi Ubicación'}</span>
                </button>

                <button
                  onClick={handleRecenterRegion}
                  className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl border border-stone-700 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                  title="Recentrar en esta región"
                >
                  <Crosshair className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Recentrar</span>
                </button>
              </div>
            </div>

            {locationToast && (
              <div className="bg-sky-950/80 border border-sky-700 text-sky-200 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 animate-fade-in">
                <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>{locationToast}</span>
              </div>
            )}

            {/* Map Canvas: Google Maps OR Vector Map */}
            {mapDisplayMode === 'google' ? (
              <div className="relative w-full h-[420px] rounded-xl overflow-hidden border border-stone-800 bg-stone-950 shadow-inner">
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
                      return (
                        <AdvancedMarker
                          key={poi.id}
                          position={{ lat: poi.lat, lng: poi.lng }}
                          title={poi.nameEs}
                          onClick={() => {
                            setSelectedPoi(poi);
                            setSelectedLocationTarget({ lat: poi.lat, lng: poi.lng });
                            setInfoWindowOpen(true);
                          }}
                        >
                          <Pin
                            background={isSelected ? '#d97706' : '#ef4444'}
                            borderColor="#ffffff"
                            glyphColor="#ffffff"
                            scale={isSelected ? 1.3 : 1.0}
                          >
                            <span className="text-[10px] font-black text-white">{idx + 1}</span>
                          </Pin>
                        </AdvancedMarker>
                      );
                    })}

                    {/* User Location Marker */}
                    {userLocation && (
                      <AdvancedMarker position={userLocation} title="Tu ubicación actual">
                        <div className="relative flex items-center justify-center">
                          <div className="w-4 h-4 bg-sky-500 rounded-full border-2 border-white shadow-lg z-10" />
                          <div className="absolute -inset-2 bg-sky-400 rounded-full opacity-40 animate-ping" />
                        </div>
                      </AdvancedMarker>
                    )}

                    {/* InfoWindow for the selected POI */}
                    {infoWindowOpen && selectedPoi && (
                      <InfoWindow
                        position={{ lat: selectedPoi.lat, lng: selectedPoi.lng }}
                        onCloseClick={() => setInfoWindowOpen(false)}
                        pixelOffset={[0, -38]}
                      >
                        <div className="p-1 min-w-[210px] max-w-[270px] text-stone-900 font-sans">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                              {selectedPoi.city} • {selectedPoi.category}
                            </span>
                            <span className="text-[10px] font-semibold text-emerald-700">
                              {selectedPoi.ticketVnd > 0 ? `${(selectedPoi.ticketVnd / 1000).toLocaleString('es-ES')}k ₫` : 'Gratis'}
                            </span>
                          </div>
                          <h4 className="font-bold text-xs text-stone-900 line-clamp-1">{selectedPoi.nameEs}</h4>
                          <div className="text-[11px] text-amber-800 font-medium line-clamp-1">{selectedPoi.nameVi}</div>
                          <p className="text-[11px] text-stone-600 mt-1 line-clamp-2 leading-tight">{selectedPoi.description}</p>

                          <div className="mt-2 pt-2 border-t border-stone-200 flex items-center justify-between gap-2 text-[11px]">
                            <button
                              onClick={() => handleOpenAddToItinerary(selectedPoi)}
                              className="font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
                            >
                              <CalendarPlus className="w-3 h-3" />
                              <span>Itinerario</span>
                            </button>
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPoi.lat},${selectedPoi.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-bold text-sky-700 hover:text-sky-900 flex items-center gap-1"
                            >
                              <Navigation className="w-3 h-3" />
                              <span>Ruta</span>
                            </a>
                          </div>
                        </div>
                      </InfoWindow>
                    )}
                  </Map>
                </APIProvider>

                {/* Floating map helper overlay */}
                <div className="absolute bottom-2 left-2 bg-stone-900/90 backdrop-blur-xs px-2.5 py-1 rounded-md text-[10px] text-stone-300 border border-stone-800 shadow-sm pointer-events-none z-10 flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>Toca cualquier marcador numerado para ver detalles, tarifas y ruta</span>
                </div>
              </div>
            ) : (
              /* Interactive SVG Vietnam Map Representation (Offline mode) */
              <div className="relative w-full h-[420px] bg-stone-950/80 rounded-xl border border-stone-800 p-2 overflow-hidden flex items-center justify-center">
                <svg viewBox="0 0 500 400" className="w-full h-full">
                  {/* Coastal coastline backdrop representation */}
                  <path
                    d="M 120,40 Q 200,60 260,80 T 320,130 Q 340,180 320,240 T 260,320 Q 220,380 160,390"
                    fill="none"
                    stroke="#334155"
                    strokeWidth="24"
                    strokeLinecap="round"
                    opacity="0.4"
                  />

                  {/* Ocean Waves */}
                  <path
                    d="M 380,100 Q 400,110 420,100 T 460,100"
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth="2"
                  />
                  <path
                    d="M 360,200 Q 380,210 400,200 T 440,200"
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth="2"
                  />
                  <text x="370" y="160" fill="#475569" fontSize="11" fontStyle="italic">
                    Biển Đông (Mar de China Meridional)
                  </text>

                  {/* Vietnam Country Contour Stylized Path */}
                  <path
                    d="M 140,50 L 220,50 L 260,85 L 230,115 L 260,140 L 290,175 L 300,210 L 270,260 L 240,310 L 210,360 L 160,380 L 170,350 L 210,320 L 240,260 L 260,210 L 240,165 L 200,125 L 140,90 Z"
                    fill="#1c1917"
                    stroke="#d97706"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                  />

                  {/* Region Highlight Zone */}
                  {selectedRegionId === 'reg-hanoi-north' && (
                    <ellipse cx="200" cy="80" rx="60" ry="35" fill="rgba(245, 158, 11, 0.15)" stroke="#f59e0b" strokeWidth="1.5" />
                  )}
                  {selectedRegionId === 'reg-central' && (
                    <ellipse cx="280" cy="180" rx="45" ry="35" fill="rgba(245, 158, 11, 0.15)" stroke="#f59e0b" strokeWidth="1.5" />
                  )}
                  {selectedRegionId === 'reg-saigon-south' && (
                    <ellipse cx="210" cy="330" rx="55" ry="40" fill="rgba(245, 158, 11, 0.15)" stroke="#f59e0b" strokeWidth="1.5" />
                  )}
                  {selectedRegionId === 'reg-nature' && (
                    <ellipse cx="250" cy="140" rx="40" ry="30" fill="rgba(245, 158, 11, 0.15)" stroke="#f59e0b" strokeWidth="1.5" />
                  )}

                  {/* Interactive Points on Map */}
                  {regionPois.map((poi, idx) => {
                    let cx = 200 + (idx % 3) * 35 - 35;
                    let cy = 80 + Math.floor(idx / 3) * 25 - 20;

                    if (selectedRegionId === 'reg-central') {
                      cx = 270 + (idx % 3) * 25 - 20;
                      cy = 175 + Math.floor(idx / 3) * 20 - 15;
                    } else if (selectedRegionId === 'reg-saigon-south') {
                      cx = 205 + (idx % 3) * 30 - 25;
                      cy = 325 + Math.floor(idx / 3) * 22 - 15;
                    } else if (selectedRegionId === 'reg-nature') {
                      cx = 245 + (idx % 2) * 40 - 20;
                      cy = 135 + Math.floor(idx / 2) * 30 - 15;
                    }

                    const isSelected = selectedPoi?.id === poi.id;

                    return (
                      <g
                        key={poi.id}
                        onClick={() => setSelectedPoi(poi)}
                        className="cursor-pointer transition-all duration-200"
                      >
                        {isSelected && (
                          <circle cx={cx} cy={cy} r="16" fill="rgba(245, 158, 11, 0.3)" className="animate-ping" />
                        )}
                        <circle
                          cx={cx}
                          cy={cy}
                          r={isSelected ? "9" : "6"}
                          fill={isSelected ? "#f59e0b" : "#ef4444"}
                          stroke="#ffffff"
                          strokeWidth="2"
                        />
                        <text
                          x={cx}
                          y={cy - 11}
                          textAnchor="middle"
                          fill={isSelected ? "#fbbf24" : "#e2e8f0"}
                          fontSize="9"
                          fontWeight="bold"
                        >
                          {idx + 1}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                <div className="absolute bottom-2 left-2 bg-stone-900/90 backdrop-blur-xs px-2.5 py-1 rounded-md text-[10px] text-stone-400 border border-stone-800">
                  📍 Modo esquemático offline activo
                </div>
              </div>
            )}

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-3 text-xs no-scrollbar">
              <span className="text-stone-400 text-xs flex items-center gap-1 shrink-0">
                <Filter className="w-3.5 h-3.5" /> Filtrar:
              </span>
              {[
                { id: 'todas', label: 'Todos' },
                { id: 'Monumento', label: 'Monumentos' },
                { id: 'Cultura', label: 'Cultura' },
                { id: 'Naturaleza', label: 'Naturaleza' },
                { id: 'Mercado', label: 'Mercados' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategoryFilter(cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs whitespace-nowrap transition cursor-pointer ${
                    activeCategoryFilter === cat.id
                      ? 'bg-amber-500 text-stone-950 font-bold'
                      : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* List of Region Points with Quick Cards */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              Lugares Clave en {currentRegion.name} ({regionPois.length}):
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {regionPois.map((poi, idx) => {
                const isSelected = selectedPoi?.id === poi.id;
                const isFav = favoritePois.includes(poi.id);
                return (
                  <div
                    key={poi.id}
                    onClick={() => {
                      setSelectedPoi(poi);
                      setSelectedLocationTarget({ lat: poi.lat, lng: poi.lng });
                      setInfoWindowOpen(true);
                    }}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/70 ring-1 ring-amber-500 shadow-xs'
                        : 'border-stone-200 bg-white hover:border-amber-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-100 text-stone-700">
                          #{idx + 1} {poi.category}
                        </span>
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

                      <h4 className="font-bold text-sm text-stone-900 mt-1 line-clamp-1">
                        {poi.nameEs}
                      </h4>
                      <div className="text-xs text-amber-900 font-medium line-clamp-1">
                        {poi.nameVi}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-stone-500 mt-2 pt-2 border-t border-stone-100">
                      <span>
                        {poi.ticketVnd > 0 ? `${(poi.ticketVnd / 1000).toLocaleString('es-ES')}k ₫` : 'Gratis'}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenAddToItinerary(poi);
                          }}
                          className="text-stone-500 hover:text-amber-800 font-medium flex items-center gap-1 transition cursor-pointer"
                          title="Añadir a mi itinerario"
                        >
                          <CalendarPlus className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Itinerario</span>
                        </button>
                        <span className="text-amber-700 font-medium">Ver detalles →</span>
                      </div>
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
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200 shadow-sm space-y-4 sticky top-24">
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

              {/* Actions: Add to Itinerary, Free Tour, and Google Maps */}
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

                <button
                  onClick={() => handleOpenAddToItinerary(selectedPoi)}
                  className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
                >
                  <CalendarPlus className="w-4 h-4" />
                  <span>Añadir a mi Itinerario</span>
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPoi.lat},${selectedPoi.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition text-center"
                  >
                    <Route className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>Cómo llegar (Ruta)</span>
                  </a>

                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${selectedPoi.lat},${selectedPoi.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition text-center"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <span>Abrir en Maps</span>
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

      {/* Modal: Add POI to Itinerary */}
      {isAddToItineraryOpen && poiToAdd && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2">
                <CalendarPlus className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-base text-stone-900">Añadir al Itinerario</h3>
              </div>
              <button
                onClick={() => setIsAddToItineraryOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3.5">
              {/* Target POI summary */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                  {poiToAdd.city} • {poiToAdd.category}
                </span>
                <h4 className="font-bold text-sm text-stone-900 mt-1">{poiToAdd.nameEs}</h4>
                <div className="text-xs text-amber-900">{poiToAdd.nameVi}</div>
                <div className="text-[11px] text-stone-500 mt-1">
                  Entrada: {poiToAdd.ticketVnd > 0 ? `${(poiToAdd.ticketVnd / 1000).toLocaleString('es-ES')}k ₫` : 'Gratis'}
                </div>
              </div>

              {/* Select Plan */}
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Seleccionar Itinerario:
                </label>
                <select
                  value={targetPlanId}
                  onChange={(e) => {
                    const newPlanId = e.target.value;
                    setTargetPlanId(newPlanId);
                    const plan = itineraryPlans.find((p) => p.id === newPlanId);
                    if (plan && plan.days.length > 0) {
                      setTargetDayId(plan.days[0].id);
                    }
                  }}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {itineraryPlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.days.length} días)
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Day */}
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Seleccionar Día / Destino:
                </label>
                {selectedPlan && selectedPlan.days.length > 0 ? (
                  <select
                    value={targetDayId}
                    onChange={(e) => setTargetDayId(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {selectedPlan.days.map((day) => (
                      <option key={day.id} value={day.id}>
                        Día {day.dayNumber}: {day.destinationCity} - {day.title}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-xs text-rose-600">Este plan no tiene días creados aún.</div>
                )}
              </div>

              {/* Time slot */}
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Momento del día / Horario sugerido:
                </label>
                <input
                  type="text"
                  value={targetTimeSlot}
                  onChange={(e) => setTargetTimeSlot(e.target.value)}
                  placeholder="Ej: Mañana 09:30, Tarde, Puesta de sol..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="p-4 border-t border-stone-200 flex items-center justify-end gap-2 bg-stone-50">
              <button
                type="button"
                onClick={() => setIsAddToItineraryOpen(false)}
                className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-200 text-xs font-medium transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAddToItinerary}
                disabled={!targetDayId}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-stone-950 font-bold text-xs transition cursor-pointer"
              >
                Confirmar y Añadir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
