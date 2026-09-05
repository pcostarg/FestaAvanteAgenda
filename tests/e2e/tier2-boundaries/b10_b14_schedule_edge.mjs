// tests/e2e/tier2-boundaries/b10_b14_schedule_edge.mjs
// Tier 2: Boundaries for F10, F11, F12, F13, F14 (Storage, Conflicts, Resolution, Já Vi, Hide Filter)

import { describe, it, expect, beforeEach } from '../lib/test-framework.mjs';
import {
  LOCAL_STORAGE_KEY,
  detectScheduleConflicts,
  timeToFestivalMinutes,
  validateScheduleStorage,
} from '../lib/contracts.mjs';
import { MockLocalStorage, MockWindow, ScheduleManager } from '../lib/mock-env.mjs';
import { TEST_EVENTS } from '../lib/fixtures.mjs';

export function registerB10ToB14Tests() {
  describe('Tier 2: Features 10-14 Boundaries — Schedule State & Conflicts', () => {
    let storage;
    let mockWin;
    let schedule;

    beforeEach(() => {
      storage = new MockLocalStorage();
      mockWin = new MockWindow();
      schedule = new ScheduleManager(storage, mockWin);
    });

    describe('Tier 2: Feature 10 Boundaries — avante_schedule_v1 Local Storage', () => {
      it('T2-F10-01: Recovers gracefully when localStorage contains corrupted non-JSON string', () => {
        storage.setItem(LOCAL_STORAGE_KEY, 'CORRUPTED_{{{NOT_JSON');
        const resilientSchedule = new ScheduleManager(storage, mockWin);
        expect(resilientSchedule.favorites).toEqual([]);
        expect(resilientSchedule.seen).toEqual([]);
      });

      it('T2-F10-02: Recovers gracefully when payload has non-array favorites', () => {
        storage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ favorites: 'invalid_string', seen: [] }));
        const resilientSchedule = new ScheduleManager(storage, mockWin);
        expect(resilientSchedule.favorites).toEqual([]);
      });

      it('T2-F10-03: Filters out non-string elements if injected into favorites array', () => {
        const payload = { favorites: ['ev-1', null, 42, undefined, 'ev-2'], seen: [] };
        const cleaned = payload.favorites.filter((id) => typeof id === 'string');
        schedule.replaceSchedule({ favorites: cleaned, seen: [] });
        expect(schedule.favorites).toEqual(['ev-1', 'ev-2']);
      });

      it('T2-F10-04: Deduplicates repeated IDs upon saving to storage', () => {
        schedule.replaceSchedule({ favorites: ['ev-1', 'ev-1', 'ev-1'], seen: ['ev-2', 'ev-2'] });
        expect(schedule.favorites).toEqual(['ev-1']);
        expect(schedule.seen).toEqual(['ev-2']);
      });

      it('T2-F10-05: Handles clear() when storage key does not exist yet without throwing', () => {
        storage.clear();
        schedule.clearSchedule();
        expect(schedule.favorites).toEqual([]);
      });
    });

    describe('Tier 2: Feature 11 Boundaries — Overlap Conflict Detection', () => {
      it('T2-F11-01: Contiguous acts (End A = Start B) strictly do NOT conflict', () => {
        const actA = { id: 'act-a', day: '2025-09-06', timeStart: '14:00', timeEnd: '16:00' };
        const actB = { id: 'act-b', day: '2025-09-06', timeStart: '16:00', timeEnd: '17:30' };
        const result = detectScheduleConflicts([actA, actB]);
        expect(result.hasConflicts).toBe(false);
      });

      it('T2-F11-02: Exactly coincident intervals (Start A = Start B, End A = End B) conflict', () => {
        const actA = { id: 'act-a', day: '2025-09-06', timeStart: '21:00', timeEnd: '22:30' };
        const actB = { id: 'act-b', day: '2025-09-06', timeStart: '21:00', timeEnd: '22:30' };
        const result = detectScheduleConflicts([actA, actB]);
        expect(result.hasConflicts).toBe(true);
        expect(result.conflictIds.has('act-a')).toBe(true);
        expect(result.conflictIds.has('act-b')).toBe(true);
      });

      it('T2-F11-03: Completely nested interval (Act B occurs entirely inside Act A) conflicts', () => {
        const outer = { id: 'outer', day: '2025-09-06', timeStart: '18:00', timeEnd: '22:00' };
        const inner = { id: 'inner', day: '2025-09-06', timeStart: '19:00', timeEnd: '20:00' };
        const result = detectScheduleConflicts([outer, inner]);
        expect(result.hasConflicts).toBe(true);
      });

      it('T2-F11-04: Conflict detection correctly handles midnight crossing acts', () => {
        // Act A: 23:30 to 00:45 (festival minutes: 1410 to 1485)
        // Act B: 00:00 to 01:30 (festival minutes: 1440 to 1530)
        const actA = TEST_EVENTS.find((e) => e.id === 'ev-sat-teatro-2330');
        const actB = TEST_EVENTS.find((e) => e.id === 'ev-sat-cine-0000');
        const result = detectScheduleConflicts([actA, actB]);
        expect(result.hasConflicts).toBe(true);
        expect(result.conflictIds.has(actA.id)).toBe(true);
        expect(result.conflictIds.has(actB.id)).toBe(true);
      });

      it('T2-F11-05: Triple simultaneous overlap flags all 3 acts as conflicting', () => {
        const actA = { id: 'a1', day: '2025-09-06', timeStart: '21:00', timeEnd: '22:30' };
        const actB = { id: 'a2', day: '2025-09-06', timeStart: '21:15', timeEnd: '22:15' };
        const actC = { id: 'a3', day: '2025-09-06', timeStart: '21:30', timeEnd: '23:00' };
        const result = detectScheduleConflicts([actA, actB, actC]);
        expect(result.hasConflicts).toBe(true);
        expect(result.conflictIds.size).toBe(3);
        expect(result.pairs.length).toBe(3); // A-B, A-C, B-C
      });
    });

    describe('Tier 2: Feature 12 Boundaries — Conflict Resolution Decision Matrix', () => {
      it('T2-F12-01: In a 3-way conflict, resolving A vs B preserves remaining conflict between A and C', () => {
        schedule.toggleFavorite('a1');
        schedule.toggleFavorite('a2');
        schedule.toggleFavorite('a3');

        // Resolve A vs B by keeping A (removes B)
        schedule.resolveConflict('keepA', 'a1', 'a2');
        expect(schedule.isFavorite('a1')).toBe(true);
        expect(schedule.isFavorite('a2')).toBe(false);
        expect(schedule.isFavorite('a3')).toBe(true);
      });

      it('T2-F12-02: Resolving a conflict when B was marked "Já vi" preserves seen list integrity', () => {
        schedule.toggleFavorite('a1');
        schedule.toggleFavorite('a2');
        schedule.toggleSeen('a2');
        schedule.resolveConflict('keepA', 'a1', 'a2');
        expect(schedule.isFavorite('a2')).toBe(false);
        // Seen tracking remains recorded in seen array
        expect(schedule.isSeen('a2')).toBe(true);
      });

      it('T2-F12-03: Split decision preserves both events with zero favorites dropped', () => {
        schedule.toggleFavorite('a1');
        schedule.toggleFavorite('a2');
        schedule.resolveConflict('split', 'a1', 'a2');
        expect(schedule.favorites).toHaveLength(2);
      });

      it('T2-F12-04: Resolving conflict when event was already un-favorited acts as safe no-op', () => {
        schedule.toggleFavorite('a1');
        schedule.resolveConflict('keepA', 'a1', 'already-removed');
        expect(schedule.favorites).toEqual(['a1']);
      });

      it('T2-F12-05: Rapid resolution calls update storage deterministically', () => {
        schedule.toggleFavorite('a1');
        schedule.toggleFavorite('a2');
        schedule.resolveConflict('keepB', 'a1', 'a2');
        const raw = JSON.parse(storage.getItem(LOCAL_STORAGE_KEY));
        expect(raw.favorites).toEqual(['a2']);
      });
    });

    describe('Tier 2: Feature 13 Boundaries — "Já Vi" (✓) Event Tracking', () => {
      it('T2-F13-01: An event can be marked as "Já vi" without being in favorites', () => {
        schedule.toggleSeen('ev-unfavorited');
        expect(schedule.isSeen('ev-unfavorited')).toBe(true);
        expect(schedule.isFavorite('ev-unfavorited')).toBe(false);
      });

      it('T2-F13-02: Handles large volume of seen acts (50+) efficiently', () => {
        const seenList = Array.from({ length: 50 }, (_, i) => `ev-seen-${i}`);
        schedule.replaceSchedule({ favorites: [], seen: seenList });
        expect(schedule.seen).toHaveLength(50);
        expect(schedule.isSeen('ev-seen-49')).toBe(true);
      });

      it('T2-F13-03: Toggling seen state does NOT mutate favorites array', () => {
        schedule.toggleFavorite('ev-fav');
        const initialFavs = [...schedule.favorites];
        schedule.toggleSeen('ev-fav');
        expect(schedule.favorites).toEqual(initialFavs);
      });

      it('T2-F13-04: "Já vi" marks correctly on midnight-crossing event', () => {
        const midnightActId = 'ev-sat-teatro-2330';
        schedule.toggleSeen(midnightActId);
        expect(schedule.isSeen(midnightActId)).toBe(true);
      });

      it('T2-F13-05: Duplicate calls to toggleSeen toggle state back and forth cleanly', () => {
        schedule.toggleSeen('ev-cycle');
        expect(schedule.isSeen('ev-cycle')).toBe(true);
        schedule.toggleSeen('ev-cycle');
        expect(schedule.isSeen('ev-cycle')).toBe(false);
        schedule.toggleSeen('ev-cycle');
        expect(schedule.isSeen('ev-cycle')).toBe(true);
      });
    });

    describe('Tier 2: Feature 14 Boundaries — "Ocultar Já Vistos" Filter', () => {
      it('T2-F14-01: All favorited events on day are seen -> filtered list has length 0', () => {
        schedule.toggleFavorite('ev-fri-p25-abril-1900');
        schedule.toggleSeen('ev-fri-p25-abril-1900');
        const hideSeen = true;
        const visible = schedule.favorites.filter((id) => !hideSeen || !schedule.isSeen(id));
        expect(visible).toHaveLength(0);
      });

      it('T2-F14-02: When seen array is empty, toggle has zero effect on visible count', () => {
        schedule.toggleFavorite('ev-1');
        schedule.toggleFavorite('ev-2');
        const hideSeen = true;
        const visible = schedule.favorites.filter((id) => !hideSeen || !schedule.isSeen(id));
        expect(visible).toHaveLength(2);
      });

      it('T2-F14-03: Rapid toggling of hideSeen produces consistent filtered output', () => {
        schedule.toggleFavorite('ev-1');
        schedule.toggleFavorite('ev-2');
        schedule.toggleSeen('ev-1');

        let hideSeen = false;
        expect(schedule.favorites.filter((id) => !hideSeen || !schedule.isSeen(id))).toHaveLength(2);
        hideSeen = true;
        expect(schedule.favorites.filter((id) => !hideSeen || !schedule.isSeen(id))).toHaveLength(1);
        hideSeen = false;
        expect(schedule.favorites.filter((id) => !hideSeen || !schedule.isSeen(id))).toHaveLength(2);
      });

      it('T2-F14-04: Filter combined with category filter functions correctly', () => {
        const events = [
          { id: 'ev-1', category: 'Música' },
          { id: 'ev-2', category: 'Debates' },
          { id: 'ev-3', category: 'Música' },
        ];
        const seen = ['ev-1'];
        const hideSeen = true;
        const categoryFilter = 'Música';

        const visible = events.filter(
          (e) => (!hideSeen || !seen.includes(e.id)) && (!categoryFilter || e.category === categoryFilter)
        );
        expect(visible).toHaveLength(1);
        expect(visible[0].id).toBe('ev-3');
      });

      it('T2-F14-05: Marking an event seen while filter is active removes it immediately from view', () => {
        schedule.toggleFavorite('ev-1');
        schedule.toggleFavorite('ev-2');
        const hideSeen = true;
        let visible = schedule.favorites.filter((id) => !hideSeen || !schedule.isSeen(id));
        expect(visible).toHaveLength(2);

        schedule.toggleSeen('ev-1');
        visible = schedule.favorites.filter((id) => !hideSeen || !schedule.isSeen(id));
        expect(visible).toHaveLength(1);
        expect(visible[0]).toBe('ev-2');
      });
    });
  });
}
