// tests/verify-pwa-dist.mjs
// Empirical challenger verification script for Milestone 1
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const publicDir = path.join(rootDir, 'public');

console.log('=== Milestone 1 Empirical Challenger Verification ===');

let exitCode = 0;
function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    exitCode = 1;
  } else {
    console.log(`✔ PASS: ${message}`);
  }
}

// 1. Check existence of dist directory
assert(fs.existsSync(distDir), `dist directory exists at ${distDir}`);

// 2. Check manifest.webmanifest
const manifestPath = path.join(distDir, 'manifest.webmanifest');
assert(fs.existsSync(manifestPath), 'dist/manifest.webmanifest exists');

let manifest = null;
try {
  const content = fs.readFileSync(manifestPath, 'utf8');
  manifest = JSON.parse(content);
  assert(true, 'dist/manifest.webmanifest is valid JSON');
} catch (e) {
  assert(false, `dist/manifest.webmanifest failed to parse: ${e.message}`);
}

if (manifest) {
  // Task 2 specific assertions:
  // theme_color === '#0B0D0F'
  assert(manifest.theme_color === '#0B0D0F', `theme_color === '#0B0D0F' (actual: '${manifest.theme_color}')`);
  // background_color === '#0B0D0F'
  assert(manifest.background_color === '#0B0D0F', `background_color === '#0B0D0F' (actual: '${manifest.background_color}')`);
  // scope === '/FestaAvanteAgenda/'
  assert(manifest.scope === '/FestaAvanteAgenda/', `scope === '/FestaAvanteAgenda/' (actual: '${manifest.scope}')`);
  // start_url === '/FestaAvanteAgenda/'
  assert(manifest.start_url === '/FestaAvanteAgenda/', `start_url === '/FestaAvanteAgenda/' (actual: '${manifest.start_url}')`);

  // Additional manifest checks
  assert(manifest.id === '/FestaAvanteAgenda/', `id === '/FestaAvanteAgenda/' (actual: '${manifest.id}')`);
  assert(manifest.display === 'standalone', `display === 'standalone' (actual: '${manifest.display}')`);
  assert(Array.isArray(manifest.icons) && manifest.icons.length >= 3, `manifest has icons array (count: ${manifest.icons?.length})`);
}

// 3. Check service worker
const swPath = path.join(distDir, 'sw.js');
assert(fs.existsSync(swPath), 'dist/sw.js exists');
if (fs.existsSync(swPath)) {
  const swStat = fs.statSync(swPath);
  assert(swStat.size > 0, `dist/sw.js is not empty (${swStat.size} bytes)`);
  const swContent = fs.readFileSync(swPath, 'utf8');
  assert(swContent.includes('workbox') || swContent.includes('precache'), 'dist/sw.js contains workbox/precache references');
}

// 4. Check all 6 PWA icon files in dist/
const requiredIcons = [
  'favicon.ico',
  'favicon.svg',
  'apple-touch-icon.png',
  'pwa-192x192.png',
  'pwa-512x512.png',
  'pwa-maskable-512x512.png',
];

for (const iconName of requiredIcons) {
  const iconDistPath = path.join(distDir, iconName);
  const exists = fs.existsSync(iconDistPath);
  assert(exists, `dist/${iconName} exists`);
  if (exists) {
    const st = fs.statSync(iconDistPath);
    assert(st.size > 0, `dist/${iconName} is non-empty (${st.size} bytes)`);
  }
}

// 5. Verify index.html in dist links to manifest and theme-color
const indexPath = path.join(distDir, 'index.html');
assert(fs.existsSync(indexPath), 'dist/index.html exists');
if (fs.existsSync(indexPath)) {
  const indexHtml = fs.readFileSync(indexPath, 'utf8');
  assert(indexHtml.includes('manifest.webmanifest'), 'dist/index.html links to manifest.webmanifest');
  assert(indexHtml.includes('#0B0D0F'), 'dist/index.html includes theme-color #0B0D0F');
  assert(indexHtml.includes('/FestaAvanteAgenda/'), 'dist/index.html includes base path references');
}

// 6. Verify 404.html in dist for GitHub Pages SPA routing
const notFoundPath = path.join(distDir, '404.html');
assert(fs.existsSync(notFoundPath), 'dist/404.html exists');

// 7. Verify icon PNG dimensions and headers empirically
function readPngDimensions(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.length < 24) return null;
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  if (!isPng) return null;
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

const pwa192 = readPngDimensions(path.join(distDir, 'pwa-192x192.png'));
assert(pwa192 && pwa192.width === 192 && pwa192.height === 192, `pwa-192x192.png is a valid 192x192 PNG (actual: ${pwa192 ? `${pwa192.width}x${pwa192.height}` : 'invalid'})`);

const pwa512 = readPngDimensions(path.join(distDir, 'pwa-512x512.png'));
assert(pwa512 && pwa512.width === 512 && pwa512.height === 512, `pwa-512x512.png is a valid 512x512 PNG (actual: ${pwa512 ? `${pwa512.width}x${pwa512.height}` : 'invalid'})`);

const pwaMaskable = readPngDimensions(path.join(distDir, 'pwa-maskable-512x512.png'));
assert(pwaMaskable && pwaMaskable.width === 512 && pwaMaskable.height === 512, `pwa-maskable-512x512.png is a valid 512x512 PNG (actual: ${pwaMaskable ? `${pwaMaskable.width}x${pwaMaskable.height}` : 'invalid'})`);

const appleIcon = readPngDimensions(path.join(distDir, 'apple-touch-icon.png'));
assert(appleIcon && appleIcon.width === 180 && appleIcon.height === 180, `apple-touch-icon.png is a valid 180x180 PNG (actual: ${appleIcon ? `${appleIcon.width}x${appleIcon.height}` : 'invalid'})`);

console.log(`\nVerification finished with exit code: ${exitCode}`);
process.exit(exitCode);
