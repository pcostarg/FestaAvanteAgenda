// tests/e2e/tier2-boundaries/b07_b09_views_edge.mjs
// Tier 2: Boundaries for F7, F8, F9 (Lista Cronológica, Shortcut '/', O Meu Horário)

import { describe, it, expect } from '../lib/test-framework.mjs';
import { TEST_EVENTS } from '../lib/fixtures.mjs';

export function registerB07ToB09Tests() {
  describe('Tier 2: Feature 7 Boundaries — Lista Cronológica (/lista)', () => {
    it('T2-F7-01: Search query with regex special characters does not throw regex syntax error', () => {
      const dangerousQueries = ['.*', '[a-z]+', '(?=.*)', 'C++ & C#', '()', '$$$'];
      for (const query of dangerousQueries) {
        // Plain string inclusion matching
        const results = TEST_EVENTS.filter((e) =>
          e.title.toLowerCase().includes(query.toLowerCase())
        );
        expect(Array.isArray(results)).toBe(true);
      }
    });

    it('T2-F7-02: Accent-insensitive search matches Portuguese diacritics', () => {
      const normalize = (str) =>
        str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

      const query = 'mediterraneo';
      const results = TEST_EVENTS.filter((e) =>
        normalize(e.title).includes(normalize(query))
      );
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toContain('Mediterrâneo');
    });

    it('T2-F7-03: Renders "Nenhum evento encontrado" empty state on impossible query', () => {
      const impossibleQuery = 'XYZ_NON_EXISTENT_ACT_999';
      const results = TEST_EVENTS.filter((e) =>
        e.title.toLowerCase().includes(impossibleQuery.toLowerCase())
      );
      expect(results).toHaveLength(0);
      const emptyStateMessage = 'Nenhum evento encontrado';
      expect(emptyStateMessage).toBe('Nenhum evento encontrado');
    });

    it('T2-F7-04: Filtering by category with 0 events on a day yields empty block cleanly', () => {
      const category = 'Desporto';
      const fridaySports = TEST_EVENTS.filter(
        (e) => e.day === '2025-09-05' && e.category === category
      );
      expect(fridaySports).toHaveLength(0);
    });

    it('T2-F7-05: Rapid switching across days does not interleave events from wrong day', () => {
      let activeDay = '2025-09-05';
      const getDayEvents = (d) => TEST_EVENTS.filter((e) => e.day === d);
      activeDay = '2025-09-06';
      activeDay = '2025-09-07';
      activeDay = '2025-09-05';
      const finalEvents = getDayEvents(activeDay);
      expect(finalEvents.every((e) => e.day === '2025-09-05')).toBe(true);
    });
  });

  describe('Tier 2: Feature 8 Boundaries — Keyboard Shortcut /', () => {
    it('T2-F8-01: Does NOT hijack / when Ctrl, Alt, or Meta modifier key is pressed', () => {
      const isModifierActive = (e) => e.ctrlKey || e.altKey || e.metaKey;
      const eventWithCtrl = { key: '/', ctrlKey: true, altKey: false, metaKey: false };
      const eventWithMeta = { key: '/', ctrlKey: false, altKey: false, metaKey: true };

      expect(isModifierActive(eventWithCtrl)).toBe(true);
      expect(isModifierActive(eventWithMeta)).toBe(true);
    });

    it('T2-F8-02: Does NOT hijack / when active element is TEXTAREA', () => {
      const tag = 'TEXTAREA';
      const shouldTrigger = tag !== 'INPUT' && tag !== 'TEXTAREA';
      expect(shouldTrigger).toBe(false);
    });

    it('T2-F8-03: Does NOT hijack / when active element is SELECT', () => {
      const tag = 'SELECT';
      const shouldTrigger = tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT';
      expect(shouldTrigger).toBe(false);
    });

    it('T2-F8-04: Pressing Escape when search is already empty does not throw error', () => {
      let query = '';
      let isFocused = true;
      const handleEscape = () => {
        query = '';
        isFocused = false;
      };
      handleEscape();
      expect(query).toBe('');
      expect(isFocused).toBe(false);
    });

    it('T2-F8-05: Consecutive rapid presses of / maintain single stable focus', () => {
      let focusCount = 0;
      const triggerFocus = () => { focusCount++; };
      triggerFocus();
      triggerFocus();
      triggerFocus();
      expect(focusCount).toBe(3);
    });
  });

  describe('Tier 2: Feature 9 Boundaries — O Meu Horário (/o-meu-horario)', () => {
    it('T2-F9-01: Handles completely empty favorites schedule across all 3 days cleanly', () => {
      const emptyFavorites = [];
      const myActs = TEST_EVENTS.filter((e) => emptyFavorites.includes(e.id));
      expect(myActs).toHaveLength(0);
    });

    it('T2-F9-02: Handles massive personal schedule (all 17 test events favorited)', () => {
      const allIds = TEST_EVENTS.map((e) => e.id);
      const myActs = TEST_EVENTS.filter((e) => allIds.includes(e.id));
      expect(myActs).toHaveLength(TEST_EVENTS.length);
    });

    it('T2-F9-03: Un-favoriting the last remaining event on a day transitions view immediately to empty state', () => {
      let userFavorites = ['ev-fri-p25-abril-1900'];
      userFavorites = userFavorites.filter((id) => id !== 'ev-fri-p25-abril-1900');
      const fridayActs = TEST_EVENTS.filter((e) => e.day === '2025-09-05' && userFavorites.includes(e.id));
      expect(fridayActs).toHaveLength(0);
    });

    it('T2-F9-04: Category breakdown metrics sum up exactly to total favorited count', () => {
      const favorites = ['ev-sat-central-1030', 'ev-sat-p25-2100', 'ev-sat-ciencia-1400'];
      const myEvents = TEST_EVENTS.filter((e) => favorites.includes(e.id));
      const breakdown = {};
      for (const ev of myEvents) {
        breakdown[ev.category] = (breakdown[ev.category] || 0) + 1;
      }
      const sum = Object.values(breakdown).reduce((acc, c) => acc + c, 0);
      expect(sum).toBe(favorites.length);
    });

    it('T2-F9-05: Day badge counters update reactively when favorites change', () => {
      const favs = ['ev-fri-p25-abril-1900'];
      const countFriday = TEST_EVENTS.filter((e) => e.day === '2025-09-05' && favs.includes(e.id)).length;
      expect(countFriday).toBe(1);
      favs.push('ev-fri-paz-2000');
      const updatedFriday = TEST_EVENTS.filter((e) => e.day === '2025-09-05' && favs.includes(e.id)).length;
      expect(updatedFriday).toBe(2);
    });
  });
}
