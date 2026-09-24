import { ItineraryStop } from '../types';
import { POINTS_OF_INTEREST } from '../data/pois';

/**
 * Calculates the Haversine distance in meters between two lat/lng points.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
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

export interface GeocodedStop {
  stop: ItineraryStop;
  lat: number;
  lng: number;
  poiName: string;
}

/**
 * Extracts coordinates for stops that have a known POI in Vietnam data.
 */
export function getStopCoordinates(stop: ItineraryStop): { lat: number; lng: number; name: string } | null {
  if (!stop.poiId) return null;
  const poi = POINTS_OF_INTEREST.find((p) => p.id === stop.poiId);
  if (!poi) return null;
  return { lat: poi.lat, lng: poi.lng, name: poi.nameEs };
}

/**
 * Reorders stops in a day to follow the shortest traveling distance (Nearest Neighbor heuristic).
 * Non-geocoded stops retain their relative positions at the end or around their time slots.
 */
export function optimizeStopsOrder(stops: ItineraryStop[]): {
  orderedStops: ItineraryStop[];
  savedDistanceKm: number;
  totalDistanceKm: number;
} {
  if (stops.length <= 2) {
    return { orderedStops: stops, savedDistanceKm: 0, totalDistanceKm: 0 };
  }

  // Separate stops with coordinates from stops without coordinates
  const withCoords: GeocodedStop[] = [];
  const withoutCoords: ItineraryStop[] = [];

  for (const stop of stops) {
    const coords = getStopCoordinates(stop);
    if (coords) {
      withCoords.push({ stop, lat: coords.lat, lng: coords.lng, poiName: coords.name });
    } else {
      withoutCoords.push(stop);
    }
  }

  if (withCoords.length <= 2) {
    return { orderedStops: stops, savedDistanceKm: 0, totalDistanceKm: 0 };
  }

  // Calculate original sequence total distance
  let originalDistance = 0;
  for (let i = 0; i < withCoords.length - 1; i++) {
    originalDistance += calculateDistanceMeters(
      withCoords[i].lat,
      withCoords[i].lng,
      withCoords[i + 1].lat,
      withCoords[i + 1].lng
    );
  }

  // Nearest Neighbor tour starting at the first stop (usually user's planned morning starting point)
  const remaining = [...withCoords];
  const tour: GeocodedStop[] = [remaining.shift()!];

  while (remaining.length > 0) {
    const current = tour[tour.length - 1];
    let bestIndex = 0;
    let bestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const dist = calculateDistanceMeters(
        current.lat,
        current.lng,
        remaining[i].lat,
        remaining[i].lng
      );
      if (dist < bestDist) {
        bestDist = dist;
        bestIndex = i;
      }
    }

    tour.push(remaining.splice(bestIndex, 1)[0]);
  }

  // Calculate new total distance
  let optimizedDistance = 0;
  for (let i = 0; i < tour.length - 1; i++) {
    optimizedDistance += calculateDistanceMeters(
      tour[i].lat,
      tour[i].lng,
      tour[i + 1].lat,
      tour[i + 1].lng
    );
  }

  const savedDistanceKm = Math.max(0, (originalDistance - optimizedDistance) / 1000);
  const totalDistanceKm = optimizedDistance / 1000;

  // Combine back: tour items followed by any non-geocoded stops
  const orderedStops = [...tour.map((t) => t.stop), ...withoutCoords];

  return {
    orderedStops,
    savedDistanceKm: Number(savedDistanceKm.toFixed(1)),
    totalDistanceKm: Number(totalDistanceKm.toFixed(1)),
  };
}

/**
 * Builds a multi-stop Google Maps URL.
 */
export function buildMultiStopGoogleMapsUrl(stops: ItineraryStop[]): string | null {
  const coordsList: { lat: number; lng: number }[] = [];

  for (const s of stops) {
    const coords = getStopCoordinates(s);
    if (coords) {
      coordsList.push({ lat: coords.lat, lng: coords.lng });
    }
  }

  if (coordsList.length === 0) return null;
  if (coordsList.length === 1) {
    return `https://www.google.com/maps/search/?api=1&query=${coordsList[0].lat},${coordsList[0].lng}`;
  }

  const origin = `${coordsList[0].lat},${coordsList[0].lng}`;
  const destination = `${coordsList[coordsList.length - 1].lat},${coordsList[coordsList.length - 1].lng}`;

  if (coordsList.length === 2) {
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
  }

  const waypoints = coordsList
    .slice(1, -1)
    .map((c) => `${c.lat},${c.lng}`)
    .join('|');

  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
}
