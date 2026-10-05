import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
} from '@vis.gl/react-google-maps';
import { PointOfInterest } from '../types';
import { InteractiveOpenStreetMap } from './InteractiveOpenStreetMap';
import {
  Crosshair,
  MapPin,
  Plus,
  Minus,
  X,
  ArrowRight,
  Sparkles,
  Check,
} from 'lucide-react';

const GOOGLE_MAPS_API_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_MAPS_API_KEY) || '';

export interface TripMapStop {
  index: number;
  stopId: string;
  title: string;
  vietnameseTitle?: string;
  timeSlot?: string;
  ticketVnd?: number;
  isVisited: boolean;
  lat: number;
  lng: number;
  poi?: PointOfInterest;
}

interface ActivePlacePreview {
  poi?: PointOfInterest;
  stopId?: string;
  nameEs: string;
  nameVi: string;
  category: string;
  rating?: number;
  ticketVnd: number;
  openingHours?: string;
  isInDay: boolean;
  dayStopIndex?: number;
  lat: number;
  lng: number;
}

interface TripInteractiveMapProps {
  center: { lat: number; lng: number };
  zoom?: number;
  isOnline: boolean;
  mapEngine?: 'google' | 'osm';
  onMapEngineChange?: (engine: 'google' | 'osm') => void;
  dayNumber?: number;
  dayStops: TripMapStop[];
  recommendedPois: PointOfInterest[];
  onOpenPoiDetail: (poi: PointOfInterest) => void;
  onAddPoiToDay?: (poi: PointOfInterest) => void;
  onRemoveStop?: (stopId: string) => void;
  className?: string;
  userLocation?: { lat: number; lng: number } | null;
}

// Pegman SVG Icon (Official Google yellow silhouette)
const PegmanIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <circle cx="12" cy="4.5" r="2.5" />
    <path d="M15 8c0-.6-.4-1-1-1h-4c-.6 0-1 .4-1 1v4c0 .4.2.7.5.9L10 17v4c0 .6.4 1 1 1h.5c.6 0 1-.4 1-1v-4h.5v4c0 .6.4 1 1 1h.5c.6 0 1-.4 1-1v-4l.5-4.1c.3-.2.5-.5.5-.9V8z" />
  </svg>
);

// Google Maps Camera Controller
const GoogleMapCameraController: React.FC<{
  center: { lat: number; lng: number };
  zoom: number;
}> = ({ center, zoom }) => {
  const map = useMap();
  const prevCenterRef = useRef<{ lat: number; lng: number }>(center);
  const isFirstMountRef = useRef<boolean>(true);

  useEffect(() => {
    if (!map) return;
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      map.panTo(center);
      map.setZoom(zoom);
      return;
    }

    const latDiff = Math.abs(prevCenterRef.current.lat - center.lat);
    const lngDiff = Math.abs(prevCenterRef.current.lng - center.lng);

    if (latDiff > 0.05 || lngDiff > 0.05) {
      prevCenterRef.current = center;
      map.panTo(center);
      map.setZoom(zoom);
    }
  }, [map, center.lat, center.lng, zoom]);

  return null;
};

// Polyline for connecting day stops on Google Maps
const GoogleRoutePolyline: React.FC<{
  stops: TripMapStop[];
}> = ({ stops }) => {
  const map = useMap();
  const polylineRef = useRef<any>(null);

  useEffect(() => {
    if (!map) return;
    const gWindow = typeof window !== 'undefined' ? (window as any).google : undefined;
    if (!gWindow?.maps?.Polyline) return;

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    const coordinates = stops.map((s) => ({ lat: s.lat, lng: s.lng }));

    if (coordinates.length >= 2) {
      polylineRef.current = new gWindow.maps.Polyline({
        path: coordinates,
        geodesic: true,
        strokeColor: '#f59e0b',
        strokeOpacity: 0.85,
        strokeWeight: 3.5,
        icons: [
          {
            icon: {
              path: gWindow.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 2.2,
              fillColor: '#f59e0b',
              fillOpacity: 1,
              strokeWeight: 1,
              strokeColor: '#1c1917',
            },
            offset: '50%',
            repeat: '100px',
          },
        ],
      });
      polylineRef.current.setMap(map);
    }

    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
    };
  }, [map, stops]);

  return null;
};

// Compact Micro Controls for Google Maps
const GoogleMapMicroControls: React.FC<{
  userLocation?: { lat: number; lng: number } | null;
}> = ({ userLocation }) => {
  const map = useMap();
  const [mapType, setMapType] = useState<'roadmap' | 'hybrid'>('roadmap');
  const [isStreetViewActive, setIsStreetViewActive] = useState<boolean>(false);

  useEffect(() => {
    if (!map) return;
    const panorama = map.getStreetView();
    if (!panorama) return;

    const listener = panorama.addListener('visible_changed', () => {
      setIsStreetViewActive(Boolean(panorama.getVisible()));
    });

    return () => {
      listener?.remove();
    };
  }, [map]);

  const handleSetMapType = (type: 'roadmap' | 'hybrid') => {
    setMapType(type);
    if (map) {
      map.setMapTypeId(type);
    }
  };

  const handleToggleStreetView = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!map) return;
    const panorama = map.getStreetView();
    if (!panorama) return;

    if (panorama.getVisible()) {
      panorama.setVisible(false);
    } else {
      const center = map.getCenter();
      if (center) {
        panorama.setPosition({ lat: center.lat(), lng: center.lng() });
        panorama.setPov({ heading: 165, pitch: 0 });
        panorama.setVisible(true);
      }
    }
  };

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!map) return;
    const current = map.getZoom() ?? 14;
    map.setZoom(current + 1);
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!map) return;
    const current = map.getZoom() ?? 14;
    map.setZoom(current - 1);
  };

  const handleRecenter = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (map && userLocation) {
      map.panTo(userLocation);
      map.setZoom(15);
    }
  };

  return (
    <>
      {/* Micro Map / Satellite Toggle (Top-Right) */}
      <div className="absolute top-2 right-2 z-10 select-none">
        <div className="bg-stone-900/90 backdrop-blur-md rounded-lg p-0.5 border border-stone-800 shadow-md flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => handleSetMapType('roadmap')}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold leading-tight transition cursor-pointer ${
              mapType === 'roadmap'
                ? 'bg-amber-500 text-stone-950 shadow-xs'
                : 'text-stone-400 hover:text-white'
            }`}
            title="Mapa callejero estándar"
          >
            Mapa
          </button>
          <button
            type="button"
            onClick={() => handleSetMapType('hybrid')}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold leading-tight transition cursor-pointer ${
              mapType === 'hybrid'
                ? 'bg-amber-500 text-stone-950 shadow-xs'
                : 'text-stone-400 hover:text-white'
            }`}
            title="Vista satélite"
          >
            Satélite
          </button>
        </div>
      </div>

      {/* Micro Action Buttons: Pegman, Location, Zoom (Bottom-Right) */}
      <div className="absolute bottom-3 right-2 z-10 flex flex-col items-center gap-1 select-none">
        {/* Street View Pegman Button */}
        <button
          type="button"
          onClick={handleToggleStreetView}
          className={`w-6.5 h-6.5 rounded-lg border shadow-xs flex items-center justify-center transition cursor-pointer active:scale-95 ${
            isStreetViewActive
              ? 'bg-amber-500 border-amber-400 text-stone-950 ring-2 ring-amber-400/50'
              : 'bg-stone-900/90 hover:bg-stone-800 border-stone-800 text-amber-400'
          }`}
          title={isStreetViewActive ? 'Salir de Street View' : 'Ver vista a pie de calle (Street View)'}
        >
          <PegmanIcon className="w-3.5 h-3.5" />
        </button>

        {/* GPS Recenter */}
        {userLocation && (
          <button
            type="button"
            onClick={handleRecenter}
            className="w-6.5 h-6.5 rounded-lg bg-stone-900/90 hover:bg-stone-800 border border-stone-800 text-sky-400 shadow-xs flex items-center justify-center transition cursor-pointer active:scale-95"
            title="Centrar en mi ubicación GPS"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Micro Zoom Controls */}
        <div className="bg-stone-900/90 backdrop-blur-md rounded-lg border border-stone-800 shadow-xs flex flex-col overflow-hidden">
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-6.5 h-6.5 hover:bg-stone-800 text-stone-300 hover:text-white flex items-center justify-center transition cursor-pointer active:scale-95 border-b border-stone-800/80"
            title="Acercar mapa"
          >
            <Plus className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-6.5 h-6.5 hover:bg-stone-800 text-stone-300 hover:text-white flex items-center justify-center transition cursor-pointer active:scale-95"
            title="Alejar mapa"
          >
            <Minus className="w-3 h-3" />
          </button>
        </div>
      </div>
    </>
  );
};

export const TripInteractiveMap: React.FC<TripInteractiveMapProps> = ({
  center,
  zoom = 13,
  isOnline,
  mapEngine: controlledMapEngine,
  dayNumber = 1,
  dayStops,
  recommendedPois,
  onOpenPoiDetail,
  onAddPoiToDay,
  onRemoveStop,
  className = 'h-[300px] sm:h-[380px]',
  userLocation,
}) => {
  const [internalMapEngine, setInternalMapEngine] = useState<'google' | 'osm'>(() => {
    return isOnline && GOOGLE_MAPS_API_KEY ? 'google' : 'osm';
  });

  const activeEngine = controlledMapEngine || internalMapEngine;

  // Selected place for inline bottom preview card (does not open full modal automatically)
  const [activePlace, setActivePlace] = useState<ActivePlacePreview | null>(null);

  // Auto-sync engine with online state
  useEffect(() => {
    if (!controlledMapEngine) {
      if (isOnline && GOOGLE_MAPS_API_KEY) {
        setInternalMapEngine('google');
      } else {
        setInternalMapEngine('osm');
      }
    }
  }, [isOnline, controlledMapEngine]);

  // Polyline coordinates for OpenStreetMap fallback
  const osmRouteCoordinates = useMemo(() => {
    return dayStops.map((s) => ({
      lat: s.lat,
      lng: s.lng,
      label: `${s.index}. ${s.title}`,
    }));
  }, [dayStops]);

  // Recommended POIs that are not yet added to current day
  const unaddedRecommendedPois = useMemo(() => {
    const stopPoiIds = new Set(dayStops.map((s) => s.poi?.id).filter(Boolean));
    return recommendedPois.filter((p) => !stopPoiIds.has(p.id));
  }, [recommendedPois, dayStops]);

  // If offline or OSM selected, render InteractiveOpenStreetMap
  if (!isOnline || activeEngine === 'osm' || !GOOGLE_MAPS_API_KEY) {
    return (
      <div className="relative w-full h-full">
        <InteractiveOpenStreetMap
          center={center}
          zoom={zoom}
          pois={recommendedPois}
          onSelectPoi={(poi) => {
            const stopMatch = dayStops.find((s) => s.poi?.id === poi.id);
            setActivePlace({
              poi,
              stopId: stopMatch?.stopId,
              nameEs: poi.nameEs,
              nameVi: poi.nameVi,
              category: poi.category,
              rating: poi.rating,
              ticketVnd: poi.ticketVnd,
              openingHours: poi.openingHours,
              isInDay: Boolean(stopMatch),
              dayStopIndex: stopMatch?.index,
              lat: poi.lat,
              lng: poi.lng,
            });
          }}
          className={className}
          routeCoordinates={osmRouteCoordinates}
          userLocation={userLocation}
        />

        {/* Inline Bottom Preview Sheet in OSM */}
        {activePlace && (
          <div className="absolute bottom-2 left-2 right-12 sm:right-auto sm:max-w-xs z-30 animate-fade-in">
            <div className="bg-stone-900/95 backdrop-blur-md border border-stone-800 rounded-2xl p-3 shadow-2xl space-y-2 text-xs text-stone-200">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 font-bold uppercase font-mono">
                      {activePlace.category}
                    </span>
                    {activePlace.isInDay && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                        Parada #{activePlace.dayStopIndex}
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-xs text-white mt-0.5 truncate">
                    {activePlace.nameEs}
                  </h4>
                  <span className="text-[10px] text-stone-400 italic font-serif block truncate">
                    {activePlace.nameVi}
                  </span>
                </div>

                <button
                  onClick={() => setActivePlace(null)}
                  className="p-1 rounded-lg text-stone-400 hover:text-white transition cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-1.5 pt-1">
                {activePlace.isInDay ? (
                  <span className="flex-1 py-1 px-2 rounded-xl bg-stone-800 text-stone-300 text-[11px] font-semibold text-center">
                    ✓ En tu ruta
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      if (activePlace.poi && onAddPoiToDay) {
                        onAddPoiToDay(activePlace.poi);
                        setActivePlace(null);
                      }
                    }}
                    className="flex-1 py-1.5 px-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-[11px] flex items-center justify-center gap-1 transition cursor-pointer active:scale-95 shadow-sm"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Añadir al Día {dayNumber}</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    if (activePlace.poi) {
                      onOpenPoiDetail(activePlace.poi);
                    }
                  }}
                  className="py-1.5 px-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                >
                  <span>Ficha</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Google Maps (Online default)
  return (
    <div className={`relative w-full rounded-2xl overflow-hidden bg-stone-950 border border-stone-800/80 ${className}`}>
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['marker']}>
        <Map
          mapId="TRIP_GOOGLE_MAP_ID"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          defaultCenter={center}
          defaultZoom={zoom}
          gestureHandling="greedy"
          disableDefaultUI={true}
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={false}
          zoomControl={false}
          style={{ width: '100%', height: '100%' }}
          onClick={() => setActivePlace(null)}
        >
          {/* Camera Controller */}
          <GoogleMapCameraController center={center} zoom={zoom} />

          {/* Route Polyline connecting day stops */}
          <GoogleRoutePolyline stops={dayStops} />

          {/* Compact Micro Controls (Map/Sat, Pegman Street View, Zoom & GPS) */}
          <GoogleMapMicroControls userLocation={userLocation} />

          {/* 1. Sleek Numbered Circular Badges for Day Stops (Without diamond/rombo) */}
          {dayStops.map((stop) => (
            <AdvancedMarker
              key={stop.stopId}
              position={{ lat: stop.lat, lng: stop.lng }}
              onClick={(e) => {
                if (e && e.domEvent && typeof e.domEvent.stopPropagation === 'function') {
                  e.domEvent.stopPropagation();
                }
                setActivePlace({
                  poi: stop.poi,
                  stopId: stop.stopId,
                  nameEs: stop.title,
                  nameVi: stop.vietnameseTitle || '',
                  category: stop.poi?.category || 'Parada',
                  rating: stop.poi?.rating,
                  ticketVnd: stop.ticketVnd || 0,
                  openingHours: stop.poi?.openingHours,
                  isInDay: true,
                  dayStopIndex: stop.index,
                  lat: stop.lat,
                  lng: stop.lng,
                });
              }}
              title={`${stop.index}. ${stop.title}`}
            >
              <div className="cursor-pointer transition-transform hover:scale-115 active:scale-95">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] font-mono shadow-md border ${
                    stop.isVisited
                      ? 'bg-emerald-500 text-stone-950 border-emerald-300'
                      : 'bg-amber-500 text-stone-950 border-stone-900 ring-2 ring-amber-400/40'
                  }`}
                >
                  {stop.isVisited ? '✓' : stop.index}
                </div>
              </div>
            </AdvancedMarker>
          ))}

          {/* 2. Micro Markers for Recommended POIs in the City (Unadded) */}
          {unaddedRecommendedPois.map((poi) => (
            <AdvancedMarker
              key={poi.id}
              position={{ lat: poi.lat, lng: poi.lng }}
              onClick={(e) => {
                if (e && e.domEvent && typeof e.domEvent.stopPropagation === 'function') {
                  e.domEvent.stopPropagation();
                }
                setActivePlace({
                  poi,
                  nameEs: poi.nameEs,
                  nameVi: poi.nameVi,
                  category: poi.category,
                  rating: poi.rating,
                  ticketVnd: poi.ticketVnd,
                  openingHours: poi.openingHours,
                  isInDay: false,
                  lat: poi.lat,
                  lng: poi.lng,
                });
              }}
              title={poi.nameEs}
            >
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-stone-900/90 text-amber-400 border border-amber-500/50 shadow-sm hover:scale-115 transition cursor-pointer">
                <MapPin className="w-3 h-3" />
              </div>
            </AdvancedMarker>
          ))}

          {/* 3. User Location GPS Marker */}
          {userLocation && (
            <AdvancedMarker position={userLocation}>
              <div className="relative flex items-center justify-center">
                <div className="w-3.5 h-3.5 rounded-full bg-sky-500 border-2 border-white shadow-md animate-pulse" />
                <div className="absolute w-7 h-7 rounded-full bg-sky-500/30 animate-ping pointer-events-none" />
              </div>
            </AdvancedMarker>
          )}
        </Map>
      </APIProvider>

      {/* Inline Bottom Preview Sheet (Does not block full screen or open large modal automatically) */}
      {activePlace && (
        <div className="absolute bottom-2 left-2 right-12 sm:right-auto sm:max-w-xs z-20 animate-fade-in">
          <div className="bg-stone-900/95 backdrop-blur-md border border-stone-800 rounded-2xl p-3 shadow-2xl space-y-2 text-xs text-stone-200">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 font-bold uppercase font-mono">
                    {activePlace.category}
                  </span>
                  {activePlace.rating && (
                    <span className="text-[10px] text-stone-400 font-mono">★ {activePlace.rating}</span>
                  )}
                  {activePlace.isInDay && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                      Parada #{activePlace.dayStopIndex}
                    </span>
                  )}
                </div>
                <h4 className="font-bold text-xs text-white mt-0.5 truncate">
                  {activePlace.nameEs}
                </h4>
                <span className="text-[10px] text-stone-400 italic font-serif block truncate">
                  {activePlace.nameVi}
                </span>
              </div>

              <button
                onClick={() => setActivePlace(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition cursor-pointer shrink-0"
                title="Cerrar vista previa"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-3 text-[10px] text-stone-300 pt-0.5 border-t border-stone-800/60">
              <span>
                🎟️ {activePlace.ticketVnd > 0 ? `${(activePlace.ticketVnd / 1000).toLocaleString('es-ES')}k ₫` : 'Gratis'}
              </span>
              {activePlace.openingHours && (
                <span className="truncate">⏰ {activePlace.openingHours}</span>
              )}
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-1.5 pt-0.5">
              {activePlace.isInDay ? (
                <button
                  onClick={() => {
                    if (activePlace.stopId && onRemoveStop) {
                      onRemoveStop(activePlace.stopId);
                      setActivePlace(null);
                    }
                  }}
                  className="flex-1 py-1 px-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-rose-300 text-[11px] font-semibold flex items-center justify-center gap-1 transition cursor-pointer"
                >
                  <span>✓ En ruta (Quitar)</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (activePlace.poi && onAddPoiToDay) {
                      onAddPoiToDay(activePlace.poi);
                      setActivePlace(null);
                    }
                  }}
                  className="flex-1 py-1.5 px-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-[11px] flex items-center justify-center gap-1 transition cursor-pointer active:scale-95 shadow-sm"
                >
                  <Plus className="w-3 h-3" />
                  <span>Añadir al Día {dayNumber}</span>
                </button>
              )}

              {activePlace.poi && (
                <button
                  onClick={() => {
                    if (activePlace.poi) {
                      onOpenPoiDetail(activePlace.poi);
                    }
                  }}
                  className="py-1.5 px-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 border border-stone-700 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer active:scale-95"
                  title="Abrir ficha completa con recomendaciones, horarios y Grab"
                >
                  <span>Ficha</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
