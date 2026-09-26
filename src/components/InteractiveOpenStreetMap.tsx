import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Map as MapLibreMap,
  Marker as MapLibreMarker,
  Popup as MapLibrePopup,
  AttributionControl as MapLibreAttributionControl,
  LngLatBounds as MapLibreLngLatBounds,
} from 'maplibre-gl';
import '../utils/maplibreWorker';
import { PointOfInterest } from '../types';
import { Layers, Crosshair, ZoomIn, ZoomOut, Compass, Navigation2, Sparkles } from 'lucide-react';

export type VectorMapStyle = 'liberty' | 'positron' | 'bright';

const VECTOR_STYLES: Record<
  VectorMapStyle,
  { name: string; url: string; description: string }
> = {
  liberty: {
    name: 'Libre',
    url: 'https://tiles.openfreemap.org/styles/liberty',
    description: 'Estilo completo y detallado de OpenFreeMap',
  },
  positron: {
    name: 'Claro',
    url: 'https://tiles.openfreemap.org/styles/positron',
    description: 'Estilo minimalista de alto contraste',
  },
  bright: {
    name: 'Urbano',
    url: 'https://tiles.openfreemap.org/styles/bright',
    description: 'Estilo urbano con calles y edificios destacados',
  },
};

interface InteractiveOpenStreetMapProps {
  center: { lat: number; lng: number };
  zoom?: number;
  pois: PointOfInterest[];
  selectedPoiId?: string | null;
  onSelectPoi: (poi: PointOfInterest) => void;
  userLocation?: { lat: number; lng: number; accuracy?: number } | null;
  userLocationLabel?: string;
  selectedLocationTarget?: { lat: number; lng: number } | null;
  poiInclusionLookup?: (id: string) => { inPlan: boolean; occurrences: Array<{ dayNumber: number; dayId: string }> };
  selectedDayId?: string;
  className?: string;
  routePolyline?: Array<{ lat: number; lng: number; stopIndex?: number; title?: string }>;
  routeCoordinates?: Array<{ lat: number; lng: number; label?: string }>;
}

export const InteractiveOpenStreetMap: React.FC<InteractiveOpenStreetMapProps> = ({
  center,
  zoom = 13,
  pois,
  selectedPoiId,
  onSelectPoi,
  userLocation,
  userLocationLabel = 'Tu ubicación actual',
  selectedLocationTarget,
  poiInclusionLookup,
  selectedDayId,
  className = 'h-[320px] sm:h-[460px]',
  routePolyline,
  routeCoordinates,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<MapLibreMarker[]>([]);
  const userMarkerRef = useRef<MapLibreMarker | null>(null);

  const [vectorStyle, setVectorStyle] = useState<VectorMapStyle>('liberty');
  const [currentZoom, setCurrentZoom] = useState<number>(zoom);
  const [isStyleLoaded, setIsStyleLoaded] = useState<boolean>(false);

  const activeRoute = useMemo(() => {
    return routePolyline || (routeCoordinates ? routeCoordinates.map((c, i) => ({
      lat: c.lat,
      lng: c.lng,
      stopIndex: i + 1,
      title: c.label,
    })) : undefined);
  }, [routePolyline, routeCoordinates]);

  // Initialize MapLibre GL Map with OpenFreeMap vector tiles
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: VECTOR_STYLES[vectorStyle].url,
      center: [center.lng, center.lat],
      zoom: zoom,
      cooperativeGestures: false,
      attributionControl: false,
    });

    mapRef.current = map;

    // Add subtle attribution in bottom right
    map.addControl(
      new MapLibreAttributionControl({
        compact: true,
        customAttribution: '© <a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OSM</a>',
      }),
      'bottom-right'
    );

    map.on('style.load', () => {
      setIsStyleLoaded(true);
    });

    map.on('zoomend', () => {
      setCurrentZoom(Math.round(map.getZoom() * 10) / 10);
    });

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

  // Handle Style Switching
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    setIsStyleLoaded(false);
    map.setStyle(VECTOR_STYLES[vectorStyle].url);
  }, [vectorStyle]);

  const prevCenterRef = useRef<{ lat: number; lng: number }>(center);

  // Handle Center / Target Location Pan without unwanted zoom out
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (selectedLocationTarget) {
      map.flyTo({
        center: [selectedLocationTarget.lng, selectedLocationTarget.lat],
        zoom: Math.max(map.getZoom(), 15),
        duration: 1200,
        essential: true,
      });
      return;
    }

    const latDiff = Math.abs(prevCenterRef.current.lat - center.lat);
    const lngDiff = Math.abs(prevCenterRef.current.lng - center.lng);

    // Only change zoom if region/city center changed significantly (> ~5km)
    if (latDiff > 0.05 || lngDiff > 0.05) {
      prevCenterRef.current = center;
      map.easeTo({
        center: [center.lng, center.lat],
        zoom: zoom,
        duration: 800,
      });
    } else {
      // Soft pan to maintain the user's manual zoom level
      prevCenterRef.current = center;
      map.easeTo({
        center: [center.lng, center.lat],
        duration: 500,
      });
    }
  }, [center.lat, center.lng, zoom, selectedLocationTarget]);

  // Render POI Markers with DOM elements
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    pois.forEach((poi, idx) => {
      const isSelected = selectedPoiId === poi.id;
      const inclusion = poiInclusionLookup ? poiInclusionLookup(poi.id) : { inPlan: false, occurrences: [] };
      const inCurrentDay = selectedDayId && inclusion.occurrences.some((o) => o.dayId === selectedDayId);

      // Determine marker color and label
      let bgColor = '#ef4444'; // Red default
      let label = `${idx + 1}`;
      let ringClass = '';

      if (isSelected) {
        bgColor = '#f59e0b'; // Amber gold
        ringClass = 'ring-4 ring-amber-400/80 shadow-xl scale-115';
      } else if (inCurrentDay) {
        bgColor = '#059669'; // Emerald
        label = '✓';
      } else if (inclusion.inPlan) {
        bgColor = '#d97706'; // Warm Amber
        label = `D${inclusion.occurrences[0]?.dayNumber || ''}`;
      }

      // Marker element
      const el = document.createElement('div');
      el.className = 'cursor-pointer transition-transform duration-200 transform hover:scale-120 group';
      el.innerHTML = `
        <div style="background-color: ${bgColor}" class="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-xs shadow-md border-2 border-white ${ringClass}">
          ${label}
        </div>
        <div class="w-2 h-2 bg-stone-900 rotate-45 mx-auto -mt-1 shadow-xs border-r border-b border-white"></div>
      `;

      el.addEventListener('click', () => {
        onSelectPoi(poi);
        map.easeTo({ center: [poi.lng, poi.lat], duration: 800 });
      });

      // Tooltip popup
      const popup = new MapLibrePopup({
        offset: 20,
        closeButton: false,
        className: 'custom-maplibre-tooltip',
      }).setHTML(`
        <div style="font-family: inherit; padding: 2px 4px; color: #1c1917;">
          <div style="font-weight: 700; font-size: 12px;">${poi.nameEs}</div>
          <div style="font-size: 11px; color: #92400e; font-weight: 600;">${poi.nameVi}</div>
          <div style="font-size: 10px; color: #78716c; margin-top: 2px;">${poi.ticketVnd > 0 ? (poi.ticketVnd / 1000).toLocaleString('es-ES') + 'k ₫' : 'Gratis'}</div>
        </div>
      `);

      const marker = new MapLibreMarker({ element: el, anchor: 'bottom' })
        .setLngLat([poi.lng, poi.lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [pois, selectedPoiId, selectedDayId, poiInclusionLookup, onSelectPoi]);

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

  // Render Route Polyline using Vector Line Layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isStyleLoaded) return;

    const sourceId = 'itinerary-route-source';
    const layerId = 'itinerary-route-layer';
    const casingLayerId = 'itinerary-route-casing';

    // Remove existing layer and source if any
    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getLayer(casingLayerId)) map.removeLayer(casingLayerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);

    if (!activeRoute || activeRoute.length < 2) return;

    const coordinates = activeRoute.map((pt) => [pt.lng, pt.lat]);

    map.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: coordinates,
        },
      },
    });

    // Casing line
    map.addLayer({
      id: casingLayerId,
      type: 'line',
      source: sourceId,
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#0284c7',
        'line-width': 6,
        'line-opacity': 0.4,
      },
    });

    // Dashed primary line
    map.addLayer({
      id: layerId,
      type: 'line',
      source: sourceId,
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#0369a1',
        'line-width': 3.5,
        'line-dasharray': [2, 2],
      },
    });
  }, [activeRoute, isStyleLoaded]);

  // Controls Handlers
  const handleZoomIn = () => {
    mapRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapRef.current?.zoomOut();
  };

  const handleResetBearing = () => {
    mapRef.current?.resetNorthPitch({ duration: 600 });
  };

  const handleCenterOnUser = () => {
    if (!userLocation || !mapRef.current) return;
    mapRef.current.flyTo({
      center: [userLocation.lng, userLocation.lat],
      zoom: 16,
      duration: 1000,
    });
  };

  const handleFitRegion = () => {
    if (!mapRef.current || pois.length === 0) return;
    const bounds = new MapLibreLngLatBounds();
    pois.forEach((p) => bounds.extend([p.lng, p.lat]));
    mapRef.current.fitBounds(bounds, { padding: 40, maxZoom: 15, duration: 800 });
  };

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border border-stone-800 shadow-inner bg-stone-900 ${className}`}>
      {/* MapLibre WebGL DOM Container */}
      <div ref={containerRef} className="w-full h-full z-0" />

      {/* Floating GPS and compass controls (minimal) */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
        {userLocation && (
          <button
            onClick={handleCenterOnUser}
            className="p-2.5 bg-sky-600 hover:bg-sky-500 rounded-xl shadow-lg border border-sky-400 text-white transition cursor-pointer flex items-center justify-center animate-pulse"
            title="Mi ubicación GPS"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Subtle vector style toggle in corner */}
      <div className="absolute top-3 left-3 z-10">
        <div className="bg-stone-900/80 backdrop-blur-md rounded-xl p-0.5 border border-stone-700/60 shadow-md flex items-center gap-0.5 text-[10px]">
          {(['liberty', 'positron', 'bright'] as VectorMapStyle[]).map((styleKey) => {
            const isSelected = vectorStyle === styleKey;
            return (
              <button
                key={styleKey}
                onClick={() => setVectorStyle(styleKey)}
                className={`px-2 py-0.5 rounded-lg font-medium transition cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 text-stone-950 font-bold'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                {VECTOR_STYLES[styleKey].name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
