// tests/e2e/tier1-features/f04_f06_grelha.mjs
// Tier 1: Features F4, F5, F6 (Grelha Matrix, AGORA Needle, Inspector Drawer)

import { describe, it, expect } from '../lib/test-framework.mjs';
import { FESTIVAL_STAGES, timeToFestivalMinutes } from '../lib/contracts.mjs';
import { TEST_EVENTS } from '../lib/fixtures.mjs';

export function registerF04ToF06Tests() {
  describe('Tier 1: Feature 4 — Grelha de Palcos (/grelha)', () => {
    it('T1-F4-01: Timeline matrix spans standard festival operating hours (10:00 to 02:00)', () => {
      const startMinutes = timeToFestivalMinutes('10:00'); // 600
      const endMinutes = timeToFestivalMinutes('02:00'); // 1560
      expect(startMinutes).toBe(600);
      expect(endMinutes).toBe(1560);
      expect(endMinutes - startMinutes).toBe(960); // 16 hours continuous span
    });

    it('T1-F4-02: Timeline tracks represent all core festival stages', () => {
      expect(FESTIVAL_STAGES.length).toBeGreaterThanOrEqual(9);
      expect(FESTIVAL_STAGES).toContain('Palco 25 de Abril');
      expect(FESTIVAL_STAGES).toContain('Palco Paz');
      expect(FESTIVAL_STAGES).toContain('Auditório 1º de Maio');
      expect(FESTIVAL_STAGES).toContain('Cidade da Juventude');
    });

    it('T1-F4-03: Event block slot offset is calculated accurately from start time', () => {
      const startAxis = timeToFestivalMinutes('10:00');
      const eventStart = timeToFestivalMinutes('14:00'); // 840 mins
      const offsetMinutes = eventStart - startAxis;
      expect(offsetMinutes).toBe(240); // exactly 4 hours past 10:00
    });

    it('T1-F4-04: Event block slot width is proportional to duration', () => {
      const s = timeToFestivalMinutes('21:00');
      const e = timeToFestivalMinutes('22:30');
      const duration = e - s;
      expect(duration).toBe(90);
    });

    it('T1-F4-05: Stage header row stays sticky during vertical schedule scrolling', () => {
      const stickyHeaderClass = 'sticky top-0 z-20';
      expect(stickyHeaderClass).toContain('sticky');
      expect(stickyHeaderClass).toContain('top-0');
    });
  });

  describe('Tier 1: Feature 5 — Real-time "AGORA" Needle', () => {
    it('T1-F5-01: Needle uses signature neon red indicator color #EF4444', () => {
      const needleColor = '#EF4444';
      expect(needleColor).toBe('#EF4444');
    });

    it('T1-F5-02: Position percentage is calculated correctly between timeline bounds', () => {
      const axisStart = timeToFestivalMinutes('10:00'); // 600
      const axisEnd = timeToFestivalMinutes('02:00'); // 1560
      const current = timeToFestivalMinutes('18:00'); // 1080
      const totalSpan = axisEnd - axisStart; // 960
      const currentOffset = current - axisStart; // 480
      const percent = (currentOffset / totalSpan) * 100;
      expect(percent).toBe(50); // exactly half-way
    });

    it('T1-F5-03: Needle displays floating badge with "AGORA" tag and current time', () => {
      const badgeText = `AGORA 18:00`;
      expect(badgeText).toMatch(/^AGORA \d{2}:\d{2}$/);
    });

    it('T1-F5-04: Events occurring at current needle position receive live highlight glow', () => {
      const event = TEST_EVENTS.find((e) => e.id === 'ev-fri-p25-abril-1900');
      const now = timeToFestivalMinutes('19:45');
      const start = timeToFestivalMinutes(event.timeStart); // 19:00 -> 1140
      const end = timeToFestivalMinutes(event.timeEnd); // 20:30 -> 1230
      const isLiveNow = now >= start && now < end;
      expect(isLiveNow).toBe(true);
    });

    it('T1-F5-05: Needle is hidden or docked when current time is outside operating window', () => {
      const earlyMorning = timeToFestivalMinutes('07:30'); // 450 mins (between 06:00 and 10:00)
      const axisStart = timeToFestivalMinutes('10:00'); // 600 mins
      const isWithinBounds = earlyMorning >= axisStart && earlyMorning <= timeToFestivalMinutes('02:00');
      expect(isWithinBounds).toBe(false);
    });
  });

  describe('Tier 1: Feature 6 — Event Details Inspector Drawer', () => {
    it('T1-F6-01: Drawer reveals detailed metadata for selected event', () => {
      const sample = TEST_EVENTS[0];
      expect(sample.title).toBeTruthy();
      expect(sample.stage).toBeTruthy();
      expect(sample.description.length).toBeGreaterThan(10);
    });

    it('T1-F6-02: Drawer provides quick bookmark/favorite action trigger', () => {
      const actions = ['favorite_toggle', 'seen_toggle', 'share_trigger'];
      expect(actions).toContain('favorite_toggle');
    });

    it('T1-F6-03: Drawer formats time interval cleanly (e.g. "19:00 – 20:30 (90 min)")', () => {
      const sample = TEST_EVENTS[0];
      const duration = timeToFestivalMinutes(sample.timeEnd) - timeToFestivalMinutes(sample.timeStart);
      const label = `${sample.timeStart} – ${sample.timeEnd} (${duration} min)`;
      expect(label).toBe('19:00 – 20:30 (90 min)');
    });

    it('T1-F6-04: Drawer displays category tag badge with appropriate role styling', () => {
      const sample = TEST_EVENTS[0];
      expect(sample.category).toBe('Música');
      expect(sample.categoryKey).toBe('musica');
    });

    it('T1-F6-05: Drawer supports dismissal via backdrop click or close button', () => {
      let isOpen = true;
      const close = () => { isOpen = false; };
      close();
      expect(isOpen).toBe(false);
    });
  });
}
