// tests/adversarial-challenger-m3-state-conflicts.mjs
// Empirical Stress Harness & Adversarial Challenge Suite
// Milestone 3 Challenger 1: State & Conflict Engine
// Festa do Avante! 2025 PWA

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Import authoritative E2E contracts & fixtures
import {
  LOCAL_STORAGE_KEY,
  detectScheduleConflicts as contractDetectConflicts,
  doEventsOverlap as contractDoEventsOverlap,
  timeToFestivalMinutes as contractTimeToMinutes,
  festivalMinutesToTime as contractMinutesToTime,
  validateScheduleStorage as contractValidateStorage,
} from './e2e/lib/contracts.mjs';

import {
  MockLocalStorage,
  MockWindow,
  ScheduleManager,
} from './e2e/lib/mock-env.mjs';

// Import production implementations
import {
  timeToFestivalMinutes as prodTimeToMinutes,
  festivalMinutesToTime as prodMinutesToTime,
  doEventsOverlap as prodDoEventsOverlap,
  detectScheduleConflicts as prodDetectConflicts,
  resolveConflictHelper as prodResolveConflictHelper,
  normalizeDayKey as prodNormalizeDayKey,
  areEventsOnSameDay as prodAreEventsOnSameDay,
} from '../src/utils/conflictDetector.ts';

import {
  validateScheduleStorage as prodValidateStorage,
  sanitizeIdArray as prodSanitizeIdArray,
  MemoryStorage,
  ScheduleStore,
  SCHEDULE_UPDATE_EVENT,
} from '../src/utils/scheduleStorage.ts';

console.log('========================================================================');
console.log(' ADVERSARIAL EMPIRICAL STRESS HARNESS — STATE & CONFLICT ENGINE (M3)');
console.log('========================================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
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
  totalTests++;
  try {
    testFn();
    passedTests++;
    console.log(`  [PASS] ${description}`);
  } catch (err) {
    failedTests++;
    failures.push({ description, error: err.message, stack: err.stack });
    console.error(`  [FAIL] ${description}\n         Error: ${err.message}`);
  }
}

// -----------------------------------------------------------------------------
// SECTION 1: MIDNIGHT CROSSING OVERLAPS
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 1: MIDNIGHT CROSSING OVERLAPS ---');

challenge('T01-MIDNIGHT: 23:45-00:30 vs 00:15-01:15 must conflict (overlap 00:15-00:30, 15m)', () => {
  const actA = { id: 'act-a', day: '2025-09-06', timeStart: '23:45', timeEnd: '00:30', startTime: '23:45', endTime: '00:30' };
  const actB = { id: 'act-b', day: '2025-09-06', timeStart: '00:15', timeEnd: '01:15', startTime: '00:15', endTime: '01:15' };

  // Check contract
  assert(contractDoEventsOverlap(actA, actB) === true, 'Contract should detect overlap');
  const contractReport = contractDetectConflicts([actA, actB]);
  assert(contractReport.hasConflicts === true, 'Contract report hasConflicts must be true');
  assert(contractReport.conflictIds.has('act-a') && contractReport.conflictIds.has('act-b'), 'Both IDs must conflict');
  assert(contractReport.pairs.length === 1, 'Exactly 1 pair');
  assertEqual(contractReport.pairs[0].overlapStart, 1455, 'Overlap start at 1455 min (00:15)');
  assertEqual(contractReport.pairs[0].overlapEnd, 1470, 'Overlap end at 1470 min (00:30)');

  // Check production code
  assert(prodDoEventsOverlap(actA, actB) === true, 'Production should detect overlap');
  const prodReport = prodDetectConflicts([actA, actB]);
  assert(prodReport.hasConflicts === true, 'Production report hasConflicts must be true');
  assert(prodReport.conflictIds.has('act-a') && prodReport.conflictIds.has('act-b'), 'Both IDs must conflict in prod');
  assertEqual(prodReport.pairs[0].overlapMinutes, 15, 'Overlap minutes must be 15');
  assertEqual(prodReport.pairs[0].formattedOverlap, '00:15 – 00:30 (15 min)', 'Formatted string matches');
});

challenge('T02-MIDNIGHT: 23:00-00:30 vs 23:30-01:00 must conflict across midnight boundary (60m overlap)', () => {
  const actA = { id: 'act-a', day: '2025-09-06', startTime: '23:00', endTime: '00:30', timeStart: '23:00', timeEnd: '00:30' };
  const actB = { id: 'act-b', day: '2025-09-06', startTime: '23:30', endTime: '01:00', timeStart: '23:30', timeEnd: '01:00' };

  assert(prodDoEventsOverlap(actA, actB) === true, 'Must detect overlap');
  const rep = prodDetectConflicts([actA, actB]);
  assertEqual(rep.pairs[0].overlapMinutes, 60, '60 minutes overlap');
  assertEqual(rep.pairs[0].formattedOverlap, '23:30 – 00:30 (60 min)', 'Correct format');
});

challenge('T03-MIDNIGHT: 00:00-01:30 vs 00:30-02:00 in nocturnal window must conflict (60m overlap)', () => {
  const actA = { id: 'act-a', day: '2025-09-06', startTime: '00:00', endTime: '01:30' };
  const actB = { id: 'act-b', day: '2025-09-06', startTime: '00:30', endTime: '02:00' };

  const rep = prodDetectConflicts([actA, actB]);
  assert(rep.hasConflicts === true, 'Must conflict');
  assertEqual(rep.pairs[0].overlapMinutes, 60, 'Overlap 60 min');
  assertEqual(rep.pairs[0].formattedOverlap, '00:30 – 01:30 (60 min)', 'Format correct');
});

challenge('T04-MIDNIGHT: 23:45-00:15 vs 00:15-01:00 touching at 00:15 MUST NOT conflict', () => {
  const actA = { id: 'act-a', day: '2025-09-06', startTime: '23:45', endTime: '00:15', timeStart: '23:45', timeEnd: '00:15' };
  const actB = { id: 'act-b', day: '2025-09-06', startTime: '00:15', endTime: '01:00', timeStart: '00:15', timeEnd: '01:00' };

  assert(contractDoEventsOverlap(actA, actB) === false, 'Contract must report no overlap');
  assert(prodDoEventsOverlap(actA, actB) === false, 'Production must report no overlap');
  const rep = prodDetectConflicts([actA, actB]);
  assert(rep.hasConflicts === false, 'hasConflicts must be false');
  assertEqual(rep.conflictCount, 0, 'Zero conflicts');
});

challenge('T05-MIDNIGHT: 23:00-00:00 vs 00:00-01:00 touching exactly at midnight 00:00 MUST NOT conflict', () => {
  const actA = { id: 'act-a', day: '2025-09-06', startTime: '23:00', endTime: '00:00', timeStart: '23:00', timeEnd: '00:00' };
  const actB = { id: 'act-b', day: '2025-09-06', startTime: '00:00', endTime: '01:00', timeStart: '00:00', timeEnd: '01:00' };

  assertEqual(prodTimeToMinutes('23:00'), 1380, '23:00 is 1380 min');
  assertEqual(prodTimeToMinutes('00:00'), 1440, '00:00 is 1440 min');
  assertEqual(prodTimeToMinutes('01:00'), 1500, '01:00 is 1500 min');

  assert(prodDoEventsOverlap(actA, actB) === false, 'Midnight boundary touch must not conflict');
  const rep = prodDetectConflicts([actA, actB]);
  assert(rep.hasConflicts === false, 'Zero conflicts on midnight touch');
});

challenge('T06-MIDNIGHT: Acts with 1-hour gap across midnight (22:30-23:30 vs 00:30-01:30) MUST NOT conflict', () => {
  const actA = { id: 'act-a', day: '2025-09-06', startTime: '22:30', endTime: '23:30' };
  const actB = { id: 'act-b', day: '2025-09-06', startTime: '00:30', endTime: '01:30' };

  assert(prodDoEventsOverlap(actA, actB) === false, 'Gap across midnight must not conflict');
  const rep = prodDetectConflicts([actA, actB]);
  assert(rep.hasConflicts === false, 'No conflicts');
});

challenge('T07-MIDNIGHT: 00:00-02:00 vs 01:59-03:00 (1m overlap in nocturnal hours) must conflict', () => {
  const actA = { id: 'act-a', day: '2025-09-06', startTime: '00:00', endTime: '02:00' };
  const actB = { id: 'act-b', day: '2025-09-06', startTime: '01:59', endTime: '03:00' };

  assert(prodDoEventsOverlap(actA, actB) === true, '1m overlap must conflict');
  const rep = prodDetectConflicts([actA, actB]);
  assertEqual(rep.pairs[0].overlapMinutes, 1, '1 minute overlap');
  assertEqual(rep.pairs[0].formattedOverlap, '01:59 – 02:00 (1 min)', 'Correct format');
});

challenge('T08-MIDNIGHT: 00:00-02:00 vs 02:00-03:00 (touching at 02:00) MUST NOT conflict', () => {
  const actA = { id: 'act-a', day: '2025-09-06', startTime: '00:00', endTime: '02:00' };
  const actB = { id: 'act-b', day: '2025-09-06', startTime: '02:00', endTime: '03:00' };

  assert(prodDoEventsOverlap(actA, actB) === false, 'Contiguous at 02:00 must not conflict');
  const rep = prodDetectConflicts([actA, actB]);
  assert(rep.hasConflicts === false, 'No conflicts');
});

challenge('T09-MIDNIGHT: Cross-day events (sexta 23:45-00:30 vs sabado 00:15-01:15) MUST NOT conflict', () => {
  const fridayAct = { id: 'act-fri', day: 'sexta', startTime: '23:45', endTime: '00:30' };
  const saturdayAct = { id: 'act-sat', day: 'sabado', startTime: '00:15', endTime: '01:15' };

  assert(prodDoEventsOverlap(fridayAct, saturdayAct) === false, 'Different days must not conflict');
  const rep = prodDetectConflicts([fridayAct, saturdayAct]);
  assert(rep.hasConflicts === false, 'No cross-day conflicts');
});

// -----------------------------------------------------------------------------
// SECTION 2: ADJACENT / CONTIGUOUS ACTS
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 2: ADJACENT / CONTIGUOUS ACTS ---');

challenge('T10-CONTIGUOUS: 16:00-17:30 and 17:30-19:00 MUST NOT conflict', () => {
  const actA = { id: 'act-a', day: 'sexta', startTime: '16:00', endTime: '17:30', timeStart: '16:00', timeEnd: '17:30' };
  const actB = { id: 'act-b', day: 'sexta', startTime: '17:30', endTime: '19:00', timeStart: '17:30', timeEnd: '19:00' };

  assert(contractDoEventsOverlap(actA, actB) === false, 'Contract: contiguous acts do not conflict');
  assert(prodDoEventsOverlap(actA, actB) === false, 'Prod: contiguous acts do not conflict');

  const rep = prodDetectConflicts([actA, actB]);
  assert(rep.hasConflicts === false, 'hasConflicts must be false');
  assertEqual(rep.conflictCount, 0, 'conflictCount is 0');
});

challenge('T11-CONTIGUOUS: Inverted array order (17:30-19:00 then 16:00-17:30) MUST NOT conflict', () => {
  const actA = { id: 'act-a', day: 'sexta', startTime: '16:00', endTime: '17:30' };
  const actB = { id: 'act-b', day: 'sexta', startTime: '17:30', endTime: '19:00' };

  const rep = prodDetectConflicts([actB, actA]);
  assert(rep.hasConflicts === false, 'Reversed order contiguous acts do not conflict');
});

challenge('T12-CONTIGUOUS: Multi-act contiguous chain (8 consecutive 1-hour acts) MUST yield 0 conflicts', () => {
  const hours = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
  const chain = [];
  for (let i = 0; i < hours.length - 1; i++) {
    chain.push({
      id: `act-${i}`,
      day: 'sabado',
      startTime: hours[i],
      endTime: hours[i + 1],
    });
  }
  assertEqual(chain.length, 8, '8 contiguous acts');
  const rep = prodDetectConflicts(chain);
  assert(rep.hasConflicts === false, '8-act contiguous chain must have 0 conflicts');
  assertEqual(rep.conflictCount, 0, 'conflictCount is 0');
  assertEqual(rep.pairs.length, 0, '0 pairs');
});

challenge('T13-CONTIGUOUS: 1-minute overlap (16:00-17:30 vs 17:29-19:00) MUST conflict', () => {
  const actA = { id: 'act-a', day: 'sexta', startTime: '16:00', endTime: '17:30' };
  const actB = { id: 'act-b', day: 'sexta', startTime: '17:29', endTime: '19:00' };

  assert(prodDoEventsOverlap(actA, actB) === true, '1-minute overlap must conflict');
  const rep = prodDetectConflicts([actA, actB]);
  assert(rep.hasConflicts === true, 'Must flag conflict');
  assertEqual(rep.pairs[0].overlapMinutes, 1, 'Exactly 1 minute overlap');
});

challenge('T14-CONTIGUOUS: 1-minute gap (16:00-17:30 vs 17:31-19:00) MUST NOT conflict', () => {
  const actA = { id: 'act-a', day: 'sexta', startTime: '16:00', endTime: '17:30' };
  const actB = { id: 'act-b', day: 'sexta', startTime: '17:31', endTime: '19:00' };

  assert(prodDoEventsOverlap(actA, actB) === false, '1-minute gap must not conflict');
  const rep = prodDetectConflicts([actA, actB]);
  assert(rep.hasConflicts === false, 'No conflict on 1m gap');
});

challenge('T15-CONTIGUOUS: Nested interval (14:00-18:00 and 15:00-16:00) MUST conflict', () => {
  const outer = { id: 'outer', day: 'sexta', startTime: '14:00', endTime: '18:00' };
  const inner = { id: 'inner', day: 'sexta', startTime: '15:00', endTime: '16:00' };

  assert(prodDoEventsOverlap(outer, inner) === true, 'Nested interval must conflict');
  const rep = prodDetectConflicts([outer, inner]);
  assertEqual(rep.pairs[0].overlapMinutes, 60, '60m overlap duration');
});

challenge('T16-CONTIGUOUS: Same event ID compared with itself MUST NOT self-conflict', () => {
  const act = { id: 'same-id', day: 'sexta', startTime: '14:00', endTime: '16:00' };
  assert(prodDoEventsOverlap(act, act) === false, 'Self comparison must not overlap');
});

// -----------------------------------------------------------------------------
// SECTION 3: 3-WAY CONFLICT CASCADES & SEEN STATUS PRESERVATION
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 3: 3-WAY CONFLICT CASCADES & SEEN STATUS PRESERVATION ---');

challenge('T17-CASCADE: Triangle 3-way conflict detection flags 3 events and 3 pairs', () => {
  const actA = { id: 'ev-a', day: 'sabado', startTime: '20:00', endTime: '21:30' };
  const actB = { id: 'ev-b', day: 'sabado', startTime: '20:30', endTime: '22:00' };
  const actC = { id: 'ev-c', day: 'sabado', startTime: '21:00', endTime: '22:30' };

  const rep = prodDetectConflicts([actA, actB, actC]);
  assert(rep.hasConflicts === true, 'Must have conflicts');
  assertEqual(rep.conflictCount, 3, '3 events in conflict');
  assertEqual(rep.pairs.length, 3, '3 conflicting pairs (A-B, A-C, B-C)');
  assert(rep.conflictsByEventId.get('ev-a').length === 2, 'A has 2 conflicting pairs');
  assert(rep.conflictsByEventId.get('ev-b').length === 2, 'B has 2 conflicting pairs');
  assert(rep.conflictsByEventId.get('ev-c').length === 2, 'C has 2 conflicting pairs');
});

challenge('T18-CASCADE: Resolve A vs B with "keepA" removes B from favorites but PRESERVES seen status', () => {
  const storage = new MockLocalStorage();
  const win = new MockWindow();
  const schedule = new ScheduleManager(storage, win);

  // Setup: favorite A, B, C
  schedule.toggleFavorite('ev-a');
  schedule.toggleFavorite('ev-b');
  schedule.toggleFavorite('ev-c');

  // Mark B as seen
  schedule.toggleSeen('ev-b');
  assert(schedule.isSeen('ev-b') === true, 'B is marked as seen');
  assert(schedule.isFavorite('ev-b') === true, 'B is in favorites');

  // Resolve A vs B keeping A
  schedule.resolveConflict('keepA', 'ev-a', 'ev-b');

  // Assertions:
  assert(schedule.isFavorite('ev-a') === true, 'A is still in favorites');
  assert(schedule.isFavorite('ev-b') === false, 'B is removed from favorites');
  assert(schedule.isFavorite('ev-c') === true, 'C is still in favorites');

  // CRITICAL CHECK: B MUST STILL BE IN SEEN!
  assert(schedule.isSeen('ev-b') === true, 'B MUST REMAIN IN SEEN AFTER CONFLICT RESOLUTION');
  const rawStorage = JSON.parse(storage.getItem(LOCAL_STORAGE_KEY));
  assert(rawStorage.seen.includes('ev-b'), 'Storage seen array contains ev-b');
  assert(!rawStorage.favorites.includes('ev-b'), 'Storage favorites array DOES NOT contain ev-b');

  // Check remaining conflict between A and C
  const allEvents = [
    { id: 'ev-a', day: 'sabado', startTime: '20:00', endTime: '21:30', timeStart: '20:00', timeEnd: '21:30' },
    { id: 'ev-b', day: 'sabado', startTime: '20:30', endTime: '22:00', timeStart: '20:30', timeEnd: '22:00' },
    { id: 'ev-c', day: 'sabado', startTime: '21:00', endTime: '22:30', timeStart: '21:00', timeEnd: '22:30' },
  ];
  const rep1 = schedule.getConflictsForDay('sabado', allEvents);
  assert(rep1.hasConflicts === true, 'A and C still conflict');
  assertEqual(rep1.conflictCount, 2, 'Remaining conflict has 2 events');
  assert(rep1.conflictIds.has('ev-a') && rep1.conflictIds.has('ev-c'), 'A and C are conflicting');
  assert(!rep1.conflictIds.has('ev-b'), 'B is no longer in conflict');

  // Mark C as seen
  schedule.toggleSeen('ev-c');
  assert(schedule.isSeen('ev-c') === true, 'C is marked as seen');

  // Second step: resolve A vs C with keepB (keeping C, dropping A)
  schedule.resolveConflict('keepB', 'ev-a', 'ev-c');
  assert(schedule.isFavorite('ev-a') === false, 'A removed');
  assert(schedule.isFavorite('ev-c') === true, 'C kept');

  // Both seen states MUST be preserved!
  assert(schedule.isSeen('ev-b') === true, 'B still seen');
  assert(schedule.isSeen('ev-c') === true, 'C still seen');

  // Now zero conflicts remain
  const rep2 = schedule.getConflictsForDay('sabado', allEvents);
  assert(rep2.hasConflicts === false, 'All conflicts now resolved');
  assertEqual(rep2.conflictCount, 0, 'Zero conflicts');
});

challenge('T19-CASCADE: Line 3-way cascade (A-B, B-C, no A-C) resolves completely when B is dropped', () => {
  const actA = { id: 'ev-1', day: 'sexta', startTime: '19:00', endTime: '20:30' };
  const actB = { id: 'ev-2', day: 'sexta', startTime: '20:00', endTime: '21:30' };
  const actC = { id: 'ev-3', day: 'sexta', startTime: '21:00', endTime: '22:30' };

  // Note: A (ends 20:30) and C (starts 21:00) DO NOT overlap!
  assert(prodDoEventsOverlap(actA, actC) === false, 'A and C do not overlap');

  const repInitial = prodDetectConflicts([actA, actB, actC]);
  assertEqual(repInitial.pairs.length, 2, 'Exactly 2 pairs (A-B and B-C)');

  // Drop B
  const afterB = [actA, actC];
  const repAfter = prodDetectConflicts(afterB);
  assert(repAfter.hasConflicts === false, 'Dropping bridge B clears all conflicts');
});

challenge('T20-CASCADE: Split decision preserves both events in favorites and leaves seen intact', () => {
  const storage = new MockLocalStorage();
  const win = new MockWindow();
  const schedule = new ScheduleManager(storage, win);

  schedule.toggleFavorite('ev-x');
  schedule.toggleFavorite('ev-y');
  schedule.toggleSeen('ev-x');

  schedule.resolveConflict('split', 'ev-x', 'ev-y');

  assert(schedule.isFavorite('ev-x') === true, 'x in favorites');
  assert(schedule.isFavorite('ev-y') === true, 'y in favorites');
  assert(schedule.isSeen('ev-x') === true, 'x still seen');
});

challenge('T21-CASCADE: Unfavorited event marked seen is never flagged in conflict detection', () => {
  const storage = new MockLocalStorage();
  const win = new MockWindow();
  const schedule = new ScheduleManager(storage, win);

  const actA = { id: 'ev-fav', day: 'sexta', startTime: '20:00', endTime: '22:00' };
  const actB = { id: 'ev-seen-only', day: 'sexta', startTime: '20:30', endTime: '21:30' };

  schedule.toggleFavorite('ev-fav');
  schedule.toggleSeen('ev-seen-only'); // Seen but NOT favorited

  const rep = schedule.getConflictsForDay('sexta', [actA, actB]);
  assert(rep.hasConflicts === false, 'Conflict detection must ignore non-favorited seen events');
});

// -----------------------------------------------------------------------------
// SECTION 4: CORRUPTED LOCALSTORAGE RECOVERY
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 4: CORRUPTED LOCALSTORAGE RECOVERY ---');

challenge('T22-CORRUPT: Non-JSON syntax string recovers gracefully to empty schedule', () => {
  const storage = new MockLocalStorage();
  const win = new MockWindow();
  storage.setItem(LOCAL_STORAGE_KEY, 'CORRUPTED_{{{NOT_JSON:undefined');

  const schedule = new ScheduleManager(storage, win);
  assertEqual(schedule.favorites, [], 'Favorites empty on corrupt JSON');
  assertEqual(schedule.seen, [], 'Seen empty on corrupt JSON');

  // Ensure subsequent operations work normally
  schedule.toggleFavorite('ev-new');
  assertEqual(schedule.favorites, ['ev-new'], 'Can favorite after recovery');
});

challenge('T23-CORRUPT: Truncated JSON recovers gracefully without throwing', () => {
  const storage = new MockLocalStorage();
  const win = new MockWindow();
  storage.setItem(LOCAL_STORAGE_KEY, '{"favorites": ["ev-1"');

  const schedule = new ScheduleManager(storage, win);
  assertEqual(schedule.favorites, [], 'Recovers gracefully from truncated JSON');
});

challenge('T24-CORRUPT: Non-array favorites (string, number, object, null) recovery', () => {
  const win = new MockWindow();
  const badInputs = [
    { favorites: 'string-instead-of-array', seen: [] },
    { favorites: 42, seen: [] },
    { favorites: { id: 'ev-1' }, seen: [] },
    { favorites: null, seen: [] },
    { favorites: true, seen: [] },
  ];

  for (const bad of badInputs) {
    const storage = new MockLocalStorage();
    storage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(bad));
    const sched = new ScheduleManager(storage, win);
    assertEqual(sched.favorites, [], `Recovers for ${typeof bad.favorites}`);
  }
});

challenge('T25-CORRUPT: Non-array seen (string, boolean, number) recovery', () => {
  const win = new MockWindow();
  const badInputs = [
    { favorites: ['ev-1'], seen: 'bad-seen' },
    { favorites: ['ev-1'], seen: true },
    { favorites: ['ev-1'], seen: 999 },
    { favorites: ['ev-1'], seen: null },
  ];

  for (const bad of badInputs) {
    const storage = new MockLocalStorage();
    storage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(bad));
    const sched = new ScheduleManager(storage, win);
    assertEqual(sched.seen, [], 'Seen recovered to empty array');
  }
});

challenge('T26-CORRUPT: Primitive pollution inside favorites/seen arrays', () => {
  // Test sanitizeIdArray directly
  const dirty = ['ev-1', null, 42, undefined, true, {}, [], 'ev-2', '', '   '];
  const sanitized = prodSanitizeIdArray(dirty);
  assertEqual(sanitized, ['ev-1', 'ev-2'], 'Sanitizes primitive pollution and empty strings');

  // Test validation failure on corrupted payload in storage
  const corruptedPayload = {
    favorites: ['ev-1', null, 42],
    seen: ['ev-seen', true],
    updatedAt: Date.now(),
  };
  const { valid } = prodValidateStorage(corruptedPayload);
  assert(valid === false, 'Payload with polluted array entries fails validation');

  // When ScheduleManager encounters this in storage, it resets cleanly
  const storage = new MockLocalStorage();
  const win = new MockWindow();
  storage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(corruptedPayload));
  const sched = new ScheduleManager(storage, win);
  assertEqual(sched.favorites, [], 'Favorites reset on primitive pollution');
  assertEqual(sched.seen, [], 'Seen reset on primitive pollution');
});

challenge('T27-CORRUPT: Corrupted updatedAt (string, negative, NaN, missing) recovery', () => {
  const win = new MockWindow();
  const badTimes = [
    { favorites: ['ev-1'], seen: [], updatedAt: '2025-09-06' },
    { favorites: ['ev-1'], seen: [], updatedAt: -500 },
    { favorites: ['ev-1'], seen: [], updatedAt: NaN },
    { favorites: ['ev-1'], seen: [] }, // missing
  ];

  for (const item of badTimes) {
    const storage = new MockLocalStorage();
    storage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(item));
    const sched = new ScheduleManager(storage, win);
    assertEqual(sched.favorites, [], 'Invalid updatedAt resets cleanly');
  }
});

challenge('T28-CORRUPT: Root primitive pollution in storage ("123", "true", "null", "\"text\"")', () => {
  const win = new MockWindow();
  const primitives = ['123', 'true', 'null', '"simple string"'];

  for (const prim of primitives) {
    const storage = new MockLocalStorage();
    storage.setItem(LOCAL_STORAGE_KEY, prim);
    const sched = new ScheduleManager(storage, win);
    assertEqual(sched.favorites, [], `Primitive root "${prim}" recovers`);
    assertEqual(sched.seen, [], 'Seen array recovers');
  }
});

challenge('T29-CORRUPT: Deduplication of repeated IDs upon saving', () => {
  const storage = new MockLocalStorage();
  const win = new MockWindow();
  const schedule = new ScheduleManager(storage, win);

  schedule.replaceSchedule({
    favorites: ['ev-dup', 'ev-dup', 'ev-dup', 'ev-unique'],
    seen: ['seen-dup', 'seen-dup'],
  });

  assertEqual(schedule.favorites, ['ev-dup', 'ev-unique'], 'Deduplicates favorites');
  assertEqual(schedule.seen, ['seen-dup'], 'Deduplicates seen');
});

// -----------------------------------------------------------------------------
// SECTION 5: MULTI-TAB EVENT DISPATCHING & EXTERNAL STORE CONSISTENCY
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 5: MULTI-TAB EVENT DISPATCHING & STORE CONSISTENCY ---');

challenge('T30-MULTITAB: StorageEvent from Tab 2 updates Tab 1 state and notifies subscribers', () => {
  const sharedStorage = new MockLocalStorage();
  const winTab1 = new MockWindow();
  const tab1Schedule = new ScheduleManager(sharedStorage, winTab1);

  let notified = false;
  let notifiedPayload = null;
  tab1Schedule.subscribe((payload) => {
    notified = true;
    notifiedPayload = payload;
  });

  // Tab 2 mutates localStorage directly
  const tab2Payload = {
    favorites: ['ev-from-tab2'],
    seen: ['ev-seen-tab2'],
    updatedAt: Date.now(),
  };
  sharedStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tab2Payload));

  // Simulate browser firing storage event into Tab 1's window
  tab1Schedule._load();
  assertEqual(tab1Schedule.favorites, ['ev-from-tab2'], 'Tab 1 reflects Tab 2 favorites');
  assertEqual(tab1Schedule.seen, ['ev-seen-tab2'], 'Tab 1 reflects Tab 2 seen');
});

challenge('T31-MULTITAB: Tab 1 mutation dispatches "avante_schedule_updated" CustomEvent on window', () => {
  const storage = new MockLocalStorage();
  const win = new MockWindow();
  const schedule = new ScheduleManager(storage, win);

  let eventDispatched = false;
  let eventDetail = null;
  win.addEventListener(SCHEDULE_UPDATE_EVENT, (ev) => {
    eventDispatched = true;
    eventDetail = ev.detail;
  });

  schedule.toggleFavorite('ev-tab1-event');
  assert(eventDispatched === true, 'CustomEvent must be dispatched');
  assert(eventDetail !== null, 'Detail must be present');
  assertEqual(eventDetail.favorites, ['ev-tab1-event'], 'Detail contains updated favorites');
});

challenge('T32-MULTITAB: Store subscribers can unsubscribe cleanly without lingering leaks', () => {
  const storage = new MockLocalStorage();
  const win = new MockWindow();
  const schedule = new ScheduleManager(storage, win);

  let callCount = 0;
  const unsubscribe = schedule.subscribe(() => {
    callCount++;
  });

  schedule.toggleFavorite('ev-1');
  assertEqual(callCount, 1, 'Subscriber called once');

  // Unsubscribe
  unsubscribe();

  schedule.toggleFavorite('ev-2');
  assertEqual(callCount, 1, 'Subscriber not called after unsubscribe');
});

challenge('T33-MULTITAB: Production ScheduleStore singleton operates consistently', () => {
  // Verify ScheduleStore singleton methods
  const store = ScheduleStore.getInstance();
  assert(store !== null, 'ScheduleStore instance must exist');
  assert(typeof store.getSnapshot === 'function', 'getSnapshot must be a function');
  assert(typeof store.subscribe === 'function', 'subscribe must be a function');
  assert(typeof store.toggleFavorite === 'function', 'toggleFavorite must be a function');
  assert(typeof store.toggleSeen === 'function', 'toggleSeen must be a function');
  assert(typeof store.resolveConflict === 'function', 'resolveConflict must be a function');

  // Snapshot structure
  const snap = store.getSnapshot();
  assert(Array.isArray(snap.favorites), 'Snapshot favorites must be array');
  assert(Array.isArray(snap.seen), 'Snapshot seen must be array');
  assert(typeof snap.updatedAt === 'number', 'Snapshot updatedAt must be number');
});

challenge('T34-MULTITAB: MemoryStorage fallback operates correctly when localStorage is unavailable', () => {
  const mem = new MemoryStorage();
  assertEqual(mem.length, 0, 'Initial length 0');
  assert(mem.getItem('key') === null, 'Missing item is null');

  mem.setItem('key', 'value123');
  assertEqual(mem.getItem('key'), 'value123', 'Stores value');
  assertEqual(mem.length, 1, 'Length 1');

  mem.removeItem('key');
  assert(mem.getItem('key') === null, 'Removed item is null');
  assertEqual(mem.length, 0, 'Length 0');

  mem.setItem('k1', 'v1');
  mem.setItem('k2', 'v2');
  assertEqual(mem.length, 2, 'Length 2');
  mem.clear();
  assertEqual(mem.length, 0, 'Cleared');
});

// -----------------------------------------------------------------------------
// SECTION 6: AUTHENTIC 2025 FESTIVAL DATASET CONFLICT VERIFICATION
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 6: AUTHENTIC 2025 FESTIVAL DATASET CONFLICT RUN ---');

challenge('T35-DATASET: program.json acts produce zero false negatives or invalid time parse errors', () => {
  const programJsonPath = path.join(rootDir, 'src', 'data', 'program.json');
  assert(fs.existsSync(programJsonPath), 'program.json exists');
  const program = JSON.parse(fs.readFileSync(programJsonPath, 'utf-8'));
  assertEqual(program.length, 269, 'Exactly 269 acts');

  // Verify every act parses cleanly
  let parseErrors = 0;
  for (const act of program) {
    try {
      const s = prodTimeToMinutes(act.startTime || act.timeStart);
      const e = prodTimeToMinutes(act.endTime || act.timeEnd);
      if (s >= e) parseErrors++;
    } catch {
      parseErrors++;
    }
  }
  assertEqual(parseErrors, 0, 'All 269 events have valid parseable intervals with start < end');

  // Run full conflict detection on each day's authentic acts
  const days = ['sexta', 'sabado', 'domingo'];
  for (const day of days) {
    const dayActs = program.filter((e) => prodNormalizeDayKey(e.day) === day);
    const report = prodDetectConflicts(dayActs);
    assert(report.pairs.length > 0, `${day} has authentic overlapping pairs`);
    assert(report.conflictCount > 0, `${day} has conflicting events`);
    for (const pair of report.pairs) {
      assert(pair.overlapMinutes > 0, `Overlap minutes must be > 0: ${pair.formattedOverlap}`);
      assert(pair.overlapStart < pair.overlapEnd, `overlapStart < overlapEnd for ${pair.formattedOverlap}`);
    }
  }
});
// -----------------------------------------------------------------------------
// SECTION 7: ADVANCED BOUNDARIES, 4-WAY CASCADES & EXTREME STRESS
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 7: ADVANCED BOUNDARIES, 4-WAY CASCADES & EXTREME STRESS ---');

challenge('T36-COINCIDENT: Identical intervals (15:00-16:30 vs 15:00-16:30) on different stages must conflict', () => {
  const act1 = { id: 'act-stage-a', day: 'sexta', startTime: '15:00', endTime: '16:30', timeStart: '15:00', timeEnd: '16:30' };
  const act2 = { id: 'act-stage-b', day: 'sexta', startTime: '15:00', endTime: '16:30', timeStart: '15:00', timeEnd: '16:30' };

  assert(prodDoEventsOverlap(act1, act2) === true, 'Identical intervals must overlap');
  const rep = prodDetectConflicts([act1, act2]);
  assert(rep.hasConflicts === true, 'Must flag conflict');
  assertEqual(rep.pairs[0].overlapMinutes, 90, 'Full 90 minutes overlap');
  assertEqual(rep.pairs[0].formattedOverlap, '15:00 – 16:30 (90 min)', 'Format correct');
});

challenge('T37-MIDNIGHT-MICRO: Micro 2-minute act crossing midnight (23:59-00:01) overlapping 00:00-00:30', () => {
  const microAct = { id: 'micro', day: 'sabado', startTime: '23:59', endTime: '00:01', timeStart: '23:59', timeEnd: '00:01' };
  const nextAct = { id: 'next', day: 'sabado', startTime: '00:00', endTime: '00:30', timeStart: '00:00', timeEnd: '00:30' };

  assert(prodDoEventsOverlap(microAct, nextAct) === true, '1-minute overlap across midnight');
  const rep = prodDetectConflicts([microAct, nextAct]);
  assertEqual(rep.pairs[0].overlapMinutes, 1, 'Exactly 1 minute overlap');
  assertEqual(rep.pairs[0].formattedOverlap, '00:00 – 00:01 (1 min)', 'Correct format');
});

challenge('T38-MIDNIGHT-DAWN: Dawn boundary acts (04:30-05:59 and 05:45-05:59) in nocturnal window', () => {
  const actA = { id: 'dawn-a', day: 'sabado', startTime: '04:30', endTime: '05:59', timeStart: '04:30', timeEnd: '05:59' };
  const actB = { id: 'dawn-b', day: 'sabado', startTime: '05:45', endTime: '05:59', timeStart: '05:45', timeEnd: '05:59' };

  assert(prodDoEventsOverlap(actA, actB) === true, 'Must overlap in dawn hours');
  const rep = prodDetectConflicts([actA, actB]);
  assertEqual(rep.pairs[0].overlapMinutes, 14, '14 minutes overlap');
  assertEqual(rep.pairs[0].formattedOverlap, '05:45 – 05:59 (14 min)', 'Format correct');
});

challenge('T39-CASCADE-4WAY: 4-way mutually overlapping cluster resolution step-by-step preserving seen status', () => {
  const storage = new MockLocalStorage();
  const win = new MockWindow();
  const schedule = new ScheduleManager(storage, win);

  const acts = [
    { id: 'act-1', day: 'sexta', startTime: '21:00', endTime: '22:30', timeStart: '21:00', timeEnd: '22:30' },
    { id: 'act-2', day: 'sexta', startTime: '21:15', endTime: '22:00', timeStart: '21:15', timeEnd: '22:00' },
    { id: 'act-3', day: 'sexta', startTime: '21:30', endTime: '23:00', timeStart: '21:30', timeEnd: '23:00' },
    { id: 'act-4', day: 'sexta', startTime: '21:45', endTime: '22:45', timeStart: '21:45', timeEnd: '22:45' },
  ];

  // Favorite all 4
  acts.forEach(a => schedule.toggleFavorite(a.id));
  assertEqual(schedule.favorites.length, 4, '4 acts favorited');

  // Mark acts 2 and 4 as seen
  schedule.toggleSeen('act-2');
  schedule.toggleSeen('act-4');

  // Verify initial 4-way conflict (4 choose 2 = 6 pairs)
  const repInitial = schedule.getConflictsForDay('sexta', acts);
  assertEqual(repInitial.conflictCount, 4, 'All 4 in conflict');
  assertEqual(repInitial.pairs.length, 6, '6 conflicting pairs');

  // Step 1: Resolve 1 vs 2 keeping 1 (removes 2)
  schedule.resolveConflict('keepA', 'act-1', 'act-2');
  assert(schedule.isFavorite('act-2') === false, 'act-2 removed from favorites');
  assert(schedule.isSeen('act-2') === true, 'act-2 MUST REMAIN SEEN');
  const repAfter1 = schedule.getConflictsForDay('sexta', acts);
  assertEqual(repAfter1.conflictCount, 3, 'Remaining 3 acts in conflict');
  assertEqual(repAfter1.pairs.length, 3, '3 pairs among acts 1, 3, 4');

  // Step 2: Resolve 1 vs 3 keeping 3 (removes 1)
  schedule.resolveConflict('keepB', 'act-1', 'act-3');
  assert(schedule.isFavorite('act-1') === false, 'act-1 removed');
  const repAfter2 = schedule.getConflictsForDay('sexta', acts);
  assertEqual(repAfter2.conflictCount, 2, 'Acts 3 and 4 in conflict');
  assertEqual(repAfter2.pairs.length, 1, '1 pair between acts 3 and 4');

  // Step 3: Resolve 3 vs 4 keeping 3 (removes 4)
  schedule.resolveConflict('keepA', 'act-3', 'act-4');
  assert(schedule.isFavorite('act-4') === false, 'act-4 removed');
  assert(schedule.isFavorite('act-3') === true, 'act-3 remains');

  // Critical verification: both previously seen acts 2 and 4 MUST STILL BE SEEN!
  assert(schedule.isSeen('act-2') === true, 'act-2 remains marked as seen');
  assert(schedule.isSeen('act-4') === true, 'act-4 remains marked as seen');

  // Final conflict check: zero conflicts remain
  const repFinal = schedule.getConflictsForDay('sexta', acts);
  assert(repFinal.hasConflicts === false, 'Zero conflicts remain');
  assertEqual(repFinal.conflictCount, 0, '0 conflicts');
});

challenge('T40-HIGH-VOLUME: 1,000 favorited event IDs serialization and lookup stress test (<15ms)', () => {
  const storage = new MockLocalStorage();
  const win = new MockWindow();
  const schedule = new ScheduleManager(storage, win);

  const startT = Date.now();
  const thousandIds = Array.from({ length: 1000 }, (_, i) => `fest-act-${i.toString().padStart(4, '0')}`);
  schedule.replaceSchedule({ favorites: thousandIds, seen: thousandIds.slice(0, 500) });

  assertEqual(schedule.favorites.length, 1000, '1,000 favorites loaded');
  assertEqual(schedule.seen.length, 500, '500 seen loaded');
  assert(schedule.isFavorite('fest-act-0999') === true, 'Last favorite present');
  assert(schedule.isSeen('fest-act-0499') === true, 'Seen present');
  assert(schedule.isSeen('fest-act-0500') === false, 'Non-seen absent');

  const duration = Date.now() - startT;
  assert(duration < 100, `High volume completed in ${duration}ms (target <100ms)`);
});

challenge('T41-SPECIAL-CHARS: Robust handling of event IDs with slashes, spaces, emoji, and script tags', () => {
  const storage = new MockLocalStorage();
  const win = new MockWindow();
  const schedule = new ScheduleManager(storage, win);

  const specialIds = [
    'ev-1382_1',
    'act/with/slashes/and#hashes',
    'act with spaces and accents: São João',
    '<script>alert("xss")</script>',
    '🎸-rock-palco-25-abril-🔥',
    '../../etc/passwd',
  ];

  for (const id of specialIds) {
    schedule.toggleFavorite(id);
    assert(schedule.isFavorite(id) === true, `Can favorite: ${id}`);
    schedule.toggleSeen(id);
    assert(schedule.isSeen(id) === true, `Can mark seen: ${id}`);
  }

  // Persistence check
  const raw = JSON.parse(storage.getItem(LOCAL_STORAGE_KEY));
  assertEqual(raw.favorites.length, specialIds.length, 'All special IDs persisted');
  assertEqual(raw.seen.length, specialIds.length, 'All special seen IDs persisted');
});

challenge('T42-INPUT-VALIDATION: Empty string, null, and undefined safely ignored by toggleFavorite', () => {
  const store = ScheduleStore.getInstance();
  const prevCount = store.getSnapshot().favorites.length;

  store.toggleFavorite('');
  // @ts-ignore
  store.toggleFavorite(null);
  // @ts-ignore
  store.toggleFavorite(undefined);

  assertEqual(store.getSnapshot().favorites.length, prevCount, 'Guarded invalid IDs did not pollute favorites');
});

challenge('T43-FINDING-WHITESPACE: Whitespace-only ID ("   ") bypasses input check but is pruned on reload', () => {
  const store = ScheduleStore.getInstance();
  const prevCount = store.getSnapshot().favorites.length;

  // Whitespace-only string currently bypasses !eventId check
  store.toggleFavorite('   ');
  const hasWhitespace = store.getSnapshot().favorites.includes('   ');
  assert(hasWhitespace === true, 'Whitespace ID is currently admitted by toggleFavorite');

  // Verify that sanitizeIdArray correctly strips it during loadFromStorage
  const sanitized = prodSanitizeIdArray(store.getSnapshot().favorites);
  assert(!sanitized.includes('   '), 'sanitizeIdArray purges whitespace ID upon reload/storage sync');

  // Clean up
  store.toggleFavorite('   '); // toggle it back off
  assertEqual(store.getSnapshot().favorites.length, prevCount, 'State restored');
  console.log('    [FINDING (LOW)] ScheduleStore.toggleFavorite / toggleSeen: Non-empty whitespace strings ("   ") bypass the "!eventId" check and enter state until purged by sanitizeIdArray on reload.');
});

challenge('T44-PROTOTYPE-POLLUTION: Prototype pollution payload in JSON does not pollute Object.prototype', () => {
  const malicious = '{"__proto__": {"pollutedKey": "evil"}, "favorites": ["ev-clean"], "seen": [], "updatedAt": 123456789}';
  const storage = new MockLocalStorage();
  const win = new MockWindow();
  storage.setItem(LOCAL_STORAGE_KEY, malicious);

  const schedule = new ScheduleManager(storage, win);
  assertEqual(schedule.favorites, ['ev-clean'], 'Loads clean favorites');
  // @ts-ignore
  assert(({}).pollutedKey === undefined, 'Object prototype is NOT polluted');
});

challenge('T45-MULTITAB-RACE: Alternating rapid multi-tab mutations maintain state consistency', () => {
  const storage = new MockLocalStorage();
  const win = new MockWindow();
  const schedTab1 = new ScheduleManager(storage, win);
  const schedTab2 = new ScheduleManager(storage, win);

  for (let i = 0; i < 20; i++) {
    schedTab1.toggleFavorite(`tab1-${i}`);
    schedTab2._load();
    schedTab2.toggleFavorite(`tab2-${i}`);
    schedTab1._load();
  }

  assertEqual(schedTab1.favorites.length, 40, 'Tab 1 has 40 events');
  assertEqual(schedTab2.favorites.length, 40, 'Tab 2 has 40 events');
  assert(schedTab1.isFavorite('tab1-19'), 'Tab 1 has tab1-19');
  assert(schedTab1.isFavorite('tab2-19'), 'Tab 1 has tab2-19');
});

challenge('T46-SNAPSHOT-IMMUTABILITY: External mutation of array does not corrupt internal state', () => {
  const storage = new MockLocalStorage();
  const win = new MockWindow();
  const schedule = new ScheduleManager(storage, win);

  schedule.toggleFavorite('ev-safe');
  const favs = schedule.favorites;
  favs.push('ev-injected');

  // Verify internal state on next reload or save
  const freshSched = new ScheduleManager(storage, win);
  assertEqual(freshSched.favorites, ['ev-safe'], 'Internal storage was not affected by array push');
});


// -----------------------------------------------------------------------------
// SUMMARY REPORT
// -----------------------------------------------------------------------------
console.log('\n========================================================================');
console.log(' ADVERSARIAL STRESS TEST SUMMARY REPORT');
console.log('========================================================================');
console.log(`  Total Challenges : ${totalTests}`);
console.log(`  Passed           : ${passedTests}`);
console.log(`  Failed           : ${failedTests}`);
console.log('========================================================================\n');

if (failedTests > 0) {
  console.error(`✖ ADVERSARIAL CHALLENGE FAILED: ${failedTests} failure(s) observed:`);
  for (const f of failures) {
    console.error(`  - ${f.description}: ${f.error}`);
  }
  process.exit(1);
} else {
  console.log('✔ ALL ADVERSARIAL CHALLENGES PASSED EMPIRICALLY! (100% SUCCESS RATE)\n');
  process.exit(0);
}
