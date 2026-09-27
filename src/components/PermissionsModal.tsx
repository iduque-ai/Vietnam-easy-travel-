import React, { useState, useEffect, useCallback } from 'react';
import {
  MapPin,
  Mic,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  Compass,
  ArrowRight,
  Sparkles,
  Lock,
  RefreshCw,
  UtensilsCrossed,
  Languages,
  Info,
} from 'lucide-react';
import {
  PermissionStatusType,
  subscribePermissions,
  queryBrowserPermissions,
  requestGeolocationPermission,
  requestMicrophonePermission,
  requestAllPermissions,
} from '../utils/permissions';

export type { PermissionStatusType };

interface PermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionsChange?: (geo: PermissionStatusType, mic: PermissionStatusType) => void;
}

export const PermissionsModal: React.FC<PermissionsModalProps> = ({
  isOpen,
  onClose,
  onPermissionsChange,
}) => {
  const [geoStatus, setGeoStatus] = useState<PermissionStatusType>('unknown');
  const [micStatus, setMicStatus] = useState<PermissionStatusType>('unknown');
  const [isRequestingGeo, setIsRequestingGeo] = useState(false);
  const [isRequestingMic, setIsRequestingMic] = useState(false);
  const [isRequestingAll, setIsRequestingAll] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'warning' | 'info';
    message: string;
  } | null>(null);

  // Subscribe to real-time permission changes
  useEffect(() => {
    const unsub = subscribePermissions((state) => {
      setGeoStatus(state.geolocation);
      setMicStatus(state.microphone);
      if (onPermissionsChange) {
        onPermissionsChange(state.geolocation, state.microphone);
      }
    });
    return unsub;
  }, [onPermissionsChange]);

  useEffect(() => {
    if (isOpen) {
      queryBrowserPermissions();
    }
  }, [isOpen]);

  // Handle ESC key to dismiss modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Prevent background scrolling when modal is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleDismiss = () => {
    try {
      localStorage.setItem('vietnam_travel_permissions_prompted', 'true');
    } catch {}
    onClose();
  };

  const handleRequestGeolocation = async (): Promise<boolean> => {
    setIsRequestingGeo(true);
    setActionFeedback(null);

    const result = await requestGeolocationPermission();
    setIsRequestingGeo(false);

    if (result.success) {
      setActionFeedback({
        type: 'success',
        message: result.message,
      });
      return true;
    } else {
      setActionFeedback({
        type: 'warning',
        message:
          result.status === 'denied'
            ? 'Permiso de ubicación bloqueado. Puedes habilitarlo pulsando el icono del candado 🔒 en la barra de tu navegador.'
            : result.message,
      });
      return false;
    }
  };

  const handleRequestMicrophone = async (): Promise<boolean> => {
    setIsRequestingMic(true);
    setActionFeedback(null);

    const result = await requestMicrophonePermission();
    setIsRequestingMic(false);

    if (result.success) {
      setActionFeedback({
        type: 'success',
        message: result.message,
      });
      return true;
    } else {
      setActionFeedback({
        type: 'warning',
        message:
          'Permiso de micrófono bloqueado. Puedes permitirlo haciendo clic en el icono del candado 🔒 en la barra de direcciones.',
      });
      return false;
    }
  };

  const handleRequestAll = async () => {
    setIsRequestingAll(true);
    setActionFeedback(null);

    const { geoResult, micResult, allGranted } = await requestAllPermissions();
    setIsRequestingAll(false);

    if (allGranted) {
      setActionFeedback({
        type: 'success',
        message: '✓ ¡Todos los permisos han sido concedidos con éxito!',
      });
    } else if (geoResult.success || micResult.success) {
      setActionFeedback({
        type: 'info',
        message: `${geoResult.message} ${micResult.message}`,
      });
    } else {
      setActionFeedback({
        type: 'warning',
        message: 'Algunos permisos fueron bloqueados por el navegador. Puedes activarlos en el candado 🔒 de la barra de direcciones.',
      });
    }
  };

  if (!isOpen) return null;

  const allGranted = geoStatus === 'granted' && micStatus === 'granted';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="permissions-modal-title"
    >
      {/* Darkened Backdrop Blur */}
      <div
        className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm transition-opacity duration-200"
        onClick={handleDismiss}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-xl bg-[#141210] border border-stone-800 text-stone-100 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col my-auto z-10 animate-fade-in max-h-[92vh]">
        {/* Header Ribbon / Banner */}
        <div className="px-6 py-5 border-b border-stone-800/80 bg-stone-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <Compass className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-amber-400">Vietnam Travel Companion</span>
                <span className="text-stone-600 text-xs">·</span>
                <span className="text-xs text-stone-400">Configuración</span>
              </div>
              <h2 id="permissions-modal-title" className="text-lg font-serif font-bold text-white tracking-wide">
                Permisos Necesarios para tu Viaje
              </h2>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-100 hover:bg-stone-800/80 transition cursor-pointer border border-transparent hover:border-stone-700"
            aria-label="Cerrar modal de permisos"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          <p className="text-sm text-stone-300 leading-relaxed">
            Para ofrecerte una experiencia completa durante tu estancia en Vietnam, nuestra app utiliza dos funciones de tu dispositivo. Puedes activarlas ahora de forma directa:
          </p>

          {/* Feedback banner if an action was taken */}
          {actionFeedback && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2.5 border ${
                actionFeedback.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-200'
                  : actionFeedback.type === 'warning'
                  ? 'bg-amber-950/60 border-amber-700/60 text-amber-200'
                  : 'bg-stone-800 border-stone-700 text-stone-200'
              }`}
            >
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-snug">{actionFeedback.message}</span>
            </div>
          )}

          {/* 1. GEOLOCATION PERMISSION CARD */}
          <div className="p-4 rounded-xl bg-stone-950/50 border border-stone-800 hover:border-stone-700 transition">
            <div className="flex items-start justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-sky-950/80 border border-sky-600/40 text-sky-400 shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Geolocalización y GPS</h3>
                  <div className="flex items-center gap-2 text-xs text-stone-400 mt-0.5">
                    <span>Ubicación en tiempo real</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-sky-300 font-medium">Mapas & Rutas</span>
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="shrink-0">
                {geoStatus === 'granted' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-700/60">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Concedido</span>
                  </span>
                ) : geoStatus === 'denied' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-950 text-rose-300 border border-rose-700/60">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Bloqueado</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-stone-800 text-stone-300 border border-stone-700">
                    <span>Pendiente</span>
                  </span>
                )}
              </div>
            </div>

            {/* Explanation of what GPS is used for */}
            <div className="space-y-1.5 text-xs text-stone-300 pl-1 mb-3.5 border-l-2 border-sky-500/40 ml-2">
              <p className="flex items-baseline gap-2">
                <span className="font-semibold text-sky-300">🍽️ Restaurantes cercanos:</span>
                <span>Encuentra comida local y puestos recomendados a menos de 500m de tu posición.</span>
              </p>
              <p className="flex items-baseline gap-2">
                <span className="font-semibold text-sky-300">🗺️ Mapas interactivos:</span>
                <span>Sitúate al instante sobre el mapa de Hanói, Sa Pa, Hội An, Hue o Saigón.</span>
              </p>
              <p className="flex items-baseline gap-2">
                <span className="font-semibold text-sky-300">🎧 Free Tour inteligente:</span>
                <span>Detecta monumentos cercanos para narrarte su historia cultural con IA.</span>
              </p>
            </div>

            {/* Direct Action Button for Geolocation */}
            <div className="flex items-center justify-between pt-2 border-t border-stone-800/80">
              <span className="text-[11px] text-stone-400">
                {geoStatus === 'granted'
                  ? 'El sensor GPS está listo para usarse.'
                  : 'Requiere permiso de ubicación del navegador.'}
              </span>
              <button
                type="button"
                onClick={handleRequestGeolocation}
                disabled={isRequestingGeo || geoStatus === 'granted'}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  geoStatus === 'granted'
                    ? 'bg-stone-800 text-stone-400 cursor-default opacity-80'
                    : 'bg-sky-600 hover:bg-sky-500 text-white shadow-xs active:scale-95 disabled:opacity-50'
                }`}
              >
                {isRequestingGeo ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Solicitando...</span>
                  </>
                ) : geoStatus === 'granted' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Activado</span>
                  </>
                ) : geoStatus === 'denied' ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reintentar Permiso</span>
                  </>
                ) : (
                  <>
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Permitir Ubicación</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 2. MICROPHONE PERMISSION CARD */}
          <div className="p-4 rounded-xl bg-stone-950/50 border border-stone-800 hover:border-stone-700 transition">
            <div className="flex items-start justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-950/80 border border-amber-600/40 text-amber-400 shrink-0">
                  <Mic className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Micrófono y Reconocimiento de Voz</h3>
                  <div className="flex items-center gap-2 text-xs text-stone-400 mt-0.5">
                    <span>Traducción oral en vivo</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-amber-300 font-medium">Español ⇄ Tiếng Việt</span>
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="shrink-0">
                {micStatus === 'granted' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-700/60">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Concedido</span>
                  </span>
                ) : micStatus === 'denied' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-950 text-rose-300 border border-rose-700/60">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Bloqueado</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-stone-800 text-stone-300 border border-stone-700">
                    <span>Pendiente</span>
                  </span>
                )}
              </div>
            </div>

            {/* Explanation of what Mic is used for */}
            <div className="space-y-1.5 text-xs text-stone-300 pl-1 mb-3.5 border-l-2 border-amber-500/40 ml-2">
              <p className="flex items-baseline gap-2">
                <span className="font-semibold text-amber-300">🗣️ Modo Conversación:</span>
                <span>Habla en español y escucha cómo la app traduce tus palabras al vietnamita.</span>
              </p>
              <p className="flex items-baseline gap-2">
                <span className="font-semibold text-amber-300">🔊 Respuesta del interlocutor:</span>
                <span>Permite que los vietnamitas respondan hablando y traduzca su voz a español.</span>
              </p>
              <p className="flex items-baseline gap-2">
                <span className="font-semibold text-amber-300">⚡ Agilidad en la calle:</span>
                <span>Pide la cuenta, regatea o pregunta precios en mercados sin tener que teclear.</span>
              </p>
            </div>

            {/* Direct Action Button for Microphone */}
            <div className="flex items-center justify-between pt-2 border-t border-stone-800/80">
              <span className="text-[11px] text-stone-400">
                {micStatus === 'granted'
                  ? 'El micrófono está listo para traducción por voz.'
                  : 'Requiere acceso para escuchar tu voz.'}
              </span>
              <button
                type="button"
                onClick={handleRequestMicrophone}
                disabled={isRequestingMic || micStatus === 'granted'}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  micStatus === 'granted'
                    ? 'bg-stone-800 text-stone-400 cursor-default opacity-80'
                    : 'bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold shadow-xs active:scale-95 disabled:opacity-50'
                }`}
              >
                {isRequestingMic ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Solicitando...</span>
                  </>
                ) : micStatus === 'granted' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Activado</span>
                  </>
                ) : micStatus === 'denied' ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reintentar Permiso</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5" />
                    <span>Permitir Micrófono</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Privacy Note */}
          <div className="p-3 rounded-xl bg-stone-950/40 border border-stone-800/60 flex items-start gap-2.5 text-stone-400 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-stone-200">Privacidad y Seguridad:</strong> Tus coordenadas GPS y audios se procesan directamente en tu dispositivo y nunca se guardan en servidores externos.
            </p>
          </div>
        </div>

        {/* Modal Footer / Primary Actions */}
        <div className="p-4 border-t border-stone-800 bg-stone-950/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full sm:w-auto px-4 py-2 text-xs font-medium text-stone-400 hover:text-stone-200 transition cursor-pointer text-center"
          >
            Continuar sin conceder ahora
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {!allGranted ? (
              <button
                type="button"
                onClick={handleRequestAll}
                disabled={isRequestingAll}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isRequestingAll ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Solicitando permisos...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Permitir todos los permisos</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDismiss}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>¡Todo listo! Entrar a la Guía</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
