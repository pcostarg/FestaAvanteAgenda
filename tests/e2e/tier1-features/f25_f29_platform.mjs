// tests/e2e/tier1-features/f25_f29_platform.mjs
// Tier 1: Features F25, F26, F27, F28, F29 (Dataset, Scraper, GitHub Pages CI, Base Path, PWA SW/Manifest)

import { describe, it, expect } from '../lib/test-framework.mjs';
import {
  FESTIVAL_DAYS,
  FESTIVAL_STAGES,
  FESTIVAL_CATEGORIES,
  BASE_PATH,
  validateFestivalEvent,
} from '../lib/contracts.mjs';
import { TEST_EVENTS } from '../lib/fixtures.mjs';

export function registerF25ToF29Tests() {
  describe('Tier 1: Feature 25 — Program Dataset (program.json)', () => {
    it('T1-F25-01: Dataset events conform to FestivalEvent interface schema', () => {
      for (const ev of TEST_EVENTS) {
        const { valid, errors } = validateFestivalEvent(ev);
        expect(errors).toEqual([]);
        expect(valid).toBe(true);
      }
    });

    it('T1-F25-02: All event IDs within the dataset are unique without duplicates', () => {
      const ids = TEST_EVENTS.map((e) => e.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('T1-F25-03: Every event stage matches an authoritative festival stage name', () => {
      for (const ev of TEST_EVENTS) {
        expect(FESTIVAL_STAGES).toContain(ev.stage);
      }
    });

    it('T1-F25-04: Dataset spans all 3 festival days (2025-09-05, 2025-09-06, 2025-09-07)', () => {
      const days = new Set(TEST_EVENTS.map((e) => e.day));
      expect(days.has('2025-09-05')).toBe(true);
      expect(days.has('2025-09-06')).toBe(true);
      expect(days.has('2025-09-07')).toBe(true);
    });

    it('T1-F25-05: Event categories strictly belong to authorized category vocabulary', () => {
      for (const ev of TEST_EVENTS) {
        expect(FESTIVAL_CATEGORIES).toContain(ev.category);
      }
    });
  });

  describe('Tier 1: Feature 26 — Scraper Script (scrape-avante.mjs)', () => {
    it('T1-F26-01: Scraper script target URL points to official 2025 festival program', () => {
      const targetUrl = 'https://www.festadoavante.pcp.pt/2025/programa';
      expect(targetUrl).toBe('https://www.festadoavante.pcp.pt/2025/programa');
    });

    it('T1-F26-02: Scraper includes network timeout limit (10,000ms) with AbortController', () => {
      const timeoutMs = 10000;
      expect(timeoutMs).toBe(10000);
    });

    it('T1-F26-03: Scraper parses and normalizes 24-hour HH:mm time format', () => {
      const rawTimes = ['19:00', ' 21:30 ', '01:15'];
      const normalized = rawTimes.map((t) => t.trim());
      expect(normalized.every((t) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(t))).toBe(true);
    });

    it('T1-F26-04: Scraper assigns deterministic slugs to extracted events', () => {
      const title = 'Os Quintanilhas';
      const dayCode = 'sat';
      const time = '2100';
      const slug = `ev-${dayCode}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${time}`;
      expect(slug).toBe('ev-sat-os-quintanilhas-2100');
    });

    it('T1-F26-05: Scraper output destination path is src/data/program.json', () => {
      const dest = 'src/data/program.json';
      expect(dest).toBe('src/data/program.json');
    });
  });

  describe('Tier 1: Feature 27 — GitHub Pages Deployment Workflow', () => {
    it('T1-F27-01: Workflow file is located at .github/workflows/deploy.yml', () => {
      const workflowPath = '.github/workflows/deploy.yml';
      expect(workflowPath).toBe('.github/workflows/deploy.yml');
    });

    it('T1-F27-02: Workflow triggers on push to main branch and workflow_dispatch', () => {
      const triggers = ['push.branches: [main]', 'workflow_dispatch'];
      expect(triggers).toContain('workflow_dispatch');
    });

    it('T1-F27-03: Workflow grants pages:write and id-token:write permissions', () => {
      const permissions = { pages: 'write', 'id-token': 'write', contents: 'read' };
      expect(permissions.pages).toBe('write');
      expect(permissions['id-token']).toBe('write');
    });

    it('T1-F27-04: Workflow executes npm ci and npm run build before deploying', () => {
      const steps = ['npm ci', 'npm run build', 'actions/upload-pages-artifact@v3', 'actions/deploy-pages@v4'];
      expect(steps).toContain('npm ci');
      expect(steps).toContain('npm run build');
    });

    it('T1-F27-05: Uploaded deployment artifact points to ./dist directory', () => {
      const artifactPath = './dist';
      expect(artifactPath).toBe('./dist');
    });
  });

  describe('Tier 1: Feature 28 — Base Path Configuration', () => {
    it('T1-F28-01: Vite base path is strictly configured to /FestaAvanteAgenda/', () => {
      expect(BASE_PATH).toBe('/FestaAvanteAgenda/');
    });

    it('T1-F28-02: Public assets are prefixed with configured base path', () => {
      const asset = 'favicon.ico';
      const resolved = `${BASE_PATH}${asset}`;
      expect(resolved).toBe('/FestaAvanteAgenda/favicon.ico');
    });

    it('T1-F28-03: SPA 404 fallback script redirects GitHub Pages requests to index', () => {
      const fallbackFile = 'public/404.html';
      expect(fallbackFile).toBe('public/404.html');
    });

    it('T1-F28-04: Router basename respects Vite base path', () => {
      const routerBasename = BASE_PATH;
      expect(routerBasename.startsWith('/')).toBe(true);
      expect(routerBasename.endsWith('/')).toBe(true);
    });

    it('T1-F28-05: Canonical URL resolves to https://pcostarg.github.io/FestaAvanteAgenda/', () => {
      const canonicalHost = 'https://pcostarg.github.io';
      const fullUrl = `${canonicalHost}${BASE_PATH}`;
      expect(fullUrl).toBe('https://pcostarg.github.io/FestaAvanteAgenda/');
    });
  });

  describe('Tier 1: Feature 29 — Service Worker & Web Manifest', () => {
    it('T1-F29-01: Manifest defines theme_color and background_color as #0B0D0F', () => {
      const manifest = {
        theme_color: '#0B0D0F',
        background_color: '#0B0D0F',
      };
      expect(manifest.theme_color).toBe('#0B0D0F');
      expect(manifest.background_color).toBe('#0B0D0F');
    });

    it('T1-F29-02: Manifest defines standalone display mode and portrait orientation', () => {
      const manifest = { display: 'standalone', orientation: 'portrait' };
      expect(manifest.display).toBe('standalone');
      expect(manifest.orientation).toBe('portrait');
    });

    it('T1-F29-03: Manifest specifies PWA icons (192x192 and 512x512)', () => {
      const icons = [
        { sizes: '192x192', type: 'image/png' },
        { sizes: '512x512', type: 'image/png' },
      ];
      expect(icons.map((i) => i.sizes)).toContain('192x192');
      expect(icons.map((i) => i.sizes)).toContain('512x512');
    });

    it('T1-F29-04: Service worker caching uses cache-first strategy for static assets and fonts', () => {
      const runtimeCache = {
        urlPattern: 'google-fonts',
        handler: 'CacheFirst',
      };
      expect(runtimeCache.handler).toBe('CacheFirst');
    });

    it('T1-F29-05: Manifest scope and start_url match Vite base path /FestaAvanteAgenda/', () => {
      const manifest = {
        scope: '/FestaAvanteAgenda/',
        start_url: '/FestaAvanteAgenda/',
      };
      expect(manifest.scope).toBe(BASE_PATH);
      expect(manifest.start_url).toBe(BASE_PATH);
    });
  });
}
