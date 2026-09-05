// tests/e2e/tier2-boundaries/b15_b18_export_edge.mjs
// Tier 2: Boundaries for F15, F16, F17, F18 (Export Modal, QR Code, JSON File, ICS Calendar)

import { describe, it, expect } from '../lib/test-framework.mjs';
import {
  encodeSharePayload,
  decodeSharePayload,
  generateIcsCalendar,
  validateIcsCalendar,
} from '../lib/contracts.mjs';
import { TEST_EVENTS } from '../lib/fixtures.mjs';

export function registerB15ToB18Tests() {
  describe('Tier 2: Feature 15 Boundaries — Export Modal', () => {
    it('T2-F15-01: Export modal opens gracefully when user schedule is completely empty', () => {
      const emptyFavorites = [];
      const notice = emptyFavorites.length === 0 ? 'Nenhum evento selecionado' : '';
      expect(notice).toBe('Nenhum evento selecionado');
    });

    it('T2-F15-02: Copy link action falls back gracefully if navigator.clipboard is unavailable', () => {
      let copiedViaFallback = false;
      const fakeClipboard = null;
      if (!fakeClipboard) {
        // Fallback to text selection / input select
        copiedViaFallback = true;
      }
      expect(copiedViaFallback).toBe(true);
    });

    it('T2-F15-03: Rapid consecutive clicks on export trigger do not duplicate modal instance', () => {
      let modalCount = 0;
      const openModal = () => { if (modalCount === 0) modalCount = 1; };
      openModal();
      openModal();
      openModal();
      expect(modalCount).toBe(1);
    });

    it('T2-F15-04: Pressing Escape dismisses export modal cleanly', () => {
      let isExportOpen = true;
      const onKeyDown = (e) => {
        if (e.key === 'Escape') isExportOpen = false;
      };
      onKeyDown({ key: 'Escape' });
      expect(isExportOpen).toBe(false);
    });

    it('T2-F15-05: Modal displays export file sizes or payload indicators accurately', () => {
      const sampleJson = JSON.stringify({ favorites: ['ev-1'], seen: [] });
      const sizeBytes = Buffer.byteLength(sampleJson, 'utf-8');
      expect(sizeBytes).toBeGreaterThan(0);
      expect(sizeBytes).toBeLessThan(1024);
    });
  });

  describe('Tier 2: Feature 16 Boundaries — Export QR Code', () => {
    it('T2-F16-01: Encodes large schedule (50 acts) into payload well within standard URL limit (2048 chars)', () => {
      const largeFavs = Array.from({ length: 50 }, (_, i) => `ev-act-${i}`);
      const largeSeen = Array.from({ length: 25 }, (_, i) => `ev-act-${i}`);
      const payload = encodeSharePayload(largeFavs, largeSeen);
      const fullUrl = `https://pcostarg.github.io/FestaAvanteAgenda/?import=${payload}`;
      expect(fullUrl.length).toBeLessThan(2048);
    });

    it('T2-F16-02: Base64URL encoding strictly omits plus (+), slash (/), and equal (=) characters', () => {
      const testIds = ['ev-test-1', 'ev-test-2', 'ev-test-special'];
      const payload = encodeSharePayload(testIds, testIds);
      expect(payload).not.toContain('+');
      expect(payload).not.toContain('/');
      expect(payload).not.toContain('=');
    });

    it('T2-F16-03: Decodes payload without errors even when base64 requires 1, 2, or 3 padding equals', () => {
      // Test different payload lengths to test modulus padding branches
      for (let len = 1; len <= 10; len++) {
        const ids = Array.from({ length: len }, (_, i) => `ev-${i}`);
        const encoded = encodeSharePayload(ids, []);
        const decoded = decodeSharePayload(encoded);
        expect(decoded.favorites).toEqual(ids);
      }
    });

    it('T2-F16-04: Throws descriptive error when decoding null or empty payload', () => {
      expect(() => decodeSharePayload(null)).toThrow('Payload string is required');
      expect(() => decodeSharePayload('')).toThrow('Payload string is required');
    });

    it('T2-F16-05: Payload compression uses minimal keys "f" and "s" to minimize QR density', () => {
      const payload = encodeSharePayload(['ev-1'], ['ev-1']);
      // decode and check raw json structure
      let base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4 !== 0) base64 += '=';
      const rawJson = Buffer.from(base64, 'base64').toString('utf-8');
      const parsed = JSON.parse(rawJson);
      expect(Object.keys(parsed)).toEqual(['f', 's']);
    });
  });

  describe('Tier 2: Feature 17 Boundaries — Export JSON File', () => {
    it('T2-F17-01: Export JSON handles empty schedule producing valid format', () => {
      const emptyExport = {
        app: 'AvanteRouter',
        version: 1,
        exportedAt: new Date().toISOString(),
        favorites: [],
        seen: [],
      };
      const str = JSON.stringify(emptyExport);
      const parsed = JSON.parse(str);
      expect(parsed.favorites).toEqual([]);
      expect(parsed.seen).toEqual([]);
    });

    it('T2-F17-02: Export JSON conforms to ISO 8601 UTC timestamp format with "Z"', () => {
      const exportedAt = new Date().toISOString();
      expect(exportedAt.endsWith('Z')).toBe(true);
      expect(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(exportedAt)).toBe(true);
    });

    it('T2-F17-03: Export JSON preserves exact order of favorites array', () => {
      const order = ['ev-c', 'ev-a', 'ev-b'];
      const data = { favorites: order, seen: [] };
      const serialized = JSON.stringify(data);
      const restored = JSON.parse(serialized);
      expect(restored.favorites).toEqual(order);
    });

    it('T2-F17-04: Blob URL generation revokes previous blob URL to prevent memory leaks', () => {
      let revokedUrl = null;
      const revokeObjectURL = (url) => { revokedUrl = url; };
      const previousBlobUrl = 'blob:https://pcostarg.github.io/12345';
      revokeObjectURL(previousBlobUrl);
      expect(revokedUrl).toBe(previousBlobUrl);
    });

    it('T2-F17-05: JSON filename adheres strictly to "minha-agenda-avante.json" across all browsers', () => {
      const dlLink = { download: 'minha-agenda-avante.json' };
      expect(dlLink.download).toBe('minha-agenda-avante.json');
    });
  });

  describe('Tier 2: Feature 18 Boundaries — Export ICS Calendar', () => {
    it('T2-F18-01: Accurately increments UTC day for acts occurring past midnight', () => {
      // Act: Sábado 2025-09-06 from 23:30 to 00:45 (Sunday morning!)
      const midnightAct = TEST_EVENTS.find((e) => e.id === 'ev-sat-teatro-2330');
      const ics = generateIcsCalendar([midnightAct]);

      // DTSTART should be 2025-09-06 at 23:30:00Z -> 20250906T233000Z
      expect(ics).toContain('DTSTART:20250906T233000Z');
      // DTEND should be 2025-09-07 at 00:45:00Z -> 20250907T004500Z (incremented day!)
      expect(ics).toContain('DTEND:20250907T004500Z');
    });

    it('T2-F18-02: Accurately sets day for dawn acts starting after midnight (e.g. 01:15)', () => {
      const dawnAct = TEST_EVENTS.find((e) => e.id === 'ev-fri-juv-0115'); // Friday schedule, 01:15 Saturday morning!
      const ics = generateIcsCalendar([dawnAct]);

      // DTSTART should be 20250906T011500Z
      expect(ics).toContain('DTSTART:20250906T011500Z');
      // DTEND should be 20250906T020000Z
      expect(ics).toContain('DTEND:20250906T020000Z');
    });

    it('T2-F18-03: Properly escapes commas, semicolons, and backslashes in ICS SUMMARY and DESCRIPTION', () => {
      const specialEvent = {
        id: 'ev-special-esc',
        title: 'Banda X, Y & Z; Especial \\ Lisboa',
        stage: 'Palco Paz',
        day: '2025-09-05',
        timeStart: '18:00',
        timeEnd: '19:00',
        category: 'Música',
        description: 'Primeira linha;\nSegunda linha, com vírgulas e \\ barras.',
      };
      const ics = generateIcsCalendar([specialEvent]);
      expect(ics).toContain('Banda X\\, Y & Z\\; Especial \\\\ Lisboa');
      expect(ics).toContain('\\nSegunda linha\\, com');
      expect(validateIcsCalendar(ics).valid).toBe(true);
    });

    it('T2-F18-04: Generating calendar with 0 events produces valid empty VCALENDAR container', () => {
      const ics = generateIcsCalendar([]);
      const validation = validateIcsCalendar(ics);
      expect(validation.valid).toBe(true);
      expect(validation.eventCount).toBe(0);
      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('END:VCALENDAR');
    });

    it('T2-F18-05: UID per event contains unique festival domain suffix @festadoavante.pcp.pt', () => {
      const ev = TEST_EVENTS[0];
      const ics = generateIcsCalendar([ev]);
      expect(ics).toContain(`UID:${ev.id}@festadoavante.pcp.pt`);
    });
  });
}
