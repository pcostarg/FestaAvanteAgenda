// tests/e2e/tier3-pairwise/schedule_conflicts.mjs
// Tier 3: Pairwise Interactions between Schedule State, Conflicts, Resolution, and "Já Vi" Tracking

import { describe, it, expect, beforeEach } from '../lib/test-framework.mjs';
import {
  LOCAL_STORAGE_KEY,
  detectScheduleConflicts,
} from '../lib/contracts.mjs';
import { MockLocalStorage, MockWindow, ScheduleManager } from '../lib/mock-env.mjs';
import { TEST_EVENTS } from '../lib/fixtures.mjs';

export function registerScheduleConflictPairwiseTests() {
  describe('Tier 3: Pairwise Interactions — Schedule State & Conflicts', () => {
    let storage;
    let mockWin;
    let schedule;

    beforeEach(() => {
      storage = new MockLocalStorage();
      mockWin = new MockWindow();
      schedule = new ScheduleManager(storage, mockWin);
    });

    it('T3-PAIR-01: Favorites + "Já Vi": Favoriting a previously seen act preserves both flags', () => {
      const actId = 'ev-fri-p25-abril-1900';
      schedule.toggleSeen(actId);
      expect(schedule.isSeen(actId)).toBe(true);
      expect(schedule.isFavorite(actId)).toBe(false);

      schedule.toggleFavorite(actId);
      expect(schedule.isSeen(actId)).toBe(true);
      expect(schedule.isFavorite(actId)).toBe(true);
    });

    it('T3-PAIR-02: Favorites + Conflict Detection: Adding overlapping acts triggers conflict; removing one clears it', () => {
      const actA = 'ev-sat-p25-2100'; // 21:00 - 22:30
      const actB = 'ev-sat-paz-2100'; // 21:00 - 22:15

      schedule.toggleFavorite(actA);
      let conflicts = schedule.getConflictsForDay('2025-09-06', TEST_EVENTS);
      expect(conflicts.hasConflicts).toBe(false);

      schedule.toggleFavorite(actB);
      conflicts = schedule.getConflictsForDay('2025-09-06', TEST_EVENTS);
      expect(conflicts.hasConflicts).toBe(true);
      expect(conflicts.conflictIds.has(actA)).toBe(true);
      expect(conflicts.conflictIds.has(actB)).toBe(true);

      schedule.toggleFavorite(actA); // remove A
      conflicts = schedule.getConflictsForDay('2025-09-06', TEST_EVENTS);
      expect(conflicts.hasConflicts).toBe(false);
    });

    it('T3-PAIR-03: Conflict Detection + "Já Vi": Marking conflicting act as seen preserves conflict alert', () => {
      const actA = 'ev-sat-p25-2100';
      const actB = 'ev-sat-paz-2100';
      schedule.toggleFavorite(actA);
      schedule.toggleFavorite(actB);

      // User marks act A as seen
      schedule.toggleSeen(actA);
      expect(schedule.isSeen(actA)).toBe(true);

      // Conflict is temporal and continues to be reported
      const conflicts = schedule.getConflictsForDay('2025-09-06', TEST_EVENTS);
      expect(conflicts.hasConflicts).toBe(true);
      expect(conflicts.conflictIds.has(actA)).toBe(true);
      expect(conflicts.conflictIds.has(actB)).toBe(true);
    });

    it('T3-PAIR-04: Conflict Resolution Matrix + Storage: Decision "keepA" updates favorites and resolves conflict in storage', () => {
      const actA = 'ev-sat-p25-2100';
      const actB = 'ev-sat-paz-2100';
      schedule.toggleFavorite(actA);
      schedule.toggleFavorite(actB);

      schedule.resolveConflict('keepA', actA, actB);
      expect(schedule.favorites).toEqual([actA]);

      const stored = JSON.parse(storage.getItem(LOCAL_STORAGE_KEY));
      expect(stored.favorites).toEqual([actA]);

      const conflicts = schedule.getConflictsForDay('2025-09-06', TEST_EVENTS);
      expect(conflicts.hasConflicts).toBe(false);
    });

    it('T3-PAIR-05: "Ocultar Já Vistos" + Conflicts: Conflicting card remains tracked even when hidden', () => {
      const actA = 'ev-sat-p25-2100';
      const actB = 'ev-sat-paz-2100';
      schedule.toggleFavorite(actA);
      schedule.toggleFavorite(actB);
      schedule.toggleSeen(actA);

      const hideSeen = true;
      const visible = schedule.favorites.filter((id) => !hideSeen || !schedule.isSeen(id));
      expect(visible).toEqual([actB]);

      // Conflict engine checks full schedule
      const conflicts = schedule.getConflictsForDay('2025-09-06', TEST_EVENTS);
      expect(conflicts.hasConflicts).toBe(true);
    });

    it('T3-PAIR-06: "Ocultar Já Vistos" + Empty Schedule: When all favorited acts are seen and hidden, empty state is presented', () => {
      schedule.toggleFavorite('ev-fri-p25-abril-1900');
      schedule.toggleSeen('ev-fri-p25-abril-1900');

      const hideSeen = true;
      const visibleActs = schedule.favorites.filter((id) => !hideSeen || !schedule.isSeen(id));
      expect(visibleActs).toHaveLength(0);

      const showAllSeenNotice = schedule.favorites.length > 0 && visibleActs.length === 0;
      expect(showAllSeenNotice).toBe(true);
    });

    it('T3-PAIR-07: Multi-Day Independence: Saturday conflict does NOT affect Friday or Sunday schedules', () => {
      // Add Friday non-conflicting act
      schedule.toggleFavorite('ev-fri-p25-abril-1900');
      // Add Saturday conflicting acts
      schedule.toggleFavorite('ev-sat-p25-2100');
      schedule.toggleFavorite('ev-sat-paz-2100');

      const fridayConflicts = schedule.getConflictsForDay('2025-09-05', TEST_EVENTS);
      const saturdayConflicts = schedule.getConflictsForDay('2025-09-06', TEST_EVENTS);

      expect(fridayConflicts.hasConflicts).toBe(false);
      expect(saturdayConflicts.hasConflicts).toBe(true);
    });
  });
}
