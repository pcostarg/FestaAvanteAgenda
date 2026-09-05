// scripts/generate-pwa-icons.mjs
// Standalone, zero-dependency PWA icon generator for FestaAvanteAgenda
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '..', 'public');

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// CRC32 table & calculator
function makeCrcTable() {
  const cTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    cTable[n] = c;
  }
  return cTable;
}
const crcTable = makeCrcTable();

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const toCrc = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function createPng(width, height, getPixel) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // Color type 6: RGBA
  ihdr[10] = 0; // Deflate
  ihdr[11] = 0; // Standard filter
  ihdr[12] = 0; // Non-interlaced

  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * stride;
    raw[rowOffset] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      raw[pxOffset] = r;
      raw[pxOffset + 1] = g;
      raw[pxOffset + 2] = b;
      raw[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(raw);
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function createIcoFromPng(pngBuf, width = 32, height = 32) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // Type 1 = ICO
  header.writeUInt16LE(1, 4); // 1 Image

  const dirEntry = Buffer.alloc(16);
  dirEntry.writeUInt8(width === 256 ? 0 : width, 0);
  dirEntry.writeUInt8(height === 256 ? 0 : height, 1);
  dirEntry.writeUInt8(0, 2);
  dirEntry.writeUInt8(0, 3);
  dirEntry.writeUInt16LE(1, 4); // Planes
  dirEntry.writeUInt16LE(32, 6); // Bits per pixel (RGBA)
  dirEntry.writeUInt32LE(pngBuf.length, 8);
  dirEntry.writeUInt32LE(22, 12); // Offset: 6 + 16 = 22

  return Buffer.concat([header, dirEntry, pngBuf]);
}

function getStarVertices(cx, cy, outerR, innerR) {
  const vertices = [];
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? outerR : innerR;
    vertices.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
  }
  return vertices;
}

function isInsidePolygon(px, py, vertices) {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i][0], yi = vertices[i][1];
    const xj = vertices[j][0], yj = vertices[j][1];
    const intersect = ((yi > py) !== (yj > py)) &&
      (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function renderFestivalIcon(width, height, isMaskable = false) {
  const cx = width / 2;
  const cy = isMaskable ? height / 2 : height * 0.46;
  const outerR = isMaskable ? width * 0.24 : width * 0.28;
  const innerR = outerR * 0.40;
  const star = getStarVertices(cx, cy, outerR, innerR);

  const ring1R = outerR * 1.35;
  const ring1Thick = Math.max(1.5, width * 0.015);
  const ring2R = outerR * 1.65;
  const ring2Thick = Math.max(1.0, width * 0.01);
  const centerDotR = Math.max(2, outerR * 0.12);

  return (x, y, w, h) => {
    // 1. Star check
    if (isInsidePolygon(x, y, star)) {
      const dCenter = Math.hypot(x - cx, y - cy);
      if (dCenter <= centerDotR) {
        return [248, 250, 252, 255]; // #F8FAFC center pulse
      }
      if (y < cy && Math.abs(x - cx) < (cy - y) * 0.6) {
        return [255, 164, 162, 255]; // Top light crimson facet
      }
      if (x < cx) {
        return [211, 47, 47, 255]; // #D32F2F Brand crimson
      }
      return [229, 57, 53, 255]; // #E53935 Brand crimson bright
    }

    // 2. Concentric acoustic pulse rings
    const dist = Math.hypot(x - cx, y - cy);
    if (Math.abs(dist - ring1R) <= ring1Thick) {
      return [245, 158, 11, 230]; // #F59E0B Amber pulse
    }
    if (Math.abs(dist - ring2R) <= ring2Thick) {
      return [229, 57, 53, 160]; // #E53935 Crimson pulse
    }

    // 3. Radial ambient glow
    const maxGlowDist = outerR * 2.1;
    if (dist < maxGlowDist) {
      const factor = (1 - dist / maxGlowDist) * 0.35;
      const r = Math.round(11 + (229 - 11) * factor);
      const g = Math.round(13 + (57 - 13) * factor * 0.3);
      const b = Math.round(15 + (53 - 15) * factor * 0.3);
      return [r, g, b, 255];
    }

    // 4. Obsidian canvas #0B0D0F
    return [11, 13, 15, 255];
  };
}

console.log('Generating PWA icons in public/...');

// 1. pwa-192x192.png
const p192 = createPng(192, 192, renderFestivalIcon(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), p192);

// 2. pwa-512x512.png
const p512 = createPng(512, 512, renderFestivalIcon(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), p512);

// 3. pwa-maskable-512x512.png
const pMask = createPng(512, 512, renderFestivalIcon(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pMask);

// 4. apple-touch-icon.png (180x180)
const pApple = createPng(180, 180, renderFestivalIcon(180, 180, false));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), pApple);

// 5. favicon.ico (32x32)
const pIco32 = createPng(32, 32, renderFestivalIcon(32, 32, false));
const ico = createIcoFromPng(pIco32, 32, 32);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), ico);

console.log('Successfully generated all PWA icon binaries!');
