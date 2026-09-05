// tests/adversarial-challenger-m2.mjs
// Adversarial Challenger Test Harness for Milestone 2: Festival Dataset & Scraper Pipeline
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const programPath = path.join(rootDir, 'src', 'data', 'program.json');
const scraperPath = path.join(rootDir, 'scripts', 'scrape-avante.mjs');
const verifierPath = path.join(rootDir, 'scripts', 'verify-program.mjs');
const preloadMockPath = path.join(__dirname, '.tmp-mock-fetch.mjs');

console.log('========================================================================');
console.log(' ADVERSARIAL STRESS HARNESS — MILESTONE 2 (DATASET & SCRAPER RESILIENCE)');
console.log('========================================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

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

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function stripAnsi(str) {
  return (str || '').replace(/\x1b\[[0-9;]*m/g, '');
}

function getFileSha256(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

// Setup reusable mock preload module to avoid Windows 32KB CLI limit
const preloadCode = `
const count = parseInt(process.env.MOCK_EVENT_COUNT || '0', 10);
const duplicate = process.env.MOCK_DUPLICATE_ID === 'true';

if (process.env.MOCK_NETWORK_FAIL === 'true') {
  globalThis.fetch = async () => {
    throw new TypeError('fetch failed');
  };
} else if (process.env.MOCK_HTTP_500 === 'true') {
  globalThis.fetch = async () => ({
    ok: false,
    status: 500,
    statusText: 'Internal Server Error',
  });
} else if (process.env.MOCK_TIMEOUT === 'true') {
  globalThis.fetch = async (url, { signal } = {}) => {
    return new Promise((_, reject) => {
      if (signal) {
        signal.addEventListener('abort', () => reject(new DOMException('Request timed out', 'AbortError')));
      }
    });
  };
} else if (count > 0) {
  const events = [];
  for (let i = 1; i <= count; i++) {
    const id = duplicate && i > 1 ? '1' : String(i);
    events.push(\`
      <article evento_id="\${id}" data="2025-09-05">
        <a href="/2025/programa/detalhes/\${id}">
          <h2>Event \${id}</h2>
          <span class="horas">18:00</span>
          <span class="espaco">Palco 25 de Abril</span>
          <img src="/images/\${id}.jpg" />
          <p class="tipo">Música</p>
        </a>
      </article>
    \`);
  }
  const html = \`<!DOCTYPE html><html><body>\${events.join('\\n')}</body></html>\`;
  globalThis.fetch = async () => ({
    ok: true,
    text: async () => html,
  });
}
`;
fs.writeFileSync(preloadMockPath, preloadCode, 'utf8');

// Ensure original program.json exists
assert(fs.existsSync(programPath), 'src/data/program.json must exist prior to testing');
const baselineHash = getFileSha256(programPath);
const baselineStat = fs.statSync(programPath);
console.log(`Baseline program.json: ${baselineStat.size} bytes | SHA256: ${baselineHash.slice(0, 16)}...\n`);

try {
  // =========================================================================
  // Dimension 1: Offline / Network Failure Resilience & Dataset Preservation
  // =========================================================================
  console.log('--- Dimension 1: Offline / Network Failure Resilience & Dataset Preservation ---');

  challenge('D1.1: Complete network failure (offline) preserves program.json byte-for-byte and exits 0', () => {
    const hashBefore = getFileSha256(programPath);
    const res = spawnSync(
      process.execPath,
      ['--import', `file://${preloadMockPath.replace(/\\/g, '/')}`, scraperPath],
      {
        cwd: rootDir,
        encoding: 'utf8',
        env: { ...process.env, MOCK_NETWORK_FAIL: 'true' },
      }
    );

    assert(res.status === 0, `Expected exit code 0, got ${res.status}. Error: ${res.error?.message}. Output: ${res.stdout} ${res.stderr}`);
    assert(res.stdout.includes('Preserving existing verified dataset'), 'Expected preserving message in output');
    assert(res.stdout.includes('Exiting successfully without corrupting existing program.json'), 'Expected non-corruption confirmation');

    const hashAfter = getFileSha256(programPath);
    assert(hashBefore === hashAfter, 'program.json was modified during network failure fallback!');
  });

  challenge('D1.2: Strict mode (--strict) exits with code 1 on network failure while preserving program.json', () => {
    const hashBefore = getFileSha256(programPath);
    const res = spawnSync(
      process.execPath,
      ['--import', `file://${preloadMockPath.replace(/\\/g, '/')}`, scraperPath, '--strict'],
      {
        cwd: rootDir,
        encoding: 'utf8',
        env: { ...process.env, MOCK_NETWORK_FAIL: 'true' },
      }
    );

    assert(res.status === 1, `Expected exit code 1 with --strict, got ${res.status}`);
    assert(res.stderr.includes('Exiting with error code 1 due to --strict flag'), 'Expected strict error notice in stderr');
    assert(res.stdout.includes('Preserving existing verified dataset'), 'Expected dataset preservation message');

    const hashAfter = getFileSha256(programPath);
    assert(hashBefore === hashAfter, 'program.json was modified during strict failure!');
  });

  challenge('D1.3: HTTP 500 Internal Server Error triggers automatic retries and safe fallback', () => {
    const hashBefore = getFileSha256(programPath);
    const res = spawnSync(
      process.execPath,
      ['--import', `file://${preloadMockPath.replace(/\\/g, '/')}`, scraperPath],
      {
        cwd: rootDir,
        encoding: 'utf8',
        env: { ...process.env, MOCK_HTTP_500: 'true' },
      }
    );

    assert(res.status === 0, `Expected exit code 0, got ${res.status}`);
    assert(res.stderr.includes('Attempt 1/2 failed (HTTP 500 Internal Server Error)'), 'Expected retry warning in output');
    assert(res.stdout.includes('Preserving existing verified dataset'), 'Expected fallback to local dataset');

    const hashAfter = getFileSha256(programPath);
    assert(hashBefore === hashAfter, 'program.json was modified during HTTP 500 fallback!');
  });

  challenge('D1.4: Network timeout (AbortError) triggers safe fallback within bounded timeout window', () => {
    const hashBefore = getFileSha256(programPath);
    const startTime = Date.now();
    const res = spawnSync(
      process.execPath,
      ['--import', `file://${preloadMockPath.replace(/\\/g, '/')}`, scraperPath, '--timeout', '200'],
      {
        cwd: rootDir,
        encoding: 'utf8',
        env: { ...process.env, MOCK_TIMEOUT: 'true' },
      }
    );
    const duration = Date.now() - startTime;

    assert(res.status === 0, `Expected exit code 0, got ${res.status}`);
    assert(duration < 8000, `Execution took too long: ${duration}ms (expected bounded backoff)`);
    assert(res.stderr.includes('timed out'), 'Expected timeout warning');
    assert(res.stdout.includes('Preserving existing verified dataset'), 'Expected fallback preservation');

    const hashAfter = getFileSha256(programPath);
    assert(hashBefore === hashAfter, 'program.json was modified during timeout fallback!');
  });

  challenge('D1.5: Missing local fallback when network is unavailable exits code 1 without crashing unhandled', () => {
    const tempDir = path.join(rootDir, 'tests', '.tmp-challenger-m2');
    fs.mkdirSync(tempDir, { recursive: true });
    const customScraper = path.join(tempDir, 'test-scraper.mjs');

    // Create a copy pointing OUTPUT_FILE to non-existent file
    let code = fs.readFileSync(scraperPath, 'utf8');
    const fakeOutput = path.join(tempDir, 'non-existent-program.json').replace(/\\/g, '/');
    code = code.replace(/const OUTPUT_FILE = .*?;/, `const OUTPUT_FILE = "${fakeOutput}";`);
    fs.writeFileSync(customScraper, code, 'utf8');

    try {
      const res = spawnSync(
        process.execPath,
        ['--import', `file://${preloadMockPath.replace(/\\/g, '/')}`, customScraper],
        {
          cwd: rootDir,
          encoding: 'utf8',
          env: { ...process.env, MOCK_NETWORK_FAIL: 'true' },
        }
      );

      assert(res.status === 1, `Expected exit code 1 when no fallback exists, got ${res.status}`);
      assert(res.stderr.includes('no valid fallback exists'), `Expected no valid fallback error message, got: ${res.stderr}`);
      assert(!fs.existsSync(fakeOutput), 'Fake output should not have been created');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // =========================================================================
  // Dimension 2: Validation Gate Enforcement (< 150 Events & Corrupt Payloads)
  // =========================================================================
  console.log('\n--- Dimension 2: Validation Gate Enforcement (< 150 Events & Corrupt Payloads) ---');

  challenge('D2.1: Scrape returning < 150 items (e.g. 50 events) activates resilience gate and preserves program.json', () => {
    const hashBefore = getFileSha256(programPath);
    const res = spawnSync(
      process.execPath,
      ['--import', `file://${preloadMockPath.replace(/\\/g, '/')}`, scraperPath],
      {
        cwd: rootDir,
        encoding: 'utf8',
        env: { ...process.env, MOCK_EVENT_COUNT: '50' },
      }
    );

    assert(res.status === 0, `Expected exit code 0 with fallback, got ${res.status}. Output: ${res.stdout} ${res.stderr}`);
    assert(res.stderr.includes('Scraped item count (50) is below validation threshold (>= 150)'), 'Expected < 150 threshold warning');
    assert(res.stdout.includes('Preserving existing verified dataset'), 'Expected dataset preservation');

    const hashAfter = getFileSha256(programPath);
    assert(hashBefore === hashAfter, 'program.json was modified when scraped items < 150!');
  });

  challenge('D2.2: Scrape returning 149 items (boundary: exactly N-1) refuses overwrite and preserves dataset', () => {
    const hashBefore = getFileSha256(programPath);
    const res = spawnSync(
      process.execPath,
      ['--import', `file://${preloadMockPath.replace(/\\/g, '/')}`, scraperPath],
      {
        cwd: rootDir,
        encoding: 'utf8',
        env: { ...process.env, MOCK_EVENT_COUNT: '149' },
      }
    );

    assert(res.status === 0, `Expected exit code 0, got ${res.status}. Output: ${res.stdout} ${res.stderr}`);
    assert(res.stderr.includes('Scraped item count (149) is below validation threshold (>= 150)'), 'Expected 149 boundary warning');
    assert(res.stdout.includes('Preserving existing verified dataset'), 'Expected dataset preservation');

    const hashAfter = getFileSha256(programPath);
    assert(hashBefore === hashAfter, 'program.json was modified at boundary 149 items!');
  });

  challenge('D2.3: Scrape returning duplicate event IDs collapses in Map and activates fallback protection', () => {
    const hashBefore = getFileSha256(programPath);
    const res = spawnSync(
      process.execPath,
      ['--import', `file://${preloadMockPath.replace(/\\/g, '/')}`, scraperPath],
      {
        cwd: rootDir,
        encoding: 'utf8',
        env: { ...process.env, MOCK_EVENT_COUNT: '160', MOCK_DUPLICATE_ID: 'true' },
      }
    );

    // Duplicate IDs collapse to a single entry in the Map, triggering count 1 < 150 fallback
    assert(res.status === 0, `Expected code 0 with fallback, got ${res.status}. Output: ${res.stdout} ${res.stderr}`);
    assert(res.stderr.includes('Scraped item count (1) is below validation threshold'), 'Expected map deduplication to collapse duplicate IDs');
    assert(res.stdout.includes('Preserving existing verified dataset'), 'Expected dataset preservation');

    const hashAfter = getFileSha256(programPath);
    assert(hashBefore === hashAfter, 'program.json was modified with duplicate IDs!');
  });

  challenge('D2.4: Atomic write verification: scraper writes via temp file and renameSync', () => {
    const scraperContent = fs.readFileSync(scraperPath, 'utf8');
    assert(scraperContent.includes('.tmp'), 'Scraper missing .tmp temporary file handling');
    assert(scraperContent.includes('renameSync'), 'Scraper missing atomic renameSync');
  });

  // =========================================================================
  // Dimension 3: Full Scraper Pipeline End-to-End Execution
  // =========================================================================
  console.log('\n--- Dimension 3: Full Scraper Pipeline End-to-End Execution ---');

  challenge('D3.1: Scraper dry-run (--dry-run) executes cleanly and parses authentic festival schedule', () => {
    const hashBefore = getFileSha256(programPath);
    const res = spawnSync(process.execPath, [scraperPath, '--dry-run'], { cwd: rootDir, encoding: 'utf8' });

    assert(res.status === 0, `Dry run failed with exit code ${res.status}. Output: ${res.stdout} ${res.stderr}`);
    assert(res.stdout.includes('Dry run complete. No files written.'), 'Expected dry run confirmation');

    const hashAfter = getFileSha256(programPath);
    assert(hashBefore === hashAfter, 'program.json was modified during dry-run!');
  });

  challenge('D3.2: Scraper extracts all 9 primary stages accurately', () => {
    const primaryStages = [
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

    const raw = fs.readFileSync(programPath, 'utf8');
    const dataset = JSON.parse(raw);
    const foundStages = new Set(dataset.map((e) => e.stage));

    for (const s of primaryStages) {
      assert(foundStages.has(s), `Primary stage "${s}" missing from program dataset`);
    }
  });

  challenge('D3.3: Scraper maps canonical 6 categories without unmapped residues', () => {
    const validCategories = new Set([
      'Música',
      'Debates',
      'Teatro',
      'Cinema',
      'Família/Criança',
      'Desporto',
    ]);

    const raw = fs.readFileSync(programPath, 'utf8');
    const dataset = JSON.parse(raw);

    for (const e of dataset) {
      assert(validCategories.has(e.category), `Invalid category "${e.category}" on event ${e.id}`);
    }
  });

  // =========================================================================
  // Dimension 4: Program Dataset Integrity & Schema Compliance
  // =========================================================================
  console.log('\n--- Dimension 4: Program Dataset Integrity & Schema Compliance ---');

  challenge('D4.1: node scripts/verify-program.mjs passes with 100% verification', () => {
    const res = spawnSync(process.execPath, [verifierPath], { cwd: rootDir, encoding: 'utf8' });
    assert(res.status === 0, `verify-program.mjs failed with exit code ${res.status}. Output: ${res.stdout} ${res.stderr}`);
    assert(res.stdout.includes('100% VERIFICATION PASSED'), 'verify-program did not output 100% VERIFICATION PASSED');
    assert(res.stdout.includes('269 EVENTS ARE FULLY VALID'), 'verify-program did not verify 269 events');
  });

  challenge('D4.2: Exact day breakdown matches specification (Sexta 62, Sábado 132, Domingo 75 = 269 total)', () => {
    const raw = fs.readFileSync(programPath, 'utf8');
    const dataset = JSON.parse(raw);

    assert(dataset.length === 269, `Expected 269 total events, got ${dataset.length}`);
    const sexta = dataset.filter((e) => e.day === 'sexta').length;
    const sabado = dataset.filter((e) => e.day === 'sabado').length;
    const domingo = dataset.filter((e) => e.day === 'domingo').length;

    assert(sexta === 62, `Expected 62 sexta events, got ${sexta}`);
    assert(sabado === 132, `Expected 132 sábado events, got ${sabado}`);
    assert(domingo === 75, `Expected 75 domingo events, got ${domingo}`);
  });

  challenge('D4.3: Compatibility aliases are present and synchronized (timeStart, timeEnd, dayCode, timeSlot)', () => {
    const raw = fs.readFileSync(programPath, 'utf8');
    const dataset = JSON.parse(raw);

    for (const e of dataset) {
      assert(e.timeStart === e.startTime, `Event ${e.id}: timeStart "${e.timeStart}" != startTime "${e.startTime}"`);
      assert(e.timeEnd === e.endTime, `Event ${e.id}: timeEnd "${e.timeEnd}" != endTime "${e.endTime}"`);
      const expectedDayCode = e.day === 'sexta' ? 'fri' : e.day === 'sabado' ? 'sat' : 'sun';
      assert(e.dayCode === expectedDayCode, `Event ${e.id}: dayCode "${e.dayCode}" != expected "${expectedDayCode}"`);
      assert(e.timeSlot, `Event ${e.id} missing timeSlot alias`);
    }
  });

  challenge('D4.4: All event start and end times obey positive duration and continuous midnight rollover', () => {
    const raw = fs.readFileSync(programPath, 'utf8');
    const dataset = JSON.parse(raw);

    function toMins(t) {
      const [h, m] = t.split(':').map(Number);
      const adj = h < 6 ? h + 24 : h;
      return adj * 60 + m;
    }

    for (const e of dataset) {
      const startM = toMins(e.startTime);
      const endM = toMins(e.endTime);
      const dur = endM - startM;
      assert(dur > 0, `Event ${e.id} (${e.title}): non-positive duration ${dur}m (${e.startTime} to ${e.endTime})`);
      assert(dur <= 90, `Event ${e.id} (${e.title}): duration ${dur}m exceeds 90m`);
    }
  });

  // =========================================================================
  // Dimension 5: Build & Application Test Suite Integration
  // =========================================================================
  console.log('\n--- Dimension 5: Build & Application Test Suite Integration ---');

  challenge('D5.1: npm run build completes with zero errors (TypeScript + Vite + PWA)', () => {
    const res = spawnSync('npm', ['run', 'build'], { cwd: rootDir, encoding: 'utf8', shell: true });
    assert(res.status === 0, `npm run build failed with code ${res.status}. Output: ${res.stdout} ${res.stderr}`);
    assert(res.stdout.includes('built in'), 'Vite build completion string missing');
  });

  challenge('D5.2: node tests/e2e/runner.mjs runs and passes 100% of E2E tests (320/320)', () => {
    const runnerPath = path.join(rootDir, 'tests', 'e2e', 'runner.mjs');
    const res = spawnSync(process.execPath, [runnerPath], { cwd: rootDir, encoding: 'utf8' });
    const cleanStdout = stripAnsi(res.stdout);
    assert(res.status === 0, `E2E runner failed with code ${res.status}. Output: ${res.stdout} ${res.stderr}`);
    assert(cleanStdout.includes('100% PASS RATE'), 'E2E suite did not report 100% pass rate');
    assert(cleanStdout.includes('Total Tests  : 320'), `E2E suite did not run all 320 tests. Output: ${cleanStdout}`);
    assert(cleanStdout.includes('Passed       : 320'), `E2E suite did not pass 320 tests. Output: ${cleanStdout}`);
  });
} finally {
  // Always clean up temp mock preload module
  if (fs.existsSync(preloadMockPath)) {
    fs.rmSync(preloadMockPath, { force: true });
  }
}

// =========================================================================
// Final Summary
// =========================================================================
console.log('\n========================================================================');
console.log(` TOTAL CHALLENGES: ${totalTests}`);
console.log(` PASSED:           ${passedTests}`);
console.log(` FAILED:           ${failedTests}`);
console.log('========================================================================');

if (failedTests > 0) {
  console.error('\nFAILURES SUMMARY:');
  for (const f of failures) {
    console.error(` - ${f.description}: ${f.error}`);
  }
  process.exit(1);
} else {
  console.log('\n✔ ALL MILESTONE 2 ADVERSARIAL CHALLENGES EMPIRICALLY SATISFIED!');
  process.exit(0);
}
