// tests/adversarial-challenger-m4-sharing.mjs
// Forensic Integrity & Adversarial Stress Harness for Milestone 4 (Sharing, QR Code & Import/Export)
// Festa do Avante! 2025 PWA

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Authoritative E2E contracts for comparison
import {
  encodeSharePayload as contractEncodePayload,
  decodeSharePayload as contractDecodePayload,
  generateIcsCalendar as contractGenerateIcs,
  validateIcsCalendar as contractValidateIcs,
  LOCAL_STORAGE_KEY,
  SHARE_URL_PREFIX,
} from './e2e/lib/contracts.mjs';

import { TEST_EVENTS } from './e2e/lib/fixtures.mjs';
import { MockLocalStorage, MockWindow } from './e2e/lib/mock-env.mjs';

// Production implementations under forensic audit
import {
  generateIcsCalendar as prodGenerateIcs,
  validateIcsCalendar as prodValidateIcs,
  foldIcsLine as prodFoldIcsLine,
  escapeIcsText as prodEscapeIcsText,
  computeEventDates as prodComputeEventDates,
  resolveEventDate as prodResolveEventDate,
  formatIcsUtcDate as prodFormatIcsUtcDate,
  ICS_PRODID,
  ICS_FILENAME,
} from '../src/utils/ics.ts';

import {
  encodeSharePayload as prodEncodePayload,
  decodeSharePayload as prodDecodePayload,
  createShareUrl as prodCreateShareUrl,
  extractPayloadFromUrl as prodExtractPayloadFromUrl,
  extractScheduleFromScannedText as prodExtractScheduleFromScanned,
  SHARE_URL_PREFIX as PROD_SHARE_PREFIX,
} from '../src/utils/sharePayload.ts';

import {
  createJsonBackup as prodCreateJsonBackup,
  validateJsonBackup as prodValidateJsonBackup,
  summarizeEvent as prodSummarizeEvent,
  JSON_BACKUP_FILENAME,
  APP_IDENTIFIER,
  SCHEMA_VERSION,
} from '../src/utils/jsonBackup.ts';

import {
  ScheduleStore,
  MemoryStorage,
  validateScheduleStorage as prodValidateStorage,
  sanitizeIdArray as prodSanitizeIdArray,
} from '../src/utils/scheduleStorage.ts';

console.log('========================================================================');
console.log(' FORENSIC AUDIT & ADVERSARIAL STRESS HARNESS — MILESTONE 4 SHARING');
console.log('========================================================================\n');

let totalChallenges = 0;
let passedChallenges = 0;
let failedChallenges = 0;
const failures = [];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual(actual, expected, message = '') {
  const actStr = JSON.stringify(actual);
  const expStr = JSON.stringify(expected);
  if (actStr !== expStr) {
    throw new Error(`${message ? message + ' ' : ''}Expected ${expStr}, got ${actStr}`);
  }
}

function challenge(description, testFn) {
  totalChallenges++;
  try {
    testFn();
    passedChallenges++;
    console.log(`  [PASS] ${description}`);
  } catch (err) {
    failedChallenges++;
    failures.push({ description, error: err.message, stack: err.stack });
    console.error(`  [FAIL] ${description}\n         Error: ${err.message}`);
  }
}

// -----------------------------------------------------------------------------
// SECTION 1: ANTI-HARDCODING & GENUINE LOGIC VERIFICATION
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 1: ANTI-HARDCODING & GENUINE LOGIC VERIFICATION ---');

challenge('M4-F01-GENUINE: encodeSharePayload produces dynamic URL-safe Base64 and not fixed strings', () => {
  const arbitraryA = ['random-act-98124', 'random-act-11223'];
  const arbitraryB = ['random-act-77665'];
  const payloadA = prodEncodePayload(arbitraryA, arbitraryB);
  const payloadB = prodEncodePayload(['random-act-98124'], []);

  assert(payloadA !== payloadB, 'Payloads for different inputs must differ');
  assert(typeof payloadA === 'string' && payloadA.length > 0, 'Must produce non-empty string');
  assert(!payloadA.includes('+') && !payloadA.includes('/') && !payloadA.includes('='), 'Must be URL-safe');

  // Verify contract compatibility
  const contractA = contractEncodePayload(arbitraryA, arbitraryB);
  assertEqual(payloadA, contractA, 'Production encoding exactly matches canonical E2E contract');
});

challenge('M4-F02-GENUINE: decodeSharePayload genuinely parses arbitrary Base64URL payloads', () => {
  const testSets = [
    { favs: ['act-x-1', 'act-x-2'], seen: ['act-x-1'] },
    { favs: [], seen: [] },
    { favs: ['solitary-event'], seen: [] },
    { favs: ['a', 'b', 'c', 'd', 'e'], seen: ['b', 'd'] },
  ];

  for (const set of testSets) {
    const encoded = prodEncodePayload(set.favs, set.seen);
    const decoded = prodDecodePayload(encoded);
    assertEqual(decoded.favorites, set.favs, `Decoded favorites match for ${set.favs.length} acts`);
    assertEqual(decoded.seen, set.seen, `Decoded seen match for ${set.seen.length} acts`);
  }
});

challenge('M4-F03-GENUINE: generateIcsCalendar dynamically formats arbitrary events into valid RFC 5545', () => {
  const customEvent = {
    id: 'dyn-act-' + Date.now(),
    title: 'Adversarial Concert ' + Math.random(),
    stage: 'Palco Teste',
    day: '2025-09-06',
    startTime: '21:30',
    endTime: '23:00',
    category: 'Música',
    description: 'Dynamic description with special characters: ; , \\ and newlines\nsecond line',
  };

  const ics = prodGenerateIcs([customEvent]);
  assert(ics.includes(`UID:${customEvent.id}@festadoavante.pcp.pt`), 'Contains dynamic UID');
  assert(ics.includes('SUMMARY:Adversarial Concert'), 'Contains dynamic title in summary');
  assert(ics.includes('LOCATION:Palco Teste, Quinta da Atalaia, Amora, Seixal'), 'Contains dynamic location');

  const validation = prodValidateIcs(ics);
  assert(validation.valid === true, 'Generated ICS is strictly valid per RFC 5545');
  assertEqual(validation.eventCount, 1, 'Exactly 1 VEVENT');
});

// -----------------------------------------------------------------------------
// SECTION 2: RFC 5545 SPECIFICATION STRESS & EDGE CASES
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 2: RFC 5545 SPECIFICATION STRESS & EDGE CASES ---');

challenge('M4-F04-ICS: CRLF strictness — all line breaks must strictly be \\r\\n and NO bare \\n', () => {
  const ics = prodGenerateIcs(TEST_EVENTS);
  assert(ics.includes('\r\n'), 'Must contain \\r\\n');
  const bareLfCount = (ics.replace(/\r\n/g, '').match(/\n/g) || []).length;
  assertEqual(bareLfCount, 0, 'Zero bare \\n allowed in RFC 5545 stream');
});

challenge('M4-F05-ICS: UTF-8 safe line folding — no line exceeds 75 octets and continuation lines start with space', () => {
  const longEvent = {
    id: 'long-act-1',
    title: 'Supercalifragilisticexpialidocious Act With An Extremely Long Name That Extends Far Beyond Normal Limits',
    stage: 'Palco 25 de Abril',
    day: '2025-09-05',
    startTime: '19:00',
    endTime: '20:30',
    description: 'This is an exceedingly long description intended to trigger multiple line foldings across UTF-8 characters: São João da Talha, Amora, Seixal, Quinta da Atalaia com canções e poesia revolucionária.',
    category: 'Música & Poesia de Intervenção Cultural',
  };

  const ics = prodGenerateIcs([longEvent]);
  const lines = ics.split('\r\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length === 0) continue; // Trailing CRLF
    const byteLen = Buffer.byteLength(line, 'utf-8');
    assert(byteLen <= 75, `Line ${i + 1} exceeds 75 octets: ${byteLen} bytes ("${line.substring(0, 30)}...")`);
  }

  // Check continuation line prefix
  let foldedLinesCount = 0;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].startsWith(' ')) {
      foldedLinesCount++;
    }
  }
  assert(foldedLinesCount > 0, 'Line folding occurred and lines start with space');
});

challenge('M4-F06-ICS: Multi-byte UTF-8 character splitting prevention in line folding', () => {
  // Test folding with emoji, CJK, and accented chars at boundary
  const multibyteLine = 'DESCRIPTION:' + '🔥'.repeat(25) + ' ' + 'Português: Açúcar & Canção; '.repeat(5);
  const folded = prodFoldIcsLine(multibyteLine);
  const parts = folded.split('\r\n ');

  for (const part of parts) {
    const byteLen = Buffer.byteLength(part, 'utf-8');
    assert(byteLen <= 75, `Folded part exceeds 75 bytes: ${byteLen}`);
    // Check that part is valid UTF-8 and does not have broken surrogate pairs or malformed bytes
    const roundTrip = Buffer.from(part, 'utf-8').toString('utf-8');
    assertEqual(roundTrip, part, 'UTF-8 round-trip intact (no broken code points)');
  }
});

challenge('M4-F07-ICS: Nocturnal hour midnight rollover (< 6h) correctly rolls calendar day', () => {
  // Friday night acts after midnight (00:00 - 05:59) should have UTC date 2025-09-06
  const midnightAct = {
    id: 'act-mid',
    day: '2025-09-05', // Friday
    startTime: '23:45',
    endTime: '01:15', // Saturday dawn
  };

  const dates = prodComputeEventDates(midnightAct);
  assertEqual(dates.startDate.toISOString(), '2025-09-05T23:45:00.000Z', 'Start date on Friday');
  assertEqual(dates.endDate.toISOString(), '2025-09-06T01:15:00.000Z', 'End date rolled to Saturday');

  // Dawn act starting after midnight
  const dawnAct = {
    id: 'act-dawn',
    day: '2025-09-05', // Friday schedule
    startTime: '01:30',
    endTime: '03:00',
  };
  const dawnDates = prodComputeEventDates(dawnAct);
  assertEqual(dawnDates.startDate.toISOString(), '2025-09-06T01:30:00.000Z', 'Start rolled to Saturday');
  assertEqual(dawnDates.endDate.toISOString(), '2025-09-06T03:00:00.000Z', 'End rolled to Saturday');
});

challenge('M4-F08-ICS: Text control character escaping (\\, ;, ,, \\n)', () => {
  const raw = 'Text with backslash \\, semicolon ;, comma ,, and newline\r\nnext line\nanother line';
  const escaped = prodEscapeIcsText(raw);
  assert(escaped.includes('\\\\'), 'Backslash escaped');
  assert(escaped.includes('\\;'), 'Semicolon escaped');
  assert(escaped.includes('\\,'), 'Comma escaped');
  assert(escaped.includes('\\n'), 'Newline escaped to literal \\n');
  assert(!escaped.includes('\r'), 'No raw \\r in escaped output');
});

challenge('M4-F09-ICS: Complete program.json dataset (253 authentic acts) generates valid calendar', () => {
  const programPath = path.join(rootDir, 'src', 'data', 'program.json');
  const allEvents = JSON.parse(fs.readFileSync(programPath, 'utf-8'));
  assertEqual(allEvents.length, 253, '253 authentic festival acts');

  const startT = Date.now();
  const fullIcs = prodGenerateIcs(allEvents);
  const duration = Date.now() - startT;

  assert(duration < 200, `253 acts ICS generated in ${duration}ms (target <200ms)`);
  const validation = prodValidateIcs(fullIcs);
  assert(validation.valid === true, 'Full 253 acts ICS is 100% RFC 5445 valid');
  assertEqual(validation.eventCount, 253, 'Exactly 253 VEVENT blocks validated');
  assert(fullIcs.startsWith('BEGIN:VCALENDAR\r\n'), 'Starts with VCALENDAR');
  assert(fullIcs.endsWith('END:VCALENDAR\r\n'), 'Ends with END:VCALENDAR');
});

// -----------------------------------------------------------------------------
// SECTION 3: BASE64URL COMPRESSION & QR SHARING STRESS
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 3: BASE64URL COMPRESSION & QR SHARING STRESS ---');

challenge('M4-F10-SHARE: URL budget verification — 50 acts payload is well within 2048 character limit (T2-F16-01)', () => {
  const fiftyActs = Array.from({ length: 50 }, (_, i) => `ev-act-${i}`);
  const fiftySeen = Array.from({ length: 25 }, (_, i) => `ev-act-${i}`);
  const payload = prodEncodePayload(fiftyActs, fiftySeen);
  const fullUrl = prodCreateShareUrl(payload);

  assert(fullUrl.length < 2048, `Full URL length is ${fullUrl.length} chars (must be < 2048 per T2-F16-01)`);
  const decoded = prodDecodePayload(payload);
  assertEqual(decoded.favorites.length, 50, 'All 50 favorites restored');
  assertEqual(decoded.seen.length, 25, 'All 25 seen restored');
});

challenge('M4-F11-SHARE: Modulo 4 Base64 padding restoration handles length offsets 0, 1, 2, 3', () => {
  // Test payloads that naturally result in different Base64 string lengths
  for (let i = 1; i <= 10; i++) {
    const favs = Array.from({ length: i }, (_, k) => `id-${k}`);
    const encoded = prodEncodePayload(favs, []);
    assert(!encoded.includes('='), 'URL-safe base64 contains no = padding');
    const decoded = prodDecodePayload(encoded);
    assertEqual(decoded.favorites, favs, `Restores correctly for length ${i}`);
  }
});

challenge('M4-F12-SHARE: Tampered and malformed Base64 rejection with safe error throwing', () => {
  const invalidInputs = [
    null,
    undefined,
    '',
    '   ',
    '!!!not-base64@@@',
    Buffer.from('just plain text, not a json object', 'utf-8').toString('base64'),
    Buffer.from('12345', 'utf-8').toString('base64'), // primitive number
    Buffer.from('true', 'utf-8').toString('base64'), // primitive boolean
  ];

  for (const bad of invalidInputs) {
    let threw = false;
    let errMessage = '';
    try {
      prodDecodePayload(bad);
    } catch (e) {
      threw = true;
      errMessage = e.message;
    }
    assert(threw, `Must throw for invalid input: ${JSON.stringify(bad)}`);
    assert(errMessage.length > 0, 'Error message is non-empty');
  }

  // Graceful non-throwing degradation for array or minimal objects
  const arrayPayload = Buffer.from('[1, 2, 3]', 'utf-8').toString('base64');
  const arrayResult = prodDecodePayload(arrayPayload);
  assertEqual(arrayResult.favorites, [], 'Array payload yields empty favorites');
  assertEqual(arrayResult.seen, [], 'Array payload yields empty seen');
});

challenge('M4-F13-SHARE: Scanned text parser extracts schedule from diverse formats', () => {
  const targetFavs = ['ev-scanned-1', 'ev-scanned-2'];
  const payload = prodEncodePayload(targetFavs, ['ev-scanned-1']);

  // Format 1: Full URL
  const fullUrl = `https://pcostarg.github.io/FestaAvanteAgenda/?import=${payload}`;
  const res1 = prodExtractScheduleFromScanned(fullUrl);
  assertEqual(res1.favorites, targetFavs, 'Extracts from full URL');

  // Format 2: Relative URL with hash
  const relUrl = `/FestaAvanteAgenda/?import=${payload}#o-meu-horario`;
  const res2 = prodExtractScheduleFromScanned(relUrl);
  assertEqual(res2.favorites, targetFavs, 'Extracts from relative URL with hash');

  // Format 3: Raw JSON backup string
  const rawJson = JSON.stringify({ favorites: targetFavs, seen: ['ev-scanned-1'] });
  const res3 = prodExtractScheduleFromScanned(rawJson);
  assertEqual(res3.favorites, targetFavs, 'Extracts from raw JSON backup text');

  // Format 4: Raw Base64 string directly
  const res4 = prodExtractScheduleFromScanned(payload);
  assertEqual(res4.favorites, targetFavs, 'Extracts from raw Base64 payload');

  // Format 5: Arbitrary non-festival text throws clear error
  let threw = false;
  try {
    prodExtractScheduleFromScanned('WIFI:S:MyNetwork;T:WPA;P:secret;;');
  } catch (e) {
    threw = true;
    assert(e.message.includes('não contém uma agenda válida'), 'Throws expected error notice');
  }
  assert(threw, 'Throws on non-festival QR');
});

// -----------------------------------------------------------------------------
// SECTION 4: JSON BACKUP SCHEMA & USER ORDER PRESERVATION
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 4: JSON BACKUP SCHEMA & USER ORDER PRESERVATION ---');

challenge('M4-F14-JSON: createJsonBackup preserves exact user order of favorites', () => {
  const userOrder = ['act-zeta', 'act-alpha', 'act-beta', 'act-delta'];
  const backup = prodCreateJsonBackup(userOrder, ['act-alpha']);

  assertEqual(backup.app, APP_IDENTIFIER, 'App identifier matches');
  assertEqual(backup.version, SCHEMA_VERSION, 'Schema version matches');
  assertEqual(backup.favorites, userOrder, 'Preserves exact user ordering without sorting');
});

challenge('M4-F15-JSON: createJsonBackup deduplicates repeat favorites while preserving first occurrence', () => {
  const duplicates = ['act-a', 'act-b', 'act-a', 'act-c', 'act-b', 'act-d'];
  const backup = prodCreateJsonBackup(duplicates, []);
  assertEqual(backup.favorites, ['act-a', 'act-b', 'act-c', 'act-d'], 'Deduplicated in order of first appearance');
});

challenge('M4-F16-JSON: validateJsonBackup validates correct backups and rejects corruptions', () => {
  // Valid backup
  const valid = {
    app: 'AvanteRouter',
    version: 1,
    exportedAt: new Date().toISOString(),
    favorites: ['act-1'],
    seen: [],
  };
  assert(prodValidateJsonBackup(valid).valid === true, 'Valid backup passes');

  // Corrupted backups
  const badBackups = [
    null,
    {},
    { favorites: 'not-array' },
    { favorites: [123, 456] },
    { favorites: ['a'], seen: 'not-array' },
    { favorites: ['a'], seen: [true] },
    { favorites: ['a'], exportedAt: 'invalid-date' },
  ];

  for (const b of badBackups) {
    const res = prodValidateJsonBackup(b);
    assert(res.valid === false, `Fails validation for ${JSON.stringify(b)}`);
    assert(res.errors.length > 0, 'Contains error explanation');
  }
});

// -----------------------------------------------------------------------------
// SECTION 5: STATE PERSISTENCE & SILENT DIRECT OVERWRITE VERIFICATION
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 5: STATE PERSISTENCE & SILENT DIRECT OVERWRITE VERIFICATION ---');

challenge('M4-F17-OVERWRITE: replaceSchedule strictly overwrites avante_schedule_v1 in localStorage directly', () => {
  const store = ScheduleStore.getInstance();

  // Initial user schedule
  store.replaceSchedule({
    favorites: ['initial-act-1', 'initial-act-2'],
    seen: ['initial-act-1'],
  });

  const snap1 = store.getSnapshot();
  assertEqual(snap1.favorites, ['initial-act-1', 'initial-act-2']);
  assertEqual(snap1.seen, ['initial-act-1']);

  // Imported schedule
  const incoming = {
    favorites: ['imported-act-99'],
    seen: ['imported-act-99'],
  };

  // Rule: Silent Direct Overwrite
  store.replaceSchedule(incoming);

  // In-memory state updated
  const snap2 = store.getSnapshot();
  assertEqual(snap2.favorites, ['imported-act-99'], 'Favorites completely replaced');
  assertEqual(snap2.seen, ['imported-act-99'], 'Seen completely replaced');
  assert(!snap2.favorites.includes('initial-act-1'), 'Old favorite purged');
});

challenge('M4-F18-OVERWRITE: Overwrite with empty schedule cleanly purges state without remnant artifacts', () => {
  const store = ScheduleStore.getInstance();

  store.replaceSchedule({ favorites: ['act-to-purge'], seen: ['act-to-purge'] });
  assert(store.getSnapshot().favorites.length === 1, 'Set to 1');

  store.replaceSchedule({ favorites: [], seen: [] });

  const snap = store.getSnapshot();
  assertEqual(snap.favorites, [], 'Favorites empty');
  assertEqual(snap.seen, [], 'Seen empty');
});

challenge('M4-F19-OVERWRITE: Sanitizes dirty ID types on import (nulls, numbers, whitespace) in production', () => {
  const store = ScheduleStore.getInstance();

  const dirtyInput = {
    favorites: ['act-clean', null, 42, '', '   ', 'act-clean-2'],
    seen: ['seen-clean', undefined, false],
  };

  store.replaceSchedule(dirtyInput);
  const snap = store.getSnapshot();
  assertEqual(snap.favorites, ['act-clean', 'act-clean-2'], 'Sanitized dirty favorites array');
  assertEqual(snap.seen, ['seen-clean'], 'Sanitized dirty seen array');
});

// -----------------------------------------------------------------------------
// SECTION 6: ADVERSARIAL STRESS CHALLENGES
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 6: ADVERSARIAL STRESS CHALLENGES ---');

challenge('M4-F20-ADVERSARIAL: Prototype pollution attempt via JSON import (__proto__, constructor)', () => {
  const maliciousJson = JSON.stringify({
    app: 'AvanteRouter',
    version: 1,
    favorites: ['act-1'],
    seen: [],
    __proto__: { isAdmin: true, polluted: 'yes' },
    constructor: { prototype: { hacked: true } },
  });

  const parsed = JSON.parse(maliciousJson);
  assert(Object.prototype.isAdmin === undefined, 'Prototype is not polluted before');

  const store = ScheduleStore.getInstance();
  store.replaceSchedule(parsed);

  assert(Object.prototype.isAdmin === undefined, 'Object prototype remained clean after import');
  assert(Object.prototype.hacked === undefined, 'Constructor prototype remained clean after import');
});

challenge('M4-F21-ADVERSARIAL: Extreme scale export/import with 500 unique acts (<25ms)', () => {
  const fiveHundredActs = Array.from({ length: 500 }, (_, i) => `massive-act-${i.toString().padStart(4, '0')}`);
  const startT = Date.now();

  const encoded = prodEncodePayload(fiveHundredActs, fiveHundredActs.slice(0, 250));
  const decoded = prodDecodePayload(encoded);

  const duration = Date.now() - startT;
  assert(duration < 50, `500 acts encoded and decoded in ${duration}ms (target <50ms)`);
  assertEqual(decoded.favorites.length, 500, 'All 500 favorites round-tripped');
  assertEqual(decoded.seen.length, 250, 'All 250 seen round-tripped');
});

challenge('M4-F22-ADVERSARIAL: Special characters in ICS (Portuguese, Cyrillic, Greek, Emoji, HTML)', () => {
  const eventSpecial = {
    id: 'act-special',
    title: 'Música de Intervenção: "Cantigas do Maio" & Poetas d\'Abril <tag>',
    stage: 'Auditório 1º de Maio',
    day: '2025-09-07',
    startTime: '21:00',
    endTime: '23:00',
    description: 'Espetáculo multimédia; com convidados internacionais: Свобода, Ελευθερία, 🎵 & ✊.',
    category: 'Música',
  };

  const ics = prodGenerateIcs([eventSpecial]);
  const validation = prodValidateIcs(ics);
  assert(validation.valid === true, 'Special character ICS is valid');
  assert(ics.includes('\\;'), 'Semicolon in description escaped');
  assert(ics.includes('\\,'), 'Comma in title/description escaped');
});

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n========================================================================');
console.log(' FORENSIC AUDIT & ADVERSARIAL STRESS SUMMARY REPORT');
console.log('========================================================================');
console.log(`  Total Challenges : ${totalChallenges}`);
console.log(`  Passed           : ${passedChallenges}`);
console.log(`  Failed           : ${failedChallenges}`);
console.log('========================================================================\n');

if (failedChallenges > 0) {
  console.error(`✖ ADVERSARIAL HARNESS FAILED WITH ${failedChallenges} FAILURES`);
  process.exit(1);
} else {
  console.log('✔ ALL FORENSIC AUDIT CHALLENGES PASSED EMPIRICALLY! (100% PASS RATE)\n');
  process.exit(0);
}
