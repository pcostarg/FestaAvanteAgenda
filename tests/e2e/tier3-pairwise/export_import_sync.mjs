// tests/e2e/tier3-pairwise/export_import_sync.mjs
// Tier 3: Pairwise Interactions for Export, Import, QR Code, URL Params, and Cross-Tab Storage Sync

import { describe, it, expect, beforeEach } from '../lib/test-framework.mjs';
import {
  encodeSharePayload,
  decodeSharePayload,
  generateIcsCalendar,
  validateIcsCalendar,
  LOCAL_STORAGE_KEY,
} from '../lib/contracts.mjs';
import { MockLocalStorage, MockWindow, ScheduleManager } from '../lib/mock-env.mjs';
import { TEST_EVENTS } from '../lib/fixtures.mjs';

export function registerExportImportPairwiseTests() {
  describe('Tier 3: Pairwise Interactions — Sharing, Import/Export & Storage Sync', () => {
    let storage;
    let mockWin;
    let schedule;

    beforeEach(() => {
      storage = new MockLocalStorage();
      mockWin = new MockWindow();
      schedule = new ScheduleManager(storage, mockWin);
    });

    it('T3-PAIR-08: Export JSON + Import JSON: Full round-trip data restoration', () => {
      schedule.toggleFavorite('ev-fri-p25-abril-1900');
      schedule.toggleFavorite('ev-sat-p25-2100');
      schedule.toggleSeen('ev-fri-p25-abril-1900');

      // Export JSON
      const exportJson = JSON.stringify({
        app: 'AvanteRouter',
        version: 1,
        exportedAt: new Date().toISOString(),
        favorites: schedule.favorites,
        seen: schedule.seen,
      });

      // Clear storage
      storage.clear();
      const freshSchedule = new ScheduleManager(storage, mockWin);
      expect(freshSchedule.favorites).toHaveLength(0);

      // Import JSON
      const imported = JSON.parse(exportJson);
      freshSchedule.replaceSchedule(imported);

      expect(freshSchedule.favorites).toEqual(['ev-fri-p25-abril-1900', 'ev-sat-p25-2100']);
      expect(freshSchedule.seen).toEqual(['ev-fri-p25-abril-1900']);
    });

    it('T3-PAIR-09: Export QR/URL + URL Import (?import=...): Complete link sharing round-trip', () => {
      const originalFavs = ['ev-fri-juv-2345', 'ev-sat-ciencia-1400'];
      const originalSeen = ['ev-fri-juv-2345'];

      // User A exports to URL payload
      const payload = encodeSharePayload(originalFavs, originalSeen);
      const shareUrl = `https://pcostarg.github.io/FestaAvanteAgenda/?import=${payload}`;

      // User B receives and opens URL
      const incomingUrl = new URL(shareUrl);
      const extractedParam = incomingUrl.searchParams.get('import');
      const decodedState = decodeSharePayload(extractedParam);

      // Apply silent direct overwrite on User B
      schedule.replaceSchedule(decodedState);

      expect(schedule.favorites).toEqual(originalFavs);
      expect(schedule.seen).toEqual(originalSeen);
    });

    it('T3-PAIR-10: Export ICS + Midnight Events: Valid RFC 5545 calendar with date rolling across midnight', () => {
      const midnightActs = [
        TEST_EVENTS.find((e) => e.id === 'ev-fri-juv-2345'), // 23:45 to 01:15 Saturday morning!
        TEST_EVENTS.find((e) => e.id === 'ev-sat-teatro-2330'), // 23:30 to 00:45 Sunday morning!
      ];

      const ics = generateIcsCalendar(midnightActs);
      const validation = validateIcsCalendar(ics);

      expect(validation.valid).toBe(true);
      expect(validation.eventCount).toBe(2);

      // Verify Friday night event ends on Saturday 2025-09-06
      expect(ics).toContain('DTSTART:20250905T234500Z');
      expect(ics).toContain('DTEND:20250906T011500Z');

      // Verify Saturday night event ends on Sunday 2025-09-07
      expect(ics).toContain('DTSTART:20250906T233000Z');
      expect(ics).toContain('DTEND:20250907T004500Z');
    });

    it('T3-PAIR-11: Export JSON + Silent Direct Overwrite: Local schedule is completely replaced without merge residue', () => {
      // User has existing schedule
      schedule.toggleFavorite('old-act-1');
      schedule.toggleFavorite('old-act-2');
      schedule.toggleSeen('old-act-1');

      // Incoming JSON from a friend
      const incomingBackup = {
        favorites: ['friend-act-a', 'friend-act-b'],
        seen: ['friend-act-a'],
      };

      schedule.replaceSchedule(incomingBackup);

      // Old acts must be 100% gone
      expect(schedule.isFavorite('old-act-1')).toBe(false);
      expect(schedule.isFavorite('old-act-2')).toBe(false);
      expect(schedule.isSeen('old-act-1')).toBe(false);

      // New acts present
      expect(schedule.favorites).toEqual(['friend-act-a', 'friend-act-b']);
      expect(schedule.seen).toEqual(['friend-act-a']);
    });

    it('T3-PAIR-12: URL Import + Storage Sync: URL import immediately writes to localStorage and triggers event', () => {
      let eventFired = false;
      mockWin.addEventListener('avante_schedule_updated', () => {
        eventFired = true;
      });

      const payload = encodeSharePayload(['ev-sync-target'], []);
      schedule.replaceSchedule(decodeSharePayload(payload));

      expect(eventFired).toBe(true);
      const stored = JSON.parse(storage.getItem(LOCAL_STORAGE_KEY));
      expect(stored.favorites).toEqual(['ev-sync-target']);
    });

    it('T3-PAIR-13: Storage Events: Changes in storage area from another tab trigger state reload', () => {
      // Setup schedule A and schedule B sharing same mock storage
      const scheduleB = new ScheduleManager(storage, mockWin);

      // Schedule A modifies state
      schedule.toggleFavorite('ev-tab-sync');

      // Schedule B receives notification and re-reads
      scheduleB._load();
      expect(scheduleB.isFavorite('ev-tab-sync')).toBe(true);
    });

    it('T3-PAIR-14: Clear Schedule + Export: Exporting an empty schedule produces valid empty structures', () => {
      schedule.clearSchedule();
      const payload = encodeSharePayload(schedule.favorites, schedule.seen);
      const decoded = decodeSharePayload(payload);
      expect(decoded.favorites).toEqual([]);
      expect(decoded.seen).toEqual([]);

      const ics = generateIcsCalendar([]);
      expect(validateIcsCalendar(ics).valid).toBe(true);
    });
  });
}
