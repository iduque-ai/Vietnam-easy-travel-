import React from 'react';
import {
  Calculator,
  Languages,
  UtensilsCrossed,
  MapPin,
  Calendar,
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
  badge?: string;
}

const BOTTOM_NAV_ITEMS: BottomNavItem[] = [
  { id: 'converter', label: 'Divisas', icon: Calculator },
  { id: 'translator', label: 'Traductor', icon: Languages },
  { id: 'restaurants', label: 'Comer', icon: UtensilsCrossed },
  { id: 'maps', label: 'Mapas', icon: MapPin },
  { id: 'itinerary', label: 'Ruta', icon: Calendar },
  { id: 'freetour', label: 'Audio Tour', icon: Compass },
];

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
}) => {
  const handleTabClick = (tabId: ActiveTabType) => {
    if (activeTab === tabId) {
      // If already on tab, gently scroll to top like native iOS/Android apps
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setActiveTab(tabId);
    }
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-stone-900/95 backdrop-blur-lg border-t border-stone-800/90 shadow-[0_-8px_25px_rgba(0,0,0,0.4)] select-none will-change-transform"
      style={{
        paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))',
        transform: 'translate3d(0, 0, 0)',
        WebkitTransform: 'translate3d(0, 0, 0)',
      }}
      aria-label="Navegación principal móvil"
    >
      <div className="flex items-center justify-around px-1 pt-1.5">
        {BOTTOM_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              id={`bottom-nav-${item.id}`}
              type="button"
              onClick={() => handleTabClick(item.id)}
              className={`relative flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 min-h-[48px] cursor-pointer group active:scale-95 ${
                isActive
                  ? 'text-amber-400'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
              aria-selected={isActive}
              role="tab"
            >
              {/* Active Golden Glow & Pip */}
              {isActive && (
                <span className="absolute -top-1.5 w-6 h-1 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] animate-fade-in" />
              )}

              <div
                className={`p-1 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-amber-400/15 text-amber-300'
                    : 'text-stone-400 group-hover:text-stone-200'
                }`}
              >
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
              </div>

              <span
                className={`text-[10px] tracking-tight font-medium mt-0.5 leading-none transition-all ${
                  isActive
                    ? 'font-bold text-amber-300'
                    : 'text-stone-400'
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
