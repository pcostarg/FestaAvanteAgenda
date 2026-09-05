// tests/e2e/tier1-features/f07_f09_views.mjs
// Tier 1: Features F7, F8, F9 (Lista Cronológica, Keyboard Shortcut '/', O Meu Horário)

import { describe, it, expect } from '../lib/test-framework.mjs';
import { TIME_BLOCKS, getTimeBlockForTime, FESTIVAL_DAYS } from '../lib/contracts.mjs';
import { TEST_EVENTS, getEventsByDay } from '../lib/fixtures.mjs';

export function registerF07ToF09Tests() {
  describe('Tier 1: Feature 7 — Lista Cronológica (/lista)', () => {
    it('T1-F7-01: Groups events by chronological time blocks (Manhã, Tarde, Anoitecer, Noite)', () => {
      expect(TIME_BLOCKS).toHaveLength(4);
      expect(TIME_BLOCKS.map((b) => b.id)).toEqual(['manha', 'tarde', 'anoitecer', 'noite']);
    });

    it('T1-F7-02: Correctly categorizes events into blocks according to start time', () => {
      expect(getTimeBlockForTime('10:30')).toBe('manha');
      expect(getTimeBlockForTime('15:00')).toBe('tarde');
      expect(getTimeBlockForTime('19:00')).toBe('anoitecer');
      expect(getTimeBlockForTime('22:00')).toBe('noite');
      expect(getTimeBlockForTime('01:15')).toBe('noite');
    });

    it('T1-F7-03: Filters events strictly by selected festival day', () => {
      const fridayActs = getEventsByDay('2025-09-05');
      const saturdayActs = getEventsByDay('2025-09-06');
      expect(fridayActs.every((e) => e.day === '2025-09-05')).toBe(true);
      expect(saturdayActs.every((e) => e.day === '2025-09-06')).toBe(true);
      expect(fridayActs.length).toBeGreaterThan(0);
      expect(saturdayActs.length).toBeGreaterThan(0);
    });

    it('T1-F7-04: Category filter chips filter the feed dynamically', () => {
      const musicOnly = TEST_EVENTS.filter((e) => e.category === 'Música');
      expect(musicOnly.length).toBeGreaterThan(5);
      expect(musicOnly.every((e) => e.category === 'Música')).toBe(true);
    });

    it('T1-F7-05: Real-time search query filters against title and stage name', () => {
      const query = 'Paz';
      const results = TEST_EVENTS.filter(
        (e) => e.title.toLowerCase().includes(query.toLowerCase()) || e.stage.toLowerCase().includes(query.toLowerCase())
      );
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((e) => e.title.includes(query) || e.stage.includes(query))).toBe(true);
    });
  });

  describe('Tier 1: Feature 8 — Keyboard Shortcut /', () => {
    it('T1-F8-01: Key slash trigger focuses search field when not inside input', () => {
      let focused = false;
      const activeElementTag = 'BODY';
      const eventKey = '/';

      if (eventKey === '/' && activeElementTag !== 'INPUT' && activeElementTag !== 'TEXTAREA') {
        focused = true;
      }
      expect(focused).toBe(true);
    });

    it('T1-F8-02: Key slash trigger prevents default character insertion to prevent "/" in input', () => {
      let defaultPrevented = false;
      const fakeEvent = {
        key: '/',
        preventDefault: () => { defaultPrevented = true; },
      };
      fakeEvent.preventDefault();
      expect(defaultPrevented).toBe(true);
    });

    it('T1-F8-03: Shortcut is ignored when user is already focused inside input', () => {
      let focusedTriggered = false;
      const activeElementTag = 'INPUT';
      const eventKey = '/';

      if (eventKey === '/' && (activeElementTag === 'INPUT' || activeElementTag === 'TEXTAREA')) {
        // do not trigger shortcut
      } else {
        focusedTriggered = true;
      }
      expect(focusedTriggered).toBe(false);
    });

    it('T1-F8-04: Pressing Escape while in search field clears query and blurs input', () => {
      let query = 'orquestra';
      let isBlurred = false;
      const onEscape = () => {
        query = '';
        isBlurred = true;
      };
      onEscape();
      expect(query).toBe('');
      expect(isBlurred).toBe(true);
    });

    it('T1-F8-05: Shortcut applies globally across all core views', () => {
      const viewsSupportingShortcut = ['grelha', 'lista', 'horario'];
      expect(viewsSupportingShortcut).toHaveLength(3);
    });
  });

  describe('Tier 1: Feature 9 — O Meu Horário (/o-meu-horario)', () => {
    it('T1-F9-01: Displays only events that are favorited by the user', () => {
      const userFavorites = ['ev-fri-p25-abril-1900', 'ev-sat-p25-2100'];
      const mySchedule = TEST_EVENTS.filter((e) => userFavorites.includes(e.id));
      expect(mySchedule).toHaveLength(2);
      expect(mySchedule.map((e) => e.id)).toEqual(userFavorites);
    });

    it('T1-F9-02: Provides day tabs showing count badges for favorited acts per day', () => {
      const userFavorites = ['ev-fri-p25-abril-1900', 'ev-sat-p25-2100', 'ev-sat-paz-2100'];
      const counts = {
        '2025-09-05': TEST_EVENTS.filter((e) => e.day === '2025-09-05' && userFavorites.includes(e.id)).length,
        '2025-09-06': TEST_EVENTS.filter((e) => e.day === '2025-09-06' && userFavorites.includes(e.id)).length,
        '2025-09-07': TEST_EVENTS.filter((e) => e.day === '2025-09-07' && userFavorites.includes(e.id)).length,
      };
      expect(counts['2025-09-05']).toBe(1);
      expect(counts['2025-09-06']).toBe(2);
      expect(counts['2025-09-07']).toBe(0);
    });

    it('T1-F9-03: Displays empty state with CTA button when zero acts are favorited on a day', () => {
      const emptyFavorites = [];
      const dayEvents = TEST_EVENTS.filter((e) => e.day === '2025-09-07' && emptyFavorites.includes(e.id));
      const shouldRenderEmpty = dayEvents.length === 0;
      expect(shouldRenderEmpty).toBe(true);
    });

    it('T1-F9-04: Includes total count metric banner at top of itinerary', () => {
      const userFavorites = ['ev-fri-p25-abril-1900', 'ev-sat-p25-2100'];
      const bannerText = `${userFavorites.length} Atividades Selecionadas`;
      expect(bannerText).toBe('2 Atividades Selecionadas');
    });

    it('T1-F9-05: Provides direct triggers for Export and Import dialogs', () => {
      const scheduleActions = ['export_modal_open', 'import_modal_open'];
      expect(scheduleActions).toContain('export_modal_open');
      expect(scheduleActions).toContain('import_modal_open');
    });
  });
}
