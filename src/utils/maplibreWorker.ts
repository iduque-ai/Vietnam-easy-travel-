import { setWorkerUrl } from 'maplibre-gl';
import maplibreglWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

let workerConfigured = false;

export function ensureMaplibreWorker(): void {
  if (!workerConfigured && typeof window !== 'undefined') {
    setWorkerUrl(maplibreglWorkerUrl);
    workerConfigured = true;
  }
}

// Auto-initialize when this module is imported
ensureMaplibreWorker();
