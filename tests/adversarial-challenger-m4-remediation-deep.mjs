// tests/adversarial-challenger-m4-remediation-deep.mjs
// Empirical Remediation Verification & Adversarial Stress Harness
// Milestone 4 Remediation Challenger
// Festa do Avante! 2025 PWA

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Production modules
import {
  createJsonBackup,
  validateJsonBackup,
  APP_IDENTIFIER,
  SCHEMA_VERSION,
} from '../src/utils/jsonBackup.ts';

import {
  validateScheduleStorage,
  sanitizeIdArray,
  ScheduleStore,
  SCHEDULE_UPDATE_EVENT,
} from '../src/utils/scheduleStorage.ts';

import {
  encodeSharePayload,
  decodeSharePayload,
  extractScheduleFromScannedText,
} from '../src/utils/sharePayload.ts';

import programData from '../src/data/program.json' with { type: 'json' };

console.log('========================================================================');
console.log(' ADVERSARIAL EMPIRICAL HARNESS: M4 REMEDIATION DEEP CHALLENGE');
console.log('========================================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const findings = [];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function test(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    failedTests++;
    console.error(`  [FAIL] ${name}`);
    console.error(`         Error: ${err.message}`);
    findings.push({ test: name, error: err.message, stack: err.stack });
  }
}

// ============================================================================
// PART 1: EMPIRICAL VERIFICATION OF JsonBackupUploader.tsx
// ============================================================================
console.log('\n--- PART 1: JsonBackupUploader Deep Empirical Challenges ---');

// Mock helper simulating JsonBackupUploader.tsx handleFile processing
function simulateJsonBackupUploader(fileMock, callbacks) {
  const { onSuccess, onError } = callbacks;
  let isProcessing = false;
  let errorMessage = null;

  if (!fileMock) return;

  // 1. Format filter validation
  const isJsonExt = fileMock.name.toLowerCase().endsWith('.json');
  const isJsonMime = fileMock.type === 'application/json' || fileMock.type === '';
  if (!isJsonExt && !isJsonMime) {
    const msg = 'Por favor seleciona um ficheiro .json válido.';
    errorMessage = msg;
    onError?.(msg);
    return { isProcessing, errorMessage, success: false };
  }

  isProcessing = true;

  try {
    const text = fileMock.content;
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('Ficheiro JSON corrompido ou inválido.');
    }

    // Logic identical to lines 58-73 in JsonBackupUploader.tsx
    const backupValidation = validateJsonBackup(parsed);
    let isValid = backupValidation.valid;
    let validationError = backupValidation.errors[0];

    if (!isValid) {
      const storageValidation = validateScheduleStorage(parsed);
      if (storageValidation.valid) {
        isValid = true;
      } else {
        validationError =
          backupValidation.errors[0] ||
          storageValidation.errors[0] ||
          'Formato de agenda inválido.';
      }
    }

    if (!isValid) {
      throw new Error(validationError || 'Formato de agenda inválido.');
    }

    const obj = parsed;
    const favorites = sanitizeIdArray(obj.favorites);
    const seen = sanitizeIdArray(obj.seen);

    isProcessing = false;
    onSuccess({ favorites, seen });
    return { isProcessing, errorMessage: null, success: true, data: { favorites, seen } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao processar ficheiro JSON.';
    errorMessage = msg;
    onError?.(msg);
    isProcessing = false;
    return { isProcessing, errorMessage, success: false };
  }
}

await test('CHALLENGE-01: Authentic minha-agenda-avante.json created by createJsonBackup() is accepted without updatedAt', () => {
  const testFavorites = ['ev-fri-p25-01', 'ev-sat-p25-02', 'ev-sun-p25-03'];
  const testSeen = ['ev-fri-p25-01'];
  const backupObject = createJsonBackup(testFavorites, testSeen);

  assert(backupObject.app === APP_IDENTIFIER, 'app must match');
  assert(backupObject.version === SCHEMA_VERSION, 'version must match');
  assert(typeof backupObject.exportedAt === 'string', 'exportedAt must be string');
  assert(backupObject.updatedAt === undefined, 'Authentic backup MUST NOT have updatedAt');

  let successResult = null;
  let errorResult = null;

  const res = simulateJsonBackupUploader(
    {
      name: 'minha-agenda-avante.json',
      type: 'application/json',
      content: JSON.stringify(backupObject, null, 2),
    },
    {
      onSuccess: (d) => { successResult = d; },
      onError: (e) => { errorResult = e; },
    }
  );

  assert(res.success === true, 'Upload must succeed');
  assert(errorResult === null, `No error should occur, got: ${errorResult}`);
  assert(successResult !== null, 'onSuccess must be called');
  assert(successResult.favorites.length === 3, 'All 3 favorites must be restored');
  assert(successResult.seen.length === 1, 'Seen status must be restored');
  assert(successResult.favorites[0] === 'ev-fri-p25-01', 'First favorite restored');
});

await test('CHALLENGE-02: Authentic backup with allEvents summary array restores favorites and seen cleanly', () => {
  const allEvents = Array.isArray(programData) ? programData : programData.events;
  const targetEventIds = allEvents.slice(0, 5).map((e) => e.id);
  const seenEventIds = targetEventIds.slice(0, 2);

  const backupObject = createJsonBackup(targetEventIds, seenEventIds, allEvents);
  assert(Array.isArray(backupObject.events), 'Events summary array must be present');
  assert(backupObject.events.length === 5, '5 events summarized');

  let successResult = null;
  const res = simulateJsonBackupUploader(
    {
      name: 'minha-agenda-avante (1).json',
      type: 'application/json',
      content: JSON.stringify(backupObject),
    },
    {
      onSuccess: (d) => { successResult = d; },
    }
  );

  assert(res.success === true, 'Upload must succeed');
  assert(successResult.favorites.length === 5, 'All 5 favorites restored');
  assert(successResult.seen.length === 2, '2 seen restored');
});

await test('CHALLENGE-03: Backward compatibility with internal storage dumps containing updatedAt is preserved', () => {
  const internalStorageDump = {
    favorites: ['legacy-fav-1', 'legacy-fav-2'],
    seen: ['legacy-fav-1'],
    updatedAt: 1757181600000,
  };

  let successResult = null;
  const res = simulateJsonBackupUploader(
    {
      name: 'backup_internal.json',
      type: 'application/json',
      content: JSON.stringify(internalStorageDump),
    },
    {
      onSuccess: (d) => { successResult = d; },
    }
  );

  assert(res.success === true, 'Legacy storage dump must be accepted');
  assert(successResult.favorites.length === 2, '2 favorites restored');
  assert(successResult.seen.length === 1, '1 seen restored');
});

await test('CHALLENGE-04: Non-.json extension and non-JSON mime types rejected with user-friendly Portuguese error', () => {
  let errorMsg = null;
  const res = simulateJsonBackupUploader(
    {
      name: 'schedule.pdf',
      type: 'application/pdf',
      content: '%PDF-1.4 ...',
    },
    {
      onError: (err) => { errorMsg = err; },
    }
  );

  assert(res.success === false, 'PDF must be rejected');
  assert(errorMsg === 'Por favor seleciona um ficheiro .json válido.', `Expected format error, got: ${errorMsg}`);
});

await test('CHALLENGE-05: Syntax-corrupted JSON rejected with exact Portuguese message', () => {
  let errorMsg = null;
  const res = simulateJsonBackupUploader(
    {
      name: 'corrupted.json',
      type: 'application/json',
      content: '{ "favorites": ["ev-1"], "seen": ',
    },
    {
      onError: (err) => { errorMsg = err; },
    }
  );

  assert(res.success === false, 'Corrupted JSON must fail');
  assert(errorMsg === 'Ficheiro JSON corrompido ou inválido.', `Expected syntax error, got: ${errorMsg}`);
});

await test('CHALLENGE-06: Structurally invalid payload (missing favorites) rejected cleanly', () => {
  let errorMsg = null;
  const res = simulateJsonBackupUploader(
    {
      name: 'invalid_structure.json',
      type: 'application/json',
      content: JSON.stringify({ seen: ['ev-1'] }),
    },
    {
      onError: (err) => { errorMsg = err; },
    }
  );

  assert(res.success === false, 'Missing favorites must fail');
  assert(errorMsg.includes('favorites must be an array'), `Expected favorites error, got: ${errorMsg}`);
});

await test('CHALLENGE-07: Invalid exportedAt timestamp in backup file rejected cleanly', () => {
  let errorMsg = null;
  const res = simulateJsonBackupUploader(
    {
      name: 'bad_date.json',
      type: 'application/json',
      content: JSON.stringify({
        favorites: ['ev-1'],
        seen: [],
        exportedAt: 'NOT_A_VALID_DATE',
      }),
    },
    {
      onError: (err) => { errorMsg = err; },
    }
  );

  assert(res.success === false, 'Invalid exportedAt must fail');
  assert(
    errorMsg.includes('exportedAt must be a valid ISO 8601 date string'),
    `Expected ISO date error, got: ${errorMsg}`
  );
});

await test('CHALLENGE-08: Source code verification of JsonBackupUploader.tsx', () => {
  const uploaderPath = path.join(rootDir, 'src', 'components', 'sharing', 'JsonBackupUploader.tsx');
  const code = fs.readFileSync(uploaderPath, 'utf8');

  assert(code.includes("import { validateJsonBackup } from '../../utils/jsonBackup';"), 'Must import validateJsonBackup');
  assert(code.includes('const backupValidation = validateJsonBackup(parsed);'), 'Must validate using validateJsonBackup');
  assert(code.includes('const storageValidation = validateScheduleStorage(parsed);'), 'Must have fallback to validateScheduleStorage');
});

// ============================================================================
// PART 2: EMPIRICAL STRESS TESTS OF QrScanner.tsx LIFECYCLE & TRACK CLEANUP
// ============================================================================
console.log('\n--- PART 2: QrScanner Camera Lifecycle & Leak Prevention Stress Tests ---');

// Mock camera track to simulate hardware media stream
class MockMediaStreamTrack {
  constructor(kind = 'video') {
    this.kind = kind;
    this.readyState = 'live';
    this.stopped = false;
  }
  stop() {
    this.stopped = true;
    this.readyState = 'ended';
  }
}

// Precise Mock of Html5Qrcode that simulates browser camera acquisition delay
class RealisticMockHtml5Qrcode {
  constructor(elementId, trackStore) {
    this.elementId = elementId;
    this.isScanning = false;
    this.isStarting = false;
    this.isCleared = false;
    this.trackStore = trackStore;
    this.activeTrack = null;
    this.shouldFailStart = false;
    this.startError = null;
    this.startDelayMs = 40;
  }

  async start(cameraConfig, config, onScanSuccess, onScanFailure) {
    this.isStarting = true;

    // Simulate asynchronous hardware camera acquisition
    await new Promise((resolve) => setTimeout(resolve, this.startDelayMs));

    if (this.shouldFailStart) {
      this.isStarting = false;
      throw this.startError || new Error('NotAllowedError: Permission denied');
    }

    this.isStarting = false;
    this.isScanning = true;
    this.activeTrack = new MockMediaStreamTrack('video');
    this.trackStore.add(this.activeTrack);

    this._onScanSuccess = onScanSuccess;
    this._onScanFailure = onScanFailure;
  }

  async stop() {
    if (!this.isScanning) {
      return;
    }
    this.isScanning = false;
    if (this.activeTrack) {
      this.activeTrack.stop();
      this.trackStore.delete(this.activeTrack);
      this.activeTrack = null;
    }
  }

  clear() {
    this.isCleared = true;
    if (this.activeTrack && !this.activeTrack.stopped) {
      this.activeTrack.stop();
      this.trackStore.delete(this.activeTrack);
      this.activeTrack = null;
    }
  }
}

// Simulates the exact React component execution of QrScanner.tsx
function createQrScannerInstance(callbacks, trackStore, options = {}) {
  const { onScanSuccess, onError, onSwitchToFallback } = callbacks;
  let isMounted = true;
  let hasCameraError = false;
  let errorMessage = '';
  let isStarting = true;
  const scannerRef = { current: null };
  const isProcessingRef = { current: false };

  const startScanner = async () => {
    isStarting = true;
    hasCameraError = false;
    errorMessage = '';

    try {
      const scanner = new RealisticMockHtml5Qrcode('qr-camera-live-viewfinder', trackStore);
      if (options.shouldFailStart) {
        scanner.shouldFailStart = true;
        scanner.startError = options.startError;
      }
      if (options.startDelayMs !== undefined) {
        scanner.startDelayMs = options.startDelayMs;
      }
      scannerRef.current = scanner;

      const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };

      await scanner.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          if (!isMounted) return;
          if (isProcessingRef.current) return;
          isProcessingRef.current = true;

          scanner
            .stop()
            .then(() => {
              scanner.clear();
              onScanSuccess?.(decodedText);
            })
            .catch((err) => {
              onScanSuccess?.(decodedText);
            });
        },
        () => {}
      );

      // CRITICAL REMEDIATION CHECK in QrScanner.tsx lines 80-89
      if (!isMounted) {
        try {
          if (scanner.isScanning) {
            await scanner.stop();
            scanner.clear();
          }
        } catch {}
        return;
      }

      if (isMounted) isStarting = false;
    } catch (err) {
      if (!isMounted) return;
      isStarting = false;
      hasCameraError = true;

      const errorStr = String(err);
      let userMessage = 'Não foi possível aceder à câmara.';
      if (errorStr.includes('NotAllowedError') || errorStr.includes('Permission')) {
        userMessage = 'Acesso à câmara recusado. Permite o acesso ou usa o carregamento de ficheiro.';
      } else if (errorStr.includes('NotFoundError')) {
        userMessage = 'Nenhuma câmara encontrada neste dispositivo. Utiliza o carregamento de imagem ou ficheiro JSON.';
      }

      errorMessage = userMessage;
      onError?.(userMessage);
    }
  };

  const startPromise = startScanner();

  // Teardown returned by useEffect
  const unmount = () => {
    isMounted = false;
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          scannerRef.current
            .stop()
            .then(() => scannerRef.current?.clear())
            .catch(() => {});
        } else {
          scannerRef.current.clear();
        }
      } catch {}
    }
  };

  return {
    unmount,
    startPromise,
    scannerRef,
    getState: () => ({ isMounted, hasCameraError, errorMessage, isStarting }),
  };
}

await test('CHALLENGE-09: Unmounting while scanner.start() is pending cleanly halts media tracks and prevents hardware leak', async () => {
  const activeTracks = new Set();
  let errorReported = null;

  const instance = createQrScannerInstance(
    {
      onScanSuccess: () => {},
      onError: (e) => { errorReported = e; },
    },
    activeTracks,
    { startDelayMs: 50 }
  );

  // Unmount after 15ms while camera is still initializing
  await new Promise((resolve) => setTimeout(resolve, 15));
  instance.unmount();

  // Wait for scanner start promise to complete
  await instance.startPromise;

  // Verify that activeTracks is 0 and no tracks remain live
  assert(activeTracks.size === 0, `Hardware leak detected! ${activeTracks.size} active tracks remained alive`);
  assert(errorReported === null, 'Should not report error on clean unmount');
  assert(instance.scannerRef.current.isScanning === false, 'Scanner must be stopped');
  assert(instance.scannerRef.current.isCleared === true, 'Scanner must be cleared');
});

await test('CHALLENGE-10: Rapid mount/unmount stress test across 50 random acquisition delays (0ms to 60ms)', async () => {
  const activeTracks = new Set();

  for (let i = 0; i < 50; i++) {
    const acquisitionDelay = Math.floor(Math.random() * 60) + 10;
    const unmountDelay = Math.floor(Math.random() * 80);

    const instance = createQrScannerInstance(
      { onScanSuccess: () => {} },
      activeTracks,
      { startDelayMs: acquisitionDelay }
    );

    if (unmountDelay > 0) {
      await new Promise((r) => setTimeout(r, unmountDelay));
    }
    instance.unmount();

    await instance.startPromise;
  }

  assert(activeTracks.size === 0, `Active tracks leaked across stress cycles! Count: ${activeTracks.size}`);
});

await test('CHALLENGE-11: If camera initialization rejects after unmount, no state updates or onError are fired', async () => {
  const activeTracks = new Set();
  let errorFired = false;

  const instance = createQrScannerInstance(
    {
      onError: () => { errorFired = true; },
    },
    activeTracks,
    {
      startDelayMs: 40,
      shouldFailStart: true,
      startError: new Error('NotAllowedError: Permission denied by user'),
    }
  );

  // Unmount before failure occurs
  await new Promise((r) => setTimeout(r, 10));
  instance.unmount();

  await instance.startPromise;

  assert(!errorFired, 'onError must NOT fire after component unmount');
  assert(instance.getState().hasCameraError === false, 'State must NOT be mutated after unmount');
});

await test('CHALLENGE-12: On successful scan, camera is stopped and duplicate frames are strictly suppressed', async () => {
  const activeTracks = new Set();
  let scanCount = 0;
  let receivedText = null;

  const instance = createQrScannerInstance(
    {
      onScanSuccess: (txt) => {
        scanCount++;
        receivedText = txt;
      },
    },
    activeTracks,
    { startDelayMs: 10 }
  );

  await instance.startPromise;
  const scanner = instance.scannerRef.current;
  assert(scanner.isScanning === true, 'Scanner must be active');
  assert(activeTracks.size === 1, '1 active camera track');

  // Trigger scan callback 5 times in rapid succession
  scanner._onScanSuccess('avante:payload:test1');
  scanner._onScanSuccess('avante:payload:test1');
  scanner._onScanSuccess('avante:payload:test1');
  scanner._onScanSuccess('avante:payload:test2');

  // Allow microtasks to settle
  await new Promise((r) => setTimeout(r, 20));

  assert(scanCount === 1, `Scan callback must fire exactly ONCE, fired ${scanCount} times`);
  assert(receivedText === 'avante:payload:test1', 'Decoded text matches first detected frame');
  assert(scanner.isScanning === false, 'Scanner must be stopped after detection');
  assert(activeTracks.size === 0, 'Camera track stopped after detection');

  instance.unmount();
});

await test('CHALLENGE-13: QrScanner.tsx static source code analysis confirms unmount safeguards and catch blocks', () => {
  const scannerPath = path.join(rootDir, 'src', 'components', 'sharing', 'QrScanner.tsx');
  const code = fs.readFileSync(scannerPath, 'utf8');

  // 1. Check isMounted guard after start()
  assert(
    code.includes('if (!isMounted)') &&
    code.includes('if (scanner.isScanning)') &&
    code.includes('await scanner.stop()') &&
    code.includes('scanner.clear()'),
    'QrScanner.tsx must verify !isMounted after await scanner.start() and stop/clear scanner'
  );

  // 2. Check isMounted guard in catch block
  assert(
    code.includes('catch (err: unknown) {\n        if (!isMounted) return;') ||
    code.includes('catch (err: unknown) {') && code.includes('if (!isMounted) return;'),
    'Catch block must guard against unmounted state'
  );

  // 3. Check duplicate suppression flag
  assert(
    code.includes('isProcessingRef.current'),
    'Duplicate suppression via isProcessingRef must be present'
  );
});

// ============================================================================
// SUMMARY & RESULTS
// ============================================================================
console.log('\n========================================================================');
console.log(' ADVERSARIAL EMPIRICAL HARNESS SUMMARY');
console.log('========================================================================');
console.log(`  Total Challenges : ${totalTests}`);
console.log(`  Passed           : ${passedTests}`);
console.log(`  Failed           : ${failedTests}`);
console.log('========================================================================\n');

if (failedTests > 0) {
  console.log('FAILURES FOUND:');
  findings.forEach((f, idx) => {
    console.log(`[#${idx + 1}] ${f.test}: ${f.error}`);
  });
  process.exit(1);
} else {
  console.log('✔ ALL EMPIRICAL CHALLENGES PASSED! VERDICT: APPROVE');
  process.exit(0);
}
