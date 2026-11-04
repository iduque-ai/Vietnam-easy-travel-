import { FreeTourData } from '../types';

export type VibeType = 'curiosidades' | 'historia' | 'express' | 'fotografia' | 'gastronomia';

export interface VibeMeta {
  id: VibeType;
  label: string;
  shortLabel: string;
  icon: string;
  desc: string;
  badgeColor: string;
}

export const VIBE_CONFIGS: Record<VibeType, VibeMeta> = {
  curiosidades: {
    id: 'curiosidades',
    label: 'Mitos & Curiosidades',
    shortLabel: 'Mitos',
    icon: '🔮',
    desc: 'Secretos locales, supersticiones y leyendas poco conocidas',
    badgeColor: 'bg-purple-50 text-purple-800 border-purple-200',
  },
  historia: {
    id: 'historia',
    label: 'Historia & Dinastías',
    shortLabel: 'Historia',
    icon: '📜',
    desc: 'Reyes, guerras de resistencia y arquitectura tradicional',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  express: {
    id: 'express',
    label: 'Tour Exprés (15m)',
    shortLabel: 'Exprés',
    icon: '⚡',
    desc: 'Lo absolutamente imprescindible si tienes poco tiempo',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  fotografia: {
    id: 'fotografia',
    label: 'Enfoque Fotográfico',
    shortLabel: 'Foto',
    icon: '📸',
    desc: 'Ángulos secretos, juego de luces y cómo evitar aglomeraciones',
    badgeColor: 'bg-sky-50 text-sky-800 border-sky-200',
  },
  gastronomia: {
    id: 'gastronomia',
    label: 'Cultura & Vida Local',
    shortLabel: 'Gastro',
    icon: '🍜',
    desc: 'Vida en la calle, aromas, té y mercados de los alrededores',
    badgeColor: 'bg-rose-50 text-rose-800 border-rose-200',
  },
};

/**
 * Returns a clean clone of the monument's tour preserving its unique, in-depth historical
 * and cultural script without overwriting it with generic templates.
 */
export function adaptTourForVibe(baseTour: FreeTourData, _vibe?: VibeType): FreeTourData {
  if (!baseTour) return baseTour;
  return JSON.parse(JSON.stringify(baseTour));
}
