import { FreeTourData, FreeTourStop } from '../types';

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
 * Transforms any base tour into a specialized version matching the chosen vibe.
 */
export function adaptTourForVibe(baseTour: FreeTourData, vibe: VibeType): FreeTourData {
  if (!baseTour) return baseTour;

  const place = baseTour.placeName;
  const city = baseTour.cityName;

  // Clone tour to avoid mutating original
  const tour: FreeTourData = JSON.parse(JSON.stringify(baseTour));

  switch (vibe) {
    case 'curiosidades': {
      tour.durationMinutes = Math.max(30, baseTour.durationMinutes || 35);
      tour.tagline = `🔮 Enfoque Místico: Leyendas no contadas, supersticiones y secretos espirituales en ${place}.`;
      tour.audioGuideScript = `¡Xin chào! Estás contemplando ${place} con los ojos de quien busca lo invisible: las leyendas milenarias y las supersticiones que aún guían el día a día en ${city}.\n\nEn Vietnam, el mundo espiritual coexiste a cada instante con el bullicio de las calles. Alrededor de este monumento, los artesanos antiguos dejaron talismanes en los tejados y secretos tallados para alejar a los malos espíritus. Presta atención a las sombras, a los dragones protectores y a las ofrendas frescas que los devotos depositan con fe inquebrantable.`;
      
      tour.stops = tour.stops.map((stop, idx) => ({
        ...stop,
        insiderTip: `🔮 Secreto popular: ${stop.insiderTip || 'Fíjate en las figuras del techo, colocadas para desviar energías negativas.'}`,
      }));
      break;
    }

    case 'historia': {
      tour.durationMinutes = Math.max(40, (baseTour.durationMinutes || 35) + 10);
      tour.tagline = `📜 Enfoque Histórico: Dinastías, memoria de resistencia y arquitectura imperial en ${place}.`;
      tour.audioGuideScript = `¡Bienvenido a un viaje a través de los siglos en ${place}! La historia de ${city} está esculpida en la madera noble, el ladrillo cocido y la piedra de este monumento.\n\nDesde las grandes dinastías imperiales hasta las épocas de resistencia y reconstrucción, cada patio y cada alero responde a un plan arquitectónico regido por el mandato de los sabios y las leyes sagradas de la geomancia oriental. Analizaremos las fechas clave, el simbolismo de la soberanía vietnamita y las huellas de los gobernantes que marcaron el destino de esta tierra.`;
      
      tour.stops = tour.stops.map((stop) => ({
        ...stop,
        story: `🏛️ Contexto histórico: ${stop.story}`,
      }));
      break;
    }

    case 'express': {
      tour.durationMinutes = 15;
      tour.tagline = `⚡ Tour Exprés (15 min): Los 3 puntos clave imprescindibles que no te puedes perder en ${place}.`;
      
      // Keep only first 2-3 stops and make them succinct
      const condensedStops = tour.stops.slice(0, 3).map((stop, idx) => ({
        ...stop,
        number: idx + 1,
        title: `⚡ ${stop.title.split('(')[0].trim()}`,
        whatToLookAt: stop.whatToLookAt.split('.')[0] + '.',
        story: stop.story.split('.')[0] + '.',
        insiderTip: stop.insiderTip.split('.')[0] + '.',
      }));

      tour.stops = condensedStops;
      tour.audioGuideScript = `¡Tour Exprés activado! Si tienes 15 minutos en ${place}, concéntrate en estos 3 elementos clave: 1) La perspectiva de la fachada principal, 2) Los detalles de los altares sagrados, y 3) El rincón de paz interior. ¡Vamos directo a lo más emblemático!`;
      break;
    }

    case 'fotografia': {
      tour.durationMinutes = 25;
      tour.tagline = `📸 Enfoque Fotográfico: Los mejores ángulos, reflejos, luz dorada y trucos de encuadre en ${place}.`;
      tour.audioGuideScript = `¡Prepara tu cámara o smartphone! ${place} ofrece contrastes visuales espectaculares: el rojo bermellón de la madera lacada, el verde esmeralda de la vegetación tropical y la luz cálida del amanecer y atardecer de ${city}.\n\nEn este recorrido te guiaremos exactamente a los puntos donde la simetría, los reflejos en el agua y los marcos naturales creados por los aleros curvos convertirán tus fotos en recuerdos memorables.`;
      
      tour.stops = tour.stops.map((stop, idx) => ({
        ...stop,
        whatToLookAt: `📸 Encuadre clave: ${stop.whatToLookAt}`,
        insiderTip: `💡 Truco de foto: ${stop.insiderTip || 'Baja un poco la altura del móvil para capturar el tejado y el cielo en contrapicado.'}`,
      }));
      break;
    }

    case 'gastronomia': {
      tour.durationMinutes = 35;
      tour.tagline = `🍜 Enfoque Vida Local & Sabores: Rituales de té, ofrendas de frutas y la mejor comida alrededor de ${place}.`;
      tour.audioGuideScript = `¡Hola! Ninguna visita a ${place} está completa sin sumergirse en los aromas y la vida cotidiana que lo rodea en ${city}.\n\nEn la cultura vietnamita, la devoción en los templos y la vida gastronómica en los taburetes bajos de la acera van de la mano. Alrededor de este monumento se respira el aroma a jazmín fresco, café tostado y caldos humeantes. Te contaremos qué ofrendas culinarias se realizan aquí y cuál es el bocado tradicional que debes probar en la esquina al terminar.`;
      
      tour.stops = tour.stops.map((stop) => ({
        ...stop,
        insiderTip: `🍜 Vida local: ${stop.insiderTip || 'Fíjate en las bandejas con 5 frutas impares en los altares, símbolo de prosperidad.'}`,
      }));
      break;
    }
  }

  return tour;
}
