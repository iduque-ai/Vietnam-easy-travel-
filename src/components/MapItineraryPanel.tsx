import React from 'react';
import {
  Calendar,
  Clock,
  Ticket,
  Trash2,
  CheckCircle2,
  Circle,
  MapPin,
  ExternalLink,
  ChevronRight,
  Plus,
  Compass,
  ArrowRight,
  Sparkles,
  Layers,
  Check,
  Navigation
} from 'lucide-react';
import { ItineraryPlan, ItineraryDay, ItineraryStop, PointOfInterest } from '../types';
import { ItineraryState } from '../utils/useItineraryState';
import { POINTS_OF_INTEREST } from '../data/pois';
import { speakVietnamese } from '../utils/storage';

interface MapItineraryPanelProps {
  itineraryState: ItineraryState;
  eurToVnd: number;
  onLocatePoi: (poi: PointOfInterest) => void;
  onNavigateToItinerary?: () => void;
  onQuickAddPoi?: (poi: PointOfInterest) => void;
  availableRegionPois: PointOfInterest[];
}

export const MapItineraryPanel: React.FC<MapItineraryPanelProps> = ({
  itineraryState,
  eurToVnd,
  onLocatePoi,
  onNavigateToItinerary,
  onQuickAddPoi,
  availableRegionPois,
}) => {
  const {
    plans,
    activePlan,
    activePlanId,
    selectedDayId,
    currentDay,
    setSelectedDayId,
    setActivePlanId,
    removeStopFromDay,
    toggleStopVisited,
  } = itineraryState;

  if (!activePlan) {
    return (
      <div className="bg-white rounded-2xl p-5 border border-stone-200 text-stone-500 text-center text-xs">
        No hay ningún itinerario activo seleccionado.
      </div>
    );
  }

  // Calculate day ticket totals
  const dayTicketTotalVnd = (currentDay?.stops || []).reduce(
    (acc, s) => acc + (s.ticketVnd || 0),
    0
  );

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col">
      {/* Top Bar: Active Plan Selector & Full Planner Link */}
      <div className="p-4 border-b border-stone-100 bg-stone-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center shrink-0 shadow-2xs">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                Itinerario Activo
              </span>
              <span className="text-[11px] text-stone-500">
                {activePlan.days.length} días • {activePlan.destinations.length} destinos
              </span>
            </div>

            {/* Plan switcher */}
            <div className="relative mt-0.5">
              <select
                value={activePlanId}
                onChange={(e) => setActivePlanId(e.target.value)}
                className="font-bold text-sm text-stone-900 bg-transparent border-none p-0 pr-4 focus:outline-none cursor-pointer"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {onNavigateToItinerary && (
          <button
            onClick={onNavigateToItinerary}
            className="self-end sm:self-auto px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-2xs"
          >
            <span>Abrir Planificador</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Horizontal Day Carousel Selector */}
      <div className="p-3 border-b border-stone-100 bg-stone-50/40">
        <div className="flex items-center justify-between text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2 px-1">
          <span>Selecciona el día a planificar con el mapa:</span>
          <span className="text-amber-700">
            Día {currentDay?.dayNumber || 1} seleccionado
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar">
          {activePlan.days.map((day) => {
            const isSelected = day.id === currentDay?.id;
            const stopsCount = day.stops.length;
            return (
              <button
                key={day.id}
                onClick={() => setSelectedDayId(day.id)}
                className={`px-3 py-2 rounded-xl text-left transition cursor-pointer shrink-0 flex flex-col min-w-[125px] border ${
                  isSelected
                    ? 'bg-amber-500 text-stone-950 border-amber-600 shadow-xs ring-1 ring-amber-500'
                    : 'bg-white text-stone-700 border-stone-200 hover:border-amber-300 hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-[10px] font-black uppercase ${
                      isSelected ? 'text-stone-950' : 'text-stone-400'
                    }`}
                  >
                    Día {day.dayNumber}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected
                        ? 'bg-stone-950 text-amber-400'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {stopsCount} {stopsCount === 1 ? 'parada' : 'paradas'}
                  </span>
                </div>
                <div className="font-bold text-xs mt-0.5 line-clamp-1">
                  {day.destinationCity}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Day Detail: Header, Stops List, & Fast Interaction */}
      {currentDay && (
        <div className="p-4 space-y-4 flex-1">
          {/* Day overview headline */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-amber-50/60 p-3 rounded-xl border border-amber-200/70">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-900 font-mono">
                  Día {currentDay.dayNumber} • {currentDay.destinationCity}
                </span>
                {currentDay.date && (
                  <span className="text-[10px] text-stone-500 font-medium">
                    ({currentDay.date})
                  </span>
                )}
              </div>
              <h4 className="font-bold text-sm text-stone-900 mt-0.5">
                {currentDay.title}
              </h4>
            </div>

            {/* Total ticket cost for the day */}
            <div className="text-right sm:border-l sm:border-amber-200/80 sm:pl-3">
              <span className="text-[10px] text-stone-500 block uppercase font-medium">
                Entradas hoy:
              </span>
              <span className="text-xs font-bold font-mono text-stone-900">
                {dayTicketTotalVnd > 0
                  ? `${(dayTicketTotalVnd / 1000).toLocaleString('es-ES')}k ₫`
                  : 'Gratis'}
              </span>
              {dayTicketTotalVnd > 0 && (
                <span className="text-[10px] text-stone-500 block">
                  ≈ {(dayTicketTotalVnd / eurToVnd).toFixed(2)} €
                </span>
              )}
            </div>
          </div>

          {/* Stops List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-stone-600">
              <span className="font-bold uppercase tracking-wider text-[11px] text-stone-500">
                Paradas Programadas ({currentDay.stops.length}):
              </span>
              <span className="text-[11px] text-amber-800 font-medium">
                Toca cualquier pin del mapa para sumar paradas
              </span>
            </div>

            {currentDay.stops.length === 0 ? (
              <div className="p-6 rounded-xl border-2 border-dashed border-stone-200 bg-stone-50/60 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                  <MapPin className="w-5 h-5 animate-bounce" />
                </div>
                <div className="font-bold text-sm text-stone-800">
                  No hay paradas en el Día {currentDay.dayNumber} aún
                </div>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  Haz clic en cualquier pin del mapa en <strong>{currentDay.destinationCity}</strong> para añadirlo directamente a este día con un solo toque.
                </p>

                {/* Quick suggestions from current region */}
                {availableRegionPois.length > 0 && onQuickAddPoi && (
                  <div className="pt-3 border-t border-stone-200 text-left">
                    <span className="text-[11px] font-bold text-stone-600 block mb-2">
                      Sugerencias rápidas para añadir:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {availableRegionPois.slice(0, 3).map((poi) => (
                        <button
                          key={poi.id}
                          onClick={() => onQuickAddPoi(poi)}
                          className="px-2.5 py-1 rounded-lg bg-white hover:bg-amber-100 border border-stone-200 hover:border-amber-300 text-xs text-stone-800 font-medium flex items-center gap-1 transition cursor-pointer shadow-2xs"
                        >
                          <Plus className="w-3 h-3 text-amber-600" />
                          <span>{poi.nameEs}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {currentDay.stops.map((stop, idx) => {
                  const linkedPoi = stop.poiId
                    ? POINTS_OF_INTEREST.find((p) => p.id === stop.poiId)
                    : null;

                  return (
                    <div
                      key={stop.id}
                      className={`p-3 rounded-xl border transition flex items-start justify-between gap-2.5 ${
                        stop.isVisited
                          ? 'bg-stone-50 border-stone-200 opacity-75'
                          : 'bg-white border-stone-200 hover:border-amber-300 shadow-2xs'
                      }`}
                    >
                      {/* Checkbox visited */}
                      <button
                        onClick={() =>
                          toggleStopVisited(activePlanId, currentDay.id, stop.id)
                        }
                        className="mt-0.5 text-stone-400 hover:text-amber-600 transition cursor-pointer shrink-0"
                        title={stop.isVisited ? 'Marcar como pendiente' : 'Marcar como visitado'}
                      >
                        {stop.isVisited ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Circle className="w-4 h-4" />
                        )}
                      </button>

                      {/* Stop Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900">
                            #{idx + 1}
                          </span>
                          {stop.timeSlot && (
                            <span className="text-[10px] text-stone-500 font-medium flex items-center gap-1">
                              <Clock className="w-3 h-3 text-stone-400" />
                              {stop.timeSlot}
                            </span>
                          )}
                          {stop.ticketVnd !== undefined && stop.ticketVnd > 0 && (
                            <span className="text-[10px] font-semibold text-emerald-700 font-mono">
                              {(stop.ticketVnd / 1000).toLocaleString('es-ES')}k ₫
                            </span>
                          )}
                        </div>

                        <div
                          className={`font-bold text-xs text-stone-900 mt-1 line-clamp-1 ${
                            stop.isVisited ? 'line-through text-stone-400' : ''
                          }`}
                        >
                          {linkedPoi ? linkedPoi.nameEs : stop.customName || 'Lugar sin nombre'}
                        </div>

                        {linkedPoi && (
                          <div className="text-[11px] text-amber-800 font-medium line-clamp-1">
                            {linkedPoi.nameVi}
                          </div>
                        )}

                        {stop.notes && (
                          <p className="text-[11px] text-stone-500 mt-0.5 line-clamp-1 italic">
                            {stop.notes}
                          </p>
                        )}
                      </div>

                      {/* Actions: Locate on Map & Remove */}
                      <div className="flex items-center gap-1 shrink-0">
                        {linkedPoi && (
                          <button
                            onClick={() => onLocatePoi(linkedPoi)}
                            className="p-1.5 text-stone-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                            title="Ver en el mapa"
                          >
                            <MapPin className="w-3.5 h-3.5 text-amber-600" />
                          </button>
                        )}

                        <button
                          onClick={() =>
                            removeStopFromDay(activePlanId, currentDay.id, stop.id)
                          }
                          className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Quitar parada de este día"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
