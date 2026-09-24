import React, { useState, useEffect } from 'react';
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
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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
      <header className="bg-stone-900 text-stone-100 border-b border-stone-800/90 sticky top-0 z-40 shadow-xs backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-3 sm:px-5">
          {/* Desktop Navigation Row (md and above) - Slightly larger and more spacious */}
          <div className="hidden md:flex items-center justify-between h-16 gap-4">
            {/* Brand Identity */}
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="text-xl leading-none" role="img" aria-label="Vietnam">🇻🇳</span>
              <div className="flex items-baseline gap-2">
                <span className="font-bold tracking-tight text-stone-100 text-base">Vietnam Travel</span>
                <span
                  className={`w-2 h-2 rounded-full inline-block ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`}
                  title={isOnline ? `En línea • ${formattedDate}` : `Modo sin conexión • Tasa guardada`}
                />
              </div>
            </div>

            {/* Centered Navigation Tabs - Increased padding, icon size & typography */}
            <nav className="flex items-center gap-1.5 bg-stone-800/80 p-1.5 rounded-xl border border-stone-700/60" aria-label="Tabs">
              {NAV_ITEMS.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`tab-${item.id}`}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition cursor-pointer ${
                      isActive
                        ? 'bg-amber-500 text-stone-950 font-bold shadow-xs'
                        : 'text-stone-300 hover:text-white hover:bg-stone-700/60'
                    }`}
                  >
                    <IconComponent className="w-4 h-4 shrink-0" />
                    <span>{item.shortLabel}</span>
                  </button>
                );
              })}
            </nav>

            {/* Right Action: Rate Pill + Drawer Toggle / Refresh */}
            <div className="flex items-center gap-2 shrink-0">
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800/90 border border-stone-700/70 font-mono text-xs text-stone-200 cursor-default"
                title={`1 USD ≈ ${Math.round(usdToVnd).toLocaleString('es-ES')} ₫ | Actualizado: ${formattedDate}`}
              >
                <span className="text-amber-400 font-bold">1 € =</span>
                <span>{eurToVnd.toLocaleString('es-ES')} ₫</span>
              </div>

              <button
                id="btn-refresh-rates-desktop"
                onClick={onRefreshRates}
                disabled={isRefreshing || !isOnline}
                title="Actualizar tasa de cambio"
                aria-label="Actualizar tasa de cambio"
                className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-30 text-stone-300 hover:text-amber-400 border border-stone-700 transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
              </button>

              <button
                id="btn-open-drawer-desktop"
                onClick={() => setIsDrawerOpen(true)}
                title="Abrir menú lateral"
                aria-label="Abrir menú lateral"
                className="p-2 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700 transition cursor-pointer"
              >
                <Menu className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mobile Header (< md) */}
          <div className="md:hidden py-2.5 space-y-2">
            {/* Top Bar with Brand, Rate & Hamburger Menu */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg leading-none">🇻🇳</span>
                <span className="font-bold text-sm text-stone-100">Vietnam Travel</span>
                <span
                  className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`}
                  title={isOnline ? 'En línea' : 'Sin conexión'}
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="px-2.5 py-1 rounded-lg bg-stone-800 border border-stone-700 font-mono text-xs text-stone-200 flex items-center gap-1">
                  <span className="text-amber-400 font-semibold">1 € =</span>
                  <span>{eurToVnd.toLocaleString('es-ES')} ₫</span>
                  <button
                    onClick={onRefreshRates}
                    disabled={isRefreshing || !isOnline}
                    aria-label="Actualizar"
                    className="ml-1 text-stone-400 hover:text-amber-300 transition"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
                  </button>
                </div>

                {/* Hamburger button */}
                <button
                  id="btn-open-mobile-drawer"
                  onClick={() => setIsDrawerOpen(true)}
                  className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 flex items-center justify-center cursor-pointer"
                  aria-label="Abrir menú lateral"
                >
                  <Menu className="w-5 h-5 text-stone-200" />
                </button>
              </div>
            </div>

            {/* Quick Larger Options Bar on Mobile */}
            <nav className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar" aria-label="Tabs">
              {NAV_ITEMS.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`tab-mobile-${item.id}`}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer shrink-0 ${
                      isActive
                        ? 'bg-amber-500 text-stone-950 font-bold shadow-xs'
                        : 'text-stone-300 bg-stone-800/90 hover:bg-stone-700/80 border border-stone-700/50'
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                    <span>{item.shortLabel}</span>
                  </button>
                );
              })}
            </nav>
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
                  <div className="flex items-center gap-1.5 text-[11px] text-stone-400">
                    <span
                      className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`}
                    />
                    <span>{isOnline ? 'Conectado a la red' : 'Modo sin conexión'}</span>
                  </div>
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

            {/* Drawer Footer */}
            <div className="p-4 border-t border-stone-800 bg-stone-950/40 text-center text-xs text-stone-500">
              <p>🇻🇳 Guía Offline de Viaje a Vietnam</p>
              <p className="text-[11px] text-stone-600 mt-0.5">Tasas, mapas y datos guardados localmente</p>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};
