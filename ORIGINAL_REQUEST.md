# Original User Request

## Initial Request — 2026-09-04T11:55:22Z

Build a high-performance, offline-first Progressive Web App (PWA) in Vite + React + TypeScript + Tailwind CSS for the Festa do Avante! 2025 festival schedule, featuring stage timeline grids, chronological lists, personal schedule management with conflict detection, seen-event tracking, QR code & JSON/ICS sharing, and automated GitHub Pages CI/CD deployment.

Working directory: c:\Work\temp\AvanteRouter\FestaAvanteAgenda
Git branch: feat/v1-pwa-implementation
Integrity mode: development

## Requirements

### R1. PWA Setup, Design System & Core Views
- Scaffold a Vite + React + TypeScript + Tailwind CSS application configured with `vite-plugin-pwa` (offline caching, manifest, dark theme `#0B0D0F`, icons).
- Implement the design system strictly faithful to the Google Stitch screens ("Avante Festival Pulse" dark mode):
  - Desktop responsive navigation header + Mobile fixed bottom navigation bar (< 768px).
  - **Grelha de Palcos (`/grelha`)**: Horizontally scrollable timeline matrix across all festival stages (Palco 25 de Abril, Palco Paz, Auditório 1º de Maio, Cidade da Juventude, Espaço Central, Avanteatro, CineAvante, Espaço Criança, Espaço Ciência & Desporto) with continuous time axis (10:00 to 02:00) and real-time "AGORA" indicator.
  - **Lista Cronológica (`/lista`)**: Linear chronological feed grouped into time blocks (Manhã, Tarde, Anoitecer, Noite Principal), with day switcher (Sexta 5, Sábado 6, Domingo 7), category filter chips (Música, Debates, Teatro, Cinema, Família/Criança, Desporto), and real-time search with `/` keyboard shortcut.
  - **O Meu Horário (`/o-meu-horario`)**: Clean linear list of saved events for the selected day.

### R2. User Schedule State, "Já Vi" Tracking & Conflict Detection
- Implement local-first reactive storage in `localStorage` under `avante_schedule_v1` storing `favorites` and `seen` event IDs.
- Include a "Já vi" (✓) action button on event cards that marks an event as seen/completed (dimmed/strikethrough visual feedback) and a toggle filter "Ocultar já vistos".
- Implement automatic conflict detection: when two or more favorited events overlap in time on the same day, display an amber warning banner and highlight the conflicting cards.

### R3. Sharing & Import/Export (QR Code, JSON, ICS)
- **Export Modal**:
  - Render an on-screen QR Code containing the compressed schedule payload or direct import link (`?import=...`).
  - Download `minha-agenda-avante.json`.
  - Download `meu_avante_2025.ics` (RFC 5545 format for Google Calendar / Apple Calendar).
- **Import Modal**:
  - Scan QR codes via device camera (using `html5-qrcode`).
  - Upload an image file containing a QR code.
  - Upload a `.json` backup file.
  - Parse URL query parameter `?import=...` on load.
  - Behavior: Silently and directly replace local schedule data with the imported data.

### R4. Festival Dataset & Scraper
- Provide a rich, verified initial dataset in `src/data/program.json` containing the real 2025 festival schedule across all stages, days, and categories.
- Provide a Node.js scraper script `scripts/scrape-avante.mjs` runnable with `npm run scrape`, designed with error resilience and timeouts to scrape and refresh data from `https://www.festadoavante.pcp.pt/2025/programa`.

### R5. GitHub Actions Deployment Workflow
- Create `.github/workflows/deploy.yml` configuring automated build and deployment to GitHub Pages on pushes to `main` (or workflow dispatch).
- Configure Vite's `base` path correctly for `https://pcostarg.github.io/FestaAvanteAgenda/`.

---

## Acceptance Criteria

### Build & Integrity
- [ ] `npm run build` succeeds without TypeScript compilation errors (`tsc --noEmit`).
- [ ] PWA service worker and web manifest are generated in the `dist` directory.
- [ ] All events in `src/data/program.json` have unique IDs, valid time formats (`HH:mm`), stage names, and categories.

### Functional Verification
- [ ] The app renders all 3 views: Grelha (timeline matrix), Lista (chronological feed), and O Meu Horário.
- [ ] Favoriting events adds them to "O Meu Horário" and persists across page reloads.
- [ ] Marking an event as "Já vi" (✓) dims the card and respects the "Ocultar já vistos" toggle.
- [ ] Overlapping events at the same hour trigger the amber conflict warning banner in "O Meu Horário".
- [ ] Exporting produces valid QR code, `.json`, and `.ics` files.
- [ ] Importing via QR code or JSON file correctly replaces the user schedule.
- [ ] `.github/workflows/deploy.yml` is present, valid YAML, and ready for GitHub Actions.
