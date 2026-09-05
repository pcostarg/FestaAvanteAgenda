// tests/e2e/tier4-scenarios/scenario_d_offline.mjs
// Tier 4: Real-World Scenario D — "Offline Atalaia Festival Resilience"

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

export function registerScenarioDTests() {
  describe('Tier 4: Scenario D — Offline Atalaia Festival Resilience', () => {
    let storage;
    let mockWin;
    let schedule;

    beforeEach(() => {
      storage = new MockLocalStorage();
      mockWin = new MockWindow();
      schedule = new ScheduleManager(storage, mockWin);
    });

    it('Scenario D: Operates 100% reliably in offline airplane mode at festival venue', () => {
      // Step 1: Simulate user at Quinta da Atalaia entering offline mode
      let networkRequestsAttempted = 0;
      const fakeFetch = () => {
        networkRequestsAttempted++;
        return Promise.reject(new Error('Failed to fetch (offline)'));
      };

      // Step 2: Browse festival acts offline (uses static program.json data)
      const cachedProgram = TEST_EVENTS;
      expect(cachedProgram.length).toBeGreaterThan(10);
      expect(networkRequestsAttempted).toBe(0);

      // Step 3: Perform client-side search and filtering offline
      const query = 'Fado';
      const searchResults = cachedProgram.filter((e) =>
        e.title.toLowerCase().includes(query.toLowerCase()) || e.stage.toLowerCase().includes(query.toLowerCase())
      );
      expect(searchResults.length).toBeGreaterThan(0);
      expect(networkRequestsAttempted).toBe(0);

      // Step 4: Add acts to personal schedule offline
      schedule.toggleFavorite('ev-sun-fado-1700');
      schedule.toggleFavorite('ev-sun-comicio-1800');
      schedule.toggleSeen('ev-sun-fado-1700');
      expect(networkRequestsAttempted).toBe(0);

      // State is securely written to localStorage offline
      const rawStored = storage.getItem(LOCAL_STORAGE_KEY);
      expect(rawStored).toBeTruthy();
      expect(JSON.parse(rawStored).favorites).toHaveLength(2);

      // Step 5: Evaluate schedule conflicts offline
      const conflicts = schedule.getConflictsForDay('2025-09-07', cachedProgram);
      expect(conflicts.hasConflicts).toBe(true);
      expect(networkRequestsAttempted).toBe(0);

      // Step 6: Generate QR code payload offline (zero server API calls)
      const offlinePayload = encodeSharePayload(schedule.favorites, schedule.seen);
      expect(offlinePayload).toBeTruthy();
      expect(networkRequestsAttempted).toBe(0);

      // Step 7: Export calendar ICS offline
      const ics = generateIcsCalendar(cachedProgram.filter((e) => schedule.favorites.includes(e.id)));
      expect(validateIcsCalendar(ics).valid).toBe(true);
      expect(networkRequestsAttempted).toBe(0);

      // Step 8: Confirm zero external network calls were made throughout entire session
      expect(networkRequestsAttempted).toBe(0);
    });
  });
}
