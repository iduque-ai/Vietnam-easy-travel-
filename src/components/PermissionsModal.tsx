import React, { useState, useEffect } from 'react';
import {
  Navigation,
  Mic,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  X,
  Compass,
  Lock,
  ChevronDown,
  ChevronUp,
  MapPin,
  Sparkles,
  Slash,
} from 'lucide-react';
import {
  PermissionStatusType,
  subscribePermissions,
  queryBrowserPermissions,
  requestGeolocationPermission,
  requestMicrophonePermission,
  requestAllPermissions,
  deactivatePermission,
  deactivateAllPermissions,
} from '../utils/permissions';
import { VIETNAM_SIMULATION_PRESETS } from '../utils/geolocation';
import { useScrollLock } from '../hooks/useScrollLock';

export type { PermissionStatusType };

interface PermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionsChange?: (geo: PermissionStatusType, mic: PermissionStatusType) => void;
  onSelectSimulationPreset?: (presetId: string) => void;
}

export const PermissionsModal: React.FC<PermissionsModalProps> = ({
  isOpen,
  onClose,
  onPermissionsChange,
  onSelectSimulationPreset,
}) => {
  useScrollLock(isOpen);

  const [geoStatus, setGeoStatus] = useState<PermissionStatusType>('unknown');
  const [micStatus, setMicStatus] = useState<PermissionStatusType>('unknown');
  const [isRequestingGeo, setIsRequestingGeo] = useState(false);
  const [isRequestingMic, setIsRequestingMic] = useState(false);
  const [isRequestingAll, setIsRequestingAll] = useState(false);
  const [showSimulation, setShowSimulation] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

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
      setFeedback(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const anyGranted = geoStatus === 'granted' || micStatus === 'granted';
  const allGranted = geoStatus === 'granted' && micStatus === 'granted';
  const hasDenied = geoStatus === 'denied' || micStatus === 'denied';

  const handleRequestGeo = async () => {
    setIsRequestingGeo(true);
    setFeedback(null);
    const res = await requestGeolocationPermission();
    setIsRequestingGeo(false);
    if (res.success) {
      setFeedback('✓ Ubicación activada correctamente.');
    } else if (res.status === 'denied') {
      setFeedback('El navegador bloqueó la ubicación. Desbloquéala desde el icono de candado 🔒.');
    }
  };

  const handleDeactivateGeo = () => {
    deactivatePermission('geolocation');
    setFeedback('Ubicación desactivada en la aplicación.');
  };

  const handleRequestMic = async () => {
    setIsRequestingMic(true);
    setFeedback(null);
    const res = await requestMicrophonePermission();
    setIsRequestingMic(false);
    if (res.success) {
      setFeedback('✓ Micrófono activado correctamente.');
    } else if (res.status === 'denied') {
      setFeedback('El navegador bloqueó el micrófono. Desbloquéalo desde el icono de candado 🔒.');
    }
  };

  const handleDeactivateMic = () => {
    deactivatePermission('microphone');
    setFeedback('Micrófono desactivado en la aplicación.');
  };

  const handleRequestAll = async () => {
    setIsRequestingAll(true);
    setFeedback(null);
    const { allGranted } = await requestAllPermissions();
    setIsRequestingAll(false);
    if (allGranted) {
      setFeedback('✓ ¡Todos los permisos activados con éxito!');
    }
  };

  const handleDeactivateAll = () => {
    deactivateAllPermissions();
    setFeedback('Todos los permisos han sido desactivados en la aplicación.');
  };

  const getStatusBadge = (status: PermissionStatusType) => {
    if (status === 'granted') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/60 shadow-2xs">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Activo</span>
        </span>
      );
    }
    if (status === 'denied') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-950 text-rose-300 border border-rose-800/60 shadow-2xs">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Inactivo / Bloqueado</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-800 text-stone-300 border border-stone-700/60 shadow-2xs">
        <span>Pendiente</span>
      </span>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#181614] text-stone-100 border border-stone-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl space-y-0 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-stone-800/80 flex items-center justify-between bg-stone-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-inner">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-white">
                Permisos de la Aplicación
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition cursor-pointer"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Feedback notice if any action taken */}
          {feedback && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 font-medium">
              {feedback}
            </div>
          )}

          {/* 1. GPS / Location Card */}
          <div className="p-4 rounded-2xl bg-stone-900/90 border border-stone-800/90 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-950/80 border border-sky-600/40 text-sky-400 flex items-center justify-center shrink-0">
                  <Navigation className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-stone-100">Ubicación (GPS)</h4>
                  <p className="text-[11px] text-stone-400">
                    Posición y restaurantes cercanos en el mapa
                  </p>
                </div>
              </div>
              {getStatusBadge(geoStatus)}
            </div>

            <div className="pt-1">
              {geoStatus === 'granted' ? (
                <button
                  type="button"
                  onClick={handleDeactivateGeo}
                  className="w-full py-2 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Slash className="w-3.5 h-3.5 text-rose-400" />
                  <span>Desactivar Ubicación</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRequestGeo}
                  disabled={isRequestingGeo}
                  className="w-full py-2 px-3 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>{isRequestingGeo ? 'Comprobando...' : 'Activar Ubicación'}</span>
                </button>
              )}
            </div>
          </div>

          {/* 2. Microphone Card */}
          <div className="p-4 rounded-2xl bg-stone-900/90 border border-stone-800/90 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-950/80 border border-amber-600/40 text-amber-400 flex items-center justify-center shrink-0">
                  <Mic className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-stone-100">Micrófono</h4>
                  <p className="text-[11px] text-stone-400">
                    Dictado por voz para el traductor en vivo
                  </p>
                </div>
              </div>
              {getStatusBadge(micStatus)}
            </div>

            <div className="pt-1">
              {micStatus === 'granted' ? (
                <button
                  type="button"
                  onClick={handleDeactivateMic}
                  className="w-full py-2 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Slash className="w-3.5 h-3.5 text-rose-400" />
                  <span>Desactivar Micrófono</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRequestMic}
                  disabled={isRequestingMic}
                  className="w-full py-2 px-3 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>{isRequestingMic ? 'Comprobando...' : 'Activar Micrófono'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Global Actions */}
          <div className="pt-1 flex flex-col gap-2">
            {!allGranted && (
              <button
                type="button"
                onClick={handleRequestAll}
                disabled={isRequestingAll}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-bold text-xs shadow-md hover:from-amber-400 hover:to-amber-500 transition cursor-pointer active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isRequestingAll ? 'Solicitando...' : 'Activar todos los permisos'}</span>
              </button>
            )}

            {anyGranted && (
              <button
                type="button"
                onClick={handleDeactivateAll}
                className="w-full py-2 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-rose-300 border border-stone-800 text-xs font-semibold transition cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Slash className="w-3.5 h-3.5" />
                <span>Desactivar todos los permisos</span>
              </button>
            )}
          </div>

          {/* Helpful 1-line hint if any permission was blocked in browser */}
          {hasDenied && (
            <div className="p-3 rounded-xl bg-stone-900 border border-stone-800 text-[11px] text-stone-400 leading-relaxed flex items-start gap-2">
              <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-stone-300">Ajuste del navegador:</strong> También puedes cambiar o revocar permisos pulsando en el icono de candado 🔒 junto a la URL.
              </div>
            </div>
          )}

          {/* Optional Simulation Presets (cleanly tucked in an expandable toggle) */}
          {onSelectSimulationPreset && (
            <div className="pt-2 border-t border-stone-800/80">
              <button
                type="button"
                onClick={() => setShowSimulation((prev) => !prev)}
                className="w-full py-1.5 flex items-center justify-between text-xs text-stone-400 hover:text-stone-200 transition cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>¿Estás probando fuera de Vietnam?</span>
                </span>
                {showSimulation ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showSimulation && (
                <div className="mt-2.5 p-3 rounded-xl bg-stone-950/60 border border-stone-800 space-y-2">
                  <p className="text-[11px] text-stone-400">
                    Simula que estás físicamente en una ciudad para ver el radar de restaurantes:
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {VIETNAM_SIMULATION_PRESETS.slice(0, 4).map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          onSelectSimulationPreset(preset.id);
                          setFeedback(`📍 Posición simulada en ${preset.name}`);
                        }}
                        className="p-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-800 text-[11px] font-medium text-left truncate transition cursor-pointer active:scale-95"
                      >
                        📍 {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-900/60 border-t border-stone-800/80 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white font-bold text-xs transition cursor-pointer shadow-xs active:scale-95 border border-stone-700"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
