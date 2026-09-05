// tests/e2e/tier4-scenarios/scenario_b_sharing.mjs
// Tier 4: Real-World Scenario B — "The Weekend Planner & Group Sharing"

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

export function registerScenarioBTests() {
  describe('Tier 4: Scenario B — The Weekend Planner & Group Sharing', () => {
    it('Scenario B: Multi-day schedule creation, link sharing, silent direct overwrite, and calendar export', () => {
      // User A (Planner) environment
      const storageA = new MockLocalStorage();
      const winA = new MockWindow();
      const scheduleA = new ScheduleManager(storageA, winA);

      // Step 1: User A plans weekend: selects 3 acts on Saturday, 2 on Sunday
      const satActs = ['ev-sat-central-1030', 'ev-sat-ciencia-1400', 'ev-sat-p25-2100'];
      const sunActs = ['ev-sun-desp-1000', 'ev-sun-comicio-1800'];

      [...satActs, ...sunActs].forEach((id) => scheduleA.toggleFavorite(id));
      expect(scheduleA.favorites).toHaveLength(5);

      // Marks morning debate on Saturday as seen
      scheduleA.toggleSeen('ev-sat-central-1030');
      expect(scheduleA.isSeen('ev-sat-central-1030')).toBe(true);

      // Step 2: User A opens Export Modal and generates Share URL
      const sharePayload = encodeSharePayload(scheduleA.favorites, scheduleA.seen);
      const shareUrl = `https://pcostarg.github.io/FestaAvanteAgenda/?import=${sharePayload}`;
      expect(shareUrl).toContain('?import=');

      // Step 3: User A also exports JSON backup (minha-agenda-avante.json)
      const jsonBackup = JSON.stringify({
        app: 'AvanteRouter',
        version: 1,
        exportedAt: new Date().toISOString(),
        favorites: scheduleA.favorites,
        seen: scheduleA.seen,
      });

      // Step 4: User B (Friend) opens app on device B
      // Device B already has some old conflicting schedule
      const storageB = new MockLocalStorage();
      const winB = new MockWindow();
      const scheduleB = new ScheduleManager(storageB, winB);
      scheduleB.toggleFavorite('old-unrelated-act-xyz');
      expect(scheduleB.isFavorite('old-unrelated-act-xyz')).toBe(true);

      // Step 5: User B opens shared URL from User A
      winB.location.href = shareUrl;
      winB.location.search = `?import=${sharePayload}`;

      // App detects ?import= parameter on load, decodes payload
      const extractedParam = new URL(winB.location.href).searchParams.get('import');
      const importedData = decodeSharePayload(extractedParam);

      // Rule: Silent and direct replace of scheduleB
      scheduleB.replaceSchedule(importedData);

      // URL is sanitized via replaceState to prevent re-importing on reload
      winB.history.replaceState({}, '', '/FestaAvanteAgenda/');
      expect(winB.location.search).toBe('');

      // Step 6: Verify User B's schedule matches User A's schedule 100%
      expect(scheduleB.favorites).toEqual(scheduleA.favorites);
      expect(scheduleB.seen).toEqual(scheduleA.seen);
      // Verify old unrelated act was completely wiped
      expect(scheduleB.isFavorite('old-unrelated-act-xyz')).toBe(false);

      // Step 7: User B exports schedule to RFC 5545 calendar (meu_avante_2025.ics)
      const savedEventsB = TEST_EVENTS.filter((e) => scheduleB.favorites.includes(e.id));
      const icsOutput = generateIcsCalendar(savedEventsB);
      const icsValidation = validateIcsCalendar(icsOutput);

      expect(icsValidation.valid).toBe(true);
      expect(icsValidation.eventCount).toBe(5);
      expect(icsOutput).toContain('BEGIN:VCALENDAR');
      expect(icsOutput).toContain('Grande Comício de Encerramento');
    });
  });
}
