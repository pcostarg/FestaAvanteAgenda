#!/usr/bin/env node
/**
 * Festa do Avante! 2025 - Official Schedule Scraper & Dataset Generator
 * Target file: scripts/scrape-avante.mjs
 * Runnable via: npm run scrape
 *
 * Scrapes and merges:
 * 1. https://www.festadoavante.pcp.pt/2025/programa (general program & pavilions)
 * 2. https://www.festadoavante.pcp.pt/2025/musica (headline concerts)
 *
 * Resilience:
 * - 8000ms AbortController timeout per request
 * - Full browser User-Agent header
 * - Automatic retries with backoff
 * - Validation gate (>= 150 events, 0 missing required fields, 0 duplicate IDs, positive durations)
 * - Graceful fallback to existing src/data/program.json on network error
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// CLI argument parsing
const args = process.argv.slice(2);
const isStrict = args.includes('--strict');
const isDryRun = args.includes('--dry-run');

const yearArgIdx = args.indexOf('--year');
const YEAR =
  yearArgIdx !== -1 && args[yearArgIdx + 1]
    ? args[yearArgIdx + 1]
    : '2026';

const outArgIdx = args.indexOf('--out');
const OUTPUT_FILE =
  outArgIdx !== -1 && args[outArgIdx + 1]
    ? path.resolve(args[outArgIdx + 1])
    : path.join(ROOT_DIR, 'src', 'data', 'program.json');

const timeoutArgIdx = args.indexOf('--timeout');
const TIMEOUT_MS =
  timeoutArgIdx !== -1 && args[timeoutArgIdx + 1]
    ? parseInt(args[timeoutArgIdx + 1], 10)
    : 8000;

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

const URLS = [
  { name: 'programa', url: `https://www.festadoavante.pcp.pt/${YEAR}/programa` },
  { name: 'musica', url: `https://www.festadoavante.pcp.pt/${YEAR}/musica` },
];

/**
 * Robust fetch with AbortController timeout
 */
async function fetchWithTimeout(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-PT,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    return await res.text();
  } catch (err) {
    clearTimeout(timer);
    if (err && err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw err;
  }
}

/**
 * Fetch with retry mechanism
 */
async function fetchWithRetry(url, maxRetries = 2, timeoutMs = 8000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetchWithTimeout(url, timeoutMs);
    } catch (err) {
      if (attempt === maxRetries) throw err;
      console.warn(`   ⚠️ Attempt ${attempt}/${maxRetries} failed (${err.message}). Retrying in 1s...`);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

/**
 * Parses article cards from festival page HTML.
 */
function parseArticles(html) {
  const articleRegex =
    /<article[\s\S]*?evento_id="([^"]+)"[\s\S]*?data="([^"]+)"[\s\S]*?<a href="([^"]+)"[^>]*>([\s\S]*?)<\/article>/g;
  const items = [];
  let m;

  while ((m = articleRegex.exec(html)) !== null) {
    const id = m[1];
    const data = m[2];
    const link = m[3];
    const inner = m[4];

    const titleMatch = inner.match(/<h2>([\s\S]*?)<\/h2>/);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';

    const horaMatch = inner.match(/<span class="horas">([\s\S]*?)<\/span>/);
    const hora = horaMatch ? horaMatch[1].trim() : '';

    const espacoMatch = inner.match(/<span class="espaco">,?\s*([\s\S]*?)<\/span>/);
    const espaco = espacoMatch ? espacoMatch[1].replace(/^,\s*/, '').trim() : '';

    const maisEspacoMatch = inner.match(/<span class="mais_espaco">,?\s*([\s\S]*?)<\/span>/);
    const maisEspaco = maisEspacoMatch ? maisEspacoMatch[1].replace(/^,\s*/, '').trim() : '';

    const imgMatch = inner.match(/<img[^>]+src="([^"]+)"/);
    const img = imgMatch ? imgMatch[1] : '';

    const tipos = [...inner.matchAll(/<p class="tipo[^"]*">([\s\S]*?)<\/p>/g)].map((t) =>
      t[1].replace(/<[^>]+>/g, '').trim()
    );

    if (id && title) {
      items.push({ id, data, link, title, hora, espaco, maisEspaco, img, tipos });
    }
  }
  return items;
}

/**
 * Normalizes stage and subStage according to festival topology.
 */
function normalizeStage(espaco, maisEspaco, tipos) {
  const s = (espaco || '').trim();

  // 9 primary anchor stages
  if (s === 'Palco 25 de Abril') return { stage: 'Palco 25 de Abril', subStage: undefined };
  if (s === 'Palco Paz') return { stage: 'Palco Paz', subStage: undefined };
  if (s.includes('Auditório 1º') || s.includes('Auditório 1.')) {
    return { stage: 'Auditório 1º de Maio', subStage: undefined };
  }
  if (s === 'Cidade da Juventude') return { stage: 'Cidade da Juventude', subStage: undefined };
  if (s === 'Espaço Central') return { stage: 'Espaço Central', subStage: undefined };
  if (s === 'Avanteatro') return { stage: 'Avanteatro', subStage: undefined };
  if (s === 'CineAvante!' || s === 'CineAvante') return { stage: 'CineAvante', subStage: undefined };
  if (s === 'Espaço Criança') return { stage: 'Espaço Criança', subStage: undefined };
  if (s === 'Espaço Ciência') return { stage: 'Espaço Ciência & Desporto', subStage: 'Ciência' };
  if (s === 'Espaço Desporto') return { stage: 'Espaço Ciência & Desporto', subStage: 'Desporto' };

  // Fallbacks for empty espaco
  if (!s) {
    if (tipos.some((t) => t.toLowerCase().includes('desporto'))) {
      return { stage: 'Espaço Ciência & Desporto', subStage: 'Desporto' };
    }
    if (tipos.some((t) => t.toLowerCase().includes('criança') || t.toLowerCase().includes('infância'))) {
      return { stage: 'Espaço Criança', subStage: undefined };
    }
    return { stage: 'Espaço Central', subStage: undefined };
  }

  // Regional pavilions and other venues
  return { stage: s, subStage: maisEspaco || undefined };
}

/**
 * Maps raw event types and stage to canonical 6 categories.
 */
function mapCategory(tipos, espaco) {
  const tLower = tipos.map((t) => t.toLowerCase());
  const sLower = (espaco || '').toLowerCase();

  // Cinema
  if (tLower.some((t) => t.includes('cinema')) || sLower.includes('cineavante')) {
    return { category: 'Cinema', categoryKey: 'cinema' };
  }
  // Teatro
  if (tLower.some((t) => t.includes('teatro')) || sLower.includes('avanteatro')) {
    return { category: 'Teatro', categoryKey: 'teatro' };
  }
  // Família/Criança
  if (
    tLower.some((t) => t.includes('criança') || t.includes('infância') || t.includes('oficinas')) ||
    sLower.includes('criança')
  ) {
    return { category: 'Família/Criança', categoryKey: 'familia-crianca' };
  }
  // Desporto
  if (tLower.some((t) => t.includes('desporto')) || sLower.includes('desporto')) {
    return { category: 'Desporto', categoryKey: 'desporto' };
  }
  // Debates
  if (
    tLower.some((t) => t.includes('debate') || t.includes('apresentação')) ||
    sLower.includes('central') ||
    sLower.includes('livro')
  ) {
    if (!tLower.some((t) => t.includes('música'))) {
      return { category: 'Debates', categoryKey: 'debates' };
    }
  }
  // Música
  if (
    tLower.some((t) => t.includes('música')) ||
    sLower.includes('palco') ||
    sLower.includes('auditório') ||
    sLower.includes('fado')
  ) {
    return { category: 'Música', categoryKey: 'musica' };
  }

  if (sLower.includes('ciência')) {
    return { category: 'Família/Criança', categoryKey: 'familia-crianca' };
  }

  // Fallback
  return { category: 'Debates', categoryKey: 'debates' };
}

/**
 * Maps festival day, dayLabel, dayCode, and calendar date.
 */
function mapDay(dateStr) {
  const d = (dateStr || '').replace(/\//g, '-').slice(0, 10);
  if (d === '2026-09-04' || d === '2025-09-05') {
    return { day: 'sexta', dayLabel: d.startsWith('2026') ? 'Sexta 4' : 'Sexta 5', dayCode: 'fri', date: d };
  }
  if (d === '2026-09-05' || d === '2025-09-06') {
    return { day: 'sabado', dayLabel: d.startsWith('2026') ? 'Sábado 5' : 'Sábado 6', dayCode: 'sat', date: d };
  }
  if (d === '2026-09-06' || d === '2025-09-07') {
    return { day: 'domingo', dayLabel: d.startsWith('2026') ? 'Domingo 6' : 'Domingo 7', dayCode: 'sun', date: d };
  }
  return { day: 'sexta', dayLabel: 'Sexta 4', dayCode: 'fri', date: d || '2026-09-04' };
}

/**
 * Maps start time to time block and slot.
 */
function mapTimeBlock(hora) {
  const [h] = hora.split(':').map(Number);
  if (h < 6 || h >= 22) return { timeBlock: 'noite-principal', timeSlot: 'noite' };
  if (h < 14) return { timeBlock: 'manha', timeSlot: 'manha' };
  if (h < 19) return { timeBlock: 'tarde', timeSlot: 'tarde' };
  return { timeBlock: 'anoitecer', timeSlot: 'anoitecer' };
}

/**
 * Converts HH:mm time string to continuous festival minutes.
 */
function timeToFestivalMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const adjustedH = h < 6 ? h + 24 : h;
  return adjustedH * 60 + m;
}

/**
 * Converts continuous festival minutes back to HH:mm.
 */
function festivalMinutesToTime(mins) {
  const norm = mins % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Main scraper execution flow
 */
async function run() {
  console.log('='.repeat(65));
  console.log(`  🎪 FESTA DO AVANTE! ${YEAR} — PROGRAM SCRAPER & DATASET PIPELINE`);
  console.log('='.repeat(65));

  const rawArticlesMap = new Map();

  for (const item of URLS) {
    console.log(`\n🌐 Fetching: ${item.url}`);
    try {
      const html = await fetchWithRetry(item.url, 2, TIMEOUT_MS);
      const articles = parseArticles(html);
      console.log(`   ✓ Successfully extracted ${articles.length} events from /${item.name}`);

      for (const art of articles) {
        // Normalize ID (e.g. '1814_0' -> '1814') so programa & musica entries merge cleanly
        const canonicalId = art.id.replace(/_\d+$/, '');
        const normalizedArt = { ...art, id: canonicalId };

        if (!rawArticlesMap.has(canonicalId)) {
          rawArticlesMap.set(canonicalId, normalizedArt);
        } else {
          // Merge metadata for duplicate entries across programa & musica
          const existing = rawArticlesMap.get(canonicalId);
          existing.tipos = Array.from(new Set([...existing.tipos, ...art.tipos]));
          if (!existing.img && art.img) existing.img = art.img;
          if (!existing.maisEspaco && art.maisEspaco) existing.maisEspaco = art.maisEspaco;
          if ((!existing.espaco || existing.espaco === '') && art.espaco) existing.espaco = art.espaco;
          if ((!existing.link || existing.link === '') && art.link) existing.link = art.link;
        }
      }
    } catch (err) {
      console.warn(`   ⚠️ Network failure for ${item.url}: ${err.message}`);
    }
  }

  // --- Resilience Gate: Fallback to existing dataset if network failed ---
  if (rawArticlesMap.size < 150) {
    console.warn(`\n⚠️ Scraped item count (${rawArticlesMap.size}) is below validation threshold (>= 150).`);
    console.warn('   Checking for existing local dataset fallback...');

    if (fs.existsSync(OUTPUT_FILE)) {
      try {
        const localData = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
        const eventCount = Array.isArray(localData) ? localData.length : localData.events?.length || 0;
        if (eventCount >= 150) {
          console.log(`   ✅ Preserving existing verified dataset (${eventCount} events at ${OUTPUT_FILE}).`);
          console.log('   Exiting successfully without corrupting existing program.json.');
          if (isStrict) {
            console.error('   ❌ Exiting with error code 1 due to --strict flag.');
            process.exit(1);
          }
          process.exit(0);
        }
      } catch (readErr) {
        console.warn(`   Could not parse existing local dataset: ${readErr.message}`);
      }
    }

    console.error(`\n❌ Error: Scraper failed to fetch online data and no valid fallback exists at ${OUTPUT_FILE}.`);
    process.exit(1);
  }

  console.log(`\n📊 Merged unique raw events: ${rawArticlesMap.size}`);

  // Group events by day and stage to calculate deterministic end times
  const grouped = {};
  for (const raw of rawArticlesMap.values()) {
    const { stage } = normalizeStage(raw.espaco, raw.maisEspaco, raw.tipos);
    const { day } = mapDay(raw.data);
    const groupKey = `${day}__${stage}`;
    if (!grouped[groupKey]) grouped[groupKey] = [];
    grouped[groupKey].push(raw);
  }

  // Sort each stage group chronologically by festival minutes
  for (const list of Object.values(grouped)) {
    list.sort((a, b) => timeToFestivalMinutes(a.hora) - timeToFestivalMinutes(b.hora));
  }

  // Calculate deterministic end times using strictly-later search loop
  const finalEvents = [];
  for (const list of Object.values(grouped)) {
    for (let i = 0; i < list.length; i++) {
      const raw = list[i];
      const { stage, subStage } = normalizeStage(raw.espaco, raw.maisEspaco, raw.tipos);
      const { day, dayLabel, dayCode, date } = mapDay(raw.data);
      const { category, categoryKey } = mapCategory(raw.tipos, raw.espaco);
      const { timeBlock, timeSlot } = mapTimeBlock(raw.hora);

      const currentMins = timeToFestivalMinutes(raw.hora);
      let nextStartMins = Infinity;
      for (let j = i + 1; j < list.length; j++) {
        const candidateMins = timeToFestivalMinutes(list[j].hora);
        if (candidateMins > currentMins) {
          nextStartMins = candidateMins;
          break;
        }
      }

      const endMins = Math.min(currentMins + 60, nextStartMins);
      const endTime = festivalMinutesToTime(endMins);

      // Main stages headline detection
      const isHeadline =
        (stage === 'Palco 25 de Abril' || stage === 'Auditório 1º de Maio') &&
        (timeBlock === 'anoitecer' || timeBlock === 'noite-principal');

      const fullImageUrl = raw.img
        ? raw.img.startsWith('http')
          ? raw.img
          : `https://www.festadoavante.pcp.pt${raw.img}`
        : undefined;

      const fullUrl = raw.link
        ? raw.link.startsWith('http')
          ? raw.link
          : `https://www.festadoavante.pcp.pt${raw.link}`
        : undefined;

      const description = raw.maisEspaco
        ? `${stage} — ${raw.maisEspaco}`
        : `${stage}`;

      const eventObj = {
        id: raw.id,
        title: raw.title,
        stage,
        day,
        dayLabel,
        dayCode,
        date,
        startTime: raw.hora,
        endTime,
        timeStart: raw.hora, // Test compatibility alias
        timeEnd: endTime,    // Test compatibility alias
        timeBlock,
        timeSlot,
        category,
        categoryKey,
        tags: Array.from(new Set([category, stage, ...(raw.tipos || [])])),
        description,
        highlight: isHeadline,
      };

      if (subStage) eventObj.subStage = subStage;
      if (fullImageUrl) eventObj.imageUrl = fullImageUrl;
      if (fullUrl) eventObj.url = fullUrl;

      finalEvents.push(eventObj);
    }
  }

  // Sort overall dataset chronologically: by date, then festival minutes
  finalEvents.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return timeToFestivalMinutes(a.startTime) - timeToFestivalMinutes(b.startTime);
  });

  // --- Strict Validation Gate ---
  console.log('\n🔍 Running Validation Gate on Extracted Dataset...');
  const seenIds = new Set();
  let errors = 0;

  for (const ev of finalEvents) {
    if (seenIds.has(ev.id)) {
      console.error(`   ❌ Duplicate ID detected: ${ev.id}`);
      errors++;
    }
    seenIds.add(ev.id);

    if (!ev.id || !ev.title || !ev.stage || !ev.day || !ev.date || !ev.startTime || !ev.endTime || !ev.category) {
      console.error(`   ❌ Missing required field on event ${ev.id}`);
      errors++;
    }

    if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(ev.startTime)) {
      console.error(`   ❌ Invalid startTime format on ${ev.id}: ${ev.startTime}`);
      errors++;
    }
    if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(ev.endTime)) {
      console.error(`   ❌ Invalid endTime format on ${ev.id}: ${ev.endTime}`);
      errors++;
    }

    const duration = timeToFestivalMinutes(ev.endTime) - timeToFestivalMinutes(ev.startTime);
    if (duration <= 0) {
      console.error(`   ❌ Non-positive duration on ${ev.id}: start ${ev.startTime} >= end ${ev.endTime}`);
      errors++;
    }
    if (duration > 90) {
      console.error(`   ❌ Unexpected duration (>90m) on ${ev.id}: ${duration}m`);
      errors++;
    }
  }

  if (finalEvents.length < 150) {
    console.error(`   ❌ Dataset event count (${finalEvents.length}) below minimum threshold of 150`);
    errors++;
  }

  if (errors > 0) {
    console.error(`\n❌ Validation failed with ${errors} errors. Aborting disk write.`);
    process.exit(1);
  }

  console.log(`   ✅ Validation passed: ${finalEvents.length} events verified, 0 errors.`);

  // Day breakdown
  const dayBreakdown = {};
  for (const e of finalEvents) {
    dayBreakdown[e.dayLabel] = (dayBreakdown[e.dayLabel] || 0) + 1;
  }
  console.log('\n📅 Events by Festival Day:', dayBreakdown);

  // Category breakdown
  const catBreakdown = {};
  for (const e of finalEvents) {
    catBreakdown[e.category] = (catBreakdown[e.category] || 0) + 1;
  }
  console.log('🏷️ Events by Category:', catBreakdown);

  if (isDryRun) {
    console.log('\n✨ Dry run complete. No files written.');
    return;
  }

  // --- Safe Write to Disk ---
  const outputDir = path.dirname(OUTPUT_FILE);
  fs.mkdirSync(outputDir, { recursive: true });

  const tempFile = `${OUTPUT_FILE}.tmp`;
  const jsonContent = JSON.stringify(finalEvents, null, 2);
  fs.writeFileSync(tempFile, jsonContent, 'utf8');
  fs.renameSync(tempFile, OUTPUT_FILE);

  const stats = fs.statSync(OUTPUT_FILE);
  console.log(`\n🎉 Successfully generated: ${OUTPUT_FILE}`);
  console.log(`   📦 Total Events: ${finalEvents.length}`);
  console.log(`   💾 File Size: ${(stats.size / 1024).toFixed(1)} KB`);
}

run().catch((err) => {
  console.error('\n💥 Fatal scraper failure:', err);
  process.exit(1);
});
