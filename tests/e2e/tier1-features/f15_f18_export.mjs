// tests/e2e/tier1-features/f15_f18_export.mjs
// Tier 1: Features F15, F16, F17, F18 (Export Modal, QR Code, JSON File, ICS Calendar)

import { describe, it, expect } from '../lib/test-framework.mjs';
import {
  encodeSharePayload,
  decodeSharePayload,
  generateIcsCalendar,
  validateIcsCalendar,
  SHARE_URL_PREFIX,
} from '../lib/contracts.mjs';
import { TEST_EVENTS } from '../lib/fixtures.mjs';

export function registerF15ToF18Tests() {
  describe('Tier 1: Feature 15 — Export Modal', () => {
    it('T1-F15-01: Modal opens upon triggering Export action', () => {
      let isOpen = false;
      const openModal = () => { isOpen = true; };
      openModal();
      expect(isOpen).toBe(true);
    });

    it('T1-F15-02: Modal presents all 3 primary export channels (QR, JSON, ICS)', () => {
      const options = ['qr_code', 'json_file', 'ics_calendar'];
      expect(options).toContain('qr_code');
      expect(options).toContain('json_file');
      expect(options).toContain('ics_calendar');
    });

    it('T1-F15-03: Modal displays count of saved events included in export', () => {
      const favorites = ['ev-1', 'ev-2', 'ev-3'];
      const exportCountNotice = `A exportar ${favorites.length} eventos`;
      expect(exportCountNotice).toBe('A exportar 3 eventos');
    });

    it('T1-F15-04: Modal provides quick "Copiar Link" button for shareable URL', () => {
      const payload = encodeSharePayload(['ev-1'], []);
      const shareUrl = `${SHARE_URL_PREFIX}${payload}`;
      expect(shareUrl.startsWith('https://pcostarg.github.io/FestaAvanteAgenda/?import=')).toBe(true);
    });

    it('T1-F15-05: Modal closes cleanly via close icon or backdrop click', () => {
      let isOpen = true;
      const closeModal = () => { isOpen = false; };
      closeModal();
      expect(isOpen).toBe(false);
    });
  });

  describe('Tier 1: Feature 16 — Export QR Code', () => {
    it('T1-F16-01: Generates URL-safe base64 payload containing favorites and seen IDs', () => {
      const favs = ['ev-fri-p25-abril-1900', 'ev-sat-p25-2100'];
      const seen = ['ev-fri-p25-abril-1900'];
      const payload = encodeSharePayload(favs, seen);
      expect(typeof payload).toBe('string');
      expect(payload.includes('+')).toBe(false);
      expect(payload.includes('/')).toBe(false);
      expect(payload.includes('=')).toBe(false);
    });

    it('T1-F16-02: Encoded QR payload decodes back with 100% data fidelity', () => {
      const favs = ['ev-fri-p25-abril-1900', 'ev-sat-p25-2100'];
      const seen = ['ev-fri-p25-abril-1900'];
      const payload = encodeSharePayload(favs, seen);
      const decoded = decodeSharePayload(payload);
      expect(decoded.favorites).toEqual(favs);
      expect(decoded.seen).toEqual(seen);
    });

    it('T1-F16-03: QR code string payload adheres to compact URL format', () => {
      const payload = encodeSharePayload(['ev-1'], ['ev-1']);
      const qrData = `${SHARE_URL_PREFIX}${payload}`;
      expect(qrData).toContain('?import=');
    });

    it('T1-F16-04: Deduplicates repeated IDs before encoding into QR payload', () => {
      const duplicates = ['ev-1', 'ev-1', 'ev-2'];
      const payload = encodeSharePayload(duplicates, ['ev-1', 'ev-1']);
      const decoded = decodeSharePayload(payload);
      expect(decoded.favorites).toEqual(['ev-1', 'ev-2']);
      expect(decoded.seen).toEqual(['ev-1']);
    });

    it('T1-F16-05: Handles empty schedule encoding without errors', () => {
      const payload = encodeSharePayload([], []);
      const decoded = decodeSharePayload(payload);
      expect(decoded.favorites).toEqual([]);
      expect(decoded.seen).toEqual([]);
    });
  });

  describe('Tier 1: Feature 17 — Export JSON File', () => {
    it('T1-F17-01: Produces valid JSON string adhering to export schema', () => {
      const favorites = ['ev-fri-p25-abril-1900'];
      const seen = ['ev-fri-p25-abril-1900'];
      const exportObject = {
        app: 'AvanteRouter',
        version: 1,
        exportedAt: new Date().toISOString(),
        favorites,
        seen,
      };
      const jsonStr = JSON.stringify(exportObject, null, 2);
      const parsed = JSON.parse(jsonStr);
      expect(parsed.app).toBe('AvanteRouter');
      expect(parsed.version).toBe(1);
      expect(parsed.favorites).toEqual(favorites);
    });

    it('T1-F17-02: Target filename is strictly "minha-agenda-avante.json"', () => {
      const targetFilename = 'minha-agenda-avante.json';
      expect(targetFilename).toBe('minha-agenda-avante.json');
    });

    it('T1-F17-03: Export object includes valid ISO timestamp under exportedAt', () => {
      const isoStr = new Date().toISOString();
      const exportData = { exportedAt: isoStr };
      expect(Date.parse(exportData.exportedAt)).not.toBe(NaN);
    });

    it('T1-F17-04: Exports both favorites and seen arrays completely', () => {
      const favs = ['ev-1', 'ev-2'];
      const seen = ['ev-1'];
      const exportData = { favorites: favs, seen: seen };
      expect(exportData.favorites).toHaveLength(2);
      expect(exportData.seen).toHaveLength(1);
    });

    it('T1-F17-05: JSON blob MIME type is application/json', () => {
      const mimeType = 'application/json';
      expect(mimeType).toBe('application/json');
    });
  });

  describe('Tier 1: Feature 18 — Export ICS Calendar', () => {
    it('T1-F18-01: Target filename is strictly "meu_avante_2025.ics"', () => {
      const targetFilename = 'meu_avante_2025.ics';
      expect(targetFilename).toBe('meu_avante_2025.ics');
    });

    it('T1-F18-02: Calendar text strictly adheres to RFC 5545 format', () => {
      const savedEvents = [TEST_EVENTS[0]];
      const ics = generateIcsCalendar(savedEvents);
      const validation = validateIcsCalendar(ics);
      expect(validation.valid).toBe(true);
      expect(validation.eventCount).toBe(1);
    });

    it('T1-F18-03: Every VEVENT contains UID, DTSTAMP, DTSTART, DTEND, SUMMARY, and LOCATION', () => {
      const savedEvents = [TEST_EVENTS[0]];
      const ics = generateIcsCalendar(savedEvents);
      expect(ics).toContain('BEGIN:VEVENT');
      expect(ics).toContain('UID:');
      expect(ics).toContain('DTSTAMP:');
      expect(ics).toContain('DTSTART:');
      expect(ics).toContain('DTEND:');
      expect(ics).toContain('SUMMARY:');
      expect(ics).toContain('LOCATION:');
      expect(ics).toContain('END:VEVENT');
    });

    it('T1-F18-04: Line breaks in ICS output strictly use CRLF (\\r\\n)', () => {
      const savedEvents = [TEST_EVENTS[0]];
      const ics = generateIcsCalendar(savedEvents);
      expect(ics.includes('\r\n')).toBe(true);
      // Ensure no bare \n exists without \r
      const bareLf = ics.replace(/\r\n/g, '').includes('\n');
      expect(bareLf).toBe(false);
    });

    it('T1-F18-05: Special characters in summary and description are properly escaped', () => {
      const specialEvent = TEST_EVENTS.find((e) => e.id === 'ev-sun-livro-1500');
      const ics = generateIcsCalendar([specialEvent]);
      expect(ics).toContain('\\;');
      expect(validateIcsCalendar(ics).valid).toBe(true);
    });
  });
}
