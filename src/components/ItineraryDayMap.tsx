import React, { useState, useMemo, useEffect } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  useMap,
} from '@vis.gl/react-google-maps';
import { ItineraryDay, PointOfInterest } from '../types';
import { POINTS_OF_INTEREST } from '../data/pois';
import {
  Navigation,
  MapPin,
  X,
  ExternalLink,
  Route,
  Volume2,
  Wand2,
  Compass,
  CheckCircle2,
  Circle,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { speakVietnamese } from '../utils/storage';
import { buildMultiStopGoogleMapsUrl, calculateDistanceMeters } from '../utils/routeOptimizer';
import { InteractiveOpenStreetMap } from './InteractiveOpenStreetMap';

const GOOGLE_MAPS_API_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_MAPS_API_KEY) || '';

interface ItineraryDayMapProps {
  day: ItineraryDay;
  activeStopId?: string;
  onSelectStop?: (stopId: string) => void;
  onClose?: () => void;
  onOptimizeRoute?: () => void;
}

export interface MapStopItem {
  stopIndex: number;
  stopId: string;
  timeSlot?: string;
  customName?: string;
  ticketVnd?: number;
  isVisited: boolean;
  poi?: PointOfInterest;
  lat: number;
  lng: number;
  title: string;
  vietnameseTitle: string;
}

// Controller to fit map bounds to the day's stops
const DayMapBoundsController: React.FC<{
  stops: MapStopItem[];
  activeStopId?: string;
}> = ({ stops, activeStopId }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || stops.length === 0) return;

    if (activeStopId) {
      const active = stops.find((s) => s.stopId === activeStopId);
      if (active) {
        map.panTo({ lat: active.lat, lng: active.lng });
        map.setZoom(15);
        return;
      }
    }

    if (stops.length === 1) {
      map.panTo({ lat: stops[0].lat, lng: stops[0].lng });
      map.setZoom(14);
      return;
    }

    const gWindow = typeof window !== 'undefined' ? (window as any).google : undefined;
    if (gWindow && gWindow.maps) {
      const bounds = new gWindow.maps.LatLngBounds();
      stops.forEach((s) => bounds.extend({ lat: s.lat, lng: s.lng }));
      map.fitBounds(bounds, 50);
    }
  }, [map, stops, activeStopId]);

  return null;
};

export const ItineraryDayMap: React.FC<ItineraryDayMapProps> = ({
  day,
  activeStopId,
  onSelectStop,
  onClose,
  onOptimizeRoute,
}) => {
  const [selectedItem, setSelectedItem] = useState<MapStopItem | null>(null);
  const [mapEngine, setMapEngine] = useState<'google' | 'osm'>(() => {
    return GOOGLE_MAPS_API_KEY ? 'google' : 'osm';
  });

  // Extract stops that have geographical coordinates
  const mappedStops = useMemo<MapStopItem[]>(() => {
    const list: MapStopItem[] = [];

    day.stops.forEach((stop, idx) => {
      if (stop.poiId) {
        const poi = POINTS_OF_INTEREST.find((p) => p.id === stop.poiId);
        if (poi) {
          list.push({
            stopIndex: idx + 1,
            stopId: stop.id,
            timeSlot: stop.timeSlot,
            customName: stop.customName,
            ticketVnd: stop.ticketVnd ?? poi.ticketVnd,
            isVisited: !!stop.isVisited,
            poi,
            lat: poi.lat,
            lng: poi.lng,
            title: poi.nameEs,
            vietnameseTitle: poi.nameVi,
          });
        }
      }
    });

    return list;
  }, [day.stops]);

  // Sync selectedItem with activeStopId from outside
  useEffect(() => {
    if (activeStopId) {
      const found = mappedStops.find((s) => s.stopId === activeStopId);
      if (found) setSelectedItem(found);
    }
  }, [activeStopId, mappedStops]);

  // Default center
  const defaultCenter = useMemo(() => {
    if (mappedStops.length > 0) {
      return { lat: mappedStops[0].lat, lng: mappedStops[0].lng };
    }
    return { lat: 16.0544, lng: 108.2022 };
  }, [mappedStops]);

  // Multi-stop Google Maps directions URL
  const googleRouteUrl = useMemo(() => {
    return buildMultiStopGoogleMapsUrl(day.stops);
  }, [day.stops]);

  // Calculate total route distance in km
  const totalDistanceKm = useMemo(() => {
    if (mappedStops.length <= 1) return 0;
    let dist = 0;
    for (let i = 0; i < mappedStops.length - 1; i++) {
      dist += calculateDistanceMeters(
        mappedStops[i].lat,
        mappedStops[i].lng,
        mappedStops[i + 1].lat,
        mappedStops[i + 1].lng
      );
    }
    return Number((dist / 1000).toFixed(1));
  }, [mappedStops]);

  const handleMarkerClick = (item: MapStopItem) => {
    setSelectedItem(item);
    if (onSelectStop) {
      onSelectStop(item.stopId);
    }
  };

  return (
    <div className="rounded-2xl border border-stone-800 bg-stone-950 overflow-hidden shadow-xl space-y-3 p-3.5 sm:p-5 animate-fade-in text-stone-100">
      {/* Top Header of Map */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Route className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-white text-sm">
                Ruta Secuencial: Día {day.dayNumber} ({day.destinationCity})
              </h4>
              {totalDistanceKm > 0 && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-800 text-amber-300 font-mono border border-stone-700">
                  ≈ {totalDistanceKm} km entre paradas
                </span>
              )}
            </div>
            <p className="text-[11px] text-stone-400 mt-0.5">
              {mappedStops.length} de {day.stops.length} paradas situadas en orden secuencial ① ➔ ② ➔ ③
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap sm:justify-end">
          {GOOGLE_MAPS_API_KEY && (
            <div className="inline-flex p-0.5 bg-stone-900 rounded-xl border border-stone-800">
              <button
                type="button"
                onClick={() => setMapEngine('google')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  mapEngine === 'google'
                    ? 'bg-amber-500 text-stone-950 font-bold'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                Google Maps
              </button>
              <button
                type="button"
                onClick={() => setMapEngine('osm')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                  mapEngine === 'osm'
                    ? 'bg-amber-500 text-stone-950 font-bold'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>OpenStreetMap</span>
              </button>
            </div>
          )}

          {onOptimizeRoute && mappedStops.length >= 3 && (
            <button
              onClick={onOptimizeRoute}
              title="Reordenar automáticamente las paradas para minimizar traslados"
              className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 border border-stone-700 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer active:scale-95"
            >
              <Wand2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Optimizar ruta</span>
            </button>
          )}

          {googleRouteUrl && (
            <a
              href={googleRouteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              title="Abrir la ruta con todas las paradas enlazadas en Google Maps"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Ruta en Google Maps</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-lg transition"
              title="Cerrar vista de mapa"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Map Canvas: Google Maps OR Interactive OpenStreetMap Route */}
      {mappedStops.length === 0 ? (
        <div className="p-8 text-center text-xs text-stone-400 border border-dashed border-stone-800 rounded-2xl space-y-2 bg-stone-900/40">
          <MapPin className="w-8 h-8 text-stone-500 mx-auto mb-1 opacity-70" />
          <h5 className="font-semibold text-stone-300">No hay paradas geolocalizadas aún</h5>
          <p className="text-[11px] text-stone-500 max-w-sm mx-auto">
            Añade lugares desde la pestaña "Mapas" o pulsa "+ Añadir Parada" seleccionando un monumento o templo para ver la ruta paso a paso aquí.
          </p>
        </div>
      ) : mapEngine === 'google' && GOOGLE_MAPS_API_KEY ? (
        <div className="relative w-full h-80 sm:h-96 rounded-xl overflow-hidden border border-stone-800 bg-stone-900">
          <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['marker']}>
            <Map
              mapId="ITINERARY_MAP_ID"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              defaultCenter={defaultCenter}
              defaultZoom={13}
              gestureHandling="greedy"
              disableDefaultUI={false}
              mapTypeControl={false}
              streetViewControl={false}
              fullscreenControl={true}
              zoomControl={true}
              style={{ width: '100%', height: '100%' }}
            >
              <DayMapBoundsController stops={mappedStops} activeStopId={activeStopId} />

              {/* Advanced Markers for each stop */}
              {mappedStops.map((item) => {
                const isSelected = (selectedItem?.stopId || activeStopId) === item.stopId;
                return (
                  <AdvancedMarker
                    key={item.stopId}
                    position={{ lat: item.lat, lng: item.lng }}
                    title={`${item.stopIndex}. ${item.title}`}
                    onClick={() => handleMarkerClick(item)}
                  >
                    <Pin
                      background={
                        item.isVisited
                          ? '#10b981'
                          : isSelected
                          ? '#f59e0b'
                          : '#dc2626'
                      }
                      borderColor="#ffffff"
                      glyphColor="#ffffff"
                      scale={isSelected ? 1.3 : 1.0}
                    >
                      <span className="text-[11px] font-black text-white">{item.stopIndex}</span>
                    </Pin>
                  </AdvancedMarker>
                );
              })}
            </Map>
          </APIProvider>

          {/* Docked Stop Card on Map */}
          {selectedItem && (
            <div className="absolute bottom-2 left-2 right-2 sm:bottom-3 sm:left-3 sm:right-auto sm:max-w-sm bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-stone-200/90 p-3 sm:p-3.5 z-20 animate-fade-in">
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                  Parada #{selectedItem.stopIndex} {selectedItem.isVisited ? '• Visitado ✓' : ''}
                </span>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
                  title="Cerrar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <h4 className="font-bold text-xs sm:text-sm text-stone-900 leading-snug">
                {selectedItem.title}
              </h4>

              {selectedItem.poi && (
                <div className="flex items-center gap-1.5 text-xs text-amber-900 font-medium mt-1">
                  <span>🇻🇳 {selectedItem.vietnameseTitle}</span>
                  <button
                    onClick={() => speakVietnamese(selectedItem.vietnameseTitle)}
                    className="p-0.5 px-1.5 rounded bg-amber-100/70 hover:bg-amber-200 text-amber-800 transition cursor-pointer flex items-center gap-1 text-[11px]"
                    title="Pronunciar en vietnamita"
                  >
                    <Volume2 className="w-3 h-3" />
                    <span>Pronunciar</span>
                  </button>
                </div>
              )}

              {selectedItem.ticketVnd !== undefined && (
                <div className="text-[11px] text-stone-600 mt-1 font-mono">
                  🎟️ {selectedItem.ticketVnd > 0 ? `${(selectedItem.ticketVnd / 1000).toLocaleString('es-ES')}k ₫` : 'Entrada gratis'}
                </div>
              )}

              <div className="mt-2 pt-2 border-t border-stone-100 flex items-center justify-between gap-2 text-xs">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selectedItem.lat},${selectedItem.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-sky-700 hover:text-sky-900 flex items-center gap-1"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Cómo llegar (Google Maps)</span>
                </a>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Real Interactive OpenStreetMap with Route Track */
        <div className="relative w-full h-80 sm:h-96 rounded-xl overflow-hidden border border-stone-800 bg-stone-950 shadow-inner">
          <InteractiveOpenStreetMap
            center={defaultCenter}
            zoom={13}
            pois={mappedStops.map((s) => s.poi).filter((p): p is PointOfInterest => !!p)}
            routeCoordinates={mappedStops.map((s) => ({
              lat: s.lat,
              lng: s.lng,
              label: `${s.stopIndex}. ${s.title}`,
            }))}
            selectedPoiId={selectedItem?.poi?.id}
            onSelectPoi={(poi) => {
              const found = mappedStops.find((m) => m.poi?.id === poi.id);
              if (found) handleMarkerClick(found);
            }}
            className="h-80 sm:h-96"
          />

          {/* Docked Stop Card on OpenStreetMap */}
          {selectedItem && (
            <div className="absolute bottom-2 left-2 right-2 sm:bottom-3 sm:left-3 sm:right-auto sm:max-w-sm bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-stone-200/90 p-3 sm:p-3.5 z-20 animate-fade-in">
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                  Parada #{selectedItem.stopIndex} {selectedItem.isVisited ? '• Visitado ✓' : ''}
                </span>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
                  title="Cerrar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <h4 className="font-bold text-xs sm:text-sm text-stone-900 leading-snug">
                {selectedItem.title}
              </h4>

              {selectedItem.poi && (
                <div className="flex items-center gap-1.5 text-xs text-amber-900 font-medium mt-1">
                  <span>🇻🇳 {selectedItem.vietnameseTitle}</span>
                  <button
                    onClick={() => speakVietnamese(selectedItem.vietnameseTitle)}
                    className="p-0.5 px-1.5 rounded bg-amber-100/70 hover:bg-amber-200 text-amber-800 transition cursor-pointer flex items-center gap-1 text-[11px]"
                    title="Pronunciar en vietnamita"
                  >
                    <Volume2 className="w-3 h-3" />
                    <span>Pronunciar</span>
                  </button>
                </div>
              )}

              {selectedItem.ticketVnd !== undefined && (
                <div className="text-[11px] text-stone-600 mt-1 font-mono">
                  🎟️ {selectedItem.ticketVnd > 0 ? `${(selectedItem.ticketVnd / 1000).toLocaleString('es-ES')}k ₫` : 'Entrada gratis'}
                </div>
              )}

              <div className="mt-2 pt-2 border-t border-stone-100 flex items-center justify-between gap-2 text-xs">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selectedItem.lat},${selectedItem.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-sky-700 hover:text-sky-900 flex items-center gap-1"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Cómo llegar (Google Maps)</span>
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Visual Sequence Cards Layout */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between text-xs text-stone-400">
          <span className="font-medium text-stone-300">Secuencia de Ruta Optimizada:</span>
          <span>{mappedStops.length} paradas en orden</span>
        </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {mappedStops.map((stop, idx) => {
              const isSelected = (selectedItem?.stopId || activeStopId) === stop.stopId;
              const nextStop = mappedStops[idx + 1];
              const distToNext = nextStop
                ? (
                    calculateDistanceMeters(stop.lat, stop.lng, nextStop.lat, nextStop.lng) /
                    1000
                  ).toFixed(1)
                : null;

              return (
                <div
                  key={stop.stopId}
                  onClick={() => handleMarkerClick(stop)}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer relative ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500/60 shadow-md ring-1 ring-amber-500/30'
                      : 'bg-stone-950/70 border-stone-800 hover:border-stone-700 hover:bg-stone-800/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                          stop.isVisited
                            ? 'bg-emerald-500 text-stone-950'
                            : isSelected
                            ? 'bg-amber-500 text-stone-950'
                            : 'bg-stone-800 text-amber-400 border border-stone-700'
                        }`}
                      >
                        {stop.stopIndex}
                      </span>
                      <span className="text-[11px] font-mono text-stone-400">
                        {stop.timeSlot || `Paso ${stop.stopIndex}`}
                      </span>
                    </div>

                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 rounded-md bg-stone-800 hover:bg-amber-500 hover:text-stone-950 text-stone-400 text-[10px] flex items-center gap-1 transition"
                      title="Navegar a esta parada en Google Maps"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>Ir</span>
                    </a>
                  </div>

                  <h5 className="font-bold text-xs text-white mt-1.5 line-clamp-1">
                    {stop.title}
                  </h5>
                  <div className="text-[11px] text-amber-300/80 truncate">
                    {stop.vietnameseTitle}
                  </div>

                  {distToNext && (
                    <div className="mt-2 pt-1.5 border-t border-stone-800/60 flex items-center justify-between text-[10px] text-stone-400">
                      <span className="flex items-center gap-1">
                        <ArrowRight className="w-3 h-3 text-amber-500" />
                        <span>A siguiente parada:</span>
                      </span>
                      <span className="font-mono text-stone-300 font-semibold">{distToNext} km</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      {/* Quick Stop Bar Sequence */}
      <div className="bg-stone-900/90 p-2 rounded-xl border border-stone-800 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
        <span className="text-[10px] uppercase font-bold text-amber-400 shrink-0 flex items-center gap-1">
          <Compass className="w-3 h-3" />
          <span>Pasos:</span>
        </span>
        {mappedStops.map((s) => {
          const isSelected = (selectedItem?.stopId || activeStopId) === s.stopId;
          return (
            <button
              key={s.stopId}
              onClick={() => handleMarkerClick(s)}
              className={`px-2.5 py-1 rounded-lg shrink-0 transition text-left cursor-pointer flex items-center gap-1.5 text-xs ${
                isSelected
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-xs'
                  : s.isVisited
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              <span className="text-[10px] opacity-80 font-mono">#{s.stopIndex}</span>
              <span className="truncate max-w-[120px]">{s.title}</span>
              {s.isVisited && <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
