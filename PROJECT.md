# Project: AvanteRouter (FestaAvanteAgenda)

High-performance, offline-first Progressive Web App (PWA) in Vite + React + TypeScript + Tailwind CSS for the Festa do Avante! 2025 festival schedule.

---

## Architecture

### System Architecture
- **Client-Only Single Page App (SPA)**: Zero mandatory backend. 100% of scheduling, filtering, search, conflict detection, and import/export executes on client.
- **Offline-First PWA**: Configured via `vite-plugin-pwa` with Workbox cache-first runtime caching of all app assets, fonts, icons, and festival data.
- **Storage Layer**: Local-first persistence in `localStorage` under `avante_schedule_v1` storing `{ favorites: string[], seen: string[], updatedAt: number }`. Custom hook `useSchedule` provides reactive synchronization across views and browser tabs via `CustomEvent` and `storage` events.
- **Festival Dataset**: Verified dataset containing 269 authentic events across all 3 festival days and all 9 stages in `src/data/program.json`.
- **Scraping Pipeline**: Node.js ESM script `scripts/scrape-avante.mjs` runnable via `npm run scrape`, merging `/2025/programa` and `/2025/musica` with timeout resilience and automatic fallback to preserve data.
- **Sharing Protocol**:
  - Export: QR code (compressed JSON or `?import=...` link), `minha-agenda-avante.json`, and RFC 5545 `meu_avante_2025.ics`.
  - Import: Device camera scan via `html5-qrcode`, image file upload, `.json` file upload, and URL query `?import=...`.
  - Rule: Silent and direct overwrite of local schedule state.
- **Hosting & CI/CD**: GitHub Pages at `https://pcostarg.github.io/FestaAvanteAgenda/` with base path `/FestaAvanteAgenda/` automated via `.github/workflows/deploy.yml`.

---

## Code Layout

```
c:\Work\temp\AvanteRouter\FestaAvanteAgenda/
├── .agents/                        # Agent metadata & coordination files only (NO source code)
├── .github/
│   └── workflows/
│       └── deploy.yml              # GitHub Actions CI/CD to GitHub Pages
├── public/
│   ├── favicon.ico
│   ├── favicon.svg
│   ├── apple-touch-icon.png
│   ├── pwa-192x192.png
│   ├── pwa-512x512.png
│   ├── pwa-maskable-512x512.png
│   └── 404.html                    # SPA redirect fallback for GitHub Pages
├── scripts/
│   └── scrape-avante.mjs           # Node.js scraper fetching /programa and /musica
├── src/
│   ├── assets/                     # Static graphics, logo SVGs
│   ├── components/
│   │   ├── common/                 # Header, Footer, BottomNav, Toast, SearchInput
│   │   ├── grelha/                 # TimelineMatrix, StageTrack, AgoraNeedle, EventDrawer
│   │   ├── lista/                  # ChronologicalFeed, DaySwitcher, TimeBlockGroup, FilterChips
│   │   ├── horario/                # PersonalSchedule, ConflictBanner, ConflictCard, EmptySchedule
│   │   └── sharing/                # ExportModal, ImportModal, QrScanner, QrDisplay
│   ├── data/
│   │   └── program.json            # 269 verified festival events
│   ├── hooks/
│   │   ├── useSchedule.ts          # Reactive schedule hook (favorites, seen, conflicts)
│   │   ├── useFestivalTime.ts      # Current festival time & AGORA needle position
│   │   └── useKeyboardShortcut.ts  # Focus search on '/' key
│   ├── types/
│   │   ├── program.ts              # FestivalEvent, FestivalStage, FestivalDay, EventCategory
│   │   └── schedule.ts             # UserScheduleStorage, ConflictInfo
│   ├── utils/
│   │   ├── conflictDetector.ts     # Overlap detection algorithm with midnight normalization
│   │   ├── ics.ts                  # Pure TS RFC 5545 calendar generator
│   │   ├── sharePayload.ts         # Base64/URL compression & decompression
│   │   └── timeUtils.ts            # Festival minutes converter & time block mapper
│   ├── App.tsx                     # Main layout & router integration
│   ├── index.css                   # Tailwind directives & dark mode base
│   └── main.tsx                    # React root entry point
├── index.html                      # HTML5 template with theme-color #0B0D0F & fonts
├── package.json                    # Scripts and dependencies
├── postcss.config.js               # PostCSS config
├── tailwind.config.ts              # Avante Festival Pulse design tokens
├── tsconfig.json                   # TypeScript configuration
├── tsconfig.node.json              # TypeScript Node config
└── vite.config.ts                  # Vite config with vite-plugin-pwa and base path
```

---

## Feature Inventory

Every feature from the Survey phase is enumerated below with its assigned milestone.

| # | Feature | Description | Milestone | Source |
|---|---|---|---|---|
| 1 | Dark Mode Canvas | `#0B0D0F` obsidian canvas with tonal elevation layers (`#111316`, `#16191E`, `#20252D`) | M1 | Stitch design system & `AGENTS.md` |
| 2 | Desktop Responsive Header | Fixed top bar (h-20) with logo, festival dates, route tabs, search, offline status | M1 | Stitch screen prototypes |
| 3 | Mobile Fixed Bottom Nav | Thumb-zone bottom nav (4rem) with 3 main view tabs and safe-area insets | M1 | Stitch screen prototypes & `ORIGINAL_REQUEST.md` |
| 4 | Grelha de Palcos (`/grelha`) | Matrix grid of festival stages (rows) vs continuous time (columns 10h to 02h) | M4 | `ORIGINAL_REQUEST.md` R1 |
| 5 | Real-time "AGORA" Needle | Dynamic vertical red neon indicator line moving across matrix with live clock | M4 | Stitch prototype & `AGENTS.md` |
| 6 | Event Details Inspector Drawer | Drawer/panel revealing detailed description, stage, time, bookmark & reminder actions | M4 | Stitch prototype `183749...` |
| 7 | Lista Cronológica (`/lista`) | Chronological feed segmented by time blocks (Manhã, Tarde, Anoitecer, Noite) | M4 | `ORIGINAL_REQUEST.md` R1 |
| 8 | Keyboard Shortcut `/` | Focuses fast search field instantly when forward slash key is pressed | M4 | Stitch prototype & `ORIGINAL_REQUEST.md` |
| 9 | O Meu Horário (`/o-meu-horario`) | Personal schedule view showing only favorited events for selected day | M4 | `ORIGINAL_REQUEST.md` R1/R2 |
| 10 | `avante_schedule_v1` Local Storage | Reactive persistence of user favorites and seen events in client browser | M3 | `ORIGINAL_REQUEST.md` R2 & `AGENTS.md` |
| 11 | Overlap Conflict Detection | Compares start/end times of saved events on the same day; warns if overlapping | M3 | `ORIGINAL_REQUEST.md` R2 & Stitch `1247a0...` |
| 12 | Conflict Resolution Decision Matrix | Interactive options in banner to keep Option A, keep Option B, or split time | M3 | Stitch prototype `1247a0...` |
| 13 | "Já Vi" (✓) Event Tracking | Mark event as attended/completed; visually dims and strikes through card | M3 | `ORIGINAL_REQUEST.md` R2 & `AGENTS.md` |
| 14 | "Ocultar Já Vistos" Filter | Toggle switch to hide completed events from current view | M3 | `ORIGINAL_REQUEST.md` R2 |
| 15 | Export Modal | Dialog providing QR Code, JSON download, and ICS download | M5 | `ORIGINAL_REQUEST.md` R3 |
| 16 | Export QR Code | Displays scannable QR code on screen containing encoded schedule data / link | M5 | `ORIGINAL_REQUEST.md` R3 |
| 17 | Export JSON File | Generates and downloads `minha-agenda-avante.json` | M5 | `ORIGINAL_REQUEST.md` R3 |
| 18 | Export ICS Calendar | Generates RFC 5545 `.ics` file for Google Calendar, Apple Calendar, Outlook | M5 | `ORIGINAL_REQUEST.md` R3 & `AGENTS.md` |
| 19 | Import Modal | Dialog offering camera scan, image upload, and JSON file upload | M5 | `ORIGINAL_REQUEST.md` R3 |
| 20 | Camera QR Scanner | Real-time camera viewfinder scanning QR codes via `html5-qrcode` | M5 | `ORIGINAL_REQUEST.md` R3 |
| 21 | Image File QR Upload | Decodes QR code from an uploaded picture/screenshot | M5 | `ORIGINAL_REQUEST.md` R3 |
| 22 | JSON File Upload | Parses user-uploaded `.json` backup file | M5 | `ORIGINAL_REQUEST.md` R3 |
| 23 | URL Parameter Import (`?import=...`) | Auto-imports schedule encoded in URL query string on load | M5 | `ORIGINAL_REQUEST.md` R3 |
| 24 | Silent Direct Overwrite Rule | Architectural rule: imported schedule replaces local schedule directly | M5 | `ORIGINAL_REQUEST.md` R3 & `AGENTS.md` |
| 25 | Program Dataset (`program.json`) | Static, comprehensive dataset of real 2025 festival events (269 acts) | M2 | `ORIGINAL_REQUEST.md` R4 |
| 26 | Scraper Script (`scrape-avante.mjs`) | Node.js ESM script to scrape official festival schedule from PCP website | M2 | `ORIGINAL_REQUEST.md` R4 |
| 27 | GitHub Pages Deployment Workflow | Workflow file `.github/workflows/deploy.yml` automating build & deployment | M6 | `ORIGINAL_REQUEST.md` R5 |
| 28 | Base Path Configuration | Vite configured with `base: '/FestaAvanteAgenda/'` | M6 | `ORIGINAL_REQUEST.md` R5 |
| 29 | Service Worker & Web Manifest | Offline cache-first PWA via `vite-plugin-pwa` with dark theme `#0B0D0F` | M1 | `ORIGINAL_REQUEST.md` R1 |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| M1 | PWA Foundation & Design System | Scaffold Vite + React + TS + Tailwind + `vite-plugin-pwa`, design tokens, app shell layout (Header, BottomNav), icons, manifest & SW | None | DONE |
| M2 | Festival Dataset & Scraper Pipeline | `src/types/program.ts`, complete authentic 2025 dataset in `src/data/program.json` (269 events), `scripts/scrape-avante.mjs`, `npm run scrape` | None | DONE |
| M3 | User Schedule State & Conflict Detection Engine | `localStorage` state under `avante_schedule_v1`, `useSchedule` hook, conflict detector algorithm with midnight normalization, "Já vi" state logic | M1, M2 | PLANNED |
| M4 | Core Views & User Interface | Grelha de Palcos (`/grelha`) timeline matrix + AGORA needle, Lista Cronológica (`/lista`) with search (`/`) & filters, O Meu Horário (`/o-meu-horario`) | M1, M2, M3 | PLANNED |
| M5 | Sharing & Import/Export Engine | QR Code generation & camera/image scanning (`html5-qrcode`), JSON export/import, RFC 5545 `.ics` export, URL `?import=...` handler | M1, M2, M3, M4 | PLANNED |
| M6 | CI/CD Deployment & Build Verification | `.github/workflows/deploy.yml`, Vite base path `/FestaAvanteAgenda/`, SPA 404 redirect, PWA service worker build verification (`npm run build`) | M1, M2, M3, M4, M5 | PLANNED |
| M7 | Final E2E Test Suite Pass & Adversarial Hardening | Pass 100% of E2E tests (Tiers 1-4) published by E2E Testing Track, followed by Phase 2 Adversarial Coverage Hardening (Tier 5) and Forensic Audit | M1 through M6, TEST_READY.md | PLANNED |

---

## Interface Contracts

### M1 ↔ M4 (App Shell & Navigation)
- Views: `'grelha' | 'lista' | 'horario'`
- Mobile Bottom Nav: dispatches view change or route navigation to `/grelha`, `/lista`, `/o-meu-horario`.
- Design tokens: Tailwind classes `bg-surface-base`, `bg-surface-card`, `text-brand-crimson-bright`, `border-border-subtle`, `shadow-live-glow`.

### M2 ↔ M3 / M4 / M5 (Festival Dataset)
- Module: `src/data/program.json` exporting `FestivalEvent[]`.
- Type: `FestivalEvent` with fields:
  `{ id: string, title: string, stage: FestivalStage, subStage?: string, day: 'sexta' | 'sabado' | 'domingo', dayLabel: string, date: string, startTime: string, endTime: string, timeBlock: 'manha' | 'tarde' | 'anoitecer' | 'noite-principal', category: EventCategory, tags: string[], description: string, imageUrl?: string, url?: string }`.

### M3 ↔ M4 / M5 (Schedule State Hook)
- Hook: `useSchedule(): UseScheduleReturn`:
  - `favorites: string[]`
  - `seen: string[]`
  - `toggleFavorite(eventId: string): void`
  - `toggleSeen(eventId: string): void`
  - `isFavorite(eventId: string): boolean`
  - `isSeen(eventId: string): boolean`
  - `conflicts: Map<string, ConflictPair[]>`
  - `hasConflict(eventId: string): boolean`
  - `replaceSchedule(data: { favorites: string[], seen: string[] }): void`
  - `clearSchedule(): void`

### M5 ↔ M4 (Export/Import Modals)
- `ExportModalProps`: `{ isOpen: boolean, onClose: () => void, savedEvents: FestivalEvent[] }`
- `ImportModalProps`: `{ isOpen: boolean, onClose: () => void, onImportSuccess: () => void }`
- Shared URL format: `https://pcostarg.github.io/FestaAvanteAgenda/?import=<base64_encoded_payload>`
