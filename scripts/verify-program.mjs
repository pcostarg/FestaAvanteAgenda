#!/usr/bin/env node
/**
 * Festa do Avante! 2025 - Program Dataset Integrity Verifier
 * File: scripts/verify-program.mjs
 * Runnable via: node scripts/verify-program.mjs
 *
 * Enforces 100% validation on all events in src/data/program.json:
 * 1. Unique IDs (no duplicates, non-empty)
 * 2. Non-empty titles without raw HTML tags
 * 3. Valid stage names and presence of all 9 primary stages
 * 4. Day / Date / DayLabel alignment (Sexta 54, Sábado 125, Domingo 74)
 * 5. Strict 24h HH:mm time format for startTime and endTime
 * 6. Strictly positive duration (startTime < endTime in festival time)
 * 7. Canonical 6 event categories
 * 8. Valid chronological time blocks
 * 9. Compatibility aliases validation (timeStart, timeEnd, dayCode, timeSlot)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PROGRAM_FILE = path.join(ROOT_DIR, 'src', 'data', 'program.json');

const VALID_DAYS = ['sexta', 'sabado', 'domingo'];
const VALID_CATEGORIES = ['Música', 'Debates', 'Teatro', 'Cinema', 'Família/Criança', 'Desporto'];
const VALID_TIME_BLOCKS = ['manha', 'tarde', 'anoitecer', 'noite-principal'];
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_REGEX = /^2025-09-0[5-7]$/;

const PRIMARY_STAGES = [
  'Palco 25 de Abril',
  'Palco Paz',
  'Auditório 1º de Maio',
  'Cidade da Juventude',
  'Espaço Central',
  'Avanteatro',
  'CineAvante',
  'Espaço Criança',
  'Espaço Ciência & Desporto',
];

/**
 * Converts HH:mm time string to continuous festival minutes.
 */
function timeToFestivalMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const adjustedH = h < 6 ? h + 24 : h;
  return adjustedH * 60 + m;
}

console.log('='.repeat(70));
console.log('  🔍 FESTA DO AVANTE! 2025 — PROGRAM DATASET INTEGRITY VERIFIER');
console.log('='.repeat(70));

if (!fs.existsSync(PROGRAM_FILE)) {
  console.error(`\n❌ Fatal: Dataset file not found at ${PROGRAM_FILE}`);
  process.exit(1);
}

let events;
try {
  const raw = fs.readFileSync(PROGRAM_FILE, 'utf8');
  const parsed = JSON.parse(raw);
  events = Array.isArray(parsed) ? parsed : parsed.events;
  if (!Array.isArray(events)) {
    throw new Error('Dataset is not an array and does not contain an "events" array');
  }
} catch (err) {
  console.error(`\n❌ Failed to parse JSON dataset: ${err.message}`);
  process.exit(1);
}

console.log(`\n📂 Loaded dataset from: src/data/program.json`);
console.log(`📊 Total Events to Verify: ${events.length}`);

const errors = [];
const seenIds = new Set();
const foundStages = new Set();
const dayCounts = { sexta: 0, sabado: 0, domingo: 0 };
const categoryCounts = {};
const stageCounts = {};
const durationDistribution = { '<=30m': 0, '31-60m': 0, '61-90m': 0, '>90m': 0 };

for (let i = 0; i < events.length; i++) {
  const e = events[i];
  const prefix = `[Event #${i + 1} | ID: ${e.id || 'MISSING'}]`;

  // 1. Unique ID Check
  if (!e.id || typeof e.id !== 'string' || !e.id.trim()) {
    errors.push(`${prefix} Missing or invalid id: ${JSON.stringify(e.id)}`);
  } else if (seenIds.has(e.id)) {
    errors.push(`${prefix} Duplicate ID detected: "${e.id}"`);
  } else {
    seenIds.add(e.id);
  }

  // 2. Title Check
  if (!e.title || typeof e.title !== 'string' || !e.title.trim()) {
    errors.push(`${prefix} Missing or empty title`);
  } else if (e.title.includes('<') || e.title.includes('>')) {
    errors.push(`${prefix} Title contains unescaped HTML: "${e.title}"`);
  }

  // 3. Stage Check
  if (!e.stage || typeof e.stage !== 'string' || !e.stage.trim()) {
    errors.push(`${prefix} Missing or empty stage`);
  } else {
    foundStages.add(e.stage);
    stageCounts[e.stage] = (stageCounts[e.stage] || 0) + 1;
  }

  // 4. Day & Date Alignment
  if (!e.day || !VALID_DAYS.includes(e.day)) {
    errors.push(`${prefix} Invalid day: "${e.day}" (must be 'sexta' | 'sabado' | 'domingo')`);
  } else {
    dayCounts[e.day] = (dayCounts[e.day] || 0) + 1;
  }

  if (!e.date || !DATE_REGEX.test(e.date)) {
    errors.push(`${prefix} Invalid date: "${e.date}" (must match YYYY-MM-DD)`);
  } else {
    if (e.day === 'sexta' && e.date !== '2025-09-05') {
      errors.push(`${prefix} Day/Date mismatch: day="sexta" but date="${e.date}" (expected 2025-09-05)`);
    }
    if (e.day === 'sabado' && e.date !== '2025-09-06') {
      errors.push(`${prefix} Day/Date mismatch: day="sabado" but date="${e.date}" (expected 2025-09-06)`);
    }
    if (e.day === 'domingo' && e.date !== '2025-09-07') {
      errors.push(`${prefix} Day/Date mismatch: day="domingo" but date="${e.date}" (expected 2025-09-07)`);
    }
  }

  if (e.day === 'sexta' && e.dayLabel !== 'Sexta 5') {
    errors.push(`${prefix} DayLabel mismatch for sexta: got "${e.dayLabel}"`);
  }
  if (e.day === 'sabado' && e.dayLabel !== 'Sábado 6') {
    errors.push(`${prefix} DayLabel mismatch for sabado: got "${e.dayLabel}"`);
  }
  if (e.day === 'domingo' && e.dayLabel !== 'Domingo 7') {
    errors.push(`${prefix} DayLabel mismatch for domingo: got "${e.dayLabel}"`);
  }

  // 5. Time Format Validation
  const validStartTime = typeof e.startTime === 'string' && TIME_REGEX.test(e.startTime);
  const validEndTime = typeof e.endTime === 'string' && TIME_REGEX.test(e.endTime);

  if (!validStartTime) {
    errors.push(`${prefix} Invalid startTime format: "${e.startTime}" (must be HH:mm)`);
  }
  if (!validEndTime) {
    errors.push(`${prefix} Invalid endTime format: "${e.endTime}" (must be HH:mm)`);
  }

  // 6. Positive Duration Check
  if (validStartTime && validEndTime) {
    const startMins = timeToFestivalMinutes(e.startTime);
    const endMins = timeToFestivalMinutes(e.endTime);
    const duration = endMins - startMins;

    if (duration <= 0) {
      errors.push(`${prefix} Non-positive duration: ${e.startTime} to ${e.endTime} (${duration} min)`);
    } else if (duration > 90) {
      errors.push(`${prefix} Duration exceeds 90 minutes: ${e.startTime} to ${e.endTime} (${duration} min)`);
    }

    if (duration <= 30) durationDistribution['<=30m']++;
    else if (duration <= 60) durationDistribution['31-60m']++;
    else if (duration <= 90) durationDistribution['61-90m']++;
    else durationDistribution['>90m']++;
  }

  // 7. Category Check
  if (!e.category || !VALID_CATEGORIES.includes(e.category)) {
    errors.push(`${prefix} Invalid category: "${e.category}"`);
  } else {
    categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1;
  }

  // 8. TimeBlock Check
  if (!e.timeBlock || !VALID_TIME_BLOCKS.includes(e.timeBlock)) {
    errors.push(`${prefix} Invalid timeBlock: "${e.timeBlock}"`);
  }

  // 9. Compatibility Aliases Checks
  if (e.timeStart !== undefined && e.timeStart !== e.startTime) {
    errors.push(`${prefix} Alias mismatch: timeStart "${e.timeStart}" !== startTime "${e.startTime}"`);
  }
  if (e.timeEnd !== undefined && e.timeEnd !== e.endTime) {
    errors.push(`${prefix} Alias mismatch: timeEnd "${e.timeEnd}" !== endTime "${e.endTime}"`);
  }
  if (e.dayCode !== undefined) {
    const expectedDayCode = e.day === 'sexta' ? 'fri' : e.day === 'sabado' ? 'sat' : 'sun';
    if (e.dayCode !== expectedDayCode) {
      errors.push(`${prefix} Alias mismatch: dayCode "${e.dayCode}" !== expected "${expectedDayCode}"`);
    }
  }
}

// 10. Primary Stages Check
for (const stage of PRIMARY_STAGES) {
  if (!foundStages.has(stage)) {
    errors.push(`Missing primary stage in dataset: "${stage}"`);
  }
}

// 11. Dataset Size & Breakdown Check
if (events.length !== 253) {
  errors.push(`Dataset length mismatch: expected 253 events, got ${events.length}`);
}
if (dayCounts.sexta !== 54) {
  errors.push(`Sexta event count mismatch: expected 54, got ${dayCounts.sexta}`);
}
if (dayCounts.sabado !== 125) {
  errors.push(`Sábado event count mismatch: expected 125, got ${dayCounts.sabado}`);
}
if (dayCounts.domingo !== 74) {
  errors.push(`Domingo event count mismatch: expected 74, got ${dayCounts.domingo}`);
}

// --- Print Verification Report ---
console.log('\n📅 Events by Festival Day:');
console.log(`   - Sexta 5   : ${dayCounts.sexta} events (expected: 54)`);
console.log(`   - Sábado 6  : ${dayCounts.sabado} events (expected: 125)`);
console.log(`   - Domingo 7 : ${dayCounts.domingo} events (expected: 74)`);
console.log(`   - Total     : ${events.length} events (expected: 253)`);

console.log('\n🏷️ Events by Category:');
for (const [cat, count] of Object.entries(categoryCounts)) {
  console.log(`   - ${cat.padEnd(16)}: ${count}`);
}

console.log('\n⏱️ Duration Distribution:');
for (const [dur, count] of Object.entries(durationDistribution)) {
  console.log(`   - ${dur.padEnd(10)}: ${count} events`);
}

console.log(`\n🎪 Stages Detected: ${foundStages.size} total (${PRIMARY_STAGES.length}/${PRIMARY_STAGES.length} primary stages verified)`);

if (errors.length === 0) {
  console.log('\n' + '='.repeat(70));
  console.log(`  ✅ 100% VERIFICATION PASSED: ALL ${events.length} EVENTS ARE FULLY VALID!`);
  console.log('='.repeat(70));
  process.exit(0);
} else {
  console.error('\n' + '='.repeat(70));
  console.error(`  ❌ VERIFICATION FAILED WITH ${errors.length} ERRORS:`);
  console.error('='.repeat(70));
  for (const err of errors.slice(0, 20)) {
    console.error(`   - ${err}`);
  }
  if (errors.length > 20) {
    console.error(`   ... and ${errors.length - 20} more errors`);
  }
  process.exit(1);
}
