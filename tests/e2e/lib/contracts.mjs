// tests/e2e/lib/contracts.mjs
// Authoritative specifications, schemas, algorithms, and validation rules

export const COLOR_TOKENS = {
  'surface-base': '#0B0D0F',
  'surface': '#111316',
  'surface-card': '#16191E',
  'surface-overlay': '#20252D',
  'surface-bright': '#37393D',
  'border-subtle': '#282E38',
  'border-highlight': '#3F4756',
  'brand-crimson': '#D32F2F',
  'brand-crimson-bright': '#E53935',
  'brand-amber': '#F59E0B',
  'stage-blue': '#2563EB',
  'accent-orange': '#FA6E33',
  'tertiary-green': '#10B981',
  'live-indicator': '#EF4444',
  'text-primary': '#F8FAFC',
  'text-secondary': '#94A3B8',
  'text-muted': '#64748B',
};

export const FESTIVAL_DAYS = [
  { date: '2025-09-05', code: 'fri', label: 'Sexta, 5 Set', hours: '18h-01h30' },
  { date: '2025-09-06', code: 'sat', label: 'Sábado, 6 Set', hours: '10h-01h30' },
  { date: '2025-09-07', code: 'sun', label: 'Domingo, 7 Set', hours: '10h-23h' },
];

export const FESTIVAL_STAGES = [
  'Palco 25 de Abril',
  'Palco Paz',
  'Auditório 1º de Maio',
  'Cidade da Juventude',
  'Espaço Central',
  'Avanteatro',
  'CineAvante!',
  'Espaço Criança',
  'Espaço Ciência',
  'Espaço Desporto',
  'Espaço Fado',
  'Festa do Livro',
  'Espaço Internacional',
];

export const FESTIVAL_CATEGORIES = [
  'Música',
  'Debates',
  'Avanteatro & Cinema',
  'Espaço Criança',
  'Ciência & Oficinas',
  'Desporto',
  'Gastronomia',
  'Animação de Rua',
];

export const TIME_BLOCKS = [
  { id: 'manha', label: 'Manhã', start: '08:30', end: '13:00' },
  { id: 'tarde', label: 'Tarde', start: '13:00', end: '18:00' },
  { id: 'anoitecer', label: 'Anoitecer', start: '18:00', end: '21:00' },
  { id: 'noite', label: 'Noite Principal', start: '21:00', end: '02:00' },
];

export const LOCAL_STORAGE_KEY = 'avante_schedule_v1';
export const BASE_PATH = '/FestaAvanteAgenda/';
export const SHARE_URL_PREFIX = 'https://pcostarg.github.io/FestaAvanteAgenda/?import=';

/**
 * Converts HH:mm to continuous festival minutes.
 * Operating hours extend past midnight up to 06:00, mapped as hour + 24.
 * e.g., 00:30 -> (0+24)*60 + 30 = 1470 minutes.
 */
export function timeToFestivalMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') {
    throw new Error(`Invalid time string: ${timeStr}`);
  }
  const match = timeStr.trim().match(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/);
  if (!match) {
    throw new Error(`Time string does not match HH:mm pattern: ${timeStr}`);
  }
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const adjustedHour = h < 6 ? h + 24 : h;
  return adjustedHour * 60 + m;
}

/**
 * Converts festival minutes back to HH:mm.
 */
export function festivalMinutesToTime(minutes) {
  const totalHours = Math.floor(minutes / 60);
  const m = minutes % 60;
  const h = totalHours >= 24 ? totalHours - 24 : totalHours;
  const hhStr = String(h).padStart(2, '0');
  const mmStr = String(m).padStart(2, '0');
  return `${hhStr}:${mmStr}`;
}

/**
 * Determines which time block an event falls into based on start time.
 */
export function getTimeBlockForTime(timeStr) {
  const mins = timeToFestivalMinutes(timeStr);
  const m13 = 13 * 60;
  const m18 = 18 * 60;
  const m21 = 21 * 60;

  if (mins < m13) return 'manha';
  if (mins < m18) return 'tarde';
  if (mins < m21) return 'anoitecer';
  return 'noite';
}

/**
 * Evaluates whether two events overlap in time on the same festival day.
 * Rule: startA < endB && startB < endA
 */
export function doEventsOverlap(eventA, eventB) {
  if (eventA.day !== eventB.day) return false;
  if (eventA.id === eventB.id) return false;

  const startA = timeToFestivalMinutes(eventA.timeStart);
  const endA = timeToFestivalMinutes(eventA.timeEnd);
  const startB = timeToFestivalMinutes(eventB.timeStart);
  const endB = timeToFestivalMinutes(eventB.timeEnd);

  return startA < endB && startB < endA;
}

/**
 * Detects all pairwise conflicts among a given list of events.
 */
export function detectScheduleConflicts(events) {
  const conflictIds = new Set();
  const pairs = [];

  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      if (doEventsOverlap(events[i], events[j])) {
        conflictIds.add(events[i].id);
        conflictIds.add(events[j].id);
        pairs.push({
          eventA: events[i],
          eventB: events[j],
          overlapStart: Math.max(
            timeToFestivalMinutes(events[i].timeStart),
            timeToFestivalMinutes(events[j].timeStart)
          ),
          overlapEnd: Math.min(
            timeToFestivalMinutes(events[i].timeEnd),
            timeToFestivalMinutes(events[j].timeEnd)
          ),
        });
      }
    }
  }

  return {
    hasConflicts: conflictIds.size > 0,
    conflictIds,
    conflictCount: conflictIds.size,
    pairs,
  };
}

/**
 * Validates a FestivalEvent object against the canonical specification.
 */
export function validateFestivalEvent(ev) {
  const errors = [];
  if (!ev || typeof ev !== 'object') {
    return { valid: false, errors: ['Event must be a non-null object'] };
  }
  if (!ev.id || typeof ev.id !== 'string' || !ev.id.trim()) {
    errors.push(`Missing or invalid id: ${ev.id}`);
  }
  if (!ev.title || typeof ev.title !== 'string' || !ev.title.trim()) {
    errors.push(`Missing or invalid title: ${ev.title}`);
  }
  if (!ev.stage || !FESTIVAL_STAGES.includes(ev.stage)) {
    errors.push(`Invalid stage: ${ev.stage}`);
  }
  if (!ev.day || !FESTIVAL_DAYS.some((d) => d.date === ev.day)) {
    errors.push(`Invalid festival day: ${ev.day}`);
  }
  try {
    const s = timeToFestivalMinutes(ev.timeStart);
    const e = timeToFestivalMinutes(ev.timeEnd);
    if (s >= e) {
      errors.push(`timeStart (${ev.timeStart}) must be strictly before timeEnd (${ev.timeEnd})`);
    }
  } catch (err) {
    errors.push(`Time parsing error: ${err.message}`);
  }
  if (!ev.category) {
    errors.push(`Missing category`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates the localStorage schedule payload.
 */
export function validateScheduleStorage(data) {
  const errors = [];
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Schedule payload must be an object'] };
  }
  if (!Array.isArray(data.favorites)) {
    errors.push('favorites must be an array of event IDs');
  } else if (!data.favorites.every((id) => typeof id === 'string')) {
    errors.push('all favorite entries must be strings');
  }
  if (!Array.isArray(data.seen)) {
    errors.push('seen must be an array of event IDs');
  } else if (!data.seen.every((id) => typeof id === 'string')) {
    errors.push('all seen entries must be strings');
  }
  if (typeof data.updatedAt !== 'number' || isNaN(data.updatedAt) || data.updatedAt < 0) {
    errors.push('updatedAt must be a valid positive Unix timestamp');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Encodes schedule state to a URL-safe Base64 compressed payload.
 */
export function encodeSharePayload(favorites = [], seen = []) {
  const minimal = {
    f: Array.from(new Set(favorites)),
    s: Array.from(new Set(seen)),
  };
  const json = JSON.stringify(minimal);
  const base64 = Buffer.from(json, 'utf-8').toString('base64');
  // URL safe: remove '=', replace '+' with '-', '/' with '_'
  return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/**
 * Decodes URL-safe Base64 payload back to { favorites, seen }.
 */
export function decodeSharePayload(base64UrlStr) {
  if (!base64UrlStr || typeof base64UrlStr !== 'string') {
    throw new Error('Payload string is required');
  }
  // Restore standard base64 characters
  let base64 = base64UrlStr.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const jsonStr = Buffer.from(base64, 'base64').toString('utf-8');
  const parsed = JSON.parse(jsonStr);

  const favorites = Array.isArray(parsed.f) ? parsed.f.filter((id) => typeof id === 'string') : [];
  const seen = Array.isArray(parsed.s) ? parsed.s.filter((id) => typeof id === 'string') : [];

  return { favorites, seen };
}

/**
 * Generates RFC 5545 compliant ICS calendar content for an array of FestivalEvents.
 */
export function generateIcsCalendar(events, prodId = '-//Festa do Avante 2025//AvanteRouter PWA//PT') {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${prodId}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  const dtstamp = '20250904T120000Z';

  for (const ev of events) {
    const [startH, startM] = ev.timeStart.split(':').map(Number);
    const [endH, endM] = ev.timeEnd.split(':').map(Number);

    // Calculate dates, advancing 1 day if time is past midnight (00h-05h)
    const [year, month, day] = ev.day.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, month - 1, day, startH, startM, 0));
    if (startH < 6) {
      startDate.setUTCDate(startDate.getUTCDate() + 1);
    }

    const endDate = new Date(Date.UTC(year, month - 1, day, endH, endM, 0));
    if (endH < 6 || (endH === 0 && endM === 0)) {
      endDate.setUTCDate(endDate.getUTCDate() + 1);
    }

    const formatIcsDate = (d) => {
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const da = String(d.getUTCDate()).padStart(2, '0');
      const h = String(d.getUTCHours()).padStart(2, '0');
      const min = String(d.getUTCMinutes()).padStart(2, '0');
      const s = String(d.getUTCSeconds()).padStart(2, '0');
      return `${y}${m}${da}T${h}${min}${s}Z`;
    };

    // RFC 5545 text escaping: backslash, semicolon, comma, newline
    const escapeText = (str) =>
      (str || '')
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${ev.id}@festadoavante.pcp.pt`);
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(`DTSTART:${formatIcsDate(startDate)}`);
    lines.push(`DTEND:${formatIcsDate(endDate)}`);
    lines.push(`SUMMARY:${escapeText(ev.title)} (${escapeText(ev.stage)})`);
    lines.push(`LOCATION:${escapeText(ev.stage)}, Quinta da Atalaia, Amora, Seixal`);
    lines.push(`DESCRIPTION:${escapeText(ev.description || 'Festa do Avante! 2025')}`);
    lines.push(`CATEGORIES:${escapeText(ev.category)}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

/**
 * Validates RFC 5545 ICS string.
 */
export function validateIcsCalendar(icsStr) {
  const errors = [];
  if (!icsStr || typeof icsStr !== 'string') {
    return { valid: false, errors: ['ICS content must be a non-empty string'] };
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
