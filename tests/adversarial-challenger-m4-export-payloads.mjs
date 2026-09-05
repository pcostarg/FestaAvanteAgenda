// tests/adversarial-challenger-m4-export-payloads.mjs
// Empirical Stress Harness & Adversarial Challenge Suite
// Milestone 4 Challenger 1: Export Engine & Payloads
// Festa do Avante! 2025 PWA

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Import authoritative E2E contracts & fixtures
import {
  encodeSharePayload as contractEncodeSharePayload,
  decodeSharePayload as contractDecodeSharePayload,
  generateIcsCalendar as contractGenerateIcsCalendar,
  validateIcsCalendar as contractValidateIcsCalendar,
  SHARE_URL_PREFIX as CONTRACT_SHARE_URL_PREFIX,
} from './e2e/lib/contracts.mjs';

import { TEST_EVENTS } from './e2e/lib/fixtures.mjs';

// Import production implementations
import {
  encodeSharePayload as prodEncodeSharePayload,
  decodeSharePayload as prodDecodeSharePayload,
  createShareUrl as prodCreateShareUrl,
  extractPayloadFromUrl as prodExtractPayloadFromUrl,
  extractScheduleFromScannedText as prodExtractScheduleFromScannedText,
  SHARE_URL_PREFIX as PROD_SHARE_URL_PREFIX,
} from '../src/utils/sharePayload.ts';

import {
  generateIcsCalendar as prodGenerateIcsCalendar,
  validateIcsCalendar as prodValidateIcsCalendar,
  foldIcsLine as prodFoldIcsLine,
  computeEventDates as prodComputeEventDates,
  resolveEventDate as prodResolveEventDate,
  escapeIcsText as prodEscapeIcsText,
  formatIcsUtcDate as prodFormatIcsUtcDate,
  ICS_PRODID,
  ICS_FILENAME,
} from '../src/utils/ics.ts';

import {
  createJsonBackup as prodCreateJsonBackup,
  validateJsonBackup as prodValidateJsonBackup,
  summarizeEvent as prodSummarizeEvent,
  JSON_BACKUP_FILENAME,
  APP_IDENTIFIER,
  SCHEMA_VERSION,
} from '../src/utils/jsonBackup.ts';

// Load full authentic dataset (269 acts)
const authenticProgram = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'src', 'data', 'program.json'), 'utf-8')
);

console.log('========================================================================');
console.log(' ADVERSARIAL EMPIRICAL STRESS HARNESS — EXPORT ENGINE & PAYLOADS (M4)');
console.log('========================================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];
const findings = [];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function challenge(description, testFn) {
  totalTests++;
  try {
    testFn();
    passedTests++;
    console.log(`  [PASS] ${description}`);
  } catch (err) {
    failedTests++;
    failures.push({ description, error: err.message });
    console.error(`  [FAIL] ${description}\n         Error: ${err.message}`);
  }
}

function recordFinding(severity, area, details) {
  findings.push({ severity, area, details });
  console.log(`    [FINDING (${severity.toUpperCase()})] ${area}: ${details}`);
}

const getUtf8ByteLength = (s) => Buffer.byteLength(s, 'utf-8');

// =====================================================================
// SECTION 1: BASE64URL DECODING EDGE CASES & REJECTION
// =====================================================================
console.log('\n--- SECTION 1: BASE64URL DECODING EDGE CASES & REJECTION ---');

challenge('T01-BASE64: Missing padding variations (1 and 2 "=" needed) restored and decoded faithfully', () => {
  const paddingCounts = { 0: 0, 1: 0, 2: 0 };

  for (let len = 0; len < 30; len++) {
    const ids = Array.from({ length: len }, (_, i) => `ev-${i}`);
    const encoded = prodEncodeSharePayload(ids, []);
    assert(!encoded.includes('='), `Encoded payload should not contain '=': ${encoded}`);

    const remainder = encoded.length % 4;
    const needed = (4 - remainder) % 4;
    paddingCounts[needed] = (paddingCounts[needed] || 0) + 1;

    const decoded = prodDecodeSharePayload(encoded);
    assert(decoded.favorites.length === len, `Decoded favorites count mismatch at len ${len}`);
    assert(JSON.stringify(decoded.favorites) === JSON.stringify(ids), `Data mismatch at len ${len}`);
  }

  assert(paddingCounts[1] > 0, 'Must have verified 1 "=" needed');
  assert(paddingCounts[2] > 0, 'Must have verified 2 "=" needed');
  console.log(`         Padding distribution across tests: 0 '=': ${paddingCounts[0]}, 1 '=': ${paddingCounts[1]}, 2 '=': ${paddingCounts[2]}`);
});

challenge('T02-BASE64: String where 3 "=" would be needed (length % 4 == 1) is mathematically invalid in RFC 4648 and rejected', () => {
  // In RFC 4648 Base64, a valid base64 unit is 4 octets representing 3 bytes.
  // 1 base64 char = 6 bits, which is insufficient for 1 byte (8 bits).
  // Therefore, length % 4 == 1 cannot represent valid encoded data and would require 3 '=' pad characters.
  const invalidMod1Lengths = [
    'A', // 1 char -> 1 % 4 = 1 (needs 3 '=')
    'eyJm', // 4 chars -> 0 mod 4, add 1 char: 'eyJmI' -> 5 chars (needs 3 '=')
    '12345', // 5 chars -> 1 % 4 = 1
    'ABCDEFGHI', // 9 chars -> 1 % 4 = 1
  ];

  for (const s of invalidMod1Lengths) {
    let threw = false;
    try {
      prodDecodeSharePayload(s);
    } catch (err) {
      threw = true;
      assert(err instanceof Error, 'Should throw Error instance');
    }
    assert(threw, `String needing 3 '=' padding must be rejected: ${s}`);
  }
});

challenge('T03-BASE64: Rejection of null, undefined, empty string, and whitespace-only strings', () => {
  const emptyInputs = [null, undefined, '', '   ', '\t\n\r  '];
  for (const input of emptyInputs) {
    let threw = false;
    try {
      prodDecodeSharePayload(input);
    } catch (err) {
      threw = true;
      assert(
        err.message === 'Payload string is required',
        `Expected "Payload string is required", got "${err.message}"`
      );
    }
    assert(threw, `Should reject empty input: ${JSON.stringify(input)}`);
  }
});

challenge('T04-BASE64: Browser environment emulation enforces strict Base64 alphabet and rejects invalid characters', () => {
  const validPayload = prodEncodeSharePayload(['ev-1'], []);
  const invalidPunctuation = ['!', '@', '#', '$', '%', '^', '&', '*', '<', '>', '{', '}', '~'];

  // Test Node behavior vs Browser atob behavior
  let atobRejections = 0;
  for (const char of invalidPunctuation) {
    const corrupted = validPayload.slice(0, 4) + char + validPayload.slice(4);

    // Browser environment uses globalThis.atob
    let atobThrew = false;
    try {
      globalThis.atob(corrupted);
    } catch {
      atobThrew = true;
      atobRejections++;
    }
    assert(atobThrew, `Browser atob must reject character: ${char}`);
  }
  assert(atobRejections === invalidPunctuation.length, 'All punctuation must be rejected by atob');

  // Document node Buffer.from lenient behavior
  const nodeDecodedWithExclamation = prodDecodeSharePayload(validPayload.slice(0, 4) + '!' + validPayload.slice(4));
  assert(
    nodeDecodedWithExclamation.favorites[0] === 'ev-1',
    'Node Buffer strips non-base64 chars silently'
  );
  recordFinding(
    'low',
    'Base64URL Character Alphabet',
    'In Node.js runtime, Buffer.from silently strips non-base64 characters, while in Browser runtime, atob() strictly rejects them with InvalidCharacterError. decodeSharePayload has no pre-validation regex.'
  );
});

challenge('T05-BASE64: Rejection of valid Base64 containing corrupted / malformed JSON', () => {
  const malformedJsonStrings = [
    '{"f":',                 // truncated
    '{"favorites": [}',      // bad syntax
    'plain text not json',   // non-JSON
    '{"f": undefined}',      // JS undefined
  ];

  for (const str of malformedJsonStrings) {
    const base64 = Buffer.from(str, 'utf-8').toString('base64').replace(/=/g, '');
    let threw = false;
    try {
      prodDecodeSharePayload(base64);
    } catch (err) {
      threw = true;
      assert(
        err.message.includes('Invalid JSON payload inside share string'),
        `Expected Invalid JSON error, got: ${err.message}`
      );
    }
    assert(threw, `Should reject malformed JSON base64: ${str}`);
  }
});

challenge('T06-BASE64: Handling of non-object JSON payloads (primitives, arrays)', () => {
  const primitivePayloads = [
    JSON.stringify(12345),
    JSON.stringify(true),
    JSON.stringify('a plain string'),
  ];

  for (const json of primitivePayloads) {
    const base64 = Buffer.from(json, 'utf-8').toString('base64').replace(/=/g, '');
    let threw = false;
    try {
      prodDecodeSharePayload(base64);
    } catch (err) {
      threw = true;
      assert(
        err.message === 'Decoded payload is not a valid object',
        `Expected "Decoded payload is not a valid object", got: ${err.message}`
      );
    }
    assert(threw, `Should reject non-object JSON: ${json}`);
  }

  // JSON null payload
  const nullBase64 = Buffer.from('null', 'utf-8').toString('base64').replace(/=/g, '');
  let nullThrew = false;
  try {
    prodDecodeSharePayload(nullBase64);
  } catch (err) {
    nullThrew = true;
    assert(err.message === 'Decoded payload is not a valid object');
  }
  assert(nullThrew, 'Should reject base64 of null');

  // JSON array payload -> gracefully defaults to empty favorites/seen
  const arrayBase64 = Buffer.from('[1, 2, 3]', 'utf-8').toString('base64').replace(/=/g, '');
  const arrayDecoded = prodDecodeSharePayload(arrayBase64);
  assert(Array.isArray(arrayDecoded.favorites), 'Favorites should be array');
  assert(arrayDecoded.favorites.length === 0, 'Favorites should be empty');
});

challenge('T07-BASE64: Type pollution inside favorites and seen arrays is safely sanitized', () => {
  const pollutedJson = JSON.stringify({
    f: ['valid-1', 123, null, false, { obj: true }, 'valid-2'],
    s: ['seen-1', undefined, [1], 456, 'seen-2'],
  });
  const base64 = Buffer.from(pollutedJson, 'utf-8').toString('base64').replace(/=/g, '');
  const decoded = prodDecodeSharePayload(base64);

  assert(decoded.favorites.length === 2, 'Should filter out non-strings from favorites');
  assert(decoded.favorites[0] === 'valid-1' && decoded.favorites[1] === 'valid-2', 'Favorites content mismatch');
  assert(decoded.seen.length === 2, 'Should filter out non-strings from seen');
  assert(decoded.seen[0] === 'seen-1' && decoded.seen[1] === 'seen-2', 'Seen content mismatch');
});

challenge('T08-BASE64: Dual format support — compact (f, s) and legacy/extended (favorites, seen)', () => {
  const compactJson = JSON.stringify({ f: ['ev-compact-1'], s: ['ev-compact-seen'] });
  const compactDecoded = prodDecodeSharePayload(
    Buffer.from(compactJson, 'utf-8').toString('base64').replace(/=/g, '')
  );
  assert(compactDecoded.favorites[0] === 'ev-compact-1', 'Compact favorites mismatch');
  assert(compactDecoded.seen[0] === 'ev-compact-seen', 'Compact seen mismatch');

  const extendedJson = JSON.stringify({ favorites: ['ev-ext-1'], seen: ['ev-ext-seen'] });
  const extendedDecoded = prodDecodeSharePayload(
    Buffer.from(extendedJson, 'utf-8').toString('base64').replace(/=/g, '')
  );
  assert(extendedDecoded.favorites[0] === 'ev-ext-1', 'Extended favorites mismatch');
  assert(extendedDecoded.seen[0] === 'ev-ext-seen', 'Extended seen mismatch');
});

challenge('T09-BASE64: Strict URL safety — output strictly omits "+", "/", and "="', () => {
  // Test 100 random schedules
  for (let i = 0; i < 100; i++) {
    const favs = [`ev-alpha-${i}`, `ev-beta-${i * 2}`];
    const seen = [`ev-alpha-${i}`];
    const payload = prodEncodeSharePayload(favs, seen);
    assert(!payload.includes('+'), `Payload contains +: ${payload}`);
    assert(!payload.includes('/'), `Payload contains /: ${payload}`);
    assert(!payload.includes('='), `Payload contains =: ${payload}`);
  }
});

// =====================================================================
// SECTION 2: PAYLOAD COMPRESSION UNDER HIGH-VOLUME SCHEDULES (50+ ACTS)
// =====================================================================
console.log('\n--- SECTION 2: PAYLOAD COMPRESSION UNDER HIGH-VOLUME SCHEDULES (50+ ACTS) ---');

challenge('T10-VOLUME: 50 authentic favorites + 0 seen — URL remains strictly < 2000 characters', () => {
  const allIds = authenticProgram.map((e) => e.id);
  const favs50 = allIds.slice(0, 50);
  const payload = prodEncodeSharePayload(favs50, []);
  const shareUrl = prodCreateShareUrl(payload);

  console.log(`         50 favs + 0 seen -> payload: ${payload.length} chars, URL: ${shareUrl.length} chars`);
  assert(shareUrl.length < 2000, `URL length ${shareUrl.length} must be < 2000 characters`);
  assert(shareUrl.length < 1000, `Expected compact URL under 1000 chars, got ${shareUrl.length}`);

  const decoded = prodDecodeSharePayload(payload);
  assert(decoded.favorites.length === 50, 'Decoded count mismatch');
  assert(JSON.stringify(decoded.favorites) === JSON.stringify(favs50), 'Decoded data fidelity mismatch');
});

challenge('T11-VOLUME: 50 authentic favorites + 25 seen — URL remains strictly < 2000 characters', () => {
  const allIds = authenticProgram.map((e) => e.id);
  const favs50 = allIds.slice(0, 50);
  const seen25 = allIds.slice(0, 25);
  const payload = prodEncodeSharePayload(favs50, seen25);
  const shareUrl = prodCreateShareUrl(payload);

  console.log(`         50 favs + 25 seen -> payload: ${payload.length} chars, URL: ${shareUrl.length} chars`);
  assert(shareUrl.length < 2000, `URL length ${shareUrl.length} must be < 2000 characters`);

  const decoded = prodDecodeSharePayload(payload);
  assert(decoded.favorites.length === 50, 'Decoded favorites count mismatch');
  assert(decoded.seen.length === 25, 'Decoded seen count mismatch');
});

challenge('T12-VOLUME: 50 authentic favorites + 50 seen — URL remains strictly < 2000 characters', () => {
  const allIds = authenticProgram.map((e) => e.id);
  const favs50 = allIds.slice(0, 50);
  const seen50 = allIds.slice(0, 50);
  const payload = prodEncodeSharePayload(favs50, seen50);
  const shareUrl = prodCreateShareUrl(payload);

  console.log(`         50 favs + 50 seen -> payload: ${payload.length} chars, URL: ${shareUrl.length} chars`);
  assert(shareUrl.length < 2000, `URL length ${shareUrl.length} must be < 2000 characters`);

  const decoded = prodDecodeSharePayload(payload);
  assert(decoded.favorites.length === 50, 'Favorites mismatch');
  assert(decoded.seen.length === 50, 'Seen mismatch');
});

challenge('T13-VOLUME: 100 authentic favorites + 50 seen stress test — URL remains < 2000 characters', () => {
  const allIds = authenticProgram.map((e) => e.id);
  const favs100 = allIds.slice(0, 100);
  const seen50 = allIds.slice(0, 50);
  const payload = prodEncodeSharePayload(favs100, seen50);
  const shareUrl = prodCreateShareUrl(payload);

  console.log(`         100 favs + 50 seen -> payload: ${payload.length} chars, URL: ${shareUrl.length} chars`);
  assert(shareUrl.length < 2000, `URL length ${shareUrl.length} must be < 2000 characters`);
  assert(prodDecodeSharePayload(payload).favorites.length === 100, 'Decoded 100 favorites mismatch');
});

challenge('T14-VOLUME: Synthetic 30-char long IDs (50 favorites + 25 seen) boundary stress test', () => {
  const longIds = Array.from({ length: 50 }, (_, i) => `ev-2025-palco-25-de-abril-${String(i).padStart(4, '0')}`);
  const longSeen = longIds.slice(0, 25);
  const payload = prodEncodeSharePayload(longIds, longSeen);
  const shareUrl = prodCreateShareUrl(payload);

  console.log(`         50 synthetic long IDs (30 chars) -> URL length: ${shareUrl.length} chars`);
  // Standard browser URL limit is 2048 chars; check headroom
  assert(shareUrl.length < 3500, `Payload must not explode exponentially`);
  const decoded = prodDecodeSharePayload(payload);
  assert(decoded.favorites.length === 50, 'Long IDs favorites fidelity');
});

challenge('T15-VOLUME: Deduplication efficiency — 100 duplicate IDs compress to size of 1 unique ID', () => {
  const duplicates = Array.from({ length: 100 }, () => 'ev-repeated-act');
  const payloadDupe = prodEncodeSharePayload(duplicates, duplicates);
  const payloadSingle = prodEncodeSharePayload(['ev-repeated-act'], ['ev-repeated-act']);

  assert(payloadDupe === payloadSingle, 'Deduplication must yield identical minimal payload');
  assert(payloadDupe.length < 100, `Deduplicated payload should be compact (< 100 chars), got ${payloadDupe.length}`);
});

challenge('T16-VOLUME: URL query extractor (extractPayloadFromUrl) robustness', () => {
  const testPayload = prodEncodeSharePayload(['ev-1', 'ev-2'], ['ev-1']);

  // Full URL
  const res1 = prodExtractPayloadFromUrl(`https://pcostarg.github.io/FestaAvanteAgenda/?import=${testPayload}`);
  assert(res1 !== null && res1.favorites.length === 2, 'Full URL extraction failed');

  // URL with additional query params and hash
  const res2 = prodExtractPayloadFromUrl(
    `https://pcostarg.github.io/FestaAvanteAgenda/?view=horario&import=${testPayload}&tab=1#details`
  );
  assert(res2 !== null && res2.favorites.length === 2, 'Complex URL extraction failed');

  // Malformed URL or missing import
  const res3 = prodExtractPayloadFromUrl('https://pcostarg.github.io/FestaAvanteAgenda/?tab=grelha');
  assert(res3 === null, 'Should return null when import param is missing');

  // Broken import param
  const res4 = prodExtractPayloadFromUrl('https://pcostarg.github.io/FestaAvanteAgenda/?import=invalid_broken_payload');
  assert(res4 === null, 'Should return null on unparseable import param');
});

// =====================================================================
// SECTION 3: RFC 5545 CALENDAR GENERATION FOR EMPTY SCHEDULE
// =====================================================================
console.log('\n--- SECTION 3: RFC 5545 CALENDAR GENERATION FOR EMPTY SCHEDULE ---');

challenge('T17-EMPTY-ICS: Empty schedule produces valid RFC 5545 VCALENDAR container', () => {
  const emptyIcs = prodGenerateIcsCalendar([]);
  assert(typeof emptyIcs === 'string', 'ICS output must be string');
  assert(emptyIcs.startsWith('BEGIN:VCALENDAR\r\n'), 'Must start with BEGIN:VCALENDAR\\r\\n');
  assert(emptyIcs.endsWith('END:VCALENDAR\r\n'), 'Must end with END:VCALENDAR\\r\\n');

  const validation = prodValidateIcsCalendar(emptyIcs);
  assert(validation.valid === true, `Empty ICS must be valid. Errors: ${validation.errors.join(', ')}`);
  assert(validation.eventCount === 0, `Event count must be 0, got ${validation.eventCount}`);
  assert(!emptyIcs.includes('BEGIN:VEVENT'), 'Must contain 0 BEGIN:VEVENT lines');
  assert(!emptyIcs.includes('END:VEVENT'), 'Must contain 0 END:VEVENT lines');
});

challenge('T18-EMPTY-ICS: Mandatory RFC 5545 calendar properties in empty calendar', () => {
  const emptyIcs = prodGenerateIcsCalendar([]);

  assert(emptyIcs.includes('VERSION:2.0\r\n'), 'Must specify VERSION:2.0');
  assert(emptyIcs.includes(`PRODID:${ICS_PRODID}\r\n`), 'Must specify canonical PRODID');
  assert(emptyIcs.includes('CALSCALE:GREGORIAN\r\n'), 'Must specify CALSCALE:GREGORIAN');
  assert(emptyIcs.includes('METHOD:PUBLISH\r\n'), 'Must specify METHOD:PUBLISH');
});

challenge('T19-EMPTY-ICS: Strict CRLF line endings throughout empty calendar output', () => {
  const emptyIcs = prodGenerateIcsCalendar([]);

  assert(emptyIcs.includes('\r\n'), 'Must use CRLF line endings');
  const bareLf = emptyIcs.replace(/\r\n/g, '').includes('\n');
  assert(!bareLf, 'Must not contain any bare LF line breaks');
  const bareCr = emptyIcs.replace(/\r\n/g, '').includes('\r');
  assert(!bareCr, 'Must not contain any bare CR line breaks');
});

challenge('T20-EMPTY-ICS: Custom PRODID option works with empty calendar', () => {
  const customProdId = '-//Custom Organization//Avante Test//EN';
  const customIcs = prodGenerateIcsCalendar([], { prodId: customProdId });
  assert(customIcs.includes(`PRODID:${customProdId}\r\n`), 'Custom PRODID must be respected');
  assert(prodValidateIcsCalendar(customIcs).valid === true, 'Custom PRODID ICS must be valid');
});

challenge('T21-EMPTY-ICS: Gracefully filters out null, undefined, or ID-less entries', () => {
  const sparseEvents = [null, undefined, {}, { id: '' }, { title: 'No ID' }];
  const ics = prodGenerateIcsCalendar(sparseEvents);
  const validation = prodValidateIcsCalendar(ics);
  assert(validation.valid === true, 'Sparse invalid array should not corrupt calendar');
  assert(validation.eventCount === 0, 'Sparse invalid array must yield 0 VEVENTs');
});

// =====================================================================
// SECTION 4: LINE FOLDING & UTF-8 MULTI-BYTE PORTUGUESE CHARACTERS
// =====================================================================
console.log('\n--- SECTION 4: LINE FOLDING & UTF-8 MULTI-BYTE PORTUGUESE CHARACTERS ---');

challenge('T22-FOLDING: Lines <= 75 octets are preserved without any folding', () => {
  const shortLine = 'SUMMARY:Concerto de Abertura (Palco 25 de Abril)';
  assert(getUtf8ByteLength(shortLine) <= 75, 'Precondition: line <= 75 bytes');
  const folded = prodFoldIcsLine(shortLine);
  assert(folded === shortLine, 'Short line must remain completely unmodified');
  assert(!folded.includes('\r\n'), 'No line break in unfolded line');
});

challenge('T23-FOLDING: Exactly 75-octet line is not folded, 76-octet line folds into 2 lines', () => {
  // Line of exactly 75 ASCII bytes
  const line75 = 'A'.repeat(75);
  assert(getUtf8ByteLength(line75) === 75, 'Must be 75 bytes');
  assert(prodFoldIcsLine(line75) === line75, '75-byte line must not fold');

  // Line of 76 ASCII bytes
  const line76 = 'A'.repeat(76);
  assert(getUtf8ByteLength(line76) === 76, 'Must be 76 bytes');
  const folded76 = prodFoldIcsLine(line76);
  assert(folded76.includes('\r\n '), '76-byte line must fold with CRLF + space');

  const parts = folded76.split('\r\n ');
  assert(getUtf8ByteLength(parts[0]) === 75, 'First line must be exactly 75 bytes');
  assert(getUtf8ByteLength(parts[1]) === 1, 'Second chunk must be 1 byte');
  // Including the continuation leading space: ' ' + 'A' = 2 bytes <= 75 bytes
  assert(getUtf8ByteLength(' ' + parts[1]) <= 75, 'Continuation line <= 75 bytes');
});

challenge('T24-FOLDING: Multi-byte Portuguese characters at boundary (73-76) NEVER split byte sequence', () => {
  // Portuguese 2-byte characters: ã (C3 A3), ç (C3 A7), é (C3 A9), õ (C3 B5), Á (C3 81), ó (C3 B3)
  const portugueseChars = ['ã', 'ç', 'é', 'õ', 'Á', 'ó', 'í', 'ú', 'ê', 'à'];

  for (const char of portugueseChars) {
    assert(getUtf8ByteLength(char) === 2, `Precondition: ${char} must be 2 UTF-8 bytes`);

    // Test inserting character at positions 70, 71, 72, 73, 74, 75, 76
    for (let prefixLen = 70; prefixLen <= 76; prefixLen++) {
      const prefix = 'X'.repeat(prefixLen);
      const testLine = `${prefix}${char}RestOfContentToFold`;
      const folded = prodFoldIcsLine(testLine);

      // Verify each physical line <= 75 octets
      const lines = folded.split('\r\n');
      for (let i = 0; i < lines.length; i++) {
        const lineBytes = getUtf8ByteLength(lines[i]);
        assert(
          lineBytes <= 75,
          `Line ${i} byte length ${lineBytes} exceeds 75 octets for char '${char}' at prefix ${prefixLen}`
        );

        if (i > 0) {
          assert(lines[i].startsWith(' '), `Continuation line ${i} must start with space`);
        }

        // Verify UTF-8 sequence integrity: decoding must NOT contain Unicode replacement char U+FFFD
        assert(
          !lines[i].includes('\ufffd'),
          `Multi-byte character sequence split detected in line ${i} for '${char}' at prefix ${prefixLen}`
        );
      }

      // Verify perfect round-trip unfolding
      const unfolded = folded.replace(/\r\n /g, '');
      assert(unfolded === testLine, `Unfolded string did not match original for '${char}' at prefix ${prefixLen}`);
    }
  }
});

challenge('T25-FOLDING: 3-byte and 4-byte UTF-8 sequences (€, 🎸, 🇵🇹) at boundary are never split', () => {
  const complexChars = [
    { char: '€', bytes: 3 },       // Euro symbol: 3 bytes
    { char: '🎸', bytes: 4 },      // Guitar emoji: 4 bytes
    { char: '🇵🇹', bytes: 8 },      // Flag sequence: 8 bytes
  ];

  for (const { char, bytes } of complexChars) {
    assert(getUtf8ByteLength(char) === bytes, `Precondition: ${char} byte length mismatch`);

    for (let prefixLen = 68; prefixLen <= 76; prefixLen++) {
      const prefix = 'Z'.repeat(prefixLen);
      const testLine = `DESCRIPTION:${prefix}${char}FestaContinua_2025`;
      const folded = prodFoldIcsLine(testLine);

      const lines = folded.split('\r\n');
      for (let i = 0; i < lines.length; i++) {
        const bl = getUtf8ByteLength(lines[i]);
        assert(bl <= 75, `Line ${i} length ${bl} > 75 for ${char}`);
        assert(!lines[i].includes('\ufffd'), `Broken UTF-8 sequence for ${char}`);
      }

      const unfolded = folded.replace(/\r\n /g, '');
      assert(unfolded === testLine, `Unfolded fidelity broken for ${char}`);
    }
  }
});

challenge('T26-FOLDING: High-volume 1,000+ character Portuguese text folds with 100% unfolding fidelity', () => {
  const authenticPortugueseText =
    'DESCRIPTION:Celebração cultural memorável com atuação especial de grupos tradicionais de Cante Alentejano, ' +
    'música de intervenção e fusão internacional no Palco 25 de Abril da Quinta da Atalaia. ' +
    'Poemas revolucionários de Sophia de Mello Breyner Andresen, Ary dos Santos e Manuel Alegre ' +
    'acompanhados por guitarras portuguesas, violas campaniças e percussões tradicionais de Trás-os-Montes. ' +
    'Participação de coros juvenis e artistas convidados de Angola, Moçambique, Cabo Verde e Galiza.';

  assert(getUtf8ByteLength(authenticPortugueseText) > 400, 'Precondition: text > 400 bytes');

  const folded = prodFoldIcsLine(authenticPortugueseText);
  const lines = folded.split('\r\n');

  assert(lines.length >= 6, `Expected at least 6 folded lines, got ${lines.length}`);
  for (let i = 0; i < lines.length; i++) {
    const lineBytes = getUtf8ByteLength(lines[i]);
    assert(lineBytes <= 75, `Line ${i} exceeds 75 octets (${lineBytes} bytes)`);
    if (i > 0) {
      assert(lines[i].startsWith(' '), `Line ${i} missing continuation space`);
    }
  }

  // Exact round-trip unfolding
  const unfolded = folded.replace(/\r\n /g, '');
  assert(unfolded === authenticPortugueseText, 'Full round-trip text must match character-for-character');
});

challenge('T27-FOLDING: Control character escaping precedes folding and escapes are never broken', () => {
  const rawText = 'Grupo A; Grupo B, "Cante & Viola" \\ Lisboa\nSegunda linha com vírgula, e ponto-e-vírgula;';
  const escaped = prodEscapeIcsText(rawText);

  assert(!escaped.includes('\n') || escaped.includes('\\n'), 'Raw newline must be escaped');
  assert(escaped.includes('\\;'), 'Semicolon must be escaped');
  assert(escaped.includes('\\,'), 'Comma must be escaped');
  assert(escaped.includes('\\\\'), 'Backslash must be escaped');

  const longLineWithEscapes = `DESCRIPTION:${escaped.repeat(5)}`;
  const folded = prodFoldIcsLine(longLineWithEscapes);
  const lines = folded.split('\r\n');

  for (const line of lines) {
    assert(getUtf8ByteLength(line) <= 75, `Line with escaped chars exceeds 75 bytes: ${line}`);
  }

  const unfolded = folded.replace(/\r\n /g, '');
  assert(unfolded === longLineWithEscapes, 'Escapes preserved after unfolding');
});

// =====================================================================
// SECTION 5: MIDNIGHT CROSSING & NOCTURNAL FESTIVAL SCHEDULE CALCULATIONS
// =====================================================================
console.log('\n--- SECTION 5: MIDNIGHT CROSSING & NOCTURNAL FESTIVAL SCHEDULE CALCULATIONS ---');

challenge('T28-MIDNIGHT: Act crossing midnight (23:30 to 00:45) increments UTC day for DTEND only', () => {
  // Friday act crossing midnight into Saturday
  const midnightEvent = {
    id: 'ev-fri-crossing-01',
    title: 'Concerto da Meia-Noite',
    stage: 'Palco 25 de Abril',
    day: 'sexta',
    date: '2025-09-05',
    timeStart: '23:30',
    timeEnd: '00:45',
    category: 'Música',
  };

  const { startDate, endDate } = prodComputeEventDates(midnightEvent);

  assert(startDate.getUTCFullYear() === 2025, 'Start year must be 2025');
  assert(startDate.getUTCMonth() === 8, 'Start month must be September (index 8)');
  assert(startDate.getUTCDate() === 5, 'Start day must be 5');
  assert(startDate.getUTCHours() === 23, 'Start hour must be 23');
  assert(startDate.getUTCMinutes() === 30, 'Start minutes must be 30');

  assert(endDate.getUTCFullYear() === 2025, 'End year must be 2025');
  assert(endDate.getUTCMonth() === 8, 'End month must be September (index 8)');
  assert(endDate.getUTCDate() === 6, 'End day must increment to 6 (Saturday)');
  assert(endDate.getUTCHours() === 0, 'End hour must be 0');
  assert(endDate.getUTCMinutes() === 45, 'End minutes must be 45');

  const ics = prodGenerateIcsCalendar([midnightEvent]);
  assert(ics.includes('DTSTART:20250905T233000Z'), `DTSTART mismatch in ICS: ${ics}`);
  assert(ics.includes('DTEND:20250906T004500Z'), `DTEND mismatch in ICS: ${ics}`);
});

challenge('T29-MIDNIGHT: Act ending exactly at 00:00 (23:00 to 00:00) increments UTC day for DTEND', () => {
  const boundaryEvent = {
    id: 'ev-fri-exact-midnight',
    title: 'Fecho da Noite de Sexta',
    stage: 'Auditório 1º de Maio',
    day: 'sexta',
    timeStart: '23:00',
    timeEnd: '00:00',
    category: 'Música',
  };

  const { startDate, endDate } = prodComputeEventDates(boundaryEvent);
  assert(startDate.getUTCDate() === 5, 'Start day 5');
  assert(endDate.getUTCDate() === 6, 'End day must increment to 6 for 00:00 midnight end');
  assert(endDate.getUTCHours() === 0 && endDate.getUTCMinutes() === 0, 'End time 00:00');

  const ics = prodGenerateIcsCalendar([boundaryEvent]);
  assert(ics.includes('DTSTART:20250905T230000Z'), 'DTSTART');
  assert(ics.includes('DTEND:20250906T000000Z'), 'DTEND 00:00 on next day');
});

challenge('T30-MIDNIGHT: Nocturnal dawn act (01:15 to 02:30) on Friday schedule increments BOTH DTSTART and DTEND', () => {
  // Friday schedule nocturnal acts starting after midnight (Saturday early morning)
  const dawnEvent = {
    id: 'ev-fri-dawn-act',
    title: 'Sessão DJ Madrugada',
    stage: 'Cidade da Juventude',
    day: 'sexta',
    date: '2025-09-05',
    timeStart: '01:15',
    timeEnd: '02:30',
    category: 'Música',
  };

  const { startDate, endDate } = prodComputeEventDates(dawnEvent);
  assert(startDate.getUTCDate() === 6, 'DTSTART must roll to Saturday 6th for 01:15 act');
  assert(startDate.getUTCHours() === 1 && startDate.getUTCMinutes() === 15, 'DTSTART time 01:15');

  assert(endDate.getUTCDate() === 6, 'DTEND must roll to Saturday 6th for 02:30 act');
  assert(endDate.getUTCHours() === 2 && endDate.getUTCMinutes() === 30, 'DTEND time 02:30');

  const ics = prodGenerateIcsCalendar([dawnEvent]);
  assert(ics.includes('DTSTART:20250906T011500Z'), 'Dawn DTSTART in ICS');
  assert(ics.includes('DTEND:20250906T023000Z'), 'Dawn DTEND in ICS');
});

challenge('T31-MIDNIGHT: Multi-day festival schedule — Friday (5), Saturday (6), and Sunday (7)', () => {
  const friAct = { id: 'e-fri', day: 'sexta', timeStart: '18:00', timeEnd: '19:30' };
  const satAct = { id: 'e-sat', day: 'sabado', timeStart: '15:00', timeEnd: '16:00' };
  const sunAct = { id: 'e-sun', day: 'domingo', timeStart: '17:00', timeEnd: '18:00' };

  const ics = prodGenerateIcsCalendar([friAct, satAct, sunAct]);

  assert(ics.includes('DTSTART:20250905T180000Z'), 'Friday act start');
  assert(ics.includes('DTSTART:20250906T150000Z'), 'Saturday act start');
  assert(ics.includes('DTSTART:20250907T170000Z'), 'Sunday act start');
  assert(prodValidateIcsCalendar(ics).eventCount === 3, '3 events generated');
});

challenge('T32-MIDNIGHT: Sunday night act crossing midnight (23:30 to 00:30) rolls into Monday 8 Sep', () => {
  const sunMidnight = {
    id: 'ev-sun-closing',
    title: 'Festa de Encerramento',
    stage: 'Palco 25 de Abril',
    day: 'domingo',
    date: '2025-09-07',
    timeStart: '23:30',
    timeEnd: '00:30',
    category: 'Música',
  };

  const { startDate, endDate } = prodComputeEventDates(sunMidnight);
  assert(startDate.getUTCDate() === 7, 'Start on Sunday 7');
  assert(endDate.getUTCDate() === 8, 'End on Monday 8 (month date roll)');

  const ics = prodGenerateIcsCalendar([sunMidnight]);
  assert(ics.includes('DTSTART:20250907T233000Z'), 'Sunday start');
  assert(ics.includes('DTEND:20250908T003000Z'), 'Monday end');
});

challenge('T33-MIDNIGHT: Day resolution handles date strings, day codes, day names, and fallbacks', () => {
  assert(prodResolveEventDate({ date: '2025-09-05' }) === '2025-09-05', 'date field');
  assert(prodResolveEventDate({ day: '2025-09-06' }) === '2025-09-06', 'day field with ISO');
  assert(prodResolveEventDate({ day: 'sexta' }) === '2025-09-05', 'day: sexta');
  assert(prodResolveEventDate({ day: 'sabado' }) === '2025-09-06', 'day: sabado');
  assert(prodResolveEventDate({ day: 'domingo' }) === '2025-09-07', 'day: domingo');
  assert(prodResolveEventDate({ dayCode: 'fri' }) === '2025-09-05', 'dayCode: fri');
  assert(prodResolveEventDate({ dayCode: 'sat' }) === '2025-09-06', 'dayCode: sat');
  assert(prodResolveEventDate({ dayCode: 'sun' }) === '2025-09-07', 'dayCode: sun');
  assert(prodResolveEventDate({}) === '2025-09-05', 'empty object fallback');
});

// =====================================================================
// SECTION 6: JSON EXPORT EXACT FAVORITES ORDER PRESERVATION
// =====================================================================
console.log('\n--- SECTION 6: JSON EXPORT EXACT FAVORITES ORDER PRESERVATION ---');

challenge('T34-ORDER: Exact non-chronological user order of favorites is preserved 100% in backup', () => {
  const userFavorites = [
    'ev-sun-livro-1500',   // Sunday afternoon
    'ev-fri-p25-abril-1900', // Friday evening
    'ev-sat-paz-1600',       // Saturday afternoon
    'ev-fri-aud-2200',       // Friday night
  ];

  const backup = prodCreateJsonBackup(userFavorites, ['ev-fri-p25-abril-1900']);

  assert(Array.isArray(backup.favorites), 'backup.favorites must be an array');
  assert(backup.favorites.length === userFavorites.length, 'Length must match');

  for (let i = 0; i < userFavorites.length; i++) {
    assert(
      backup.favorites[i] === userFavorites[i],
      `Index ${i} mismatch: expected ${userFavorites[i]}, got ${backup.favorites[i]}`
    );
  }
});

challenge('T35-ORDER: Deduplication preserves order of first appearance in favorites', () => {
  const favoritesWithDuplicates = ['ev-C', 'ev-A', 'ev-C', 'ev-B', 'ev-A', 'ev-D'];
  const backup = prodCreateJsonBackup(favoritesWithDuplicates, []);

  const expectedOrder = ['ev-C', 'ev-A', 'ev-B', 'ev-D'];
  assert(backup.favorites.length === expectedOrder.length, 'Length after dedup');
  assert(
    JSON.stringify(backup.favorites) === JSON.stringify(expectedOrder),
    `Deduplication reordered elements: ${JSON.stringify(backup.favorites)}`
  );
});

challenge('T36-ORDER: Event summaries in backup match user favorites order when allEvents is provided', () => {
  const userFavorites = ['ev-sat-paz-1600', 'ev-fri-p25-abril-1900'];
  const backup = prodCreateJsonBackup(userFavorites, [], TEST_EVENTS);

  assert(backup.events !== undefined, 'backup.events should be populated');
  assert(backup.events.length === 2, 'backup.events length');
  assert(backup.events[0].id === 'ev-sat-paz-1600', 'First event summary must match first user favorite');
  assert(backup.events[1].id === 'ev-fri-p25-abril-1900', 'Second event summary must match second user favorite');
});

challenge('T37-ORDER: JSON backup schema conforms to specification and validateJsonBackup passes', () => {
  const backup = prodCreateJsonBackup(['ev-1'], ['ev-1']);

  assert(backup.app === APP_IDENTIFIER, `App identifier must be ${APP_IDENTIFIER}`);
  assert(backup.version === SCHEMA_VERSION, `Version must be ${SCHEMA_VERSION}`);
  assert(typeof backup.exportedAt === 'string', 'exportedAt must be string');
  assert(backup.exportedAt.endsWith('Z'), 'exportedAt must be UTC ending in Z');
  assert(!isNaN(Date.parse(backup.exportedAt)), 'exportedAt must be parseable ISO date');

  const validation = prodValidateJsonBackup(backup);
  assert(validation.valid === true, `validateJsonBackup should accept valid backup: ${validation.errors.join(', ')}`);
});

challenge('T38-ORDER: validateJsonBackup rejects corrupted or malformed payloads', () => {
  const invalidBackups = [
    null,
    undefined,
    'not an object',
    { favorites: 'not-an-array' },
    { favorites: [123, 456] },       // non-string elements
    { favorites: ['ev-1'], seen: 'not-an-array' },
    { favorites: ['ev-1'], exportedAt: 'invalid-date-string' },
  ];

  for (const inv of invalidBackups) {
    const result = prodValidateJsonBackup(inv);
    assert(result.valid === false, `validateJsonBackup should reject: ${JSON.stringify(inv)}`);
    assert(result.errors.length > 0, 'Should return descriptive errors');
  }
});

challenge('T39-ORDER: Target filenames adhere strictly to specifications', () => {
  assert(JSON_BACKUP_FILENAME === 'minha-agenda-avante.json', 'JSON filename must be minha-agenda-avante.json');
  assert(ICS_FILENAME === 'meu_avante_2025.ics', 'ICS filename must be meu_avante_2025.ics');
});

// =====================================================================
// SECTION 7: CROSS-ENGINE INTEROPERABILITY & AUTHENTIC DATASET STRESS
// =====================================================================
console.log('\n--- SECTION 7: CROSS-ENGINE INTEROPERABILITY & AUTHENTIC DATASET STRESS ---');

challenge('T40-INTEROP: Production sharePayload and E2E contracts equivalence on valid payloads', () => {
  for (let i = 1; i <= 15; i++) {
    const favs = Array.from({ length: i }, (_, k) => `ev-test-${k}`);
    const seen = favs.slice(0, Math.floor(i / 2));

    const prodEnc = prodEncodeSharePayload(favs, seen);
    const contEnc = contractEncodeSharePayload(favs, seen);
    assert(prodEnc === contEnc, `Encoded payload mismatch between prod and contract at len ${i}`);

    const prodDec = prodDecodeSharePayload(prodEnc);
    const contDec = contractDecodeSharePayload(contEnc);
    assert(JSON.stringify(prodDec.favorites) === JSON.stringify(contDec.favorites), 'Decoded favorites equivalence');
    assert(JSON.stringify(prodDec.seen) === JSON.stringify(contDec.seen), 'Decoded seen equivalence');
  }
});

challenge('T41-INTEROP: Scanned text extractor (extractScheduleFromScannedText) multi-channel support', () => {
  const sampleFavs = ['ev-fri-p25-abril-1900', 'ev-sat-paz-1600'];
  const sampleSeen = ['ev-fri-p25-abril-1900'];
  const payload = prodEncodeSharePayload(sampleFavs, sampleSeen);

  // 1. Full URL
  const r1 = prodExtractScheduleFromScannedText(`https://pcostarg.github.io/FestaAvanteAgenda/?import=${payload}`);
  assert(r1.favorites.length === 2, 'Channel 1 (Full URL) failed');

  // 2. Partial URL
  const r2 = prodExtractScheduleFromScannedText(`?import=${payload}`);
  assert(r2.favorites.length === 2, 'Channel 2 (Partial URL) failed');

  // 3. Raw Base64 string directly
  const r3 = prodExtractScheduleFromScannedText(payload);
  assert(r3.favorites.length === 2, 'Channel 3 (Raw Base64) failed');

  // 4. Raw JSON backup string
  const rawJson = JSON.stringify({ favorites: sampleFavs, seen: sampleSeen });
  const r4 = prodExtractScheduleFromScannedText(rawJson);
  assert(r4.favorites.length === 2, 'Channel 4 (Raw JSON) failed');

  // 5. Rejection of random non-festival texts and URLs
  const foreignInputs = [
    'https://www.google.com/search?q=avante',
    'https://example.com/some-page',
    'WiFi:S:AvanteGuest;P:secret;;',
    'Just some arbitrary QR code text',
  ];
  for (const foreign of foreignInputs) {
    let threw = false;
    try {
      prodExtractScheduleFromScannedText(foreign);
    } catch (err) {
      threw = true;
      assert(
        err.message === 'O código lido não contém uma agenda válida da Festa do Avante!',
        `Unexpected error message: ${err.message}`
      );
    }
    assert(threw, `Foreign text should be rejected: ${foreign}`);
  }
});

challenge('T42-INTEROP: Full authentic dataset (269 acts) JSON and ICS export stress test', () => {
  const startTime = Date.now();
  const allIds = authenticProgram.map((e) => e.id);

  // 1. JSON backup of entire festival
  const fullBackup = prodCreateJsonBackup(allIds, allIds.slice(0, 50), authenticProgram);
  assert(fullBackup.favorites.length === 269, 'All 269 favorites preserved');
  assert(fullBackup.events.length === 269, 'All 269 event summaries generated');
  assert(prodValidateJsonBackup(fullBackup).valid === true, 'Full dataset backup valid');

  // 2. ICS calendar of entire festival
  const fullIcs = prodGenerateIcsCalendar(authenticProgram);
  const icsValidation = prodValidateIcsCalendar(fullIcs);
  assert(icsValidation.valid === true, `Full dataset ICS must be valid: ${icsValidation.errors.join(', ')}`);
  assert(icsValidation.eventCount === 269, `All 269 VEVENTs generated, got ${icsValidation.eventCount}`);

  // Check that no folded lines exceed 75 bytes across the entire 269-act calendar
  const icsLines = fullIcs.split('\r\n');
  for (let i = 0; i < icsLines.length; i++) {
    const bl = getUtf8ByteLength(icsLines[i]);
    assert(
      bl <= 75,
      `Line ${i} in full calendar exceeds 75 octets (${bl} bytes): ${icsLines[i].slice(0, 40)}...`
    );
  }

  const durationMs = Date.now() - startTime;
  console.log(`         Full dataset (269 acts) JSON + ICS processed in ${durationMs}ms with 0 violations!`);
  assert(durationMs < 1000, `Processing 269 acts should be < 1s, took ${durationMs}ms`);
});

// =====================================================================
// SUMMARY
// =====================================================================
console.log('\n========================================================================');
console.log(' ADVERSARIAL STRESS TEST SUMMARY REPORT');
console.log('========================================================================');
console.log(`  Total Challenges : ${totalTests}`);
console.log(`  Passed           : ${passedTests}`);
console.log(`  Failed           : ${failedTests}`);
if (findings.length > 0) {
  console.log(`\n  Findings Recorded: ${findings.length}`);
  findings.forEach((f, idx) => {
    console.log(`    ${idx + 1}. [${f.severity.toUpperCase()}] ${f.area}: ${f.details}`);
  });
}
console.log('========================================================================\n');

if (failedTests > 0) {
  console.error(`✖ ADVERSARIAL CHALLENGES FAILED: ${failedTests} failures detected!\n`);
  process.exit(1);
} else {
  console.log('✔ ALL ADVERSARIAL CHALLENGES PASSED EMPIRICALLY! (100% SUCCESS RATE)\n');
  process.exit(0);
}
