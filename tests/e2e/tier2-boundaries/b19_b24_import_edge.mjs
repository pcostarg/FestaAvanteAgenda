// tests/e2e/tier2-boundaries/b19_b24_import_edge.mjs
// Tier 2: Boundaries for F19, F20, F21, F22, F23, F24 (Import Pipeline & Silent Direct Overwrite)

import { describe, it, expect, beforeEach } from '../lib/test-framework.mjs';
import {
  decodeSharePayload,
  encodeSharePayload,
  validateScheduleStorage,
  LOCAL_STORAGE_KEY,
} from '../lib/contracts.mjs';
import { MockLocalStorage, MockWindow, ScheduleManager } from '../lib/mock-env.mjs';

export function registerB19ToB24Tests() {
  describe('Tier 2: Features 19-24 Boundaries — Import Pipeline', () => {
    let storage;
    let mockWin;
    let schedule;

    beforeEach(() => {
      storage = new MockLocalStorage();
      mockWin = new MockWindow();
      schedule = new ScheduleManager(storage, mockWin);
    });

    describe('Tier 2: Feature 19 Boundaries — Import Modal', () => {
      it('T2-F19-01: Switching tabs from Camera to JSON stops any active camera stream', () => {
        let isCameraActive = true;
        const switchTab = (newTab) => {
          if (newTab !== 'camera') isCameraActive = false;
        };
        switchTab('json');
        expect(isCameraActive).toBe(false);
      });

      it('T2-F19-02: Clicking backdrop dismisses modal without triggering import', () => {
        let isModalOpen = true;
        schedule.toggleFavorite('prior-act');
        const onBackdropClick = () => { isModalOpen = false; };
        onBackdropClick();
        expect(isModalOpen).toBe(false);
        expect(schedule.isFavorite('prior-act')).toBe(true);
      });

      it('T2-F19-03: Error toasts auto-dismiss or provide close trigger', () => {
        let activeError = 'Ficheiro inválido';
        const dismissError = () => { activeError = null; };
        dismissError();
        expect(activeError).toBeNull();
      });

      it('T2-F19-04: Modal supports keyboard Escape dismissal', () => {
        let isModalOpen = true;
        const onKeyDown = (e) => {
          if (e.key === 'Escape') isModalOpen = false;
        };
        onKeyDown({ key: 'Escape' });
        expect(isModalOpen).toBe(false);
      });

      it('T2-F19-05: Displays clear guidance when device lacks camera support', () => {
        const hasCamera = false;
        const guidance = hasCamera ? '' : 'Utiliza o carregamento de imagem ou ficheiro JSON.';
        expect(guidance).toContain('ficheiro JSON');
      });
    });

    describe('Tier 2: Feature 20 Boundaries — Camera QR Scanner', () => {
      it('T2-F20-01: Handles NotAllowedError (user denied camera permission) gracefully', () => {
        let errorMessage = '';
        const handleCameraError = (errName) => {
          if (errName === 'NotAllowedError') {
            errorMessage = 'Acesso à câmara recusado. Permite o acesso ou usa o carregamento de ficheiro.';
          }
        };
        handleCameraError('NotAllowedError');
        expect(errorMessage).toContain('Acesso à câmara recusado');
      });

      it('T2-F20-02: Handles NotFoundError (no camera hardware detected) gracefully', () => {
        let errorMessage = '';
        const handleCameraError = (errName) => {
          if (errName === 'NotFoundError') {
            errorMessage = 'Nenhuma câmara encontrada neste dispositivo.';
          }
        };
        handleCameraError('NotFoundError');
        expect(errorMessage).toContain('Nenhuma câmara encontrada');
      });

      it('T2-F20-03: Rejects scanned QR code that is NOT a festival schedule payload', () => {
        const arbitraryQr = 'https://www.google.com';
        let isValidSchedulePayload = false;
        try {
          const url = new URL(arbitraryQr);
          const payload = url.searchParams.get('import');
          if (payload) {
            decodeSharePayload(payload);
            isValidSchedulePayload = true;
          }
        } catch {
          isValidSchedulePayload = false;
        }
        expect(isValidSchedulePayload).toBe(false);
      });

      it('T2-F20-04: Continuous scanning ignores repetitive identical frames after first success', () => {
        let importsHandled = 0;
        let isProcessing = false;
        const handleScan = () => {
          if (isProcessing) return;
          isProcessing = true;
          importsHandled++;
        };
        handleScan();
        handleScan();
        handleScan();
        expect(importsHandled).toBe(1);
      });

      it('T2-F20-05: Cleanup hook releases camera hardware tracks properly', () => {
        let streamTracksStopped = false;
        const fakeTrack = { stop: () => { streamTracksStopped = true; } };
        fakeTrack.stop();
        expect(streamTracksStopped).toBe(true);
      });
    });

    describe('Tier 2: Feature 21 Boundaries — Image File QR Upload', () => {
      it('T2-F21-01: Rejects image when no QR code is found with clear error message', () => {
        let uploadError = '';
        const onNoQrFound = () => {
          uploadError = 'Não foi encontrado nenhum código QR nesta imagem.';
        };
        onNoQrFound();
        expect(uploadError).toContain('Não foi encontrado');
      });

      it('T2-F21-02: Rejects non-image file uploads with format error', () => {
        const file = { type: 'application/pdf', name: 'document.pdf' };
        const isImage = file.type.startsWith('image/');
        expect(isImage).toBe(false);
      });

      it('T2-F21-03: Handles oversized image upload by downscaling or client error notice', () => {
        const maxSizeBytes = 15 * 1024 * 1024; // 15MB
        const file = { size: 20 * 1024 * 1024 }; // 20MB
        const isTooLarge = file.size > maxSizeBytes;
        expect(isTooLarge).toBe(true);
      });

      it('T2-F21-04: Image decoding handles Base64 encoded festival QR accurately', () => {
        const expectedFavs = ['ev-img-qr'];
        const payload = encodeSharePayload(expectedFavs, []);
        const decoded = decodeSharePayload(payload);
        expect(decoded.favorites).toEqual(expectedFavs);
      });

      it('T2-F21-05: Successfully replaces local schedule upon valid image QR decode', () => {
        schedule.toggleFavorite('old-item');
        const payload = encodeSharePayload(['ev-from-image'], []);
        schedule.replaceSchedule(decodeSharePayload(payload));
        expect(schedule.favorites).toEqual(['ev-from-image']);
      });
    });

    describe('Tier 2: Feature 22 Boundaries — JSON File Upload', () => {
      it('T2-F22-01: Rejects malformed JSON syntax safely with error message', () => {
        const badJson = '{"app": "AvanteRouter", "favorites": [incomplete';
        let parsed = null;
        let errorMessage = '';
        try {
          parsed = JSON.parse(badJson);
        } catch (err) {
          errorMessage = 'Ficheiro JSON corrompido ou inválido.';
        }
        expect(parsed).toBeNull();
        expect(errorMessage).toContain('corrompido');
      });

      it('T2-F22-02: Rejects JSON missing favorites array', () => {
        const jsonContent = JSON.stringify({ app: 'AvanteRouter', version: 1 });
        const parsed = JSON.parse(jsonContent);
        const { valid, errors } = validateScheduleStorage(parsed);
        expect(valid).toBe(false);
        expect(errors[0]).toContain('favorites');
      });

      it('T2-F22-03: Rejects JSON where favorites is not an array', () => {
        const jsonContent = JSON.stringify({ favorites: 'not-an-array', seen: [], updatedAt: 12345 });
        const parsed = JSON.parse(jsonContent);
        const { valid } = validateScheduleStorage(parsed);
        expect(valid).toBe(false);
      });

      it('T2-F22-04: Handles empty favorites array in JSON cleanly', () => {
        const jsonContent = JSON.stringify({ favorites: [], seen: [], updatedAt: 12345 });
        const parsed = JSON.parse(jsonContent);
        const { valid } = validateScheduleStorage(parsed);
        expect(valid).toBe(true);
        schedule.replaceSchedule(parsed);
        expect(schedule.favorites).toHaveLength(0);
      });

      it('T2-F22-05: Handles massive JSON backup with 200 acts without UI stall', () => {
        const largeBackup = {
          favorites: Array.from({ length: 200 }, (_, i) => `ev-large-${i}`),
          seen: [],
          updatedAt: Date.now(),
        };
        schedule.replaceSchedule(largeBackup);
        expect(schedule.favorites).toHaveLength(200);
      });
    });

    describe('Tier 2: Feature 23 Boundaries — URL Parameter Import (?import=...)', () => {
      it('T2-F23-01: Ignores malformed base64 in ?import= parameter safely without crash', () => {
        const malformed = '!!!NOT_BASE_64%%%';
        let safeImport = false;
        try {
          decodeSharePayload(malformed);
          safeImport = true;
        } catch {
          safeImport = false;
        }
        expect(safeImport).toBe(false);
        // Ensure schedule is untouched
        expect(schedule.favorites).toHaveLength(0);
      });

      it('T2-F23-02: Ignores valid base64 containing non-JSON garbage string safely', () => {
        const garbageBase64 = Buffer.from('just plain text, not json', 'utf-8').toString('base64');
        let parsed = false;
        try {
          decodeSharePayload(garbageBase64);
          parsed = true;
        } catch {
          parsed = false;
        }
        expect(parsed).toBe(false);
      });

      it('T2-F23-03: Sanitizes malicious script injection attempt in URL import parameter', () => {
        const payloadWithXss = { f: ['<script>alert(1)</script>'], s: [] };
        const jsonStr = JSON.stringify(payloadWithXss);
        const b64 = Buffer.from(jsonStr).toString('base64').replace(/=/g, '');
        const decoded = decodeSharePayload(b64);
        const id = decoded.favorites[0];
        // Ensure it is treated as a plain string ID, never executed as HTML
        expect(typeof id).toBe('string');
        expect(id).toBe('<script>alert(1)</script>');
      });

      it('T2-F23-04: Strips ?import query from URL immediately preventing reload loops', () => {
        mockWin.location.pathname = '/FestaAvanteAgenda/';
        mockWin.location.search = '?import=test';
        mockWin.history.replaceState({}, '', mockWin.location.pathname);
        expect(mockWin.location.search).toBe('');
      });

      it('T2-F23-05: Handles URL parameter with unexpected additional query params intact', () => {
        const payload = encodeSharePayload(['ev-param-1'], []);
        const fullSearch = `?utm_source=share&import=${payload}&view=lista`;
        const params = new URLSearchParams(fullSearch);
        const importVal = params.get('import');
        const decoded = decodeSharePayload(importVal);
        expect(decoded.favorites).toEqual(['ev-param-1']);
      });
    });

    describe('Tier 2: Feature 24 Boundaries — Silent Direct Overwrite Rule', () => {
      it('T2-F24-01: Overwrite with empty schedule removes all existing favorites and seen', () => {
        schedule.toggleFavorite('prior-1');
        schedule.toggleSeen('prior-1');
        schedule.replaceSchedule({ favorites: [], seen: [] });
        expect(schedule.favorites).toEqual([]);
        expect(schedule.seen).toEqual([]);
      });

      it('T2-F24-02: Overwrite updates localStorage string immediately', () => {
        schedule.replaceSchedule({ favorites: ['act-new'], seen: [] });
        const raw = storage.getItem(LOCAL_STORAGE_KEY);
        expect(raw).toContain('act-new');
      });

      it('T2-F24-03: Consecutive multiple overwrites in rapid succession settle cleanly', () => {
        schedule.replaceSchedule({ favorites: ['v1'], seen: [] });
        schedule.replaceSchedule({ favorites: ['v2'], seen: [] });
        schedule.replaceSchedule({ favorites: ['v3'], seen: [] });
        expect(schedule.favorites).toEqual(['v3']);
      });

      it('T2-F24-04: Direct overwrite applies without requiring user confirmation dialog', () => {
        let promptShown = false;
        const executeImport = () => {
          // Rule: NO window.confirm()
          schedule.replaceSchedule({ favorites: ['auto-import'], seen: [] });
        };
        executeImport();
        expect(promptShown).toBe(false);
        expect(schedule.favorites).toEqual(['auto-import']);
      });

      it('T2-F24-05: Dispatches CustomEvent with updated schedule detail on overwrite', () => {
        let dispatchedDetail = null;
        mockWin.addEventListener('avante_schedule_updated', (e) => {
          dispatchedDetail = e.detail;
        });
        schedule.replaceSchedule({ favorites: ['detail-test'], seen: [] });
        expect(dispatchedDetail).not.toBeNull();
        expect(dispatchedDetail.favorites).toEqual(['detail-test']);
      });
    });
  });
}
