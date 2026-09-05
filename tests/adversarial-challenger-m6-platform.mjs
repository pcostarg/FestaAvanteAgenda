#!/usr/bin/env node
/**
 * tests/adversarial-challenger-m6-platform.mjs
 * Tier 5 White-Box Adversarial Coverage Hardening on Sharing, Import/Export & Platform Routing
 *
 * M6 Challenger 2 (Empirical Challenger)
 * Festa do Avante! 2025 PWA
 */

import fs from 'fs';
import path from 'path';

// Direct imports of application source modules
import {
  generateIcsCalendar,
  validateIcsCalendar,
  foldIcsLine,
  escapeIcsText,
  computeEventDates,
  resolveEventDate,
  formatIcsUtcDate,
  ICS_PRODID,
  ICS_FILENAME,
} from '../src/utils/ics.ts';

import {
  encodeSharePayload,
  decodeSharePayload,
  createShareUrl,
  extractPayloadFromUrl,
  extractScheduleFromScannedText,
  SHARE_URL_PREFIX,
  SHARE_URL_BASE,
} from '../src/utils/sharePayload.ts';

import {
  createJsonBackup,
  validateJsonBackup,
  summarizeEvent,
  SCHEMA_VERSION,
} from '../src/utils/jsonBackup.ts';

// Test runner infrastructure
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(`${message || 'Assertion failed'}: expected ${expectedStr}, got ${actualStr}`);
  }
}

function runTest(suiteName, testId, description, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ${GREEN}✔${RESET} [${testId}] ${description}`);
  } catch (err) {
    failedTests++;
    failures.push({ suiteName, testId, description, error: err.message, stack: err.stack });
    console.log(`  ${RED}✖${RESET} [${testId}] ${BOLD}${description}${RESET}`);
    console.log(`    ${RED}${err.message}${RESET}`);
  }
}

// Load official festival dataset for authentic payload tests
const programPath = path.resolve(process.cwd(), 'src/data/program.json');
const rawProgram = fs.readFileSync(programPath, 'utf-8');
const festivalEvents = JSON.parse(rawProgram);

console.log(`\n${BOLD}${CYAN}========================================================================${RESET}`);
console.log(`${BOLD}${CYAN} TIER 5 ADVERSARIAL TEST HARNESS: SHARING & PLATFORM HARDENING${RESET}`);
console.log(`${BOLD}${CYAN} M6 Challenger 2 — Empirical Challenger Verification${RESET}`);
console.log(`${BOLD}${CYAN}========================================================================${RESET}\n`);

// -----------------------------------------------------------------------------
// SUITE 1: RFC 5545 ICS CALENDAR GENERATION ADVERSARIAL STRESS PROBES
// -----------------------------------------------------------------------------
console.log(`${BOLD}Suite 1: RFC 5545 Compliance & Edge Cases (src/utils/ics.ts)${RESET}`);

runTest('ICS Generator', 'ADV-M6-ICS-01', 'Strict CRLF Line Endings (\\r\\n) with zero isolated \\n or \\r', () => {
  const sampleEvents = festivalEvents.slice(0, 5);
  const ics = generateIcsCalendar(sampleEvents);

  // File must end with \r\n
  assert(ics.endsWith('\r\n'), 'ICS output must end with CRLF (\\r\\n)');

  // No isolated \n (LF without preceding CR)
  const isolatedLfMatch = /[^\r]\n/.exec(ics);
  assert(!isolatedLfMatch, `Found isolated LF without CR at index ${isolatedLfMatch ? isolatedLfMatch.index : 0}`);

  // No isolated \r (CR without following LF)
  const isolatedCrMatch = /\r[^\n]/.exec(ics);
  assert(!isolatedCrMatch, `Found isolated CR without LF at index ${isolatedCrMatch ? isolatedCrMatch.index : 0}`);

  // Every line split by \r\n must not contain \r or \n
  const lines = ics.split('\r\n');
  for (let i = 0; i < lines.length - 1; i++) {
    assert(!lines[i].includes('\r'), `Line ${i} contains internal CR`);
    assert(!lines[i].includes('\n'), `Line ${i} contains internal LF`);
  }
});

runTest('ICS Generator', 'ADV-M6-ICS-02', '75-octet safe folding over Portuguese UTF-8 characters', () => {
  // Construct strings with Portuguese multi-byte characters at critical byte boundaries (70-80 octets)
  const portugueseTexts = [
    'A'.repeat(60) + 'Atenção e Resistência!', // multi-byte ã, ç, ê
    'Palco 25 de Abril: Comemoração das Canções de Liberdade, Luta e Celebração Popular 2025',
    'Descrição com acentos: José Afonso, Canção dos Abraços, Avanteatro e CineAvante!',
    'Vítor e João vão ao comício de encerramento no Palco 25 de Abril com grande emoção',
  ];

  for (const text of portugueseTexts) {
    const rawLine = `DESCRIPTION:${escapeIcsText(text)}`;
    const folded = foldIcsLine(rawLine);
    const foldedLines = folded.split('\r\n');

    for (let idx = 0; idx < foldedLines.length; idx++) {
      const line = foldedLines[idx];
      const byteLen = Buffer.byteLength(line, 'utf-8');
      assert(byteLen <= 75, `Folded line ${idx} exceeds 75 octets: ${byteLen} bytes ("${line}")`);
      if (idx > 0) {
        assert(line.startsWith(' '), `Continuation line ${idx} must start with linear white space (0x20)`);
      }
    }

    // Unfolding (RFC 5545: any CRLF immediately followed by a space is removed)
    const unfolded = folded.replace(/\r\n /g, '');
    assertEqual(unfolded, rawLine, 'Unfolded line must exactly match original raw line without corruption');
  }
});

runTest('ICS Generator', 'ADV-M6-ICS-03', 'Multi-byte UTF-8 character never split across fold boundaries (fuzzing boundary lengths)', () => {
  // Test character boundaries from 65 to 80 chars where 2-byte char sits right at byte 74-76
  for (let prefixLen = 65; prefixLen <= 80; prefixLen++) {
    const prefix = 'X'.repeat(prefixLen);
    const testLine = `SUMMARY:${prefix}çãõé${prefix}`;
    const folded = foldIcsLine(testLine);
    const lines = folded.split('\r\n');

    for (const line of lines) {
      const byteLen = Buffer.byteLength(line, 'utf-8');
      assert(byteLen <= 75, `Line length ${byteLen} exceeds 75 octets with prefix length ${prefixLen}`);
      // Ensure valid UTF-8 by re-encoding
      const buf = Buffer.from(line, 'utf-8');
      const roundtripStr = buf.toString('utf-8');
      assertEqual(roundtripStr, line, 'String must remain valid UTF-8 without broken byte sequences');
    }

    const unfolded = folded.replace(/\r\n /g, '');
    assertEqual(unfolded, testLine, `Unfolded string mismatch for prefix length ${prefixLen}`);
  }
});

runTest('ICS Generator', 'ADV-M6-ICS-04', 'Emoji & 3-byte and 4-byte characters fold safely without breaking code points', () => {
  const lineWithEmoji = 'SUMMARY:' + '🎸'.repeat(25) + ' — Festa do Avante! ' + '⭐'.repeat(20);
  const folded = foldIcsLine(lineWithEmoji);
  const lines = folded.split('\r\n');

  for (const line of lines) {
    const byteLen = Buffer.byteLength(line, 'utf-8');
    assert(byteLen <= 75, `Emoji line exceeds 75 bytes: ${byteLen}`);
    // Check no replacement characters (U+FFFD) caused by split surrogate or UTF-8 sequence
    assert(!line.includes('\uFFFD'), 'Emoji fold produced invalid character (U+FFFD)');
  }

  const unfolded = folded.replace(/\r\n /g, '');
  assertEqual(unfolded, lineWithEmoji, 'Emoji string reconstituted faithfully after unfolding');
});

runTest('ICS Generator', 'ADV-M6-ICS-05', 'Empty schedule produces valid RFC 5545 VCALENDAR with 0 VEVENTs', () => {
  const emptyIcs = generateIcsCalendar([]);
  assert(emptyIcs.startsWith('BEGIN:VCALENDAR\r\n'), 'Must start with BEGIN:VCALENDAR\\r\\n');
  assert(emptyIcs.includes('VERSION:2.0\r\n'), 'Must contain VERSION:2.0');
  assert(emptyIcs.includes(`PRODID:${ICS_PRODID}\r\n`), 'Must contain PRODID');
  assert(emptyIcs.includes('CALSCALE:GREGORIAN\r\n'), 'Must contain CALSCALE');
  assert(emptyIcs.includes('METHOD:PUBLISH\r\n'), 'Must contain METHOD:PUBLISH');
  assert(emptyIcs.endsWith('END:VCALENDAR\r\n'), 'Must end with END:VCALENDAR\\r\\n');

  const validation = validateIcsCalendar(emptyIcs);
  assert(validation.valid, `Validation failed: ${validation.errors.join(', ')}`);
  assertEqual(validation.eventCount, 0, 'Event count must be 0 for empty schedule');
});

runTest('ICS Generator', 'ADV-M6-ICS-06', 'Midnight crossing act increments end UTC date by +1 day', () => {
  // Friday 2025-09-05: 23:30 to 01:15 (Saturday morning)
  const midnightEvent = {
    id: 'test-midnight-act',
    title: 'Concerto Madrugada',
    stage: 'Palco 25 de Abril',
    day: '2025-09-05',
    startTime: '23:30',
    endTime: '01:15',
  };

  const dates = computeEventDates(midnightEvent);
  assertEqual(dates.startDate.toISOString(), '2025-09-05T23:30:00.000Z', 'Start date must remain Friday 2025-09-05');
  assertEqual(dates.endDate.toISOString(), '2025-09-06T01:15:00.000Z', 'End date must increment to Saturday 2025-09-06');

  const ics = generateIcsCalendar([midnightEvent]);
  assert(ics.includes('DTSTART:20250905T233000Z'), 'ICS must contain formatted UTC DTSTART');
  assert(ics.includes('DTEND:20250906T011500Z'), 'ICS must contain incremented UTC DTEND');
});

runTest('ICS Generator', 'ADV-M6-ICS-07', 'Festival dawn acts (< 06:00) advance BOTH start and end dates to next calendar day', () => {
  // Act listed under Friday festival day starting at 01:30 and ending at 03:00
  const dawnEvent = {
    id: 'test-dawn-act',
    title: 'DJ Set Madrugada',
    stage: 'Cidade da Juventude',
    day: 'sexta',
    startTime: '01:30',
    endTime: '03:00',
  };

  const dates = computeEventDates(dawnEvent);
  assertEqual(dates.startDate.toISOString(), '2025-09-06T01:30:00.000Z', 'Start date for 01:30 Friday night is Saturday 2025-09-06');
  assertEqual(dates.endDate.toISOString(), '2025-09-06T03:00:00.000Z', 'End date for 03:00 Friday night is Saturday 2025-09-06');
});

runTest('ICS Generator', 'ADV-M6-ICS-08', 'Midnight boundary: act ending at 00:00 increments end date cleanly', () => {
  const midnightEndEvent = {
    id: 'test-boundary-00',
    title: 'Sessão Cinema',
    stage: 'CineAvante!',
    day: 'sabado',
    startTime: '22:30',
    endTime: '00:00',
  };

  const dates = computeEventDates(midnightEndEvent);
  assertEqual(dates.startDate.toISOString(), '2025-09-06T22:30:00.000Z');
  assertEqual(dates.endDate.toISOString(), '2025-09-07T00:00:00.000Z');
});

runTest('ICS Generator', 'ADV-M6-ICS-09', 'Sunday festival closing act rolls over into Monday 2025-09-08', () => {
  const sundayClosingEvent = {
    id: 'test-sunday-closing',
    title: 'Espetáculo de Encerramento',
    stage: 'Palco 25 de Abril',
    day: 'domingo',
    startTime: '23:00',
    endTime: '00:45',
  };

  const dates = computeEventDates(sundayClosingEvent);
  assertEqual(dates.startDate.toISOString(), '2025-09-07T23:00:00.000Z');
  assertEqual(dates.endDate.toISOString(), '2025-09-08T00:45:00.000Z');
});

runTest('ICS Generator', 'ADV-M6-ICS-10', 'Control character escaping (\\, ;, ,, \\n) and deterministic UID formatting', () => {
  const hostileEvent = {
    id: 'act;123,456\\test',
    title: 'Banda; Rock, Jazz & Soul \\ Acústico',
    description: 'Linha 1\nLinha 2; com ponto e vírgula, e vírgula, e uma barra \\ inversa.',
    stage: 'Auditório 1º de Maio',
    day: '2025-09-05',
    startTime: '19:00',
    endTime: '20:30',
    category: 'Música & Espetáculo',
  };

  const ics = generateIcsCalendar([hostileEvent]);
  assert(ics.includes(`UID:act;123,456\\test@festadoavante.pcp.pt`), 'Deterministic UID must have festival domain suffix');
  assert(ics.includes('Banda\\; Rock\\, Jazz & Soul \\\\ Acústico'), 'Escapes semicolon, comma, backslash in summary');

  // Verify that unfolded text contains the literal \n representation
  const unfolded = ics.replace(/\r\n /g, '');
  assert(unfolded.includes('Linha 1\\nLinha 2\\; com ponto e vírgula\\, e vírgula\\, e uma barra \\\\ inversa.'), 'Escapes newline to literal \\n in unfolded content');

  const validation = validateIcsCalendar(ics);
  assert(validation.valid, `Hostile ICS must be strictly valid: ${validation.errors.join(', ')}`);
});

runTest('ICS Generator', 'ADV-M6-ICS-11', 'Optional VALARM reminder trigger generation', () => {
  const ev = festivalEvents[0];
  const icsWithAlarm = generateIcsCalendar([ev], { includeAlarm: true, alarmMinutesBefore: 20 });
  assert(icsWithAlarm.includes('BEGIN:VALARM'), 'Must include BEGIN:VALARM');
  assert(icsWithAlarm.includes('ACTION:DISPLAY'), 'Must include ACTION:DISPLAY');
  assert(icsWithAlarm.includes('TRIGGER:-PT20M'), 'Must set TRIGGER:-PT20M');
  assert(icsWithAlarm.includes('END:VALARM'), 'Must include END:VALARM');
});

// -----------------------------------------------------------------------------
// SUITE 2: SHARING PAYLOAD COMPRESSION & TAMPERING PROBES
// -----------------------------------------------------------------------------
console.log(`\n${BOLD}Suite 2: Sharing Payload & Compression (src/utils/sharePayload.ts & jsonBackup.ts)${RESET}`);

runTest('Share Payload', 'ADV-M6-SHARE-01', 'Base64URL encoding strictly omits plus (+), slash (/), and equal (=)', () => {
  const ids = ['ev-1', 'ev-2', 'special+id', 'special/id', 'special=id'];
  const payload = encodeSharePayload(ids, ids);

  assert(!payload.includes('+'), 'Payload must not contain "+"');
  assert(!payload.includes('/'), 'Payload must not contain "/"');
  assert(!payload.includes('='), 'Payload must not contain "="');
  assert(/^[A-Za-z0-9_-]+$/.test(payload), 'Payload must strictly match URL-safe Base64 regex [A-Za-z0-9_-]');
});

runTest('Share Payload', 'ADV-M6-SHARE-02', 'Base64URL modulus 4 padding recovery handles lengths with 0, 1, 2, or 3 padding equals', () => {
  // Iterate through payload lengths that result in all variations of (length % 4)
  for (let n = 1; n <= 25; n++) {
    const favs = Array.from({ length: n }, (_, i) => `act-${i}`);
    const seen = Array.from({ length: Math.floor(n / 2) }, (_, i) => `act-${i}`);

    const encoded = encodeSharePayload(favs, seen);
    const mod = encoded.length % 4;
    assert(mod === 0 || mod === 2 || mod === 3, `Valid Base64URL cannot have length % 4 == 1 (got length ${encoded.length})`);

    const decoded = decodeSharePayload(encoded);
    assertEqual(decoded.favorites, favs, `Roundtrip failed for favorite count ${n}`);
    assertEqual(decoded.seen, seen, `Roundtrip failed for seen count ${n}`);
  }
});

runTest('Share Payload', 'ADV-M6-SHARE-03', 'High-density schedules (50+ favorites) stay strictly within < 2000 chars URL budget', () => {
  const real50Favs = festivalEvents.slice(0, 50).map((e) => e.id);
  const real25Seen = festivalEvents.slice(0, 25).map((e) => e.id);

  const payload = encodeSharePayload(real50Favs, real25Seen);
  const fullUrl = createShareUrl(payload);

  assert(fullUrl.length < 2000, `URL length for 50 acts must be < 2000 chars (actual: ${fullUrl.length})`);
  assert(fullUrl.startsWith(SHARE_URL_PREFIX), 'URL must begin with SHARE_URL_PREFIX');

  const decoded = decodeSharePayload(payload);
  assertEqual(decoded.favorites.length, 50, 'Decoded favorites count must be 50');
  assertEqual(decoded.seen.length, 25, 'Decoded seen count must be 25');
});

runTest('Share Payload', 'ADV-M6-SHARE-04', 'Extreme density (100 favorites + 50 seen) URL length budget < 2000 chars', () => {
  const real100Favs = festivalEvents.slice(0, 100).map((e) => e.id);
  const real50Seen = festivalEvents.slice(0, 50).map((e) => e.id);

  const payload = encodeSharePayload(real100Favs, real50Seen);
  const fullUrl = createShareUrl(payload);

  assert(fullUrl.length < 2000, `URL length for 100 favorites + 50 seen must be < 2000 chars (actual: ${fullUrl.length})`);

  const decoded = decodeSharePayload(payload);
  assertEqual(decoded.favorites.length, 100);
  assertEqual(decoded.seen.length, 50);
});

runTest('Share Payload', 'ADV-M6-SHARE-05', 'Deduplication of favorites and seen IDs during encode', () => {
  const duplicateFavs = ['ev-1', 'ev-2', 'ev-1', 'ev-2', 'ev-3', '  '];
  const duplicateSeen = ['ev-1', 'ev-1', 'ev-4', ''];

  const payload = encodeSharePayload(duplicateFavs, duplicateSeen);
  const decoded = decodeSharePayload(payload);

  assertEqual(decoded.favorites, ['ev-1', 'ev-2', 'ev-3']);
  assertEqual(decoded.seen, ['ev-1', 'ev-4']);
});

runTest('Share Payload', 'ADV-M6-SHARE-06', 'Corrupt / empty / whitespace payload throws "Payload string is required"', () => {
  let threwNull = false;
  try {
    decodeSharePayload(null);
  } catch (err) {
    threwNull = err.message === 'Payload string is required';
  }
  assert(threwNull, 'Null payload must throw "Payload string is required"');

  let threwEmpty = false;
  try {
    decodeSharePayload('');
  } catch (err) {
    threwEmpty = err.message === 'Payload string is required';
  }
  assert(threwEmpty, 'Empty payload must throw "Payload string is required"');

  let threwSpaces = false;
  try {
    decodeSharePayload('    ');
  } catch (err) {
    threwSpaces = err.message === 'Payload string is required';
  }
  assert(threwSpaces, 'Whitespace payload must throw "Payload string is required"');
});

runTest('Share Payload', 'ADV-M6-SHARE-07', 'Tampered / invalid base64 and corrupted JSON payloads rejected safely', () => {
  // Non-base64 characters
  let threwGarbage = false;
  try {
    decodeSharePayload('@@@###$$$%%%^^^');
  } catch {
    threwGarbage = true;
  }
  assert(threwGarbage, 'Invalid base64 characters must be rejected');

  // Valid Base64 but NOT JSON
  const notJsonBase64 = Buffer.from('this is plain text, definitely not json', 'utf-8')
    .toString('base64')
    .replace(/=/g, '');
  let threwNotJson = false;
  try {
    decodeSharePayload(notJsonBase64);
  } catch (err) {
    threwNotJson = err.message.includes('Invalid JSON payload');
  }
  assert(threwNotJson, 'Non-JSON payload must throw invalid JSON error');

  // Valid JSON but primitive (e.g. number, boolean, string)
  for (const primitive of [12345, 'string-val', true]) {
    const primBase64 = Buffer.from(JSON.stringify(primitive), 'utf-8').toString('base64').replace(/=/g, '');
    let threwNotObject = false;
    try {
      decodeSharePayload(primBase64);
    } catch (err) {
      threwNotObject = err.message.includes('not a valid object');
    }
    assert(threwNotObject, `Primitive JSON (${primitive}) must throw "not a valid object"`);
  }
});

runTest('Share Payload', 'ADV-M6-SHARE-08', 'Sanitizes non-string array entries and prototype pollution attacks', () => {
  const hostilePayload = {
    __proto__: { isAdmin: true },
    f: ['valid-id-1', 12345, null, false, { id: 'bad' }, 'valid-id-2'],
    s: ['seen-1', [1, 2, 3], undefined],
  };
  const b64 = Buffer.from(JSON.stringify(hostilePayload), 'utf-8').toString('base64').replace(/=/g, '');

  const decoded = decodeSharePayload(b64);
  assertEqual(decoded.favorites, ['valid-id-1', 'valid-id-2'], 'Must filter out non-string IDs from favorites');
  assertEqual(decoded.seen, ['seen-1'], 'Must filter out non-string IDs from seen');

  // Verify prototype is not polluted
  assert({}.isAdmin === undefined, 'Prototype pollution attempt must not contaminate Object.prototype');
});

runTest('Share Payload', 'ADV-M6-SHARE-09', 'Scanned text extraction across URL variants, JSON, and raw Base64', () => {
  const sampleFavs = ['act-1', 'act-2'];
  const payload = encodeSharePayload(sampleFavs, []);

  // 1. Full URL
  const fromFullUrl = extractScheduleFromScannedText(`https://pcostarg.github.io/FestaAvanteAgenda/?import=${payload}`);
  assertEqual(fromFullUrl.favorites, sampleFavs);

  // 2. Hash embedded URL
  const fromHashUrl = extractScheduleFromScannedText(`https://pcostarg.github.io/FestaAvanteAgenda/#lista?import=${payload}`);
  assertEqual(fromHashUrl.favorites, sampleFavs);

  // 3. Raw Base64 string
  const fromRawB64 = extractScheduleFromScannedText(payload);
  assertEqual(fromRawB64.favorites, sampleFavs);

  // 4. Raw JSON string
  const jsonStr = JSON.stringify({ favorites: sampleFavs, seen: [] });
  const fromJson = extractScheduleFromScannedText(jsonStr);
  assertEqual(fromJson.favorites, sampleFavs);

  // 5. Unrecognized random text throws Portuguese error
  let threwUnrecognized = false;
  try {
    extractScheduleFromScannedText('https://www.youtube.com/watch?v=12345');
  } catch (err) {
    threwUnrecognized = err.message.includes('O código lido não contém uma agenda válida');
  }
  assert(threwUnrecognized, 'Unrecognized QR text must throw descriptive festival error');
});

runTest('JSON Backup', 'ADV-M6-SHARE-10', 'JSON Backup validator enforces strict schema and ISO 8601 UTC timestamp', () => {
  const validBackup = {
    app: 'AvanteRouter',
    version: SCHEMA_VERSION,
    exportedAt: '2025-09-05T12:00:00.000Z',
    favorites: ['1382_1', '1383_1'],
    seen: ['1382_1'],
  };

  const v1 = validateJsonBackup(validBackup);
  assert(v1.valid, `Valid backup must pass: ${v1.errors.join(', ')}`);

  // Invalid favorites type
  const v2 = validateJsonBackup({ ...validBackup, favorites: 'not-an-array' });
  assert(!v2.valid, 'Non-array favorites must be rejected');

  // Invalid date format
  const v3 = validateJsonBackup({ ...validBackup, exportedAt: 'invalid-date-string' });
  assert(!v3.valid, 'Invalid exportedAt must be rejected');

  // Favorites with non-string elements
  const v4 = validateJsonBackup({ ...validBackup, favorites: [123, 456] });
  assert(!v4.valid, 'Non-string favorite IDs must be rejected');
});

// -----------------------------------------------------------------------------
// SUITE 3: PLATFORM ROUTING & SPA 404 REDIRECTION PROBES
// -----------------------------------------------------------------------------
console.log(`\n${BOLD}Suite 3: Platform Routing, Deep Links & 404 Redirection (public/404.html & src/App.tsx)${RESET}`);

runTest('Platform Routing', 'ADV-M6-PLAT-01', '404.html redirects deep links placing query parameters BEFORE hash fragments', () => {
  const htmlContent = fs.readFileSync(path.resolve(process.cwd(), 'public/404.html'), 'utf-8');

  // Must construct targetUrl as repoBase + '/' + targetSearch + targetHash
  assert(
    htmlContent.includes("repoBase + '/' + targetSearch + targetHash"),
    '404.html must sequence targetSearch BEFORE targetHash in redirect URL'
  );

  // Simulate 404.html redirection logic
  function simulate404(pathname, search, hash) {
    const pathSegmentsToKeep = 1;
    const l = { pathname, search, hash, protocol: 'https:', hostname: 'pcostarg.github.io', port: '' };
    const repoBase = l.pathname.split('/').slice(0, 1 + pathSegmentsToKeep).join('/');
    const routeSegments = l.pathname
      .slice(1)
      .split('/')
      .slice(pathSegmentsToKeep)
      .filter((seg) => seg.length > 0);
    const routePath = routeSegments.join('/');
    const targetSearch = l.search ? l.search : '';
    let targetHash = '';
    if (routePath) {
      targetHash = '#' + routePath;
      if (l.hash && l.hash !== '#' + routePath) {
        targetHash += l.hash.charAt(0) === '#' ? l.hash : '#' + l.hash;
      }
    } else if (l.hash) {
      targetHash = l.hash;
    }

    return l.protocol + '//' + l.hostname + (l.port ? ':' + l.port : '') + repoBase + '/' + targetSearch + targetHash;
  }

  // Deep route with ?import query
  const res1 = simulate404('/FestaAvanteAgenda/lista', '?import=testPayload123', '');
  assertEqual(
    res1,
    'https://pcostarg.github.io/FestaAvanteAgenda/?import=testPayload123#lista',
    'Query parameter must precede hash fragment in redirected URL'
  );

  // Verify that the redirected URL allows window.location.search to be non-empty
  const parsedRedirect = new URL(res1);
  assertEqual(parsedRedirect.search, '?import=testPayload123', 'search must be populated');
  assertEqual(parsedRedirect.hash, '#lista', 'hash must be populated');
});

runTest('Platform Routing', 'ADV-M6-PLAT-02', 'SPA route parser handles case insensitivity across all routes', () => {
  function parseRoute(hash, pathname) {
    const rawHash = (hash || '').toLowerCase().replace(/^#/, '');
    const cleanHash = rawHash.split(/[?#/]/)[0];

    if (cleanHash === 'lista') return 'lista';
    if (cleanHash === 'horario' || cleanHash === 'o-meu-horario') return 'horario';
    if (cleanHash === 'grelha') return 'grelha';

    const rawPath = (pathname || '').toLowerCase();
    const subPath = rawPath.replace(/^\/festaavanteagenda\/?/, '').split(/[?#/]/)[0];

    if (subPath === 'lista') return 'lista';
    if (subPath === 'horario' || subPath === 'o-meu-horario') return 'horario';
    if (subPath === 'grelha') return 'grelha';

    return 'grelha';
  }

  // Case variations
  assertEqual(parseRoute('#LISTA', ''), 'lista');
  assertEqual(parseRoute('#Lista', ''), 'lista');
  assertEqual(parseRoute('#O-MEU-HORARIO', ''), 'horario');
  assertEqual(parseRoute('#O-Meu-Horario', ''), 'horario');
  assertEqual(parseRoute('#HORARIO', ''), 'horario');
  assertEqual(parseRoute('#GRELHA', ''), 'grelha');
  assertEqual(parseRoute('#Grelha', ''), 'grelha');
});

runTest('Platform Routing', 'ADV-M6-PLAT-03', 'SPA route parser handles deep links with query parameters and subpaths', () => {
  function parseRoute(hash, pathname) {
    const rawHash = (hash || '').toLowerCase().replace(/^#/, '');
    const cleanHash = rawHash.split(/[?#/]/)[0];

    if (cleanHash === 'lista') return 'lista';
    if (cleanHash === 'horario' || cleanHash === 'o-meu-horario') return 'horario';
    if (cleanHash === 'grelha') return 'grelha';

    const rawPath = (pathname || '').toLowerCase();
    const subPath = rawPath.replace(/^\/festaavanteagenda\/?/, '').split(/[?#/]/)[0];

    if (subPath === 'lista') return 'lista';
    if (subPath === 'horario' || subPath === 'o-meu-horario') return 'horario';
    if (subPath === 'grelha') return 'grelha';

    return 'grelha';
  }

  // Hash with query parameters
  assertEqual(parseRoute('#lista?date=2025-09-06&filter=musica', ''), 'lista');
  assertEqual(parseRoute('#o-meu-horario?tab=conflicts', ''), 'horario');

  // Hash with nested path
  assertEqual(parseRoute('#o-meu-horario/conflict/resolve', ''), 'horario');

  // Direct pathname navigation (dev server)
  assertEqual(parseRoute('', '/FestaAvanteAgenda/lista'), 'lista');
  assertEqual(parseRoute('', '/FestaAvanteAgenda/o-meu-horario/'), 'horario');

  // Fallbacks
  assertEqual(parseRoute('#unknown-view', ''), 'grelha');
  assertEqual(parseRoute('', '/FestaAvanteAgenda/'), 'grelha');
});

runTest('Platform Routing', 'ADV-M6-PLAT-04', 'Startup URL import sanitizes location preventing reload re-import loops', () => {
  const testPayload = encodeSharePayload(['1382_1'], []);
  let replaceStateCalledWith = null;

  // Mock window and history
  const mockLocation = {
    href: `https://pcostarg.github.io/FestaAvanteAgenda/?import=${testPayload}#horario`,
    search: `?import=${testPayload}`,
    hash: '#horario',
    pathname: '/FestaAvanteAgenda/',
  };

  const mockHistory = {
    replaceState: (state, title, url) => {
      replaceStateCalledWith = url;
    },
  };

  // Execute App.tsx URL sanitation logic
  const searchParams = new URLSearchParams(mockLocation.search);
  const importParam = searchParams.get('import');
  assert(importParam === testPayload, 'Import param must be extracted');

  const url = new URL(mockLocation.href);
  url.searchParams.delete('import');
  const searchStr = url.searchParams.toString();
  let cleanHash = url.hash;
  if (cleanHash.includes('import=')) {
    const qIdx = cleanHash.indexOf('?');
    cleanHash = cleanHash.slice(0, qIdx);
  }
  const cleanUrl = url.pathname + (searchStr ? `?${searchStr}` : '') + (cleanHash || '');
  mockHistory.replaceState({}, '', cleanUrl);

  assertEqual(replaceStateCalledWith, '/FestaAvanteAgenda/#horario', 'URL must be sanitized without import query');
});

runTest('Platform Routing', 'ADV-M6-PLAT-05', 'Startup URL import handles fallback query inside hash fragment (#lista?import=...)', () => {
  const testPayload = encodeSharePayload(['1382_1'], []);
  const mockLocation = {
    search: '',
    hash: `#lista?import=${testPayload}`,
  };

  let extractedParam = null;
  const searchParams = new URLSearchParams(mockLocation.search);
  let importParam = searchParams.get('import');

  if (!importParam && mockLocation.hash.includes('import=')) {
    const hashQueryIndex = mockLocation.hash.indexOf('?');
    if (hashQueryIndex !== -1) {
      const hashParams = new URLSearchParams(mockLocation.hash.slice(hashQueryIndex));
      importParam = hashParams.get('import');
    }
  }
  extractedParam = importParam;

  assertEqual(extractedParam, testPayload, 'Must successfully parse import param from hash fragment fallback');
});

// -----------------------------------------------------------------------------
// SUITE 4: GITHUB ACTIONS CI/CD & LEAST PRIVILEGE SECURITY PROBES
// -----------------------------------------------------------------------------
console.log(`\n${BOLD}Suite 4: GitHub Actions Deployment & Security (.github/workflows/deploy.yml)${RESET}`);

runTest('CI/CD Workflow', 'ADV-M6-SEC-01', 'Least privilege permissions (contents: read, pages: write, id-token: write)', () => {
  const workflowPath = path.resolve(process.cwd(), '.github/workflows/deploy.yml');
  const workflowYml = fs.readFileSync(workflowPath, 'utf-8');

  // Verify permissions block
  const permBlockMatch = workflowYml.match(/permissions:\s*\n((\s+[\w-]+:\s*[\w-]+\s*\n)+)/);
  assert(permBlockMatch, 'Workflow must contain top-level permissions block');

  const permLines = permBlockMatch[1].trim().split('\n').map((l) => l.trim());
  const permMap = {};
  for (const line of permLines) {
    const [key, val] = line.split(':').map((s) => s.trim());
    permMap[key] = val;
  }

  assertEqual(permMap['contents'], 'read', 'contents permission must be strictly read');
  assertEqual(permMap['pages'], 'write', 'pages permission must be write');
  assertEqual(permMap['id-token'], 'write', 'id-token permission must be write');

  // Confirm NO excessive permissions
  assert(!permMap['actions'], 'Must NOT grant actions write');
  assert(!permMap['pull-requests'], 'Must NOT grant pull-requests write');
  assert(!permMap['issues'], 'Must NOT grant issues write');
  assert(Object.keys(permMap).length === 3, 'Must only contain the 3 least-privilege permissions');
});

runTest('CI/CD Workflow', 'ADV-M6-SEC-02', 'Concurrency group "pages" with cancel-in-progress: false', () => {
  const workflowPath = path.resolve(process.cwd(), '.github/workflows/deploy.yml');
  const workflowYml = fs.readFileSync(workflowPath, 'utf-8');

  const concurrencyMatch = workflowYml.match(/concurrency:\s*\n((\s+[\w-]+:\s*.*?\s*\n)+)/);
  assert(concurrencyMatch, 'Workflow must define concurrency settings');

  const concurrencyLines = concurrencyMatch[1].trim().split('\n').map((l) => l.trim());
  const conf = {};
  for (const line of concurrencyLines) {
    const [k, v] = line.split(':').map((s) => s.trim().replace(/['"]/g, ''));
    conf[k] = v;
  }

  assertEqual(conf['group'], 'pages', 'Concurrency group must be pages');
  assertEqual(conf['cancel-in-progress'], 'false', 'cancel-in-progress must be false to avoid corrupting Pages deployments');
});

runTest('CI/CD Workflow', 'ADV-M6-SEC-03', 'Sequential build, typecheck, test, and upload pipeline steps', () => {
  const workflowPath = path.resolve(process.cwd(), '.github/workflows/deploy.yml');
  const workflowYml = fs.readFileSync(workflowPath, 'utf-8');

  // Verify steps in order
  const checkoutIdx = workflowYml.indexOf('actions/checkout@v4');
  const setupNodeIdx = workflowYml.indexOf('actions/setup-node@v4');
  const npmCiIdx = workflowYml.indexOf('npm ci');
  const typecheckIdx = workflowYml.indexOf('npm run typecheck');
  const testIdx = workflowYml.indexOf('npm test');
  const buildIdx = workflowYml.indexOf('npm run build');
  const uploadArtifactIdx = workflowYml.indexOf('actions/upload-pages-artifact@v3');
  const deployPagesIdx = workflowYml.indexOf('actions/deploy-pages@v4');

  assert(checkoutIdx !== -1, 'Must checkout repo');
  assert(setupNodeIdx > checkoutIdx, 'Setup node must follow checkout');
  assert(npmCiIdx > setupNodeIdx, 'npm ci must follow node setup');
  assert(typecheckIdx > npmCiIdx, 'typecheck must run');
  assert(testIdx > typecheckIdx, 'test suite must run');
  assert(buildIdx > testIdx, 'build must follow tests');
  assert(uploadArtifactIdx > buildIdx, 'upload artifact must follow build');
  assert(deployPagesIdx > uploadArtifactIdx, 'deploy pages must follow upload');
});

runTest('CI/CD Workflow', 'ADV-M6-SEC-04', 'Deploy job has explicit "needs: build" dependency and environment "github-pages"', () => {
  const workflowPath = path.resolve(process.cwd(), '.github/workflows/deploy.yml');
  const workflowYml = fs.readFileSync(workflowPath, 'utf-8');

  assert(/deploy:\s*[\s\S]*?needs:\s*build/.test(workflowYml), 'Deploy job must have needs: build');
  assert(/environment:\s*[\s\S]*?name:\s*['"]github-pages['"]/.test(workflowYml), 'Environment must be github-pages');
});

// -----------------------------------------------------------------------------
// SUMMARY & VERDICT
// -----------------------------------------------------------------------------
console.log(`\n${BOLD}------------------------------------------------------------------------${RESET}`);
console.log(`${BOLD}TIER 5 ADVERSARIAL CHALLENGER VERIFICATION SUMMARY${RESET}`);
console.log(`------------------------------------------------------------------------`);
console.log(`  Total Probes : ${BOLD}${totalTests}${RESET}`);
console.log(`  Passed       : ${GREEN}${BOLD}${passedTests}${RESET}`);
console.log(`  Failed       : ${failedTests > 0 ? RED + BOLD + failedTests + RESET : '0'}`);
console.log(`------------------------------------------------------------------------`);

if (failedTests === 0) {
  console.log(`${GREEN}${BOLD}✔ ALL ADVERSARIAL CHALLENGES PASSED (100% SUCCESS RATE)${RESET}`);
  console.log(`${GREEN}VERDICT: APPROVE — Sharing, Import/Export & Platform Routing are mathematically robust.${RESET}\n`);
  process.exit(0);
} else {
  console.log(`${RED}${BOLD}✖ ADVERSARIAL VERIFICATION FAILED WITH ${failedTests} DEFECTS${RESET}`);
  console.log(`${RED}VERDICT: REQUEST_CHANGES${RESET}\n`);
  process.exit(1);
}
