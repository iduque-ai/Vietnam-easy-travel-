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
  ChevronDown,
  Coins,
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
  Lock,
  Volume2,
  Clock,
  SlidersHorizontal,
} from 'lucide-react';
import { ExchangeRatesData, ActiveTabType, CurrencyCode } from '../types';
import { CURRENCIES, getCurrencyInfo, calculateForeignToVndRate } from '../utils/currencyUtils';
import {
  PermissionStatusType,
  subscribePermissions,
  queryBrowserPermissions,
} from '../utils/permissions';
import {
  SpeechSettings,
  getSavedSpeechSettings,
  subscribeSpeechSettings,
} from '../utils/speechSynthesis';
import { useScrollLock } from '../hooks/useScrollLock';
import { CustomRateModal } from './CustomRateModal';

interface HeaderProps {
  activeTab: ActiveTabType;
  setActiveTab: (tab: ActiveTabType) => void;
  ratesData: ExchangeRatesData;
  isOnline: boolean;
  isRefreshing: boolean;
  onRefreshRates: () => void;
  onSaveCustomRates?: (newRates: ExchangeRatesData) => void;
  onOpenConversationMode?: () => void;
  onToggleOnlineMode?: () => void;
  onOpenPermissionsModal?: () => void;
  onOpenEmergencyModal?: () => void;
  onOpenVoiceSettings?: () => void;
  vietnamTime?: string;
  spainTime?: string;
  selectedCurrency: CurrencyCode;
  onSelectCurrency: (currency: CurrencyCode) => void;
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
    label: 'Diálogo en Vivo',
    shortLabel: 'Traductor',
    description: 'Traducción bidireccional en tiempo real con voz y respuestas rápidas',
    icon: Languages,
  },
  {
    id: 'restaurants',
    label: 'Dónde Comer & Restaurantes',
    shortLabel: 'Dónde Comer',
    description: 'Restaurantes verificados >4.5★, mapa interactivo y recomendaciones',
    icon: UtensilsCrossed,
  },
  {
    id: 'trip',
    label: 'Mi Viaje & Rutas',
    shortLabel: 'Mi Viaje',
    description: 'Ruta diaria personalizada con mapa interactivo y paradas',
    icon: MapPin,
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
  onSaveCustomRates,
  onOpenConversationMode,
  onToggleOnlineMode,
  onOpenPermissionsModal,
  onOpenEmergencyModal,
  onOpenVoiceSettings,
  vietnamTime,
  spainTime,
  selectedCurrency,
  onSelectCurrency,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCustomRateModalOpen, setIsCustomRateModalOpen] = useState(false);
  useScrollLock(isDrawerOpen);
  const [geoStatus, setGeoStatus] = useState<PermissionStatusType>('unknown');
  const [micStatus, setMicStatus] = useState<PermissionStatusType>('unknown');
  const [speechSettings, setSpeechSettings] = useState<SpeechSettings>(() => getSavedSpeechSettings());

  useEffect(() => {
    return subscribeSpeechSettings((s) => setSpeechSettings(s));
  }, []);

  useEffect(() => {
    const unsub = subscribePermissions((state) => {
      setGeoStatus(state.geolocation);
      setMicStatus(state.microphone);
    });
    return unsub;
  }, []);

  useEffect(() => {
    queryBrowserPermissions();
    if (isDrawerOpen) {
      queryBrowserPermissions();
    }
  }, [isDrawerOpen]);

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

  // Format rate sample
  const usdToVnd = ratesData.rates['VND'] || 26000;
  const eurRate = ratesData.rates['EUR'] || 0.8965;
  const eurToVnd = Math.round(usdToVnd / eurRate);
  const currInfo = getCurrencyInfo(selectedCurrency);
  const selectedToVnd = calculateForeignToVndRate(ratesData.rates, selectedCurrency);

  const formattedDate = new Date(ratesData.timestamp).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

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
                const isActive =
                  activeTab === item.id ||
                  (item.id === 'trip' && (activeTab === 'itinerary' || activeTab === 'maps'));
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

            {/* Right Action: SOS Emergencias / Refresh */}
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

            {/* Mobile Actions: SOS + Drawer */}
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

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Local Clocks */}
              {(vietnamTime || spainTime) && (
                <div className="bg-stone-950/40 p-3 rounded-2xl border border-stone-800/80">
                  <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Horas Locales</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-stone-900/90 p-2 rounded-xl border border-stone-800">
                      <span className="text-[10px] text-stone-400 block font-medium">🇻🇳 Hanói / HCMC</span>
                      <span className="text-sm font-bold text-amber-400 font-mono">{vietnamTime || '--:--'}</span>
                    </div>
                    <div className="bg-stone-900/90 p-2 rounded-xl border border-stone-800">
                      <span className="text-[10px] text-stone-400 block font-medium">🇪🇸 España (CET)</span>
                      <span className="text-sm font-bold text-stone-300 font-mono">{spainTime || '--:--'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Reference Currency Setting Card in Drawer */}
              <div className="bg-stone-950/40 p-3.5 rounded-2xl border border-stone-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[11px] font-bold text-stone-300 uppercase tracking-wider">
                      Divisa de referencia
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 font-mono">
                    {currInfo.flag} {currInfo.code} ({currInfo.symbol})
                  </span>
                </div>

                <div className="relative">
                  <select
                    value={selectedCurrency}
                    onChange={(e) => onSelectCurrency(e.target.value as CurrencyCode)}
                    aria-label="Seleccionar divisa de referencia"
                    className="w-full bg-stone-900/90 hover:bg-stone-850 text-stone-200 border border-stone-800 hover:border-amber-500/40 rounded-xl px-3 py-2 pr-8 text-xs font-semibold focus:outline-none focus:border-amber-400 cursor-pointer transition appearance-none shadow-2xs"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code} className="bg-stone-900 text-stone-200">
                        {c.flag} {c.code} — {c.name} ({c.symbol})
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-2.5 pointer-events-none text-stone-400">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Rate Widget inside Drawer */}
              <div className="bg-stone-950/40 p-3.5 rounded-2xl border border-stone-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs text-stone-400">
                  <span className="font-semibold text-stone-300 text-[11px] uppercase tracking-wider">
                    Tipo de cambio
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={onRefreshRates}
                      disabled={isRefreshing || !isOnline}
                      className="text-amber-400 hover:text-amber-300 font-medium text-xs flex items-center gap-1 cursor-pointer disabled:opacity-40"
                      title={isOnline ? 'Actualizar tasas en directo' : 'Sin conexión a internet'}
                    >
                      <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                      <span>Actualizar</span>
                    </button>
                    {onSaveCustomRates && (
                      <button
                        type="button"
                        onClick={() => setIsCustomRateModalOpen(true)}
                        className="text-amber-400 hover:text-amber-300 font-medium text-xs flex items-center gap-1 cursor-pointer"
                        title="Ajustar manualmente la tasa de cambio"
                      >
                        <SlidersHorizontal className="w-3 h-3" />
                        <span>Ajustar</span>
                      </button>
                    )}
                  </div>
                </div>
                <div className="bg-stone-900/90 rounded-xl p-3 border border-stone-800 font-mono flex items-center justify-between">
                  <div>
                    <div className="text-amber-400 font-bold text-sm">
                      1 {currInfo.code} ({currInfo.symbol})
                    </div>
                    <div className="text-xs text-stone-400">
                      ≈ {Math.round(selectedToVnd).toLocaleString('es-ES')} VND (₫)
                    </div>
                  </div>
                  {selectedCurrency !== 'USD' ? (
                    <div className="text-right">
                      <div className="text-stone-300 font-medium text-xs">1 USD ($)</div>
                      <div className="text-[11px] text-stone-400">≈ {Math.round(usdToVnd).toLocaleString('es-ES')} VND (₫)</div>
                    </div>
                  ) : (
                    <div className="text-right">
                      <div className="text-stone-300 font-medium text-xs">1 EUR (€)</div>
                      <div className="text-[11px] text-stone-400">≈ {eurToVnd.toLocaleString('es-ES')} VND (₫)</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Voice & Pronunciation Unified Card */}
              {onOpenVoiceSettings && (
                <button
                  type="button"
                  onClick={onOpenVoiceSettings}
                  className="w-full text-left bg-stone-950/40 hover:bg-stone-900/80 p-3.5 rounded-2xl border border-stone-800/80 hover:border-amber-500/40 space-y-2.5 transition cursor-pointer active:scale-98 group shadow-xs"
                  title="Configurar voz y pronunciación"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[11px] font-bold text-stone-300 uppercase tracking-wider">
                        Voz & Pronunciación
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition" />
                  </div>

                  <div className="bg-stone-900/90 group-hover:bg-stone-850 p-2.5 rounded-xl border border-stone-800 flex items-center justify-between transition">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{speechSettings.gender === 'female' ? '👩' : '👨'}</span>
                      <div>
                        <div className="text-xs font-bold text-stone-200">
                          Voz {speechSettings.gender === 'female' ? 'Femenina' : 'Masculina'}
                        </div>
                        <div className="text-[10px] text-stone-400">
                          Velocidad {speechSettings.speedPreset === 'slow' ? 'Lenta (0.8x)' : speechSettings.speedPreset === 'fast' ? 'Rápida (1.1x)' : 'Normal (0.95x)'}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-amber-400 group-hover:underline">
                      Configurar
                    </span>
                  </div>
                </button>
              )}

              {/* Permissions Unified Card */}
              {onOpenPermissionsModal && (
                <button
                  type="button"
                  onClick={onOpenPermissionsModal}
                  className="w-full text-left bg-stone-950/40 hover:bg-stone-900/80 p-3.5 rounded-2xl border border-stone-800/80 hover:border-amber-500/40 space-y-2.5 transition cursor-pointer active:scale-98 group shadow-xs"
                  title="Gestionar permisos del dispositivo"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-stone-400" />
                      <span className="text-[11px] font-bold text-stone-300 uppercase tracking-wider">
                        Permisos del dispositivo
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* Geolocation status */}
                    <div className="bg-stone-900/90 group-hover:bg-stone-850 p-2 rounded-lg border border-stone-800 flex items-center justify-between">
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
                    <div className="bg-stone-900/90 group-hover:bg-stone-850 p-2 rounded-lg border border-stone-800 flex items-center justify-between">
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
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Custom Rate Modal */}
      {onSaveCustomRates && (
        <CustomRateModal
          isOpen={isCustomRateModalOpen}
          onClose={() => setIsCustomRateModalOpen(false)}
          ratesData={ratesData}
          onSaveCustomRates={onSaveCustomRates}
          onRefreshRates={onRefreshRates}
          activeCurrency={selectedCurrency}
        />
      )}
    </>
  );
};
