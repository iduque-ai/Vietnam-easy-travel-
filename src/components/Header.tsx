import React, { useState, useEffect, useCallback } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Compass,
  ArrowRightLeft,
  Languages,
  MapPin,
  CalendarDays,
  Menu,
  X,
  ChevronRight,
  Sparkles,
  UtensilsCrossed,
  Mic,
  Navigation,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  ShieldAlert,
  PhoneCall,
} from 'lucide-react';
import { ExchangeRatesData, ActiveTabType } from '../types';

interface HeaderProps {
  activeTab: ActiveTabType;
  setActiveTab: (tab: ActiveTabType) => void;
  ratesData: ExchangeRatesData;
  isOnline: boolean;
  isRefreshing: boolean;
  onRefreshRates: () => void;
  onOpenConversationMode?: () => void;
  onToggleOnlineMode?: () => void;
  onOpenPermissionsModal?: () => void;
  onOpenEmergencyModal?: () => void;
  vietnamTime?: string;
  spainTime?: string;
}

const NAV_ITEMS: {
  id: ActiveTabType;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    id: 'converter',
    label: 'Conversor de Moneda',
    shortLabel: 'Conversor',
    description: 'Cálculo instantáneo VND/EUR/USD y suma rápida',
    icon: ArrowRightLeft,
  },
  {
    id: 'translator',
    label: 'Traductor & Conversación',
    shortLabel: 'Traductor',
    description: 'Conversación directa inglés-vietnamita, frases clave y platos',
    icon: Languages,
  },
  {
    id: 'restaurants',
    label: 'Dónde Comer & Restaurantes',
    shortLabel: 'Dónde Comer',
    description: 'Restaurantes verificados >4.5★, mapa interactivo y algoritmo según presupuesto',
    icon: UtensilsCrossed,
  },
  {
    id: 'maps',
    label: 'Mapas & Ciudades',
    shortLabel: 'Mapas',
    description: 'Mapas turísticos descargables y enlaces directos a Google Maps',
    icon: MapPin,
  },
  {
    id: 'itinerary',
    label: 'Itinerario de Viaje',
    shortLabel: 'Itinerario',
    description: 'Planes detallados por día, horarios y recomendaciones',
    icon: CalendarDays,
  },
  {
    id: 'freetour',
    label: 'Free Tour con IA',
    shortLabel: 'Free Tour IA',
    description: 'Tu audioguía turístico con Gemini en cualquier lugar',
    icon: Sparkles,
  },
];

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  ratesData,
  isOnline,
  isRefreshing,
  onRefreshRates,
  onOpenConversationMode,
  onToggleOnlineMode,
  onOpenPermissionsModal,
  onOpenEmergencyModal,
  vietnamTime,
  spainTime,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [geoStatus, setGeoStatus] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown');
  const [micStatus, setMicStatus] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown');
  const [isRequestingPerms, setIsRequestingPerms] = useState(false);

  const checkPermissions = useCallback(async () => {
    if (typeof navigator !== 'undefined' && (navigator as any).permissions) {
      try {
        const geo = await (navigator as any).permissions.query({ name: 'geolocation' });
        setGeoStatus(geo.state);
        geo.onchange = () => setGeoStatus(geo.state);
      } catch {}

      try {
        const mic = await (navigator as any).permissions.query({ name: 'microphone' as any });
        setMicStatus(mic.state);
        mic.onchange = () => setMicStatus(mic.state);
      } catch {}
    }
  }, []);

  useEffect(() => {
    checkPermissions();
    if (isDrawerOpen) {
      checkPermissions();
    }
  }, [isDrawerOpen, checkPermissions]);

  const handleRequestPermissions = async () => {
    setIsRequestingPerms(true);
    // Request GPS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {
          setGeoStatus('granted');
        },
        (err) => {
          if (err.code === 1) setGeoStatus('denied');
        },
        { timeout: 8000, enableHighAccuracy: true }
      );
    }
    // Request Mic
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        setMicStatus('granted');
      } catch {
        setMicStatus('denied');
      }
    }
    setTimeout(() => {
      checkPermissions();
      setIsRequestingPerms(false);
    }, 1000);
  };

  // Close drawer on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Prevent background scroll when drawer is open
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isDrawerOpen]);

  // Format rate sample (~29k EUR)
  const usdToVnd = ratesData.rates['VND'] || 26000;
  const eurRate = ratesData.rates['EUR'] || 0.8965;
  const eurToVnd = Math.round(usdToVnd / eurRate);

  const formattedDate = new Date(ratesData.timestamp).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleSelectTab = (id: ActiveTabType) => {
    setActiveTab(id);
    setIsDrawerOpen(false);
  };

  return (
    <>
      <header className="bg-[#141210]/95 text-stone-100 border-b border-stone-800/80 sticky top-0 z-40 shadow-sm backdrop-blur-xl transition-all">
        <div className="max-w-6xl mx-auto px-3 sm:px-6">
          {/* Desktop Navigation Row (md and above) */}
          <div className="hidden md:flex items-center justify-between h-16 gap-4">
            {/* Brand Identity with interactive Online/Offline mode toggle */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 via-amber-600/10 to-transparent border border-amber-500/30 flex items-center justify-center shadow-xs">
                <span className="text-xl leading-none" role="img" aria-label="Vietnam">🇻🇳</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-serif font-bold tracking-tight text-stone-100 text-lg sm:text-xl leading-none">
                    Vietnam Travel
                  </span>
                  <button
                    type="button"
                    onClick={onToggleOnlineMode}
                    className={`group inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition cursor-pointer border shadow-2xs select-none ${
                      isOnline
                        ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/80 hover:border-emerald-400'
                        : 'bg-amber-950/70 border-amber-500/50 text-amber-300 hover:bg-amber-900/80 hover:border-amber-400'
                    }`}
                    title={
                      isOnline
                        ? 'Modo Online activo (Mapas en vivo e IA). Haz clic para cambiar a Modo Offline.'
                        : 'Modo Offline activo (Sin consumo de datos). Haz clic para cambiar a Modo Online.'
                    }
                    aria-label={isOnline ? 'Cambiar a modo offline' : 'Cambiar a modo online'}
                  >
                    <span className={`inline-flex rounded-full h-1.5 w-1.5 ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                    <span>{isOnline ? 'Online' : 'Offline'}</span>
                  </button>
                </div>
                <span className="text-[10px] text-stone-400 tracking-wider uppercase font-medium mt-0.5">
                  Guía Esencial & Asistente Offline
                </span>
              </div>
            </div>

            {/* Centered Navigation Tabs - Refined Segmented Control */}
            <nav className="flex items-center gap-1 bg-stone-900/90 p-1 rounded-xl border border-stone-800/80 backdrop-blur-xs" aria-label="Tabs">
              {NAV_ITEMS.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`tab-${item.id}`}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-bold shadow-xs shadow-amber-500/20'
                        : 'text-stone-300 hover:text-white hover:bg-stone-800/70'
                    }`}
                  >
                    <IconComponent className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-stone-950 stroke-[2.2]' : 'text-stone-400'}`} />
                    <span>{item.shortLabel}</span>
                  </button>
                );
              })}
            </nav>

            {/* Right Action: SOS Emergencias / Permissions / Refresh */}
            <div className="flex items-center gap-2 shrink-0">
              {onOpenEmergencyModal && (
                <button
                  id="btn-open-emergency-desktop"
                  onClick={onOpenEmergencyModal}
                  title="Teléfonos de emergencia 24h (115, 113) y protección consular"
                  aria-label="Emergencias y Asistencia Consular"
                  className="px-3 py-1.5 rounded-xl bg-rose-950/70 hover:bg-rose-900/90 border border-rose-600/50 text-rose-200 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold active:scale-95 shadow-xs"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>SOS 115 / 113</span>
                </button>
              )}

              {onOpenPermissionsModal && (
                <button
                  id="btn-open-permissions-desktop"
                  onClick={onOpenPermissionsModal}
                  title="Gestionar Permisos (GPS y Micrófono)"
                  aria-label="Gestionar Permisos"
                  className={`p-2 rounded-xl border transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
                    geoStatus === 'granted' && micStatus === 'granted'
                      ? 'bg-stone-900/80 hover:bg-stone-800 text-emerald-400 border-stone-800'
                      : 'bg-stone-900/80 hover:bg-stone-800 text-amber-300 border-stone-800'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span className="hidden lg:inline text-stone-200">
                    {geoStatus === 'granted' && micStatus === 'granted' ? 'Permisos' : 'Permisos'}
                  </span>
                </button>
              )}

              <button
                id="btn-refresh-rates-desktop"
                onClick={onRefreshRates}
                disabled={isRefreshing || !isOnline}
                title="Actualizar tasa de cambio"
                aria-label="Actualizar tasa de cambio"
                className="p-2 rounded-xl bg-stone-900/80 hover:bg-stone-800 disabled:opacity-30 text-stone-300 hover:text-amber-400 border border-stone-800 transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* Mobile Header (< md) */}
          <div className="md:hidden py-2.5 flex items-center justify-between gap-2">
            {/* Top Bar with Brand & Mode toggle */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                <span className="text-base leading-none">🇻🇳</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-serif font-bold text-sm text-stone-100 truncate leading-tight">
                  Vietnam Travel
                </span>
                <span className="text-[9px] text-stone-400 tracking-wider uppercase font-medium">
                  Guía Esencial
                </span>
              </div>
              <button
                type="button"
                onClick={onToggleOnlineMode}
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold transition cursor-pointer border shadow-2xs select-none shrink-0 ml-1 ${
                  isOnline
                    ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 active:scale-95'
                    : 'bg-amber-950/80 border-amber-500/50 text-amber-300 active:scale-95'
                }`}
                title={
                  isOnline
                    ? 'Modo Online activo. Toca para cambiar a Modo Offline.'
                    : 'Modo Offline activo. Toca para cambiar a Modo Online.'
                }
                aria-label={isOnline ? 'Cambiar a modo offline' : 'Cambiar a modo online'}
              >
                <span className={`inline-flex rounded-full h-1.5 w-1.5 ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                <span>{isOnline ? 'Online' : 'Offline'}</span>
              </button>
            </div>

            {/* Mobile Actions: SOS + Permissions + Drawer */}
            <div className="flex items-center gap-1.5 shrink-0">
              {onOpenEmergencyModal && (
                <button
                  id="btn-open-mobile-emergency"
                  onClick={onOpenEmergencyModal}
                  className="px-2.5 py-1 rounded-xl bg-rose-950/70 hover:bg-rose-900 border border-rose-600/50 text-rose-200 flex items-center gap-1 text-[11px] font-bold cursor-pointer active:scale-95 transition"
                  title="Emergencias y Embajada"
                  aria-label="Emergencias y Embajada"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  <span>SOS</span>
                </button>
              )}

              {onOpenPermissionsModal && (
                <button
                  id="btn-open-mobile-permissions"
                  onClick={onOpenPermissionsModal}
                  className={`p-1.5 rounded-xl border flex items-center justify-center cursor-pointer active:scale-95 transition ${
                    geoStatus === 'granted' && micStatus === 'granted'
                      ? 'bg-stone-900 text-emerald-400 border-stone-800'
                      : 'bg-stone-900 text-amber-300 border-stone-800'
                  }`}
                  title="Gestionar Permisos de la App (GPS y Micrófono)"
                  aria-label="Permisos del dispositivo"
                >
                  <ShieldCheck className="w-4 h-4" />
                </button>
              )}

              {/* Hamburger button */}
              <button
                id="btn-open-mobile-drawer"
                onClick={() => setIsDrawerOpen(true)}
                className="p-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-800 flex items-center justify-center cursor-pointer active:scale-95 transition"
                aria-label="Abrir menú lateral"
              >
                <Menu className="w-5 h-5 text-stone-200" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Lateral Slide-Out Menu (Menú Lateral Desplegable) */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-stone-950/70 backdrop-blur-xs transition-opacity duration-200 animate-fade-overlay"
            onClick={() => setIsDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <aside
            id="lateral-drawer"
            className="relative w-80 max-w-[85vw] bg-stone-900 border-l border-stone-800 text-stone-100 flex flex-col h-full shadow-2xl z-10 animate-slide-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menú lateral de navegación"
          >
            {/* Drawer Top Bar */}
            <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/40">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl leading-none">🇻🇳</span>
                <div>
                  <h3 className="font-bold text-base text-stone-100">Vietnam Travel</h3>
                  <button
                    type="button"
                    onClick={onToggleOnlineMode}
                    className={`mt-0.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border transition cursor-pointer ${
                      isOnline
                        ? 'bg-emerald-950/60 border-emerald-600/60 text-emerald-300 hover:bg-emerald-900/60'
                        : 'bg-amber-950/60 border-amber-600/60 text-amber-300 hover:bg-amber-900/60'
                    }`}
                    title="Tocar para cambiar entre modo online y offline"
                  >
                    <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                    <span>{isOnline ? 'En línea (Modo Online)' : 'Sin datos (Modo Offline)'}</span>
                    <span className="text-[10px] opacity-70 underline ml-0.5">cambiar</span>
                  </button>
                </div>
              </div>

              <button
                id="btn-close-drawer"
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition cursor-pointer"
                aria-label="Cerrar menú"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Rate Widget inside Drawer */}
            <div className="p-4 border-b border-stone-800 bg-stone-950/20">
              <div className="flex items-center justify-between text-xs text-stone-400 mb-1.5">
                <span>Tipo de cambio oficial</span>
                <button
                  onClick={onRefreshRates}
                  disabled={isRefreshing || !isOnline}
                  className="text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>Actualizar</span>
                </button>
              </div>
              <div className="bg-stone-800/80 rounded-xl p-3 border border-stone-700/60 font-mono flex items-center justify-between">
                <div>
                  <div className="text-amber-400 font-bold text-sm">1 EUR (€)</div>
                  <div className="text-xs text-stone-400">≈ {eurToVnd.toLocaleString('es-ES')} VND (₫)</div>
                </div>
                <div className="text-right">
                  <div className="text-stone-300 font-medium text-xs">1 USD ($)</div>
                  <div className="text-[11px] text-stone-400">≈ {Math.round(usdToVnd).toLocaleString('es-ES')} VND (₫)</div>
                </div>
              </div>
            </div>

            {/* Quick SOS Card in Drawer */}
            {onOpenEmergencyModal && (
              <div className="px-4 py-3 border-b border-stone-800 bg-rose-950/20">
                <button
                  type="button"
                  onClick={() => {
                    setIsDrawerOpen(false);
                    onOpenEmergencyModal();
                  }}
                  className="w-full p-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-700/70 text-rose-200 text-xs font-bold flex items-center justify-between transition cursor-pointer shadow-xs"
                >
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>Emergencias & Embajada 24h</span>
                  </div>
                  <span className="text-[10px] bg-rose-800 text-rose-100 px-2 py-0.5 rounded-md">115 / 113</span>
                </button>
              </div>
            )}

            {/* Navigation Options List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider px-3 py-1">
                Secciones de la Guía
              </div>

              {NAV_ITEMS.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`drawer-tab-${item.id}`}
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full p-3 rounded-xl transition text-left flex items-start gap-3.5 cursor-pointer ${
                      isActive
                        ? 'bg-amber-500 text-stone-950 shadow-md font-semibold'
                        : 'text-stone-200 hover:bg-stone-800/90 border border-transparent hover:border-stone-700/60'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg mt-0.5 ${
                        isActive
                          ? 'bg-stone-950 text-amber-400'
                          : 'bg-stone-800 text-amber-400'
                      }`}
                    >
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">{item.label}</span>
                        <ChevronRight className={`w-4 h-4 ${isActive ? 'text-stone-950' : 'text-stone-500'}`} />
                      </div>
                      <p
                        className={`text-xs mt-0.5 line-clamp-2 leading-relaxed ${
                          isActive ? 'text-stone-800' : 'text-stone-400'
                        }`}
                      >
                        {item.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Permissions Status & Tester Card */}
            <div className="p-3.5 border-t border-stone-800 bg-stone-950/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  Permisos del dispositivo
                </span>
                {onOpenPermissionsModal ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      onOpenPermissionsModal();
                    }}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
                  >
                    Ver detalles
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestPermissions}
                    disabled={isRequestingPerms}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer disabled:opacity-50"
                  >
                    {isRequestingPerms ? 'Comprobando...' : 'Activar / Probar'}
                  </button>
                )}
              </div>

              <div
                onClick={() => {
                  if (onOpenPermissionsModal) {
                    setIsDrawerOpen(false);
                    onOpenPermissionsModal();
                  }
                }}
                className={`grid grid-cols-2 gap-2 text-xs ${onOpenPermissionsModal ? 'cursor-pointer' : ''}`}
                title="Toca para gestionar los permisos de geolocalización y micrófono"
              >
                {/* Geolocation status */}
                <div className="bg-stone-900/90 p-2 rounded-lg border border-stone-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Navigation className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="text-[11px] text-stone-300 font-medium truncate">GPS</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      geoStatus === 'granted'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50'
                        : geoStatus === 'denied'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800/50'
                        : 'bg-stone-800 text-stone-400'
                    }`}
                  >
                    {geoStatus === 'granted' ? 'Activo' : geoStatus === 'denied' ? 'Bloqueado' : 'Pendiente'}
                  </span>
                </div>

                {/* Microphone status */}
                <div className="bg-stone-900/90 p-2 rounded-lg border border-stone-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Mic className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-[11px] text-stone-300 font-medium truncate">Micro</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      micStatus === 'granted'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50'
                        : micStatus === 'denied'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800/50'
                        : 'bg-stone-800 text-stone-400'
                    }`}
                  >
                    {micStatus === 'granted' ? 'Activo' : micStatus === 'denied' ? 'Bloqueado' : 'Pendiente'}
                  </span>
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-3 border-t border-stone-800 bg-stone-950/80 text-center text-xs text-stone-500">
              <p>🇻🇳 Guía Offline de Viaje a Vietnam</p>
              <p className="text-[10px] text-stone-600 mt-0.5">Tasas, mapas y datos guardados localmente</p>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};
