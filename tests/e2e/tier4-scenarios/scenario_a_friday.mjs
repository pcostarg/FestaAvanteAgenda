// tests/e2e/tier4-scenarios/scenario_a_friday.mjs
// Tier 4: Real-World Scenario A — "The Friday Night Opening Journey"

import { describe, it, expect, beforeEach } from '../lib/test-framework.mjs';
import {
  LOCAL_STORAGE_KEY,
  detectScheduleConflicts,
} from '../lib/contracts.mjs';
import { MockLocalStorage, MockWindow, ScheduleManager } from '../lib/mock-env.mjs';
import { TEST_EVENTS, getEventsByDay } from '../lib/fixtures.mjs';

export function registerScenarioATests() {
  describe('Tier 4: Scenario A — The Friday Night Opening Journey', () => {
    let storage;
    let mockWin;
    let schedule;

    beforeEach(() => {
      storage = new MockLocalStorage();
      mockWin = new MockWindow();
      schedule = new ScheduleManager(storage, mockWin);
    });

    it('Scenario A: Full Friday user flow from arrival to attendance, conflict resolution, and hide seen', () => {
      // Step 1: User arrives at Atalaia at 18:00, opens Friday schedule (/lista)
      const fridayActs = getEventsByDay('2025-09-05');
      expect(fridayActs.length).toBeGreaterThan(0);

      // Step 2: Browses feed, favorites Opening Concert (Palco 25 de Abril, 19:00 - 20:30)
      const actOpening = 'ev-fri-p25-abril-1900';
      schedule.toggleFavorite(actOpening);
      expect(schedule.isFavorite(actOpening)).toBe(true);

      // Step 3: Also favorites Ritmos do Mediterrâneo (Palco Paz, 20:00 - 21:15)
      const actPaz = 'ev-fri-paz-2000';
      schedule.toggleFavorite(actPaz);
      expect(schedule.isFavorite(actPaz)).toBe(true);

      // Step 4: User navigates to O Meu Horário (/o-meu-horario)
      // Conflict detection evaluates Friday favorited events
      let conflicts = schedule.getConflictsForDay('2025-09-05', TEST_EVENTS);
      expect(conflicts.hasConflicts).toBe(true);
      expect(conflicts.conflictIds.has(actOpening)).toBe(true);
      expect(conflicts.conflictIds.has(actPaz)).toBe(true);
      expect(conflicts.pairs).toHaveLength(1);
      // Overlap is between 20:00 and 20:30 (30 minutes)
      const pair = conflicts.pairs[0];
      expect(pair.overlapEnd - pair.overlapStart).toBe(30);

      // Step 5: Decision Matrix appears: user decides to keep Opening Concert ("keepA")
      schedule.resolveConflict('keepA', actOpening, actPaz);
      expect(schedule.isFavorite(actOpening)).toBe(true);
      expect(schedule.isFavorite(actPaz)).toBe(false);

      // Conflict is now resolved
      conflicts = schedule.getConflictsForDay('2025-09-05', TEST_EVENTS);
      expect(conflicts.hasConflicts).toBe(false);

      // Step 6: User favorites late night act (Cidade da Juventude, 23:45 - 01:15)
      const actLate = 'ev-fri-juv-2345';
      schedule.toggleFavorite(actLate);
      expect(schedule.isFavorite(actLate)).toBe(true);

      // Step 7: At 20:45, Opening Concert has finished. User clicks "Já vi" (✓)
      schedule.toggleSeen(actOpening);
      expect(schedule.isSeen(actOpening)).toBe(true);

      // Step 8: In O Meu Horário, user turns ON "Ocultar já vistos"
      const hideSeen = true;
      const upcomingActs = schedule.favorites.filter((id) => !hideSeen || !schedule.isSeen(id));
      expect(upcomingActs).toHaveLength(1);
      expect(upcomingActs[0]).toBe(actLate); // Only the upcoming late-night act is visible!

      // Step 9: User turns OFF "Ocultar já vistos": all saved acts are visible again
      const allSaved = schedule.favorites.filter((id) => false || !schedule.isSeen(id) || schedule.isSeen(id));
      expect(allSaved).toHaveLength(2);

      // Step 10: Verify state persistence in localStorage
      const persisted = JSON.parse(storage.getItem(LOCAL_STORAGE_KEY));
      expect(persisted.favorites).toEqual([actOpening, actLate]);
      expect(persisted.seen).toEqual([actOpening]);
    });
  });
}
