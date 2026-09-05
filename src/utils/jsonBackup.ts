/**
 * Festa do Avante! 2025 - JSON Backup & Restore Engine
 * File: src/utils/jsonBackup.ts
 *
 * Produces structured, validated JSON backup files (minha-agenda-avante.json)
 * and handles safe browser downloads with memory leak prevention.
 */

import type { FestivalEvent } from '../types/program';

export const JSON_BACKUP_FILENAME = 'minha-agenda-avante.json';
export const APP_IDENTIFIER = 'AvanteRouter';
export const SCHEMA_VERSION = 1;

export interface FestivalEventSummary {
  id: string;
  title: string;
  stage: string;
  day: string;
  date: string;
  startTime: string;
  endTime: string;
  category: string;
}

export interface ScheduleJsonBackup {
  app: string;
  version: number;
  exportedAt: string;
  favorites: string[];
  seen: string[];
  events?: FestivalEventSummary[];
}

/**
 * Maps a full FestivalEvent to an export summary.
 */
export function summarizeEvent(ev: FestivalEvent): FestivalEventSummary {
  return {
    id: ev.id,
    title: ev.title,
    stage: ev.stage,
    day: ev.day,
    date: ev.date || (ev.day === 'sexta' ? '2025-09-05' : ev.day === 'sabado' ? '2025-09-06' : '2025-09-07'),
    startTime: ev.startTime || ev.timeStart || '',
    endTime: ev.endTime || ev.timeEnd || '',
    category: ev.category,
  };
}

/**
 * Creates the complete JSON backup object preserving user favorites order.
 */
export function createJsonBackup(
  favorites: string[],
  seen: string[],
  allEvents?: FestivalEvent[]
): ScheduleJsonBackup {
  // Preserve exact user order for favorites while deduplicating
  const cleanFavorites: string[] = [];
  const seenFavSet = new Set<string>();
  for (const id of favorites) {
    if (typeof id === 'string' && id.trim() && !seenFavSet.has(id)) {
      cleanFavorites.push(id);
      seenFavSet.add(id);
    }
  }

  // Deduplicate seen
  const cleanSeen = Array.from(
    new Set((seen || []).filter((id) => typeof id === 'string' && id.trim().length > 0))
  );

  // Map event summaries if event dataset is provided
  let eventSummaries: FestivalEventSummary[] | undefined;
  if (allEvents && allEvents.length > 0) {
    const eventMap = new Map(allEvents.map((e) => [e.id, e]));
    eventSummaries = cleanFavorites
      .map((id) => eventMap.get(id))
      .filter((e): e is FestivalEvent => !!e)
      .map(summarizeEvent);
  }

  return {
    app: APP_IDENTIFIER,
    version: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    favorites: cleanFavorites,
    seen: cleanSeen,
    ...(eventSummaries && eventSummaries.length > 0 ? { events: eventSummaries } : {}),
  };
}

/**
 * Validates whether an incoming object conforms to the JSON backup schema.
 */
export function validateJsonBackup(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Backup payload must be a non-null object'] };
  }

  const obj = data as Record<string, unknown>;

  if (!Array.isArray(obj.favorites)) {
    errors.push('favorites must be an array of event IDs');
  } else if (!obj.favorites.every((id) => typeof id === 'string')) {
    errors.push('all favorites entries must be strings');
  }

  if (obj.seen !== undefined) {
    if (!Array.isArray(obj.seen)) {
      errors.push('seen must be an array of event IDs');
    } else if (!obj.seen.every((id) => typeof id === 'string')) {
      errors.push('all seen entries must be strings');
    }
  }

  if (obj.exportedAt && typeof obj.exportedAt === 'string') {
    if (isNaN(Date.parse(obj.exportedAt))) {
      errors.push('exportedAt must be a valid ISO 8601 date string');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Triggers a browser download of the generated JSON backup file.
 * Automatically revokes the Object URL after download click.
 */
export function downloadJsonBackup(
  backupData: ScheduleJsonBackup,
  filename = JSON_BACKUP_FILENAME
): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }
  const jsonStr = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
