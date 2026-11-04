import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  ArrowRightLeft,
  Languages,
  MapPin,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  Coins,
  Sparkles,
  UtensilsCrossed,
  Mic,
  Navigation,
  ShieldCheck,
  ShieldAlert,
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
    shortLabel: 'Audioguía',
    description: 'Tu audioguía turístico paso a paso en cualquier monumento',
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

  return (
    <>
      <header className="bg-white/95 text-stone-900 border-b border-stone-200/80 sticky top-0 z-40 backdrop-blur-xl transition-all">
        <div className="max-w-6xl mx-auto px-3 sm:px-6">
          {/* Desktop Navigation Row (md and above) */}
          <div className="hidden md:flex items-center justify-between h-16 gap-3">
            {/* Brand Identity with interactive Online/Offline mode toggle */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center shadow-2xs">
                <span className="text-xl leading-none" role="img" aria-label="Vietnam">🇻🇳</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-serif font-bold tracking-tight text-stone-900 text-lg leading-none">
                    Vietnam Travel
                  </span>
                  <button
                    type="button"
                    onClick={onToggleOnlineMode}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold transition cursor-pointer border select-none ${
                      isOnline
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                        : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
                    }`}
                    title={
                      isOnline
                        ? 'Modo Online activo (Mapas en vivo e IA). Haz clic para cambiar a Modo Offline.'
                        : 'Modo Offline activo (Sin consumo de datos). Haz clic para cambiar a Modo Online.'
                    }
                    aria-label={isOnline ? 'Cambiar a modo offline' : 'Cambiar a modo online'}
                  >
                    <span className={`inline-flex rounded-full h-1.5 w-1.5 ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <span>{isOnline ? 'Online' : 'Offline'}</span>
                  </button>
                </div>
                <span className="text-[11px] text-stone-500 font-medium mt-0.5 tabular-nums">
                  1 {currInfo.symbol} ≈ {Math.round(selectedToVnd).toLocaleString('es-ES')} ₫
                </span>
              </div>
            </div>

            {/* Centered Navigation Tabs - Clean Segmented Bar */}
            <nav className="flex items-center gap-1 bg-stone-100/90 p-1 rounded-2xl border border-stone-200/70" aria-label="Tabs">
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
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-stone-900 text-white font-bold shadow-xs'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-white/70'
                    }`}
                  >
                    <IconComponent className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-amber-400' : 'text-stone-500'}`} />
                    <span>{item.shortLabel}</span>
                  </button>
                );
              })}
            </nav>

            {/* Right Action: SOS + Refresh + Settings Drawer */}
            <div className="flex items-center gap-1.5 shrink-0">
              {onOpenEmergencyModal && (
                <button
                  id="btn-open-emergency-desktop"
                  onClick={onOpenEmergencyModal}
                  title="Teléfonos de emergencia 24h (115, 113) y protección consular"
                  aria-label="Emergencias y Asistencia Consular"
                  className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold active:scale-95"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>SOS</span>
                </button>
              )}

              <button
                id="btn-refresh-rates-desktop"
                onClick={onRefreshRates}
                disabled={isRefreshing || !isOnline}
                title="Actualizar tasa de cambio"
                aria-label="Actualizar tasa de cambio"
                className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200/80 disabled:opacity-40 text-stone-700 border border-stone-200/80 transition cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-600' : ''}`} />
              </button>

              <button
                id="btn-open-desktop-drawer"
                onClick={() => setIsDrawerOpen(true)}
                title="Ajustes de divisa, voz y permisos"
                aria-label="Abrir ajustes"
                className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200/80 text-stone-700 border border-stone-200/80 transition cursor-pointer flex items-center justify-center"
              >
                <Menu className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mobile Header (< md) */}
          <div className="md:hidden py-2.5 flex items-center justify-between gap-2">
            {/* Brand & Mode toggle */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center shrink-0">
                <span className="text-base leading-none">🇻🇳</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-serif font-bold text-sm text-stone-900 truncate leading-tight">
                  Vietnam Travel
                </span>
                <span className="text-[10px] text-stone-500 font-medium tabular-nums">
                  1 {currInfo.symbol} ≈ {Math.round(selectedToVnd).toLocaleString('es-ES')} ₫
                </span>
              </div>
              <button
                type="button"
                onClick={onToggleOnlineMode}
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-semibold transition cursor-pointer border select-none shrink-0 ml-0.5 ${
                  isOnline
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800 active:scale-95'
                    : 'bg-amber-50 border-amber-200 text-amber-800 active:scale-95'
                }`}
                title={
                  isOnline
                    ? 'Modo Online activo. Toca para cambiar a Modo Offline.'
                    : 'Modo Offline activo. Toca para cambiar a Modo Online.'
                }
                aria-label={isOnline ? 'Cambiar a modo offline' : 'Cambiar a modo online'}
              >
                <span className={`inline-flex rounded-full h-1.5 w-1.5 ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span>{isOnline ? 'Online' : 'Offline'}</span>
              </button>
            </div>

            {/* Mobile Actions: SOS + Drawer */}
            <div className="flex items-center gap-1.5 shrink-0">
              {onOpenEmergencyModal && (
                <button
                  id="btn-open-mobile-emergency"
                  onClick={onOpenEmergencyModal}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 flex items-center gap-1 text-xs font-bold cursor-pointer active:scale-95 transition"
                  title="Emergencias y Embajada"
                  aria-label="Emergencias y Embajada"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  <span>SOS</span>
                </button>
              )}

              <button
                id="btn-open-mobile-drawer"
                onClick={() => setIsDrawerOpen(true)}
                className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 flex items-center justify-center cursor-pointer active:scale-95 transition"
                aria-label="Abrir menú de ajustes"
              >
                <Menu className="w-4 h-4 text-stone-700" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Lateral Slide-Out Settings Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs transition-opacity duration-200 animate-fade-overlay"
            onClick={() => setIsDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <aside
            id="lateral-drawer"
            className="relative w-80 max-w-[88vw] bg-white border-l border-stone-200 text-stone-900 flex flex-col h-full shadow-2xl z-10 animate-slide-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menú lateral de configuración"
          >
            {/* Drawer Top Bar */}
            <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl leading-none">🇻🇳</span>
                <div>
                  <h3 className="font-serif font-bold text-base text-stone-900">Ajustes de Viaje</h3>
                  <button
                    type="button"
                    onClick={onToggleOnlineMode}
                    className={`mt-0.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${
                      isOnline
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                        : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
                    }`}
                    title="Tocar para cambiar entre modo online y offline"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <span>{isOnline ? 'Modo Online' : 'Modo Offline'}</span>
                    <span className="text-[10px] opacity-75 underline ml-0.5">cambiar</span>
                  </button>
                </div>
              </div>

              <button
                id="btn-close-drawer"
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition cursor-pointer"
                aria-label="Cerrar menú"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Local Clocks */}
              {(vietnamTime || spainTime) && (
                <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200/80">
                  <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Horas Locales</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-white p-2.5 rounded-xl border border-stone-200/80">
                      <span className="text-[10px] text-stone-500 block font-medium">🇻🇳 Vietnam</span>
                      <span className="text-sm font-bold text-stone-900 font-mono tabular-nums">{vietnamTime || '--:--'}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-stone-200/80">
                      <span className="text-[10px] text-stone-500 block font-medium">🇪🇸 España</span>
                      <span className="text-sm font-bold text-stone-900 font-mono tabular-nums">{spainTime || '--:--'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Reference Currency Setting Card in Drawer */}
              <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-[11px] font-bold text-stone-600 uppercase tracking-wider">
                      Divisa de referencia
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-200 font-mono">
                    {currInfo.flag} {currInfo.code} ({currInfo.symbol})
                  </span>
                </div>

                <div className="relative">
                  <select
                    value={selectedCurrency}
                    onChange={(e) => onSelectCurrency(e.target.value as CurrencyCode)}
                    aria-label="Seleccionar divisa de referencia"
                    className="w-full bg-white text-stone-900 border border-stone-200 hover:border-amber-400 rounded-xl px-3 py-2.5 pr-8 text-xs font-semibold focus:outline-none focus:border-amber-500 cursor-pointer transition appearance-none"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code} className="bg-white text-stone-900">
                        {c.flag} {c.code} — {c.name} ({c.symbol})
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-3 pointer-events-none text-stone-400">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Rate Widget inside Drawer */}
              <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200/80 space-y-2.5">
                <div className="flex items-center justify-between text-xs text-stone-500">
                  <span className="font-bold text-stone-600 text-[11px] uppercase tracking-wider">
                    Tipo de cambio
                  </span>
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={onRefreshRates}
                      disabled={isRefreshing || !isOnline}
                      className="text-amber-700 hover:text-amber-900 font-semibold text-xs flex items-center gap-1 cursor-pointer disabled:opacity-40"
                      title={isOnline ? 'Actualizar tasas en directo' : 'Sin conexión a internet'}
                    >
                      <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                      <span>Actualizar</span>
                    </button>
                    {onSaveCustomRates && (
                      <button
                        type="button"
                        onClick={() => setIsCustomRateModalOpen(true)}
                        className="text-stone-700 hover:text-stone-950 font-semibold text-xs flex items-center gap-1 cursor-pointer"
                        title="Ajustar manualmente la tasa de cambio"
                      >
                        <SlidersHorizontal className="w-3 h-3" />
                        <span>Ajustar</span>
                      </button>
                    )}
                  </div>
                </div>
                <div className="bg-white rounded-xl p-3 border border-stone-200/80 font-mono flex items-center justify-between">
                  <div>
                    <div className="text-stone-900 font-bold text-sm">
                      1 {currInfo.code} ({currInfo.symbol})
                    </div>
                    <div className="text-xs text-amber-800 font-semibold tabular-nums">
                      ≈ {Math.round(selectedToVnd).toLocaleString('es-ES')} VND (₫)
                    </div>
                  </div>
                  {selectedCurrency !== 'USD' ? (
                    <div className="text-right">
                      <div className="text-stone-600 font-medium text-xs">1 USD ($)</div>
                      <div className="text-[11px] text-stone-500 tabular-nums">≈ {Math.round(usdToVnd).toLocaleString('es-ES')} ₫</div>
                    </div>
                  ) : (
                    <div className="text-right">
                      <div className="text-stone-600 font-medium text-xs">1 EUR (€)</div>
                      <div className="text-[11px] text-stone-500 tabular-nums">≈ {eurToVnd.toLocaleString('es-ES')} ₫</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Voice & Pronunciation Unified Card */}
              {onOpenVoiceSettings && (
                <button
                  type="button"
                  onClick={onOpenVoiceSettings}
                  className="w-full text-left bg-stone-50 hover:bg-stone-100/80 p-3.5 rounded-2xl border border-stone-200/80 hover:border-amber-400 space-y-2 transition cursor-pointer active:scale-98 group"
                  title="Configurar voz y pronunciación"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-amber-600" />
                      <span className="text-[11px] font-bold text-stone-600 uppercase tracking-wider">
                        Voz & Pronunciación
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition" />
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-stone-200/80 flex items-center justify-between transition">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{speechSettings.gender === 'female' ? '👩' : '👨'}</span>
                      <div>
                        <div className="text-xs font-bold text-stone-900">
                          Voz {speechSettings.gender === 'female' ? 'Femenina' : 'Masculina'}
                        </div>
                        <div className="text-[11px] text-stone-500">
                          Velocidad {speechSettings.speedPreset === 'slow' ? 'Lenta (0.8x)' : speechSettings.speedPreset === 'fast' ? 'Rápida (1.1x)' : 'Normal (0.95x)'}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-amber-700 group-hover:underline">
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
                  className="w-full text-left bg-stone-50 hover:bg-stone-100/80 p-3.5 rounded-2xl border border-stone-200/80 hover:border-amber-400 space-y-2 transition cursor-pointer active:scale-98 group"
                  title="Gestionar permisos del dispositivo"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-stone-500" />
                      <span className="text-[11px] font-bold text-stone-600 uppercase tracking-wider">
                        Permisos del dispositivo
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* Geolocation status */}
                    <div className="bg-white p-2 rounded-xl border border-stone-200/80 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Navigation className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        <span className="text-[11px] text-stone-700 font-medium truncate">GPS</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                          geoStatus === 'granted'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : geoStatus === 'denied'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-stone-100 text-stone-500'
                        }`}
                      >
                        {geoStatus === 'granted' ? 'Activo' : geoStatus === 'denied' ? 'Bloqueado' : 'Pendiente'}
                      </span>
                    </div>

                    {/* Microphone status */}
                    <div className="bg-white p-2 rounded-xl border border-stone-200/80 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Mic className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="text-[11px] text-stone-700 font-medium truncate">Micro</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                          micStatus === 'granted'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : micStatus === 'denied'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-stone-100 text-stone-500'
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
