/**
 * Festa do Avante! 2025 - Pure TypeScript RFC 5545 Calendar Generator
 * File: src/utils/ics.ts
 *
 * Implements an RFC 5545 compliant iCalendar serializer with:
 * - Strict CRLF line endings (\r\n)
 * - UTF-8 octet-safe 75-column line folding
 * - Nocturnal midnight-crossing calendar day rollover (< 6h)
 * - Deterministic UID generation (${id}@festadoavante.pcp.pt)
 * - Escaping of RFC 5545 control characters (\, ;, ,, \n)
 * - Browser Blob download helper for meu_avante_2025.ics
 */

import type { FestivalEvent } from '../types/program';

export const ICS_PRODID = '-//Festa do Avante 2025//AvanteRouter PWA//PT';
export const ICS_FILENAME = 'meu_avante_2025.ics';
export const FESTIVAL_VENUE_LOCATION = 'Quinta da Atalaia, Amora, Seixal';

export interface IcsGenerationOptions {
  prodId?: string;
  dtstamp?: string;
  includeAlarm?: boolean;
  alarmMinutesBefore?: number;
}

export interface IcsValidationResult {
  valid: boolean;
  errors: string[];
  eventCount: number;
}

/**
 * Resolves canonical ISO date (YYYY-MM-DD) from event fields.
 */
export function resolveEventDate(ev: Partial<FestivalEvent>): string {
  if (ev.date && /^\d{4}-\d{2}-\d{2}$/.test(ev.date)) {
    return ev.date;
  }
  if (ev.day && /^\d{4}-\d{2}-\d{2}$/.test(ev.day)) {
    return ev.day;
  }
  const dayStr = String(ev.day || ev.dayCode || '').toLowerCase().trim();
  if (dayStr === 'sexta' || dayStr === 'fri') return '2025-09-05';
  if (dayStr === 'sabado' || dayStr === 'sat') return '2025-09-06';
  if (dayStr === 'domingo' || dayStr === 'sun') return '2025-09-07';
  return '2025-09-05';
}

/**
 * Escapes RFC 5545 special text characters: backslash, semicolon, comma, and newlines.
 * Order is critical: backslashes must be escaped first.
 */
export function escapeIcsText(str: string | undefined | null): string {
  if (!str) return '';
  return str
    .replace(/\r\n|\r|\n/g, '\n') // Normalize newlines
    .replace(/\\/g, '\\\\')        // Escape backslash
    .replace(/;/g, '\\;')          // Escape semicolon
    .replace(/,/g, '\\,')          // Escape comma
    .replace(/\n/g, '\\n');        // Escape newline to literal \n
}

/**
 * Folds a single content line according to RFC 5545 (max 75 octets per line).
 * UTF-8 safe: ensures multi-byte character sequences are never split across line boundaries.
 */
export function foldIcsLine(line: string): string {
  const getByteLength = (s: string): number => {
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(s).length;
    }
    if (typeof Buffer !== 'undefined') {
      return Buffer.byteLength(s, 'utf-8');
    }
    let b = 0;
    for (let i = 0; i < s.length; i++) {
      const code = s.charCodeAt(i);
      if (code <= 0x7f) b += 1;
      else if (code <= 0x7ff) b += 2;
      else if (code >= 0xd800 && code <= 0xdbff) {
        b += 4;
        i++;
      } else b += 3;
    }
    return b;
  };

  if (getByteLength(line) <= 75) {
    return line;
  }

  const chunks: string[] = [];
  let currentChunk = '';
  let currentBytes = 0;
  let isFirstLine = true;
  const maxBytesForCurrent = () => (isFirstLine ? 75 : 74); // Continuation lines have leading space (1 byte)

  const chars = Array.from(line);

  for (const ch of chars) {
    const chBytes = getByteLength(ch);
    if (currentBytes + chBytes > maxBytesForCurrent()) {
      chunks.push(currentChunk);
      currentChunk = ch;
      currentBytes = chBytes;
      isFirstLine = false;
    } else {
      currentChunk += ch;
      currentBytes += chBytes;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks.join('\r\n ');
}

/**
 * Formats a Date object as RFC 5545 UTC datetime string: YYYYMMDDTHHmmssZ.
 */
export function formatIcsUtcDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const da = String(d.getUTCDate()).padStart(2, '0');
  const h = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  const s = String(d.getUTCSeconds()).padStart(2, '0');
  return `${y}${m}${da}T${h}${min}${s}Z`;
}

/**
 * Calculates start and end Date objects for an act, taking into account
 * nocturnal festival hours crossing midnight (00:00 to 05:59).
 */
export function computeEventDates(ev: Partial<FestivalEvent>): { startDate: Date; endDate: Date } {
  const dateStr = resolveEventDate(ev);
  const timeStart = ev.startTime || ev.timeStart || '12:00';
  const timeEnd = ev.endTime || ev.timeEnd || timeStart;

  const dateParts = dateStr.split('-').map(Number);
  const year = dateParts[0] ?? 2025;
  const month = dateParts[1] ?? 9;
  const day = dateParts[2] ?? 5;

  const startParts = timeStart.split(':').map(Number);
  const startH = startParts[0] ?? 12;
  const startM = startParts[1] ?? 0;

  const endParts = timeEnd.split(':').map(Number);
  const endH = endParts[0] ?? startH;
  const endM = endParts[1] ?? startM;

  const startDate = new Date(Date.UTC(year, month - 1, day, startH, startM, 0));
  if (startH < 6) {
    startDate.setUTCDate(startDate.getUTCDate() + 1);
  }

  const endDate = new Date(Date.UTC(year, month - 1, day, endH, endM, 0));
  if (endH < 6 || (endH === 0 && endM === 0)) {
    endDate.setUTCDate(endDate.getUTCDate() + 1);
  }

  return { startDate, endDate };
}

/**
 * Generates RFC 5545 compliant iCalendar content for an array of festival acts.
 */
export function generateIcsCalendar(
  events: FestivalEvent[] | Partial<FestivalEvent>[],
  optionsOrProdId?: string | IcsGenerationOptions
): string {
  let prodId = ICS_PRODID;
  let dtstamp = '20250904T120000Z';
  let includeAlarm = false;
  let alarmMinutes = 15;

  if (typeof optionsOrProdId === 'string') {
    prodId = optionsOrProdId;
  } else if (optionsOrProdId && typeof optionsOrProdId === 'object') {
    if (optionsOrProdId.prodId) prodId = optionsOrProdId.prodId;
    if (optionsOrProdId.dtstamp) dtstamp = optionsOrProdId.dtstamp;
    if (typeof optionsOrProdId.includeAlarm === 'boolean') includeAlarm = optionsOrProdId.includeAlarm;
    if (typeof optionsOrProdId.alarmMinutesBefore === 'number') alarmMinutes = optionsOrProdId.alarmMinutesBefore;
  }

  const rawLines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${prodId}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const ev of events) {
    if (!ev || !ev.id) continue;

    const { startDate, endDate } = computeEventDates(ev);
    const escapedTitle = escapeIcsText(ev.title || 'Evento Festival');
    const stageName = ev.stage || 'Recinto';
    const escapedStage = escapeIcsText(stageName);
    const summary = `${escapedTitle} (${escapedStage})`;
    const location = `${escapedStage}, ${FESTIVAL_VENUE_LOCATION}`;
    const description = escapeIcsText(ev.description || 'Festa do Avante! 2025');
    const category = escapeIcsText(ev.category || 'Geral');

    rawLines.push('BEGIN:VEVENT');
    rawLines.push(`UID:${ev.id}@festadoavante.pcp.pt`);
    rawLines.push(`DTSTAMP:${dtstamp}`);
    rawLines.push(`DTSTART:${formatIcsUtcDate(startDate)}`);
    rawLines.push(`DTEND:${formatIcsUtcDate(endDate)}`);
    rawLines.push(`SUMMARY:${summary}`);
    rawLines.push(`LOCATION:${location}`);
    rawLines.push(`DESCRIPTION:${description}`);
    rawLines.push(`CATEGORIES:${category}`);

    if (includeAlarm) {
      rawLines.push('BEGIN:VALARM');
      rawLines.push('ACTION:DISPLAY');
      rawLines.push(`DESCRIPTION:Lembrete: ${summary}`);
      rawLines.push(`TRIGGER:-PT${alarmMinutes}M`);
      rawLines.push('END:VALARM');
    }

    rawLines.push('END:VEVENT');
  }

  rawLines.push('END:VCALENDAR');

  const foldedLines = rawLines.map(foldIcsLine);
  return foldedLines.join('\r\n') + '\r\n';
}

/**
 * Validates an RFC 5545 iCalendar string.
 */
export function validateIcsCalendar(icsStr: string): IcsValidationResult {
  const errors: string[] = [];
  if (!icsStr || typeof icsStr !== 'string') {
    return { valid: false, errors: ['ICS content must be a non-empty string'], eventCount: 0 };
  }
  if (!icsStr.startsWith('BEGIN:VCALENDAR')) {
    errors.push('ICS must start with BEGIN:VCALENDAR');
  }
  if (!icsStr.includes('VERSION:2.0')) {
    errors.push('ICS must specify VERSION:2.0');
  }
  if (!icsStr.includes('PRODID:')) {
    errors.push('ICS must specify PRODID');
  }
  if (!icsStr.trim().endsWith('END:VCALENDAR')) {
    errors.push('ICS must end with END:VCALENDAR');
  }

  const veventBegins = (icsStr.match(/BEGIN:VEVENT/g) || []).length;
  const veventEnds = (icsStr.match(/END:VEVENT/g) || []).length;
  if (veventBegins !== veventEnds) {
    errors.push(`Mismatched BEGIN:VEVENT (${veventBegins}) and END:VEVENT (${veventEnds})`);
  }

  return { valid: errors.length === 0, errors, eventCount: veventBegins };
}

/**
 * Triggers a browser download of the generated .ics calendar file.
 * Safely creates and immediately revokes the Blob object URL to prevent memory leaks.
 */
export function downloadIcsCalendar(icsContent: string, filename = ICS_FILENAME): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
