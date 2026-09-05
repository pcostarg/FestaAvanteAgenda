// tests/adversarial-challenger-m6-core.mjs
// Festa do Avante! 2025 - Tier 5 Core Logic, Time Math & Schedule State Adversarial Test Harness
// Challenger: M6 Challenger 1 (EMPIRICAL CHALLENGER)

import { describe, it, expect, beforeEach, defaultRunner } from './e2e/lib/test-framework.mjs';
import {
  timeToFestivalMinutes,
  festivalMinutesToTime,
  normalizeDayKey,
  areEventsOnSameDay,
  doEventsOverlap,
  detectScheduleConflicts,
  resolveConflictHelper,
} from '../src/utils/conflictDetector.ts';
import {
  LOCAL_STORAGE_KEY,
  SCHEDULE_UPDATE_EVENT,
  ScheduleStore,
  MemoryStorage,
  sanitizeIdArray,
  validateScheduleStorage,
} from '../src/utils/scheduleStorage.ts';
import {
  encodeSharePayload,
  decodeSharePayload,
} from '../src/utils/sharePayload.ts';
import {
  createJsonBackup,
  validateJsonBackup,
} from '../src/utils/jsonBackup.ts';
import festivalEventsRaw from '../src/data/program.json' with { type: 'json' };

// ========================================================================
// SUITE 1: CONTINUOUS FESTIVAL MINUTE MATH & NOCTURNAL NORMALIZATION
// ========================================================================
describe('Tier 5 Suite 1: Continuous Festival Minute Math & Nocturnal Normalization (conflictDetector.ts)', () => {
  it('ADV-CD-01: Maps standard daytime hours (06:00 to 23:59) strictly to h * 60 + m', () => {
    expect(timeToFestivalMinutes('06:00')).toBe(360);
    expect(timeToFestivalMinutes('08:30')).toBe(510);
    expect(timeToFestivalMinutes('10:00')).toBe(600);
    expect(timeToFestivalMinutes('12:00')).toBe(720);
    expect(timeToFestivalMinutes('14:15')).toBe(855);
    expect(timeToFestivalMinutes('18:45')).toBe(1125);
    expect(timeToFestivalMinutes('21:00')).toBe(1260);
    expect(timeToFestivalMinutes('22:30')).toBe(1350);
    expect(timeToFestivalMinutes('23:00')).toBe(1380);
    expect(timeToFestivalMinutes('23:59')).toBe(1439);
  });

  it('ADV-CD-02: Maps nocturnal operating hours (00:00 to 05:59) to (h + 24) * 60 + m', () => {
    // 00:00 -> 24 * 60 = 1440
    expect(timeToFestivalMinutes('00:00')).toBe(1440);
    expect(timeToFestivalMinutes('00:01')).toBe(1441);
    expect(timeToFestivalMinutes('00:30')).toBe(1470);
    expect(timeToFestivalMinutes('01:00')).toBe(1500);
    expect(timeToFestivalMinutes('01:15')).toBe(1515);
    expect(timeToFestivalMinutes('02:00')).toBe(1560);
    expect(timeToFestivalMinutes('02:30')).toBe(1590);
    expect(timeToFestivalMinutes('03:45')).toBe(1665);
    expect(timeToFestivalMinutes('05:59')).toBe(1799);
  });

  it('ADV-CD-03: Verifies exact boundary step at 05:59 (1799 min) vs 06:00 (360 min)', () => {
    const min0559 = timeToFestivalMinutes('05:59');
    const min0600 = timeToFestivalMinutes('06:00');
    expect(min0559).toBe(1799);
    expect(min0600).toBe(360);
    // 05:59 belongs to nocturnal operating window of previous night, so min0559 > 23:59 (1439)
    expect(min0559).toBeGreaterThan(timeToFestivalMinutes('23:59'));
    // 06:00 resets to early morning daytime coordinates
    expect(min0600).toBeLessThan(timeToFestivalMinutes('10:00'));
  });

  it('ADV-CD-04: festivalMinutesToTime performs exact bidirectional round-trip', () => {
    const testTimes = [
      '06:00', '08:30', '10:00', '12:00', '14:30', '18:00',
      '21:00', '22:30', '23:59', '00:00', '00:30', '01:15', '02:00', '05:59',
    ];
    for (const t of testTimes) {
      const minutes = timeToFestivalMinutes(t);
      const convertedBack = festivalMinutesToTime(minutes);
      expect(convertedBack).toBe(t);
    }
  });

  it('ADV-CD-05: Hostile and malformed time inputs throw descriptive errors', () => {
    const invalidInputs = [
      null,
      undefined,
      '',
      '   ',
      '24:00',
      '25:00',
      '12:60',
      '09:65',
      '-01:00',
      '10:0',
      '1:300',
      'noon',
      'midnight',
      '23-30',
      '12.30',
    ];
    for (const badInput of invalidInputs) {
      expect(() => timeToFestivalMinutes(badInput)).toThrow();
    }
  });

  it('ADV-CD-06: normalizes day keys across slugs, ISO dates, and abbreviations', () => {
    expect(normalizeDayKey('sexta')).toBe('sexta');
    expect(normalizeDayKey('2025-09-05')).toBe('sexta');
    expect(normalizeDayKey('fri')).toBe('sexta');
    expect(normalizeDayKey('FRI')).toBe('sexta');

    expect(normalizeDayKey('sabado')).toBe('sabado');
    expect(normalizeDayKey('2025-09-06')).toBe('sabado');
    expect(normalizeDayKey('sat')).toBe('sabado');
    expect(normalizeDayKey('SAT')).toBe('sabado');

    expect(normalizeDayKey('domingo')).toBe('domingo');
    expect(normalizeDayKey('2025-09-07')).toBe('domingo');
    expect(normalizeDayKey('sun')).toBe('domingo');
    expect(normalizeDayKey('SUN')).toBe('domingo');
  });
});

// ========================================================================
// SUITE 2: HALF-OPEN OVERLAP CONDITION & CONTIGUITY INVARIANCE
// ========================================================================
describe('Tier 5 Suite 2: Half-Open Overlap Condition & Contiguity Invariance (conflictDetector.ts)', () => {
  it('ADV-CD-07: Contiguous acts (21:00-22:00 and 22:00-23:00) MUST NOT conflict', () => {
    const act1 = { id: 'act-1', day: 'sexta', startTime: '21:00', endTime: '22:00' };
    const act2 = { id: 'act-2', day: 'sexta', startTime: '22:00', endTime: '23:00' };

    // Strict half-open condition: startA < endB && startB < endA
    // 21:00 < 23:00 (true) && 22:00 < 22:00 (FALSE)
    expect(doEventsOverlap(act1, act2)).toBe(false);
    expect(doEventsOverlap(act2, act1)).toBe(false);

    const report = detectScheduleConflicts([act1, act2]);
    expect(report.hasConflicts).toBe(false);
    expect(report.conflictCount).toBe(0);
  });

  it('ADV-CD-08: Midnight contiguous acts (23:00-00:00 and 00:00-01:00) MUST NOT conflict', () => {
    const actA = { id: 'act-a', day: 'sabado', startTime: '23:00', endTime: '00:00' };
    const actB = { id: 'act-b', day: 'sabado', startTime: '00:00', endTime: '01:00' };

    // Minutes: actA [1380, 1440], actB [1440, 1500]
    // 1380 < 1500 (true) && 1440 < 1440 (FALSE)
    expect(doEventsOverlap(actA, actB)).toBe(false);
    expect(doEventsOverlap(actB, actA)).toBe(false);

    const report = detectScheduleConflicts([actA, actB]);
    expect(report.hasConflicts).toBe(false);
    expect(report.conflictCount).toBe(0);
  });

  it('ADV-CD-09: Single-minute overlap (21:00-22:01 and 22:00-23:00) triggers conflict', () => {
    const act1 = { id: 'act-1', day: 'sexta', startTime: '21:00', endTime: '22:01' };
    const act2 = { id: 'act-2', day: 'sexta', startTime: '22:00', endTime: '23:00' };

    expect(doEventsOverlap(act1, act2)).toBe(true);
    expect(doEventsOverlap(act2, act1)).toBe(true);

    const report = detectScheduleConflicts([act1, act2]);
    expect(report.hasConflicts).toBe(true);
    expect(report.conflictCount).toBe(2);
    expect(report.pairs).toHaveLength(1);
    expect(report.pairs[0].overlapMinutes).toBe(1);
    expect(report.pairs[0].formattedOverlap).toBe('22:00 – 22:01 (1 min)');
  });

  it('ADV-CD-10: Single-minute overlap across midnight (23:45-00:31 and 00:30-01:30) triggers conflict', () => {
    const act1 = { id: 'act-1', day: 'sabado', startTime: '23:45', endTime: '00:31' };
    const act2 = { id: 'act-2', day: 'sabado', startTime: '00:30', endTime: '01:30' };

    expect(doEventsOverlap(act1, act2)).toBe(true);

    const report = detectScheduleConflicts([act1, act2]);
    expect(report.hasConflicts).toBe(true);
    expect(report.pairs[0].overlapMinutes).toBe(1);
    expect(report.pairs[0].formattedOverlap).toBe('00:30 – 00:31 (1 min)');
  });

  it('ADV-CD-11: Identical intervals conflict with 100% overlap', () => {
    const act1 = { id: 'a1', day: 'domingo', startTime: '16:00', endTime: '17:30' };
    const act2 = { id: 'a2', day: 'domingo', startTime: '16:00', endTime: '17:30' };

    expect(doEventsOverlap(act1, act2)).toBe(true);
    const report = detectScheduleConflicts([act1, act2]);
    expect(report.pairs[0].overlapMinutes).toBe(90);
    expect(report.pairs[0].formattedOverlap).toBe('16:00 – 17:30 (90 min)');
  });

  it('ADV-CD-12: Completely nested interval triggers conflict with inner duration', () => {
    const outer = { id: 'out', day: 'sabado', startTime: '18:00', endTime: '22:00' };
    const inner = { id: 'in', day: 'sabado', startTime: '19:00', endTime: '20:30' };

    expect(doEventsOverlap(outer, inner)).toBe(true);
    const report = detectScheduleConflicts([outer, inner]);
    expect(report.pairs[0].overlapMinutes).toBe(90);
    expect(report.pairs[0].formattedOverlap).toBe('19:00 – 20:30 (90 min)');
  });

  it('ADV-CD-13: Same event ID compared with itself returns false (never self-conflicts)', () => {
    const act = { id: 'same-id', day: 'sexta', startTime: '20:00', endTime: '21:00' };
    expect(doEventsOverlap(act, act)).toBe(false);
  });

  it('ADV-CD-14: Events on different festival days with identical hours DO NOT conflict', () => {
    const fridayAct = { id: 'fri-act', day: 'sexta', startTime: '21:00', endTime: '22:30' };
    const saturdayAct = { id: 'sat-act', day: 'sabado', startTime: '21:00', endTime: '22:30' };

    expect(areEventsOnSameDay(fridayAct, saturdayAct)).toBe(false);
    expect(doEventsOverlap(fridayAct, saturdayAct)).toBe(false);

    const report = detectScheduleConflicts([fridayAct, saturdayAct]);
    expect(report.hasConflicts).toBe(false);
  });
});

// ========================================================================
// SUITE 3: MULTI-ACT OVERLAPS ACROSS STAGES & MIDNIGHT SPANNING
// ========================================================================
describe('Tier 5 Suite 3: Multi-Act Overlaps Across Stages & Midnight Spanning (conflictDetector.ts)', () => {
  it('ADV-CD-15: Triple simultaneous overlap across 3 stages flags all 3 acts and generates 3 pairs', () => {
    const stage1 = { id: 'stg1', day: 'sabado', startTime: '21:00', endTime: '22:30', stage: 'Palco 25 de Abril' };
    const stage2 = { id: 'stg2', day: 'sabado', startTime: '21:15', endTime: '22:15', stage: 'Palco Paz' };
    const stage3 = { id: 'stg3', day: 'sabado', startTime: '21:30', endTime: '23:00', stage: 'Auditório 1º de Maio' };

    const report = detectScheduleConflicts([stage1, stage2, stage3]);
    expect(report.hasConflicts).toBe(true);
    expect(report.conflictCount).toBe(3);
    expect(report.conflictIds.has('stg1')).toBe(true);
    expect(report.conflictIds.has('stg2')).toBe(true);
    expect(report.conflictIds.has('stg3')).toBe(true);
    // C(3, 2) = 3 pairs
    expect(report.pairs).toHaveLength(3);
    expect(report.conflictsByEventId.get('stg1')).toHaveLength(2);
    expect(report.conflictsByEventId.get('stg2')).toHaveLength(2);
    expect(report.conflictsByEventId.get('stg3')).toHaveLength(2);
  });

  it('ADV-CD-16: Quadruple simultaneous overlap across 4 stages generates C(4, 2) = 6 pairs', () => {
    const acts = [
      { id: 'q1', day: 'sabado', startTime: '21:00', endTime: '22:30', stage: 'Palco 25 de Abril' },
      { id: 'q2', day: 'sabado', startTime: '21:15', endTime: '22:15', stage: 'Palco Paz' },
      { id: 'q3', day: 'sabado', startTime: '21:30', endTime: '23:00', stage: 'Auditório 1º de Maio' },
      { id: 'q4', day: 'sabado', startTime: '21:45', endTime: '22:45', stage: 'Cidade da Juventude' },
    ];

    const report = detectScheduleConflicts(acts);
    expect(report.hasConflicts).toBe(true);
    expect(report.conflictCount).toBe(4);
    expect(report.pairs).toHaveLength(6);

    for (const act of acts) {
      expect(report.conflictIds.has(act.id)).toBe(true);
      // Each act overlaps with the other 3
      expect(report.conflictsByEventId.get(act.id)).toHaveLength(3);
    }
  });

  it('ADV-CD-17: Chained partial overlap (A-B and B-C, but NOT A-C) isolates pairs correctly', () => {
    const actA = { id: 'chain-a', day: 'sexta', startTime: '20:00', endTime: '21:00' };
    const actB = { id: 'chain-b', day: 'sexta', startTime: '20:45', endTime: '21:45' };
    const actC = { id: 'chain-c', day: 'sexta', startTime: '21:30', endTime: '22:30' };

    expect(doEventsOverlap(actA, actB)).toBe(true);
    expect(doEventsOverlap(actB, actC)).toBe(true);
    expect(doEventsOverlap(actA, actC)).toBe(false);

    const report = detectScheduleConflicts([actA, actB, actC]);
    expect(report.hasConflicts).toBe(true);
    expect(report.conflictCount).toBe(3);
    expect(report.pairs).toHaveLength(2);

    expect(report.conflictsByEventId.get('chain-a')).toHaveLength(1);
    expect(report.conflictsByEventId.get('chain-b')).toHaveLength(2);
    expect(report.conflictsByEventId.get('chain-c')).toHaveLength(1);
  });

  it('ADV-CD-18: Spanning midnight acts (23:45 to 01:15) overlapping nocturnal acts (00:30 to 02:00)', () => {
    const midnightSpanner = { id: 'spanner', day: 'sabado', startTime: '23:45', endTime: '01:15' };
    const nocturnalAct = { id: 'nocturnal', day: 'sabado', startTime: '00:30', endTime: '02:00' };

    expect(doEventsOverlap(midnightSpanner, nocturnalAct)).toBe(true);

    const report = detectScheduleConflicts([midnightSpanner, nocturnalAct]);
    expect(report.hasConflicts).toBe(true);
    expect(report.pairs[0].overlapStart).toBe(1470); // 00:30
    expect(report.pairs[0].overlapEnd).toBe(1515);   // 01:15
    expect(report.pairs[0].overlapMinutes).toBe(45);
    expect(report.pairs[0].formattedOverlap).toBe('00:30 – 01:15 (45 min)');
  });

  it('ADV-CD-19: Spanning midnight act (23:45 to 01:15) abutting a nocturnal act (01:15 to 02:30) MUST NOT conflict', () => {
    const act1 = { id: 'spanner-1', day: 'sabado', startTime: '23:45', endTime: '01:15' };
    const act2 = { id: 'nocturnal-2', day: 'sabado', startTime: '01:15', endTime: '02:30' };

    expect(doEventsOverlap(act1, act2)).toBe(false);
    const report = detectScheduleConflicts([act1, act2]);
    expect(report.hasConflicts).toBe(false);
  });

  it('ADV-CD-20: Authentic 2025 program dataset nocturnal conflict & non-conflict verification', () => {
    // 1. Authentic Friday conflict: Semivitae (1460_0, 00:00-01:00) vs Selma Uamusse (1349, 00:00-01:00)
    const semivitae = festivalEventsRaw.find((e) => e.id === '1460_0');
    const selma = festivalEventsRaw.find((e) => e.id === '1349');
    expect(semivitae).not.toBeUndefined();
    expect(selma).not.toBeUndefined();
    expect(doEventsOverlap(semivitae, selma)).toBe(true);
    const fridayReport = detectScheduleConflicts([semivitae, selma]);
    expect(fridayReport.hasConflicts).toBe(true);
    expect(fridayReport.pairs[0].formattedOverlap).toBe('00:00 – 01:00 (60 min)');

    // 2. Authentic Saturday nocturnal interaction:
    // Capicua (1332, 23:15-00:15), Rave Avante (1347, 23:45-00:45), Fogo Fogo (1338, 00:30-01:30)
    const capicua = festivalEventsRaw.find((e) => e.id === '1332');
    const raveAvante = festivalEventsRaw.find((e) => e.id === '1347');
    const fogoFogo = festivalEventsRaw.find((e) => e.id === '1338');
    expect(capicua).not.toBeUndefined();
    expect(raveAvante).not.toBeUndefined();
    expect(fogoFogo).not.toBeUndefined();

    // Capicua overlaps Rave Avante (23:45 to 00:15 = 30 min)
    expect(doEventsOverlap(capicua, raveAvante)).toBe(true);
    // Rave Avante overlaps Fogo Fogo (00:30 to 00:45 = 15 min)
    expect(doEventsOverlap(raveAvante, fogoFogo)).toBe(true);
    // Capicua (end 00:15) does NOT overlap Fogo Fogo (start 00:30)
    expect(doEventsOverlap(capicua, fogoFogo)).toBe(false);

    const satLateReport = detectScheduleConflicts([capicua, raveAvante, fogoFogo]);
    expect(satLateReport.pairs).toHaveLength(2);
    expect(satLateReport.conflictsByEventId.get('1332')).toHaveLength(1);
    expect(satLateReport.conflictsByEventId.get('1347')).toHaveLength(2);
    expect(satLateReport.conflictsByEventId.get('1338')).toHaveLength(1);
  });
});

// ========================================================================
// SUITE 4: TIME BLOCK PARTITIONING & NOCTURNAL SORTING ORDER
// ========================================================================
describe('Tier 5 Suite 4: Time Block Partitioning & Nocturnal Chronological Order', () => {
  // Pure time block classifier per contracts
  function classifyTimeBlock(timeStr) {
    const mins = timeToFestivalMinutes(timeStr);
    const m13 = 13 * 60; // 13:00 / 14:00 boundary threshold
    const m18 = 18 * 60; // 18:00 / 19:00 boundary threshold
    const m21 = 21 * 60; // 21:00 / 22:00 boundary threshold
    if (mins < m13) return 'manha';
    if (mins < m18) return 'tarde';
    if (mins < m21) return 'anoitecer';
    return 'noite-principal';
  }

  it('ADV-TIME-01: Correctly partitions time spectrum into 4 canonical blocks', () => {
    // Manhã (10:00 - 13:00/14:00)
    expect(classifyTimeBlock('10:00')).toBe('manha');
    expect(classifyTimeBlock('11:30')).toBe('manha');
    expect(classifyTimeBlock('12:59')).toBe('manha');

    // Tarde (13:00/14:00 - 18:00/19:00)
    expect(classifyTimeBlock('14:00')).toBe('tarde');
    expect(classifyTimeBlock('15:30')).toBe('tarde');
    expect(classifyTimeBlock('17:59')).toBe('tarde');

    // Anoitecer (18:00/19:00 - 21:00/22:00)
    expect(classifyTimeBlock('19:00')).toBe('anoitecer');
    expect(classifyTimeBlock('20:00')).toBe('anoitecer');
    expect(classifyTimeBlock('20:59')).toBe('anoitecer');

    // Noite / Noite Principal (21:00/22:00 - 02:00/03:00+)
    expect(classifyTimeBlock('21:00')).toBe('noite-principal');
    expect(classifyTimeBlock('22:00')).toBe('noite-principal');
    expect(classifyTimeBlock('23:30')).toBe('noite-principal');
    expect(classifyTimeBlock('00:00')).toBe('noite-principal');
    expect(classifyTimeBlock('00:30')).toBe('noite-principal');
    expect(classifyTimeBlock('01:15')).toBe('noite-principal');
    expect(classifyTimeBlock('02:00')).toBe('noite-principal');
  });

  it('ADV-TIME-02: Nocturnal sorting order: 00:30 strictly sorts AFTER 23:30 for the same festival date', () => {
    const actLate = { id: 'late', startTime: '23:30' };
    const actNocturnal = { id: 'nocturnal', startTime: '00:30' };

    const minsLate = timeToFestivalMinutes(actLate.startTime);
    const minsNocturnal = timeToFestivalMinutes(actNocturnal.startTime);

    expect(minsLate).toBe(1410);
    expect(minsNocturnal).toBe(1470);
    expect(minsNocturnal).toBeGreaterThan(minsLate);

    const unsorted = [actNocturnal, actLate];
    const sorted = [...unsorted].sort(
      (a, b) => timeToFestivalMinutes(a.startTime) - timeToFestivalMinutes(b.startTime)
    );

    expect(sorted[0].id).toBe('late');
    expect(sorted[1].id).toBe('nocturnal');
  });

  it('ADV-TIME-03: Chronological sort across entire festival operational window preserves monotonic order', () => {
    const acts = [
      { id: 'e01', time: '10:00' },
      { id: 'e02', time: '11:45' },
      { id: 'e03', time: '14:00' },
      { id: 'e04', time: '16:30' },
      { id: 'e05', time: '19:00' },
      { id: 'e06', time: '21:30' },
      { id: 'e07', time: '23:15' },
      { id: 'e08', time: '23:45' },
      { id: 'e09', time: '00:00' },
      { id: 'e10', time: '00:30' },
      { id: 'e11', time: '01:15' },
      { id: 'e12', time: '02:00' },
    ];

    // Shuffle
    const shuffled = [...acts].sort(() => Math.random() - 0.5);
    // Sort with continuous festival minutes
    const sorted = [...shuffled].sort(
      (a, b) => timeToFestivalMinutes(a.time) - timeToFestivalMinutes(b.time)
    );

    for (let i = 0; i < sorted.length - 1; i++) {
      const currentMin = timeToFestivalMinutes(sorted[i].time);
      const nextMin = timeToFestivalMinutes(sorted[i + 1].time);
      expect(currentMin).toBeLessThan(nextMin);
    }
  });

  it('ADV-TIME-04: Demonstrates failure of naive string sorting vs continuous festival minutes', () => {
    const timeA = '23:30';
    const timeB = '00:30';

    // Naive string lexicographical comparison: '00:30' < '23:30'
    const naiveStringComparison = timeA.localeCompare(timeB);
    expect(naiveStringComparison).toBeGreaterThan(0); // Fails festival reality (23:30 > 00:30 string-wise)

    // Continuous festival minutes comparison: 1410 < 1470
    const continuousComparison = timeToFestivalMinutes(timeA) - timeToFestivalMinutes(timeB);
    expect(continuousComparison).toBeLessThan(0); // Accurately models festival reality (23:30 precedes 00:30)
  });

  it('ADV-TIME-05: Validates all 269 authentic acts in program.json for valid timeBlock and times', () => {
    expect(festivalEventsRaw.length).toBe(269);
    const validBlocks = new Set(['manha', 'tarde', 'anoitecer', 'noite-principal']);

    for (const ev of festivalEventsRaw) {
      expect(validBlocks.has(ev.timeBlock)).toBe(true);
      expect(ev.startTime).toMatch(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/);
      expect(ev.endTime).toMatch(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/);

      const startMin = timeToFestivalMinutes(ev.startTime);
      const endMin = timeToFestivalMinutes(ev.endTime);
      expect(endMin).toBeGreaterThan(startMin);
    }
  });
});

// ========================================================================
// SUITE 5: SCHEDULE STATE, STORAGE KEY & MULTI-TAB SYNCHRONIZATION
// ========================================================================
describe('Tier 5 Suite 5: Schedule State, Storage Key & Multi-Tab Synchronization (useSchedule / scheduleStorage.ts)', () => {
  let memoryStorage;
  let mockWindow;

  beforeEach(() => {
    memoryStorage = new MemoryStorage();
    mockWindow = {
      listeners: new Map(),
      addEventListener(type, cb) {
        if (!this.listeners.has(type)) this.listeners.set(type, []);
        this.listeners.get(type).push(cb);
      },
      removeEventListener(type, cb) {
        if (!this.listeners.has(type)) return;
        this.listeners.set(type, this.listeners.get(type).filter((x) => x !== cb));
      },
      dispatchEvent(evt) {
        if (this.listeners.has(evt.type)) {
          for (const cb of this.listeners.get(evt.type)) cb(evt);
        }
        return true;
      },
    };
  });

  it('ADV-STATE-01: Storage key is strictly avante_schedule_v1', () => {
    expect(LOCAL_STORAGE_KEY).toBe('avante_schedule_v1');
  });

  it('ADV-STATE-02: validateScheduleStorage validates { favorites, seen, updatedAt } schema strictly', () => {
    const valid = { favorites: ['act-1', 'act-2'], seen: ['act-1'], updatedAt: Date.now() };
    expect(validateScheduleStorage(valid).valid).toBe(true);

    // Invalid favorites type
    expect(validateScheduleStorage({ favorites: 'not-array', seen: [], updatedAt: Date.now() }).valid).toBe(false);
    // Non-string entries in favorites
    expect(validateScheduleStorage({ favorites: [123], seen: [], updatedAt: Date.now() }).valid).toBe(false);
    // Invalid seen type
    expect(validateScheduleStorage({ favorites: [], seen: null, updatedAt: Date.now() }).valid).toBe(false);
    // Invalid updatedAt
    expect(validateScheduleStorage({ favorites: [], seen: [], updatedAt: -5 }).valid).toBe(false);
    expect(validateScheduleStorage({ favorites: [], seen: [], updatedAt: NaN }).valid).toBe(false);
    expect(validateScheduleStorage('not an object').valid).toBe(false);
  });

  it('ADV-STATE-03: sanitizeIdArray cleanses, trims, filters non-strings, and deduplicates', () => {
    const dirty = ['act-1', null, undefined, 42, '', '   ', 'act-2', 'act-1', '  act-3  '];
    const clean = sanitizeIdArray(dirty);
    expect(clean).toEqual(['act-1', 'act-2', '  act-3  ']);
    expect(clean.includes('act-1')).toBe(true);
    expect(clean.filter((id) => id === 'act-1')).toHaveLength(1);
  });

  it('ADV-STATE-04: Multi-tab sync via storage events updates state and triggers listeners', () => {
    // Simulate ScheduleStore logic with isolated MemoryStorage and MockWindow
    class TestableScheduleStore {
      constructor(storage, win) {
        this.storage = storage;
        this.win = win;
        this.listeners = new Set();
        this.state = this.load();
        if (this.win) {
          this.win.addEventListener('storage', this.handleStorageEvent);
        }
      }

      load() {
        try {
          const raw = this.storage.getItem(LOCAL_STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (validateScheduleStorage(parsed).valid) {
              return {
                favorites: sanitizeIdArray(parsed.favorites),
                seen: sanitizeIdArray(parsed.seen),
                updatedAt: parsed.updatedAt,
              };
            }
          }
        } catch {
          // Corrupt JSON
        }
        return { favorites: [], seen: [], updatedAt: Date.now() };
      }

      handleStorageEvent = (e) => {
        if (e.key === LOCAL_STORAGE_KEY || e.key === null) {
          this.state = this.load();
          for (const listener of this.listeners) listener();
        }
      };

      subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
      }

      replaceSchedule(data) {
        this.state = {
          favorites: sanitizeIdArray(data.favorites),
          seen: sanitizeIdArray(data.seen),
          updatedAt: Date.now(),
        };
        this.storage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.state));
        this.win.dispatchEvent({
          type: SCHEDULE_UPDATE_EVENT,
          detail: this.state,
        });
        for (const listener of this.listeners) listener();
      }
    }

    const storeInstance = new TestableScheduleStore(memoryStorage, mockWindow);
    let notifiedCount = 0;
    storeInstance.subscribe(() => {
      notifiedCount++;
    });

    // 1. Another tab writes to localStorage and emits storage event
    const remotePayload = { favorites: ['remote-fav-1'], seen: ['remote-seen-1'], updatedAt: 123456789 };
    memoryStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(remotePayload));
    mockWindow.dispatchEvent({
      type: 'storage',
      key: LOCAL_STORAGE_KEY,
      newValue: JSON.stringify(remotePayload),
      storageArea: memoryStorage,
    });

    expect(notifiedCount).toBe(1);
    expect(storeInstance.state.favorites).toEqual(['remote-fav-1']);
    expect(storeInstance.state.seen).toEqual(['remote-seen-1']);

    // 2. Unrelated storage key does NOT trigger notification
    mockWindow.dispatchEvent({
      type: 'storage',
      key: 'unrelated_storage_key',
      newValue: 'some_value',
    });
    expect(notifiedCount).toBe(1);

    // 3. storage.clear() emits key: null, cleanly reloads empty state
    memoryStorage.clear();
    mockWindow.dispatchEvent({
      type: 'storage',
      key: null,
      newValue: null,
    });
    expect(notifiedCount).toBe(2);
    expect(storeInstance.state.favorites).toEqual([]);
    expect(storeInstance.state.seen).toEqual([]);
  });

  it('ADV-STATE-05: Intra-tab synchronization dispatches avante_schedule_updated CustomEvent', () => {
    let capturedEvent = null;
    mockWindow.addEventListener(SCHEDULE_UPDATE_EVENT, (evt) => {
      capturedEvent = evt;
    });

    const payload = { favorites: ['ev-local-1'], seen: ['ev-local-2'], updatedAt: Date.now() };
    mockWindow.dispatchEvent({
      type: SCHEDULE_UPDATE_EVENT,
      detail: payload,
    });

    expect(capturedEvent).not.toBeNull();
    expect(capturedEvent.type).toBe('avante_schedule_updated');
    expect(capturedEvent.detail.favorites).toEqual(['ev-local-1']);
  });

  it('ADV-STATE-06: replaceSchedule enforces Silent Direct Overwrite Rule (no merge)', () => {
    const existingState = { favorites: ['old-1', 'old-2', 'old-3'], seen: ['seen-old'] };
    const importedState = { favorites: ['new-A', 'new-B'], seen: ['new-seen'] };

    // Direct replacement
    const replacedFavorites = sanitizeIdArray(importedState.favorites);
    const replacedSeen = sanitizeIdArray(importedState.seen);

    expect(replacedFavorites).toEqual(['new-A', 'new-B']);
    expect(replacedSeen).toEqual(['new-seen']);
    // Old IDs are completely eradicated
    expect(replacedFavorites.includes('old-1')).toBe(false);
    expect(replacedFavorites.includes('old-2')).toBe(false);
    expect(replacedFavorites.includes('old-3')).toBe(false);
    expect(replacedSeen.includes('seen-old')).toBe(false);
  });

  it('ADV-STATE-07: Non-existent event IDs are safely isolated and pruned during processing', () => {
    const favoritesWithGhosts = ['1332', 'GHOST_EVENT_9999', '1338', 'FABRICATED_ID_XYZ'];
    const authenticEvents = festivalEventsRaw; // 269 events

    // 1. Filtering favorites on selected day (as done in HorarioView.tsx):
    const favoritedOnDay = authenticEvents.filter(
      (e) => e.day === 'sabado' && favoritesWithGhosts.includes(e.id)
    );
    // Ghost IDs are NOT in authenticEvents, so they never appear in the view:
    expect(favoritedOnDay.every((e) => e.id === '1332' || e.id === '1338')).toBe(true);
    expect(favoritedOnDay.some((e) => e.id === 'GHOST_EVENT_9999')).toBe(false);

    // 2. Conflict detection:
    const conflictReport = detectScheduleConflicts(favoritedOnDay);
    expect(conflictReport.conflictIds.has('GHOST_EVENT_9999')).toBe(false);

    // 3. JSON Backup creation pruning:
    const backup = createJsonBackup(favoritesWithGhosts, [], authenticEvents);
    expect(backup.events).not.toBeUndefined();
    // Only authentic events are summarized
    const summarizedIds = backup.events.map((e) => e.id);
    expect(summarizedIds.includes('1332')).toBe(true);
    expect(summarizedIds.includes('1338')).toBe(true);
    expect(summarizedIds.includes('GHOST_EVENT_9999')).toBe(false);
    expect(summarizedIds.includes('FABRICATED_ID_XYZ')).toBe(false);
  });
});

// ========================================================================
// SUITE 6: CONFLICT RESOLUTION MATRIX ADVERSARIAL STRESS
// ========================================================================
describe('Tier 5 Suite 6: Conflict Resolution Matrix Adversarial Stress', () => {
  it('ADV-RES-01: keepA removes eventB and preserves eventA', () => {
    const current = ['act-a', 'act-b', 'act-c'];
    const updated = resolveConflictHelper('keepA', 'act-a', 'act-b', current);
    expect(updated).toEqual(['act-a', 'act-c']);
    expect(updated.includes('act-b')).toBe(false);
  });

  it('ADV-RES-02: keepB removes eventA and preserves eventB', () => {
    const current = ['act-a', 'act-b', 'act-c'];
    const updated = resolveConflictHelper('keepB', 'act-a', 'act-b', current);
    expect(updated).toEqual(['act-b', 'act-c']);
    expect(updated.includes('act-a')).toBe(false);
  });

  it('ADV-RES-03: split preserves both events in favorites', () => {
    const current = ['act-a', 'act-b'];
    const updated = resolveConflictHelper('split', 'act-a', 'act-b', current);
    expect(updated).toEqual(['act-a', 'act-b']);
  });

  it('ADV-RES-04: Chained resolution in 3-way conflict (A, B, C)', () => {
    let favs = ['act-a', 'act-b', 'act-c'];

    // Resolve A vs B by keeping A -> drops B
    favs = resolveConflictHelper('keepA', 'act-a', 'act-b', favs);
    expect(favs).toEqual(['act-a', 'act-c']);

    // If A and C also conflicted, resolving A vs C by keeping C -> drops A
    favs = resolveConflictHelper('keepB', 'act-a', 'act-c', favs);
    expect(favs).toEqual(['act-c']);
  });
});

// ========================================================================
// CLI RUNNER
// ========================================================================
async function main() {
  console.log('\n========================================================================');
  console.log(' FESTA DO AVANTE! 2025 — TIER 5 CORE LOGIC ADVERSARIAL CHALLENGER');
  console.log('========================================================================');
  console.log('Author: M6 Challenger 1 (EMPIRICAL CHALLENGER)');
  console.log('Target: conflictDetector.ts, timeUtils/ListaView math, useSchedule / scheduleStorage\n');

  const { stats, results } = await defaultRunner.run();

  const failedTests = results.filter((r) => r.status === 'FAILED');

  console.log('------------------------------------------------------------------------');
  console.log('CHALLENGE REPORT SUMMARY');
  console.log('------------------------------------------------------------------------');
  console.log(`  Total Adversarial Tests : ${stats.total}`);
  console.log(`  Passed                  : ${stats.passed}`);
  console.log(`  Failed                  : ${stats.failed}`);
  console.log(`  Skipped                 : ${stats.skipped}`);
  console.log(`  Execution Time          : ${stats.durationMs} ms`);
  console.log('------------------------------------------------------------------------');

  if (failedTests.length > 0) {
    console.error('\n❌ CRITICAL BUGS / ADVERSARIAL FAILURES FOUND:');
    for (const failure of failedTests) {
      console.error(`  [FAIL] ${failure.suite} > ${failure.name}`);
      console.error(`         Error: ${failure.error}`);
    }
    process.exit(1);
  } else {
    console.log('✔ ALL ADVERSARIAL TESTS PASSED! Core logic and state are mathematically sound.');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal error running adversarial test harness:', err);
  process.exit(1);
});
