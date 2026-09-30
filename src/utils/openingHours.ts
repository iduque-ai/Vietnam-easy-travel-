/**
 * Opening Hours and Real-Time Status Utility for Vietnam Restaurants (UTC+7 / Indochina Time)
 */

export interface RestaurantOpenStatus {
  isOpen: boolean;
  statusText: string;
  nextOpenTime?: string;
  closeTime?: string;
  is24h?: boolean;
}

/**
 * Get the current time in Vietnam (Asia/Ho_Chi_Minh timezone, UTC+7)
 */
export function getVietnamCurrentTime(): {
  hours: number;
  minutes: number;
  dayOfWeek: number;
  totalMinutes: number;
  timeString: string;
} {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });
    const parts = formatter.formatToParts(now);
    let hours = 12;
    let minutes = 0;
    for (const part of parts) {
      if (part.type === 'hour') hours = parseInt(part.value, 10);
      if (part.type === 'minute') minutes = parseInt(part.value, 10);
    }
    const totalMinutes = hours * 60 + minutes;
    const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    return { hours, minutes, dayOfWeek: now.getDay(), totalMinutes, timeString };
  } catch {
    const now = new Date();
    const utcHours = now.getUTCHours() + 7;
    const hours = (utcHours + 24) % 24;
    const minutes = now.getUTCMinutes();
    const totalMinutes = hours * 60 + minutes;
    const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    return { hours, minutes, dayOfWeek: now.getDay(), totalMinutes, timeString };
  }
}

/**
 * Determines whether a restaurant is currently open based on its openingHours string.
 */
export function checkRestaurantOpenStatus(openingHoursRaw?: string): RestaurantOpenStatus {
  if (!openingHoursRaw || !openingHoursRaw.trim()) {
    return { isOpen: true, statusText: 'Abierto ahora' };
  }

  const raw = openingHoursRaw.trim();
  const lower = raw.toLowerCase();

  // If explicit "Abierto ahora"
  if (lower.includes('abierto ahora')) {
    return { isOpen: true, statusText: 'Abierto ahora' };
  }

  // If explicit "24 horas" or "24/7"
  if (lower.includes('24 horas') || lower.includes('24/7') || lower.includes('00:00 - 24:00')) {
    return { isOpen: true, statusText: 'Abierto 24h', is24h: true };
  }

  // If explicit "cerrado" without open hours
  if (lower === 'cerrado' || lower === 'cerrado temporalmente') {
    return { isOpen: false, statusText: 'Cerrado' };
  }

  const { totalMinutes } = getVietnamCurrentTime();

  // Parse time intervals like "06:00 - 10:00 / 18:00 - 20:30" or "08:00 - 20:30" or "10:00 - 22:00"
  // Supports formats: "08:00 - 22:00", "8:00 - 22:00", "08:00 a 22:00", "08:00-22:00"
  const intervalRegex = /(\d{1,2}):(\d{2})\s*(?:-|a|to)\s*(\d{1,2}):(\d{2})/g;
  const intervals: { startMin: number; endMin: number; startStr: string; endStr: string }[] = [];

  let match: RegExpExecArray | null;
  while ((match = intervalRegex.exec(raw)) !== null) {
    const startH = parseInt(match[1], 10);
    const startM = parseInt(match[2], 10);
    const endH = parseInt(match[3], 10);
    const endM = parseInt(match[4], 10);

    intervals.push({
      startMin: startH * 60 + startM,
      endMin: endH * 60 + endM,
      startStr: `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`,
      endStr: `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`,
    });
  }

  // If no parseable intervals found, fallback to open
  if (intervals.length === 0) {
    if (lower.includes('cerrado')) {
      return { isOpen: false, statusText: raw };
    }
    return { isOpen: true, statusText: raw };
  }

  // Check if current time falls within any open interval
  for (const interval of intervals) {
    if (interval.endMin < interval.startMin) {
      // Overnights e.g. 18:00 - 02:00
      if (totalMinutes >= interval.startMin || totalMinutes <= interval.endMin) {
        return {
          isOpen: true,
          statusText: `Abierto · Cierra a las ${interval.endStr}`,
          closeTime: interval.endStr,
        };
      }
    } else {
      // Standard daytime interval e.g. 08:00 - 22:00
      if (totalMinutes >= interval.startMin && totalMinutes <= interval.endMin) {
        return {
          isOpen: true,
          statusText: `Abierto · Cierra a las ${interval.endStr}`,
          closeTime: interval.endStr,
        };
      }
    }
  }

  // If closed, find next opening time
  // Check upcoming interval today
  const upcomingToday = intervals.find((i) => i.startMin > totalMinutes);
  const nextOpen = upcomingToday ? upcomingToday.startStr : intervals[0].startStr;

  return {
    isOpen: false,
    statusText: `Cerrado • Abre a las ${nextOpen}`,
    nextOpenTime: nextOpen,
  };
}

/**
 * Formats a raw openingHours string into a complete, human-friendly schedule description in Spanish.
 * e.g., "06:00 - 10:00 / 18:00 - 20:30" => "Lunes a Domingo: 06:00 – 10:00 y 18:00 – 20:30"
 * e.g., "08:00 - 22:00" => "Lunes a Domingo: 08:00 – 22:00"
 * e.g., "24 horas" => "Lunes a Domingo: 24 horas"
 */
export function formatFullOpeningHours(openingHoursRaw?: string): string {
  if (!openingHoursRaw || !openingHoursRaw.trim()) {
    return 'Lunes a Domingo: 08:00 – 22:00';
  }
  const raw = openingHoursRaw.trim();
  const lower = raw.toLowerCase();

  if (lower.includes('24') || lower.includes('24/7') || lower.includes('00:00 - 24:00')) {
    return 'Lunes a Domingo: 24 horas';
  }

  if (raw.includes('/')) {
    const parts = raw.split('/').map((p) => p.trim());
    return `Lunes a Domingo: ${parts.join(' y ')}`;
  }

  const timeRangeMatch = raw.match(/(\d{1,2}:\d{2})\s*(?:-|a|to)\s*(\d{1,2}:\d{2})/);
  if (timeRangeMatch) {
    return `Lunes a Domingo: ${timeRangeMatch[1]} – ${timeRangeMatch[2]}`;
  }

  // If it was just generic text without numeric time intervals
  if (lower.includes('abierto') || lower.includes('cerrado')) {
    return 'Lunes a Domingo: 08:00 – 22:00';
  }

  return `Lunes a Domingo: ${raw}`;
}

