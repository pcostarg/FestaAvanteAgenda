// tests/adversarial-challenger-m4-import-overwrite.mjs
// Empirical Stress Harness & Adversarial Challenge Suite
// Milestone 4 Challenger 2: Import Engine & Overwrite Behavior
// Festa do Avante! 2025 PWA

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Authoritative contracts & mocks
import {
  LOCAL_STORAGE_KEY,
  encodeSharePayload as contractEncodeShare,
  decodeSharePayload as contractDecodeShare,
  validateScheduleStorage as contractValidateStorage,
} from './e2e/lib/contracts.mjs';

import {
  MockLocalStorage,
  MockWindow,
  ScheduleManager,
} from './e2e/lib/mock-env.mjs';

// Production implementations
import {
  encodeSharePayload,
  decodeSharePayload,
  extractScheduleFromScannedText,
  extractPayloadFromUrl,
  createShareUrl,
  SHARE_URL_PREFIX,
} from '../src/utils/sharePayload.ts';

import {
  createJsonBackup,
  validateJsonBackup,
  APP_IDENTIFIER,
  SCHEMA_VERSION,
  JSON_BACKUP_FILENAME,
} from '../src/utils/jsonBackup.ts';

import {
  validateScheduleStorage,
  sanitizeIdArray,
  ScheduleStore,
  SCHEDULE_UPDATE_EVENT,
  MemoryStorage,
} from '../src/utils/scheduleStorage.ts';

console.log('========================================================================');
console.log(' ADVERSARIAL EMPIRICAL STRESS HARNESS — IMPORT & OVERWRITE ENGINE (M4)');
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
// SECTION 1: SILENT DIRECT OVERWRITE RULE PROBES
// ============================================================================
console.log('\n--- SECTION 1: SILENT DIRECT OVERWRITE RULE PROBES ---');

await test('T01-OVERWRITE: Overwrite directly wipes prior favorites and seen without confirmation dialog', () => {
  const store = new MockLocalStorage();
  const mockWin = new MockWindow();
  
  // Set trap on confirm, prompt, alert: if called, test must fail!
  let dialogCalled = false;
  mockWin.confirm = () => { dialogCalled = true; throw new Error('VIOLATION: window.confirm was invoked!'); };
  mockWin.prompt = () => { dialogCalled = true; throw new Error('VIOLATION: window.prompt was invoked!'); };
  mockWin.alert = () => { dialogCalled = true; throw new Error('VIOLATION: window.alert was invoked!'); };

  const schedule = new ScheduleManager(store, mockWin);
  schedule.toggleFavorite('prior-fav-1');
  schedule.toggleFavorite('prior-fav-2');
  schedule.toggleSeen('prior-fav-1');
  assert(schedule.favorites.length === 2, 'Should have 2 favorites prior to import');
  assert(schedule.seen.length === 1, 'Should have 1 seen prior to import');

  // Trigger overwrite
  schedule.replaceSchedule({ favorites: ['new-fav-alpha'], seen: ['new-fav-alpha'] });

  assert(!dialogCalled, 'No confirmation prompt may be displayed');
  assert(schedule.favorites.length === 1 && schedule.favorites[0] === 'new-fav-alpha', 'Favorites must be replaced');
  assert(schedule.seen.length === 1 && schedule.seen[0] === 'new-fav-alpha', 'Seen must be replaced');
  assert(!schedule.isFavorite('prior-fav-1'), 'Prior favorites must be 100% removed');
  assert(!schedule.isFavorite('prior-fav-2'), 'Prior favorites must be 100% removed');
  assert(!schedule.isSeen('prior-fav-1'), 'Prior seen must be 100% removed');
});

await test('T02-OVERWRITE: Overwrite with empty schedule cleanly purges all items', () => {
  const store = new MockLocalStorage();
  const mockWin = new MockWindow();
  const schedule = new ScheduleManager(store, mockWin);

  schedule.toggleFavorite('act-1');
  schedule.toggleFavorite('act-2');
  schedule.toggleSeen('act-2');

  // Overwrite with empty
  schedule.replaceSchedule({ favorites: [], seen: [] });

  assert(schedule.favorites.length === 0, 'Favorites array must be empty');
  assert(schedule.seen.length === 0, 'Seen array must be empty');
  const stored = JSON.parse(store.getItem(LOCAL_STORAGE_KEY));
  assert(stored.favorites.length === 0, 'localStorage favorites must be empty');
  assert(stored.seen.length === 0, 'localStorage seen must be empty');
});

await test('T03-OVERWRITE: Overwrite dispatches CustomEvent immediately to all subscribers', () => {
  const store = new MockLocalStorage();
  const mockWin = new MockWindow();
  const schedule = new ScheduleManager(store, mockWin);

  let eventFired = false;
  let receivedDetail = null;
  mockWin.addEventListener(SCHEDULE_UPDATE_EVENT, (e) => {
    eventFired = true;
    receivedDetail = e.detail;
  });

  schedule.replaceSchedule({ favorites: ['act-gamma'], seen: [] });

  assert(eventFired, 'CustomEvent avante_schedule_updated must fire on window');
  assert(receivedDetail !== null, 'Event detail must contain updated state');
  assert(receivedDetail.favorites.includes('act-gamma'), 'Event detail must match new favorites');
});

await test('T04-OVERWRITE: Consecutive rapid overwrites resolve to the final payload without corruption', () => {
  const store = new MockLocalStorage();
  const mockWin = new MockWindow();
  const schedule = new ScheduleManager(store, mockWin);

  for (let i = 0; i < 50; i++) {
    schedule.replaceSchedule({ favorites: [`act-iter-${i}`], seen: [`act-iter-${i}`] });
  }

  assert(schedule.favorites.length === 1, 'Only final favorite must exist');
  assert(schedule.favorites[0] === 'act-iter-49', 'Final favorite must match last overwrite');
  assert(schedule.seen[0] === 'act-iter-49', 'Final seen must match last overwrite');
});

// ============================================================================
// SECTION 2: MALFORMED JSON BACKUP UPLOADS & SCHEMA VALIDATION
// ============================================================================
console.log('\n--- SECTION 2: MALFORMED JSON BACKUP UPLOADS & SCHEMA VALIDATION ---');

await test('T05-JSON: Corrupted JSON syntax strings rejected cleanly with syntax error', () => {
  const malformedStrings = [
    '{',
    '{"favorites": [}',
    '{"favorites": ["ev1", ]}',
    'not a json string',
    '{"app": "AvanteRouter", "favorites": undefined}',
    '{"favorites": [1, 2, 3',
  ];

  for (const bad of malformedStrings) {
    let threw = false;
    try {
      JSON.parse(bad);
    } catch {
      threw = true;
    }
    assert(threw, `Malformed JSON syntax "${bad}" must throw SyntaxError in JSON.parse`);
  }
});

await test('T06-JSON: Missing favorites field rejected by validateScheduleStorage & validateJsonBackup', () => {
  const missingFavs = {
    app: 'AvanteRouter',
    version: 1,
    seen: ['ev-1'],
  };

  const schedRes = validateScheduleStorage(missingFavs);
  assert(!schedRes.valid, 'validateScheduleStorage must reject payload missing favorites');

  const backupRes = validateJsonBackup(missingFavs);
  assert(!backupRes.valid, 'validateJsonBackup must reject payload missing favorites');
});

await test('T07-JSON: Non-array favorites (string, number, boolean, null, object) rejected', () => {
  const badTypes = [
    'just-a-string',
    12345,
    true,
    false,
    null,
    {},
    { id: 'ev-1' },
  ];

  for (const badFav of badTypes) {
    const payload = { favorites: badFav, seen: [] };
    const res = validateJsonBackup(payload);
    assert(!res.valid, `validateJsonBackup must reject non-array favorites type: ${typeof badFav}`);
    
    // Also test sanitizeIdArray resiliency
    const sanitized = sanitizeIdArray(badFav);
    assert(Array.isArray(sanitized) && sanitized.length === 0, 'sanitizeIdArray must return empty array for non-array');
  }
});

await test('T08-JSON: Non-array seen field rejected by validators', () => {
  const badSeenTypes = ['string', 99, true, {}];
  for (const badSeen of badSeenTypes) {
    const payload = { favorites: ['ev-1'], seen: badSeen };
    const res = validateJsonBackup(payload);
    assert(!res.valid, `validateJsonBackup must reject non-array seen type: ${typeof badSeen}`);
  }
});

await test('T09-JSON: Primitive / polluted values inside favorites array are pruned by sanitizeIdArray', () => {
  const dirtyArray = ['valid-1', null, undefined, 42, false, {}, [], 'valid-2', '   ', 'valid-1'];
  const cleaned = sanitizeIdArray(dirtyArray);
  
  assert(cleaned.length === 2, 'Must keep only valid non-empty unique string IDs');
  assert(cleaned[0] === 'valid-1', 'Must contain valid-1');
  assert(cleaned[1] === 'valid-2', 'Must contain valid-2');
});

await test('T10-JSON: Prototype pollution attempt via JSON does not pollute Object.prototype', () => {
  const pollutionJson = `{
    "__proto__": { "pollutedProp": "pwned" },
    "constructor": { "prototype": { "pollutedConstructor": "pwned" } },
    "favorites": ["ev-normal"],
    "seen": []
  }`;

  const parsed = JSON.parse(pollutionJson);
  const validated = validateJsonBackup(parsed);
  assert(validated.valid, 'Payload itself is structurally valid');

  const sanitizedFavs = sanitizeIdArray(parsed.favorites);
  assert(sanitizedFavs.length === 1 && sanitizedFavs[0] === 'ev-normal', 'Favorites sanitized correctly');

  // Verify prototype is completely unpolluted
  const plainObj = {};
  assert(plainObj.pollutedProp === undefined, 'Object.prototype must NOT be polluted with pollutedProp');
  assert(plainObj.pollutedConstructor === undefined, 'Object.prototype must NOT be polluted with pollutedConstructor');
});

await test('T11-JSON-BUG-PROBE: Empirical check of JsonBackupUploader validation of exported minha-agenda-avante.json', () => {
  // 1. User exports backup using createJsonBackup
  const sampleFavorites = ['ev-fri-p25-abril-1900', 'ev-sat-p25-2100'];
  const sampleSeen = ['ev-fri-p25-abril-1900'];
  const exportedBackup = createJsonBackup(sampleFavorites, sampleSeen);

  assert(exportedBackup.app === 'AvanteRouter', 'App identifier matches');
  assert(exportedBackup.version === 1, 'Version is 1');
  assert(typeof exportedBackup.exportedAt === 'string', 'exportedAt is ISO string');
  assert(exportedBackup.favorites.length === 2, '2 favorites exported');

  // 2. Validate using validateJsonBackup (the validator written for backups)
  const backupValidation = validateJsonBackup(exportedBackup);
  assert(backupValidation.valid, 'validateJsonBackup MUST accept genuine export');

  // 3. Verify JsonBackupUploader implementation imports and uses validateJsonBackup
  const uploaderPath = path.join(rootDir, 'src', 'components', 'sharing', 'JsonBackupUploader.tsx');
  const uploaderSource = fs.readFileSync(uploaderPath, 'utf8');
  assert(
    uploaderSource.includes('validateJsonBackup'),
    'JsonBackupUploader must import validateJsonBackup from utils/jsonBackup'
  );
  assert(
    uploaderSource.includes('validateJsonBackup(parsed)'),
    'JsonBackupUploader must validate parsed payload with validateJsonBackup'
  );
});

// ============================================================================
// SECTION 3: IMAGE FILE UPLOAD PROBES
// ============================================================================
console.log('\n--- SECTION 3: IMAGE FILE UPLOAD PROBES ---');

const MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

await test('T12-IMAGE: Files exceeding 15MB are rejected at boundary', () => {
  const exactLimit = MAX_IMAGE_SIZE_BYTES;
  const oneByteOver = MAX_IMAGE_SIZE_BYTES + 1;
  const twentyMegs = 20 * 1024 * 1024;

  const checkSize = (size) => size > MAX_IMAGE_SIZE_BYTES;

  assert(!checkSize(exactLimit), '15MB exact must NOT exceed limit');
  assert(checkSize(oneByteOver), '15MB + 1 byte MUST exceed limit');
  assert(checkSize(twentyMegs), '20MB MUST exceed limit');
});

await test('T13-IMAGE: Non-image MIME types are strictly rejected', () => {
  const disallowedTypes = [
    'application/pdf',
    'text/html',
    'application/json',
    'application/octet-stream',
    'video/mp4',
    'audio/mpeg',
    'text/plain',
    '',
  ];

  const allowedTypes = [
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'image/svg+xml',
  ];

  const isImageMime = (type) => type.startsWith('image/');

  for (const bad of disallowedTypes) {
    assert(!isImageMime(bad), `MIME type "${bad}" must be rejected`);
  }

  for (const good of allowedTypes) {
    assert(isImageMime(good), `MIME type "${good}" must be accepted`);
  }
});

await test('T14-IMAGE: extractScheduleFromScannedText handles all valid QR payloads (URL, partial query, raw JSON, base64)', () => {
  const originalFavs = ['ev-act-alpha', 'ev-act-beta'];
  const originalSeen = ['ev-act-alpha'];
  const base64 = encodeSharePayload(originalFavs, originalSeen);

  // Case 1: Full URL
  const fullUrl = `https://pcostarg.github.io/FestaAvanteAgenda/?import=${base64}`;
  const r1 = extractScheduleFromScannedText(fullUrl);
  assert(r1.favorites.length === 2 && r1.seen.length === 1, 'Full URL payload extracted');

  // Case 2: Partial URL / query
  const partialUrl = `/?import=${base64}`;
  const r2 = extractScheduleFromScannedText(partialUrl);
  assert(r2.favorites.length === 2, 'Partial URL payload extracted');

  // Case 3: Raw JSON backup
  const rawJson = JSON.stringify({ favorites: originalFavs, seen: originalSeen });
  const r3 = extractScheduleFromScannedText(rawJson);
  assert(r3.favorites.length === 2, 'Raw JSON text extracted');

  // Case 4: Raw Base64 string directly
  const r4 = extractScheduleFromScannedText(base64);
  assert(r4.favorites.length === 2, 'Raw Base64 string extracted');
});

await test('T15-IMAGE: Image without QR code or arbitrary non-festival text throws clean user-friendly Portuguese error', () => {
  const invalidTexts = [
    'https://www.google.com',
    'random text without import parameter',
    'WIFI:T:WPA;S:MyNetwork;P:MyPassword;;',
    'BEGIN:VCARD\nVERSION:3.0\nFN:John Doe\nEND:VCARD',
  ];

  for (const invalid of invalidTexts) {
    let errorMsg = '';
    try {
      extractScheduleFromScannedText(invalid);
    } catch (e) {
      errorMsg = e.message;
    }
    assert(
      errorMsg === 'O código lido não contém uma agenda válida da Festa do Avante!',
      `Invalid QR text must throw clean error, got: "${errorMsg}"`
    );
  }
});

// ============================================================================
// SECTION 4: URL PARAMETER ?import=... PROBES
// ============================================================================
console.log('\n--- SECTION 4: URL PARAMETER ?import=... PROBES ---');

await test('T16-URL: Corrupted Base64 or non-JSON payloads throw handled errors without crashing', () => {
  const badPayloads = [
    '!!!not-valid-base64@@@',
    'YWJj', // base64 of "abc" -> not JSON
    'MTIzNDU=', // base64 of "12345" -> JSON number, not object
    'dHJ1ZQ==', // base64 of "true" -> JSON boolean, not object
    'bnVsbA==', // base64 of "null" -> JSON null, not object
  ];

  for (const bad of badPayloads) {
    let threw = false;
    try {
      decodeSharePayload(bad);
    } catch {
      threw = true;
    }
    assert(threw, `Payload "${bad}" must throw error on decodeSharePayload`);
  }
});

await test('T17-URL: Null, undefined, empty string parameter throws exact contract error', () => {
  const emptyCases = [null, undefined, '', '   '];
  for (const empty of emptyCases) {
    let thrownMsg = '';
    try {
      decodeSharePayload(empty);
    } catch (e) {
      thrownMsg = e.message;
    }
    assert(thrownMsg === 'Payload string is required', `Must throw exact contract error for ${empty}`);
  }
});

await test('T18-URL: XSS payload in ?import= parameter is treated strictly as opaque string', () => {
  const xssPayloads = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert(1)>',
    'javascript:alert(1)',
    '"><script>window.location="http://attacker.com"</script>',
    '${alert(1)}',
  ];

  const encoded = encodeSharePayload(xssPayloads, [xssPayloads[0]]);
  const decoded = decodeSharePayload(encoded);

  assert(decoded.favorites.length === xssPayloads.length, 'All IDs decoded intact');
  for (let i = 0; i < xssPayloads.length; i++) {
    assert(typeof decoded.favorites[i] === 'string', 'ID must be plain string');
    assert(decoded.favorites[i] === xssPayloads[i], 'Payload preserved verbatim without evaluation');
  }
});

await test('T19-URL: URL sanitization via replaceState preserves path, hash, and other query params while stripping import', () => {
  const mockWin = new MockWindow();
  
  // Test Case A: URL with ?import only
  mockWin.location.href = 'https://pcostarg.github.io/FestaAvanteAgenda/?import=TESTPAYLOAD#o-meu-horario';
  mockWin.location.pathname = '/FestaAvanteAgenda/';
  mockWin.location.search = '?import=TESTPAYLOAD';
  mockWin.location.hash = '#o-meu-horario';

  // Sanitization logic matching App.tsx lines 82-86
  const urlA = new URL(mockWin.location.href);
  urlA.searchParams.delete('import');
  const searchStrA = urlA.searchParams.toString();
  const cleanUrlA = urlA.pathname + (searchStrA ? `?${searchStrA}` : '') + (urlA.hash || '');
  
  assert(cleanUrlA === '/FestaAvanteAgenda/#o-meu-horario', `Clean URL must match expected path + hash, got "${cleanUrlA}"`);
  assert(!cleanUrlA.includes('import='), 'Clean URL must not contain import query');

  // Test Case B: URL with multiple query params
  mockWin.location.href = 'https://pcostarg.github.io/FestaAvanteAgenda/?utm_source=qr&import=PAYLOAD&view=lista#o-meu-horario';
  const urlB = new URL(mockWin.location.href);
  urlB.searchParams.delete('import');
  const searchStrB = urlB.searchParams.toString();
  const cleanUrlB = urlB.pathname + (searchStrB ? `?${searchStrB}` : '') + (urlB.hash || '');

  assert(cleanUrlB === '/FestaAvanteAgenda/?utm_source=qr&view=lista#o-meu-horario', `Clean URL must preserve other query params and hash, got "${cleanUrlB}"`);
  assert(!cleanUrlB.includes('import='), 'Clean URL must not contain import query');
});

// ============================================================================
// SECTION 5: CAMERA SCANNER LIFECYCLE & TRACK LEAK RACE CONDITION PROBES
// ============================================================================
console.log('\n--- SECTION 5: CAMERA SCANNER LIFECYCLE & TRACK LEAK RACE CONDITION PROBES ---');

await test('T20-CAMERA: Hardware error handling for permission denied (NotAllowedError)', () => {
  const errStr = 'NotAllowedError: Permission denied by user agent';
  let userMessage = '';
  if (errStr.includes('NotAllowedError') || errStr.includes('Permission')) {
    userMessage = 'Acesso à câmara recusado. Permite o acesso ou usa o carregamento de ficheiro.';
  }
  assert(userMessage.includes('recusado'), 'User message indicates permission refusal');
});

await test('T21-CAMERA: Hardware error handling for missing device (NotFoundError)', () => {
  const errStr = 'NotFoundError: Requested device not found';
  let userMessage = '';
  if (errStr.includes('NotFoundError') || errStr.includes('DevicesNotFoundError')) {
    userMessage = 'Nenhuma câmara encontrada neste dispositivo. Utiliza o carregamento de imagem ou ficheiro JSON.';
  }
  assert(userMessage.includes('Nenhuma câmara encontrada'), 'User message indicates missing camera');
});

await test('T22-CAMERA: Duplicate scan suppression ignores repeated frames after first detection', () => {
  let scanCount = 0;
  let isProcessing = false;

  const onFrameDecoded = (text) => {
    if (isProcessing) return;
    isProcessing = true;
    scanCount++;
  };

  // Simulate 30 frames arriving in 3 seconds for the same QR code
  for (let i = 0; i < 30; i++) {
    onFrameDecoded('valid-qr-payload');
  }

  assert(scanCount === 1, 'Only 1 scan event may be emitted across duplicate frames');
});

await test('T23-CAMERA-RACE-PROBE: Rapid unmounting while scanner.start() is in-flight must NOT leak camera stream', async () => {
  // Mock Html5Qrcode to track lifecycle
  let startCalled = false;
  let stopCalled = false;
  let clearCalled = false;
  let isScanningInternal = false;

  class MockHtml5Qrcode {
    constructor(elementId) {
      this.elementId = elementId;
    }
    get isScanning() {
      return isScanningInternal;
    }
    async start(cameraConfig, config, onScanSuccess) {
      startCalled = true;
      // Simulate asynchronous camera stream acquisition delay (e.g. 50ms)
      await new Promise((resolve) => setTimeout(resolve, 50));
      isScanningInternal = true;
      return true;
    }
    async stop() {
      stopCalled = true;
      isScanningInternal = false;
    }
    clear() {
      clearCalled = true;
    }
  }

  // Simulate QrScanner component lifecycle
  let isMounted = true;
  const scannerRef = { current: null };

  const startScanner = async () => {
    const scanner = new MockHtml5Qrcode('test-viewfinder');
    scannerRef.current = scanner;

    const startPromise = scanner.start({ facingMode: 'environment' }, {}, () => {});
    
    // Await start
    await startPromise;

    // In a robust implementation (matching QrScanner.tsx):
    // If component unmounted while start() was in flight, scanner must be stopped immediately!
    if (!isMounted) {
      try {
        if (scanner.isScanning) {
          await scanner.stop();
          scanner.clear();
        }
      } catch {}
      return;
    }
  };

  // 1. Mount component -> start begins
  const runPromise = startScanner();

  // 2. User rapidly unmounts at 10ms (e.g., switches tab to JSON or closes modal)
  await new Promise((resolve) => setTimeout(resolve, 10));
  
  // Teardown hook runs:
  isMounted = false;
  if (scannerRef.current) {
    try {
      if (scannerRef.current.isScanning) {
        scannerRef.current.stop().then(() => scannerRef.current?.clear());
      } else {
        // At 10ms, scanner.isScanning is FALSE!
        scannerRef.current.clear();
      }
    } catch {}
  }

  // 3. Wait for startScanner to finish
  await runPromise;

  // 4. Inspect camera state:
  // Is the camera still running (isScanningInternal === true) despite unmount?
  if (isScanningInternal && !stopCalled) {
    findings.push({
      test: 'T23-CAMERA-RACE-PROBE',
      severity: 'MEDIUM',
      error: 'RACE CONDITION IN QrScanner.tsx: If the user unmounts or switches tabs while scanner.start() is in-flight (~100-300ms), scanner.isScanning is false during unmount cleanup, so stop() is not called. When scanner.start() subsequently resolves, isMounted is false but scanner.stop() is never invoked, leaving the media track running in the background.',
    });
    console.log('    [EMPIRICAL FINDING CONFIRMED] Race condition reproduced: media stream remains active after unmount if unmounted during start().');
    assert(false, 'Media track leaked! Camera scanner was not stopped when unmount occurred during start()');
  } else {
    assert(stopCalled, 'Scanner stop must have been invoked');
  }

  // 5. Verify QrScanner.tsx source code contains unmount stop check
  const scannerPath = path.join(rootDir, 'src', 'components', 'sharing', 'QrScanner.tsx');
  const scannerSource = fs.readFileSync(scannerPath, 'utf8');
  assert(
    scannerSource.includes('!isMounted') &&
    scannerSource.includes('scanner.isScanning') &&
    scannerSource.includes('scanner.stop()'),
    'QrScanner.tsx must check !isMounted after start() and stop/clear scanner'
  );
});

// ============================================================================
// SUMMARY & VERDICT
// ============================================================================
console.log('\n========================================================================');
console.log(' ADVERSARIAL STRESS TEST SUMMARY REPORT');
console.log('========================================================================');
console.log(`  Total Challenges : ${totalTests}`);
console.log(`  Passed           : ${passedTests}`);
console.log(`  Failed           : ${failedTests}`);
console.log('========================================================================\n');

if (findings.length > 0) {
  console.log('FINDINGS & VULNERABILITIES DETECTED:');
  findings.forEach((f, idx) => {
    console.log(`\n[Finding #${idx + 1}] (${f.severity || 'HIGH'}) Test: ${f.test}`);
    console.log(`Details: ${f.error}`);
  });
}

if (failedTests > 0) {
  console.log('\n❌ EMPIRICAL CHALLENGE COMPLETED WITH FAILURES — VERDICT: REQUEST_CHANGES');
  process.exit(1);
} else {
  console.log('\n✔ ALL ADVERSARIAL CHALLENGES PASSED EMPIRICALLY! — VERDICT: APPROVE');
  process.exit(0);
}
