import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps';
import {
  Map as MapLibreMap,
  Marker as MapLibreMarker,
  Popup as MapLibrePopup,
  AttributionControl as MapLibreAttributionControl,
} from 'maplibre-gl';
import '../utils/maplibreWorker';
import { RestaurantItem, RestaurantScoreBreakdown } from '../types';
import {
  Layers,
  Crosshair,
  Navigation,
  Star,
  ExternalLink,
  UtensilsCrossed,
  Volume2,
  ZoomIn,
  ZoomOut,
  Compass,
  BookOpen,
  Plus,
  Minus,
  RefreshCw,
} from 'lucide-react';
import { speakVietnamese } from '../utils/storage';

export type VectorTileStyle = 'liberty' | 'positron' | 'bright';

export interface RestaurantTheme {
  bg: string;
  text: string;
  border: string;
  hex: string;
  borderHex: string;
}

export function getRestaurantTheme(index: number, priceTier: number): RestaurantTheme {
  if (index === 0) {
    return {
      bg: 'bg-amber-500',
      text: 'text-stone-950',
      border: 'border-amber-300',
      hex: '#f59e0b',
      borderHex: '#d97706',
    };
  }
  if (priceTier === 1) {
    return {
      bg: 'bg-emerald-600',
      text: 'text-white',
      border: 'border-emerald-300',
      hex: '#059669',
      borderHex: '#047857',
    };
  }
  if (priceTier === 2) {
    return {
      bg: 'bg-sky-600',
      text: 'text-white',
      border: 'border-sky-300',
      hex: '#0284c7',
      borderHex: '#0369a1',
    };
  }
  return {
    bg: 'bg-purple-700',
    text: 'text-white',
    border: 'border-purple-300',
    hex: '#7c3aed',
    borderHex: '#6d28d9',
  };
}

const GOOGLE_MAPS_API_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_MAPS_API_KEY) || '';

const OPENFREEMAP_STYLES: Record<
  VectorTileStyle,
  { name: string; url: string }
> = {
  liberty: {
    name: 'Libre',
    url: 'https://tiles.openfreemap.org/styles/liberty',
  },
  positron: {
    name: 'Claro',
    url: 'https://tiles.openfreemap.org/styles/positron',
  },
  bright: {
    name: 'Urbano',
    url: 'https://tiles.openfreemap.org/styles/bright',
  },
};

interface RestaurantScoredEntry {
  restaurant: RestaurantItem;
  breakdown: RestaurantScoreBreakdown;
}

interface RestaurantMapProps {
  center: { lat: number; lng: number };
  zoom?: number;
  items: RestaurantScoredEntry[];
  selectedRestaurantId?: string | null;
  onSelectRestaurant: (restaurant: RestaurantItem) => void;
  onDeselectRestaurant?: () => void;
  onViewMenu?: (restaurant: RestaurantItem) => void;
  userLocation?: { lat: number; lng: number; accuracy?: number } | null;
  userLocationLabel?: string;
  isLiveTracking?: boolean;
  onToggleLiveTracking?: () => void;
  className?: string;
}

// Controller component to smoothly pan/zoom Google Map on center or item change
const GoogleMapCameraController: React.FC<{
  center: { lat: number; lng: number };
  zoom: number;
  selectedLocation: { lat: number; lng: number } | null;
  onMapReady?: () => void;
}> = ({ center, zoom, selectedLocation, onMapReady }) => {
  const map = useMap();
  const prevCenterRef = useRef<{ lat: number; lng: number }>(center);
  const prevZoomRef = useRef<number>(zoom);

  // When map mounts or when city center / zoom changes
  useEffect(() => {
    if (!map) return;
    onMapReady?.();
    map.panTo(center);
    if (typeof zoom === 'number') {
      map.setZoom(zoom);
    }
    prevCenterRef.current = center;
    prevZoomRef.current = zoom;
  }, [map, center.lat, center.lng, zoom, onMapReady]);

  // When a restaurant is selected
  useEffect(() => {
    if (!map || !selectedLocation) return;
    map.panTo(selectedLocation);
    const currentZoom = map.getZoom() || 14;
    // Zoom in smoothly if currently zoomed out, but NEVER force zoom out if user zoomed closer
    if (currentZoom < 16) {
      map.setZoom(16);
    }
  }, [map, selectedLocation?.lat, selectedLocation?.lng]);

  return null;
};

// Pegman SVG Icon (Official Google yellow silhouette)
const PegmanIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
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

// Compact custom controls for Google Maps (Micro Mapa/Satélite, Pegman Street View & Micro Zoom +/-)
const GoogleMapCustomControls: React.FC<{
  userLocation?: { lat: number; lng: number; accuracy?: number } | null;
  selectedLocation?: { lat: number; lng: number } | null;
  isLiveTracking?: boolean;
  onToggleLiveTracking?: () => void;
}> = ({ userLocation, selectedLocation, isLiveTracking, onToggleLiveTracking }) => {
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
      const pos = selectedLocation || (center ? { lat: center.lat(), lng: center.lng() } : null);
      if (pos) {
        panorama.setPosition(pos);
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

  const handleRecenterUser = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!map || !userLocation) return;
    map.panTo(userLocation);
    map.setZoom(16);
  };

  return (
    <>
      {/* Sleek, Micro Map/Satellite Toggle (Top-Left) */}
      <div className="absolute top-2.5 left-2.5 z-10 select-none">
        <div className="bg-white/95 backdrop-blur-md rounded-lg p-0.5 border border-stone-200/90 shadow-xs flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => handleSetMapType('roadmap')}
            className={`px-2 py-0.5 rounded text-[11px] font-bold leading-tight transition cursor-pointer ${
              mapType === 'roadmap'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
            title="Mapa callejero estándar"
          >
            Mapa
          </button>
          <button
            type="button"
            onClick={() => handleSetMapType('hybrid')}
            className={`px-2 py-0.5 rounded text-[11px] font-bold leading-tight transition cursor-pointer ${
              mapType === 'hybrid'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
            title="Vista satélite con nombres de calles"
          >
            Satélite
          </button>
        </div>
      </div>

      {/* Sleek, Micro Zoom, Pegman & Location Controls (Bottom-Right, above attribution) */}
      <div className="absolute bottom-6 right-2.5 z-10 flex flex-col items-center gap-1.5 select-none">
        {onToggleLiveTracking ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleLiveTracking();
            }}
            className={`w-7 h-7 rounded-lg border shadow-xs flex items-center justify-center transition cursor-pointer active:scale-95 ${
              isLiveTracking
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md ring-2 ring-emerald-300'
                : userLocation
                ? 'bg-white/95 hover:bg-white text-sky-600 border-stone-200/90'
                : 'bg-white/95 hover:bg-white text-stone-600 border-stone-200/90'
            }`}
            title={isLiveTracking ? 'Rastreo GPS en tiempo real activo (Haz clic para pausar)' : 'Activar GPS en tiempo real'}
          >
            <Crosshair className={`w-3.5 h-3.5 ${isLiveTracking ? 'animate-spin' : ''}`} />
          </button>
        ) : userLocation ? (
          <button
            type="button"
            onClick={handleRecenterUser}
            className="w-7 h-7 rounded-lg bg-white/95 hover:bg-white text-sky-600 border border-stone-200/90 shadow-xs flex items-center justify-center transition cursor-pointer active:scale-95"
            title="Centrar en mi ubicación"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>
        ) : null}

        {/* Muñeco de Street View situado encima de los botones de zoom */}
        <button
          type="button"
          onClick={handleToggleStreetView}
          className={`w-7 h-7 rounded-lg bg-white/95 hover:bg-white border shadow-xs flex items-center justify-center transition cursor-pointer active:scale-95 ${
            isStreetViewActive
              ? 'bg-amber-100 border-amber-400 text-amber-600 ring-2 ring-amber-400'
              : 'border-stone-200/90 text-amber-500 hover:text-amber-600'
          }`}
          title={isStreetViewActive ? 'Salir de Street View' : 'Ver Street View a pie de calle'}
        >
          <PegmanIcon className="w-4 h-4" />
        </button>

        {/* Controles de Zoom (+ / -) */}
        <div className="bg-white/95 backdrop-blur-md rounded-lg border border-stone-200/90 shadow-xs flex flex-col overflow-hidden">
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-7 h-7 hover:bg-stone-100 text-stone-700 hover:text-stone-950 flex items-center justify-center transition cursor-pointer active:scale-95 border-b border-stone-100"
            title="Acercar mapa"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-7 h-7 hover:bg-stone-100 text-stone-700 hover:text-stone-950 flex items-center justify-center transition cursor-pointer active:scale-95"
            title="Alejar mapa"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </>
  );
};

// MapLibre GL Vector Map (OpenFreeMap vector tiles - No CARTO / No API Key required)
const MapLibreRestaurantMap: React.FC<RestaurantMapProps> = ({
  center,
  zoom = 14,
  items,
  selectedRestaurantId,
  onSelectRestaurant,
  onDeselectRestaurant,
  onViewMenu,
  userLocation,
  userLocationLabel = 'Tu ubicación actual',
  isLiveTracking,
  onToggleLiveTracking,
  className = 'h-[320px] sm:h-[440px]',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<MapLibreMarker[]>([]);
  const userMarkerRef = useRef<MapLibreMarker | null>(null);
  const [vectorStyle, setVectorStyle] = useState<VectorTileStyle>('liberty');
  const prevCenterRef = useRef<{ lat: number; lng: number }>(center);
  const isFirstMountRef = useRef(true);

  // Initialize MapLibre GL
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: OPENFREEMAP_STYLES[vectorStyle].url,
      center: [center.lng, center.lat],
      zoom: zoom,
      cooperativeGestures: false,
      attributionControl: false,
    });

    mapRef.current = map;

    map.addControl(
      new MapLibreAttributionControl({
        compact: true,
        customAttribution: '© <a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OSM</a>',
      }),
      'bottom-right'
    );

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update style
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(OPENFREEMAP_STYLES[vectorStyle].url);
  }, [vectorStyle]);

  // Center change - ONLY when city center truly changes, preserving zoom otherwise
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }
    const centerChanged =
      Math.abs(prevCenterRef.current.lat - center.lat) > 0.0001 ||
      Math.abs(prevCenterRef.current.lng - center.lng) > 0.0001;

    if (centerChanged) {
      prevCenterRef.current = center;
      map.easeTo({
        center: [center.lng, center.lat],
        zoom: zoom,
        duration: 800,
      });
    }
  }, [center.lat, center.lng, zoom]);

  // Auto-center & focus on selected restaurant
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedRestaurantId) return;

    const match = items.find((e) => e.restaurant.id === selectedRestaurantId);
    if (match) {
      map.easeTo({
        center: [match.restaurant.lng, match.restaurant.lat],
        zoom: Math.max(map.getZoom(), 16),
        duration: 700,
      });
    }
    // When selectedRestaurantId is null (closed), we intentionally do NOT reset center or zoom!
  }, [selectedRestaurantId, items]);

  // Update Markers with matching numbers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    items.forEach((entry, index) => {
      const { restaurant } = entry;
      const isSelected = selectedRestaurantId === restaurant.id;
      const isTop1 = index === 0;
      const number = index + 1;
      const theme = getRestaurantTheme(index, restaurant.priceTier);

      const el = document.createElement('div');
      el.className = `cursor-pointer transition-all duration-200 flex flex-col items-center select-none ${
        isSelected ? 'scale-125 z-50' : 'hover:scale-115'
      }`;

      el.innerHTML = `
        <div class="w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-xs shadow-md transition-all ${
          isSelected
            ? 'bg-amber-500 border-white text-stone-950 ring-4 ring-amber-400 shadow-xl scale-110'
            : `${theme.bg} ${theme.border} ${theme.text}`
        }">
          <span>${isTop1 ? '👑 1' : number}</span>
        </div>
        <div class="w-2 h-2 rotate-45 -mt-1 shadow-xs ${
          isSelected ? 'bg-amber-500' : theme.bg
        }"></div>
      `;

      el.addEventListener('click', () => {
        onSelectRestaurant(restaurant);
        map.easeTo({ center: [restaurant.lng, restaurant.lat], zoom: 16, duration: 800 });

        // Scroll the list card into view smoothly
        const cardEl = document.getElementById(`restaurant-card-${restaurant.id}`);
        if (cardEl) {
          cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });

      const popup = new MapLibrePopup({
        offset: 20,
        closeButton: true,
        className: 'custom-maplibre-tooltip',
      }).setHTML(`
        <div style="font-family: inherit; padding: 4px; color: #1c1917; min-width: 180px;">
          <div style="font-weight: 800; font-size: 13px; color: #1c1917;">
            #${number} ${restaurant.name}
          </div>
          <div style="font-size: 11px; color: #b45309; font-weight: 700; margin-top: 1px;">
            ★ ${restaurant.rating.toFixed(1)} (${restaurant.reviewsCount.toLocaleString()} opiniones)
          </div>
          <div style="font-size: 11px; color: #047857; margin-top: 3px; font-weight: 600;">
            🍲 ${restaurant.mustOrderDish}
          </div>
          <div style="font-size: 10px; color: #78716c; margin-top: 2px;">
            ${(restaurant.avgPriceVnd / 1000).toLocaleString('es-ES')}k ₫ • ${restaurant.district}
          </div>
          <button id="maplibre-menu-btn-${restaurant.id}" style="margin-top: 8px; width: 100%; background: #f59e0b; color: #0c0a09; border: none; border-radius: 8px; padding: 6px 8px; font-weight: 800; font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
            📖 Ver Carta & Fotos
          </button>
        </div>
      `);

      // Wire popup open to attach event handler to the Ver Carta button
      popup.on('open', () => {
        const btn = document.getElementById(`maplibre-menu-btn-${restaurant.id}`);
        if (btn) {
          btn.onclick = (e) => {
            e.stopPropagation();
            onViewMenu?.(restaurant);
          };
        }
      });

      const marker = new MapLibreMarker({ element: el, anchor: 'bottom' })
        .setLngLat([restaurant.lng, restaurant.lat])
        .setPopup(popup)
        .addTo(map);

      // Listen for popup close to gracefully deselect without changing zoom
      popup.on('close', () => {
        onDeselectRestaurant?.();
      });

      // Open popup automatically if selected
      if (isSelected) {
        popup.addTo(map);
      }

      markersRef.current.push(marker);
    });
  }, [items, selectedRestaurantId, onSelectRestaurant, onDeselectRestaurant, onViewMenu]);

  // Render User Location
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!userLocation) {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      return;
    }

    if (!userMarkerRef.current) {
      const userEl = document.createElement('div');
      userEl.className = 'relative flex items-center justify-center pointer-events-none';
      userEl.innerHTML = `
        <div class="absolute -inset-3 bg-sky-400/40 rounded-full animate-ping"></div>
        <div class="absolute -inset-1.5 bg-sky-500/30 rounded-full animate-pulse"></div>
        <div class="w-4 h-4 bg-sky-500 rounded-full border-2 border-white shadow-lg relative z-10 flex items-center justify-center">
          <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
        </div>
      `;

      const marker = new MapLibreMarker({ element: userEl, anchor: 'center' })
        .setLngLat([userLocation.lng, userLocation.lat])
        .addTo(map);

      userMarkerRef.current = marker;
    } else {
      userMarkerRef.current.setLngLat([userLocation.lng, userLocation.lat]);
    }
  }, [userLocation]);

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border border-stone-200 bg-stone-900 ${className}`}>
      <div ref={containerRef} className="w-full h-full z-0" />

      {/* Subtle Vector Style Selector */}
      <div className="absolute top-2.5 left-2.5 z-10 select-none">
        <div className="bg-white/95 backdrop-blur-md rounded-lg p-0.5 border border-stone-200/90 shadow-xs flex items-center gap-0.5 text-[11px]">
          {(['liberty', 'positron', 'bright'] as VectorTileStyle[]).map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => setVectorStyle(style)}
              className={`px-2 py-0.5 rounded text-[11px] font-bold leading-tight transition cursor-pointer capitalize ${
                vectorStyle === style
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              {OPENFREEMAP_STYLES[style].name}
            </button>
          ))}
        </div>
      </div>

      {/* Sleek, Micro Zoom & Location Controls for MapLibre */}
      <div className="absolute bottom-6 right-2.5 z-10 flex flex-col items-center gap-1.5 select-none">
        {onToggleLiveTracking ? (
          <button
            type="button"
            onClick={onToggleLiveTracking}
            className={`w-7 h-7 rounded-lg border shadow-xs flex items-center justify-center transition cursor-pointer active:scale-95 ${
              isLiveTracking
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md ring-2 ring-emerald-300'
                : userLocation
                ? 'bg-white/95 hover:bg-white text-sky-600 border-stone-200/90'
                : 'bg-white/95 hover:bg-white text-stone-600 border-stone-200/90'
            }`}
            title={isLiveTracking ? 'Rastreo GPS en tiempo real activo (Haz clic para pausar)' : 'Activar GPS en tiempo real'}
          >
            <Crosshair className={`w-3.5 h-3.5 ${isLiveTracking ? 'animate-spin' : ''}`} />
          </button>
        ) : userLocation ? (
          <button
            type="button"
            onClick={() => {
              mapRef.current?.easeTo({
                center: [userLocation.lng, userLocation.lat],
                zoom: 16,
              });
            }}
            className="w-7 h-7 rounded-lg bg-white/95 hover:bg-white text-sky-600 border border-stone-200/90 shadow-xs flex items-center justify-center transition cursor-pointer active:scale-95"
            title="Centrar en mi ubicación"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>
        ) : null}

        {/* Muñeco de Street View encima de los botones de zoom */}
        <a
          href={(() => {
            const target = selectedRestaurantId
              ? items.find((i) => i.restaurant.id === selectedRestaurantId)?.restaurant
              : null;
            const lat = target ? target.lat : (mapRef.current?.getCenter().lat ?? center.lat);
            const lng = target ? target.lng : (mapRef.current?.getCenter().lng ?? center.lng);
            return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
          })()}
          target="_blank"
          rel="noopener noreferrer"
          className="w-7 h-7 rounded-lg bg-white/95 hover:bg-white text-amber-500 hover:text-amber-600 border border-stone-200/90 shadow-xs flex items-center justify-center transition cursor-pointer active:scale-95"
          title="Ver Street View a pie de calle"
        >
          <PegmanIcon className="w-4 h-4" />
        </a>

        <div className="bg-white/95 backdrop-blur-md rounded-lg border border-stone-200/90 shadow-xs flex flex-col overflow-hidden">
          <button
            type="button"
            onClick={() => mapRef.current?.zoomIn()}
            className="w-7 h-7 hover:bg-stone-100 text-stone-700 hover:text-stone-950 flex items-center justify-center transition cursor-pointer active:scale-95 border-b border-stone-100"
            title="Acercar mapa"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => mapRef.current?.zoomOut()}
            className="w-7 h-7 hover:bg-stone-100 text-stone-700 hover:text-stone-950 flex items-center justify-center transition cursor-pointer active:scale-95"
            title="Alejar mapa"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Export: Official Google Maps Platform with OpenFreeMap Vector Fallback
export const RestaurantMap: React.FC<RestaurantMapProps> = (props) => {
  const {
    center,
    zoom = 14,
    items,
    selectedRestaurantId,
    onSelectRestaurant,
    onDeselectRestaurant,
    onViewMenu,
    userLocation,
    userLocationLabel = 'Tu ubicación actual',
    className = 'h-[440px]',
  } = props;

  const [activeInfoWindowItem, setActiveInfoWindowItem] = useState<RestaurantItem | null>(null);

  // Keep activeInfoWindowItem in sync with selectedRestaurantId if selected externally
  useEffect(() => {
    if (selectedRestaurantId) {
      const match = items.find((e) => e.restaurant.id === selectedRestaurantId);
      if (match) {
        setActiveInfoWindowItem(match.restaurant);
      }
    } else {
      setActiveInfoWindowItem(null);
    }
  }, [selectedRestaurantId, items]);

  const selectedLocation = useMemo(() => {
    if (activeInfoWindowItem) {
      return { lat: activeInfoWindowItem.lat, lng: activeInfoWindowItem.lng };
    }
    return null;
  }, [activeInfoWindowItem]);

  const [isMapReady, setIsMapReady] = useState<boolean>(false);
  const [useVectorFallback, setUseVectorFallback] = useState<boolean>(false);

  // Safety fallback: if Google Maps hasn't initialized in 6 seconds, fallback to vector tiles
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) return;
    const timer = setTimeout(() => {
      if (!isMapReady) {
        setUseVectorFallback(true);
      }
    }, 6000);
    return () => clearTimeout(timer);
  }, [isMapReady]);

  // If no Google Maps API key or vector fallback triggered, seamlessly render vector map
  if (!GOOGLE_MAPS_API_KEY || useVectorFallback) {
    return <MapLibreRestaurantMap {...props} />;
  }

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border border-stone-200/90 shadow-xs bg-stone-100 ${className}`}>
      {/* Loading Overlay while Google Maps tiles and markers initialize */}
      {!isMapReady && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-stone-100/90 backdrop-blur-xs transition-opacity duration-300">
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white shadow-md border border-stone-200">
            <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
            <span className="text-xs font-semibold text-stone-700">Cargando mapa interactivo...</span>
          </div>
        </div>
      )}

      {/* Google Maps React API Provider */}
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['marker']}>
        <Map
          mapId="DEMO_MAP_ID"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          defaultCenter={{ lat: center.lat, lng: center.lng }}
          defaultZoom={zoom}
          onTilesLoaded={() => setIsMapReady(true)}
          gestureHandling="greedy"
          disableDefaultUI={false}
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={false}
          zoomControl={false}
          style={{ width: '100%', height: '100%' }}
        >
          {/* Smooth Camera Controller */}
          <GoogleMapCameraController
            center={center}
            zoom={zoom}
            selectedLocation={selectedLocation}
            onMapReady={() => setIsMapReady(true)}
          />

          {/* Compact Custom Controls (Micro Mapa/Satélite, Pegman Street View & Micro Zoom +/-) */}
          <GoogleMapCustomControls
            userLocation={userLocation}
            selectedLocation={selectedLocation}
            isLiveTracking={props.isLiveTracking}
            onToggleLiveTracking={props.onToggleLiveTracking}
          />

          {/* Restaurant Pins */}
          {items.map((entry, index) => {
            const { restaurant } = entry;
            const isSelected =
              selectedRestaurantId === restaurant.id ||
              activeInfoWindowItem?.id === restaurant.id;
            const isTop1 = index === 0;
            const number = index + 1;
            const theme = getRestaurantTheme(index, restaurant.priceTier);

            return (
              <AdvancedMarker
                key={restaurant.id}
                position={{ lat: restaurant.lat, lng: restaurant.lng }}
                title={`#${number} ${restaurant.name} (${restaurant.nameVi}) - ★${restaurant.rating.toFixed(1)}`}
                zIndex={isSelected ? 100 : isTop1 ? 50 : 20 + (items.length - index)}
                onClick={() => {
                  setActiveInfoWindowItem(restaurant);
                  onSelectRestaurant(restaurant);
                  const cardEl = document.getElementById(`restaurant-card-${restaurant.id}`);
                  if (cardEl) {
                    cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }
                }}
              >
                <div
                  className={`relative flex flex-col items-center cursor-pointer transition-all duration-200 select-none ${
                    isSelected ? 'scale-125 z-50' : 'hover:scale-115'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-xs shadow-md transition-all ${
                      isSelected
                        ? 'bg-amber-500 border-white text-stone-950 ring-4 ring-amber-400 shadow-xl scale-110'
                        : `${theme.bg} ${theme.border} ${theme.text}`
                    }`}
                  >
                    <span>{isTop1 ? '👑 1' : number}</span>
                  </div>
                  <div
                    className={`w-2 h-2 rotate-45 -mt-1 shadow-xs ${
                      isSelected ? 'bg-amber-500' : theme.bg
                    }`}
                  />
                </div>
              </AdvancedMarker>
            );
          })}

          {/* Active InfoWindow */}
          {activeInfoWindowItem && (
            <InfoWindow
              position={{
                lat: activeInfoWindowItem.lat,
                lng: activeInfoWindowItem.lng,
              }}
              onCloseClick={() => {
                setActiveInfoWindowItem(null);
                onDeselectRestaurant?.();
              }}
              headerContent={
                <div className="flex items-center gap-1.5 font-bold text-xs text-stone-900 pr-2">
                  <UtensilsCrossed className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="truncate max-w-[180px]">{activeInfoWindowItem.name}</span>
                </div>
              }
            >
              <div className="p-1 space-y-2 text-xs max-w-[240px]">
                <div className="flex items-center justify-between gap-1 text-[11px] text-stone-600">
                  <div className="flex items-center gap-1">
                    <span className="italic">{activeInfoWindowItem.nameVi}</span>
                    <button
                      type="button"
                      onClick={() => speakVietnamese(activeInfoWindowItem.nameVi)}
                      className="text-amber-600 hover:text-amber-800 p-0.5 cursor-pointer"
                      title="Pronunciación"
                    >
                      <Volume2 className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-0.5 font-bold text-amber-700">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                    <span>{activeInfoWindowItem.rating.toFixed(1)}</span>
                  </div>
                </div>

                <div className="p-1.5 rounded-lg bg-amber-50 text-[11px] text-amber-900 font-medium">
                  <strong>🍲 Pedir:</strong> {activeInfoWindowItem.mustOrderDish}
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono font-bold text-stone-800">
                    {(activeInfoWindowItem.avgPriceVnd / 1000).toLocaleString('es-ES')}k ₫
                  </span>
                  <span className="text-stone-400">{activeInfoWindowItem.district}</span>
                </div>

                <div className="pt-1 border-t border-stone-100 flex items-center justify-between gap-1.5">
                  <button
                    type="button"
                    onClick={() => onViewMenu?.(activeInfoWindowItem)}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-[11px] flex items-center justify-center gap-1 transition cursor-pointer shadow-xs"
                  >
                    <BookOpen className="w-3 h-3" />
                    <span>Ver Carta</span>
                  </button>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${activeInfoWindowItem.lat},${activeInfoWindowItem.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-1.5 px-2.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-semibold text-[11px] flex items-center justify-center gap-1 transition"
                  >
                    <Navigation className="w-3 h-3 text-sky-400" />
                    <span>Ruta</span>
                  </a>
                </div>
              </div>
            </InfoWindow>
          )}

          {/* User GPS Location Marker */}
          {userLocation && (
            <AdvancedMarker position={userLocation} title={userLocationLabel}>
              <div className="relative flex items-center justify-center">
                <div className="w-4 h-4 bg-sky-500 rounded-full border-2 border-white shadow-xl z-10 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                </div>
                <div className="absolute -inset-3 bg-sky-400/40 rounded-full animate-ping" />
                <div className="absolute -inset-2 bg-sky-500/30 rounded-full animate-pulse" />
              </div>
            </AdvancedMarker>
          )}
        </Map>
      </APIProvider>
    </div>
  );
};
