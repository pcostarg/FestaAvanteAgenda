/**
 * Festa do Avante! 2025 - Schedule & Conflict Types
 * File: src/types/schedule.ts
 *
 * Core data contracts for user schedule persistence, "Já vi" tracking,
 * and conflict detection & resolution.
 */

import type { FestivalEvent } from './program';

export interface UserScheduleStorage {
  /** Array of unique favorited festival event IDs */
  favorites: string[];
  /** Array of unique seen/attended festival event IDs */
  seen: string[];
  /** Milliseconds Unix epoch timestamp of last mutation */
  updatedAt: number;
}

export interface ScheduleImportPayload {
  favorites?: string[];
  seen?: string[];
  app?: string;
  version?: number;
  updatedAt?: number;
  exportedAt?: string;
}

export interface ConflictPair {
  eventA: FestivalEvent;
  eventB: FestivalEvent;
  overlapStart: number; // festival minutes
  overlapEnd: number;   // festival minutes
  overlapMinutes: number; // duration in minutes
  formattedOverlap: string; // e.g. "21:00 – 22:15 (75 min)"
}

export interface ConflictReport {
  hasConflicts: boolean;
  conflictIds: Set<string>;
  conflictCount: number;
  pairs: ConflictPair[];
  conflictsByEventId: Map<string, ConflictPair[]>;
}

export type ConflictResolutionAction = 'keepA' | 'keepB' | 'split';

export interface UseScheduleReturn {
  /** Array of favorited event IDs */
  favorites: string[];
  /** Array of seen/attended event IDs */
  seen: string[];
  /** Total count of favorited events */
  savedCount: number;
  /** Count of favorited events not yet marked as seen */
  unseenSavedCount: number;
  /** Timestamp of last update */
  updatedAt: number;
  /** Toggles an event in or out of favorites */
  toggleFavorite: (id: string) => void;
  /** Toggles an event in or out of seen */
  toggleSeen: (id: string) => void;
  /** Fast O(1) check if an event is in favorites */
  isFavorite: (id: string) => boolean;
  /** Fast O(1) check if an event is in seen */
  isSeen: (id: string) => boolean;
  /** Replaces local schedule with incoming data (Silent Direct Overwrite) */
  replaceSchedule: (data: { favorites?: string[]; seen?: string[] }) => void;
  /** Clears all favorites and seen records */
  clearSchedule: () => void;
  /** Resolves conflict according to 3-way matrix ('keepA' | 'keepB' | 'split') */
  resolveConflict: (action: ConflictResolutionAction, eventAId: string, eventBId: string) => void;
  /** Computes schedule conflicts for a specific festival day among favorited events */
  getConflictsForDay: (dayDateOrSlug: string, allEvents: FestivalEvent[]) => ConflictReport;
  /** Evaluates whether a specific event currently conflicts with another favorited event on that day */
  hasConflict: (id: string, dayDateOrSlug: string, allEvents: FestivalEvent[]) => boolean;
}
