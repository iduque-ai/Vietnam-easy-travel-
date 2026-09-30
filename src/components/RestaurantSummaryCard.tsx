import React from 'react';
import {
  Star,
  BookOpen,
  MapPin,
  Plus,
  X,
  Volume2,
  UtensilsCrossed,
  Navigation,
  ExternalLink,
  ShieldCheck,
  Clock,
  Sparkles,
} from 'lucide-react';
import { RestaurantItem } from '../types';
import { getRestaurantTheme } from './RestaurantMap';
import { speakVietnamese } from '../utils/storage';
import { checkRestaurantOpenStatus } from '../utils/openingHours';

interface RestaurantSummaryCardProps {
  restaurant: RestaurantItem;
  rankNumber?: number;
  eurRate?: number;
  onViewMenu?: (restaurant: RestaurantItem) => void;
  onAddToItinerary?: (restaurant: RestaurantItem) => void;
  onClose?: () => void;
  isFloatingOverlay?: boolean;
}

export const RestaurantSummaryCard: React.FC<RestaurantSummaryCardProps> = ({
  restaurant,
  rankNumber = 1,
  eurRate = 27000,
  onViewMenu,
  onAddToItinerary,
  onClose,
  isFloatingOverlay = false,
}) => {
  const isTop1 = rankNumber === 1;
  const theme = getRestaurantTheme(rankNumber - 1, restaurant.priceTier);

  const eurPrice = (restaurant.avgPriceVnd / (eurRate || 27000)).toFixed(2);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${restaurant.name} ${restaurant.address || restaurant.district || restaurant.city || 'Vietnam'}`.trim()
  )}`;

  return (
    <div
      className={`relative w-full rounded-2xl border transition-all duration-200 animate-fade-in ${
        isFloatingOverlay
          ? 'bg-[#141210]/95 backdrop-blur-md text-stone-100 border-amber-500/50 shadow-[0_12px_36px_rgba(0,0,0,0.6)] p-3.5 sm:p-4'
          : 'bg-[#141210] text-stone-100 border-amber-500/40 shadow-xl p-4 sm:p-5'
      }`}
    >
      {/* Top Bar: Pin Badge, Name, Audio Speaker, Rating & Close button */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* Map Matching Number Badge */}
          <div
            className={`w-9 h-9 rounded-full border-2 flex items-center justify-center font-bold text-xs shrink-0 shadow-md ${
              isTop1
                ? 'bg-amber-500 border-white text-stone-950 ring-2 ring-amber-400 scale-105'
                : `${theme.bg} ${theme.border} ${theme.text}`
            }`}
            title={`Puesto #${rankNumber} en el mapa`}
          >
            <span>{isTop1 ? '👑 1' : rankNumber}</span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              {isTop1 && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500 text-stone-950 shadow-2xs">
                  Recomendado #1
                </span>
              )}
              {restaurant.michelinGuide && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                  Michelin {restaurant.michelinGuide}
                </span>
              )}
              {restaurant.badgeLabel &&
                restaurant.source !== 'google_live' &&
                !restaurant.badgeLabel.toLowerCase().includes('google') && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-stone-800 text-amber-300 border border-stone-700">
                    {restaurant.badgeLabel}
                  </span>
                )}
              {restaurant.hasAirConditioning && (
                <span
                  className="px-1.5 py-0.5 rounded-md text-[11px] font-semibold bg-sky-950 text-sky-300 border border-sky-800 flex items-center justify-center"
                  title="Aire Acondicionado disponible"
                >
                  ❄️
                </span>
              )}
            </div>

            {/* Two Cells: Cell 1 (Name - takes max space) | Cell 2 (Speaker icon - aligned) */}
            <div className="grid grid-cols-[1fr_auto] items-start gap-2 mt-1">
              <div className="min-w-0">
                <h3 className="font-serif font-bold text-base sm:text-lg text-white leading-tight">
                  {restaurant.name}
                </h3>
                {restaurant.nameVi && (
                  <p className="text-xs text-stone-400 italic truncate mt-0.5">
                    {restaurant.nameVi} <span className="text-stone-600 font-sans not-italic">·</span> <span className="not-italic text-stone-400">{restaurant.district}{restaurant.city ? ` (${restaurant.city})` : ''}</span>
                  </p>
                )}
              </div>
              <div className="shrink-0 flex items-center justify-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    speakVietnamese(restaurant.nameVi);
                  }}
                  className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-400 hover:text-amber-300 border border-stone-700/60 transition cursor-pointer flex items-center justify-center shadow-xs"
                  title={`Escuchar pronunciación: ${restaurant.nameVi}`}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Rating, Price & Close */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          {onClose && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition cursor-pointer -mt-1 -mr-1"
              title="Cerrar resumen"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-1 font-bold text-amber-400 text-xs mt-0.5">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
            <span>{restaurant.rating.toFixed(1)}</span>
            <span className="text-stone-500 font-normal text-[11px]">
              ({restaurant.reviewsCount.toLocaleString()})
            </span>
          </div>
          <div className="font-mono text-xs text-stone-200">
            <strong className="text-white">{(restaurant.avgPriceVnd / 1000).toLocaleString('es-ES')}k ₫</strong>
            <span className="text-emerald-400 text-[11px] ml-1 font-sans font-semibold">
              ({eurPrice})
            </span>
          </div>
        </div>
      </div>

      {/* Must-Order Dish Highlight (Prominent & Clear) */}
      <div className="mt-3 px-3.5 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2">
        <span className="font-bold text-amber-400 shrink-0 mt-0.5">🍲 Qué pedir:</span>
        <span className="font-medium text-white leading-snug flex-1">
          {restaurant.mustOrderDish}
        </span>
      </div>

      {/* Address & Opening Hours Line */}
      <div className="mt-2.5 flex items-center justify-between gap-2 text-[11px] text-stone-400 flex-wrap">
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          <MapPin className="w-3.5 h-3.5 text-stone-500 shrink-0" />
          <span className="truncate">{restaurant.address || restaurant.district}</span>
        </div>
        {restaurant.openingHours && (
          <div className="flex items-center gap-1.5 shrink-0 text-stone-400">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{checkRestaurantOpenStatus(restaurant.openingHours).statusText}</span>
          </div>
        )}
      </div>

      {/* Action Buttons Row (Wide, easily clickable on all screen sizes) */}
      <div className="mt-3 pt-3 border-t border-stone-800 flex flex-wrap items-center gap-2">
        {onViewMenu && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewMenu(restaurant);
            }}
            className="flex-1 min-w-[130px] py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md active:scale-95"
          >
            <BookOpen className="w-4 h-4 text-stone-950" />
            <span>Ver Carta & Fotos</span>
          </button>
        )}

        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="py-2 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white font-semibold text-xs flex items-center justify-center gap-1.5 border border-stone-700 transition cursor-pointer active:scale-95 shrink-0"
          title={`Abrir ${restaurant.name} en Google Maps para ver ruta y cómo llegar`}
        >
          <MapPin className="w-4 h-4 text-rose-400" />
          <span>Cómo llegar (Maps)</span>
        </a>

        {onAddToItinerary && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddToItinerary(restaurant);
            }}
            className="py-2 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 hover:text-amber-200 font-semibold text-xs flex items-center justify-center gap-1.5 border border-amber-500/30 transition cursor-pointer active:scale-95 shrink-0"
            title="Añadir restaurante a un día de tu itinerario"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Añadir a Itinerario</span>
          </button>
        )}
      </div>
    </div>
  );
};
