import { useState, useMemo, useCallback } from 'react';
import { ItineraryPlan, ItineraryDay, ItineraryStop } from '../types';
import { POINTS_OF_INTEREST } from '../data/pois';
import { DEFAULT_ITINERARIES } from '../data/defaultItineraries';
import {
  getItineraryPlans,
  saveItineraryPlans,
  getActivePlanId,
  saveActivePlanId,
} from './storage';

export interface PoiInclusionOccurrence {
  dayId: string;
  dayNumber: number;
  dayCity: string;
  dayTitle: string;
  stopId: string;
  timeSlot?: string;
  isVisited: boolean;
}

export interface PoiInclusionStatus {
  inPlan: boolean;
  occurrences: PoiInclusionOccurrence[];
}

export function useItineraryState() {
  const [plans, setPlans] = useState<ItineraryPlan[]>(getItineraryPlans);
  const [activePlanId, setActivePlanIdState] = useState<string>(getActivePlanId);
  const [selectedDayId, setSelectedDayId] = useState<string>('');

  const activePlan = useMemo(() => {
    return plans.find((p) => p.id === activePlanId) || plans[0] || null;
  }, [plans, activePlanId]);

  // Ensure selectedDayId always points to a valid day in activePlan
  const currentDay = useMemo(() => {
    if (!activePlan || activePlan.days.length === 0) return null;
    const found = activePlan.days.find((d) => d.id === selectedDayId);
    return found || activePlan.days[0];
  }, [activePlan, selectedDayId]);

  const setActivePlanId = useCallback((id: string) => {
    setActivePlanIdState(id);
    saveActivePlanId(id);
    const plan = plans.find((p) => p.id === id);
    if (plan && plan.days.length > 0) {
      setSelectedDayId(plan.days[0].id);
    }
  }, [plans]);

  const updatePlans = useCallback((newPlans: ItineraryPlan[]) => {
    setPlans(newPlans);
    saveItineraryPlans(newPlans);
  }, []);

  const addPoiToDay = useCallback(
    (
      planId: string,
      dayId: string,
      poiId: string,
      timeSlot: string = 'Mañana 09:30',
      customNotes?: string
    ): { success: boolean; stopId?: string } => {
      try {
        const currentPlans = [...plans];
        const planIndex = currentPlans.findIndex((p) => p.id === planId);
        if (planIndex === -1) return { success: false };

        const plan = { ...currentPlans[planIndex] };
        const dayIndex = plan.days.findIndex((d) => d.id === dayId);
        if (dayIndex === -1) return { success: false };

        const day = { ...plan.days[dayIndex] };
        const poi = POINTS_OF_INTEREST.find((p) => p.id === poiId);

        const newStopId = `stop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const newStop: ItineraryStop = {
          id: newStopId,
          poiId,
          customName: poi ? poi.nameEs : 'Punto de interés',
          timeSlot: timeSlot || 'Horario libre',
          ticketVnd: poi ? poi.ticketVnd : 0,
          notes: customNotes ?? (poi ? poi.travelerTips : ''),
          isVisited: false,
        };

        const updatedStops = [...day.stops, newStop];
        plan.days[dayIndex] = { ...day, stops: updatedStops };
        plan.updatedAt = Date.now();
        currentPlans[planIndex] = plan;

        updatePlans(currentPlans);
        return { success: true, stopId: newStopId };
      } catch (err) {
        console.error('Failed to add POI to itinerary:', err);
        return { success: false };
      }
    },
    [plans, updatePlans]
  );

  const removeStopFromDay = useCallback(
    (planId: string, dayId: string, stopId: string): boolean => {
      try {
        const currentPlans = [...plans];
        const planIndex = currentPlans.findIndex((p) => p.id === planId);
        if (planIndex === -1) return false;

        const plan = { ...currentPlans[planIndex] };
        const dayIndex = plan.days.findIndex((d) => d.id === dayId);
        if (dayIndex === -1) return false;

        const day = { ...plan.days[dayIndex] };
        const updatedStops = day.stops.filter((s) => s.id !== stopId);
        plan.days[dayIndex] = { ...day, stops: updatedStops };
        plan.updatedAt = Date.now();
        currentPlans[planIndex] = plan;

        updatePlans(currentPlans);
        return true;
      } catch (err) {
        console.error('Failed to remove stop from itinerary:', err);
        return false;
      }
    },
    [plans, updatePlans]
  );

  const toggleStopVisited = useCallback(
    (planId: string, dayId: string, stopId: string) => {
      const currentPlans = [...plans];
      const planIndex = currentPlans.findIndex((p) => p.id === planId);
      if (planIndex === -1) return;

      const plan = { ...currentPlans[planIndex] };
      const dayIndex = plan.days.findIndex((d) => d.id === dayId);
      if (dayIndex === -1) return;

      const day = { ...plan.days[dayIndex] };
      const updatedStops = day.stops.map((s) => {
        if (s.id === stopId) {
          return { ...s, isVisited: !s.isVisited };
        }
        return s;
      });

      plan.days[dayIndex] = { ...day, stops: updatedStops };
      plan.updatedAt = Date.now();
      currentPlans[planIndex] = plan;

      updatePlans(currentPlans);
    },
    [plans, updatePlans]
  );

  const getPoiInclusionStatus = useCallback(
    (poiId: string): PoiInclusionStatus => {
      if (!activePlan) return { inPlan: false, occurrences: [] };

      const occurrences: PoiInclusionOccurrence[] = [];

      for (const day of activePlan.days) {
        for (const stop of day.stops) {
          if (stop.poiId === poiId) {
            occurrences.push({
              dayId: day.id,
              dayNumber: day.dayNumber,
              dayCity: day.destinationCity,
              dayTitle: day.title,
              stopId: stop.id,
              timeSlot: stop.timeSlot,
              isVisited: stop.isVisited,
            });
          }
        }
      }

      return {
        inPlan: occurrences.length > 0,
        occurrences,
      };
    },
    [activePlan]
  );

  return {
    plans,
    activePlanId,
    activePlan,
    selectedDayId: currentDay?.id || '',
    currentDay,
    setSelectedDayId,
    setActivePlanId,
    updatePlans,
    addPoiToDay,
    removeStopFromDay,
    toggleStopVisited,
    getPoiInclusionStatus,
  };
}

export type ItineraryState = ReturnType<typeof useItineraryState>;
