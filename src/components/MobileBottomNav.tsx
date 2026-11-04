import React from 'react';
import {
  Calculator,
  Languages,
  UtensilsCrossed,
  MapPin,
  Compass,
} from 'lucide-react';
import { ActiveTabType } from '../types';

interface MobileBottomNavProps {
  activeTab: ActiveTabType;
  setActiveTab: (tab: ActiveTabType) => void;
}

interface BottomNavItem {
  id: ActiveTabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const BOTTOM_NAV_ITEMS: BottomNavItem[] = [
  { id: 'converter', label: 'Divisas', icon: Calculator },
  { id: 'translator', label: 'Traductor', icon: Languages },
  { id: 'restaurants', label: 'Comer', icon: UtensilsCrossed },
  { id: 'trip', label: 'Mi Viaje', icon: MapPin },
  { id: 'freetour', label: 'Audio Tour', icon: Compass },
];

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
}) => {
  const handleTabClick = (tabId: ActiveTabType) => {
    if (activeTab === tabId) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setActiveTab(tabId);
    }
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-2xl border-t border-stone-200/90 shadow-[0_-4px_20px_rgba(28,25,23,0.06)] select-none will-change-transform"
      style={{
        paddingBottom: 'calc(0.35rem + env(safe-area-inset-bottom, 0px))',
        transform: 'translate3d(0, 0, 0)',
        WebkitTransform: 'translate3d(0, 0, 0)',
      }}
      aria-label="Navegación principal móvil"
    >
      <div className="flex items-center justify-around px-1.5 pt-1.5 pb-1">
        {BOTTOM_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            activeTab === item.id ||
            (item.id === 'trip' && (activeTab === 'itinerary' || activeTab === 'maps'));

          return (
            <button
              key={item.id}
              id={`bottom-nav-${item.id}`}
              type="button"
              onClick={() => handleTabClick(item.id)}
              className={`relative flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 min-h-[48px] cursor-pointer group active:scale-95 ${
                isActive
                  ? 'text-stone-950'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
              aria-selected={isActive}
              role="tab"
            >
              {isActive && (
                <span className="absolute -top-1.5 w-6 h-0.5 rounded-full bg-amber-500" />
              )}

              <div
                className={`p-1 rounded-xl transition-all duration-150 ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-800'
                    : 'text-stone-500 group-hover:text-stone-800'
                }`}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5 transition-transform" />
              </div>

              <span
                className={`text-[10px] tracking-tight mt-0.5 leading-none transition-all ${
                  isActive
                    ? 'font-bold text-stone-900'
                    : 'font-medium text-stone-500'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
