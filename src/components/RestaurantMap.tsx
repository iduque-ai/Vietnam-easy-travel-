import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps';
import L from 'leaflet';
import { RestaurantItem, RestaurantScoreBreakdown } from '../types';
import {
  Layers,
  Crosshair,
  Navigation,
  Star,
  ExternalLink,
  UtensilsCrossed,
  Volume2,
} from 'lucide-react';
import { speakVietnamese } from '../utils/storage';

export type MapTileStyle = 'voyager' | 'osm' | 'satellite';

const GOOGLE_MAPS_API_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_MAPS_API_KEY) || '';

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
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye',
    maxZoom: 18,
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
  userLocation?: { lat: number; lng: number; accuracy?: number } | null;
  userLocationLabel?: string;
  className?: string;
}

// Controller component to smoothly pan/zoom Google Map on center or item change
const GoogleMapCameraController: React.FC<{
  center: { lat: number; lng: number };
  zoom: number;
  selectedLocation: { lat: number; lng: number } | null;
}> = ({ center, zoom, selectedLocation }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    map.panTo(center);
    map.setZoom(zoom);
  }, [map, center.lat, center.lng, zoom]);

  useEffect(() => {
    if (!map || !selectedLocation) return;
    map.panTo(selectedLocation);
    map.setZoom(Math.max(map.getZoom() || 14, 16));
  }, [map, selectedLocation?.lat, selectedLocation?.lng]);

  return null;
};

// Fallback OpenStreetMap / Leaflet Map
const LeafletRestaurantMap: React.FC<RestaurantMapProps> = ({
  center,
  zoom = 13,
  items,
  selectedRestaurantId,
  onSelectRestaurant,
  userLocation,
  userLocationLabel = 'Tu ubicación actual',
  className = 'h-[440px]',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.LayerGroup | null>(null);
  const [tileStyle, setTileStyle] = useState<MapTileStyle>('voyager');

  useEffect(() => {
    if (!containerRef.current || mapInstanceRef.current) return;

    const map = L.map(containerRef.current, {
      center: [center.lat, center.lng],
      zoom: zoom,
      zoomControl: false,
      attributionControl: true,
    });

    mapInstanceRef.current = map;

    const tileConfig = TILE_SERVERS[tileStyle];
    tileLayerRef.current = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      subdomains: tileConfig.subdomains || ['a', 'b', 'c'],
      maxZoom: tileConfig.maxZoom || 19,
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    userMarkerRef.current = L.layerGroup().addTo(map);

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    const tileConfig = TILE_SERVERS[tileStyle];
    tileLayerRef.current = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      subdomains: tileConfig.subdomains || ['a', 'b', 'c'],
      maxZoom: tileConfig.maxZoom || 19,
    }).addTo(map);
  }, [tileStyle]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo([center.lat, center.lng], zoom, { duration: 1.0 });
  }, [center.lat, center.lng, zoom]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    items.forEach((entry, index) => {
      const { restaurant } = entry;
      const isSelected = selectedRestaurantId === restaurant.id;
      const isTop1 = index === 0;

      let pinColor = '#d97706';
      let bgClass = 'bg-stone-900 text-stone-100 border-stone-700';

      if (isTop1) {
        bgClass = 'bg-amber-500 text-stone-950 border-amber-300 font-extrabold shadow-lg';
        pinColor = '#f59e0b';
      } else if (restaurant.priceTier === 1) {
        bgClass = 'bg-emerald-700 text-white border-emerald-500 shadow-sm';
        pinColor = '#059669';
      } else if (restaurant.priceTier === 2) {
        bgClass = 'bg-sky-700 text-white border-sky-500 shadow-sm';
        pinColor = '#0284c7';
      } else {
        bgClass = 'bg-purple-800 text-white border-purple-500 shadow-sm';
        pinColor = '#7c3aed';
      }

      if (isSelected) {
        bgClass += ' ring-2 ring-amber-400 scale-110';
      }

      const iconHtml = `
        <div class="relative flex flex-col items-center cursor-pointer">
          <div class="px-2 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 transition-transform shadow-md ${bgClass}">
            <span>${isTop1 ? '👑 #1' : `#${index + 1}`}</span>
            <span>★${restaurant.rating.toFixed(1)}</span>
          </div>
          <div class="w-2 h-2 rotate-45 -mt-1" style="background-color: ${pinColor};"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-restaurant-pin',
        iconSize: [68, 32],
        iconAnchor: [34, 30],
      });

      const marker = L.marker([restaurant.lat, restaurant.lng], { icon: customIcon });
      marker.on('click', () => {
        onSelectRestaurant(restaurant);
      });

      markersLayer.addLayer(marker);
    });
  }, [items, selectedRestaurantId, onSelectRestaurant]);

  useEffect(() => {
    const userLayer = userMarkerRef.current;
    if (!userLayer) return;
    userLayer.clearLayers();

    if (userLocation) {
      const userIcon = L.divIcon({
        html: `
          <div class="relative flex items-center justify-center">
            <div class="w-4 h-4 bg-sky-500 rounded-full border-2 border-white shadow-lg"></div>
            <div class="absolute -inset-2 bg-sky-400/40 rounded-full animate-ping"></div>
          </div>
        `,
        className: 'user-location-pin',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      const marker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon });
      userLayer.addLayer(marker);
    }
  }, [userLocation]);

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border border-stone-200 ${className}`}>
      <div ref={containerRef} className="w-full h-full z-0" />
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-white/95 backdrop-blur-xs p-1 rounded-xl shadow-md border border-stone-200">
        {(['voyager', 'satellite', 'osm'] as MapTileStyle[]).map((style) => (
          <button
            key={style}
            type="button"
            onClick={() => setTileStyle(style)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer capitalize ${
              tileStyle === style
                ? 'bg-amber-500 text-stone-950 font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            {style === 'voyager' ? 'Mapa' : style === 'satellite' ? 'Satélite' : 'OSM'}
          </button>
        ))}
      </div>
    </div>
  );
};

// Main Export: Official Google Maps Platform with Fallback
export const RestaurantMap: React.FC<RestaurantMapProps> = (props) => {
  const {
    center,
    zoom = 14,
    items,
    selectedRestaurantId,
    onSelectRestaurant,
    userLocation,
    userLocationLabel = 'Tu ubicación actual',
    className = 'h-[440px]',
  } = props;

  const [activeInfoWindowItem, setActiveInfoWindowItem] = useState<RestaurantItem | null>(null);
  const [engineMode, setEngineMode] = useState<'google' | 'osm'>(() => {
    return GOOGLE_MAPS_API_KEY ? 'google' : 'osm';
  });

  // Keep activeInfoWindowItem in sync with selectedRestaurantId if selected externally
  useEffect(() => {
    if (selectedRestaurantId) {
      const match = items.find((e) => e.restaurant.id === selectedRestaurantId);
      if (match) {
        setActiveInfoWindowItem(match.restaurant);
      }
    }
  }, [selectedRestaurantId, items]);

  const selectedLocation = useMemo(() => {
    if (activeInfoWindowItem) {
      return { lat: activeInfoWindowItem.lat, lng: activeInfoWindowItem.lng };
    }
    return null;
  }, [activeInfoWindowItem]);

  // If no Google Maps API key is configured or user toggled to OSM
  if (!GOOGLE_MAPS_API_KEY || engineMode === 'osm') {
    return (
      <div className="relative">
        <LeafletRestaurantMap {...props} />
        {GOOGLE_MAPS_API_KEY && (
          <div className="absolute bottom-3 left-3 z-10">
            <button
              onClick={() => setEngineMode('google')}
              className="px-2.5 py-1 rounded-xl bg-white/90 text-stone-800 border border-stone-200 shadow-md text-xs font-semibold hover:bg-white transition cursor-pointer flex items-center gap-1"
            >
              <span>Ver en Google Maps</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border border-stone-200/90 shadow-xs ${className}`}>
      {/* Google Maps React API Provider */}
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['marker']}>
        <Map
          mapId="VIETNAM_RESTAURANTS_MAP"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          defaultCenter={{ lat: center.lat, lng: center.lng }}
          defaultZoom={zoom}
          gestureHandling="greedy"
          disableDefaultUI={false}
          mapTypeControl={true}
          streetViewControl={true}
          fullscreenControl={true}
          zoomControl={true}
          style={{ width: '100%', height: '100%' }}
        >
          {/* Smooth Camera Controller */}
          <GoogleMapCameraController
            center={center}
            zoom={zoom}
            selectedLocation={selectedLocation}
          />

          {/* Restaurant Pins */}
          {items.map((entry, index) => {
            const { restaurant } = entry;
            const isSelected =
              selectedRestaurantId === restaurant.id ||
              activeInfoWindowItem?.id === restaurant.id;
            const isTop1 = index === 0;

            let pinBg = '#d97706'; // Amber
            let pinBorder = '#b45309';

            if (isTop1) {
              pinBg = '#f59e0b'; // Gold
              pinBorder = '#78350f';
            } else if (restaurant.priceTier === 1) {
              pinBg = '#059669'; // Emerald
              pinBorder = '#065f46';
            } else if (restaurant.priceTier === 2) {
              pinBg = '#0284c7'; // Sky
              pinBorder = '#0369a1';
            } else {
              pinBg = '#7c3aed'; // Purple
              pinBorder = '#5b21b6';
            }

            return (
              <AdvancedMarker
                key={restaurant.id}
                position={{ lat: restaurant.lat, lng: restaurant.lng }}
                title={`${restaurant.name} (${restaurant.nameVi}) - ★${restaurant.rating.toFixed(1)}`}
                onClick={() => {
                  setActiveInfoWindowItem(restaurant);
                  onSelectRestaurant(restaurant);
                }}
              >
                <Pin
                  background={isSelected ? '#ea580c' : pinBg}
                  borderColor={isSelected ? '#ffffff' : pinBorder}
                  glyphColor="#ffffff"
                  scale={isSelected ? 1.35 : isTop1 ? 1.25 : 1.05}
                >
                  <span className="text-[10px] font-black text-white font-mono">
                    {isTop1 ? '👑' : `${index + 1}`}
                  </span>
                </Pin>
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
              onCloseClick={() => setActiveInfoWindowItem(null)}
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

                <div className="pt-1 border-t border-stone-100 flex items-center justify-between gap-2">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${activeInfoWindowItem.lat},${activeInfoWindowItem.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-1 px-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-semibold text-[11px] flex items-center justify-center gap-1 transition"
                  >
                    <Navigation className="w-3 h-3 text-sky-400" />
                    <span>Cómo llegar</span>
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

      {/* Engine Switcher Badge in bottom corner */}
      <div className="absolute bottom-2.5 left-2.5 z-10">
        <span className="px-2 py-0.5 rounded-md bg-white/90 backdrop-blur-xs text-[10px] font-bold text-stone-700 border border-stone-200 shadow-xs flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          Google Maps
        </span>
      </div>
    </div>
  );
};
