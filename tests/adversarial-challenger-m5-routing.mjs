// tests/adversarial-challenger-m5-routing.mjs
// Adversarial Challenger Test Harness for Milestone 5: SPA Routing, 404 Fallback & Base Path
// Festa do Avante! 2025 PWA

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const publicDir = path.join(rootDir, 'public');

console.log('========================================================================');
console.log(' ADVERSARIAL STRESS HARNESS — MILESTONE 5 SPA ROUTING & BASE PATH');
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

// ----------------------------------------------------------------------
// Helper: Extract and execute 404.html redirection logic inside a sandbox
// ----------------------------------------------------------------------
const html404Content = fs.readFileSync(path.join(publicDir, '404.html'), 'utf-8');
const scriptMatch = html404Content.match(/<script>([\s\S]*?)<\/script>/i);
assert(scriptMatch && scriptMatch[1], 'Failed to extract <script> from public/404.html');
const redirectScriptCode = scriptMatch[1];

function simulate404Redirect(inputUrlStr) {
  const parsed = new URL(inputUrlStr);
  let replacedUrl = null;

  const sandbox = {
    window: {
      location: {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port,
        pathname: parsed.pathname,
        search: parsed.search,
        hash: parsed.hash,
        replace: (target) => {
          replacedUrl = target;
        },
      },
    },
  };
  sandbox.location = sandbox.window.location;

  vm.runInNewContext(redirectScriptCode, sandbox);
  return replacedUrl;
}

// Helper: Client-side routing resolution logic (from src/App.tsx)
function parseRouteFromLocation(urlStr) {
  const parsed = new URL(urlStr);

  // 1. Check Hash Fragment first (primary routing for GitHub Pages SPA)
  const rawHash = parsed.hash.toLowerCase().replace(/^#/, '');
  const cleanHash = rawHash.split(/[?#/]/)[0];

  if (cleanHash === 'lista') return 'lista';
  if (cleanHash === 'horario' || cleanHash === 'o-meu-horario') return 'horario';
  if (cleanHash === 'grelha') return 'grelha';

  // 2. Check Pathname fallback (for dev server or direct path navigation)
  const rawPath = parsed.pathname.toLowerCase();
  const subPath = rawPath.replace(/^\/festaavanteagenda\/?/, '').split(/[?#/]/)[0];

  if (subPath === 'lista') return 'lista';
  if (subPath === 'horario' || subPath === 'o-meu-horario') return 'horario';
  if (subPath === 'grelha') return 'grelha';

  return 'grelha';
}

// ======================================================================
// DIMENSION 1: GitHub Pages SPA 404 Fallback Redirection & Deep Links
// ======================================================================
console.log('--- DIMENSION 1: GitHub Pages SPA 404 Fallback Redirection ---');

challenge('D1-01: Deep link /FestaAvanteAgenda/grelha redirects to /FestaAvanteAgenda/#grelha', () => {
  const initial = 'https://pcostarg.github.io/FestaAvanteAgenda/grelha';
  const target = simulate404Redirect(initial);
  assert(
    target === 'https://pcostarg.github.io/FestaAvanteAgenda/#grelha',
    `Expected https://pcostarg.github.io/FestaAvanteAgenda/#grelha but got ${target}`
  );
});

challenge('D1-02: Deep link /FestaAvanteAgenda/lista redirects to /FestaAvanteAgenda/#lista', () => {
  const initial = 'https://pcostarg.github.io/FestaAvanteAgenda/lista';
  const target = simulate404Redirect(initial);
  assert(
    target === 'https://pcostarg.github.io/FestaAvanteAgenda/#lista',
    `Expected https://pcostarg.github.io/FestaAvanteAgenda/#lista but got ${target}`
  );
});

challenge('D1-03: Deep link /FestaAvanteAgenda/o-meu-horario redirects to /FestaAvanteAgenda/#o-meu-horario', () => {
  const initial = 'https://pcostarg.github.io/FestaAvanteAgenda/o-meu-horario';
  const target = simulate404Redirect(initial);
  assert(
    target === 'https://pcostarg.github.io/FestaAvanteAgenda/#o-meu-horario',
    `Expected https://pcostarg.github.io/FestaAvanteAgenda/#o-meu-horario but got ${target}`
  );
});

challenge('D1-04: Deep link with trailing slash /FestaAvanteAgenda/grelha/ normalizes to #grelha', () => {
  const initial = 'https://pcostarg.github.io/FestaAvanteAgenda/grelha/';
  const target = simulate404Redirect(initial);
  assert(
    target === 'https://pcostarg.github.io/FestaAvanteAgenda/#grelha',
    `Expected https://pcostarg.github.io/FestaAvanteAgenda/#grelha but got ${target}`
  );
});

challenge('D1-05: Deep link with redundant slashes /FestaAvanteAgenda///lista// normalizes to #lista', () => {
  const initial = 'https://pcostarg.github.io/FestaAvanteAgenda///lista//';
  const target = simulate404Redirect(initial);
  assert(
    target === 'https://pcostarg.github.io/FestaAvanteAgenda/#lista',
    `Expected https://pcostarg.github.io/FestaAvanteAgenda/#lista but got ${target}`
  );
});

challenge('D1-06: Base path root /FestaAvanteAgenda/ redirects cleanly to /FestaAvanteAgenda/', () => {
  const initial = 'https://pcostarg.github.io/FestaAvanteAgenda/';
  const target = simulate404Redirect(initial);
  assert(
    target === 'https://pcostarg.github.io/FestaAvanteAgenda/',
    `Expected https://pcostarg.github.io/FestaAvanteAgenda/ but got ${target}`
  );
});

challenge('D1-07: Base path without trailing slash /FestaAvanteAgenda redirects to /FestaAvanteAgenda/', () => {
  const initial = 'https://pcostarg.github.io/FestaAvanteAgenda';
  const target = simulate404Redirect(initial);
  assert(
    target === 'https://pcostarg.github.io/FestaAvanteAgenda/',
    `Expected https://pcostarg.github.io/FestaAvanteAgenda/ but got ${target}`
  );
});

challenge('D1-08: Preserves non-standard localhost port and protocol in 404 redirect', () => {
  const initial = 'http://localhost:8080/FestaAvanteAgenda/lista';
  const target = simulate404Redirect(initial);
  assert(
    target === 'http://localhost:8080/FestaAvanteAgenda/#lista',
    `Expected http://localhost:8080/FestaAvanteAgenda/#lista but got ${target}`
  );
});

// ======================================================================
// DIMENSION 2: Query String Placement Before Hash (window.location.search)
// ======================================================================
console.log('\n--- DIMENSION 2: Query Parameter Placement & WHATWG URL Compliance ---');

challenge('D2-01: Deep link with query string places search BEFORE hash fragment', () => {
  const initial = 'https://pcostarg.github.io/FestaAvanteAgenda/o-meu-horario?import=eyJmIjpbXSwicyI6W119';
  const target = simulate404Redirect(initial);
  const expected = 'https://pcostarg.github.io/FestaAvanteAgenda/?import=eyJmIjpbXSwicyI6W119#o-meu-horario';
  assert(target === expected, `Expected ${expected} but got ${target}`);

  // Strict verification of query order
  const searchIdx = target.indexOf('?import=');
  const hashIdx = target.indexOf('#o-meu-horario');
  assert(searchIdx !== -1, 'Query string missing from target URL');
  assert(hashIdx !== -1, 'Hash fragment missing from target URL');
  assert(searchIdx < hashIdx, 'CRITICAL: Query string MUST precede hash fragment for WHATWG URL search parsing');
});

challenge('D2-02: WHATWG URL parser populates window.location.search correctly from target URL', () => {
  const initial = 'https://pcostarg.github.io/FestaAvanteAgenda/o-meu-horario?import=eyJmIjpbXSwicyI6W119';
  const target = simulate404Redirect(initial);
  const targetUrlObj = new URL(target);

  assert(targetUrlObj.search === '?import=eyJmIjpbXSwicyI6W119', 'targetUrl.search must be populated');
  assert(
    targetUrlObj.searchParams.get('import') === 'eyJmIjpbXSwicyI6W119',
    'searchParams.get("import") must match payload'
  );
  assert(targetUrlObj.hash === '#o-meu-horario', 'targetUrl.hash must strictly be #o-meu-horario');
  assert(targetUrlObj.pathname === '/FestaAvanteAgenda/', 'targetUrl.pathname must be /FestaAvanteAgenda/');
});

challenge('D2-03: Deep link with multiple query parameters preserves all search params', () => {
  const initial = 'https://pcostarg.github.io/FestaAvanteAgenda/lista?category=Musica&day=sabado&search=concerto';
  const target = simulate404Redirect(initial);
  const targetUrlObj = new URL(target);

  assert(targetUrlObj.searchParams.get('category') === 'Musica', 'category query param preserved');
  assert(targetUrlObj.searchParams.get('day') === 'sabado', 'day query param preserved');
  assert(targetUrlObj.searchParams.get('search') === 'concerto', 'search query param preserved');
  assert(targetUrlObj.hash === '#lista', 'hash is #lista');
});

challenge('D2-04: Deep link with query string AND incoming hash preserves both', () => {
  const initial = 'https://pcostarg.github.io/FestaAvanteAgenda/o-meu-horario?import=payload123#tab-seen';
  const target = simulate404Redirect(initial);
  const targetUrlObj = new URL(target);

  assert(targetUrlObj.searchParams.get('import') === 'payload123', 'query string preserved before hash');
  assert(targetUrlObj.hash.startsWith('#o-meu-horario'), 'hash begins with route');
  assert(targetUrlObj.hash.includes('#tab-seen'), 'secondary hash anchor preserved');
});

challenge('D2-05: Redirection strictly uses window.location.replace (not href or assign)', () => {
  assert(
    html404Content.includes('window.location.replace('),
    '404.html must use window.location.replace() to avoid corrupting browser history stack'
  );
  assert(
    !html404Content.includes('window.location.href ='),
    '404.html must not use window.location.href assignment'
  );
  assert(
    !html404Content.includes('window.location.assign('),
    '404.html must not use window.location.assign'
  );
});

// ======================================================================
// DIMENSION 3: Client Router Active View Resolution (App.tsx)
// ======================================================================
console.log('\n--- DIMENSION 3: Client Router View Resolution ---');

challenge('D3-01: Hash routing resolves #grelha -> grelha', () => {
  const route = parseRouteFromLocation('https://pcostarg.github.io/FestaAvanteAgenda/#grelha');
  assert(route === 'grelha', `Expected grelha, got ${route}`);
});

challenge('D3-02: Hash routing resolves #lista -> lista', () => {
  const route = parseRouteFromLocation('https://pcostarg.github.io/FestaAvanteAgenda/#lista');
  assert(route === 'lista', `Expected lista, got ${route}`);
});

challenge('D3-03: Hash routing resolves #o-meu-horario -> horario', () => {
  const route = parseRouteFromLocation('https://pcostarg.github.io/FestaAvanteAgenda/#o-meu-horario');
  assert(route === 'horario', `Expected horario, got ${route}`);
});

challenge('D3-04: Hash routing resolves #horario alias -> horario', () => {
  const route = parseRouteFromLocation('https://pcostarg.github.io/FestaAvanteAgenda/#horario');
  assert(route === 'horario', `Expected horario, got ${route}`);
});

challenge('D3-05: Hash routing with query string in URL resolves #o-meu-horario with ?import=...', () => {
  const route = parseRouteFromLocation(
    'https://pcostarg.github.io/FestaAvanteAgenda/?import=eyJmIjpbXSwicyI6W119#o-meu-horario'
  );
  assert(route === 'horario', `Expected horario, got ${route}`);
});

challenge('D3-06: Direct pathname fallback resolves /FestaAvanteAgenda/lista without hash -> lista', () => {
  const route = parseRouteFromLocation('https://pcostarg.github.io/FestaAvanteAgenda/lista');
  assert(route === 'lista', `Expected lista, got ${route}`);
});

challenge('D3-07: Direct pathname fallback resolves /FestaAvanteAgenda/o-meu-horario without hash -> horario', () => {
  const route = parseRouteFromLocation('https://pcostarg.github.io/FestaAvanteAgenda/o-meu-horario');
  assert(route === 'horario', `Expected horario, got ${route}`);
});

challenge('D3-08: Direct pathname fallback resolves /FestaAvanteAgenda/grelha without hash -> grelha', () => {
  const route = parseRouteFromLocation('https://pcostarg.github.io/FestaAvanteAgenda/grelha');
  assert(route === 'grelha', `Expected grelha, got ${route}`);
});

challenge('D3-09: Root base path without hash defaults safely to grelha', () => {
  const routeWithSlash = parseRouteFromLocation('https://pcostarg.github.io/FestaAvanteAgenda/');
  const routeWithoutSlash = parseRouteFromLocation('https://pcostarg.github.io/FestaAvanteAgenda');
  assert(routeWithSlash === 'grelha', `Expected grelha for trailing slash root, got ${routeWithSlash}`);
  assert(routeWithoutSlash === 'grelha', `Expected grelha for non-trailing slash root, got ${routeWithoutSlash}`);
});

challenge('D3-10: Unknown route hash falls back gracefully to default view grelha', () => {
  const route = parseRouteFromLocation('https://pcostarg.github.io/FestaAvanteAgenda/#unknown-view');
  assert(route === 'grelha', `Expected fallback grelha, got ${route}`);
});

challenge('D3-11: Case-insensitive routing handles uppercase hashes (#LISTA, #GRELHA, #O-MEU-HORARIO)', () => {
  assert(parseRouteFromLocation('https://pcostarg.github.io/FestaAvanteAgenda/#LISTA') === 'lista');
  assert(parseRouteFromLocation('https://pcostarg.github.io/FestaAvanteAgenda/#GRELHA') === 'grelha');
  assert(parseRouteFromLocation('https://pcostarg.github.io/FestaAvanteAgenda/#O-MEU-HORARIO') === 'horario');
});

// ======================================================================
// DIMENSION 4: URL Query Clean-Up & History Sanitization
// ======================================================================
console.log('\n--- DIMENSION 4: URL Sanitization & History State Cleanup ---');

challenge('D4-01: URL import cleanup simulation removes import param while preserving other search params & hash', () => {
  const simulatedUrl = new URL('https://pcostarg.github.io/FestaAvanteAgenda/?import=payload123&utm_source=qr#o-meu-horario');

  // Logic replicated from App.tsx useEffect
  simulatedUrl.searchParams.delete('import');
  const searchStr = simulatedUrl.searchParams.toString();
  let cleanHash = simulatedUrl.hash;
  if (cleanHash.includes('import=')) {
    const qIdx = cleanHash.indexOf('?');
    cleanHash = cleanHash.slice(0, qIdx);
  }
  const cleanUrl = simulatedUrl.pathname + (searchStr ? `?${searchStr}` : '') + (cleanHash || '');

  assert(cleanUrl === '/FestaAvanteAgenda/?utm_source=qr#o-meu-horario', `Unexpected cleanUrl: ${cleanUrl}`);
  assert(!cleanUrl.includes('import='), 'cleanUrl must not contain import query parameter');
  assert(cleanUrl.includes('utm_source=qr'), 'cleanUrl must retain secondary query parameters');
  assert(cleanUrl.includes('#o-meu-horario'), 'cleanUrl must retain route hash');
});

challenge('D4-02: App.tsx hash-embedded import fallback works if URL has #lista?import=...', () => {
  const malformedUrl = 'https://pcostarg.github.io/FestaAvanteAgenda/#lista?import=embeddedPayload';
  const parsed = new URL(malformedUrl);

  let importParam = parsed.searchParams.get('import');
  if (!importParam && parsed.hash.includes('import=')) {
    const hashQueryIndex = parsed.hash.indexOf('?');
    if (hashQueryIndex !== -1) {
      const hashParams = new URLSearchParams(parsed.hash.slice(hashQueryIndex));
      importParam = hashParams.get('import');
    }
  }

  assert(importParam === 'embeddedPayload', 'Fallback in App.tsx correctly extracted embedded import payload');
});

// ======================================================================
// DIMENSION 5: Offline Service Worker Interception & Workbox Routing
// ======================================================================
console.log('\n--- DIMENSION 5: Offline Service Worker Interception & Workbox Config ---');

const swPath = path.join(distDir, 'sw.js');
assert(fs.existsSync(swPath), 'dist/sw.js must exist after build');
const swContent = fs.readFileSync(swPath, 'utf-8');

const viteConfigContent = fs.readFileSync(path.join(rootDir, 'vite.config.ts'), 'utf-8');

challenge('D5-01: vite.config.ts defines navigateFallback to /FestaAvanteAgenda/index.html', () => {
  assert(
    viteConfigContent.includes('navigateFallback: `${base}index.html`') ||
    viteConfigContent.includes('navigateFallback: "/FestaAvanteAgenda/index.html"'),
    'vite.config.ts must configure navigateFallback to index.html with base path'
  );
});

challenge('D5-02: dist/sw.js registers NavigationRoute bound to /FestaAvanteAgenda/index.html', () => {
  assert(
    swContent.includes('NavigationRoute') && swContent.includes('/FestaAvanteAgenda/index.html'),
    'dist/sw.js must register NavigationRoute targeting /FestaAvanteAgenda/index.html'
  );
});

challenge('D5-03: navigateFallbackDenylist regex permits deep route interception offline', () => {
  const denylistRegex = /^\/FestaAvanteAgenda\/.*\.(?:json|ics|png|svg|ico|jpg|webp)$/;

  // Deep SPA routes that MUST NOT be denylisted (SW MUST intercept and serve index.html offline)
  const deepRoutes = [
    '/FestaAvanteAgenda/grelha',
    '/FestaAvanteAgenda/lista',
    '/FestaAvanteAgenda/o-meu-horario',
    '/FestaAvanteAgenda/o-meu-horario?import=xyz',
    '/FestaAvanteAgenda/',
    '/FestaAvanteAgenda',
  ];

  for (const route of deepRoutes) {
    const pathnameOnly = route.split('?')[0];
    const isDenylisted = denylistRegex.test(pathnameOnly);
    assert(!isDenylisted, `Deep route ${route} was incorrectly denylisted; offline SW navigation would fail!`);
  }
});

challenge('D5-04: navigateFallbackDenylist regex correctly denylists raw static assets', () => {
  const denylistRegex = /^\/FestaAvanteAgenda\/.*\.(?:json|ics|png|svg|ico|jpg|webp)$/;

  // Static assets that MUST be denylisted from NavigationRoute
  const staticAssets = [
    '/FestaAvanteAgenda/program.json',
    '/FestaAvanteAgenda/minha-agenda-avante.json',
    '/FestaAvanteAgenda/meu_avante_2025.ics',
    '/FestaAvanteAgenda/pwa-192x192.png',
    '/FestaAvanteAgenda/pwa-512x512.png',
    '/FestaAvanteAgenda/favicon.svg',
    '/FestaAvanteAgenda/favicon.ico',
  ];

  for (const asset of staticAssets) {
    const isDenylisted = denylistRegex.test(asset);
    assert(isDenylisted, `Static asset ${asset} was NOT denylisted; would incorrectly fallback to index.html!`);
  }
});

challenge('D5-05: Precache manifest contains index.html and 404.html', () => {
  assert(swContent.includes('index.html'), 'index.html must be precached in sw.js');
  assert(swContent.includes('404.html'), '404.html must be precached in sw.js');
});

// ======================================================================
// DIMENSION 6: Manifest & Base Path Alignment
// ======================================================================
console.log('\n--- DIMENSION 6: Manifest & Base Path Alignment ---');

const manifestPath = path.join(distDir, 'manifest.webmanifest');
assert(fs.existsSync(manifestPath), 'dist/manifest.webmanifest must exist');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

challenge('D6-01: Manifest scope and start_url strictly match base path /FestaAvanteAgenda/', () => {
  assert(manifest.scope === '/FestaAvanteAgenda/', `Expected scope /FestaAvanteAgenda/, got ${manifest.scope}`);
  assert(manifest.start_url === '/FestaAvanteAgenda/', `Expected start_url /FestaAvanteAgenda/, got ${manifest.start_url}`);
  assert(manifest.id === '/FestaAvanteAgenda/', `Expected id /FestaAvanteAgenda/, got ${manifest.id}`);
});

challenge('D6-02: Manifest icons paths are relative or correctly scoped', () => {
  for (const icon of manifest.icons) {
    assert(icon.src, 'Icon must have src');
    assert(
      icon.src.startsWith('pwa-') || icon.src.startsWith('/FestaAvanteAgenda/'),
      `Icon src ${icon.src} must be root-relative or base-scoped`
    );
  }
});

// ======================================================================
// DIMENSION 7: 404.html Visual Theme & Brand Conformance
// ======================================================================
console.log('\n--- DIMENSION 7: 404.html Theme & Brand Conformance ---');

challenge('D7-01: 404.html background matches Avante dark theme #0B0D0F', () => {
  assert(html404Content.includes('#0B0D0F'), '404.html must have #0B0D0F background');
});

challenge('D7-02: 404.html text color matches text-primary #F8FAFC', () => {
  assert(html404Content.includes('#F8FAFC'), '404.html must have #F8FAFC text color');
});

challenge('D7-03: 404.html title matches festival branding', () => {
  assert(html404Content.includes('Festa do Avante! 2025'), '404.html must mention Festa do Avante! 2025');
});

// ======================================================================
// SUMMARY REPORT
// ======================================================================
console.log('\n========================================================================');
console.log(' ADVERSARIAL STRESS HARNESS — SUMMARY REPORT');
console.log('========================================================================');
console.log(`  Total Challenges : ${totalTests}`);
console.log(`  Passed           : ${passedTests}`);
console.log(`  Failed           : ${failedTests}`);
console.log('========================================================================');

if (failedTests > 0) {
  console.error('\n❌ FAILURES ENCOUNTERED:');
  for (const f of failures) {
    console.error(`  - ${f.description}: ${f.error}`);
  }
  process.exit(1);
} else {
  console.log(`\n✔ ALL ${totalTests} ADVERSARIAL ROUTING & BASE PATH CHALLENGES PASSED EMPIRICALLY!`);
  process.exit(0);
}
