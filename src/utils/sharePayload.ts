/**
 * Festa do Avante! 2025 - Schedule Sharing & Base64URL Compression
 * File: src/utils/sharePayload.ts
 *
 * Provides isomorphic, URL-safe Base64 encoding and decoding of user schedule
 * state (favorites and seen IDs) for QR codes and shareable links (?import=...).
 */

export const SHARE_URL_BASE = 'https://pcostarg.github.io/FestaAvanteAgenda/';
export const SHARE_URL_PREFIX = `${SHARE_URL_BASE}?import=`;

export interface CompactSchedulePayload {
  f: string[];
  s: string[];
  v?: number;
}

export interface DecodedScheduleData {
  favorites: string[];
  seen: string[];
  version?: number;
}

/**
 * Encodes a UTF-8 string to standard Base64 across Browser and Node environments.
 */
function utf8ToBase64(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'utf-8').toString('base64');
  }
  if (typeof window !== 'undefined' && typeof btoa !== 'undefined') {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i];
      if (b !== undefined) {
        binary += String.fromCharCode(b);
      }
    }
    return btoa(binary);
  }
  throw new Error('No Base64 encoder available in current environment');
}

/**
 * Decodes a standard Base64 string to UTF-8 across Browser and Node environments.
 */
function base64ToUtf8(base64: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(base64, 'base64').toString('utf-8');
  }
  if (typeof window !== 'undefined' && typeof atob !== 'undefined') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const decoder = new TextDecoder();
    return decoder.decode(bytes);
  }
  throw new Error('No Base64 decoder available in current environment');
}

/**
 * Encodes schedule state (favorites and seen IDs) into a URL-safe Base64 string.
 * Strictly omits '+', '/', and '=' characters.
 * Deduplicates IDs and uses minimal keys 'f' and 's' for high QR code readability.
 */
export function encodeSharePayload(favorites: string[] = [], seen: string[] = []): string {
  const cleanFavs = Array.isArray(favorites)
    ? Array.from(new Set(favorites.filter((id) => typeof id === 'string' && id.trim().length > 0)))
    : [];
  const cleanSeen = Array.isArray(seen)
    ? Array.from(new Set(seen.filter((id) => typeof id === 'string' && id.trim().length > 0)))
    : [];

  const minimalPayload = {
    f: cleanFavs,
    s: cleanSeen,
  };

  const json = JSON.stringify(minimalPayload);
  const base64 = utf8ToBase64(json);

  // URL-safe replacement: '=' removed, '+' -> '-', '/' -> '_'
  return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/**
 * Decodes a URL-safe Base64 payload back into { favorites, seen }.
 * Automatically restores Base64 padding (modulus 4) and handles legacy or extended formats.
 * Throws exact 'Payload string is required' on null, undefined, or empty string.
 */
export function decodeSharePayload(base64UrlStr: string | null | undefined): DecodedScheduleData {
  if (!base64UrlStr || typeof base64UrlStr !== 'string' || !base64UrlStr.trim()) {
    throw new Error('Payload string is required');
  }

  // Restore standard Base64 characters
  let base64 = base64UrlStr.trim().replace(/-/g, '+').replace(/_/g, '/');

  // Re-pad to multiple of 4
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }

  let jsonStr: string;
  try {
    jsonStr = base64ToUtf8(base64);
  } catch (err) {
    throw new Error(`Failed to decode Base64 payload: ${(err as Error).message}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (err) {
    throw new Error(`Invalid JSON payload inside share string: ${(err as Error).message}`);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Decoded payload is not a valid object');
  }

  const obj = parsed as Record<string, unknown>;

  // Support both compact keys ('f', 's') and full keys ('favorites', 'seen')
  const rawFavs = Array.isArray(obj.f) ? obj.f : Array.isArray(obj.favorites) ? obj.favorites : [];
  const rawSeen = Array.isArray(obj.s) ? obj.s : Array.isArray(obj.seen) ? obj.seen : [];

  const favorites = rawFavs.filter((id): id is string => typeof id === 'string');
  const seen = rawSeen.filter((id): id is string => typeof id === 'string');
  const version = typeof obj.v === 'number' ? obj.v : typeof obj.version === 'number' ? obj.version : 1;

  return {
    favorites: Array.from(new Set(favorites)),
    seen: Array.from(new Set(seen)),
    version,
  };
}

/**
 * Constructs a full shareable link with the encoded schedule payload.
 */
export function createShareUrl(payload: string, baseUrl = SHARE_URL_PREFIX): string {
  if (!payload) return baseUrl;
  if (baseUrl.includes('?import=')) {
    return `${baseUrl}${payload}`;
  }
  const separator = baseUrl.includes('?') ? '&import=' : '?import=';
  return `${baseUrl}${separator}${payload}`;
}

/**
 * Extracts and decodes the schedule payload from a raw URL or query string.
 * Returns null if no import parameter is found.
 */
export function extractPayloadFromUrl(urlString: string): DecodedScheduleData | null {
  try {
    const url = new URL(urlString);
    const param = url.searchParams.get('import');
    if (!param) return null;
    return decodeSharePayload(param);
  } catch {
    if (urlString.includes('import=')) {
      const match = urlString.match(/[?&]import=([^&#]+)/);
      if (match && match[1]) {
        try {
          return decodeSharePayload(match[1]);
        } catch {
          return null;
        }
      }
    }
    return null;
  }
}

/**
 * Extracts and decodes schedule data from any scanned text
 * (full URL, partial query, raw Base64 payload, or raw JSON).
 */
export function extractScheduleFromScannedText(text: string): DecodedScheduleData {
  if (!text || typeof text !== 'string') {
    throw new Error('Conteúdo QR vazio.');
  }

  const trimmed = text.trim();

  // 1. Full URL with ?import=
  try {
    const url = new URL(trimmed);
    const param = url.searchParams.get('import');
    if (param) {
      return decodeSharePayload(param);
    }
  } catch {
    // Not a full URL
  }

  // 2. Relative or partial URL containing ?import=
  if (trimmed.includes('?import=')) {
    const query = trimmed.split('?import=')[1]?.split('&')[0]?.split('#')[0];
    if (query) {
      return decodeSharePayload(query);
    }
  }

  // 3. Raw JSON backup string
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      const favs = parsed.favorites ?? parsed.f;
      if (Array.isArray(favs)) {
        const sanitize = (arr: unknown): string[] =>
          Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [];
        return {
          favorites: Array.from(new Set(sanitize(favs))),
          seen: Array.from(new Set(sanitize(parsed.seen ?? parsed.s))),
        };
      }
    } catch {
      // Not JSON
    }
  }

  // 4. Raw Base64 string directly
  try {
    return decodeSharePayload(trimmed);
  } catch {
    // Fall through
  }

  throw new Error('O código lido não contém uma agenda válida da Festa do Avante!');
}
