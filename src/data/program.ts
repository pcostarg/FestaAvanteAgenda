/**
 * Festa do Avante! 2025 - Festival Program Dataset & Lookup Engine
 * File: src/data/program.ts
 *
 * Strongly typed export of the complete 2025 festival schedule (253 events),
 * pre-indexed lookup maps, and query helper functions.
 */

import rawEvents from './program.json';
import type {
  FestivalEvent,
  FestivalDay,
  FestivalStage,
  EventCategory,
  TimeBlock,
  FestivalDayMeta,
  FestivalMeta,
  DayLabel,
} from '../types/program';
import { PRIMARY_STAGES, CATEGORIES } from '../types/program';

/**
 * The authoritative array of all 253 festival events, typed as FestivalEvent[].
 */
export const FESTIVAL_EVENTS: FestivalEvent[] = rawEvents as unknown as FestivalEvent[];

/**
 * Fast O(1) lookup map of events by their unique ID.
 */
export const EVENTS_BY_ID: Map<string, FestivalEvent> = new Map(
  FESTIVAL_EVENTS.map((event) => [event.id, event])
);

/**
 * Events pre-grouped by festival day ('sexta' | 'sabado' | 'domingo').
 */
export const EVENTS_BY_DAY: Record<FestivalDay, FestivalEvent[]> = {
  sexta: FESTIVAL_EVENTS.filter((e) => e.day === 'sexta'),
  sabado: FESTIVAL_EVENTS.filter((e) => e.day === 'sabado'),
  domingo: FESTIVAL_EVENTS.filter((e) => e.day === 'domingo'),
};

/**
 * Events pre-grouped by canonical event category.
 */
export const EVENTS_BY_CATEGORY: Record<EventCategory, FestivalEvent[]> = {
  Música: FESTIVAL_EVENTS.filter((e) => e.category === 'Música'),
  Debates: FESTIVAL_EVENTS.filter((e) => e.category === 'Debates'),
  Teatro: FESTIVAL_EVENTS.filter((e) => e.category === 'Teatro'),
  Cinema: FESTIVAL_EVENTS.filter((e) => e.category === 'Cinema'),
  'Família/Criança': FESTIVAL_EVENTS.filter((e) => e.category === 'Família/Criança'),
  Desporto: FESTIVAL_EVENTS.filter((e) => e.category === 'Desporto'),
};

/**
 * Events pre-grouped by time block ('manha' | 'tarde' | 'anoitecer' | 'noite-principal').
 */
export const EVENTS_BY_TIME_BLOCK: Record<TimeBlock, FestivalEvent[]> = {
  manha: FESTIVAL_EVENTS.filter((e) => e.timeBlock === 'manha'),
  tarde: FESTIVAL_EVENTS.filter((e) => e.timeBlock === 'tarde'),
  anoitecer: FESTIVAL_EVENTS.filter((e) => e.timeBlock === 'anoitecer'),
  'noite-principal': FESTIVAL_EVENTS.filter((e) => e.timeBlock === 'noite-principal'),
};

/**
 * Events pre-grouped by stage name.
 */
export const EVENTS_BY_STAGE: Record<string, FestivalEvent[]> = FESTIVAL_EVENTS.reduce(
  (acc, event) => {
    const stageKey = event.stage;
    if (!acc[stageKey]) {
      acc[stageKey] = [];
    }
    acc[stageKey]!.push(event);
    return acc;
  },
  {} as Record<string, FestivalEvent[]>
);

/**
 * Festival Metadata envelope
 */
const is2026 = FESTIVAL_EVENTS.some((e) => e.date?.startsWith('2026'));

export const FESTIVAL_META: FestivalMeta = {
  name: is2026 ? 'Festa do Avante! 2026' : 'Festa do Avante! 2025',
  year: is2026 ? 2026 : 2025,
  dates: is2026 ? ['2026-09-04', '2026-09-05', '2026-09-06'] : ['2025-09-05', '2025-09-06', '2025-09-07'],
  location: 'Quinta da Atalaia, Amora, Seixal, Portugal',
  coordinates: {
    lat: 38.6258,
    lng: -9.1178,
  },
};

/**
 * Festival Days Metadata with operational hours
 */
export const FESTIVAL_DAYS_META: readonly FestivalDayMeta[] = [
  {
    day: 'sexta',
    code: 'fri',
    date: is2026 ? '2026-09-04' : '2025-09-05',
    label: (is2026 ? 'Sexta 4' : 'Sexta 5') as DayLabel,
    shortLabel: is2026 ? 'Sexta, 4 Set' : 'Sexta, 5 Set',
    operatingHours: '18:00 – 02:00',
  },
  {
    day: 'sabado',
    code: 'sat',
    date: is2026 ? '2026-09-05' : '2025-09-06',
    label: (is2026 ? 'Sábado 5' : 'Sábado 6') as DayLabel,
    shortLabel: is2026 ? 'Sábado, 5 Set' : 'Sábado, 6 Set',
    operatingHours: '10:00 – 02:00',
  },
  {
    day: 'domingo',
    code: 'sun',
    date: is2026 ? '2026-09-06' : '2025-09-07',
    label: (is2026 ? 'Domingo 6' : 'Domingo 7') as DayLabel,
    shortLabel: is2026 ? 'Domingo, 6 Set' : 'Domingo, 7 Set',
    operatingHours: '10:00 – 23:00',
  },
];

// Re-export constants for easy access
export { PRIMARY_STAGES, CATEGORIES };

/**
 * Retrieves an event by its unique ID.
 */
export function getEventById(id: string): FestivalEvent | undefined {
  return EVENTS_BY_ID.get(id);
}

/**
 * Retrieves all events scheduled for a specific festival day.
 */
export function getEventsByDay(day: FestivalDay): FestivalEvent[] {
  return EVENTS_BY_DAY[day] || [];
}

/**
 * Retrieves all events taking place on a specific stage.
 */
export function getEventsByStage(stage: FestivalStage | string): FestivalEvent[] {
  return EVENTS_BY_STAGE[stage] || [];
}

/**
 * Retrieves all events belonging to a specific category.
 */
export function getEventsByCategory(category: EventCategory | string): FestivalEvent[] {
  return (EVENTS_BY_CATEGORY as Record<string, FestivalEvent[]>)[category] || [];
}

/**
 * Retrieves headline / featured events (main stages in evening/night).
 */
export function getHeadlineEvents(): FestivalEvent[] {
  return FESTIVAL_EVENTS.filter((e) => e.highlight === true);
}

/**
 * Default export: the complete festival events array.
 */
export default FESTIVAL_EVENTS;
