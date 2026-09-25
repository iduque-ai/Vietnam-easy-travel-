import React, { useState, useMemo, useRef } from 'react';
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
  AlertCircle,
  ArrowUp,
  ArrowDown,
  MoveRight,
  Route,
  Navigation,
  Layers,
  Printer,
  Upload,
  FileDown,
  Wand2,
  Car,
  Compass,
} from 'lucide-react';
import { ItineraryPlan, ItineraryDay, ItineraryStop, PointOfInterest, ExchangeRatesData } from '../types';
import { POINTS_OF_INTEREST } from '../data/pois';
import { DEFAULT_ITINERARIES } from '../data/defaultItineraries';
import {
  getItineraryPlans,
  saveItineraryPlans,
  getActivePlanId,
  saveActivePlanId,
  speakVietnamese
} from '../utils/storage';
import { ItineraryDayMap } from './ItineraryDayMap';
import { ItineraryState } from '../utils/useItineraryState';
import {
  optimizeStopsOrder,
  buildMultiStopGoogleMapsUrl,
  calculateDistanceMeters,
} from '../utils/routeOptimizer';

interface ItineraryPlannerProps {
  ratesData: ExchangeRatesData;
  isOnline: boolean;
  onNavigateToMaps?: (dayId?: string) => void;
  onStartFreeTour?: (poi: PointOfInterest) => void;
  itineraryState?: ItineraryState;
}

export const ItineraryPlanner: React.FC<ItineraryPlannerProps> = ({
  ratesData,
  isOnline,
  onNavigateToMaps,
  onStartFreeTour,
  itineraryState,
}) => {
  const [internalPlans, setInternalPlans] = useState<ItineraryPlan[]>(getItineraryPlans);
  const [internalActivePlanId, setInternalActivePlanId] = useState<string>(getActivePlanId);

  const plans = itineraryState ? itineraryState.plans : internalPlans;
  const activePlanId = itineraryState ? itineraryState.activePlanId : internalActivePlanId;

  const setActivePlanId = (id: string) => {
    if (itineraryState) {
      itineraryState.setActivePlanId(id);
    } else {
      setInternalActivePlanId(id);
      saveActivePlanId(id);
    }
  };
  const [expandedDayIds, setExpandedDayIds] = useState<Record<string, boolean>>({
    'day-1': true,
    'day-2': true,
    'day-n1': true,
    'day-c1': true,
    'day-s1': true,
  });

  // Track which days have their interactive Google Map open
  const [dayMapOpenIds, setDayMapOpenIds] = useState<Record<string, boolean>>({});

  // Search & Filter query for days and stops
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isPlanModalOpen, setIsPlanModalOpen] = useState<boolean>(false);
  const [editingPlanData, setEditingPlanData] = useState<Partial<ItineraryPlan> | null>(null);

  const [isDayModalOpen, setIsDayModalOpen] = useState<boolean>(false);
  const [editingDayData, setEditingDayData] = useState<{ day?: ItineraryDay; isNew?: boolean } | null>(null);

  // Add Stop Modal
  const [isStopModalOpen, setIsStopModalOpen] = useState<boolean>(false);
  const [stopModalTargetDayId, setStopModalTargetDayId] = useState<string | null>(null);
  const [poiSearchQuery, setPoiSearchQuery] = useState<string>('');
  const [selectedPoiCategory, setSelectedPoiCategory] = useState<string>('todas');
  const [selectedPoiForStop, setSelectedPoiForStop] = useState<PointOfInterest | null>(null);
  const [stopFormTimeSlot, setStopFormTimeSlot] = useState<string>('Mañana 09:30');
  const [stopFormCustomName, setStopFormCustomName] = useState<string>('');
  const [stopFormNotes, setStopFormNotes] = useState<string>('');
  const [stopFormTicketVnd, setStopFormTicketVnd] = useState<number>(0);

  // Edit Stop Modal
  const [editingStopData, setEditingStopData] = useState<{
    dayId: string;
    stop: ItineraryStop;
    index: number;
  } | null>(null);

  // Move Stop to another Day Modal
  const [movingStopData, setMovingStopData] = useState<{
    fromDayId: string;
    stop: ItineraryStop;
  } | null>(null);

  // Curated Templates Modal
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState<boolean>(false);

  // Export / Backup Modal
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  // Hidden file input for importing JSON backup
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // Toast feedback banner
  const [notification, setNotification] = useState<string | null>(null);

  // Unified View Mode: 'day_by_day' (split interactive view with synchronized map) vs 'all_days' (classic accordion)
  const [viewMode, setViewMode] = useState<'day_by_day' | 'all_days'>('day_by_day');
  const [selectedDayTabId, setSelectedDayTabId] = useState<string>('');
  const [activeMapStopId, setActiveMapStopId] = useState<string | undefined>(undefined);
  const [copiedGrabStopId, setCopiedGrabStopId] = useState<string | null>(null);

  const usdVndRate = ratesData.rates['VND'] || 26000;
  const eurRate = ratesData.rates['EUR'] || 0.8965;
  const eurToVnd = usdVndRate / eurRate;

  // Active plan memo
  const activePlan = useMemo(() => {
    return plans.find((p) => p.id === activePlanId) || plans[0] || null;
  }, [plans, activePlanId]);

  // Selected Day for day_by_day view
  const currentSelectedDay = useMemo(() => {
    if (!activePlan || activePlan.days.length === 0) return null;
    if (selectedDayTabId) {
      const found = activePlan.days.find((d) => d.id === selectedDayTabId);
      if (found) return found;
    }
    if (itineraryState?.currentDay) {
      return itineraryState.currentDay;
    }
    return activePlan.days[0];
  }, [activePlan, selectedDayTabId, itineraryState?.currentDay]);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleSelectDayTab = (dayId: string) => {
    setSelectedDayTabId(dayId);
    setActiveMapStopId(undefined);
    if (itineraryState) {
      itineraryState.setSelectedDayId(dayId);
    }
  };

  // Optimize route sequence for a day based on GPS coordinates
  const handleOptimizeDayRoute = (dayId: string) => {
    if (!activePlan) return;
    const day = activePlan.days.find((d) => d.id === dayId);
    if (!day || day.stops.length <= 1) {
      showNotification('Se necesitan al menos 2 paradas para optimizar la ruta.');
      return;
    }

    const { orderedStops, savedDistanceKm, totalDistanceKm } = optimizeStopsOrder(day.stops);

    if (itineraryState && itineraryState.reorderStopsInDay) {
      itineraryState.reorderStopsInDay(activePlan.id, dayId, orderedStops);
    } else {
      const updatedDays = activePlan.days.map((d) =>
        d.id === dayId ? { ...d, stops: orderedStops } : d
      );
      const updatedPlan: ItineraryPlan = {
        ...activePlan,
        updatedAt: Date.now(),
        days: updatedDays,
      };
      updatePlansState(plans.map((p) => (p.id === activePlan.id ? updatedPlan : p)));
    }

    if (savedDistanceKm > 0) {
      showNotification(
        `✨ ¡Ruta optimizada! Ahorras ≈ ${savedDistanceKm} km de trayecto sin rodeos (total: ${totalDistanceKm} km).`
      );
    } else {
      showNotification(`✨ ¡Ruta secuencial lista! Las paradas están ordenadas lógicamente.`);
    }
  };

  // Copy destination info formatted for Grab / Taxi
  const handleCopyGrabDestination = (stop: ItineraryStop) => {
    const poi = stop.poiId ? POINTS_OF_INTEREST.find((p) => p.id === stop.poiId) : null;
    const textToCopy = poi
      ? `${poi.nameVi}, ${poi.city}`
      : (stop.customName || '');

    if (textToCopy) {
      navigator.clipboard?.writeText(textToCopy);
    }
    setCopiedGrabStopId(stop.id);
    showNotification(`📋 Destino copiado para Grab: "${textToCopy}"`);
    setTimeout(() => setCopiedGrabStopId(null), 2500);
  };

  const handleSelectPlan = (id: string) => {
    if (itineraryState) {
      itineraryState.setActivePlanId(id);
    } else {
      setInternalActivePlanId(id);
      saveActivePlanId(id);
    }
  };

  const updatePlansState = (updatedPlans: ItineraryPlan[]) => {
    if (itineraryState) {
      itineraryState.updatePlans(updatedPlans);
    } else {
      setInternalPlans(updatedPlans);
      saveItineraryPlans(updatedPlans);
    }
  };

  const toggleDayExpanded = (dayId: string) => {
    setExpandedDayIds((prev) => ({
      ...prev,
      [dayId]: !prev[dayId],
    }));
  };

  const toggleDayMap = (dayId: string) => {
    setDayMapOpenIds((prev) => ({
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

  // Reorder Stop: Move Up
  const handleMoveStopUp = (dayId: string, stopIndex: number) => {
    if (!activePlan || stopIndex <= 0) return;
    const updatedDays = activePlan.days.map((day) => {
      if (day.id !== dayId) return day;
      const newStops = [...day.stops];
      const temp = newStops[stopIndex - 1];
      newStops[stopIndex - 1] = newStops[stopIndex];
      newStops[stopIndex] = temp;
      return { ...day, stops: newStops };
    });

    const updatedPlan: ItineraryPlan = {
      ...activePlan,
      updatedAt: Date.now(),
      days: updatedDays,
    };
    const updatedPlans = plans.map((p) => (p.id === activePlan.id ? updatedPlan : p));
    updatePlansState(updatedPlans);
  };

  // Reorder Stop: Move Down
  const handleMoveStopDown = (dayId: string, stopIndex: number) => {
    if (!activePlan) return;
    const targetDay = activePlan.days.find((d) => d.id === dayId);
    if (!targetDay || stopIndex >= targetDay.stops.length - 1) return;

    const updatedDays = activePlan.days.map((day) => {
      if (day.id !== dayId) return day;
      const newStops = [...day.stops];
      const temp = newStops[stopIndex + 1];
      newStops[stopIndex + 1] = newStops[stopIndex];
      newStops[stopIndex] = temp;
      return { ...day, stops: newStops };
    });

    const updatedPlan: ItineraryPlan = {
      ...activePlan,
      updatedAt: Date.now(),
      days: updatedDays,
    };
    const updatedPlans = plans.map((p) => (p.id === activePlan.id ? updatedPlan : p));
    updatePlansState(updatedPlans);
  };

  // Open Edit Stop Modal
  const handleOpenEditStopModal = (dayId: string, stop: ItineraryStop, index: number) => {
    setEditingStopData({ dayId, stop, index });
  };

  // Save Edited Stop
  const handleSaveEditedStop = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activePlan || !editingStopData) return;
    const formData = new FormData(e.currentTarget);
    const customName = (formData.get('customName') as string)?.trim();
    const timeSlot = (formData.get('timeSlot') as string)?.trim() || 'Horario libre';
    const ticketVnd = Number(formData.get('ticketVnd')) || 0;
    const notes = (formData.get('notes') as string)?.trim() || '';

    const updatedDays = activePlan.days.map((day) => {
      if (day.id !== editingStopData.dayId) return day;
      const updatedStops = day.stops.map((s) => {
        if (s.id !== editingStopData.stop.id) return s;
        return {
          ...s,
          customName: s.poiId ? undefined : (customName || s.customName),
          timeSlot,
          ticketVnd,
          notes,
        };
      });
      return { ...day, stops: updatedStops };
    });

    const updatedPlan: ItineraryPlan = {
      ...activePlan,
      updatedAt: Date.now(),
      days: updatedDays,
    };
    const updatedPlans = plans.map((p) => (p.id === activePlan.id ? updatedPlan : p));
    updatePlansState(updatedPlans);
    setEditingStopData(null);
    showNotification('Detalles de la parada actualizados.');
  };

  // Move Stop to another Day
  const handleMoveStopToDay = (toDayId: string) => {
    if (!activePlan || !movingStopData) return;
    const { fromDayId, stop } = movingStopData;
    if (fromDayId === toDayId) {
      setMovingStopData(null);
      return;
    }

    const updatedDays = activePlan.days.map((day) => {
      if (day.id === fromDayId) {
        return {
          ...day,
          stops: day.stops.filter((s) => s.id !== stop.id),
        };
      }
      if (day.id === toDayId) {
        return {
          ...day,
          stops: [...day.stops, stop],
        };
      }
      return day;
    });

    const updatedPlan: ItineraryPlan = {
      ...activePlan,
      updatedAt: Date.now(),
      days: updatedDays,
    };
    const updatedPlans = plans.map((p) => (p.id === activePlan.id ? updatedPlan : p));
    updatePlansState(updatedPlans);
    setMovingStopData(null);
    showNotification('Parada movida al nuevo día.');
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

  // Save Plan Metadata
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

  // Load Curated Template
  const handleLoadCuratedTemplate = (template: ItineraryPlan) => {
    const newPlanId = 'plan-curated-' + Date.now();
    const clonedPlan: ItineraryPlan = {
      ...template,
      id: newPlanId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      days: template.days.map((day, dIdx) => ({
        ...day,
        id: `day-${newPlanId}-${dIdx + 1}`,
        stops: day.stops.map((stop, sIdx) => ({
          ...stop,
          id: `stop-${newPlanId}-${dIdx + 1}-${sIdx + 1}`,
        })),
      })),
    };

    const updatedPlans = [...plans, clonedPlan];
    updatePlansState(updatedPlans);
    setActivePlanId(clonedPlan.id);
    saveActivePlanId(clonedPlan.id);
    setIsTemplatesModalOpen(false);
    showNotification(`¡Plantilla "${template.title}" cargada con éxito!`);
  };

  // Export Text Guide (Offline file)
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
    showNotification('Guía de bolsillo en texto descargada.');
  };

  // Export to iCalendar (.ics)
  const handleExportIcsCalendar = () => {
    if (!activePlan) return;
    try {
      const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const cleanText = (str: string) => str.replace(/[\\;,]/g, ' ').replace(/\n/g, '\\n');

      const icsLines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Vietnam Travel Companion//Itinerary//ES',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        `X-WR-CALNAME:${cleanText(activePlan.title)}`,
      ];

      activePlan.days.forEach((day) => {
        const baseDate = day.date || activePlan.startDate;
        const dateFormatted = baseDate ? baseDate.replace(/-/g, '') : null;

        if (dateFormatted) {
          icsLines.push(
            'BEGIN:VEVENT',
            `UID:day-${day.id}-${Date.now()}@vietnam-companion`,
            `DTSTAMP:${now}`,
            `DTSTART;VALUE=DATE:${dateFormatted}`,
            `SUMMARY:Día ${day.dayNumber}: ${day.destinationCity} - ${cleanText(day.title)}`,
            `DESCRIPTION:${cleanText(day.notes || '')}`,
            `LOCATION:${cleanText(day.destinationCity)}`,
            'STATUS:CONFIRMED',
            'END:VEVENT'
          );
        }

        day.stops.forEach((stop, sIdx) => {
          const poi = stop.poiId ? POINTS_OF_INTEREST.find((p) => p.id === stop.poiId) : null;
          const stopTitle = poi ? poi.nameEs : stop.customName || 'Parada';
          const stopDesc = [
            stop.timeSlot ? `Horario: ${stop.timeSlot}` : '',
            poi ? `Nombre vietnamita: ${poi.nameVi}` : '',
            stop.ticketVnd ? `Entrada: ${stop.ticketVnd.toLocaleString('es-ES')} VND` : '',
            stop.notes ? `Notas: ${stop.notes}` : '',
          ].filter(Boolean).join('\\n');

          if (dateFormatted) {
            icsLines.push(
              'BEGIN:VEVENT',
              `UID:stop-${stop.id}-${sIdx}@vietnam-companion`,
              `DTSTAMP:${now}`,
              `DTSTART;VALUE=DATE:${dateFormatted}`,
              `SUMMARY:[${day.destinationCity}] ${sIdx + 1}. ${cleanText(stopTitle)}`,
              `DESCRIPTION:${cleanText(stopDesc)}`,
              `LOCATION:${poi ? `${poi.lat},${poi.lng}` : cleanText(day.destinationCity)}`,
              'STATUS:CONFIRMED',
              'END:VEVENT'
            );
          }
        });
      });

      icsLines.push('END:VCALENDAR');
      const blob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Vietnam-Itinerario-${activePlan.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showNotification('📅 Calendario (.ics) descargado. Ábrelo para sincronizar con Google o Apple Calendar.');
    } catch (err) {
      console.error('Error generating .ics:', err);
      alert('Hubo un problema al generar el archivo de calendario.');
    }
  };

  // Export JSON Backup
  const handleExportJsonBackup = () => {
    if (!activePlan) return;
    const dataStr = JSON.stringify(plans, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Vietnam-Itinerarios-Backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification('💾 Copia de seguridad JSON descargada.');
  };

  // Import JSON Backup
  const handleImportJsonBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].days) {
          updatePlansState(parsed);
          setActivePlanId(parsed[0].id);
          saveActivePlanId(parsed[0].id);
          showNotification('¡Itinerarios restaurados con éxito desde la copia!');
          setIsExportModalOpen(false);
        } else {
          alert('El archivo seleccionado no tiene el formato de itinerario válido.');
        }
      } catch (err) {
        console.error(err);
        alert('Error al leer el archivo JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Print View Trigger
  const handlePrintItinerary = () => {
    window.print();
  };

  // Filtered POIs for Add Stop modal
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

  // Overall calculations for current plan
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

  // Filtered days according to search query
  const filteredDays = useMemo(() => {
    if (!activePlan) return [];
    if (!searchQuery.trim()) return activePlan.days;
    const q = searchQuery.toLowerCase();

    return activePlan.days.filter((day) => {
      const matchCity = day.destinationCity.toLowerCase().includes(q);
      const matchTitle = day.title.toLowerCase().includes(q);
      const matchNotes = day.notes?.toLowerCase().includes(q);
      const matchStops = day.stops.some((s) => {
        const poi = s.poiId ? POINTS_OF_INTEREST.find((p) => p.id === s.poiId) : null;
        return (
          (s.customName && s.customName.toLowerCase().includes(q)) ||
          (s.notes && s.notes.toLowerCase().includes(q)) ||
          (poi && (poi.nameEs.toLowerCase().includes(q) || poi.nameVi.toLowerCase().includes(q)))
        );
      });
      return matchCity || matchTitle || matchNotes || matchStops;
    });
  }, [activePlan, searchQuery]);

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
              {plans.length} {plans.length === 1 ? 'itinerario' : 'itinerarios'}
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

        {/* Right: Actions (Plantillas, Exportar, Nuevo Plan) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 shrink-0">
          <button
            id="btn-open-templates-modal"
            onClick={() => setIsTemplatesModalOpen(true)}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer min-h-[38px] shrink-0"
            title="Explorar rutas recomendadas para Vietnam"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            <span>Plantillas</span>
          </button>

          <button
            id="btn-export-options"
            onClick={() => setIsExportModalOpen(true)}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-medium text-xs flex items-center gap-1.5 transition cursor-pointer min-h-[38px] shrink-0"
            title="Exportar calendario (.ics), guía offline o backup"
          >
            <Download className="w-3.5 h-3.5 text-stone-600" />
            <span className="hidden sm:inline">Exportar</span>
          </button>

          <button
            id="btn-duplicate-plan"
            onClick={handleDuplicatePlan}
            className="p-2 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center shrink-0"
            title="Duplicar este plan como copia"
          >
            <Copy className="w-4 h-4" />
          </button>

          <button
            id="btn-create-new-plan"
            onClick={() => {
              setEditingPlanData(null);
              setIsPlanModalOpen(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs min-h-[38px] shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Nuevo</span>
          </button>
        </div>
      </div>

      {activePlan && (
        <>
          {/* Active Plan Overview & Summary Cards */}
          <div className="bg-stone-900 text-stone-100 rounded-2xl p-5 sm:p-6 shadow-md border border-stone-800 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {activePlan.title}
                </h2>
                {activePlan.description && (
                  <p className="text-stone-300 text-xs sm:text-sm mt-1 leading-relaxed max-w-3xl">
                    {activePlan.description}
                  </p>
                )}

                {/* Dates & Destinations pills */}
                <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
                  {(activePlan.startDate || activePlan.endDate) && (
                    <span className="px-2.5 py-1 rounded-lg bg-stone-800 text-amber-300 font-medium flex items-center gap-1.5 border border-stone-700">
                      <CalendarDays className="w-3.5 h-3.5 text-amber-400" />
                      {activePlan.startDate || 'Inicio'} ➔ {activePlan.endDate || 'Fin'}
                    </span>
                  )}

                  <div className="flex flex-wrap items-center gap-1.5">
                    {activePlan.destinations.map((dest, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-stone-800 text-stone-300 text-[11px] font-medium border border-stone-700/80"
                      >
                        📍 {dest}
                      </span>
                    ))}
                    {onNavigateToMaps && (
                      <button
                        onClick={() => onNavigateToMaps()}
                        className="px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-xs"
                        title="Abrir mapa unificado interactivo para seleccionar pines"
                      >
                        <MapPin className="w-3 h-3" />
                        <span>Ver en Mapa Unificado</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress & Cost summary */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
                <div className="bg-stone-800/80 border border-stone-700 p-3 rounded-xl text-center">
                  <div className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                    Duración
                  </div>
                  <div className="text-lg font-black text-amber-400 mt-0.5">
                    {planStats.totalDays} Días
                  </div>
                  <div className="text-[10px] text-stone-400">
                    {planStats.totalStops} paradas totales
                  </div>
                </div>

                <div className="bg-stone-800/80 border border-stone-700 p-3 rounded-xl text-center">
                  <div className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                    Lugares Visitados
                  </div>
                  <div className="text-lg font-black text-emerald-400 mt-0.5">
                    {planStats.visitedStops} / {planStats.totalStops}
                  </div>
                  <div className="text-[10px] text-stone-400">
                    {planStats.progressPercent}% completado
                  </div>
                </div>

                <div className="bg-stone-800/80 border border-stone-700 p-3 rounded-xl text-center col-span-2 sm:col-span-1">
                  <div className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                    Entradas Estimadas
                  </div>
                  <div className="text-base sm:text-lg font-mono font-black text-amber-300 mt-0.5">
                    {(planStats.totalTicketVnd / 1000).toLocaleString('es-ES')}k ₫
                  </div>
                  <div className="text-[10px] text-stone-400">
                    ≈ {(planStats.totalTicketVnd / eurToVnd).toFixed(1)} €
                  </div>
                </div>
              </div>
            </div>

            {/* Overall Progress Bar */}
            {planStats.totalStops > 0 && (
              <div className="pt-2 border-t border-stone-800">
                <div className="flex items-center justify-between text-[11px] text-stone-400 mb-1">
                  <span>Progreso de visitas en ruta</span>
                  <span className="font-bold text-amber-400">{planStats.progressPercent}%</span>
                </div>
                <div className="w-full bg-stone-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${planStats.progressPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* View Mode Switcher & Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-stone-200 pb-3">
            {/* Tabs for View Mode */}
            <div className="inline-flex p-1 rounded-xl bg-stone-100 border border-stone-200 text-xs font-semibold self-start sm:self-auto">
              <button
                id="btn-view-day-by-day"
                onClick={() => setViewMode('day_by_day')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                  viewMode === 'day_by_day'
                    ? 'bg-amber-500 text-stone-950 font-bold shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Día a Día + Mapa</span>
              </button>
              <button
                id="btn-view-all-days"
                onClick={() => setViewMode('all_days')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                  viewMode === 'all_days'
                    ? 'bg-white text-stone-900 font-bold shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Lista Completa ({activePlan.days.length} Días)</span>
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              {viewMode === 'all_days' && (
                <>
                  <button
                    onClick={expandAllDays}
                    className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium text-xs transition cursor-pointer"
                  >
                    Expandir Todo
                  </button>
                  <button
                    onClick={collapseAllDays}
                    className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium text-xs transition cursor-pointer"
                  >
                    Colapsar Todo
                  </button>
                </>
              )}
              <button
                id="btn-add-day"
                onClick={() => {
                  setEditingDayData({ isNew: true });
                  setIsDayModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>Añadir Día</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* VIEW 1: UNIFIED DAY-BY-DAY WITH INTEGRATED MAP & ON-ROUTE ASSISTANT       */}
          {/* ========================================================================= */}
          {viewMode === 'day_by_day' && currentSelectedDay && (
            <div className="space-y-4 animate-fade-in">
              {/* Horizontal Day Tabs Carousel */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar -mx-1 px-1">
                {activePlan.days.map((d) => {
                  const isSelected = d.id === currentSelectedDay.id;
                  const visitedCount = d.stops.filter((s) => s.isVisited).length;
                  const isAllVisited = d.stops.length > 0 && visitedCount === d.stops.length;

                  return (
                    <button
                      key={d.id}
                      onClick={() => handleSelectDayTab(d.id)}
                      className={`px-3.5 py-2 rounded-xl text-left shrink-0 transition cursor-pointer border flex items-center gap-2.5 ${
                        isSelected
                          ? 'bg-amber-500 text-stone-950 border-amber-600 shadow-sm ring-2 ring-amber-500/20'
                          : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-700'
                      }`}
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-black ${isSelected ? 'text-stone-950' : 'text-stone-900'}`}>
                            Día {d.dayNumber}
                          </span>
                          {isAllVisited ? (
                            <CheckCircle2 className={`w-3 h-3 ${isSelected ? 'text-stone-950' : 'text-emerald-600'}`} />
                          ) : null}
                        </div>
                        <span className={`text-[11px] truncate max-w-[110px] ${isSelected ? 'text-amber-950 font-medium' : 'text-stone-500'}`}>
                          {d.destinationCity}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold ${
                          isSelected
                            ? 'bg-amber-950/20 text-stone-950'
                            : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {d.stops.length}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Day Header Info Bar */}
              <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-950 border border-amber-200">
                        Día {currentSelectedDay.dayNumber} • {currentSelectedDay.destinationCity}
                      </span>
                      {currentSelectedDay.date && (
                        <span className="text-xs text-stone-500 font-medium flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-stone-400" />
                          {currentSelectedDay.date}
                        </span>
                      )}
                      <span className="text-xs text-stone-500">
                        {currentSelectedDay.stops.filter((s) => s.isVisited).length} de {currentSelectedDay.stops.length} paradas visitadas
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-stone-900 mt-1">
                      {currentSelectedDay.title}
                    </h3>
                  </div>

                  {/* Day Route Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Multi-stop Google Maps Link */}
                    {buildMultiStopGoogleMapsUrl(currentSelectedDay.stops) && (
                      <a
                        href={buildMultiStopGoogleMapsUrl(currentSelectedDay.stops)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                        title="Abrir la ruta completa del día en Google Maps para navegar en coche o a pie"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Ruta en Google Maps</span>
                      </a>
                    )}

                    {/* Optimize Route Button */}
                    {currentSelectedDay.stops.length >= 3 && (
                      <button
                        onClick={() => handleOptimizeDayRoute(currentSelectedDay.id)}
                        className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer border border-stone-200"
                        title="Reordenar automáticamente las paradas por cercanía geográfica"
                      >
                        <Wand2 className="w-3.5 h-3.5 text-amber-600" />
                        <span>Optimizar ruta</span>
                      </button>
                    )}

                    {/* Add Stop Button */}
                    <button
                      onClick={() => handleOpenAddStopModal(currentSelectedDay.id)}
                      className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-400" />
                      <span>Añadir Parada</span>
                    </button>

                    {/* Edit Day Button */}
                    <button
                      onClick={() => {
                        setEditingDayData({ day: currentSelectedDay });
                        setIsDayModalOpen(true);
                      }}
                      className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition"
                      title="Editar notas y título de este día"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Day Notes & Transportation */}
                {currentSelectedDay.notes && (
                  <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-3 text-xs text-stone-700 flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="font-semibold text-stone-900 block mb-0.5">
                        Consejos & Traslados del Día:
                      </span>
                      <p className="text-stone-600 leading-relaxed whitespace-pre-line">{currentSelectedDay.notes}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* ================= MODO "EN RUTA / ASISTENTE ACTIVO" ================= */}
              {(() => {
                const pendingStop = currentSelectedDay.stops.find((s) => !s.isVisited);
                const allDone = currentSelectedDay.stops.length > 0 && !pendingStop;
                const poi = pendingStop?.poiId ? POINTS_OF_INTEREST.find((p) => p.id === pendingStop.poiId) : null;

                if (pendingStop) {
                  const stopIndex = currentSelectedDay.stops.findIndex((s) => s.id === pendingStop.id);
                  const isCopied = copiedGrabStopId === pendingStop.id;

                  return (
                    <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-2 border-amber-400/50 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="flex h-2.5 w-2.5 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                          </span>
                          <span className="text-xs font-black uppercase tracking-wider text-amber-900">
                            Modo En Ruta • Próxima Parada (#{stopIndex + 1})
                          </span>
                        </div>
                        {pendingStop.timeSlot && (
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-amber-100 text-amber-950 font-bold border border-amber-300">
                            {pendingStop.timeSlot}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h4 className="text-base sm:text-lg font-black text-stone-900">
                            {pendingStop.customName || (poi ? poi.nameEs : 'Próxima parada')}
                          </h4>
                          {poi && (
                            <div className="flex items-center gap-2 mt-1 text-xs text-amber-900 font-medium">
                              <span>🇻🇳 {poi.nameVi}</span>
                              <button
                                onClick={() => speakVietnamese(poi.nameVi)}
                                className="p-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-800 transition cursor-pointer"
                                title="Pronunciar nombre para el conductor"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-stone-400">•</span>
                              <span className="text-stone-600 truncate max-w-xs">{poi.city} ({poi.howToGet})</span>
                            </div>
                          )}
                        </div>

                        {/* On-Route Fast Buttons */}
                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          {/* Navigate with Google Maps */}
                          {poi ? (
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${poi.lat},${poi.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95"
                            >
                              <Navigation className="w-4 h-4" />
                              <span>Cómo llegar (Maps)</span>
                            </a>
                          ) : (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pendingStop.customName + ' ' + currentSelectedDay.destinationCity)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95"
                            >
                              <Navigation className="w-4 h-4" />
                              <span>Buscar en Maps</span>
                            </a>
                          )}

                          {/* Copy Grab Address */}
                          <button
                            onClick={() => handleCopyGrabDestination(pendingStop)}
                            className="px-3 py-2 rounded-xl bg-white hover:bg-stone-100 border border-stone-300 text-stone-800 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                            title="Copiar nombre y dirección exacta en vietnamita para pegar en la app de Grab o mostrar al taxista"
                          >
                            <Car className="w-4 h-4 text-emerald-600" />
                            <span>{isCopied ? '¡Copiado!' : 'Copiar para Grab'}</span>
                          </button>

                          {/* Complete Stop */}
                          <button
                            onClick={() => handleToggleStopVisited(currentSelectedDay.id, pendingStop.id)}
                            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
                            title="Marcar como visitado y pasar a la siguiente parada"
                          >
                            <Check className="w-4 h-4" />
                            <span>Hecho ✓</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (allDone) {
                  return (
                    <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 text-center space-y-1">
                      <div className="text-emerald-800 font-black text-sm flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <span>¡Todas las paradas del Día {currentSelectedDay.dayNumber} completadas!</span>
                      </div>
                      <p className="text-xs text-emerald-700">
                        Has visitado todos los puntos programados en {currentSelectedDay.destinationCity}. ¡Buen descanso y disfruta de la gastronomía nocturna!
                      </p>
                    </div>
                  );
                }

                return null;
              })()}

              {/* Day Route Map Component */}
              <ItineraryDayMap
                day={currentSelectedDay}
                activeStopId={activeMapStopId}
                onSelectStop={(stopId) => setActiveMapStopId(stopId)}
                onOptimizeRoute={() => handleOptimizeDayRoute(currentSelectedDay.id)}
              />

              {/* Stops Detailed List */}
              <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                      Paradas del Día ({currentSelectedDay.stops.length}):
                    </span>
                    <span className="text-[11px] text-stone-400">
                      (Toca una parada para enfocarla en el mapa)
                    </span>
                  </div>

                  <button
                    onClick={() => handleOpenAddStopModal(currentSelectedDay.id)}
                    className="text-xs text-amber-800 hover:text-amber-950 font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Añadir Lugar</span>
                  </button>
                </div>

                {currentSelectedDay.stops.length === 0 ? (
                  <div className="p-8 rounded-xl border-2 border-dashed border-stone-200 text-center space-y-2">
                    <MapPin className="w-8 h-8 text-stone-400 mx-auto" />
                    <p className="text-xs text-stone-500">
                      Aún no has añadido paradas a este día.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <button
                        onClick={() => handleOpenAddStopModal(currentSelectedDay.id)}
                        className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Añadir desde Catálogo o Personalizado</span>
                      </button>
                      {onNavigateToMaps && (
                        <button
                          onClick={() => onNavigateToMaps(currentSelectedDay.id)}
                          className="px-3.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <MapPin className="w-3.5 h-3.5 text-amber-400" />
                          <span>Explorar en Mapas</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {currentSelectedDay.stops.map((stop, sIdx) => {
                      const poi = stop.poiId ? POINTS_OF_INTEREST.find((p) => p.id === stop.poiId) : null;
                      const isActiveStop = activeMapStopId === stop.id;
                      const isCopied = copiedGrabStopId === stop.id;

                      return (
                        <div
                          key={stop.id}
                          onClick={() => setActiveMapStopId(stop.id)}
                          className={`rounded-xl p-3 sm:p-3.5 border transition cursor-pointer ${
                            isActiveStop
                              ? 'bg-amber-50/70 border-amber-400 shadow-sm ring-1 ring-amber-400'
                              : stop.isVisited
                              ? 'bg-emerald-50/30 border-emerald-200 text-stone-500'
                              : 'bg-stone-50/60 border-stone-200 hover:bg-stone-50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            {/* Left: Reorder buttons + Sequence Number + Checkbox */}
                            <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                              <div className="flex flex-col items-center justify-center shrink-0 -mt-0.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveStopUp(currentSelectedDay.id, sIdx);
                                  }}
                                  disabled={sIdx === 0}
                                  className="p-1 text-stone-400 hover:text-stone-700 disabled:opacity-20 disabled:hover:text-stone-400 transition cursor-pointer"
                                  title="Subir parada"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <span
                                  className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${
                                    stop.isVisited
                                      ? 'bg-emerald-200 text-emerald-900'
                                      : isActiveStop
                                      ? 'bg-amber-500 text-stone-950'
                                      : 'bg-stone-200 text-stone-800'
                                  }`}
                                >
                                  {sIdx + 1}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveStopDown(currentSelectedDay.id, sIdx);
                                  }}
                                  disabled={sIdx === currentSelectedDay.stops.length - 1}
                                  className="p-1 text-stone-400 hover:text-stone-700 disabled:opacity-20 disabled:hover:text-stone-400 transition cursor-pointer"
                                  title="Bajar parada"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleStopVisited(currentSelectedDay.id, stop.id);
                                }}
                                className="mt-1 text-stone-400 hover:text-emerald-600 transition cursor-pointer shrink-0"
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
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-950">
                                      ⏱️ {stop.timeSlot}
                                    </span>
                                  )}
                                  {poi && (
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-stone-200/80 text-stone-700">
                                      📍 {poi.category}
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

                                {poi && (
                                  <div className="flex items-center gap-1.5 text-xs text-amber-900 font-medium mt-0.5">
                                    <span>{poi.nameVi}</span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        speakVietnamese(poi.nameVi);
                                      }}
                                      className="p-0.5 hover:bg-amber-100 rounded text-amber-800"
                                      title="Pronunciar en vietnamita"
                                    >
                                      <Volume2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}

                                {stop.notes && (
                                  <p className="text-xs text-stone-600 mt-1.5 leading-relaxed bg-white/70 p-2 rounded-lg border border-stone-200/60">
                                    {stop.notes}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Right: Action Buttons */}
                            <div className="flex items-center gap-1 shrink-0 pt-0.5">
                              {/* Grab copy button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyGrabDestination(stop);
                                }}
                                className="p-1.5 text-stone-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                                title="Copiar nombre y dirección en vietnamita para Grab"
                              >
                                <Car className="w-3.5 h-3.5" />
                              </button>

                              {/* Google Maps link */}
                              {poi ? (
                                <a
                                  href={`https://www.google.com/maps/dir/?api=1&destination=${poi.lat},${poi.lng}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-1.5 text-stone-500 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition"
                                  title="Abrir cómo llegar en Google Maps"
                                >
                                  <Navigation className="w-3.5 h-3.5" />
                                </a>
                              ) : (
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.customName + ' ' + currentSelectedDay.destinationCity)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition"
                                  title="Buscar en Google Maps"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}

                              {/* Edit stop */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditStopModal(currentSelectedDay.id, stop, sIdx);
                                }}
                                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition cursor-pointer"
                                title="Editar parada"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete stop */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteStop(currentSelectedDay.id, stop.id);
                                }}
                                className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
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

          {/* ========================================================================= */}
          {/* VIEW 2: CLASSIC ALL DAYS ACCORDION LIST                                    */}
          {/* ========================================================================= */}
          {viewMode === 'all_days' && (
            <div className="space-y-4 animate-fade-in">
              {/* Search bar & Controls row */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Search Input */}
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por ciudad, templo, parada o nota..."
                    className="w-full pl-9 pr-8 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

          {/* Days Accordion List */}
          <div className="space-y-4">
            {filteredDays.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-stone-200 text-center space-y-2">
                <Search className="w-8 h-8 text-stone-400 mx-auto mb-1" />
                <h4 className="font-bold text-sm text-stone-700">No se encontraron coincidencias</h4>
                <p className="text-xs text-stone-500">
                  Prueba con otro término o limpia el filtro de búsqueda.
                </p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-3 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold mt-2"
                >
                  Limpiar búsqueda
                </button>
              </div>
            ) : null}

            {filteredDays.map((day) => {
              const isExpanded = !!expandedDayIds[day.id];
              const isMapOpen = !!dayMapOpenIds[day.id];
              const visitedStopsInDay = day.stops.filter((s) => s.isVisited).length;

              // Calculate tickets for this day
              const dayTotalTicketVnd = day.stops.reduce((acc, s) => acc + (s.ticketVnd || 0), 0);

              // Check how many stops have coordinates for mapping
              const mappedStopsCount = day.stops.filter((s) => {
                if (!s.poiId) return false;
                return !!POINTS_OF_INTEREST.find((p) => p.id === s.poiId);
              }).length;

              return (
                <div
                  key={day.id}
                  id={`day-card-${day.dayNumber}`}
                  className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden transition"
                >
                  {/* Day Header Bar (Accordion Trigger) */}
                  <div
                    onClick={() => toggleDayExpanded(day.id)}
                    className="p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer hover:bg-stone-50/70 select-none transition"
                  >
                    {/* Left: Day Number Badge + Title + City */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-amber-100 border border-amber-300 flex flex-col items-center justify-center shrink-0 text-amber-950 shadow-2xs">
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
                            ({visitedStopsInDay}/{day.stops.length} completados)
                          </span>
                          {dayTotalTicketVnd > 0 && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                              🎟️ {(dayTotalTicketVnd / 1000).toLocaleString('es-ES')}k ₫
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm sm:text-base font-bold text-stone-900 mt-1 truncate">
                          {day.title}
                        </h3>
                      </div>
                    </div>

                    {/* Right: Map button + Edit + Delete + Expand / Collapse */}
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                      {/* Day Map Toggle Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isExpanded) {
                            toggleDayExpanded(day.id);
                          }
                          toggleDayMap(day.id);
                        }}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                          isMapOpen
                            ? 'bg-stone-900 text-amber-400 border border-stone-700'
                            : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                        }`}
                        title="Ver mapa interactivo y ruta de este día"
                      >
                        <Route className="w-3.5 h-3.5 text-amber-600" />
                        <span className="hidden sm:inline">Mapa Día</span>
                        {mappedStopsCount > 0 && (
                          <span className="text-[10px] px-1 rounded-full bg-stone-200 text-stone-700">
                            {mappedStopsCount}
                          </span>
                        )}
                      </button>

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

                      {/* Embedded Interactive Google Map for this Day (if toggled) */}
                      {isMapOpen && (
                        <ItineraryDayMap
                          day={day}
                          onClose={() => toggleDayMap(day.id)}
                        />
                      )}

                      {/* Stops List */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                              Lugares & Actividades Planificadas:
                            </span>
                            <span className="text-[11px] text-stone-400">
                              ({day.stops.length} {day.stops.length === 1 ? 'parada' : 'paradas'})
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {onNavigateToMaps && (
                              <button
                                onClick={() => onNavigateToMaps(day.id)}
                                className="text-xs text-stone-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 font-semibold flex items-center gap-1 px-2.5 py-1 rounded-lg transition cursor-pointer"
                                title={`Seleccionar pines en el mapa interactivo de ${day.destinationCity}`}
                              >
                                <MapPin className="w-3.5 h-3.5 text-amber-600" />
                                <span>Elegir en Mapa</span>
                              </button>
                            )}

                            <button
                              id={`btn-add-stop-day-${day.dayNumber}`}
                              onClick={() => handleOpenAddStopModal(day.id)}
                              className="text-xs text-amber-800 hover:text-amber-950 font-bold flex items-center gap-1 transition cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>+ Añadir Lugar</span>
                            </button>
                          </div>
                        </div>

                        {day.stops.length === 0 ? (
                          <div className="p-6 rounded-xl border-2 border-dashed border-stone-200 text-center space-y-2">
                            <p className="text-xs text-stone-500">
                              Aún no has añadido paradas o puntos de interés a este día.
                            </p>
                            <div className="flex flex-wrap items-center justify-center gap-2">
                              <button
                                onClick={() => handleOpenAddStopModal(day.id)}
                                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Elegir de la Lista</span>
                              </button>
                              {onNavigateToMaps && (
                                <button
                                  onClick={() => onNavigateToMaps(day.id)}
                                  className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer"
                                >
                                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Seleccionar Pines en el Mapa</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {day.stops.map((stop, sIdx) => {
                              const poi = stop.poiId
                                ? POINTS_OF_INTEREST.find((p) => p.id === stop.poiId)
                                : null;

                              return (
                                <div
                                  key={stop.id}
                                  className={`rounded-xl p-3 sm:p-3.5 border transition ${
                                    stop.isVisited
                                      ? 'bg-emerald-50/40 border-emerald-200 text-stone-500'
                                      : 'bg-stone-50/60 border-stone-200/90 text-stone-800 hover:bg-stone-50'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    {/* Left: Sequence Number + Checkbox + Details */}
                                    <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                                      {/* Reorder Buttons (Move Up / Down) */}
                                      <div className="flex flex-col items-center justify-center shrink-0 -mt-0.5">
                                        <button
                                          onClick={() => handleMoveStopUp(day.id, sIdx)}
                                          disabled={sIdx === 0}
                                          className="p-1 text-stone-400 hover:text-stone-700 disabled:opacity-20 disabled:hover:text-stone-400 transition cursor-pointer"
                                          title="Mover arriba en el orden"
                                        >
                                          <ArrowUp className="w-3 h-3" />
                                        </button>
                                        <span className="w-5 h-5 rounded-full bg-stone-200 text-stone-800 text-[10px] font-black flex items-center justify-center">
                                          {sIdx + 1}
                                        </span>
                                        <button
                                          onClick={() => handleMoveStopDown(day.id, sIdx)}
                                          disabled={sIdx === day.stops.length - 1}
                                          className="p-1 text-stone-400 hover:text-stone-700 disabled:opacity-20 disabled:hover:text-stone-400 transition cursor-pointer"
                                          title="Mover abajo en el orden"
                                        >
                                          <ArrowDown className="w-3 h-3" />
                                        </button>
                                      </div>

                                      {/* Checkbox */}
                                      <button
                                        onClick={() => handleToggleStopVisited(day.id, stop.id)}
                                        className="mt-1 text-stone-400 hover:text-emerald-600 transition cursor-pointer shrink-0"
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
                                              📍 {poi.category}
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

                                    {/* Right: Actions (Edit, Move to Day, Open Map, Delete) */}
                                    <div className="flex items-center gap-1 shrink-0">
                                      {/* Edit Stop */}
                                      <button
                                        onClick={() => handleOpenEditStopModal(day.id, stop, sIdx)}
                                        className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-lg transition"
                                        title="Editar parada (horario, precio, notas)"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>

                                      {/* Move to another Day */}
                                      {activePlan.days.length > 1 && (
                                        <button
                                          onClick={() => setMovingStopData({ fromDayId: day.id, stop })}
                                          className="p-1.5 text-stone-400 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition"
                                          title="Mover parada a otro día del viaje"
                                        >
                                          <MoveRight className="w-3.5 h-3.5" />
                                        </button>
                                      )}

                                      {poi && onStartFreeTour && (
                                        <button
                                          onClick={() => onStartFreeTour(poi)}
                                          className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                                          title="Hacer Free Tour con Gemini aquí"
                                        >
                                          <Sparkles className="w-3.5 h-3.5" />
                                        </button>
                                      )}

                                      {poi && (
                                        <a
                                          href={`https://www.google.com/maps/search/?api=1&query=${poi.lat},${poi.lng}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-1.5 text-stone-400 hover:text-sky-700 transition"
                                          title="Abrir en Google Maps"
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
        </div>
      )}

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

              {/* Option 2: Custom Activity */}
              <div className="pt-2 border-t border-stone-200">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-700 block mb-1">
                  2. O escribe un Lugar / Actividad Personalizada:
                </label>
                <input
                  type="text"
                  placeholder="Ej: Café con huevo en Cafe Giảng, Trekking en Sapa, Masaje tradicional..."
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

              {/* Timing, Price, Notes */}
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
                  Notas para esta parada (vestimenta, consejos, reservas):
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

      {/* ================= MODAL: EDIT STOP ================= */}
      {editingStopData && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden">
            <form onSubmit={handleSaveEditedStop}>
              <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
                <h3 className="font-bold text-base sm:text-lg text-stone-900">
                  Editar Parada #{editingStopData.index + 1}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingStopData(null)}
                  className="p-2 text-stone-400 hover:text-stone-700 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 sm:p-5 space-y-3.5">
                {!editingStopData.stop.poiId && (
                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">
                      Nombre de la Actividad / Lugar:
                    </label>
                    <input
                      type="text"
                      name="customName"
                      defaultValue={editingStopData.stop.customName || ''}
                      required
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">
                      Horario / Momento:
                    </label>
                    <input
                      type="text"
                      name="timeSlot"
                      defaultValue={editingStopData.stop.timeSlot || 'Mañana'}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">
                      Entrada (VND):
                    </label>
                    <input
                      type="number"
                      name="ticketVnd"
                      defaultValue={editingStopData.stop.ticketVnd || 0}
                      step="5000"
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Notas y Consejos para esta visita:
                  </label>
                  <textarea
                    rows={3}
                    name="notes"
                    defaultValue={editingStopData.stop.notes || ''}
                    placeholder="Consejos, reservas, vestimenta adecuada..."
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-stone-200 flex items-center justify-end gap-2 bg-stone-50">
                <button
                  type="button"
                  onClick={() => setEditingStopData(null)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-200 text-xs font-medium transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs transition cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: MOVE STOP TO ANOTHER DAY ================= */}
      {movingStopData && activePlan && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <h3 className="font-bold text-base text-stone-900 flex items-center gap-2">
                <MoveRight className="w-4 h-4 text-amber-600" />
                <span>Mover Parada a Otro Día</span>
              </h3>
              <button
                onClick={() => setMovingStopData(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3">
              <p className="text-xs text-stone-600">
                Selecciona a qué día del viaje deseas mover esta actividad:
              </p>

              <div className="space-y-1.5 max-h-60 overflow-y-auto p-1">
                {activePlan.days.map((day) => {
                  const isCurrent = day.id === movingStopData.fromDayId;
                  return (
                    <button
                      key={day.id}
                      onClick={() => handleMoveStopToDay(day.id)}
                      disabled={isCurrent}
                      className={`w-full text-left p-2.5 rounded-xl border text-xs flex items-center justify-between transition ${
                        isCurrent
                          ? 'bg-stone-100 border-stone-200 text-stone-400 cursor-not-allowed'
                          : 'bg-white hover:bg-amber-50 hover:border-amber-300 border-stone-200 text-stone-800 cursor-pointer'
                      }`}
                    >
                      <div className="truncate">
                        <span className="font-bold">Día {day.dayNumber}:</span> {day.destinationCity} —{' '}
                        <span className="text-stone-500">{day.title}</span>
                      </div>
                      {isCurrent ? (
                        <span className="text-[10px] text-stone-400 font-medium shrink-0 ml-2">Actual</span>
                      ) : (
                        <MoveRight className="w-3.5 h-3.5 text-amber-600 shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CURATED TEMPLATES ================= */}
      {isTemplatesModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-stone-900">
                    Plantillas de Itinerario Oficiales para Vietnam
                  </h3>
                  <p className="text-xs text-stone-500">
                    Rutas curadas con tiempos reales de traslado, paradas imprescindibles y presupuesto estimado.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTemplatesModalOpen(false)}
                className="p-2 text-stone-400 hover:text-stone-700 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {DEFAULT_ITINERARIES.map((template) => {
                  const totalStops = template.days.reduce((acc, d) => acc + d.stops.length, 0);

                  return (
                    <div
                      key={template.id}
                      className="bg-stone-50/70 hover:bg-stone-50 border border-stone-200 rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4 transition hover:shadow-xs"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px] tracking-wide uppercase">
                            {template.days.length} Días • {totalStops} Paradas
                          </span>
                        </div>

                        <h4 className="font-bold text-sm sm:text-base text-stone-900 leading-snug">
                          {template.title}
                        </h4>

                        <p className="text-xs text-stone-600 leading-relaxed">
                          {template.description}
                        </p>

                        <div className="flex flex-wrap gap-1 pt-1">
                          {template.destinations.slice(0, 5).map((dest, i) => (
                            <span
                              key={i}
                              className="text-[10px] px-2 py-0.5 rounded bg-stone-200/80 text-stone-700 font-medium"
                            >
                              📍 {dest}
                            </span>
                          ))}
                          {template.destinations.length > 5 && (
                            <span className="text-[10px] px-1.5 py-0.5 text-stone-500">
                              +{template.destinations.length - 5} más
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleLoadCuratedTemplate(template)}
                        className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Cargar esta Plantilla</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: EXPORT & BACKUP OPTIONS ================= */}
      {isExportModalOpen && activePlan && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <h3 className="font-bold text-base sm:text-lg text-stone-900 flex items-center gap-2">
                <Download className="w-5 h-5 text-amber-600" />
                <span>Exportar & Sincronizar Itinerario</span>
              </h3>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="p-2 text-stone-400 hover:text-stone-700 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3">
              <p className="text-xs text-stone-600">
                Elige el formato que mejor se adapte a tus necesidades de viaje:
              </p>

              <div className="space-y-2.5">
                {/* 1. iCalendar (.ics) */}
                <button
                  onClick={handleExportIcsCalendar}
                  className="w-full p-3.5 rounded-xl border border-stone-200 hover:border-amber-400 hover:bg-amber-50/40 text-left transition flex items-start gap-3 group cursor-pointer"
                >
                  <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0 mt-0.5">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-stone-900 group-hover:text-amber-950">
                      Sincronizar con Calendario (.ics)
                    </h4>
                    <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">
                      Crea un archivo de eventos para importar directamente a Google Calendar, Apple Calendar o Outlook.
                    </p>
                  </div>
                </button>

                {/* 2. Text Guide (.txt) */}
                <button
                  onClick={handleExportItineraryText}
                  className="w-full p-3.5 rounded-xl border border-stone-200 hover:border-amber-400 hover:bg-amber-50/40 text-left transition flex items-start gap-3 group cursor-pointer"
                >
                  <div className="p-2 rounded-lg bg-stone-100 text-stone-700 shrink-0 mt-0.5">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-stone-900 group-hover:text-amber-950">
                      Guía de Bolsillo Offline (.txt)
                    </h4>
                    <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">
                      Resumen legible completo para consultar en el teléfono sin cobertura ni consumo de batería.
                    </p>
                  </div>
                </button>

                {/* 3. JSON Backup */}
                <button
                  onClick={handleExportJsonBackup}
                  className="w-full p-3.5 rounded-xl border border-stone-200 hover:border-amber-400 hover:bg-amber-50/40 text-left transition flex items-start gap-3 group cursor-pointer"
                >
                  <div className="p-2 rounded-lg bg-sky-100 text-sky-800 shrink-0 mt-0.5">
                    <FileDown className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-stone-900 group-hover:text-amber-950">
                      Copia de Seguridad Completa (.json)
                    </h4>
                    <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">
                      Guarda todos tus planes e itinerarios para restaurarlos en otro dispositivo o tras limpiar la caché.
                    </p>
                  </div>
                </button>

                {/* 4. Import Backup */}
                <label className="w-full p-3.5 rounded-xl border border-stone-200 hover:border-amber-400 hover:bg-amber-50/40 text-left transition flex items-start gap-3 group cursor-pointer">
                  <input
                    ref={importFileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImportJsonBackup}
                    className="hidden"
                  />
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 shrink-0 mt-0.5">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-stone-900 group-hover:text-amber-950">
                      Restaurar Itinerario desde Archivo (.json)
                    </h4>
                    <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">
                      Carga una copia de seguridad previamente descargada.
                    </p>
                  </div>
                </label>

                {/* 5. Print Mode */}
                <button
                  onClick={handlePrintItinerary}
                  className="w-full p-3.5 rounded-xl border border-stone-200 hover:border-amber-400 hover:bg-amber-50/40 text-left transition flex items-start gap-3 group cursor-pointer"
                >
                  <div className="p-2 rounded-lg bg-stone-100 text-stone-700 shrink-0 mt-0.5">
                    <Printer className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-stone-900 group-hover:text-amber-950">
                      Imprimir o Guardar en PDF
                    </h4>
                    <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">
                      Abre el diálogo de impresión de tu navegador para imprimir en papel o generar un PDF físico.
                    </p>
                  </div>
                </button>
              </div>
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
