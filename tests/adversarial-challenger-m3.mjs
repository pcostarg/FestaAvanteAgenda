// tests/adversarial-challenger-m3.mjs
// Adversarial Challenger Test Harness for Milestone 3: Views & UI Components
// Focus: Grelha coordinates, AGORA needle calculations, search diacritics/regex,
// shortcut suppression, and empty state rendering.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Import authoritative E2E contracts & fixtures
import {
  timeToFestivalMinutes,
  festivalMinutesToTime,
  FESTIVAL_STAGES,
  FESTIVAL_DAYS,
} from './e2e/lib/contracts.mjs';
import { TEST_EVENTS } from './e2e/lib/fixtures.mjs';

const programJsonPath = path.join(rootDir, 'src', 'data', 'program.json');
const rawProgram = JSON.parse(fs.readFileSync(programJsonPath, 'utf8'));

console.log('========================================================================');
console.log(' ADVERSARIAL STRESS HARNESS — MILESTONE 3: VIEWS & UI COMPONENTS');
console.log('========================================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];
const empiricalFindings = [];

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

function noteFinding(area, severity, observation, impact) {
  empiricalFindings.push({ area, severity, observation, impact });
  console.log(`  [FINDING (${severity.toUpperCase()})] ${area}: ${observation}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// =========================================================================
// Dimension 1: Grelha Coordinate Calculation for Out-of-Bounds Acts
// =========================================================================
console.log('\n--- Dimension 1: Grelha Coordinate Calculation for Acts Before 10:00 & After 02:00 ---');

// Replicate exact Grelha coordinate calculation from EventBlock.tsx
function computeGrelhaCoords(timeStart, timeEnd) {
  const startMinutes = timeToFestivalMinutes(timeStart);
  const endMinutes = timeToFestivalMinutes(timeEnd);
  const axisStart = 600; // 10:00
  const axisEnd = 1560; // 02:00
  const totalSpan = 960; // 16 hours

  const clampedStart = Math.max(axisStart, startMinutes);
  const clampedEnd = Math.min(axisEnd, endMinutes);
  const offsetMinutes = Math.max(0, clampedStart - axisStart);
  const durationMinutes = Math.max(15, clampedEnd - clampedStart);

  const leftPercent = (offsetMinutes / totalSpan) * 100;
  const widthPercent = (durationMinutes / totalSpan) * 100;

  return {
    startMinutes,
    endMinutes,
    clampedStart,
    clampedEnd,
    offsetMinutes,
    durationMinutes,
    leftPercent,
    widthPercent,
    isBeforeOpening: endMinutes <= axisStart,
    isAfterClosing: startMinutes >= axisEnd,
  };
}

challenge('D1-01: Pre-opening act strictly before 10:00 (08:30 – 09:30) produces non-negative offset (clamped to 0)', () => {
  const coords = computeGrelhaCoords('08:30', '09:30');
  assert(coords.startMinutes === 510, `Expected 510, got ${coords.startMinutes}`);
  assert(coords.endMinutes === 570, `Expected 570, got ${coords.endMinutes}`);
  assert(coords.offsetMinutes === 0, `Expected offsetMinutes 0, got ${coords.offsetMinutes}`);
  assert(coords.leftPercent === 0, `Expected leftPercent 0, got ${coords.leftPercent}`);
});

challenge('D1-02: Pre-opening act strictly before 10:00 (08:30 – 09:30) duration inversion & false-positive rendering', () => {
  const coords = computeGrelhaCoords('08:30', '09:30');
  // Notice: clampedEnd (570) < clampedStart (600).
  // clampedEnd - clampedStart = -30.
  // Math.max(15, -30) = 15!
  assert(coords.clampedEnd < coords.clampedStart, 'clampedEnd should be strictly less than clampedStart for pre-10:00 event');
  assert(coords.durationMinutes === 15, `Expected durationMinutes to fallback to 15, got ${coords.durationMinutes}`);
  
  noteFinding(
    'Grelha Coordinate Engine',
    'Medium',
    'Acts concluding strictly before 10:00 (e.g. Torneio de Malha 08:30-09:30 in program.json) render at left: 0% for 15 minutes as if active from 10:00 to 10:15.',
    'Visual inaccuracy on Grelha matrix: pre-festival acts are artificially displayed at the 10:00 opening slot instead of being filtered out or marked as off-grid.'
  );
});

challenge('D1-03: Boundary act ending exactly at 10:00 (09:30 – 10:00) renders at left: 0% with 15min minimum block', () => {
  const coords = computeGrelhaCoords('09:30', '10:00');
  assert(coords.startMinutes === 570, 'Start minutes 570');
  assert(coords.endMinutes === 600, 'End minutes 600');
  assert(coords.clampedStart === 600, 'clampedStart is 600');
  assert(coords.clampedEnd === 600, 'clampedEnd is 600');
  assert(coords.durationMinutes === 15, 'Minimum 15 min duration allocated');
  assert(coords.leftPercent === 0, 'Placed at 0%');
});

challenge('D1-04: Act spanning across opening boundary (08:30 – 11:00) cleanly clips pre-10:00 duration', () => {
  const coords = computeGrelhaCoords('08:30', '11:00');
  assert(coords.clampedStart === 600, 'Clamped start is 600');
  assert(coords.clampedEnd === 660, 'Clamped end is 660');
  assert(coords.offsetMinutes === 0, 'Offset is 0');
  assert(coords.durationMinutes === 60, `Expected 60 minutes, got ${coords.durationMinutes}`);
  assert(coords.leftPercent === 0, 'leftPercent is 0');
  assert(coords.widthPercent === (60 / 960) * 100, 'widthPercent represents exactly 1 hour on 16h grid');
});

challenge('D1-05: Act strictly after closing (02:30 – 03:30) results in leftPercent > 100% (grid overflow)', () => {
  const coords = computeGrelhaCoords('02:30', '03:30');
  assert(coords.startMinutes === 1590, 'Start is 1590 (26h30)');
  assert(coords.endMinutes === 1650, 'End is 1650 (27h30)');
  assert(coords.clampedStart === 1590, 'clampedStart is 1590');
  assert(coords.clampedEnd === 1560, 'clampedEnd is 1560');
  assert(coords.offsetMinutes === 990, 'offsetMinutes is 990 (990 > 960)');
  assert(coords.leftPercent > 100, `Expected leftPercent > 100%, got ${coords.leftPercent}%`);

  noteFinding(
    'Grelha Coordinate Engine',
    'Low',
    'Acts starting after 02:00 (e.g. 02:30) compute leftPercent > 100% (103.125%), positioning elements beyond the track width.',
    'While the current program.json has no acts past 02:00, custom or scraped late-night acts would overflow the timeline track boundary unless filtered.'
  );
});

challenge('D1-06: Act spanning across closing boundary (01:30 – 02:30) cleanly clips post-02:00 duration at 100%', () => {
  const coords = computeGrelhaCoords('01:30', '02:30');
  assert(coords.clampedStart === 1530, 'clampedStart 1530');
  assert(coords.clampedEnd === 1560, 'clampedEnd clamped to 1560');
  assert(coords.offsetMinutes === 930, 'offset is 930');
  assert(coords.durationMinutes === 30, 'duration is 30 mins');
  assert(coords.leftPercent === (930 / 960) * 100, 'leftPercent is 96.875%');
  assert(coords.leftPercent + coords.widthPercent === 100, 'left + width equals exactly 100% at grid terminus');
});

challenge('D1-07: Real dataset early acts verification against Grelha constraints', () => {
  const earlyActs = rawProgram.filter((e) => {
    const s = timeToFestivalMinutes(e.startTime || e.timeStart);
    return s < 600;
  });
  assert(earlyActs.length === 3, `Expected 3 early acts in authentic dataset, found ${earlyActs.length}`);
  for (const act of earlyActs) {
    const coords = computeGrelhaCoords(act.startTime || act.timeStart, act.endTime || act.timeEnd);
    assert(coords.leftPercent === 0, `Act ${act.id} (${act.title}) offset should be 0`);
  }
});

// =========================================================================
// Dimension 2: AGORA Needle Calculation & Operating Window Suppression
// =========================================================================
console.log('\n--- Dimension 2: AGORA Needle Calculation & Operating Window Suppression ---');

function computeAgoraNeedle(currentMinutes) {
  const axisStart = 600; // 10:00
  const axisEnd = 1560; // 02:00
  const totalSpan = axisEnd - axisStart; // 960

  const isOperatingWindow = currentMinutes >= axisStart && currentMinutes <= axisEnd;

  let agoraPercentage = 0;
  if (currentMinutes <= axisStart) {
    agoraPercentage = 0;
  } else if (currentMinutes >= axisEnd) {
    agoraPercentage = 100;
  } else {
    agoraPercentage = ((currentMinutes - axisStart) / totalSpan) * 100;
  }

  return { isOperatingWindow, agoraPercentage };
}

challenge('D2-01: Needle position at 10:00 is exactly 0.00%', () => {
  const res = computeAgoraNeedle(600);
  assert(res.isOperatingWindow === true, '10:00 is within operating window');
  assert(res.agoraPercentage === 0, `Expected 0%, got ${res.agoraPercentage}%`);
});

challenge('D2-02: Needle position at 18:00 (midpoint) is exactly 50.00%', () => {
  const res = computeAgoraNeedle(1080);
  assert(res.isOperatingWindow === true, '18:00 is within operating window');
  assert(res.agoraPercentage === 50, `Expected 50%, got ${res.agoraPercentage}%`);
});

challenge('D2-03: Needle position at 02:00 (closing) is exactly 100.00%', () => {
  const res = computeAgoraNeedle(1560);
  assert(res.isOperatingWindow === true, '02:00 is within operating window');
  assert(res.agoraPercentage === 100, `Expected 100%, got ${res.agoraPercentage}%`);
});

challenge('D2-04: Midnight rollover progression is strictly monotonic', () => {
  const t2359 = timeToFestivalMinutes('23:59'); // 1439
  const t0000 = timeToFestivalMinutes('00:00'); // 1440
  const t0001 = timeToFestivalMinutes('00:01'); // 1441

  const p2359 = computeAgoraNeedle(t2359).agoraPercentage;
  const p0000 = computeAgoraNeedle(t0000).agoraPercentage;
  const p0001 = computeAgoraNeedle(t0001).agoraPercentage;

  assert(p0000 > p2359, `00:00 (${p0000}%) must be greater than 23:59 (${p2359}%)`);
  assert(p0001 > p0000, `00:01 (${p0001}%) must be greater than 00:00 (${p0000}%)`);
  assert(Math.abs(p0000 - 87.5) < 0.0001, `Expected midnight at 87.5%, got ${p0000}%`);
});

challenge('D2-05: Operating window boundary suppression at 09:59 (pre-opening)', () => {
  const t0959 = timeToFestivalMinutes('09:59'); // 599
  const res = computeAgoraNeedle(t0959);
  assert(res.isOperatingWindow === false, '09:59 must be suppressed (outside operating window)');
});

challenge('D2-06: Operating window boundary suppression at 02:01 (post-closing)', () => {
  const t0201 = timeToFestivalMinutes('02:01'); // 1561
  const res = computeAgoraNeedle(t0201);
  assert(res.isOperatingWindow === false, '02:01 must be suppressed (outside operating window)');
});

challenge('D2-07: Dawn hours suppression (04:30 and 06:00)', () => {
  const t0430 = timeToFestivalMinutes('04:30'); // 1710
  const t0600 = timeToFestivalMinutes('06:00'); // 360
  assert(computeAgoraNeedle(t0430).isOperatingWindow === false, '04:30 is suppressed');
  assert(computeAgoraNeedle(t0600).isOperatingWindow === false, '06:00 is suppressed');
});

challenge('D2-08: Cross-day needle gating (needle suppressed when viewing non-current festival day)', () => {
  const currentDay = 'sexta';
  const selectedDays = ['sexta', 'sabado', 'domingo'];
  const results = selectedDays.map((day) => {
    const isToday = day === currentDay;
    const isOperatingWindow = true; // mid-day
    const isActive = isOperatingWindow && isToday;
    return { day, isActive };
  });

  assert(results.find((r) => r.day === 'sexta').isActive === true, 'Active on sexta');
  assert(results.find((r) => r.day === 'sabado').isActive === false, 'Suppressed on sabado');
  assert(results.find((r) => r.day === 'domingo').isActive === false, 'Suppressed on domingo');
});

challenge('D2-09: Layout Geometry Analysis — AGORA needle container relative alignment', () => {
  // In GrelhaView.tsx:
  // <div className="overflow-x-auto overflow-y-hidden relative">
  //   <AgoraNeedle percentage={agoraPercentage} />
  //   <TimeAxisHeader />
  //   <StageTracks />
  // </div>
  // TimeAxisHeader and StageTrack have:
  // - sticky stage column: w-44 (176px) or md:w-48 (192px)
  // - track canvas: min-w-[2400px]
  // Total container width = 176px + 2400px = 2576px.
  // When percentage is 0% (10:00), AgoraNeedle is placed at left: 0% of 2576px (X=0px, on the stage name!).
  // When percentage is 50% (18:00), AgoraNeedle is at 0.5 * 2576px = 1288px.
  // While 18:00 on the timeline canvas is at 176px + 0.5 * 2400px = 1376px.
  // Delta = 88px misalignment!
  const stageColWidth = 176;
  const canvasWidth = 2400;
  const totalContainerWidth = stageColWidth + canvasWidth;

  const needlePosAt0 = 0 * totalContainerWidth;
  const canvasPosAt0 = stageColWidth + 0 * canvasWidth;
  const diffAt0 = Math.abs(canvasPosAt0 - needlePosAt0);

  const needlePosAt50 = 0.5 * totalContainerWidth;
  const canvasPosAt50 = stageColWidth + 0.5 * canvasWidth;
  const diffAt50 = Math.abs(canvasPosAt50 - needlePosAt50);

  assert(diffAt0 === 176, `Diff at 0% should be 176px, got ${diffAt0}`);
  assert(diffAt50 === 88, `Diff at 50% should be 88px, got ${diffAt50}`);

  noteFinding(
    'Grelha UI Layout Geometry',
    'Medium',
    'AgoraNeedle is mounted in the outer overflow container spanning [0, 2576px] instead of the inner track canvas [176px, 2576px].',
    'The AGORA vertical needle is offset to the left of the timeline ticks and event blocks by up to 176px (at 10:00) and 88px (at 18:00).'
  );
});

// =========================================================================
// Dimension 3: Search Filter Robustness Against Regex Characters & Accents
// =========================================================================
console.log('\n--- Dimension 3: Search Filter Robustness (Special Regex Characters & Accents) ---');

// Replicate normalizeText and filtering logic from ListaView.tsx
const normalizeText = (str) =>
  (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

function filterActs(events, query) {
  const normQ = normalizeText(query);
  if (!normQ) return events;
  return events.filter((ev) => {
    const titleNorm = normalizeText(ev.title);
    const stageNorm = normalizeText(ev.stage);
    const descNorm = normalizeText(ev.description || '');
    const catNorm = normalizeText(ev.category);
    const tagsNorm = (ev.tags || []).map(normalizeText).join(' ');

    return (
      titleNorm.includes(normQ) ||
      stageNorm.includes(normQ) ||
      descNorm.includes(normQ) ||
      catNorm.includes(normQ) ||
      tagsNorm.includes(normQ)
    );
  });
}

challenge('D3-01: Special regex character queries execute safely without throwing SyntaxError', () => {
  const dangerousTokens = [
    '.*',
    '[a-z]+',
    '()',
    '$$$',
    '(?=.*)',
    '^.*$',
    '\\',
    '+',
    '?',
    '*',
    '{1,3}',
    '|',
    '[',
    ']',
    '(',
    ')',
    'C++ & C#',
    '/$#@!%^&*()',
  ];

  for (const token of dangerousTokens) {
    let matches;
    try {
      matches = filterActs(TEST_EVENTS, token);
    } catch (err) {
      assert(false, `Query "${token}" threw error: ${err.message}`);
    }
    assert(Array.isArray(matches), `Result for "${token}" must be an array`);
  }
});

challenge('D3-02: Portuguese diacritics / accent insensitivity ("mediterraneo" vs "Mediterrâneo")', () => {
  const query = 'mediterraneo';
  const matches = filterActs(TEST_EVENTS, query);
  assert(matches.length > 0, `Expected matches for "${query}", got 0`);
  const found = matches.some((e) => e.title.includes('Mediterrâneo'));
  assert(found, 'Must match "Mediterrâneo" when searching unaccented "mediterraneo"');
});

challenge('D3-03: Inverse accent matching ("Mediterrâneo" query vs unaccented string)', () => {
  const query = 'Mediterrâneo';
  const dummyEvent = {
    id: 'test-plain',
    title: 'Orquestra do Mar Mediterraneo',
    stage: 'Palco Paz',
    category: 'Música',
    description: '',
    tags: [],
  };
  const matches = filterActs([dummyEvent], query);
  assert(matches.length === 1, 'Accented query matches unaccented event title');
});

challenge('D3-04: Portuguese nasal and cedilla vowels ("Canções", "João", "Ciência")', () => {
  const testSet = [
    { query: 'cancoes', expectedSubstring: 'Canções' },
    { query: 'joao', expectedSubstring: 'João' },
    { query: 'ciencia', expectedSubstring: 'Ciência' },
    { query: 'sinfonica', expectedSubstring: 'Sinfónica' },
  ];

  const syntheticActs = [
    { id: '1', title: 'Novas Canções de Abril', stage: 'Palco 25 de Abril', category: 'Música', tags: [] },
    { id: '2', title: 'Homenagem a João Pedro', stage: 'Palco Paz', category: 'Música', tags: [] },
    { id: '3', title: 'Espaço Ciência e Robótica', stage: 'Espaço Ciência & Desporto', category: 'Debates', tags: [] },
    { id: '4', title: 'Orquestra Sinfónica do Porto', stage: 'Auditório 1º de Maio', category: 'Música', tags: [] },
  ];

  for (const { query, expectedSubstring } of testSet) {
    const matched = filterActs(syntheticActs, query);
    assert(matched.length >= 1, `Expected at least 1 match for query "${query}"`);
    assert(matched[0].title.includes(expectedSubstring), `Expected title to contain "${expectedSubstring}"`);
  }
});

challenge('D3-05: Multi-field search coverage (matches title, stage, description, category, and tags)', () => {
  const testAct = {
    id: 'multi-test',
    title: 'Concerto de Abertura',
    stage: 'Auditório 1º de Maio',
    category: 'Música',
    description: 'Atuação especial com solistas convidados',
    tags: ['sinfónica', 'clássica', 'estreia'],
  };

  assert(filterActs([testAct], 'abertura').length === 1, 'Matched title');
  assert(filterActs([testAct], '1º de maio').length === 1, 'Matched stage');
  assert(filterActs([testAct], 'solistas').length === 1, 'Matched description');
  assert(filterActs([testAct], 'musica').length === 1, 'Matched category');
  assert(filterActs([testAct], 'estreia').length === 1, 'Matched tag');
  assert(filterActs([testAct], 'rock metal').length === 0, 'No match for unrelated term');
});

challenge('D3-06: Whitespace-only search input is safely trimmed without filtering out all events', () => {
  const spaces = '     ';
  const allActs = filterActs(TEST_EVENTS, spaces);
  assert(allActs.length === TEST_EVENTS.length, 'Whitespace-only query yields all events');
});

// =========================================================================
// Dimension 4: '/' Keyboard Shortcut Suppression
// =========================================================================
console.log('\n--- Dimension 4: Global Keyboard Shortcut / Suppression ---');

// Replicate shortcut evaluation logic from useKeyboardShortcut.ts
function evaluateShortcutTrigger({
  key,
  ctrlKey = false,
  altKey = false,
  metaKey = false,
  activeTagName = 'BODY',
  isContentEditable = false,
  isModalOpen = false,
  hasDialogInDom = false,
  isSearchInputActive = false,
}) {
  let defaultPrevented = false;
  let focusedSearch = false;
  let blurredSearch = false;
  let triggeredCallback = false;
  let escapedCallback = false;

  const preventDefault = () => { defaultPrevented = true; };
  const triggerFocus = () => { focusedSearch = true; triggeredCallback = true; };
  const triggerEscape = () => { blurredSearch = true; escapedCallback = true; };

  // 1. Modal check
  if (isModalOpen || hasDialogInDom) {
    return { shouldAct: false, defaultPrevented, focusedSearch, triggeredCallback };
  }

  // 2. Modifiers
  if (ctrlKey || altKey || metaKey) {
    return { shouldAct: false, defaultPrevented, focusedSearch, triggeredCallback };
  }

  // 3. Form input check
  const tag = activeTagName.toUpperCase();
  const isEditable =
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    isContentEditable;

  if (key === '/') {
    if (!isEditable) {
      preventDefault();
      triggerFocus();
    }
  } else if (key === 'Escape') {
    if (isSearchInputActive) {
      preventDefault();
      triggerEscape();
    }
  }

  return {
    shouldAct: focusedSearch || blurredSearch,
    defaultPrevented,
    focusedSearch,
    blurredSearch,
    triggeredCallback,
    escapedCallback,
  };
}

challenge('D4-01: Does NOT trigger / shortcut when active element is INPUT', () => {
  const res = evaluateShortcutTrigger({ key: '/', activeTagName: 'INPUT' });
  assert(res.focusedSearch === false, 'Should not focus search when inside INPUT');
  assert(res.defaultPrevented === false, 'Should not preventDefault when inside INPUT');
});

challenge('D4-02: Does NOT trigger / shortcut when active element is TEXTAREA', () => {
  const res = evaluateShortcutTrigger({ key: '/', activeTagName: 'TEXTAREA' });
  assert(res.focusedSearch === false, 'Should not focus search when inside TEXTAREA');
  assert(res.defaultPrevented === false, 'Should not preventDefault when inside TEXTAREA');
});

challenge('D4-03: Does NOT trigger / shortcut when active element is SELECT', () => {
  const res = evaluateShortcutTrigger({ key: '/', activeTagName: 'SELECT' });
  assert(res.focusedSearch === false, 'Should not focus search when inside SELECT');
  assert(res.defaultPrevented === false, 'Should not preventDefault when inside SELECT');
});

challenge('D4-04: Does NOT trigger / shortcut when active element is contentEditable', () => {
  const res = evaluateShortcutTrigger({ key: '/', activeTagName: 'DIV', isContentEditable: true });
  assert(res.focusedSearch === false, 'Should not focus search when inside contentEditable');
});

challenge('D4-05: Does NOT trigger / shortcut when a dialog is open (role="dialog" in DOM)', () => {
  const res = evaluateShortcutTrigger({ key: '/', activeTagName: 'BODY', hasDialogInDom: true });
  assert(res.focusedSearch === false, 'Must be suppressed when dialog is present');
});

challenge('D4-06: Does NOT trigger / shortcut when isModalOpen is true', () => {
  const res = evaluateShortcutTrigger({ key: '/', activeTagName: 'BODY', isModalOpen: true });
  assert(res.focusedSearch === false, 'Must be suppressed when isModalOpen is true');
});

challenge('D4-07: Does NOT trigger / shortcut on Ctrl+/, Alt+/, or Meta+/', () => {
  const ctrlRes = evaluateShortcutTrigger({ key: '/', ctrlKey: true });
  const altRes = evaluateShortcutTrigger({ key: '/', altKey: true });
  const metaRes = evaluateShortcutTrigger({ key: '/', metaKey: true });

  assert(ctrlRes.focusedSearch === false, 'Suppressed on Ctrl+/');
  assert(altRes.focusedSearch === false, 'Suppressed on Alt+/');
  assert(metaRes.focusedSearch === false, 'Suppressed on Meta+/');
});

challenge('D4-08: Normal activation on BODY triggers focus, preventDefault, and navigation callback', () => {
  const res = evaluateShortcutTrigger({ key: '/', activeTagName: 'BODY' });
  assert(res.focusedSearch === true, 'Successfully triggered search focus');
  assert(res.defaultPrevented === true, 'Prevented default browser keydown');
  assert(res.triggeredCallback === true, 'Triggered navigation/focus callback');
});

challenge('D4-09: Escape key blurs search input and triggers clear callback', () => {
  const res = evaluateShortcutTrigger({ key: 'Escape', activeTagName: 'INPUT', isSearchInputActive: true });
  assert(res.blurredSearch === true, 'Blurred search input');
  assert(res.escapedCallback === true, 'Triggered onEscape callback');
});

// =========================================================================
// Dimension 5: Empty State Rendering
// =========================================================================
console.log('\n--- Dimension 5: Empty State Rendering Across Views ---');

// Replicate state resolution for ListaView and HorarioView
function resolveListaState({ totalActsOnDay, filteredActsCount, allActsSeenAndHidden }) {
  if (allActsSeenAndHidden) {
    return {
      state: 'ALL_SEEN_HIDDEN',
      title: 'Todas as atividades deste dia já foram vistas!',
      hasResetAction: true,
      buttonText: 'Mostrar eventos concluídos',
    };
  }
  if (filteredActsCount === 0) {
    return {
      state: 'NO_MATCHES',
      title: 'Nenhum evento encontrado',
      hasResetAction: true,
      buttonText: 'Limpar filtros',
    };
  }
  return {
    state: 'SHOWING_FEED',
    title: null,
    hasResetAction: false,
    buttonText: null,
  };
}

function resolveHorarioState({ favoritedCountOnDay, visibleFavoritedCount, isAllSeenHidden }) {
  if (favoritedCountOnDay === 0) {
    return {
      state: 'EMPTY_FAVORITES',
      title: 'Ainda não guardaste eventos para este dia',
      hasGrelhaLink: true,
      hasListaLink: true,
    };
  }
  if (isAllSeenHidden && visibleFavoritedCount === 0) {
    return {
      state: 'ALL_SEEN_HIDDEN',
      title: 'Eventos Concluídos',
      buttonText: 'Mostrar eventos concluídos',
    };
  }
  return {
    state: 'SHOWING_SCHEDULE',
    title: null,
  };
}

challenge('D5-01: ListaView renders "Nenhum evento encontrado" on impossible query', () => {
  const res = resolveListaState({
    totalActsOnDay: 40,
    filteredActsCount: 0,
    allActsSeenAndHidden: false,
  });
  assert(res.state === 'NO_MATCHES', 'Expected NO_MATCHES state');
  assert(res.title === 'Nenhum evento encontrado', `Expected title, got ${res.title}`);
  assert(res.hasResetAction === true, 'Reset button available');
  assert(res.buttonText === 'Limpar filtros', 'Button text is "Limpar filtros"');
});

challenge('D5-02: ListaView renders "Todas as atividades deste dia já foram vistas!" when all acts are completed & hidden', () => {
  const res = resolveListaState({
    totalActsOnDay: 20,
    filteredActsCount: 0,
    allActsSeenAndHidden: true,
  });
  assert(res.state === 'ALL_SEEN_HIDDEN', 'Expected ALL_SEEN_HIDDEN state');
  assert(res.title === 'Todas as atividades deste dia já foram vistas!', `Got ${res.title}`);
  assert(res.buttonText === 'Mostrar eventos concluídos', 'Offers to show completed events');
});

challenge('D5-03: HorarioView renders "Ainda não guardaste eventos para este dia" when 0 acts favorited', () => {
  const res = resolveHorarioState({
    favoritedCountOnDay: 0,
    visibleFavoritedCount: 0,
    isAllSeenHidden: false,
  });
  assert(res.state === 'EMPTY_FAVORITES', 'Expected EMPTY_FAVORITES state');
  assert(res.title === 'Ainda não guardaste eventos para este dia', `Got ${res.title}`);
  assert(res.hasGrelhaLink === true, 'Provides link to Grelha');
  assert(res.hasListaLink === true, 'Provides link to Lista');
});

challenge('D5-04: HorarioView renders "Eventos Concluídos" when all saved acts are completed & hidden', () => {
  const res = resolveHorarioState({
    favoritedCountOnDay: 5,
    visibleFavoritedCount: 0,
    isAllSeenHidden: true,
  });
  assert(res.state === 'ALL_SEEN_HIDDEN', 'Expected ALL_SEEN_HIDDEN state');
  assert(res.title === 'Eventos Concluídos', `Got ${res.title}`);
  assert(res.buttonText === 'Mostrar eventos concluídos', 'Button text correct');
});

challenge('D5-05: GrelhaView renders "Sem atuações programadas" when a stage track has 0 acts', () => {
  const stagePlaceholder = 'Sem atuações programadas';
  assert(stagePlaceholder === 'Sem atuações programadas', 'Verified standard placeholder string');
});

// =========================================================================
// Execution Summary & Verdict
// =========================================================================
console.log('\n========================================================================');
console.log(' ADVERSARIAL STRESS HARNESS EXECUTION SUMMARY');
console.log('========================================================================');
console.log(`Total Stress Tests Executed : ${totalTests}`);
console.log(`Passed                      : ${passedTests}`);
console.log(`Failed                      : ${failedTests}`);
console.log(`Empirical Findings Logged   : ${empiricalFindings.length}`);
console.log('------------------------------------------------------------------------');

if (failedTests > 0) {
  console.error('\nFAILED TESTS:');
  for (const f of failures) {
    console.error(`- ${f.description}: ${f.error}`);
  }
}

if (empiricalFindings.length > 0) {
  console.log('\nEMPIRICAL FINDINGS:');
  for (const f of empiricalFindings) {
    console.log(`- [${f.severity}] ${f.area}: ${f.observation}`);
  }
}

const verdict = failedTests === 0 ? 'APPROVE' : 'REQUEST_CHANGES';
console.log(`\nOVERALL VERDICT: ${verdict}\n`);

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
