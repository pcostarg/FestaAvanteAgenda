# Festa do Avante! 2025 PWA — Test Infrastructure & Methodology Specification (TEST_INFRA.md)

**Document Version**: 1.0.0  
**Date**: 2026-09-04  
**Author**: E2E Test Suite Creator (`test_writer_e2e`)  
**Workspace**: `c:\Work\temp\AvanteRouter\FestaAvanteAgenda`  
**Test Suite Root**: `tests/e2e/`  
**Target Application**: Festa do Avante! 2025 PWA (`AvanteRouter`)

---

## 1. Executive Summary & Testing Philosophy

The **AvanteRouter** is an offline-first, client-only Progressive Web App running on Vite + React + TypeScript + Tailwind CSS, designed for intense outdoor festival conditions (Quinta da Atalaia, Seixal) where mobile cellular connectivity is congested or unavailable.

The testing infrastructure implements an **automated, opaque-box, requirement-driven test suite** based strictly on authoritative specifications:
1. `ORIGINAL_REQUEST.md` (Functional requirements R1–R5, acceptance criteria)
2. `PROJECT.md` (System architecture, code layout, 29-feature inventory, interface contracts)
3. `.agents/spec_miner_survey/spec_report.md` (Design system tokens, midnight crossing rules, schemas, RFC 5545 specifications, edge case inventory)

### 1.1 Core Principles
- **Opaque-Box Requirement Verification**: Tests treat the application as a black box with defined input vectors, observable outputs, behavioral state machines, and contract schemas. Tests verify *what* the system must do per the specification, never internal implementation shortcuts.
- **Progressive Testability & Zero-Dependency Execution**: The test suite runner (`tests/e2e/runner.mjs`) is powered by native Node.js ESM (`node:test`, `node:assert`, `node:fs`, `node:crypto`) requiring zero brittle browser binaries or third-party test runners, allowing instant execution in developer shells, git hooks, and GitHub Actions CI.
- **Self-Contained Isolation**: Every test is atomic and independent, initializing its own isolated state (in-memory DOM, storage, or dataset context) and cleaning up after execution without leaking state.
- **Authoritative Derivation**: Every single expected value is derived directly from the authoritative specifications, mathematical definitions (e.g. interval intersection $\text{start}_A < \text{end}_B \land \text{start}_B < \text{end}_A$, festival midnight normalization), or RFC 5545 format rules.

---

## 2. The 4-Tier Testing Methodology

The test suite is structured into four complementary tiers providing exhaustive verification from individual feature facets up to complete multi-day festival user journeys.

```
┌─────────────────────────────────────────────────────────────┐
│  Tier 4: Real-World Festival End-to-End User Scenarios     │  (5 Multi-day journeys)
├─────────────────────────────────────────────────────────────┤
│  Tier 3: Pairwise Cross-Feature Interactions                │  (25+ Interaction suites)
├─────────────────────────────────────────────────────────────┤
│  Tier 2: Boundary, Corner & Adversarial Edge Cases         │  (>=5 per feature = 145+ tests)
├─────────────────────────────────────────────────────────────┤
│  Tier 1: Feature Behavioral Coverage                       │  (>=5 per feature = 145+ tests)
└─────────────────────────────────────────────────────────────┘
```

### 2.1 Tier 1: Feature Behavioral Coverage
- **Scope**: All 29 features enumerated in `PROJECT.md` Feature Inventory (Features 1 through 29).
- **Quota**: At least **5 distinct behavioral tests per feature** ($\ge 145$ tests total).
- **Focus**: Primary user journeys, happy paths, core input/output contracts, view rendering rules, filtering operations, and state transitions.

### 2.2 Tier 2: Boundary & Corner Cases
- **Scope**: Boundary conditions and extreme inputs for all 29 features.
- **Quota**: At least **5 boundary/corner tests per feature** ($\ge 145$ tests total).
- **Focus**:
  - Festival midnight crossings ($23:30 \to 01:30$, adjusted to $24:00+$ minutes).
  - Coincident timestamps ($start_A = start_B$), adjacent intervals ($end_A = start_B$).
  - Zero-duration and malformed event items.
  - Corrupted base64/URL imports, invalid JSON backup schemas, missing required properties.
  - Device permission denials (e.g. camera denied).
  - Rapid state toggling and storage quota limits.
  - Character escaping (Portuguese diacritics, XML/HTML entities, RFC 5545 newline folding).
  - Network timeouts and 404/500 scraper fallback resilience.

### 2.3 Tier 3: Pairwise Cross-Feature Interactions
- **Scope**: Interaction matrix between interdependent subsystem components.
- **Focus**:
  - `Favorites` + `"Já Vi"` tracking: State independence, card styling inheritance.
  - `Favorites` + `Conflict Detection`: Overlap alerts, conflict resolution matrix actions.
  - `Conflict Detection` + `"Já Vi"`: Conflicting cards that are marked as seen.
  - `"Ocultar Já Vistos"` + `Empty Schedule`: Day views when all favorited events are marked seen.
  - `Export JSON` + `Import JSON`: Full round-trip data fidelity and array normalization.
  - `Export QR/URL` + `URL Parameter Import (?import=...)`: Compression, Base64URL encoding, decoding, silent overwrite.
  - `Export ICS` + `Midnight Events`: RFC 5545 VEVENT generation across midnight boundaries.
  - `Day Switcher` + `Search Query` + `Category Chips` + `Quick Filters`: Combined compound filtering.
  - `Storage Event` + `CustomEvent` synchronization: Multi-tab and cross-view reactive synchronization.
  - `Scraper Pipeline` + `Program Dataset`: Verification that scraped schema satisfies application contract.

### 2.4 Tier 4: Real-World Festival End-to-End Scenarios
- **Scope**: Realistic multi-step user festival journeys combining navigation, scheduling, conflict resolution, offline storage, sharing, and recovery.
- **Scenario Roster**:
  - **Scenario A: "The Friday Night Opening Journey"**: User arrives at Atalaia at 18:00, browses `/lista`, favorites 3 acts across different stages, detects an overlap between Palco 25 de Abril and Palco Paz, resolves conflict via Decision Matrix, attends first act and marks "Já vi" (✓), verifies "O Meu Horário" presentation.
  - **Scenario B: "The Weekend Planner & Group Sharing"**: User builds a multi-day schedule (Saturday and Sunday), exports schedule as QR/URL and JSON backup, friend imports URL on another device, verifies silent direct overwrite and 100% data fidelity.
  - **Scenario C: "Midnight Transition Marathon"**: Saturday night scheduling spanning 22:00 to 02:30 Sunday morning, verifying continuous matrix horizontal scrolling, AGORA needle positioning past midnight, conflict detection across 00:00, and RFC 5545 calendar export with proper date incrementation.
  - **Scenario D: "Offline Atalaia Festival Resilience"**: Simulates complete cellular outage at the venue: verifies cache-first PWA assets, persistent local storage, fully offline QR generation, offline JSON backup/restore.
  - **Scenario E: "Adversarial Input & Recovery"**: Corrupted URL import attempt, malformed JSON file upload, non-existent search query, keyboard `/` shortcut inside and outside form fields, complete schedule reset and restoration.

---

## 3. Authoritative Feature Inventory & Test Allocation Matrix

The 29 features enumerated in `PROJECT.md` are covered across all tiers:

| # | Feature Name | Tier 1 (Behavior) | Tier 2 (Boundary) | Tier 3 (Pairwise) | Tier 4 (Scenario) | Total Tests |
|---|---|:---:|:---:|:---:|:---:|:---:|
| F1 | Dark Mode Canvas | 5 | 5 | 1 | 1 | 12 |
| F2 | Desktop Responsive Header | 5 | 5 | 1 | 1 | 12 |
| F3 | Mobile Fixed Bottom Nav | 5 | 5 | 1 | 1 | 12 |
| F4 | Grelha de Palcos (`/grelha`) | 5 | 5 | 2 | 2 | 14 |
| F5 | Real-time "AGORA" Needle | 5 | 5 | 1 | 2 | 13 |
| F6 | Event Details Inspector Drawer | 5 | 5 | 1 | 1 | 12 |
| F7 | Lista Cronológica (`/lista`) | 5 | 5 | 2 | 2 | 14 |
| F8 | Keyboard Shortcut `/` | 5 | 5 | 1 | 1 | 12 |
| F9 | O Meu Horário (`/o-meu-horario`) | 5 | 5 | 2 | 2 | 14 |
| F10 | `avante_schedule_v1` Local Storage | 5 | 5 | 2 | 2 | 14 |
| F11 | Overlap Conflict Detection | 5 | 5 | 3 | 2 | 15 |
| F12 | Conflict Resolution Decision Matrix | 5 | 5 | 2 | 2 | 14 |
| F13 | "Já Vi" (✓) Event Tracking | 5 | 5 | 2 | 2 | 14 |
| F14 | "Ocultar Já Vistos" Filter | 5 | 5 | 2 | 2 | 14 |
| F15 | Export Modal | 5 | 5 | 1 | 1 | 12 |
| F16 | Export QR Code | 5 | 5 | 2 | 2 | 14 |
| F17 | Export JSON File | 5 | 5 | 2 | 2 | 14 |
| F18 | Export ICS Calendar | 5 | 5 | 2 | 2 | 14 |
| F19 | Import Modal | 5 | 5 | 1 | 1 | 12 |
| F20 | Camera QR Scanner | 5 | 5 | 1 | 1 | 12 |
| F21 | Image File QR Upload | 5 | 5 | 1 | 1 | 12 |
| F22 | JSON File Upload | 5 | 5 | 2 | 2 | 14 |
| F23 | URL Parameter Import (`?import=...`) | 5 | 5 | 2 | 2 | 14 |
| F24 | Silent Direct Overwrite Rule | 5 | 5 | 2 | 2 | 14 |
| F25 | Program Dataset (`program.json`) | 5 | 5 | 1 | 1 | 12 |
| F26 | Scraper Script (`scrape-avante.mjs`) | 5 | 5 | 1 | 1 | 12 |
| F27 | GitHub Pages Deployment Workflow | 5 | 5 | 1 | 1 | 12 |
| F28 | Base Path Configuration | 5 | 5 | 1 | 1 | 12 |
| F29 | Service Worker & Web Manifest | 5 | 5 | 1 | 1 | 12 |
| **TOTAL** | | **145** | **145** | **40+** | **25+** | **355+** |

---

## 4. Test Suite Architecture & Directory Layout

```
tests/e2e/
├── runner.mjs                    # Master test runner (CLI, reporting, filtering, exit codes)
├── lib/
│   ├── test-framework.mjs        # Lightweight async test runner (describe, it, expect)
│   ├── contracts.mjs             # Schemas, tokens, stage list, category list, time utils
│   ├── fixtures.mjs              # Authentic and synthetic festival events for all test cases
│   └── mock-env.mjs              # In-memory browser sandbox (localStorage, window, events)
├── tier1-features/               # Tier 1: Behavioral Feature Coverage (>=5 per feature)
│   ├── f01_f03_shell.mjs         # F1 Canvas, F2 Header, F3 BottomNav
│   ├── f04_f06_grelha.mjs        # F4 Grelha Matrix, F5 Agora Needle, F6 Inspector Drawer
│   ├── f07_f09_views.mjs         # F7 Lista Feed, F8 Search '/', F9 O Meu Horario
│   ├── f10_f14_schedule.mjs      # F10 Storage, F11 Conflicts, F12 Decision Matrix, F13 Ja Vi, F14 Hide Filter
│   ├── f15_f18_export.mjs        # F15 Export Modal, F16 QR, F17 JSON, F18 ICS
│   ├── f19_f24_import.mjs        # F19 Import Modal, F20 Camera, F21 Image, F22 JSON Upload, F23 URL, F24 Overwrite
│   └── f25_f29_platform.mjs      # F25 Dataset, F26 Scraper, F27 Workflow, F28 BasePath, F29 PWA SW/Manifest
├── tier2-boundaries/             # Tier 2: Boundary & Corner Cases (>=5 per feature)
│   ├── b01_b03_shell_edge.mjs    # F1-F3 theme/viewport/contrast boundaries
│   ├── b04_b06_grelha_edge.mjs   # F4-F6 midnight axis, zero duration, bounds
│   ├── b07_b09_views_edge.mjs    # F7-F9 query escaping, empty results, multi-day tabs
│   ├── b10_b14_schedule_edge.mjs # F10-F14 storage corruptions, adjacent/nesting/midnight conflicts
│   ├── b15_b18_export_edge.mjs   # F15-F18 RFC 5545 escaping, huge schedules, filename safety
│   ├── b19_b24_import_edge.mjs   # F19-F24 corrupted base64, truncated payloads, camera permission denial
│   └── b25_b29_platform_edge.mjs # F25-F29 missing files, scraper HTTP 500, deploy steps, SW cache patterns
├── tier3-pairwise/               # Tier 3: Pairwise Interactions
│   ├── schedule_conflicts.mjs    # Favorites + Conflicts + Resolution + Ja Vi
│   ├── export_import_sync.mjs    # JSON/QR export -> import roundtrip with storage sync
│   └── filter_search_nav.mjs     # Search + Categories + Days + Timeblocks + URL params
└── tier4-scenarios/              # Tier 4: Real-World Festival End-to-End Scenarios
    ├── scenario_a_friday.mjs     # Friday night arrival, booking, conflict, resolution, attendance
    ├── scenario_b_sharing.mjs    # Weekend planning, export link, friend import, overwrite
    ├── scenario_c_midnight.mjs   # Late night Saturday marathon crossing 00:00 into Sunday
    ├── scenario_d_offline.mjs    # Full offline venue resilience at Quinta da Atalaia
    └── scenario_e_recovery.mjs   # Corrupted import recovery, search escaping, schedule reset
```

---

## 5. Test Execution Commands & Verification

### 5.1 Running the Test Suite
The entire test suite is executable with Node.js directly:

```bash
# Run full suite (All 4 Tiers)
node tests/e2e/runner.mjs

# Run a specific tier
node tests/e2e/runner.mjs --tier=1
node tests/e2e/runner.mjs --tier=2
node tests/e2e/runner.mjs --tier=3
node tests/e2e/runner.mjs --tier=4

# Run specific feature group or test pattern
node tests/e2e/runner.mjs --filter="F11"
node tests/e2e/runner.mjs --filter="conflict"

# JSON output mode for CI and automated tooling
node tests/e2e/runner.mjs --format=json
```

### 5.2 Pass/Fail Exit Codes
- `0`: All tests passed 100%.
- `1`: One or more tests failed (assertion violation, contract break, or exception).

---

## 6. Expected Output Derivation & Authoritative Formats

### 6.1 Festival Time Normalization Formula
Per `spec_report.md` §7.2:
$$\text{festivalMinutes}(HH:mm) = \begin{cases} (HH + 24) \times 60 + mm & \text{if } HH < 6 \\ HH \times 60 + mm & \text{otherwise} \end{cases}$$

Example Derivations:
- `18:00` $\to 18 \times 60 + 0 = 1080$ mins.
- `23:30` $\to 23 \times 60 + 30 = 1410$ mins.
- `00:30` $\to (0 + 24) \times 60 + 30 = 1470$ mins.
- `01:45` $\to (1 + 24) \times 60 + 45 = 1545$ mins.

### 6.2 Conflict Overlap Rule
Events $A$ and $B$ conflict if and only if:
$$\text{day}_A = \text{day}_B \;\land\; A \ne B \;\land\; \text{start}_A < \text{end}_B \;\land\; \text{start}_B < \text{end}_A$$
- If $\text{end}_A = \text{start}_B$, $\text{start}_B < \text{end}_A$ is False $\to$ **No conflict** (contiguous events).

### 6.3 Local Storage Format (`avante_schedule_v1`)
```json
{
  "favorites": ["ev-1", "ev-2"],
  "seen": ["ev-1"],
  "updatedAt": 1757181600000
}
```

### 6.4 URL Share Payload Format
Payload compressed to minimal JSON:
```json
{"f":["ev-1","ev-2"],"s":["ev-1"]}
```
Encoded via standard Base64URL (no padding `=` characters, `+` $\to `-$, `/` $\to `_`).
URL: `https://pcostarg.github.io/FestaAvanteAgenda/?import=<base64url_string>`

### 6.5 RFC 5545 ICS Format
- Line delimiter: `\r\n` (CRLF).
- Mandatory headers: `BEGIN:VCALENDAR`, `VERSION:2.0`, `PRODID:-//Festa do Avante 2025//AvanteRouter PWA//PT`.
- Mandatory per event: `BEGIN:VEVENT`, `UID:`, `DTSTAMP:`, `DTSTART:`, `DTEND:`, `SUMMARY:`, `LOCATION:`, `END:VEVENT`.
- Ending: `END:VCALENDAR`.

---

## 7. Summary & Handshake with Implementation Milestones

This testing infrastructure guarantees continuous progressive verification across all implementation milestones (M1 through M6). As implementing subagents deliver components, running `node tests/e2e/runner.mjs` provides immediate, non-flaky, deterministic feedback.
