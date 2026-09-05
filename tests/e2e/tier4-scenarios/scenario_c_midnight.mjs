// tests/e2e/tier4-scenarios/scenario_c_midnight.mjs
// Tier 4: Real-World Scenario C — "Midnight Transition Marathon"

import { describe, it, expect, beforeEach } from '../lib/test-framework.mjs';
import {
  timeToFestivalMinutes,
  festivalMinutesToTime,
  detectScheduleConflicts,
  generateIcsCalendar,
  validateIcsCalendar,
} from '../lib/contracts.mjs';
import { MockLocalStorage, MockWindow, ScheduleManager } from '../lib/mock-env.mjs';
import { TEST_EVENTS } from '../lib/fixtures.mjs';

export function registerScenarioCTests() {
  describe('Tier 4: Scenario C — Midnight Transition Marathon', () => {
    let storage;
    let mockWin;
    let schedule;

    beforeEach(() => {
      storage = new MockLocalStorage();
      mockWin = new MockWindow();
      schedule = new ScheduleManager(storage, mockWin);
    });

    it('Scenario C: Late-night Saturday program crossing midnight into Sunday dawn', () => {
      // Step 1: User saves two late-night acts crossing midnight
      // Act 1: Peça no Avanteatro (23:30 - 00:45)
      const teatroAct = TEST_EVENTS.find((e) => e.id === 'ev-sat-teatro-2330');
      // Act 2: Curtas de Intervenção no CineAvante! (00:00 - 01:30)
      const cineAct = TEST_EVENTS.find((e) => e.id === 'ev-sat-cine-0000');

      schedule.toggleFavorite(teatroAct.id);
      schedule.toggleFavorite(cineAct.id);

      // Step 2: Verify continuous timeline minutes mapping
      const mTeatroStart = timeToFestivalMinutes(teatroAct.timeStart); // 23:30 -> 1410
      const mTeatroEnd = timeToFestivalMinutes(teatroAct.timeEnd);     // 00:45 -> 1485
      const mCineStart = timeToFestivalMinutes(cineAct.timeStart);     // 00:00 -> 1440
      const mCineEnd = timeToFestivalMinutes(cineAct.timeEnd);         // 01:30 -> 1530

      expect(mTeatroStart).toBe(1410);
      expect(mTeatroEnd).toBe(1485);
      expect(mCineStart).toBe(1440);
      expect(mCineEnd).toBe(1530);

      // Step 3: Verify AGORA needle moves continuously across midnight
      const timesAcrossMidnight = ['23:50', '23:59', '00:00', '00:15', '01:00'];
      const needleMinutes = timesAcrossMidnight.map(timeToFestivalMinutes);

      for (let i = 0; i < needleMinutes.length - 1; i++) {
        expect(needleMinutes[i + 1]).toBeGreaterThan(needleMinutes[i]);
      }

      // Step 4: Evaluate conflict detection across midnight
      const conflicts = schedule.getConflictsForDay('2025-09-06', TEST_EVENTS);
      expect(conflicts.hasConflicts).toBe(true);
      expect(conflicts.conflictIds.has(teatroAct.id)).toBe(true);
      expect(conflicts.conflictIds.has(cineAct.id)).toBe(true);

      // Verify exact overlap duration: 00:00 to 00:45 = 45 minutes
      const pair = conflicts.pairs[0];
      const overlapSpan = pair.overlapEnd - pair.overlapStart;
      expect(overlapSpan).toBe(45);
      expect(festivalMinutesToTime(pair.overlapStart)).toBe('00:00');
      expect(festivalMinutesToTime(pair.overlapEnd)).toBe('00:45');

      // Step 5: Export ICS calendar and verify Sunday morning date rollover
      const ics = generateIcsCalendar([teatroAct, cineAct]);
      expect(validateIcsCalendar(ics).valid).toBe(true);

      // Teatro starts on Saturday 2025-09-06, ends Sunday 2025-09-07
      expect(ics).toContain('DTSTART:20250906T233000Z');
      expect(ics).toContain('DTEND:20250907T004500Z');

      // Cine starts on Sunday 2025-09-07 (00:00), ends Sunday 2025-09-07 (01:30)
      expect(ics).toContain('DTSTART:20250907T000000Z');
      expect(ics).toContain('DTEND:20250907T013000Z');
    });
  });
}
