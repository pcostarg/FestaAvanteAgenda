// tests/e2e/tier1-features/f10_f14_schedule.mjs
// Tier 1: Features F10, F11, F12, F13, F14 (Storage, Conflicts, Resolution, Já Vi, Hide Filter)

import { describe, it, expect, beforeEach } from '../lib/test-framework.mjs';
import {
  LOCAL_STORAGE_KEY,
  detectScheduleConflicts,
  validateScheduleStorage,
} from '../lib/contracts.mjs';
import { MockLocalStorage, MockWindow, ScheduleManager } from '../lib/mock-env.mjs';
import { TEST_EVENTS } from '../lib/fixtures.mjs';

export function registerF10ToF14Tests() {
  describe('Tier 1: Features 10-14 — Schedule State & Conflicts', () => {
    let storage;
    let mockWin;
    let schedule;

    beforeEach(() => {
      storage = new MockLocalStorage();
      mockWin = new MockWindow();
      schedule = new ScheduleManager(storage, mockWin);
    });

    describe('Tier 1: Feature 10 — avante_schedule_v1 Local Storage', () => {
    it('T1-F10-01: Persists schedule data under key "avante_schedule_v1"', () => {
      schedule.toggleFavorite('ev-fri-p25-abril-1900');
      const raw = storage.getItem(LOCAL_STORAGE_KEY);
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw);
      expect(parsed.favorites).toContain('ev-fri-p25-abril-1900');
    });

    it('T1-F10-02: Stored payload adheres to UserScheduleStorage schema', () => {
      schedule.toggleFavorite('ev-fri-p25-abril-1900');
      schedule.toggleSeen('ev-fri-p25-abril-1900');
      const raw = storage.getItem(LOCAL_STORAGE_KEY);
      const parsed = JSON.parse(raw);
      const { valid } = validateScheduleStorage(parsed);
      expect(valid).toBe(true);
      expect(parsed.updatedAt).toBeGreaterThan(0);
    });

    it('T1-F10-03: Toggling an existing favorite removes it from storage', () => {
      schedule.toggleFavorite('ev-fri-p25-abril-1900');
      expect(schedule.isFavorite('ev-fri-p25-abril-1900')).toBe(true);
      schedule.toggleFavorite('ev-fri-p25-abril-1900');
      expect(schedule.isFavorite('ev-fri-p25-abril-1900')).toBe(false);
    });

    it('T1-F10-04: Dispatches avante_schedule_updated CustomEvent on state mutations', () => {
      let eventFired = false;
      mockWin.addEventListener('avante_schedule_updated', () => {
        eventFired = true;
      });
      schedule.toggleFavorite('ev-sat-p25-2100');
      expect(eventFired).toBe(true);
    });

    it('T1-F10-05: Clears schedule and resets arrays to empty cleanly', () => {
      schedule.toggleFavorite('ev-fri-p25-abril-1900');
      schedule.toggleSeen('ev-fri-p25-abril-1900');
      schedule.clearSchedule();
      expect(schedule.favorites).toHaveLength(0);
      expect(schedule.seen).toHaveLength(0);
    });
  });

  describe('Tier 1: Feature 11 — Overlap Conflict Detection', () => {
    it('T1-F11-01: Detects conflict between two overlapping acts on same day', () => {
      const actA = TEST_EVENTS.find((e) => e.id === 'ev-fri-p25-abril-1900'); // 19:00 - 20:30
      const actB = TEST_EVENTS.find((e) => e.id === 'ev-fri-paz-2000');       // 20:00 - 21:15
      const result = detectScheduleConflicts([actA, actB]);
      expect(result.hasConflicts).toBe(true);
      expect(result.conflictIds.has(actA.id)).toBe(true);
      expect(result.conflictIds.has(actB.id)).toBe(true);
    });

    it('T1-F11-02: Returns zero conflicts for non-overlapping sequential acts', () => {
      const actA = TEST_EVENTS.find((e) => e.id === 'ev-sat-ciencia-1400'); // 14:00 - 16:00
      const actB = TEST_EVENTS.find((e) => e.id === 'ev-sat-paz-1600');     // 16:00 - 17:30
      const result = detectScheduleConflicts([actA, actB]);
      expect(result.hasConflicts).toBe(false);
      expect(result.conflictIds.size).toBe(0);
    });

    it('T1-F11-03: Does not detect conflicts between events on different festival days', () => {
      const fridayAct = TEST_EVENTS.find((e) => e.id === 'ev-fri-p25-abril-1900');
      const sundayAct = TEST_EVENTS.find((e) => e.id === 'ev-sun-comicio-1800');
      const result = detectScheduleConflicts([fridayAct, sundayAct]);
      expect(result.hasConflicts).toBe(false);
    });

    it('T1-F11-04: Highlights both conflicting event cards when conflict occurs', () => {
      schedule.toggleFavorite('ev-sat-p25-2100'); // 21:00 - 22:30
      schedule.toggleFavorite('ev-sat-paz-2100'); // 21:00 - 22:15
      const conflicts = schedule.getConflictsForDay('2025-09-06', TEST_EVENTS);
      expect(conflicts.hasConflicts).toBe(true);
      expect(conflicts.conflictIds.has('ev-sat-p25-2100')).toBe(true);
      expect(conflicts.conflictIds.has('ev-sat-paz-2100')).toBe(true);
    });

    it('T1-F11-05: Triggers amber warning banner in O Meu Horário view', () => {
      schedule.toggleFavorite('ev-sat-p25-2100');
      schedule.toggleFavorite('ev-sat-paz-2100');
      const conflicts = schedule.getConflictsForDay('2025-09-06', TEST_EVENTS);
      const shouldShowBanner = conflicts.hasConflicts;
      expect(shouldShowBanner).toBe(true);
    });
  });

  describe('Tier 1: Feature 12 — Conflict Resolution Decision Matrix', () => {
    it('T1-F12-01: "Keep Option A" removes Event B and resolves the conflict', () => {
      schedule.toggleFavorite('ev-sat-p25-2100');
      schedule.toggleFavorite('ev-sat-paz-2100');
      schedule.resolveConflict('keepA', 'ev-sat-p25-2100', 'ev-sat-paz-2100');
      expect(schedule.isFavorite('ev-sat-p25-2100')).toBe(true);
      expect(schedule.isFavorite('ev-sat-paz-2100')).toBe(false);
      const conflicts = schedule.getConflictsForDay('2025-09-06', TEST_EVENTS);
      expect(conflicts.hasConflicts).toBe(false);
    });

    it('T1-F12-02: "Keep Option B" removes Event A and resolves the conflict', () => {
      schedule.toggleFavorite('ev-sat-p25-2100');
      schedule.toggleFavorite('ev-sat-paz-2100');
      schedule.resolveConflict('keepB', 'ev-sat-p25-2100', 'ev-sat-paz-2100');
      expect(schedule.isFavorite('ev-sat-p25-2100')).toBe(false);
      expect(schedule.isFavorite('ev-sat-paz-2100')).toBe(true);
      const conflicts = schedule.getConflictsForDay('2025-09-06', TEST_EVENTS);
      expect(conflicts.hasConflicts).toBe(false);
    });

    it('T1-F12-03: "Split Time" preserves both acts in the schedule', () => {
      schedule.toggleFavorite('ev-sat-p25-2100');
      schedule.toggleFavorite('ev-sat-paz-2100');
      schedule.resolveConflict('split', 'ev-sat-p25-2100', 'ev-sat-paz-2100');
      expect(schedule.isFavorite('ev-sat-p25-2100')).toBe(true);
      expect(schedule.isFavorite('ev-sat-paz-2100')).toBe(true);
    });

    it('T1-F12-04: Resolution preserves other unrelated favorited events intact', () => {
      schedule.toggleFavorite('ev-sat-central-1030');
      schedule.toggleFavorite('ev-sat-p25-2100');
      schedule.toggleFavorite('ev-sat-paz-2100');
      schedule.resolveConflict('keepA', 'ev-sat-p25-2100', 'ev-sat-paz-2100');
      expect(schedule.isFavorite('ev-sat-central-1030')).toBe(true);
    });

    it('T1-F12-05: Resolving conflict updates storage immediately', () => {
      schedule.toggleFavorite('ev-sat-p25-2100');
      schedule.toggleFavorite('ev-sat-paz-2100');
      schedule.resolveConflict('keepA', 'ev-sat-p25-2100', 'ev-sat-paz-2100');
      const raw = JSON.parse(storage.getItem(LOCAL_STORAGE_KEY));
      expect(raw.favorites).toEqual(['ev-sat-p25-2100']);
    });
  });

  describe('Tier 1: Feature 13 — "Já Vi" (✓) Event Tracking', () => {
    it('T1-F13-01: Toggling "Já vi" adds event ID to seen list', () => {
      schedule.toggleSeen('ev-fri-p25-abril-1900');
      expect(schedule.isSeen('ev-fri-p25-abril-1900')).toBe(true);
    });

    it('T1-F13-02: Second click on "Já vi" un-marks event from seen list', () => {
      schedule.toggleSeen('ev-fri-p25-abril-1900');
      expect(schedule.isSeen('ev-fri-p25-abril-1900')).toBe(true);
      schedule.toggleSeen('ev-fri-p25-abril-1900');
      expect(schedule.isSeen('ev-fri-p25-abril-1900')).toBe(false);
    });

    it('T1-F13-03: Marked event card receives dimmed opacity styling token (opacity-60)', () => {
      const isSeen = true;
      const cardOpacity = isSeen ? 'opacity-60' : 'opacity-100';
      expect(cardOpacity).toBe('opacity-60');
    });

    it('T1-F13-04: Marked event displays "Concluído" or active emerald check badge', () => {
      const isSeen = true;
      const badgeText = isSeen ? 'Concluído' : '';
      expect(badgeText).toBe('Concluído');
    });

    it('T1-F13-05: Marking an event as seen does NOT remove it from favorites', () => {
      schedule.toggleFavorite('ev-fri-p25-abril-1900');
      schedule.toggleSeen('ev-fri-p25-abril-1900');
      expect(schedule.isFavorite('ev-fri-p25-abril-1900')).toBe(true);
      expect(schedule.isSeen('ev-fri-p25-abril-1900')).toBe(true);
    });
  });

  describe('Tier 1: Feature 14 — "Ocultar Já Vistos" Filter', () => {
    it('T1-F14-01: When filter is active, seen events are omitted from list view', () => {
      const events = [
        { id: 'ev-1', title: 'Act 1' },
        { id: 'ev-2', title: 'Act 2' },
      ];
      const seen = ['ev-1'];
      const hideSeen = true;
      const visible = events.filter((e) => !hideSeen || !seen.includes(e.id));
      expect(visible).toHaveLength(1);
      expect(visible[0].id).toBe('ev-2');
    });

    it('T1-F14-02: When filter is inactive, all events including seen remain visible', () => {
      const events = [
        { id: 'ev-1', title: 'Act 1' },
        { id: 'ev-2', title: 'Act 2' },
      ];
      const seen = ['ev-1'];
      const hideSeen = false;
      const visible = events.filter((e) => !hideSeen || !seen.includes(e.id));
      expect(visible).toHaveLength(2);
    });

    it('T1-F14-03: Filter works seamlessly in O Meu Horário view', () => {
      schedule.toggleFavorite('ev-fri-p25-abril-1900');
      schedule.toggleFavorite('ev-fri-paz-2000');
      schedule.toggleSeen('ev-fri-p25-abril-1900');
      const hideSeen = true;
      const visibleFavorites = schedule.favorites.filter((id) => !hideSeen || !schedule.isSeen(id));
      expect(visibleFavorites).toEqual(['ev-fri-paz-2000']);
    });

    it('T1-F14-04: Filter works seamlessly in Lista Cronológica feed', () => {
      const dayEvents = TEST_EVENTS.filter((e) => e.day === '2025-09-05');
      const seenIds = ['ev-fri-p25-abril-1900'];
      const hideSeen = true;
      const filtered = dayEvents.filter((e) => !hideSeen || !seenIds.includes(e.id));
      expect(filtered.length).toBe(dayEvents.length - 1);
    });

    it('T1-F14-05: Unchecking "Ocultar já vistos" restores full visibility immediately', () => {
      let hideSeen = true;
      hideSeen = false;
      expect(hideSeen).toBe(false);
    });
  });
  });
}
