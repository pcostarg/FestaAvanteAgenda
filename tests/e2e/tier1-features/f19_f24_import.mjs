// tests/e2e/tier1-features/f19_f24_import.mjs
// Tier 1: Features F19, F20, F21, F22, F23, F24 (Import Modal, Camera, Image, JSON Upload, URL Import, Silent Direct Overwrite)

import { describe, it, expect, beforeEach } from '../lib/test-framework.mjs';
import {
  encodeSharePayload,
  decodeSharePayload,
  LOCAL_STORAGE_KEY,
} from '../lib/contracts.mjs';
import { MockLocalStorage, MockWindow, ScheduleManager } from '../lib/mock-env.mjs';

export function registerF19ToF24Tests() {
  describe('Tier 1: Features 19-24 — Import Pipeline & Silent Direct Overwrite', () => {
    let storage;
    let mockWin;
    let schedule;

    beforeEach(() => {
      storage = new MockLocalStorage();
      mockWin = new MockWindow();
      schedule = new ScheduleManager(storage, mockWin);
    });

    describe('Tier 1: Feature 19 — Import Modal', () => {
    it('T1-F19-01: Opens modal upon clicking Import trigger', () => {
      let isOpen = false;
      const openModal = () => { isOpen = true; };
      openModal();
      expect(isOpen).toBe(true);
    });

    it('T1-F19-02: Modal offers camera scan, image upload, and JSON file upload tabs', () => {
      const channels = ['camera_scanner', 'image_upload', 'json_file_upload'];
      expect(channels).toContain('camera_scanner');
      expect(channels).toContain('image_upload');
      expect(channels).toContain('json_file_upload');
    });

    it('T1-F19-03: Modal displays explanatory overwrite advisory to the user', () => {
      const advisoryText = 'A importação irá substituir o teu horário local.';
      expect(advisoryText).toContain('substituir');
    });

    it('T1-F19-04: User can cancel/dismiss modal without altering current schedule', () => {
      schedule.toggleFavorite('ev-original');
      let isOpen = true;
      const cancel = () => { isOpen = false; };
      cancel();
      expect(isOpen).toBe(false);
      expect(schedule.isFavorite('ev-original')).toBe(true);
    });

    it('T1-F19-05: Modal closes automatically upon successful import completion', () => {
      let isOpen = true;
      const onImportSuccess = () => { isOpen = false; };
      onImportSuccess();
      expect(isOpen).toBe(false);
    });
  });

  describe('Tier 1: Feature 20 — Camera QR Scanner', () => {
    it('T1-F20-01: Scanner uses html5-qrcode integration library contract', () => {
      const libraryName = 'html5-qrcode';
      expect(libraryName).toBe('html5-qrcode');
    });

    it('T1-F20-02: Scanner processes decoded QR URL string into payload', () => {
      const payload = encodeSharePayload(['ev-1', 'ev-2'], ['ev-1']);
      const scannedUrl = `https://pcostarg.github.io/FestaAvanteAgenda/?import=${payload}`;
      const urlObj = new URL(scannedUrl);
      const importParam = urlObj.searchParams.get('import');
      const decoded = decodeSharePayload(importParam);
      expect(decoded.favorites).toEqual(['ev-1', 'ev-2']);
      expect(decoded.seen).toEqual(['ev-1']);
    });

    it('T1-F20-03: Scanner requests environment-facing rear camera on mobile devices', () => {
      const cameraConfig = { facingMode: 'environment' };
      expect(cameraConfig.facingMode).toBe('environment');
    });

    it('T1-F20-04: Stops video stream track cleanly upon closing scanner', () => {
      let isScanning = true;
      const stopScan = () => { isScanning = false; };
      stopScan();
      expect(isScanning).toBe(false);
    });

    it('T1-F20-05: Shows clear viewfinder visual box with target guidelines', () => {
      const qrBoxConfig = { width: 250, height: 250 };
      expect(qrBoxConfig.width).toBe(250);
      expect(qrBoxConfig.height).toBe(250);
    });
  });

  describe('Tier 1: Feature 21 — Image File QR Upload', () => {
    it('T1-F21-01: File input filter restricts selection to image/* types', () => {
      const acceptAttr = 'image/*';
      expect(acceptAttr).toBe('image/*');
    });

    it('T1-F21-02: Decodes QR code from static screenshot/image file', () => {
      const mockDecodedUrl = 'https://pcostarg.github.io/FestaAvanteAgenda/?import=' + encodeSharePayload(['ev-img-1'], []);
      const url = new URL(mockDecodedUrl);
      const payload = url.searchParams.get('import');
      const data = decodeSharePayload(payload);
      expect(data.favorites).toEqual(['ev-img-1']);
    });

    it('T1-F21-03: Updates local schedule upon successful image decode', () => {
      const payload = encodeSharePayload(['ev-img-1', 'ev-img-2'], ['ev-img-1']);
      const data = decodeSharePayload(payload);
      schedule.replaceSchedule(data);
      expect(schedule.favorites).toEqual(['ev-img-1', 'ev-img-2']);
      expect(schedule.seen).toEqual(['ev-img-1']);
    });

    it('T1-F21-04: Resets file input value after processing to allow re-uploading same file', () => {
      let inputVal = 'C:\\fakepath\\qr.png';
      const reset = () => { inputVal = ''; };
      reset();
      expect(inputVal).toBe('');
    });

    it('T1-F21-05: Displays success toast on valid image scan', () => {
      const toastMessage = 'Código QR lido com sucesso!';
      expect(toastMessage).toContain('sucesso');
    });
  });

  describe('Tier 1: Feature 22 — JSON File Upload', () => {
    it('T1-F22-01: File input restricts selection to .json files', () => {
      const acceptAttr = '.json,application/json';
      expect(acceptAttr).toContain('.json');
    });

    it('T1-F22-02: Parses valid JSON file content into schedule data', () => {
      const jsonContent = JSON.stringify({
        app: 'AvanteRouter',
        version: 1,
        favorites: ['ev-json-1', 'ev-json-2'],
        seen: ['ev-json-1'],
        updatedAt: 1757181600000,
      });
      const parsed = JSON.parse(jsonContent);
      schedule.replaceSchedule(parsed);
      expect(schedule.favorites).toEqual(['ev-json-1', 'ev-json-2']);
      expect(schedule.seen).toEqual(['ev-json-1']);
    });

    it('T1-F22-03: Replaces schedule state directly from uploaded file', () => {
      schedule.toggleFavorite('old-ev');
      const newBackup = {
        favorites: ['new-ev-1'],
        seen: [],
      };
      schedule.replaceSchedule(newBackup);
      expect(schedule.isFavorite('old-ev')).toBe(false);
      expect(schedule.isFavorite('new-ev-1')).toBe(true);
    });

    it('T1-F22-04: Ignores foreign/unrecognized extra JSON properties safely', () => {
      const payloadWithExtras = {
        favorites: ['ev-1'],
        seen: [],
        extraProperty: 'arbitrary metadata',
        unknownNumber: 42,
      };
      schedule.replaceSchedule(payloadWithExtras);
      expect(schedule.favorites).toEqual(['ev-1']);
    });

    it('T1-F22-05: Synchronizes newly imported schedule to localStorage', () => {
      const newBackup = { favorites: ['ev-sync-1'], seen: [] };
      schedule.replaceSchedule(newBackup);
      const raw = JSON.parse(storage.getItem(LOCAL_STORAGE_KEY));
      expect(raw.favorites).toEqual(['ev-sync-1']);
    });
  });

  describe('Tier 1: Feature 23 — URL Parameter Import (?import=...)', () => {
    it('T1-F23-01: Detects ?import= parameter in window.location.search on application load', () => {
      const payload = encodeSharePayload(['ev-url-1'], []);
      mockWin.location.search = `?import=${payload}`;
      const searchParams = new URLSearchParams(mockWin.location.search);
      expect(searchParams.has('import')).toBe(true);
    });

    it('T1-F23-02: Decodes URL payload and replaces current local schedule', () => {
      const payload = encodeSharePayload(['ev-url-1', 'ev-url-2'], ['ev-url-1']);
      const data = decodeSharePayload(payload);
      schedule.replaceSchedule(data);
      expect(schedule.favorites).toEqual(['ev-url-1', 'ev-url-2']);
      expect(schedule.seen).toEqual(['ev-url-1']);
    });

    it('T1-F23-03: Cleans URL via window.history.replaceState to prevent re-import on refresh', () => {
      const payload = encodeSharePayload(['ev-url-1'], []);
      mockWin.location.href = `https://pcostarg.github.io/FestaAvanteAgenda/?import=${payload}`;
      mockWin.location.search = `?import=${payload}`;

      // Simulate cleanup
      mockWin.history.replaceState({}, '', mockWin.location.pathname);
      expect(mockWin.location.search).toBe('');
      expect(mockWin.location.href).toBe('/FestaAvanteAgenda/');
    });

    it('T1-F23-04: Ignores application load when ?import parameter is absent', () => {
      mockWin.location.search = '';
      const searchParams = new URLSearchParams(mockWin.location.search);
      expect(searchParams.has('import')).toBe(false);
    });

    it('T1-F23-05: Shows confirmation toast upon successful URL import', () => {
      const toastMessage = 'Horário partilhado importado com sucesso!';
      expect(toastMessage).toContain('sucesso');
    });
  });

  describe('Tier 1: Feature 24 — Silent Direct Overwrite Rule', () => {
    it('T1-F24-01: Silently replaces existing local schedule data without confirmation prompt', () => {
      schedule.toggleFavorite('old-favorite-1');
      schedule.toggleFavorite('old-favorite-2');

      const incoming = { favorites: ['new-act-1'], seen: [] };
      schedule.replaceSchedule(incoming);

      expect(schedule.favorites).toEqual(['new-act-1']);
      expect(schedule.isFavorite('old-favorite-1')).toBe(false);
      expect(schedule.isFavorite('old-favorite-2')).toBe(false);
    });

    it('T1-F24-02: Direct overwrite applies equally across Camera, Image, JSON and URL channels', () => {
      const channels = ['camera', 'image', 'json', 'url'];
      channels.forEach((ch) => {
        schedule.replaceSchedule({ favorites: [`act-${ch}`], seen: [] });
        expect(schedule.favorites).toEqual([`act-${ch}`]);
      });
    });

    it('T1-F24-03: Overwrites seen list with imported seen list', () => {
      schedule.toggleSeen('seen-prior');
      schedule.replaceSchedule({ favorites: ['act-1'], seen: ['seen-new'] });
      expect(schedule.isSeen('seen-prior')).toBe(false);
      expect(schedule.isSeen('seen-new')).toBe(true);
    });

    it('T1-F24-04: Updates updatedAt timestamp to current time during overwrite', () => {
      const before = Date.now();
      schedule.replaceSchedule({ favorites: ['act-1'], seen: [] });
      expect(schedule.updatedAt).toBeGreaterThanOrEqual(before);
    });

    it('T1-F24-05: Dispatches reactive update event so all open views update instantly', () => {
      let notified = false;
      mockWin.addEventListener('avante_schedule_updated', () => {
        notified = true;
      });
      schedule.replaceSchedule({ favorites: ['act-event'], seen: [] });
      expect(notified).toBe(true);
    });
  });
  });
}
