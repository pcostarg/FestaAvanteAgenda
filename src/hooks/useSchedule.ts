/**
 * Festa do Avante! 2025 - Reactive Schedule Hook
 * File: src/hooks/useSchedule.ts
 *
 * Provides reactive access to the user schedule stored in localStorage,
 * with tear-free state synchronization across components and browser tabs.
 */

import { useSyncExternalStore, useMemo, useCallback } from 'react';
import { ScheduleStore } from '../utils/scheduleStorage';
import { detectScheduleConflicts, normalizeDayKey } from '../utils/conflictDetector';
import type { FestivalEvent } from '../types/program';
import type { UseScheduleReturn, ConflictResolutionAction, ConflictReport } from '../types/schedule';

export function useSchedule(): UseScheduleReturn {
  const store = ScheduleStore.getInstance();
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  const favoriteSet = useMemo(() => new Set(state.favorites), [state.favorites]);
  const seenSet = useMemo(() => new Set(state.seen), [state.seen]);

  const toggleFavorite = useCallback((id: string) => store.toggleFavorite(id), [store]);
  const toggleSeen = useCallback((id: string) => store.toggleSeen(id), [store]);
  const replaceSchedule = useCallback(
    (data: { favorites?: string[]; seen?: string[] }) => store.replaceSchedule(data),
    [store]
  );
  const clearSchedule = useCallback(() => store.clearSchedule(), [store]);
  const resolveConflict = useCallback(
    (action: ConflictResolutionAction, eventAId: string, eventBId: string) =>
      store.resolveConflict(action, eventAId, eventBId),
    [store]
  );

  const isFavorite = useCallback((id: string): boolean => favoriteSet.has(id), [favoriteSet]);
  const isSeen = useCallback((id: string): boolean => seenSet.has(id), [seenSet]);

  const getConflictsForDay = useCallback(
    (dayDateOrSlug: string, allEvents: FestivalEvent[]): ConflictReport => {
      const normalizedTarget = normalizeDayKey(dayDateOrSlug);
      const savedEventsOnDay = allEvents.filter((ev) => {
        const matchesDay = normalizeDayKey(ev.day || ev.date || ev.dayCode || '') === normalizedTarget;
        return matchesDay && favoriteSet.has(ev.id);
      });
      return detectScheduleConflicts(savedEventsOnDay);
    },
    [favoriteSet]
  );

  const hasConflict = useCallback(
    (id: string, dayDateOrSlug: string, allEvents: FestivalEvent[]): boolean => {
      if (!favoriteSet.has(id)) return false;
      const report = getConflictsForDay(dayDateOrSlug, allEvents);
      return report.conflictIds.has(id);
    },
    [favoriteSet, getConflictsForDay]
  );

  const unseenSavedCount = useMemo(() => {
    return state.favorites.filter((id) => !seenSet.has(id)).length;
  }, [state.favorites, seenSet]);

  return {
    favorites: state.favorites,
    seen: state.seen,
    savedCount: state.favorites.length,
    unseenSavedCount,
    updatedAt: state.updatedAt,
    toggleFavorite,
    toggleSeen,
    isFavorite,
    isSeen,
    replaceSchedule,
    clearSchedule,
    resolveConflict,
    getConflictsForDay,
    hasConflict,
  };
}
