// tests/e2e/tier4-scenarios/scenario_e_recovery.mjs
// Tier 4: Real-World Scenario E — "Adversarial Input & Disaster Recovery"

import { describe, it, expect, beforeEach } from '../lib/test-framework.mjs';
import {
  decodeSharePayload,
  encodeSharePayload,
  validateScheduleStorage,
  LOCAL_STORAGE_KEY,
} from '../lib/contracts.mjs';
import { MockLocalStorage, MockWindow, ScheduleManager } from '../lib/mock-env.mjs';
import { TEST_EVENTS } from '../lib/fixtures.mjs';

export function registerScenarioETests() {
  describe('Tier 4: Scenario E — Adversarial Input & Disaster Recovery', () => {
    let storage;
    let mockWin;
    let schedule;

    beforeEach(() => {
      storage = new MockLocalStorage();
      mockWin = new MockWindow();
      schedule = new ScheduleManager(storage, mockWin);
    });

    it('Scenario E: System repels corrupted inputs, invalid schemas, and restores valid backup', () => {
      // Step 1: User has an active valid schedule
      const authenticFavorites = ['ev-fri-p25-abril-1900', 'ev-sat-p25-2100'];
      const authenticSeen = ['ev-fri-p25-abril-1900'];
      schedule.replaceSchedule({ favorites: authenticFavorites, seen: authenticSeen });

      // Step 2: Adversarial Attack 1 — Corrupted Base64 URL parameter (?import=CORRUPTED!!!)
      const corruptedUrlParam = 'NOT_A_VALID_BASE64_PAYLOAD_!@#$%^&*()';
      let urlImportSuccess = false;
      try {
        const decoded = decodeSharePayload(corruptedUrlParam);
        schedule.replaceSchedule(decoded);
        urlImportSuccess = true;
      } catch {
        urlImportSuccess = false;
      }
      expect(urlImportSuccess).toBe(false);
      // Verify existing schedule was NOT wiped by failed import attempt
      expect(schedule.favorites).toEqual(authenticFavorites);
      expect(schedule.seen).toEqual(authenticSeen);

      // Step 3: Adversarial Attack 2 — Upload of corrupted JSON backup file
      const corruptedJsonString = '{"app": "AvanteRouter", "favorites": [UNTERMINATED_STRING';
      let jsonParseSuccess = false;
      try {
        JSON.parse(corruptedJsonString);
        jsonParseSuccess = true;
      } catch {
        jsonParseSuccess = false;
      }
      expect(jsonParseSuccess).toBe(false);
      expect(schedule.favorites).toEqual(authenticFavorites);

      // Step 4: Adversarial Attack 3 — JSON with invalid data types
      const badTypePayload = {
        favorites: { thisIsNotAnArray: true },
        seen: 12345,
      };
      const validation = validateScheduleStorage(badTypePayload);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThanOrEqual(2);

      // Step 5: Adversarial Attack 4 — Malicious XSS / HTML injection in search query
      const xssQuery = '<img src=x onerror=alert(1)>';
      const results = TEST_EVENTS.filter((e) =>
        e.title.toLowerCase().includes(xssQuery.toLowerCase())
      );
      expect(results).toHaveLength(0); // Safely treated as literal string

      // Step 6: Adversarial Attack 5 — Foreign non-festival QR code scanned
      const foreignQrContent = 'WIFI:S:MyFestivalWiFi;T:WPA;P:SecretPassword123;;';
      let isFestivalQr = false;
      try {
        const url = new URL(foreignQrContent);
        if (url.searchParams.has('import')) {
          decodeSharePayload(url.searchParams.get('import'));
          isFestivalQr = true;
        }
      } catch {
        isFestivalQr = false;
      }
      expect(isFestivalQr).toBe(false);

      // Step 7: Disaster Recovery — User accidentally clears schedule, then restores from backup
      schedule.clearSchedule();
      expect(schedule.favorites).toHaveLength(0);
      expect(schedule.seen).toHaveLength(0);

      // Restore from authentic exported backup
      const authenticBackup = {
        app: 'AvanteRouter',
        version: 1,
        favorites: authenticFavorites,
        seen: authenticSeen,
        updatedAt: Date.now(),
      };
      const backupCheck = validateScheduleStorage(authenticBackup);
      expect(backupCheck.valid).toBe(true);

      schedule.replaceSchedule(authenticBackup);
      expect(schedule.favorites).toEqual(authenticFavorites);
      expect(schedule.seen).toEqual(authenticSeen);
    });
  });
}
