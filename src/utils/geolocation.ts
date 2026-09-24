import { PointOfInterest } from '../types';
import { POINTS_OF_INTEREST, REGION_PACKS } from '../data/pois';

export interface GeoCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
}

export interface SmartGeoResult {
  coords: GeoCoords;
  isInsideVietnam: boolean;
  distanceToVietnamKm: number;
  closestPoi: PointOfInterest;
  distanceToClosestPoiKm: number;
  recommendedRegionId: string;
  isSimulated?: boolean;
  simulatedName?: string;
  provider: 'gps_high_accuracy' | 'network' | 'simulated';
  timestamp: number;
}

export interface SmartGeoError {
  code: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'NOT_SUPPORTED' | 'UNKNOWN';
  message: string;
  userTip: string;
  isIframeBlocked?: boolean;
}

export interface SimulationPreset {
  id: string;
  name: string;
  cityName: string;
  lat: number;
  lng: number;
  regionId: string;
  poiId: string;
  poiName: string;
  icon: string;
  description: string;
}

export const VIETNAM_SIMULATION_PRESETS: SimulationPreset[] = [
  {
    id: 'sim-hanoi',
    name: 'Hanói (Lago Hoàn Kiếm & Barrio Antiguo)',
    cityName: 'Hà Nội',
    lat: 21.0285,
    lng: 105.8542,
    regionId: 'reg-hanoi-north',
    poiId: 'poi-hn-1',
    poiName: 'Lago Hoàn Kiếm y Templo Ngọc Sơn',
    icon: '🏛️',
    description: 'En el corazón de la capital, frente al lago de la tortuga sagrada.',
  },
  {
    id: 'sim-literature',
    name: 'Hanói (Templo de la Literatura)',
    cityName: 'Hà Nội',
    lat: 21.0293,
    lng: 105.8361,
    regionId: 'reg-hanoi-north',
    poiId: 'poi-hn-2',
    poiName: 'Templo de la Literatura (Văn Miếu)',
    icon: '📜',
    description: 'La primera universidad imperial de Vietnam, entre jardines y tortugas.',
  },
  {
    id: 'sim-hoian',
    name: 'Hội An (Puente Japonés & Farolillos)',
    cityName: 'Hội An',
    lat: 15.8771,
    lng: 108.3259,
    regionId: 'reg-central',
    poiId: 'poi-ha-1',
    poiName: 'Puente Japonés Cubierto (Chùa Cầu)',
    icon: '🏮',
    description: 'En el casco antiguo peatonal iluminado con farolillos de seda.',
  },
  {
    id: 'sim-danang',
    name: 'Đà Nẵng (Puente del Dragón)',
    cityName: 'Đà Nẵng',
    lat: 16.0610,
    lng: 108.2272,
    regionId: 'reg-central',
    poiId: 'poi-dn-1',
    poiName: 'Puente del Dragón (Cầu Rồng)',
    icon: '🐉',
    description: 'Frente al imponente dragón dorado que escupe fuego sobre el río Han.',
  },
  {
    id: 'sim-hue',
    name: 'Huế (Ciudadela Imperial)',
    cityName: 'Huế',
    lat: 16.4699,
    lng: 107.5796,
    regionId: 'reg-central',
    poiId: 'poi-hue-1',
    poiName: 'Ciudadela Imperial de Huế (Đại Nội)',
    icon: '👑',
    description: 'A las puertas de la Ciudad Púrpura Prohibida de los emperadores Nguyen.',
  },
  {
    id: 'sim-saigon',
    name: 'TP. Hồ Chí Minh (Mercado Bến Thành)',
    cityName: 'TP. Hồ Chí Minh',
    lat: 10.7725,
    lng: 106.6980,
    regionId: 'reg-saigon-south',
    poiId: 'poi-sg-2',
    poiName: 'Mercado Bến Thành',
    icon: '🛵',
    description: 'En el epicentro del bullicio saigonés, cafés y street food.',
  },
  {
    id: 'sim-ninhbinh',
    name: 'Ninh Bình (Tràng An & Hang Múa)',
    cityName: 'Ninh Bình',
    lat: 20.2530,
    lng: 105.9149,
    regionId: 'reg-hanoi-north',
    poiId: 'poi-nb-1',
    poiName: 'Complejo Paisajístico de Tràng An',
    icon: '🛶',
    description: 'Navegando entre mogotes kársticos y cuevas sagradas en barca de remos.',
  },
];

// Haversine distance in kilometers
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Check if coordinates fall inside the geographic bounds of Vietnam (+ territorial waters/border buffer)
export function isPointInVietnam(lat: number, lng: number): boolean {
  // Approximate bounding box of Vietnam
  // Lat: 8.1° N to 23.4° N
  // Lng: 102.1° E to 109.6° E
  return lat >= 8.0 && lat <= 23.6 && lng >= 102.0 && lng <= 109.8;
}

// Find closest Point of Interest to given coordinates
export function findClosestPoi(lat: number, lng: number): {
  closestPoi: PointOfInterest;
  distanceKm: number;
  recommendedRegionId: string;
} {
  let closest: PointOfInterest = POINTS_OF_INTEREST[0];
  let minDistance = Infinity;

  for (const poi of POINTS_OF_INTEREST) {
    const d = calculateDistanceKm(lat, lng, poi.lat, poi.lng);
    if (d < minDistance) {
      minDistance = d;
      closest = poi;
    }
  }

  // Determine region
  const region = REGION_PACKS.find((r) => r.id === closest.regionId) || REGION_PACKS[0];

  return {
    closestPoi: closest,
    distanceKm: minDistance,
    recommendedRegionId: region.id,
  };
}

// Request position with double-fallback strategy to prevent browser freezes
function queryBrowserPosition(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject({ code: 0, message: 'Geolocalización no soportada' });
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

// Helper to convert GeolocationPosition to SmartGeoResult
export function processGeolocationPosition(
  position: GeolocationPosition,
  provider: 'gps_high_accuracy' | 'network' = 'gps_high_accuracy'
): SmartGeoResult {
  const { latitude, longitude, accuracy, altitude, heading, speed } = position.coords;
  const inVietnam = isPointInVietnam(latitude, longitude);
  const { closestPoi, distanceKm, recommendedRegionId } = findClosestPoi(latitude, longitude);

  const distanceToVietnamKm = inVietnam
    ? 0
    : Math.round(calculateDistanceKm(latitude, longitude, 16.05, 108.2));

  return {
    coords: {
      latitude,
      longitude,
      accuracy: accuracy ? Math.round(accuracy * 10) / 10 : undefined,
      altitude,
      heading,
      speed,
    },
    isInsideVietnam: inVietnam,
    distanceToVietnamKm,
    closestPoi,
    distanceToClosestPoiKm: Math.round(distanceKm * 10) / 10,
    recommendedRegionId,
    provider,
    timestamp: position.timestamp || Date.now(),
  };
}

/**
 * Attempts geolocation prioritizing HIGH ACCURACY (hardware GPS / true mobile antenna):
 * Phase 1: High accuracy GPS query (enableHighAccuracy: true, maximumAge: 0, 10s timeout).
 * Phase 2: If Phase 1 times out or is unavailable (e.g. desktop indoors), fallback to network WiFi/cellular.
 */
export async function getSmartGeolocation(): Promise<{
  success: true;
  data: SmartGeoResult;
} | {
  success: false;
  error: SmartGeoError;
}> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Tu navegador o dispositivo no soporta la API de geolocalización.',
        userTip: 'Puedes seleccionar tu ciudad o monumento directamente de la lista.',
      },
    };
  }

  let position: GeolocationPosition | null = null;
  let lastError: any = null;
  let providerUsed: 'gps_high_accuracy' | 'network' = 'gps_high_accuracy';

  // Phase 1: High accuracy hardware GPS first (no stale cache)
  try {
    position = await queryBrowserPosition({
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000,
    });
    providerUsed = 'gps_high_accuracy';
  } catch (err: any) {
    lastError = err;
  }

  // Phase 2: If Phase 1 failed because of timeout or position unavailable (not permission denied),
  // fallback to network/WiFi triangulation
  if (!position && lastError && lastError.code !== 1) {
    try {
      position = await queryBrowserPosition({
        enableHighAccuracy: false,
        maximumAge: 10000,
        timeout: 6000,
      });
      providerUsed = 'network';
    } catch (err: any) {
      lastError = err;
    }
  }

  if (!position) {
    const isIframe = typeof window !== 'undefined' && window.self !== window.top;
    let code: SmartGeoError['code'] = 'UNKNOWN';
    let message = 'No se pudo obtener la posición GPS.';
    let userTip = 'Puedes elegir uno de los puntos sugeridos de Vietnam con 1 clic.';
    const isIframeBlocked = Boolean(isIframe && (lastError?.code === 1 || lastError?.code === 3));

    if (lastError?.code === 1) {
      code = 'PERMISSION_DENIED';
      message = 'Permiso de ubicación no concedido en el navegador o bloqueado por el visor de la aplicación.';
      userTip = isIframe
        ? 'Los visores web en ventanas integradas suelen restringir el GPS por seguridad. Pulsa "Probar en Hanói/Hội An" o abre la app en una nueva pestaña.'
        : 'Revisa el icono de candado o ubicación en la barra de direcciones de tu navegador para dar permiso.';
    } else if (lastError?.code === 2) {
      code = 'POSITION_UNAVAILABLE';
      message = 'La señal de satélites GPS o triangulación de red no está disponible en este momento.';
      userTip = 'Si estás en interiores o en un ordenador sin antena GPS, usa la simulación de ubicación.';
    } else if (lastError?.code === 3) {
      code = 'TIMEOUT';
      message = 'Tiempo de espera agotado buscando satélites GPS.';
      userTip = 'Verifica que la antena de ubicación esté activa en los ajustes de tu móvil.';
    }

    return {
      success: false,
      error: {
        code,
        message,
        userTip,
        isIframeBlocked,
      },
    };
  }

  return {
    success: true,
    data: processGeolocationPosition(position, providerUsed),
  };
}

/**
 * Starts continuous GPS live watch (updates as traveler walks or rides Grab)
 */
export function watchSmartGeolocation(
  onUpdate: (result: SmartGeoResult) => void,
  onError: (error: SmartGeoError) => void
): () => void {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    onError({
      code: 'NOT_SUPPORTED',
      message: 'Geolocalización no soportada',
      userTip: 'Selecciona la ciudad manualmente',
    });
    return () => {};
  }

  const watchId = navigator.geolocation.watchPosition(
    (pos) => {
      onUpdate(processGeolocationPosition(pos, 'gps_high_accuracy'));
    },
    (err) => {
      onError({
        code: err.code === 1 ? 'PERMISSION_DENIED' : err.code === 2 ? 'POSITION_UNAVAILABLE' : 'TIMEOUT',
        message: err.message,
        userTip: 'Verifica la señal GPS',
      });
    },
    {
      enableHighAccuracy: true,
      maximumAge: 3000,
      timeout: 15000,
    }
  );

  return () => {
    navigator.geolocation.clearWatch(watchId);
  };
}

/**
 * Creates a simulated result for a preset
 */
export function createSimulatedResult(presetId: string): SmartGeoResult {
  const preset =
    VIETNAM_SIMULATION_PRESETS.find((p) => p.id === presetId) ||
    VIETNAM_SIMULATION_PRESETS[0];

  const poi =
    POINTS_OF_INTEREST.find((p) => p.id === preset.poiId) ||
    POINTS_OF_INTEREST.find((p) => p.nameEs.includes(preset.cityName)) ||
    POINTS_OF_INTEREST[0];

  return {
    coords: {
      latitude: preset.lat,
      longitude: preset.lng,
      accuracy: 15,
    },
    isInsideVietnam: true,
    distanceToVietnamKm: 0,
    closestPoi: poi,
    distanceToClosestPoiKm: 0.1,
    recommendedRegionId: preset.regionId,
    isSimulated: true,
    simulatedName: preset.name,
    provider: 'simulated',
    timestamp: Date.now(),
  };
}
