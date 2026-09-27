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
  ExternalLink,
  Copy,
  Check,
  Smartphone,
  Laptop,
  HelpCircle,
  SlidersHorizontal,
} from 'lucide-react';
import {
  PermissionStatusType,
  subscribePermissions,
  queryBrowserPermissions,
  requestGeolocationPermission,
  requestMicrophonePermission,
  requestAllPermissions,
} from '../utils/permissions';
import { VIETNAM_SIMULATION_PRESETS } from '../utils/geolocation';

export type { PermissionStatusType };

interface PermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionsChange?: (geo: PermissionStatusType, mic: PermissionStatusType) => void;
  onSelectSimulationPreset?: (presetId: string) => void;
}

type ModalTab = 'permissions' | 'browser_guide' | 'simulate';
type BrowserType = 'chrome' | 'safari_ios' | 'safari_mac' | 'firefox' | 'edge' | 'android';

export const PermissionsModal: React.FC<PermissionsModalProps> = ({
  isOpen,
  onClose,
  onPermissionsChange,
  onSelectSimulationPreset,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('permissions');
  const [selectedBrowser, setSelectedBrowser] = useState<BrowserType>('chrome');
  const [geoStatus, setGeoStatus] = useState<PermissionStatusType>('unknown');
  const [micStatus, setMicStatus] = useState<PermissionStatusType>('unknown');
  const [isRequestingGeo, setIsRequestingGeo] = useState(false);
  const [isRequestingMic, setIsRequestingMic] = useState(false);
  const [isRequestingAll, setIsRequestingAll] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'warning' | 'info';
    message: string;
  } | null>(null);

  // Auto detect user browser / device
  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const ua = navigator.userAgent || '';
    if (/iPhone|iPad|iPod/i.test(ua)) {
      setSelectedBrowser('safari_ios');
    } else if (/Android/i.test(ua)) {
      setSelectedBrowser('android');
    } else if (/Macintosh/i.test(ua) && /Safari/i.test(ua) && !/Chrome|Chromium|Edg/i.test(ua)) {
      setSelectedBrowser('safari_mac');
    } else if (/Edg/i.test(ua)) {
      setSelectedBrowser('edge');
    } else if (/Firefox/i.test(ua)) {
      setSelectedBrowser('firefox');
    } else {
      setSelectedBrowser('chrome');
    }
  }, []);

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

  const handleCopyUrl = async () => {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleOpenInNewTab = () => {
    try {
      window.open(window.location.href, '_blank', 'noopener,noreferrer');
    } catch {}
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
            ? 'El navegador tiene bloqueada la ubicación. Mira la pestaña "Ajustes de Navegador" para desbloquearla paso a paso.'
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
          'El navegador tiene bloqueado el micrófono. Revisa la pestaña "Ajustes de Navegador" para activarlo.',
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
        message: 'Permisos bloqueados por el navegador. Toca "Ajustes del Navegador" arriba para ver la guía exacta.',
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
        className="fixed inset-0 bg-stone-950/85 backdrop-blur-md transition-opacity duration-200"
        onClick={handleDismiss}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-2xl bg-[#141210] border border-stone-800 text-stone-100 rounded-3xl shadow-[0_25px_70px_-15px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col my-auto z-10 animate-fade-in max-h-[92vh]">
        {/* Header Ribbon / Banner */}
        <div className="px-5 sm:px-6 py-4 border-b border-stone-800/80 bg-stone-950/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <Compass className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-amber-400">Vietnam Travel Companion</span>
                <span className="text-stone-600 text-xs">·</span>
                <span className="text-xs text-stone-400">Permisos & Ajustes</span>
              </div>
              <h2 id="permissions-modal-title" className="text-base sm:text-lg font-serif font-bold text-white tracking-wide">
                Configuración de Permisos y Ubicación
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

        {/* Navigation Tabs */}
        <div className="flex border-b border-stone-800/80 bg-stone-900/50 px-4 sm:px-6 gap-2 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('permissions')}
            className={`py-3 px-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'permissions'
                ? 'border-amber-400 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Permisos Directos</span>
          </button>

          <button
            onClick={() => setActiveTab('browser_guide')}
            className={`py-3 px-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'browser_guide'
                ? 'border-amber-400 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Cómo Desbloquear en tu Navegador ⚙️</span>
          </button>

          <button
            onClick={() => setActiveTab('simulate')}
            className={`py-3 px-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'simulate'
                ? 'border-amber-400 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Ubicación Virtual en Vietnam 🇻🇳</span>
          </button>
        </div>

        {/* Modal Body / Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-4 max-h-[60vh]">
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
              <div className="flex-1 leading-snug">
                {actionFeedback.message}
                {actionFeedback.type === 'warning' && (
                  <button
                    onClick={() => setActiveTab('browser_guide')}
                    className="block mt-1.5 text-amber-300 font-bold underline hover:text-white"
                  >
                    Ver cómo desbloquearlo en los ajustes del navegador &rarr;
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 1: DIRECT PERMISSIONS */}
          {activeTab === 'permissions' && (
            <>
              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                Para el modo mapa, radar de restaurantes y traducción por voz, pulsa en los botones para conceder los permisos directos:
              </p>

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
                      : geoStatus === 'denied'
                      ? 'Bloqueado en el navegador.'
                      : 'Requiere permiso de ubicación.'}
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
                </div>

                {/* Direct Action Button for Microphone */}
                <div className="flex items-center justify-between pt-2 border-t border-stone-800/80">
                  <span className="text-[11px] text-stone-400">
                    {micStatus === 'granted'
                      ? 'Micrófono listo para traducción.'
                      : micStatus === 'denied'
                      ? 'Bloqueado en el navegador.'
                      : 'Requiere acceso de audio.'}
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

              {/* If permissions are blocked banner */}
              {(geoStatus === 'denied' || micStatus === 'denied') && (
                <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-600/40 text-xs text-amber-200 flex items-start gap-3">
                  <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <strong className="block text-white mb-0.5">¿Por qué el navegador no abre los ajustes directamente?</strong>
                    Por seguridad del estándar web, las páginas web no pueden abrir automáticamente el menú de ajustes de tu sistema operativo. Debes permitirlo manualmente desde la barra de tu navegador.
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        onClick={() => setActiveTab('browser_guide')}
                        className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg transition text-[11px]"
                      >
                        Ver Guía paso a paso ⚙️
                      </button>
                      <button
                        onClick={handleOpenInNewTab}
                        className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-white font-medium rounded-lg transition text-[11px] flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Abrir en Pestaña Nueva</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* TAB 2: BROWSER SETTINGS GUIDE */}
          {activeTab === 'browser_guide' && (
            <div className="space-y-4">
              <div className="p-3 bg-stone-900 border border-stone-800 rounded-xl text-xs text-stone-300">
                <p className="font-semibold text-white mb-1">
                  🔒 ¿Por qué está bloqueado y cómo cambiarlo?
                </p>
                <p className="leading-relaxed">
                  Si le diste a &quot;Bloquear&quot; previamente, el navegador guarda esa decisión. Sigue estos 3 pasos rápidos según tu navegador para cambiarlo a <strong>&quot;Permitir&quot;</strong>:
                </p>
              </div>

              {/* Browser Selector Pill List */}
              <div className="flex flex-wrap gap-1.5 pb-1">
                {[
                  { id: 'chrome', label: 'Chrome (PC/Mac/Android)', icon: '🌐' },
                  { id: 'safari_ios', label: 'Safari iPhone/iPad', icon: '📱' },
                  { id: 'safari_mac', label: 'Safari Mac', icon: '💻' },
                  { id: 'firefox', label: 'Firefox', icon: '🦊' },
                  { id: 'edge', label: 'Microsoft Edge', icon: '🌊' },
                ].map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBrowser(b.id as BrowserType)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
                      selectedBrowser === b.id
                        ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-sm'
                        : 'bg-stone-900 text-stone-300 border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    <span>{b.icon}</span>
                    <span>{b.label}</span>
                  </button>
                ))}
              </div>

              {/* Steps Guide Content */}
              <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-3.5">
                {selectedBrowser === 'chrome' && (
                  <div className="space-y-3 text-xs text-stone-300">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0 border border-amber-500/30">
                        1
                      </div>
                      <div>
                        <strong className="text-white">Toca el icono del candado 🔒 o controles de página:</strong>
                        <p className="text-stone-400 mt-0.5">
                          En la parte superior izquierda de la barra de direcciones (justo antes de <code className="text-amber-300 bg-stone-900 px-1 py-0.5 rounded">https://...</code>).
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0 border border-amber-500/30">
                        2
                      </div>
                      <div>
                        <strong className="text-white">Activa &quot;Ubicación&quot; y &quot;Micrófono&quot;:</strong>
                        <p className="text-stone-400 mt-0.5">
                          Cambia los interruptores de Ubicación y Micrófono de &quot;Bloqueado&quot; a <strong>&quot;Permitir&quot;</strong> (o entra en <em>Configuración del sitio</em>).
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0 border border-amber-500/30">
                        3
                      </div>
                      <div>
                        <strong className="text-white">Recarga la página:</strong>
                        <p className="text-stone-400 mt-0.5">
                          Pulsa el botón de recargar del navegador (o el botón &quot;Recargar aplicación&quot; abajo) para aplicar los cambios.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedBrowser === 'safari_ios' && (
                  <div className="space-y-3 text-xs text-stone-300">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0 border border-amber-500/30">
                        1
                      </div>
                      <div>
                        <strong className="text-white">Toca el botón &quot;aA&quot; en Safari:</strong>
                        <p className="text-stone-400 mt-0.5">
                          Ubicado en la barra de direcciones inferior o superior de tu iPhone / iPad.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0 border border-amber-500/30">
                        2
                      </div>
                      <div>
                        <strong className="text-white">Entra en &quot;Configuración del sitio web&quot;:</strong>
                        <p className="text-stone-400 mt-0.5">
                          En las opciones de <strong>Ubicación</strong> y <strong>Micrófono</strong>, selecciona <strong>&quot;Permitir&quot;</strong>.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0 border border-amber-500/30">
                        3
                      </div>
                      <div>
                        <strong className="text-white">Ajustes generales de iOS (si sigue bloqueado):</strong>
                        <p className="text-stone-400 mt-0.5">
                          Ve a <em>Ajustes de iPhone &gt; Privacidad y Seguridad &gt; Localización &gt; Sitios web de Safari &gt; &quot;Al usar la app&quot;</em>.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedBrowser === 'safari_mac' && (
                  <div className="space-y-3 text-xs text-stone-300">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0 border border-amber-500/30">
                        1
                      </div>
                      <div>
                        <strong className="text-white">Menú Safari &gt; Ajustes para este sitio web:</strong>
                        <p className="text-stone-400 mt-0.5">
                          En la barra de menú superior de tu Mac con Safari abierto.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0 border border-amber-500/30">
                        2
                      </div>
                      <div>
                        <strong className="text-white">Establece Ubicación y Micrófono en &quot;Permitir&quot;:</strong>
                        <p className="text-stone-400 mt-0.5">
                          O abre <em>Safari &gt; Ajustes &gt; Sitios web</em> y actívalos para esta dirección.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedBrowser === 'firefox' && (
                  <div className="space-y-3 text-xs text-stone-300">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0 border border-amber-500/30">
                        1
                      </div>
                      <div>
                        <strong className="text-white">Toca el candado o el icono de permisos 🔒:</strong>
                        <p className="text-stone-400 mt-0.5">
                          A la izquierda de la barra de direcciones de Firefox.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0 border border-amber-500/30">
                        2
                      </div>
                      <div>
                        <strong className="text-white">Elimina el bloqueo [X]:</strong>
                        <p className="text-stone-400 mt-0.5">
                          Pulsa la &quot;X&quot; junto a &quot;Bloqueado temporalmente&quot; o &quot;Bloqueado&quot; en Ubicación y Micrófono.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedBrowser === 'edge' && (
                  <div className="space-y-3 text-xs text-stone-300">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0 border border-amber-500/30">
                        1
                      </div>
                      <div>
                        <strong className="text-white">Toca el candado 🔒 en la barra de URL:</strong>
                        <p className="text-stone-400 mt-0.5">
                          Selecciona <em>&quot;Permisos para este sitio&quot;</em>.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0 border border-amber-500/30">
                        2
                      </div>
                      <div>
                        <strong className="text-white">Cambia a &quot;Permitir&quot;:</strong>
                        <p className="text-stone-400 mt-0.5">
                          Ubicación y Micrófono &rarr; Permitir.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons for iframe / new tab */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleOpenInNewTab}
                  className="px-3.5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-100 font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer border border-stone-700"
                >
                  <ExternalLink className="w-4 h-4 text-sky-400" />
                  <span>Abrir en Pestaña Independiente</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="px-3.5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-100 font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer border border-stone-700"
                >
                  {copiedUrl ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>¡Enlace Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-amber-400" />
                      <span>Copiar Enlace de la App</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: SIMULATE VIETNAM LOCATION */}
          {activeTab === 'simulate' && (
            <div className="space-y-3">
              <div className="p-3 bg-stone-900 border border-stone-800 rounded-xl text-xs text-stone-300">
                <p className="font-semibold text-white mb-1">
                  🇻🇳 ¿Estás preparando el viaje desde España o tu casa?
                </p>
                <p className="leading-relaxed">
                  Si no estás en Vietnam o tu navegador no tiene GPS, puedes teletransportarte al instante a cualquier ciudad vietnamita para probar todos los radares de restaurantes, rutas y audio-guías:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {VIETNAM_SIMULATION_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      if (onSelectSimulationPreset) {
                        onSelectSimulationPreset(preset.id);
                      }
                      setActionFeedback({
                        type: 'success',
                        message: `✓ Posición simulada activada en ${preset.name}.`,
                      });
                      setTimeout(() => {
                        handleDismiss();
                      }, 800);
                    }}
                    className="p-3 rounded-xl bg-stone-950 border border-stone-800 hover:border-amber-500/60 hover:bg-stone-900 text-left transition flex items-start gap-2.5 cursor-pointer group"
                  >
                    <span className="text-xl shrink-0 group-hover:scale-110 transition">{preset.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs text-white group-hover:text-amber-400 transition truncate">
                        {preset.name}
                      </div>
                      <div className="text-[11px] text-stone-400 line-clamp-1 mt-0.5">
                        {preset.poiName}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Privacy Note */}
          <div className="p-3 rounded-xl bg-stone-950/40 border border-stone-800/60 flex items-start gap-2.5 text-stone-400 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-stone-200">Privacidad y Seguridad:</strong> Tus coordenadas GPS y audios se procesan directamente en tu dispositivo y nunca se guardan en servidores externos.
            </p>
          </div>
        </div>

        {/* Modal Footer / Primary Actions */}
        <div className="p-4 border-t border-stone-800 bg-stone-950/90 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full sm:w-auto px-4 py-2 text-xs font-medium text-stone-400 hover:text-stone-200 transition cursor-pointer text-center"
          >
            Continuar usando la app
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
                    <span>Reintentar Permisos</span>
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
