/**
 * Festa do Avante! 2025 - Conflict Detection Engine
 * File: src/utils/conflictDetector.ts
 *
 * Algorithmic engine that normalizes nocturnal operating hours crossing midnight
 * into continuous festival minutes, determines pairwise overlaps, and manages
 * conflict resolution decisions.
 */

import type { FestivalEvent, FestivalDay } from '../types/program';
import type { ConflictPair, ConflictReport, ConflictResolutionAction } from '../types/schedule';

/**
 * Converts HH:mm string to continuous festival minutes.
 * Operating hours extend past midnight up to 05:59, mapped as hour + 24.
 * e.g., 10:00 -> 600, 23:59 -> 1439, 00:00 -> 1440, 00:30 -> 1470, 02:00 -> 1560.
 */
export function timeToFestivalMinutes(timeStr: string): number {
  if (!timeStr || typeof timeStr !== 'string') {
    throw new Error(`Invalid time string: ${timeStr}`);
  }
  const match = timeStr.trim().match(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/);
  if (!match) {
    throw new Error(`Time string does not match HH:mm pattern: ${timeStr}`);
  }
  const hStr = match[1];
  const mStr = match[2];
  if (hStr === undefined || mStr === undefined) {
    throw new Error(`Time string does not match HH:mm pattern: ${timeStr}`);
  }
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const adjustedHour = h < 6 ? h + 24 : h;
  return adjustedHour * 60 + m;
}

/**
 * Converts continuous festival minutes back to 24h HH:mm string.
 */
export function festivalMinutesToTime(minutes: number): string {
  const totalHours = Math.floor(minutes / 60);
  const m = minutes % 60;
  const h = totalHours >= 24 ? totalHours - 24 : totalHours;
  const hhStr = String(h).padStart(2, '0');
  const mmStr = String(m).padStart(2, '0');
  return `${hhStr}:${mmStr}`;
}

/**
 * Normalizes day identifiers ('sexta', '2025-09-05', 'fri') to canonical FestivalDay.
 */
export function normalizeDayKey(day: string): FestivalDay {
  const d = (day || '').toLowerCase().trim();
  if (d === 'sexta' || d === '2025-09-05' || d === 'fri') return 'sexta';
  if (d === 'sabado' || d === '2025-09-06' || d === 'sat') return 'sabado';
  if (d === 'domingo' || d === '2025-09-07' || d === 'sun') return 'domingo';
  return 'sexta';
}

/**
 * Checks if two events take place on the same festival day.
 */
export function areEventsOnSameDay(eventA: Partial<FestivalEvent>, eventB: Partial<FestivalEvent>): boolean {
  const dayA = eventA.day || eventA.date || eventA.dayCode || '';
  const dayB = eventB.day || eventB.date || eventB.dayCode || '';
  if (!dayA || !dayB) return false;
  return normalizeDayKey(dayA) === normalizeDayKey(dayB);
}

/**
 * Extracts start and end festival minutes for an event, supporting canonical and alias fields.
 */
export function getEventFestivalMinutes(event: Partial<FestivalEvent>): { startMinutes: number; endMinutes: number } {
  const startStr = event.startTime || event.timeStart;
  const endStr = event.endTime || event.timeEnd;
  if (!startStr || !endStr) {
    throw new Error(`Event ${event.id || 'unknown'} is missing time information`);
  }
  return {
    startMinutes: timeToFestivalMinutes(startStr),
    endMinutes: timeToFestivalMinutes(endStr),
  };
}

/**
 * Evaluates whether two events overlap in time on the same festival day.
 * Rule: startA < endB && startB < endA (strictly non-overlapping when endA === startB)
 */
export function doEventsOverlap(eventA: Partial<FestivalEvent>, eventB: Partial<FestivalEvent>): boolean {
  if (!areEventsOnSameDay(eventA, eventB)) return false;
  if (eventA.id && eventB.id && eventA.id === eventB.id) return false;

  const startStrA = eventA.startTime || eventA.timeStart;
  const endStrA = eventA.endTime || eventA.timeEnd;
  const startStrB = eventB.startTime || eventB.timeStart;
  const endStrB = eventB.endTime || eventB.timeEnd;

  if (!startStrA || !endStrA || !startStrB || !endStrB) return false;

  const startA = timeToFestivalMinutes(startStrA);
  const endA = timeToFestivalMinutes(endStrA);
  const startB = timeToFestivalMinutes(startStrB);
  const endB = timeToFestivalMinutes(endStrB);

  return startA < endB && startB < endA;
}

/**
 * Detects all pairwise conflicts among a given list of events.
 */
export function detectScheduleConflicts(events: FestivalEvent[]): ConflictReport {
  const conflictIds = new Set<string>();
  const pairs: ConflictPair[] = [];
  const conflictsByEventId = new Map<string, ConflictPair[]>();

  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const evA = events[i];
      const evB = events[j];
      if (!evA || !evB) continue;

      if (doEventsOverlap(evA, evB)) {
        conflictIds.add(evA.id);
        conflictIds.add(evB.id);

        const { startMinutes: sA, endMinutes: eA } = getEventFestivalMinutes(evA);
        const { startMinutes: sB, endMinutes: eB } = getEventFestivalMinutes(evB);

        const overlapStart = Math.max(sA, sB);
        const overlapEnd = Math.min(eA, eB);
        const overlapMinutes = Math.max(0, overlapEnd - overlapStart);
        const formattedOverlap = `${festivalMinutesToTime(overlapStart)} – ${festivalMinutesToTime(overlapEnd)} (${overlapMinutes} min)`;

        const pair: ConflictPair = {
          eventA: evA,
          eventB: evB,
          overlapStart,
          overlapEnd,
          overlapMinutes,
          formattedOverlap,
        };

        pairs.push(pair);

        if (!conflictsByEventId.has(evA.id)) {
          conflictsByEventId.set(evA.id, []);
        }
        conflictsByEventId.get(evA.id)!.push(pair);

        if (!conflictsByEventId.has(evB.id)) {
          conflictsByEventId.set(evB.id, []);
        }
        conflictsByEventId.get(evB.id)!.push(pair);
      }
    }
  }

  return {
    hasConflicts: conflictIds.size > 0,
    conflictIds,
    conflictCount: conflictIds.size,
    pairs,
    conflictsByEventId,
  };
}

/**
 * Pure helper for conflict resolution decisions.
 */
export function resolveConflictHelper(
  action: ConflictResolutionAction,
  eventAId: string,
  eventBId: string,
  currentFavorites: string[]
): string[] {
  if (action === 'keepA') {
    return currentFavorites.filter((id) => id !== eventBId);
  }
  if (action === 'keepB') {
    return currentFavorites.filter((id) => id !== eventAId);
  }
  return [...currentFavorites];
}
