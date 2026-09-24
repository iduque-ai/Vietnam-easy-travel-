import React, { useState, useMemo, useEffect } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps';
import { ItineraryDay, PointOfInterest } from '../types';
import { POINTS_OF_INTEREST } from '../data/pois';
import { Navigation, MapPin, X, ExternalLink, Route, Volume2 } from 'lucide-react';
import { speakVietnamese } from '../utils/storage';

const GOOGLE_MAPS_API_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_MAPS_API_KEY) || '';

interface ItineraryDayMapProps {
  day: ItineraryDay;
  onClose?: () => void;
}

interface MapStopItem {
  stopIndex: number;
  stopId: string;
  timeSlot?: string;
  customName?: string;
  ticketVnd?: number;
  poi?: PointOfInterest;
  lat: number;
  lng: number;
  title: string;
}

// Controller to fit map bounds to the day's stops
const DayMapBoundsController: React.FC<{
  stops: MapStopItem[];
}> = ({ stops }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || stops.length === 0) return;

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
  }, [map, stops]);

  return null;
};

export const ItineraryDayMap: React.FC<ItineraryDayMapProps> = ({ day, onClose }) => {
  const [selectedItem, setSelectedItem] = useState<MapStopItem | null>(null);

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
            poi,
            lat: poi.lat,
            lng: poi.lng,
            title: poi.nameEs,
          });
        }
      }
    });

    return list;
  }, [day.stops]);

  // Default fallback center
  const defaultCenter = useMemo(() => {
    if (mappedStops.length > 0) {
      return { lat: mappedStops[0].lat, lng: mappedStops[0].lng };
    }
    // Vietnam center
    return { lat: 16.0544, lng: 108.2022 };
  }, [mappedStops]);

  // Google Maps directions URL for all mapped stops in this day
  const googleRouteUrl = useMemo(() => {
    if (mappedStops.length === 0) return null;
    if (mappedStops.length === 1) {
      return `https://www.google.com/maps/search/?api=1&query=${mappedStops[0].lat},${mappedStops[0].lng}`;
    }

    const origin = `${mappedStops[0].lat},${mappedStops[0].lng}`;
    const destination = `${mappedStops[mappedStops.length - 1].lat},${mappedStops[mappedStops.length - 1].lng}`;

    if (mappedStops.length === 2) {
      return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
    }

    const waypoints = mappedStops
      .slice(1, -1)
      .map((s) => `${s.lat},${s.lng}`)
      .join('|');

    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
  }, [mappedStops]);

  return (
    <div className="rounded-2xl border border-stone-800 bg-stone-950 overflow-hidden shadow-lg space-y-2 p-3 sm:p-4 animate-fade-in text-stone-100">
      {/* Top Header of Map */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-stone-800 text-xs">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Route className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-white text-sm">
              Mapa de Ruta del Día {day.dayNumber}: {day.destinationCity}
            </h4>
            <span className="text-[11px] text-stone-400">
              {mappedStops.length} de {day.stops.length} paradas geolocalizadas
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {googleRouteUrl && (
            <a
              href={googleRouteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs flex items-center gap-1.5 transition shadow-xs"
              title="Abrir todas las paradas del día en la app de Google Maps para navegación"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Navegar Ruta en Maps</span>
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

      {/* Map Canvas */}
      {mappedStops.length === 0 ? (
        <div className="p-6 text-center text-xs text-stone-400 border border-dashed border-stone-800 rounded-xl space-y-1">
          <MapPin className="w-6 h-6 text-stone-500 mx-auto mb-1" />
          <p>Las paradas añadidas en este día no tienen coordenadas vinculadas.</p>
          <p className="text-[11px] text-stone-500">
            Añade puntos de interés desde los mapas descargables para visualizarlos aquí en ruta.
          </p>
        </div>
      ) : !GOOGLE_MAPS_API_KEY ? (
        <div className="relative w-full p-6 rounded-xl border border-stone-800 bg-stone-900/90 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
            <Route className="w-5 h-5" />
          </div>
          <div>
            <h5 className="font-bold text-white text-sm">Ruta del Día {day.dayNumber} lista</h5>
            <p className="text-xs text-stone-400 mt-1 max-w-md mx-auto">
              {mappedStops.length} paradas con coordenadas. Puedes abrir la ruta completa paso a paso directamente en Google Maps.
            </p>
          </div>
          {googleRouteUrl && (
            <a
              href={googleRouteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs transition shadow-md"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Abrir Navegación en Google Maps</span>
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </a>
          )}
        </div>
      ) : (
        <div className="relative w-full h-80 rounded-xl overflow-hidden border border-stone-800 bg-stone-900">
          <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['marker']}>
            <Map
              mapId="DEMO_MAP_ID"
              internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
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
              <DayMapBoundsController stops={mappedStops} />

              {/* Advanced Markers for each stop */}
              {mappedStops.map((item) => {
                const isSelected = selectedItem?.stopId === item.stopId;
                return (
                  <AdvancedMarker
                    key={item.stopId}
                    position={{ lat: item.lat, lng: item.lng }}
                    title={`${item.stopIndex}. ${item.title}`}
                    onClick={() => setSelectedItem(item)}
                  >
                    <Pin
                      background={isSelected ? '#d97706' : '#ef4444'}
                      borderColor="#ffffff"
                      glyphColor="#ffffff"
                      scale={isSelected ? 1.25 : 1.0}
                    >
                      <span className="text-[10px] font-black text-white">{item.stopIndex}</span>
                    </Pin>
                  </AdvancedMarker>
                );
              })}

              {/* InfoWindow for selected stop */}
              {selectedItem && (
                <InfoWindow
                  position={{ lat: selectedItem.lat, lng: selectedItem.lng }}
                  onCloseClick={() => setSelectedItem(null)}
                  pixelOffset={[0, -35]}
                >
                  <div className="p-1 min-w-[200px] max-w-[260px] text-stone-900 font-sans">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                        Parada {selectedItem.stopIndex} • {selectedItem.timeSlot || 'Programada'}
                      </span>
                    </div>

                    <h4 className="font-bold text-xs text-stone-900 leading-tight">
                      {selectedItem.title}
                    </h4>

                    {selectedItem.poi && (
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-800 font-medium mt-0.5">
                        <span>{selectedItem.poi.nameVi}</span>
                        <button
                          onClick={() => speakVietnamese(selectedItem.poi!.nameVi)}
                          className="p-0.5 hover:bg-amber-100 rounded text-amber-800"
                          title="Pronunciar"
                        >
                          <Volume2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {selectedItem.ticketVnd !== undefined && (
                      <div className="text-[10px] text-stone-600 mt-1 font-mono">
                        🎟️ {selectedItem.ticketVnd > 0 ? `${(selectedItem.ticketVnd / 1000).toLocaleString('es-ES')}k ₫` : 'Gratis'}
                      </div>
                    )}

                    <div className="mt-2 pt-2 border-t border-stone-200 flex items-center justify-between gap-2 text-[11px]">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${selectedItem.lat},${selectedItem.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-sky-700 hover:text-sky-900 flex items-center gap-1"
                      >
                        <Navigation className="w-3 h-3" />
                        <span>Cómo llegar</span>
                      </a>
                    </div>
                  </div>
                </InfoWindow>
              )}
            </Map>
          </APIProvider>

          {/* Quick stop sequence bar underneath map */}
          <div className="absolute bottom-2 left-2 right-2 bg-stone-950/90 backdrop-blur-xs p-1.5 rounded-lg border border-stone-800 flex items-center gap-2 overflow-x-auto text-[11px] z-10 no-scrollbar">
            <span className="text-[10px] uppercase font-bold text-amber-400 shrink-0">Secuencia:</span>
            {mappedStops.map((s, idx) => (
              <button
                key={s.stopId}
                onClick={() => setSelectedItem(s)}
                className={`px-2 py-0.5 rounded-md shrink-0 transition text-left cursor-pointer ${
                  selectedItem?.stopId === s.stopId
                    ? 'bg-amber-500 text-stone-950 font-bold'
                    : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                }`}
              >
                {idx + 1}. {s.title.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
