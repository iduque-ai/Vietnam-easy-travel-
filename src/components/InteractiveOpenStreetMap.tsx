import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { PointOfInterest } from '../types';
import { Layers, Crosshair, ZoomIn, ZoomOut, Compass, Navigation2 } from 'lucide-react';

export type MapTileStyle = 'voyager' | 'osm' | 'satellite';

const TILE_SERVERS: Record<
  MapTileStyle,
  { url: string; attribution: string; subdomains?: string[]; maxZoom?: number }
> = {
  voyager: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: ['a', 'b', 'c', 'd'],
    maxZoom: 19,
  },
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 18,
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
  className = 'h-[460px]',
  routePolyline,
  routeCoordinates,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const activeRoute = routePolyline || (routeCoordinates ? routeCoordinates.map((c, i) => ({
    lat: c.lat,
    lng: c.lng,
    stopIndex: i + 1,
    title: c.label,
  })) : undefined);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);

  const [tileStyle, setTileStyle] = useState<MapTileStyle>('voyager');
  const [currentZoom, setCurrentZoom] = useState<number>(zoom);

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current || mapInstanceRef.current) return;

    const map = L.map(containerRef.current, {
      center: [center.lat, center.lng],
      zoom: zoom,
      zoomControl: false, // Custom UI buttons
      attributionControl: true,
    });

    mapInstanceRef.current = map;

    // Base Tile Layer
    const config = TILE_SERVERS[tileStyle];
    const tileLayer = L.tileLayer(config.url, {
      attribution: config.attribution,
      subdomains: config.subdomains || 'abc',
      maxZoom: config.maxZoom || 19,
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    // Feature Layers
    routeLayerRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);
    userMarkerRef.current = L.layerGroup().addTo(map);

    // Zoom listener
    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom());
    });

    // Invalidate size after layout completes
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Style
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const config = TILE_SERVERS[tileStyle];
    const newLayer = L.tileLayer(config.url, {
      attribution: config.attribution,
      subdomains: config.subdomains || 'abc',
      maxZoom: config.maxZoom || 19,
    }).addTo(map);

    // Ensure tile layer sits at bottom
    newLayer.bringToBack();
    tileLayerRef.current = newLayer;
  }, [tileStyle]);

  // Center on Region / Selected target change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (selectedLocationTarget) {
      map.flyTo([selectedLocationTarget.lat, selectedLocationTarget.lng], Math.max(map.getZoom(), 15), {
        duration: 1.0,
      });
    } else {
      map.panTo([center.lat, center.lng]);
    }
  }, [center.lat, center.lng, selectedLocationTarget]);

  // Render POI Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    pois.forEach((poi, idx) => {
      const isSelected = selectedPoiId === poi.id;
      const inclusion = poiInclusionLookup ? poiInclusionLookup(poi.id) : { inPlan: false, occurrences: [] };
      const inCurrentDay = selectedDayId && inclusion.occurrences.some((o) => o.dayId === selectedDayId);

      // Determine colors & label
      let bgColor = '#ef4444'; // Red default
      let label = `${idx + 1}`;
      let ringClass = '';

      if (isSelected) {
        bgColor = '#f59e0b'; // Amber gold
        ringClass = 'ring-4 ring-amber-400/60 shadow-xl scale-110 animate-bounce-short';
      } else if (inCurrentDay) {
        bgColor = '#059669'; // Emerald
        label = '✓';
      } else if (inclusion.inPlan) {
        bgColor = '#d97706'; // Warm Amber
        label = `D${inclusion.occurrences[0]?.dayNumber || ''}`;
      }

      const iconHtml = `
        <div class="relative cursor-pointer transition-transform duration-200 transform hover:scale-115">
          <div style="background-color: ${bgColor}" class="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-xs shadow-md border-2 border-white ${ringClass}">
            ${label}
          </div>
          <div class="w-2 h-2 bg-stone-900 rotate-45 mx-auto -mt-1 shadow-xs border-r border-b border-white"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-poi-marker',
        iconSize: [32, 38],
        iconAnchor: [16, 36],
        popupAnchor: [0, -36],
      });

      const marker = L.marker([poi.lat, poi.lng], { icon: customIcon });

      marker.on('click', () => {
        onSelectPoi(poi);
        map.panTo([poi.lat, poi.lng]);
      });

      marker.bindTooltip(
        `<div class="font-sans px-1 py-0.5">
          <div class="font-bold text-xs text-stone-900">${poi.nameEs}</div>
          <div class="text-[10px] text-amber-800 font-semibold">${poi.nameVi}</div>
          <div class="text-[10px] text-stone-500">${poi.ticketVnd > 0 ? (poi.ticketVnd / 1000).toLocaleString('es-ES') + 'k ₫' : 'Gratis'}</div>
        </div>`,
        { direction: 'top', offset: [0, -32], opacity: 0.95 }
      );

      markersLayer.addLayer(marker);
    });
  }, [pois, selectedPoiId, selectedDayId, poiInclusionLookup, onSelectPoi]);

  // Render User Location & Accuracy Radius
  useEffect(() => {
    const userLayer = userMarkerRef.current;
    if (!userLayer) return;

    userLayer.clearLayers();

    if (!userLocation) return;

    // Precision Accuracy circle (GPS radius in meters)
    if (userLocation.accuracy && userLocation.accuracy > 0 && userLocation.accuracy < 10000) {
      const accuracyCircle = L.circle([userLocation.lat, userLocation.lng], {
        radius: userLocation.accuracy,
        color: '#0284c7',
        fillColor: '#38bdf8',
        fillOpacity: 0.15,
        weight: 1.5,
        dashArray: '3, 4',
      });
      userLayer.addLayer(accuracyCircle);
    }

    // High-visibility animated Pulsing Radar GPS Dot
    const userIconHtml = `
      <div class="relative flex items-center justify-center">
        <div class="absolute -inset-3 bg-sky-400/40 rounded-full animate-ping"></div>
        <div class="absolute -inset-1.5 bg-sky-500/30 rounded-full animate-pulse"></div>
        <div class="w-4 h-4 bg-sky-500 rounded-full border-2 border-white shadow-lg relative z-10 flex items-center justify-center">
          <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
        </div>
      </div>
    `;

    const userIcon = L.divIcon({
      html: userIconHtml,
      className: 'user-gps-marker',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon, zIndexOffset: 1000 });

    userMarker.bindTooltip(
      `<div class="font-sans px-1 py-0.5">
        <div class="font-bold text-xs text-sky-950 flex items-center gap-1">
          <span class="w-2 h-2 rounded-full bg-sky-500 inline-block"></span>
          ${userLocationLabel}
        </div>
        <div class="text-[10px] text-stone-500 font-mono mt-0.5">
          ${userLocation.lat.toFixed(5)}°, ${userLocation.lng.toFixed(5)}°
          ${userLocation.accuracy ? ` (±${Math.round(userLocation.accuracy)}m)` : ''}
        </div>
      </div>`,
      { permanent: false, direction: 'top', offset: [0, -14] }
    );

    userLayer.addLayer(userMarker);
  }, [userLocation, userLocationLabel]);

  // Render Route Polyline (if provided for itinerary days)
  useEffect(() => {
    const routeLayer = routeLayerRef.current;
    if (!routeLayer) return;

    routeLayer.clearLayers();

    if (!activeRoute || activeRoute.length < 2) return;

    const latLngs: L.LatLngExpression[] = activeRoute.map((pt) => [pt.lat, pt.lng]);

    // Outer glow casing
    const glowLine = L.polyline(latLngs, {
      color: '#0284c7',
      weight: 6,
      opacity: 0.35,
      lineCap: 'round',
      lineJoin: 'round',
    });
    routeLayer.addLayer(glowLine);

    // Main route dashed path
    const mainLine = L.polyline(latLngs, {
      color: '#0369a1',
      weight: 3.5,
      opacity: 0.9,
      dashArray: '6, 6',
      lineCap: 'round',
      lineJoin: 'round',
    });
    routeLayer.addLayer(mainLine);
  }, [activeRoute]);

  // Map Controls Helpers
  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  const handleCenterOnUser = () => {
    if (!userLocation || !mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([userLocation.lat, userLocation.lng], 16, { duration: 1.0 });
  };

  const handleFitRegion = () => {
    if (!mapInstanceRef.current || pois.length === 0) return;
    const bounds = L.latLngBounds(pois.map((p) => [p.lat, p.lng]));
    mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  };

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border border-stone-800 shadow-inner ${className}`}>
      {/* Leaflet DOM container */}
      <div ref={containerRef} className="w-full h-full z-0 bg-stone-900" />

      {/* Floating Modern Floating Controls */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
        {/* Zoom controls */}
        <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-stone-200/90 overflow-hidden flex flex-col">
          <button
            onClick={handleZoomIn}
            className="p-2 hover:bg-stone-100 text-stone-700 transition cursor-pointer border-b border-stone-200/70"
            title="Acercar mapa (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 hover:bg-stone-100 text-stone-700 transition cursor-pointer"
            title="Alejar mapa (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>

        {/* Fit Bounds */}
        <button
          onClick={handleFitRegion}
          className="p-2 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-stone-200/90 text-stone-700 hover:bg-stone-100 transition cursor-pointer flex items-center justify-center"
          title="Ver todos los monumentos de la región"
        >
          <Compass className="w-4 h-4 text-amber-600" />
        </button>

        {/* Center on GPS (if available) */}
        {userLocation && (
          <button
            onClick={handleCenterOnUser}
            className="p-2 bg-sky-600 hover:bg-sky-500 rounded-xl shadow-lg border border-sky-400 text-white transition cursor-pointer flex items-center justify-center animate-pulse"
            title="Centrar en mi ubicación GPS exacta"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Top Left: Layer Selector Pill */}
      <div className="absolute top-3 left-3 z-10">
        <div className="bg-stone-900/90 backdrop-blur-md rounded-xl p-1 border border-stone-700/80 shadow-lg flex items-center gap-1 text-[11px]">
          <span className="text-stone-400 pl-1 pr-0.5 flex items-center gap-1">
            <Layers className="w-3 h-3 text-amber-400" />
          </span>
          <button
            onClick={() => setTileStyle('voyager')}
            className={`px-2 py-0.5 rounded-lg font-medium transition cursor-pointer ${
              tileStyle === 'voyager'
                ? 'bg-amber-500 text-stone-950 font-bold shadow-2xs'
                : 'text-stone-300 hover:text-white'
            }`}
          >
            Viajero
          </button>
          <button
            onClick={() => setTileStyle('osm')}
            className={`px-2 py-0.5 rounded-lg font-medium transition cursor-pointer ${
              tileStyle === 'osm'
                ? 'bg-amber-500 text-stone-950 font-bold shadow-2xs'
                : 'text-stone-300 hover:text-white'
            }`}
          >
            Calles OSM
          </button>
          <button
            onClick={() => setTileStyle('satellite')}
            className={`px-2 py-0.5 rounded-lg font-medium transition cursor-pointer ${
              tileStyle === 'satellite'
                ? 'bg-amber-500 text-stone-950 font-bold shadow-2xs'
                : 'text-stone-300 hover:text-white'
            }`}
          >
            Satélite
          </button>
        </div>
      </div>

      {/* Bottom Info Bar: GPS Status & Precision */}
      <div className="absolute bottom-2 left-2 z-10 pointer-events-none">
        <div className="bg-stone-900/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-stone-700/80 text-[10px] text-stone-300 shadow-md flex items-center gap-2">
          {userLocation ? (
            <span className="flex items-center gap-1.5 text-sky-400 font-medium">
              <Navigation2 className="w-3 h-3 text-sky-400 rotate-45 shrink-0" />
              <span>
                GPS exacto: {userLocation.lat.toFixed(4)}°, {userLocation.lng.toFixed(4)}°
                {userLocation.accuracy ? ` (±${Math.round(userLocation.accuracy)}m)` : ''}
              </span>
            </span>
          ) : (
            <span className="text-stone-400">
              📍 Toca cualquier monumento para ver detalles e itinerario
            </span>
          )}
          <span className="text-stone-600">|</span>
          <span className="text-stone-400 font-mono">Zoom {currentZoom}x</span>
        </div>
      </div>
    </div>
  );
};
