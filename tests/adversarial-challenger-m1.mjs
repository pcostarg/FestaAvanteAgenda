// tests/adversarial-challenger-m1.mjs
// Adversarial Challenger Test Harness for Milestone 1: PWA Foundation & Design System
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const publicDir = path.join(rootDir, 'public');

console.log('====================================================');
console.log('ADVERSARIAL STRESS HARNESS — MILESTONE 1 VERIFICATION');
console.log('====================================================\n');

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

// ==========================================
// Dimension 1: Dist Directory File Integrity
// ==========================================
console.log('--- Dimension 1: Dist Directory File Integrity ---');

challenge('dist/ directory exists and is a directory', () => {
  assert(fs.existsSync(distDir), 'dist/ directory does not exist');
  assert(fs.statSync(distDir).isDirectory(), 'dist/ is not a directory');
});

const requiredDistFiles = [
  'manifest.webmanifest',
  'sw.js',
  'favicon.ico',
  'favicon.svg',
  'apple-touch-icon.png',
  'pwa-192x192.png',
  'pwa-512x512.png',
  'pwa-maskable-512x512.png',
  'index.html',
  '404.html',
];

for (const f of requiredDistFiles) {
  challenge(`dist/${f} exists and is non-empty`, () => {
    const p = path.join(distDir, f);
    assert(fs.existsSync(p), `Missing file: dist/${f}`);
    const st = fs.statSync(p);
    assert(st.size > 0, `File dist/${f} has 0 bytes`);
  });
}

// ==========================================
// Dimension 2: Web Manifest Strict Conformance
// ==========================================
console.log('\n--- Dimension 2: Web Manifest Strict Conformance ---');

let manifestObj = null;
challenge('dist/manifest.webmanifest is valid RFC 8259 JSON', () => {
  const p = path.join(distDir, 'manifest.webmanifest');
  const raw = fs.readFileSync(p, 'utf8');
  manifestObj = JSON.parse(raw);
  assert(typeof manifestObj === 'object' && manifestObj !== null, 'Manifest is not an object');
});

challenge('Manifest theme_color is strictly #0B0D0F', () => {
  assert(manifestObj.theme_color === '#0B0D0F', `Expected #0B0D0F, got ${manifestObj.theme_color}`);
});

challenge('Manifest background_color is strictly #0B0D0F', () => {
  assert(manifestObj.background_color === '#0B0D0F', `Expected #0B0D0F, got ${manifestObj.background_color}`);
});

challenge('Manifest scope is strictly /FestaAvanteAgenda/', () => {
  assert(manifestObj.scope === '/FestaAvanteAgenda/', `Expected /FestaAvanteAgenda/, got ${manifestObj.scope}`);
});

challenge('Manifest start_url is strictly /FestaAvanteAgenda/', () => {
  assert(manifestObj.start_url === '/FestaAvanteAgenda/', `Expected /FestaAvanteAgenda/, got ${manifestObj.start_url}`);
});

challenge('Manifest display is standalone', () => {
  assert(manifestObj.display === 'standalone', `Expected standalone, got ${manifestObj.display}`);
});

challenge('Manifest contains valid name and short_name', () => {
  assert(typeof manifestObj.name === 'string' && manifestObj.name.includes('Festa do Avante!'), 'Invalid name');
  assert(typeof manifestObj.short_name === 'string' && manifestObj.short_name.length <= 15, 'Invalid short_name');
});

challenge('All manifest declared icons exist physically on disk with correct mime types', () => {
  assert(Array.isArray(manifestObj.icons) && manifestObj.icons.length >= 3, 'Missing or empty icons array');
  for (const icon of manifestObj.icons) {
    assert(icon.src, 'Icon missing src');
    assert(icon.sizes, 'Icon missing sizes');
    assert(icon.type === 'image/png', `Icon type should be image/png, got ${icon.type}`);
    const resolvedPath = path.join(distDir, icon.src);
    assert(fs.existsSync(resolvedPath), `Declared icon not found in dist: ${icon.src}`);
  }
});

challenge('Manifest includes maskable icon for Android adaptive icon standard', () => {
  const maskable = manifestObj.icons.find(i => i.purpose === 'maskable');
  assert(maskable, 'No icon with purpose="maskable" found in manifest');
  assert(maskable.sizes === '512x512', `Maskable icon size should be 512x512, got ${maskable.sizes}`);
});

// ==========================================
// Dimension 3: Image Binary Header and Dimension Validation
// ==========================================
console.log('\n--- Dimension 3: Image Binary Header and Dimension Validation ---');

function inspectPng(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.length < 24) return { valid: false, error: 'File too small' };
  const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
                buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a;
  if (!isPng) return { valid: false, error: 'Invalid PNG signature' };
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { valid: true, width, height };
}

challenge('pwa-192x192.png has valid PNG signature and 192x192 dimensions', () => {
  const res = inspectPng(path.join(distDir, 'pwa-192x192.png'));
  assert(res.valid, res.error);
  assert(res.width === 192 && res.height === 192, `Expected 192x192, got ${res.width}x${res.height}`);
});

challenge('pwa-512x512.png has valid PNG signature and 512x512 dimensions', () => {
  const res = inspectPng(path.join(distDir, 'pwa-512x512.png'));
  assert(res.valid, res.error);
  assert(res.width === 512 && res.height === 512, `Expected 512x512, got ${res.width}x${res.height}`);
});

challenge('pwa-maskable-512x512.png has valid PNG signature and 512x512 dimensions', () => {
  const res = inspectPng(path.join(distDir, 'pwa-maskable-512x512.png'));
  assert(res.valid, res.error);
  assert(res.width === 512 && res.height === 512, `Expected 512x512, got ${res.width}x${res.height}`);
});

challenge('apple-touch-icon.png has valid PNG signature and 180x180 dimensions', () => {
  const res = inspectPng(path.join(distDir, 'apple-touch-icon.png'));
  assert(res.valid, res.error);
  assert(res.width === 180 && res.height === 180, `Expected 180x180, got ${res.width}x${res.height}`);
});

challenge('favicon.ico has valid ICO signature (00 00 01 00)', () => {
  const buf = fs.readFileSync(path.join(distDir, 'favicon.ico'));
  assert(buf.length >= 4, 'ICO file too small');
  assert(buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x01 && buf[3] === 0x00, 'Invalid ICO header');
});

challenge('favicon.svg is well-formed XML/SVG containing <svg> element', () => {
  const svg = fs.readFileSync(path.join(distDir, 'favicon.svg'), 'utf8');
  assert(svg.includes('<svg') && svg.includes('</svg>'), 'Invalid SVG markup');
  assert(svg.includes('#D32F2F') || svg.includes('#E53935'), 'SVG should contain brand crimson color');
});

// ==========================================
// Dimension 4: Service Worker and Offline Caching Architecture
// ==========================================
console.log('\n--- Dimension 4: Service Worker and Offline Caching Architecture ---');

let swSource = '';
challenge('sw.js exists and is readable', () => {
  swSource = fs.readFileSync(path.join(distDir, 'sw.js'), 'utf8');
  assert(swSource.length > 500, 'sw.js content appears suspiciously short');
});

challenge('sw.js uses clientsClaim() and skipWaiting() for instant activation', () => {
  assert(swSource.includes('skipWaiting'), 'sw.js missing skipWaiting');
  assert(swSource.includes('clientsClaim'), 'sw.js missing clientsClaim');
});

challenge('sw.js precaches index.html and all 6 PWA icon assets', () => {
  const precachedAssets = [
    'index.html',
    'manifest.webmanifest',
    'pwa-192x192.png',
    'pwa-512x512.png',
    'pwa-maskable-512x512.png',
    'apple-touch-icon.png',
    'favicon.ico',
    'favicon.svg',
  ];
  for (const asset of precachedAssets) {
    assert(swSource.includes(asset), `sw.js precache list missing ${asset}`);
  }
});

challenge('sw.js includes navigation fallback configured to /FestaAvanteAgenda/index.html', () => {
  assert(swSource.includes('/FestaAvanteAgenda/index.html'), 'Navigation fallback missing base path');
});

challenge('sw.js runtime caching includes Google Fonts stylesheets (StaleWhileRevalidate) and webfonts (CacheFirst)', () => {
  assert(swSource.includes('google-fonts-stylesheets') || swSource.includes('fonts.googleapis.com'), 'Missing Google Fonts stylesheets cache');
  assert(swSource.includes('google-fonts-webfonts') || swSource.includes('fonts.gstatic.com'), 'Missing Google Fonts webfonts cache');
});

challenge('sw.js references companion workbox runtime script that exists in dist/', () => {
  const workboxMatch = swSource.match(/workbox-[a-f0-9]+/);
  assert(workboxMatch, 'sw.js does not reference workbox runtime module');
  const workboxFile = `${workboxMatch[0]}.js`;
  const workboxPath = path.join(distDir, workboxFile);
  assert(fs.existsSync(workboxPath), `Referenced workbox file ${workboxFile} missing from dist/`);
  assert(fs.statSync(workboxPath).size > 1000, `Workbox chunk ${workboxFile} is unexpectedly small`);
});

// ==========================================
// Dimension 5: HTML Shell and Base Path Security
// ==========================================
console.log('\n--- Dimension 5: HTML Shell and Base Path Security ---');

let indexHtml = '';
challenge('dist/index.html exists and is readable', () => {
  indexHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
  assert(indexHtml.length > 500, 'dist/index.html is unexpectedly small');
});

challenge('dist/index.html contains exact meta theme-color #0B0D0F', () => {
  assert(indexHtml.includes('name="theme-color" content="#0B0D0F"'), 'Missing exact theme-color meta tag');
});

challenge('dist/index.html links to /FestaAvanteAgenda/manifest.webmanifest', () => {
  assert(indexHtml.includes('/FestaAvanteAgenda/manifest.webmanifest'), 'Link to manifest lacks base path');
});

challenge('dist/index.html scripts and stylesheets are prefixed with /FestaAvanteAgenda/', () => {
  assert(indexHtml.includes('src="/FestaAvanteAgenda/assets/'), 'Script src lacks /FestaAvanteAgenda/ prefix');
  assert(indexHtml.includes('href="/FestaAvanteAgenda/assets/'), 'CSS href lacks /FestaAvanteAgenda/ prefix');
});

challenge('dist/404.html contains SPA redirect preserving query and route', () => {
  const content404 = fs.readFileSync(path.join(distDir, '404.html'), 'utf8');
  assert(content404.includes('window.location.replace'), '404.html missing redirect script');
  assert(content404.includes('pathSegmentsToKeep'), '404.html missing path preservation logic');
});

// ==========================================
// Dimension 6: Tailwind Design System Tokens
// ==========================================
console.log('\n--- Dimension 6: Tailwind Design System Tokens ---');

let cssContent = '';
challenge('Compiled CSS chunk exists and contains Avante Festival Pulse theme tokens', () => {
  const assetsDir = path.join(distDir, 'assets');
  const cssFiles = fs.readdirSync(assetsDir).filter(f => f.endsWith('.css'));
  assert(cssFiles.length > 0, 'No compiled CSS files found in dist/assets/');
  cssContent = fs.readFileSync(path.join(assetsDir, cssFiles[0]), 'utf8');
  assert(cssContent.length > 1000, 'Compiled CSS file is suspiciously small');
});

challenge('Compiled CSS contains OLED canvas color #0b0d0f', () => {
  assert(cssContent.includes('#0b0d0f') || cssContent.includes('rgb(11 13 15)'), 'OLED canvas color #0B0D0F missing from CSS');
});

challenge('Compiled CSS contains brand crimson #d32f2f or #e53935', () => {
  assert(cssContent.includes('#d32f2f') || cssContent.includes('#e53935') || cssContent.includes('rgb(211 47 47)'), 'Brand crimson color missing from CSS');
});

// ==========================================
// Final Summary
// ==========================================
console.log('\n====================================================');
console.log(`TOTAL CHALLENGES: ${totalTests}`);
console.log(`PASSED:           ${passedTests}`);
console.log(`FAILED:           ${failedTests}`);
console.log('====================================================');

if (failedTests > 0) {
  console.error('\nFAILURES SUMMARY:');
  for (const f of failures) {
    console.error(`- ${f.description}: ${f.error}`);
  }
  process.exit(1);
} else {
  console.log('\n✔ ALL ADVERSARIAL CHALLENGES EMPIRICALLY SATISFIED!');
  process.exit(0);
}
