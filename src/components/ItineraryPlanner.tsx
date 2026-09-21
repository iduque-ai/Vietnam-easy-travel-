import React, { useState, useMemo } from 'react';
import {
  Calendar,
  MapPin,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  Circle,
  Ticket,
  Clock,
  Download,
  Share2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Copy,
  Info,
  ExternalLink,
  Volume2,
  X,
  Search,
  Check,
  CalendarDays,
  FileText,
  AlertCircle
} from 'lucide-react';
import { ItineraryPlan, ItineraryDay, ItineraryStop, PointOfInterest, ExchangeRatesData } from '../types';
import { POINTS_OF_INTEREST, REGION_PACKS } from '../data/pois';
import {
  getItineraryPlans,
  saveItineraryPlans,
  getActivePlanId,
  saveActivePlanId,
  speakVietnamese
} from '../utils/storage';

interface ItineraryPlannerProps {
  ratesData: ExchangeRatesData;
  isOnline: boolean;
  onNavigateToMaps?: () => void;
}

export const ItineraryPlanner: React.FC<ItineraryPlannerProps> = ({
  ratesData,
  isOnline,
  onNavigateToMaps
}) => {
  const [plans, setPlans] = useState<ItineraryPlan[]>(getItineraryPlans);
  const [activePlanId, setActivePlanId] = useState<string>(getActivePlanId);
  const [expandedDayIds, setExpandedDayIds] = useState<Record<string, boolean>>({
    'day-1': true,
    'day-2': true,
    'day-n1': true,
  });

  // Modals state
  const [isPlanModalOpen, setIsPlanModalOpen] = useState<boolean>(false);
  const [editingPlanData, setEditingPlanData] = useState<Partial<ItineraryPlan> | null>(null);

  const [isDayModalOpen, setIsDayModalOpen] = useState<boolean>(false);
  const [editingDayData, setEditingDayData] = useState<{ day?: ItineraryDay; isNew?: boolean } | null>(null);

  const [isStopModalOpen, setIsStopModalOpen] = useState<boolean>(false);
  const [stopModalTargetDayId, setStopModalTargetDayId] = useState<string | null>(null);
  const [poiSearchQuery, setPoiSearchQuery] = useState<string>('');
  const [selectedPoiCategory, setSelectedPoiCategory] = useState<string>('todas');
  const [selectedPoiForStop, setSelectedPoiForStop] = useState<PointOfInterest | null>(null);
  const [stopFormTimeSlot, setStopFormTimeSlot] = useState<string>('Mañana 09:30');
  const [stopFormCustomName, setStopFormCustomName] = useState<string>('');
  const [stopFormNotes, setStopFormNotes] = useState<string>('');
  const [stopFormTicketVnd, setStopFormTicketVnd] = useState<number>(0);

  // Quick feedback banner
  const [notification, setNotification] = useState<string | null>(null);

  const usdVndRate = ratesData.rates['VND'] || 25450;
  const eurRate = ratesData.rates['EUR'] || 0.92;
  const eurToVnd = usdVndRate / eurRate;

  // Active plan
  const activePlan = useMemo(() => {
    return plans.find((p) => p.id === activePlanId) || plans[0] || null;
  }, [plans, activePlanId]);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleSelectPlan = (id: string) => {
    setActivePlanId(id);
    saveActivePlanId(id);
  };

  const updatePlansState = (updatedPlans: ItineraryPlan[]) => {
    setPlans(updatedPlans);
    saveItineraryPlans(updatedPlans);
  };

  const toggleDayExpanded = (dayId: string) => {
    setExpandedDayIds((prev) => ({
      ...prev,
      [dayId]: !prev[dayId],
    }));
  };

  const expandAllDays = () => {
    if (!activePlan) return;
    const allExpanded: Record<string, boolean> = {};
    activePlan.days.forEach((d) => {
      allExpanded[d.id] = true;
    });
    setExpandedDayIds(allExpanded);
  };

  const collapseAllDays = () => {
    setExpandedDayIds({});
  };

  // Toggle visited status on a stop
  const handleToggleStopVisited = (dayId: string, stopId: string) => {
    if (!activePlan) return;
    const updatedDays = activePlan.days.map((day) => {
      if (day.id !== dayId) return day;
      return {
        ...day,
        stops: day.stops.map((stop) => {
          if (stop.id !== stopId) return stop;
          return { ...stop, isVisited: !stop.isVisited };
        }),
      };
    });

    const updatedPlan: ItineraryPlan = {
      ...activePlan,
      updatedAt: Date.now(),
      days: updatedDays,
    };

    const updatedPlans = plans.map((p) => (p.id === activePlan.id ? updatedPlan : p));
    updatePlansState(updatedPlans);
  };

  // Delete a stop
  const handleDeleteStop = (dayId: string, stopId: string) => {
    if (!activePlan) return;
    const updatedDays = activePlan.days.map((day) => {
      if (day.id !== dayId) return day;
      return {
        ...day,
        stops: day.stops.filter((s) => s.id !== stopId),
      };
    });

    const updatedPlan: ItineraryPlan = {
      ...activePlan,
      updatedAt: Date.now(),
      days: updatedDays,
    };

    const updatedPlans = plans.map((p) => (p.id === activePlan.id ? updatedPlan : p));
    updatePlansState(updatedPlans);
    showNotification('Parada eliminada del día.');
  };

  // Delete a day
  const handleDeleteDay = (dayId: string) => {
    if (!activePlan) return;
    if (activePlan.days.length <= 1) {
      alert('Un itinerario debe tener al menos un día.');
      return;
    }
    if (!window.confirm('¿Seguro que deseas eliminar este día y todas sus paradas?')) {
      return;
    }

    const filteredDays = activePlan.days.filter((d) => d.id !== dayId);
    // Renumber days
    const renumberedDays = filteredDays.map((d, index) => ({
      ...d,
      dayNumber: index + 1,
    }));

    const updatedPlan: ItineraryPlan = {
      ...activePlan,
      updatedAt: Date.now(),
      days: renumberedDays,
    };

    const updatedPlans = plans.map((p) => (p.id === activePlan.id ? updatedPlan : p));
    updatePlansState(updatedPlans);
    showNotification('Día eliminado del itinerario.');
  };

  // Duplicate plan
  const handleDuplicatePlan = () => {
    if (!activePlan) return;
    const newId = 'plan-' + Date.now();
    const duplicatedPlan: ItineraryPlan = {
      ...activePlan,
      id: newId,
      title: `${activePlan.title} (Copia)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const updatedPlans = [...plans, duplicatedPlan];
    updatePlansState(updatedPlans);
    setActivePlanId(newId);
    saveActivePlanId(newId);
    showNotification('Itinerario duplicado con éxito.');
  };

  // Delete plan
  const handleDeletePlan = () => {
    if (plans.length <= 1) {
      alert('No puedes eliminar el único itinerario activo.');
      return;
    }
    if (!window.confirm(`¿Seguro que deseas eliminar el plan "${activePlan?.title}"?`)) {
      return;
    }
    const updated = plans.filter((p) => p.id !== activePlanId);
    updatePlansState(updated);
    setActivePlanId(updated[0].id);
    saveActivePlanId(updated[0].id);
    showNotification('Itinerario eliminado.');
  };

  // Open Add Stop modal for a specific day
  const handleOpenAddStopModal = (dayId: string) => {
    setStopModalTargetDayId(dayId);
    setSelectedPoiForStop(null);
    setStopFormCustomName('');
    setStopFormNotes('');
    setStopFormTicketVnd(0);
    setStopFormTimeSlot('Mañana 09:30');
    setPoiSearchQuery('');
    setSelectedPoiCategory('todas');
    setIsStopModalOpen(true);
  };

  // Save new stop
  const handleSaveStop = () => {
    if (!activePlan || !stopModalTargetDayId) return;

    if (!selectedPoiForStop && !stopFormCustomName.trim()) {
      alert('Por favor selecciona un punto de interés del mapa o escribe un nombre personalizado.');
      return;
    }

    const newStop: ItineraryStop = {
      id: 'stop-' + Date.now(),
      poiId: selectedPoiForStop ? selectedPoiForStop.id : undefined,
      customName: selectedPoiForStop ? undefined : stopFormCustomName.trim(),
      timeSlot: stopFormTimeSlot.trim() || 'Horario libre',
      ticketVnd: selectedPoiForStop ? selectedPoiForStop.ticketVnd : Number(stopFormTicketVnd) || 0,
      notes: stopFormNotes.trim() || (selectedPoiForStop ? selectedPoiForStop.travelerTips : ''),
      isVisited: false,
    };

    const updatedDays = activePlan.days.map((day) => {
      if (day.id !== stopModalTargetDayId) return day;
      return {
        ...day,
        stops: [...day.stops, newStop],
      };
    });

    const updatedPlan: ItineraryPlan = {
      ...activePlan,
      updatedAt: Date.now(),
      days: updatedDays,
    };

    const updatedPlans = plans.map((p) => (p.id === activePlan.id ? updatedPlan : p));
    updatePlansState(updatedPlans);
    setIsStopModalOpen(false);
    showNotification('Parada añadida al itinerario.');
  };

  // Save Day (new or edit)
  const handleSaveDay = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activePlan || !editingDayData) return;

    const formData = new FormData(e.currentTarget);
    const destinationCity = (formData.get('destinationCity') as string).trim() || 'Vietnam';
    const title = (formData.get('title') as string).trim() || 'Día de recorrido';
    const date = (formData.get('date') as string) || '';
    const notes = (formData.get('notes') as string).trim() || '';

    let updatedDays: ItineraryDay[];

    if (editingDayData.isNew) {
      const nextDayNumber = activePlan.days.length + 1;
      const newDay: ItineraryDay = {
        id: 'day-' + Date.now(),
        dayNumber: nextDayNumber,
        destinationCity,
        title,
        date,
        notes,
        stops: [],
      };
      updatedDays = [...activePlan.days, newDay];
      // Auto expand the new day
      setExpandedDayIds((prev) => ({ ...prev, [newDay.id]: true }));
    } else if (editingDayData.day) {
      updatedDays = activePlan.days.map((d) => {
        if (d.id !== editingDayData.day?.id) return d;
        return {
          ...d,
          destinationCity,
          title,
          date,
          notes,
        };
      });
    } else {
      return;
    }

    // Update destinations list if city is new
    const destinationsSet = new Set(activePlan.destinations);
    if (destinationCity) destinationsSet.add(destinationCity);

    const updatedPlan: ItineraryPlan = {
      ...activePlan,
      destinations: Array.from(destinationsSet),
      updatedAt: Date.now(),
      days: updatedDays,
    };

    const updatedPlans = plans.map((p) => (p.id === activePlan.id ? updatedPlan : p));
    updatePlansState(updatedPlans);
    setIsDayModalOpen(false);
    setEditingDayData(null);
    showNotification(editingDayData.isNew ? 'Día añadido al itinerario.' : 'Día actualizado.');
  };

  // Save Plan Metadata (create or edit)
  const handleSavePlanMetadata = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = (formData.get('title') as string).trim() || 'Mi Viaje a Vietnam';
    const description = (formData.get('description') as string).trim();
    const startDate = (formData.get('startDate') as string) || '';
    const endDate = (formData.get('endDate') as string) || '';
    const destinationsRaw = (formData.get('destinations') as string) || '';
    const destinations = destinationsRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (editingPlanData?.id) {
      // Editing existing
      const updatedPlan: ItineraryPlan = {
        ...activePlan!,
        title,
        description,
        startDate,
        endDate,
        destinations: destinations.length > 0 ? destinations : activePlan!.destinations,
        updatedAt: Date.now(),
      };
      const updatedPlans = plans.map((p) => (p.id === updatedPlan.id ? updatedPlan : p));
      updatePlansState(updatedPlans);
      showNotification('Plan actualizado.');
    } else {
      // Creating new
      const newPlanId = 'plan-' + Date.now();
      const newPlan: ItineraryPlan = {
        id: newPlanId,
        title,
        description,
        startDate,
        endDate,
        destinations: destinations.length > 0 ? destinations : ['Hà Nội', 'Hạ Long', 'Hội An'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        days: [
          {
            id: 'day-1',
            dayNumber: 1,
            date: startDate,
            destinationCity: destinations[0] || 'Hà Nội',
            title: 'Llegada y bienvenida',
            notes: 'Acomodarse en el hotel, cambiar dinero en el centro y probar café vietnamita.',
            stops: [],
          },
        ],
      };
      const updatedPlans = [...plans, newPlan];
      updatePlansState(updatedPlans);
      setActivePlanId(newPlanId);
      saveActivePlanId(newPlanId);
      showNotification('¡Nuevo itinerario creado!');
    }

    setIsPlanModalOpen(false);
    setEditingPlanData(null);
  };

  // Export Itinerary as readable text for offline use / printing
  const handleExportItineraryText = () => {
    if (!activePlan) return;

    let content = `====================================================\n`;
    content += `ITINERARIO DE VIAJE A VIETNAM: ${activePlan.title.toUpperCase()}\n`;
    content += `Vietnam Travel Companion - App 100% Offline\n`;
    content += `====================================================\n\n`;

    if (activePlan.description) {
      content += `DESCRIPCIÓN: ${activePlan.description}\n`;
    }
    if (activePlan.startDate || activePlan.endDate) {
      content += `FECHAS: ${activePlan.startDate || 'Inicio por definir'} hasta ${activePlan.endDate || 'Fin por definir'}\n`;
    }
    content += `DESTINOS: ${activePlan.destinations.join(' ➔ ')}\n\n`;

    // Statistics
    let totalTicketsVnd = 0;
    let totalStopsCount = 0;
    let visitedStopsCount = 0;

    activePlan.days.forEach((d) => {
      d.stops.forEach((s) => {
        totalStopsCount++;
        if (s.isVisited) visitedStopsCount++;
        totalTicketsVnd += s.ticketVnd || 0;
      });
    });

    content += `RESUMEN DE RUTA:\n`;
    content += `• Total días planificados: ${activePlan.days.length}\n`;
    content += `• Total paradas/lugares: ${totalStopsCount} (${visitedStopsCount} visitados)\n`;
    content += `• Presupuesto estimado de entradas: ${totalTicketsVnd.toLocaleString('es-ES')} ₫ (≈ ${(totalTicketsVnd / eurToVnd).toFixed(2)} €)\n`;
    content += `----------------------------------------------------\n\n`;

    activePlan.days.forEach((day) => {
      content += `[ DÍA ${day.dayNumber}: ${day.destinationCity.toUpperCase()} ]\n`;
      content += `Título: ${day.title}\n`;
      if (day.date) content += `Fecha: ${day.date}\n`;
      if (day.notes) content += `Notas del día: ${day.notes}\n`;

      if (day.stops.length === 0) {
        content += `(Sin paradas asignadas todavía)\n`;
      } else {
        content += `Paradas del día:\n`;
        day.stops.forEach((stop, sIndex) => {
          const poi = stop.poiId ? POINTS_OF_INTEREST.find((p) => p.id === stop.poiId) : null;
          const name = poi ? `${poi.nameEs} (${poi.nameVi})` : stop.customName;
          const status = stop.isVisited ? '[✓ VISITADO]' : '[ ] PENDIENTE';
          content += `  ${sIndex + 1}. ${status} ${stop.timeSlot ? `[${stop.timeSlot}] ` : ''}${name}\n`;
          if (poi) {
            content += `     • Categoría: ${poi.category} | Ciudad: ${poi.city}\n`;
            content += `     • GPS: ${poi.lat}, ${poi.lng}\n`;
            content += `     • Entrada: ${poi.ticketVnd > 0 ? `${poi.ticketVnd.toLocaleString('es-ES')} ₫` : 'Gratis'}\n`;
            content += `     • Cómo llegar: ${poi.howToGet}\n`;
            if (poi.scamAlert) {
              content += `     • ⚠️ ALERTA ESTAFA: ${poi.scamAlert}\n`;
            }
          } else if (stop.ticketVnd && stop.ticketVnd > 0) {
            content += `     • Entrada estimada: ${stop.ticketVnd.toLocaleString('es-ES')} ₫\n`;
          }
          if (stop.notes) {
            content += `     • Notas: ${stop.notes}\n`;
          }
        });
      }
      content += `\n----------------------------------------------------\n\n`;
    });

    content += `CONSEJOS RÁPIDOS PARA VIETNAM:\n`;
    content += `• Teléfonos emergencia: Policía 113, Ambulancia 115, Bomberos 114\n`;
    content += `• Apps recomendadas: Grab para transporte y taxis seguros sin regateo.\n`;
    content += `• Agua: Bebe siempre agua embotellada sellada.\n`;
    content += `• Divisas: Guarda los billetes de polímero en buen estado sin rasgaduras.\n`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Itinerario_${activePlan.title.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showNotification('Itinerario exportado en formato texto para llevar sin conexión.');
  };

  // Filtered POIs for stop modal
  const filteredModalPois = useMemo(() => {
    return POINTS_OF_INTEREST.filter((poi) => {
      const matchCat = selectedPoiCategory === 'todas' || poi.category === selectedPoiCategory;
      const q = poiSearchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        poi.nameEs.toLowerCase().includes(q) ||
        poi.nameVi.toLowerCase().includes(q) ||
        poi.city.toLowerCase().includes(q) ||
        poi.description.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [poiSearchQuery, selectedPoiCategory]);

  // Calculations for current plan
  const planStats = useMemo(() => {
    if (!activePlan) return { totalDays: 0, totalStops: 0, visitedStops: 0, totalTicketVnd: 0, progressPercent: 0 };
    let totalStops = 0;
    let visitedStops = 0;
    let totalTicketVnd = 0;

    activePlan.days.forEach((day) => {
      day.stops.forEach((stop) => {
        totalStops++;
        if (stop.isVisited) visitedStops++;
        totalTicketVnd += stop.ticketVnd || 0;
      });
    });

    const progressPercent = totalStops > 0 ? Math.round((visitedStops / totalStops) * 100) : 0;

    return {
      totalDays: activePlan.days.length,
      totalStops,
      visitedStops,
      totalTicketVnd,
      progressPercent,
    };
  }, [activePlan]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-4 z-50 bg-stone-900 text-amber-400 px-4 py-3 rounded-xl shadow-xl border border-amber-500/30 text-xs flex items-center gap-2.5 animate-fade-in">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-medium text-stone-100">{notification}</span>
        </div>
      )}

      {/* Plan Switcher Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left: Plan selector dropdown & title */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded">
              Planificador de Itinerario
            </span>
            <span className="text-xs text-stone-400">|</span>
            <span className="text-xs text-stone-500 font-medium">
              {plans.length} {plans.length === 1 ? 'itinerario guardado' : 'itinerarios guardados'}
            </span>
          </div>

          <div className="mt-2 flex items-center gap-3">
            <select
              id="select-itinerary-plan"
              value={activePlanId}
              onChange={(e) => handleSelectPlan(e.target.value)}
              className="font-bold text-base sm:text-lg text-stone-900 bg-stone-50 border border-stone-300 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer max-w-full truncate"
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.days.length} días)
                </option>
              ))}
            </select>

            <button
              id="btn-edit-plan-meta"
              onClick={() => {
                setEditingPlanData(activePlan);
                setIsPlanModalOpen(true);
              }}
              className="p-2 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition cursor-pointer"
              title="Editar título, fechas y descripción"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: Actions (New Plan, Duplicate, Export) */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            id="btn-export-itinerary"
            onClick={handleExportItineraryText}
            className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-medium text-xs flex items-center gap-1.5 transition cursor-pointer"
            title="Descargar resumen del itinerario para ver sin conexión"
          >
            <Download className="w-3.5 h-3.5 text-stone-600" />
            <span>Exportar Guía Offline</span>
          </button>

          <button
            id="btn-duplicate-plan"
            onClick={handleDuplicatePlan}
            className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-medium text-xs flex items-center gap-1.5 transition cursor-pointer"
            title="Hacer una copia de este plan para personalizarlo"
          >
            <Copy className="w-3.5 h-3.5 text-stone-600" />
            <span>Duplicar</span>
          </button>

          <button
            id="btn-new-plan"
            onClick={() => {
              setEditingPlanData({});
              setIsPlanModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Itinerario</span>
          </button>
        </div>
      </div>

      {activePlan && (
        <>
          {/* Plan Header Info & Statistics Cards */}
          <div className="bg-stone-900 text-stone-100 rounded-2xl p-5 sm:p-6 border border-stone-800 shadow-sm relative overflow-hidden">
            <div className="relative z-10 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-serif">
                    {activePlan.title}
                  </h2>
                  {activePlan.description && (
                    <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-3xl leading-relaxed">
                      {activePlan.description}
                    </p>
                  )}
                  {/* Dates & Destinations badges */}
                  <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-stone-300">
                    <div className="flex items-center gap-1.5 bg-stone-800/90 px-3 py-1 rounded-lg border border-stone-700">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        {activePlan.startDate && activePlan.endDate
                          ? `${activePlan.startDate} al ${activePlan.endDate}`
                          : activePlan.startDate || 'Fechas flexibles'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-stone-800/90 px-3 py-1 rounded-lg border border-stone-700">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      <span>{activePlan.destinations.join(' • ')}</span>
                    </div>
                  </div>
                </div>

                {/* Plan Stats Overview */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 shrink-0">
                  <div className="bg-stone-800/80 p-3 rounded-xl border border-stone-700/70 text-center">
                    <span className="text-[10px] uppercase font-semibold text-stone-400 block">Duración</span>
                    <span className="text-lg font-bold text-amber-400">{planStats.totalDays}</span>
                    <span className="text-[10px] text-stone-400 ml-1">días</span>
                  </div>

                  <div className="bg-stone-800/80 p-3 rounded-xl border border-stone-700/70 text-center">
                    <span className="text-[10px] uppercase font-semibold text-stone-400 block">Lugares Clave</span>
                    <span className="text-lg font-bold text-stone-100">
                      {planStats.visitedStops}/{planStats.totalStops}
                    </span>
                    <span className="text-[10px] text-emerald-400 ml-1">({planStats.progressPercent}%)</span>
                  </div>

                  <div className="bg-stone-800/80 p-3 rounded-xl border border-stone-700/70 text-center col-span-2 sm:col-span-1">
                    <span className="text-[10px] uppercase font-semibold text-stone-400 block">Coste Entradas</span>
                    <span className="text-sm font-bold text-amber-400 font-mono">
                      {(planStats.totalTicketVnd / 1000).toLocaleString('es-ES')}k ₫
                    </span>
                    <span className="text-[10px] text-stone-400 block">
                      ≈ {(planStats.totalTicketVnd / eurToVnd).toFixed(0)} €
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="pt-2 border-t border-stone-800">
                <div className="flex items-center justify-between text-[11px] text-stone-400 mb-1.5">
                  <span>Progreso de visitas marcadas:</span>
                  <span className="font-mono text-amber-400">{planStats.progressPercent}% completado</span>
                </div>
                <div className="w-full h-2 bg-stone-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-500"
                    style={{ width: `${planStats.progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Days Accordion Toolbar */}
          <div className="flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={expandAllDays}
                className="text-stone-600 hover:text-stone-900 font-medium transition cursor-pointer"
              >
                Expandir todos
              </button>
              <span className="text-stone-300">•</span>
              <button
                onClick={collapseAllDays}
                className="text-stone-600 hover:text-stone-900 font-medium transition cursor-pointer"
              >
                Colapsar todos
              </button>
            </div>

            <button
              id="btn-add-day"
              onClick={() => {
                setEditingDayData({ isNew: true });
                setIsDayModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir Día {activePlan.days.length + 1}</span>
            </button>
          </div>

          {/* Days Timeline List */}
          <div className="space-y-4">
            {activePlan.days.map((day) => {
              const isExpanded = !!expandedDayIds[day.id];
              const visitedStopsInDay = day.stops.filter((s) => s.isVisited).length;

              return (
                <div
                  key={day.id}
                  id={`itinerary-day-${day.dayNumber}`}
                  className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden transition-all"
                >
                  {/* Day Header Accordion Toggle */}
                  <div
                    onClick={() => toggleDayExpanded(day.id)}
                    className="p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer hover:bg-stone-50/80 transition"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      {/* Day Number Badge */}
                      <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 text-amber-950 flex flex-col items-center justify-center shrink-0">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-amber-800">Día</span>
                        <span className="text-base font-black leading-none">{day.dayNumber}</span>
                      </div>

                      {/* Day Title & City */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs px-2 py-0.5 rounded bg-stone-100 text-stone-800 border border-stone-200">
                            📍 {day.destinationCity}
                          </span>
                          {day.date && (
                            <span className="text-[11px] text-stone-500 font-medium">
                              📅 {day.date}
                            </span>
                          )}
                          <span className="text-[11px] text-stone-400">
                            ({visitedStopsInDay}/{day.stops.length} lugares completados)
                          </span>
                        </div>
                        <h3 className="text-sm sm:text-base font-bold text-stone-900 mt-1 truncate">
                          {day.title}
                        </h3>
                      </div>
                    </div>

                    {/* Right: Expand / Collapse + Quick Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingDayData({ day, isNew: false });
                          setIsDayModalOpen(true);
                        }}
                        className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition"
                        title="Editar información de este día"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDay(day.id);
                        }}
                        className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Eliminar este día"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="text-stone-400 p-1">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>

                  {/* Day Content (Expanded) */}
                  {isExpanded && (
                    <div className="px-4 sm:px-6 pb-5 pt-2 border-t border-stone-100 space-y-4">
                      {/* Day General Notes (Transportation, Hotels, Tips) */}
                      {day.notes && (
                        <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-3 text-xs text-stone-700 flex items-start gap-2.5">
                          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <span className="font-semibold text-stone-900 block mb-0.5">
                              Notas & Transporte del Día:
                            </span>
                            <p className="text-stone-600 leading-relaxed whitespace-pre-line">{day.notes}</p>
                          </div>
                        </div>
                      )}

                      {/* Stops List */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                            Lugares & Actividades Planificadas:
                          </span>
                          <button
                            id={`btn-add-stop-day-${day.dayNumber}`}
                            onClick={() => handleOpenAddStopModal(day.id)}
                            className="text-xs text-amber-800 hover:text-amber-950 font-bold flex items-center gap-1 transition cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Añadir Lugar o Actividad</span>
                          </button>
                        </div>

                        {day.stops.length === 0 ? (
                          <div className="p-6 rounded-xl border-2 border-dashed border-stone-200 text-center space-y-2">
                            <p className="text-xs text-stone-500">
                              Aún no has añadido paradas o puntos de interés a este día.
                            </p>
                            <button
                              onClick={() => handleOpenAddStopModal(day.id)}
                              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Elegir Puntos de Interés de los Mapas</span>
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {day.stops.map((stop) => {
                              const poi = stop.poiId
                                ? POINTS_OF_INTEREST.find((p) => p.id === stop.poiId)
                                : null;

                              return (
                                <div
                                  key={stop.id}
                                  className={`rounded-xl p-3.5 border transition ${
                                    stop.isVisited
                                      ? 'bg-emerald-50/40 border-emerald-200 text-stone-500'
                                      : 'bg-stone-50/60 border-stone-200/90 text-stone-800 hover:bg-stone-50'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    {/* Left: Checkbox & Name */}
                                    <div className="flex items-start gap-3 min-w-0">
                                      <button
                                        onClick={() => handleToggleStopVisited(day.id, stop.id)}
                                        className="mt-0.5 text-stone-400 hover:text-emerald-600 transition cursor-pointer shrink-0"
                                        title={stop.isVisited ? 'Marcar como pendiente' : 'Marcar como visitado'}
                                      >
                                        {stop.isVisited ? (
                                          <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                                        ) : (
                                          <Circle className="w-5 h-5 text-stone-400 hover:text-stone-600" />
                                        )}
                                      </button>

                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          {stop.timeSlot && (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                                              ⏱️ {stop.timeSlot}
                                            </span>
                                          )}

                                          {poi && (
                                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-stone-200/80 text-stone-700">
                                              📍 Mapa: {poi.category}
                                            </span>
                                          )}

                                          {stop.ticketVnd !== undefined && (
                                            <span className="text-[10px] font-mono font-semibold text-stone-600">
                                              🎟️ {stop.ticketVnd > 0 ? `${(stop.ticketVnd / 1000).toLocaleString('es-ES')}k ₫` : 'Gratis'}
                                            </span>
                                          )}
                                        </div>

                                        <h4
                                          className={`font-bold text-sm mt-1 leading-snug ${
                                            stop.isVisited ? 'line-through text-stone-400' : 'text-stone-900'
                                          }`}
                                        >
                                          {poi ? poi.nameEs : stop.customName}
                                        </h4>

                                        {/* Vietnamese name with pronounce button */}
                                        {poi && (
                                          <div className="flex items-center gap-2 mt-0.5 text-xs text-amber-900 font-medium">
                                            <span>{poi.nameVi}</span>
                                            <button
                                              onClick={() => speakVietnamese(poi.nameVi)}
                                              className="p-1 hover:bg-amber-100 rounded text-amber-800 transition cursor-pointer"
                                              title="Pronunciar en vietnamita"
                                            >
                                              <Volume2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        )}

                                        {/* Notes / Tips */}
                                        {stop.notes && (
                                          <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                                            💡 {stop.notes}
                                          </p>
                                        )}

                                        {/* Map POI quick info if applicable */}
                                        {poi && (
                                          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-stone-500">
                                            {poi.openingHours && (
                                              <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3 text-stone-400" />
                                                {poi.openingHours}
                                              </span>
                                            )}
                                            {poi.scamAlert && (
                                              <span className="text-rose-600 font-medium flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3 text-rose-500" />
                                                ¡Cuidado estafas!
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Right: Actions */}
                                    <div className="flex items-center gap-1 shrink-0">
                                      {poi && (
                                        <a
                                          href={`https://www.google.com/maps/search/?api=1&query=${poi.lat},${poi.lng}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-1.5 text-stone-400 hover:text-stone-700 transition"
                                          title="Abrir en mapas"
                                        >
                                          <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                      )}
                                      <button
                                        onClick={() => handleDeleteStop(day.id, stop.id)}
                                        className="p-1.5 text-stone-400 hover:text-rose-600 transition cursor-pointer"
                                        title="Eliminar parada"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
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
            })}
          </div>

          {/* Delete plan option at very bottom */}
          <div className="pt-6 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
            <span>Última actualización: {new Date(activePlan.updatedAt).toLocaleString('es-ES')}</span>
            <button
              id="btn-delete-plan"
              onClick={handleDeletePlan}
              className="text-stone-400 hover:text-rose-600 transition cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar este itinerario</span>
            </button>
          </div>
        </>
      )}

      {/* ================= MODAL: ADD STOP (From Map POIs or Custom) ================= */}
      {isStopModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <div>
                <h3 className="font-bold text-base sm:text-lg text-stone-900">
                  Añadir Lugar al Itinerario
                </h3>
                <p className="text-xs text-stone-500">
                  Elige un punto de interés clave de los mapas descargables o escribe uno personalizado.
                </p>
              </div>
              <button
                onClick={() => setIsStopModalOpen(false)}
                className="p-2 text-stone-400 hover:text-stone-700 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {/* Option 1: Map POIs selector */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-stone-700 block mb-2">
                  1. Puntos de Interés de los Mapas Descargables:
                </label>

                {/* Filter and Search */}
                <div className="flex flex-col sm:flex-row gap-2 mb-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre, templo, ciudad (Hanói, Hội An, Saigón...)"
                      value={poiSearchQuery}
                      onChange={(e) => setPoiSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <select
                    value={selectedPoiCategory}
                    onChange={(e) => setSelectedPoiCategory(e.target.value)}
                    className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="todas">Todas las categorías</option>
                    <option value="Monumento">Monumentos</option>
                    <option value="Gastronomía">Gastronomía</option>
                    <option value="Naturaleza">Naturaleza & Playas</option>
                    <option value="Mercado">Mercados</option>
                    <option value="Cultura">Cultura</option>
                  </select>
                </div>

                {/* POI Scrollable Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 border border-stone-200 rounded-xl bg-stone-50/50">
                  {filteredModalPois.map((poi) => {
                    const isSelected = selectedPoiForStop?.id === poi.id;
                    return (
                      <div
                        key={poi.id}
                        onClick={() => {
                          setSelectedPoiForStop(poi);
                          setStopFormCustomName('');
                          setStopFormTicketVnd(poi.ticketVnd);
                          if (!stopFormNotes) {
                            setStopFormNotes(poi.travelerTips);
                          }
                        }}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition flex items-start justify-between gap-2 ${
                          isSelected
                            ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-400/40 shadow-xs'
                            : 'bg-white border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-stone-100 text-stone-700">
                            {poi.city} • {poi.category}
                          </span>
                          <div className="font-bold text-xs text-stone-900 truncate mt-1">
                            {poi.nameEs}
                          </div>
                          <div className="text-[11px] text-amber-900 truncate">{poi.nameVi}</div>
                          <div className="text-[10px] text-stone-500 mt-1 font-mono">
                            {poi.ticketVnd > 0 ? `${(poi.ticketVnd / 1000).toLocaleString('es-ES')}k ₫` : 'Gratis'}
                          </div>
                        </div>

                        {isSelected && (
                          <Check className="w-4 h-4 text-amber-600 shrink-0 mt-1 font-bold" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Option 2: Or Custom Activity */}
              <div className="pt-2 border-t border-stone-200">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-700 block mb-1">
                  2. O escribe un Lugar / Actividad Personalizada:
                </label>
                <input
                  type="text"
                  placeholder="Ej: Café con huevo en Cafe Giảng, Compras de recuerdos, Trekking en Sapa..."
                  value={stopFormCustomName}
                  onChange={(e) => {
                    setStopFormCustomName(e.target.value);
                    if (e.target.value) {
                      setSelectedPoiForStop(null);
                    }
                  }}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Timing, Price, and Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Horario aproximado / Momento del día:
                  </label>
                  <input
                    type="text"
                    value={stopFormTimeSlot}
                    onChange={(e) => setStopFormTimeSlot(e.target.value)}
                    placeholder="Ej: Mañana 09:00, Mediodía, Noche..."
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Coste estimado de entrada (VND):
                  </label>
                  <input
                    type="number"
                    value={stopFormTicketVnd || ''}
                    onChange={(e) => setStopFormTicketVnd(Number(e.target.value) || 0)}
                    placeholder="0"
                    step="5000"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  {stopFormTicketVnd > 0 && (
                    <span className="text-[10px] text-stone-500 mt-0.5 block">
                      ≈ {(stopFormTicketVnd / eurToVnd).toFixed(2)} €
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Notas para esta parada (vestimenta, reservas, consejos):
                </label>
                <textarea
                  rows={2}
                  value={stopFormNotes}
                  onChange={(e) => setStopFormNotes(e.target.value)}
                  placeholder="Ej: Llevar hombros y rodillas cubiertos para entrar al templo..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-stone-200 flex items-center justify-end gap-2 bg-stone-50">
              <button
                type="button"
                onClick={() => setIsStopModalOpen(false)}
                className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-200 text-xs font-medium transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveStop}
                disabled={!selectedPoiForStop && !stopFormCustomName.trim()}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-stone-950 font-bold text-xs transition cursor-pointer"
              >
                Añadir al Día
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT DAY ================= */}
      {isDayModalOpen && editingDayData && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden">
            <form onSubmit={handleSaveDay}>
              <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
                <h3 className="font-bold text-base sm:text-lg text-stone-900">
                  {editingDayData.isNew
                    ? `Añadir Día ${activePlan?.days.length ? activePlan.days.length + 1 : 1}`
                    : `Editar Día ${editingDayData.day?.dayNumber}`}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsDayModalOpen(false)}
                  className="p-2 text-stone-400 hover:text-stone-700 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 sm:p-5 space-y-3.5">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Ciudad o Destino Principal:
                  </label>
                  <input
                    type="text"
                    name="destinationCity"
                    defaultValue={editingDayData.day?.destinationCity || 'Hà Nội'}
                    required
                    placeholder="Ej: Hà Nội, Ninh Bình, Hội An, Huế, Saigón..."
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Título o Resumen del Día:
                  </label>
                  <input
                    type="text"
                    name="title"
                    defaultValue={editingDayData.day?.title || 'Exploración cultural y templos'}
                    required
                    placeholder="Ej: Crucero por la bahía y noche a bordo..."
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Fecha (Opcional):
                  </label>
                  <input
                    type="date"
                    name="date"
                    defaultValue={editingDayData.day?.date || ''}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Notas Generales del Día (Hoteles, tren nocturno, traslados):
                  </label>
                  <textarea
                    rows={3}
                    name="notes"
                    defaultValue={editingDayData.day?.notes || ''}
                    placeholder="Ej: Tomar minibús limousine a las 07:30 frente al hotel. Comprar billetes de tren en estación..."
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-stone-200 flex items-center justify-end gap-2 bg-stone-50">
                <button
                  type="button"
                  onClick={() => setIsDayModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-200 text-xs font-medium transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs transition cursor-pointer"
                >
                  Guardar Día
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CREATE / EDIT PLAN ================= */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden">
            <form onSubmit={handleSavePlanMetadata}>
              <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
                <h3 className="font-bold text-base sm:text-lg text-stone-900">
                  {editingPlanData?.id ? 'Editar Información del Itinerario' : 'Crear Nuevo Itinerario'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="p-2 text-stone-400 hover:text-stone-700 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 sm:p-5 space-y-3.5">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Nombre del Itinerario:
                  </label>
                  <input
                    type="text"
                    name="title"
                    defaultValue={editingPlanData?.title || 'Mi Aventura en Vietnam 2026'}
                    required
                    placeholder="Ej: Ruta Vietnam 15 días: Gastronomía & Templos"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Descripción / Propósito:
                  </label>
                  <textarea
                    rows={2}
                    name="description"
                    defaultValue={editingPlanData?.description || ''}
                    placeholder="Ej: Viaje por libre en tren y moto visitando los lugares imprescindibles del norte y centro..."
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">
                      Fecha Inicio:
                    </label>
                    <input
                      type="date"
                      name="startDate"
                      defaultValue={editingPlanData?.startDate || ''}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">
                      Fecha Fin:
                    </label>
                    <input
                      type="date"
                      name="endDate"
                      defaultValue={editingPlanData?.endDate || ''}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Destinos clave (separados por coma):
                  </label>
                  <input
                    type="text"
                    name="destinations"
                    defaultValue={editingPlanData?.destinations?.join(', ') || 'Hà Nội, Vịnh Hạ Long, Ninh Bình, Hội An, TP. Hồ Chí Minh'}
                    placeholder="Hà Nội, Hạ Long, Hội An..."
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-stone-200 flex items-center justify-end gap-2 bg-stone-50">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-200 text-xs font-medium transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs transition cursor-pointer"
                >
                  {editingPlanData?.id ? 'Guardar Cambios' : 'Crear Itinerario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
