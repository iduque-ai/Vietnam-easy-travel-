/**
 * Centralized permissions management for Geolocation (GPS) and Microphone (Speech).
 * Handles cross-browser detection, iframe permission policies, fallback queries,
 * and reactive subscribers.
 */

export type PermissionStatusType = 'granted' | 'denied' | 'prompt' | 'unknown';

export interface AppPermissionsState {
  geolocation: PermissionStatusType;
  microphone: PermissionStatusType;
  lastChecked: number;
}

const STORAGE_KEY = 'vietnam_travel_app_permissions_v1';
const DISABLED_KEY = 'vietnam_travel_permissions_disabled_in_app';

let currentPermissions: AppPermissionsState = {
  geolocation: 'unknown',
  microphone: 'unknown',
  lastChecked: 0,
};

export function isPermissionDeactivatedInApp(type: 'geolocation' | 'microphone'): boolean {
  try {
    const raw = localStorage.getItem(DISABLED_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Boolean(parsed[type]);
    }
  } catch {}
  return false;
}

export function deactivatePermission(type: 'geolocation' | 'microphone'): void {
  try {
    const raw = localStorage.getItem(DISABLED_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[type] = true;
    localStorage.setItem(DISABLED_KEY, JSON.stringify(parsed));
  } catch {}
  currentPermissions[type] = 'denied';
  currentPermissions.lastChecked = Date.now();
  notifyListeners();
}

export function deactivateAllPermissions(): void {
  try {
    localStorage.setItem(DISABLED_KEY, JSON.stringify({ geolocation: true, microphone: true }));
  } catch {}
  currentPermissions.geolocation = 'denied';
  currentPermissions.microphone = 'denied';
  currentPermissions.lastChecked = Date.now();
  notifyListeners();
}

export function reactivatePermission(type: 'geolocation' | 'microphone'): void {
  try {
    const raw = localStorage.getItem(DISABLED_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      delete parsed[type];
      localStorage.setItem(DISABLED_KEY, JSON.stringify(parsed));
    }
  } catch {}
}

// Try to initialize from cached status
try {
  const cached = localStorage.getItem(STORAGE_KEY);
  if (cached) {
    const parsed = JSON.parse(cached);
    if (parsed.geolocation) currentPermissions.geolocation = parsed.geolocation;
    if (parsed.microphone) currentPermissions.microphone = parsed.microphone;
  }
} catch {
  // Ignore storage errors
}

if (isPermissionDeactivatedInApp('geolocation')) {
  currentPermissions.geolocation = 'denied';
}
if (isPermissionDeactivatedInApp('microphone')) {
  currentPermissions.microphone = 'denied';
}

type PermissionListener = (state: AppPermissionsState) => void;
const listeners = new Set<PermissionListener>();

function notifyListeners(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentPermissions));
  } catch {
    // Ignore storage errors
  }
  listeners.forEach((listener) => {
    try {
      listener({ ...currentPermissions });
    } catch (err) {
      console.warn('Error in permission listener:', err);
    }
  });
}

/**
 * Subscribe to real-time permission changes across components.
 */
export function subscribePermissions(listener: PermissionListener): () => void {
  listeners.add(listener);
  // Emit current state immediately
  listener({ ...currentPermissions });
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Returns current snapshot of app permissions.
 */
export function getCurrentPermissions(): AppPermissionsState {
  return { ...currentPermissions };
}

/**
 * Safely query browser permissions API for both geolocation and microphone.
 */
export async function queryBrowserPermissions(): Promise<AppPermissionsState> {
  let geo: PermissionStatusType = currentPermissions.geolocation;
  let mic: PermissionStatusType = currentPermissions.microphone;

  if (typeof navigator !== 'undefined' && (navigator as any).permissions) {
    // Geolocation Query
    try {
      const geoResult = await (navigator as any).permissions.query({ name: 'geolocation' });
      geo = (geoResult.state as PermissionStatusType) || 'unknown';
      geoResult.onchange = () => {
        currentPermissions.geolocation = (geoResult.state as PermissionStatusType) || 'unknown';
        currentPermissions.lastChecked = Date.now();
        notifyListeners();
      };
    } catch {
      // Not supported in this browser
    }

    // Microphone Query
    try {
      const micResult = await (navigator as any).permissions.query({ name: 'microphone' as any });
      mic = (micResult.state as PermissionStatusType) || 'unknown';
      micResult.onchange = () => {
        if (!isPermissionDeactivatedInApp('microphone')) {
          currentPermissions.microphone = (micResult.state as PermissionStatusType) || 'unknown';
          currentPermissions.lastChecked = Date.now();
          notifyListeners();
        }
      };
    } catch {
      // 'microphone' query not supported in Safari/Firefox
    }
  }

  if (isPermissionDeactivatedInApp('geolocation')) {
    geo = 'denied';
  }
  if (isPermissionDeactivatedInApp('microphone')) {
    mic = 'denied';
  }

  currentPermissions = {
    geolocation: geo,
    microphone: mic,
    lastChecked: Date.now(),
  };
  notifyListeners();
  return { ...currentPermissions };
}

/**
 * Request Geolocation permission with multi-phase timeout fallback
 */
export async function requestGeolocationPermission(): Promise<{
  success: boolean;
  status: PermissionStatusType;
  message: string;
  coords?: { latitude: number; longitude: number; accuracy?: number };
}> {
  // Clear any manual deactivation override on explicit user request
  reactivatePermission('geolocation');
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    currentPermissions.geolocation = 'denied';
    notifyListeners();
    return {
      success: false,
      status: 'denied',
      message: 'Tu dispositivo o navegador no admite geolocalización.',
    };
  }

  // First check if already granted via permissions API
  if ((navigator as any).permissions) {
    try {
      const query = await (navigator as any).permissions.query({ name: 'geolocation' });
      if (query.state === 'granted') {
        currentPermissions.geolocation = 'granted';
        notifyListeners();
      }
    } catch {}
  }

  return new Promise((resolve) => {
    // Phase 1: High accuracy GPS
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        currentPermissions.geolocation = 'granted';
        currentPermissions.lastChecked = Date.now();
        notifyListeners();
        resolve({
          success: true,
          status: 'granted',
          message: '✓ Permiso de geolocalización concedido con éxito.',
          coords: {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          },
        });
      },
      (err) => {
        if (err.code === 1) {
          // PERMISSION_DENIED
          currentPermissions.geolocation = 'denied';
          notifyListeners();
          resolve({
            success: false,
            status: 'denied',
            message: 'Permiso de ubicación bloqueado en el navegador.',
          });
          return;
        }

        // Phase 2 fallback for timeout / indoor positioning
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            currentPermissions.geolocation = 'granted';
            currentPermissions.lastChecked = Date.now();
            notifyListeners();
            resolve({
              success: true,
              status: 'granted',
              message: '✓ Permiso de geolocalización concedido con éxito.',
              coords: {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
              },
            });
          },
          () => {
            // Even if position timed out, if not explicitly denied by user, permission was granted
            currentPermissions.geolocation = 'granted';
            currentPermissions.lastChecked = Date.now();
            notifyListeners();
            resolve({
              success: true,
              status: 'granted',
              message: '✓ Permiso de ubicación activado en el navegador.',
            });
          },
          { enableHighAccuracy: false, timeout: 4000, maximumAge: Infinity }
        );
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 15000 }
    );
  });
}

/**
 * Request Microphone permission safely
 */
export async function requestMicrophonePermission(): Promise<{
  success: boolean;
  status: PermissionStatusType;
  message: string;
}> {
  // Clear any manual deactivation override on explicit user request
  reactivatePermission('microphone');
  if (
    typeof navigator === 'undefined' ||
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {
    // If getUserMedia is not directly available, check SpeechRecognition
    const hasSpeechRec = Boolean(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition ||
      (window as any).mozSpeechRecognition
    );
    if (hasSpeechRec) {
      currentPermissions.microphone = 'granted';
      notifyListeners();
      return {
        success: true,
        status: 'granted',
        message: '✓ Reconocimiento de voz disponible en el navegador.',
      };
    }

    currentPermissions.microphone = 'denied';
    notifyListeners();
    return {
      success: false,
      status: 'denied',
      message: 'Tu navegador no admite acceso al micrófono desde esta ventana.',
    };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Immediately stop tracks to release hardware
    stream.getTracks().forEach((track) => track.stop());

    currentPermissions.microphone = 'granted';
    currentPermissions.lastChecked = Date.now();
    notifyListeners();

    return {
      success: true,
      status: 'granted',
      message: '✓ Permiso de micrófono concedido con éxito.',
    };
  } catch (err: any) {
    if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
      // Browser allows access, but no physical mic is connected
      currentPermissions.microphone = 'granted';
      notifyListeners();
      return {
        success: true,
        status: 'granted',
        message: '✓ Permiso concedido (sin hardware de micrófono físico detectado).',
      };
    }

    currentPermissions.microphone = 'denied';
    notifyListeners();
    return {
      success: false,
      status: 'denied',
      message: 'Permiso de micrófono no concedido o bloqueado por el navegador.',
    };
  }
}

/**
 * Request both Geolocation and Microphone in parallel/sequence
 */
export async function requestAllPermissions(): Promise<{
  geoResult: { success: boolean; status: PermissionStatusType; message: string };
  micResult: { success: boolean; status: PermissionStatusType; message: string };
  allGranted: boolean;
}> {
  const geoResult = await requestGeolocationPermission();
  const micResult = await requestMicrophonePermission();

  const allGranted = geoResult.status === 'granted' && micResult.status === 'granted';
  return {
    geoResult,
    micResult,
    allGranted,
  };
}

// Initial automatic background query on import if in browser
if (typeof window !== 'undefined') {
  setTimeout(() => {
    queryBrowserPermissions();
  }, 100);
}
