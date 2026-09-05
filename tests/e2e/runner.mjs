#!/usr/bin/env node
// tests/e2e/runner.mjs
// Master E2E Test Suite Runner for Festa do Avante! 2025 PWA

import { defaultRunner, describe } from './lib/test-framework.mjs';

// Tier 1 Suites
import { registerF01ToF03Tests } from './tier1-features/f01_f03_shell.mjs';
import { registerF04ToF06Tests } from './tier1-features/f04_f06_grelha.mjs';
import { registerF07ToF09Tests } from './tier1-features/f07_f09_views.mjs';
import { registerF10ToF14Tests } from './tier1-features/f10_f14_schedule.mjs';
import { registerF15ToF18Tests } from './tier1-features/f15_f18_export.mjs';
import { registerF19ToF24Tests } from './tier1-features/f19_f24_import.mjs';
import { registerF25ToF29Tests } from './tier1-features/f25_f29_platform.mjs';

// Tier 2 Suites
import { registerB01ToB03Tests } from './tier2-boundaries/b01_b03_shell_edge.mjs';
import { registerB04ToB06Tests } from './tier2-boundaries/b04_b06_grelha_edge.mjs';
import { registerB07ToB09Tests } from './tier2-boundaries/b07_b09_views_edge.mjs';
import { registerB10ToB14Tests } from './tier2-boundaries/b10_b14_schedule_edge.mjs';
import { registerB15ToB18Tests } from './tier2-boundaries/b15_b18_export_edge.mjs';
import { registerB19ToB24Tests } from './tier2-boundaries/b19_b24_import_edge.mjs';
import { registerB25ToB29Tests } from './tier2-boundaries/b25_b29_platform_edge.mjs';

// Tier 3 Suites
import { registerScheduleConflictPairwiseTests } from './tier3-pairwise/schedule_conflicts.mjs';
import { registerExportImportPairwiseTests } from './tier3-pairwise/export_import_sync.mjs';
import { registerFilterSearchNavPairwiseTests } from './tier3-pairwise/filter_search_nav.mjs';

// Tier 4 Suites
import { registerScenarioATests } from './tier4-scenarios/scenario_a_friday.mjs';
import { registerScenarioBTests } from './tier4-scenarios/scenario_b_sharing.mjs';
import { registerScenarioCTests } from './tier4-scenarios/scenario_c_midnight.mjs';
import { registerScenarioDTests } from './tier4-scenarios/scenario_d_offline.mjs';
import { registerScenarioETests } from './tier4-scenarios/scenario_e_recovery.mjs';

// Parse command-line arguments
const args = process.argv.slice(2);
let tierFilter = null;
let nameFilter = null;
let format = 'pretty';
let verbose = false;

for (const arg of args) {
  if (arg.startsWith('--tier=')) {
    tierFilter = parseInt(arg.split('=')[1], 10);
  } else if (arg.startsWith('--filter=')) {
    nameFilter = arg.split('=')[1];
  } else if (arg.startsWith('--format=')) {
    format = arg.split('=')[1];
  } else if (arg === '--verbose' || arg === '-v') {
    verbose = true;
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
Festa do Avante! 2025 PWA — E2E Test Suite Runner
Usage: node tests/e2e/runner.mjs [options]

Options:
  --tier=<1|2|3|4>    Execute only tests belonging to specified tier
  --filter=<string>   Filter tests by substring match on suite or test name
  --format=<pretty|json> Output formatting (default: pretty)
  --verbose, -v       Print all individual passed test names
  --help, -h          Show this help message
    `);
    process.exit(0);
  }
}

// ANSI colors
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';

async function main() {
  if (!tierFilter || tierFilter === 1) {
    describe('--- TIER 1: FEATURE COVERAGE ---', () => {
      registerF01ToF03Tests();
      registerF04ToF06Tests();
      registerF07ToF09Tests();
      registerF10ToF14Tests();
      registerF15ToF18Tests();
      registerF19ToF24Tests();
      registerF25ToF29Tests();
    });
  }

  if (!tierFilter || tierFilter === 2) {
    describe('--- TIER 2: BOUNDARY & CORNER CASES ---', () => {
      registerB01ToB03Tests();
      registerB04ToB06Tests();
      registerB07ToB09Tests();
      registerB10ToB14Tests();
      registerB15ToB18Tests();
      registerB19ToB24Tests();
      registerB25ToB29Tests();
    });
  }

  if (!tierFilter || tierFilter === 3) {
    describe('--- TIER 3: PAIRWISE INTERACTIONS ---', () => {
      registerScheduleConflictPairwiseTests();
      registerExportImportPairwiseTests();
      registerFilterSearchNavPairwiseTests();
    });
  }

  if (!tierFilter || tierFilter === 4) {
    describe('--- TIER 4: REAL-WORLD SCENARIOS ---', () => {
      registerScenarioATests();
      registerScenarioBTests();
      registerScenarioCTests();
      registerScenarioDTests();
      registerScenarioETests();
    });
  }

  if (format !== 'json') {
    console.log(`\n${BOLD}${CYAN}========================================================================${RESET}`);
    console.log(`${BOLD}${CYAN} FESTA DO AVANTE! 2025 PWA — E2E TEST SUITE RUNNER${RESET}`);
    console.log(`${BOLD}${CYAN}========================================================================${RESET}`);
    console.log(`${DIM}Mode: Opaque-box requirement verification | Target: All 29 features${RESET}`);
    if (tierFilter) console.log(`${YELLOW}Filter: Tier ${tierFilter} only${RESET}`);
    if (nameFilter) console.log(`${YELLOW}Filter: "${nameFilter}"${RESET}\n`);
  }

  const { stats, results } = await defaultRunner.run(nameFilter);

  if (format === 'json') {
    console.log(JSON.stringify({ stats, results }, null, 2));
    process.exit(stats.failed > 0 ? 1 : 0);
  }

  // Print results
  let currentSuite = '';
  for (const r of results) {
    if (r.suite !== currentSuite) {
      currentSuite = r.suite;
      if (verbose || r.status === 'FAILED') {
        console.log(`\n${BOLD}${currentSuite}${RESET}`);
      }
    }
    if (r.status === 'PASSED' && verbose) {
      console.log(`  ${GREEN}✔${RESET} ${r.name} ${DIM}(${r.duration}ms)${RESET}`);
    } else if (r.status === 'FAILED') {
      console.log(`  ${RED}✖${RESET} ${BOLD}${r.name}${RESET} ${DIM}(${r.duration}ms)${RESET}`);
      console.log(`    ${RED}${r.error}${RESET}`);
      if (r.stack) {
        console.log(`    ${DIM}${r.stack.split('\n').slice(1, 4).join('\n    ')}${RESET}`);
      }
    }
  }

  console.log(`\n${BOLD}------------------------------------------------------------------------${RESET}`);
  console.log(`${BOLD}SUMMARY REPORT${RESET}`);
  console.log(`------------------------------------------------------------------------`);
  console.log(`  Total Tests  : ${BOLD}${stats.total}${RESET}`);
  console.log(`  Passed       : ${GREEN}${BOLD}${stats.passed}${RESET}`);
  console.log(`  Failed       : ${stats.failed > 0 ? RED + BOLD + stats.failed + RESET : '0'}`);
  console.log(`  Skipped      : ${stats.skipped}`);
  console.log(`  Duration     : ${stats.durationMs} ms`);
  console.log(`------------------------------------------------------------------------`);

  if (stats.failed === 0) {
    console.log(`${GREEN}${BOLD}✔ ALL TESTS PASSED SUCCESSFULLY! (100% PASS RATE)${RESET}\n`);
    process.exit(0);
  } else {
    console.log(`${RED}${BOLD}✖ TEST SUITE FAILED WITH ${stats.failed} FAILURES${RESET}\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unexpected runner exception:', err);
  process.exit(1);
});
