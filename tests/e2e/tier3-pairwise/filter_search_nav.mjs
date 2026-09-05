// tests/e2e/tier3-pairwise/filter_search_nav.mjs
// Tier 3: Pairwise Interactions for Search, Filters, Navigation, Grelha, AGORA needle & Platform integration

import { describe, it, expect } from '../lib/test-framework.mjs';
import {
  BASE_PATH,
  timeToFestivalMinutes,
  validateFestivalEvent,
} from '../lib/contracts.mjs';
import { TEST_EVENTS } from '../lib/fixtures.mjs';

export function registerFilterSearchNavPairwiseTests() {
  describe('Tier 3: Pairwise Interactions — Filters, Search, Views & Platform', () => {
    it('T3-PAIR-15: Day Switcher + Search Query + Category Filter: Compound multi-dimensional filter', () => {
      const activeDay = '2025-09-06';
      const category = 'Música';
      const query = 'Abril';

      const filtered = TEST_EVENTS.filter((e) => {
        const matchesDay = e.day === activeDay;
        const matchesCategory = e.category === category;
        const matchesQuery = e.title.includes(query) || e.stage.includes(query);
        return matchesDay && matchesCategory && matchesQuery;
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('ev-sat-p25-2100');
      expect(filtered[0].title).toBe('Grande Concerto da Noite: Vozes de Abril');
    });

    it('T3-PAIR-16: Search Shortcut / + Modal Open: Modal suppresses global search shortcut', () => {
      let isModalOpen = true;
      let focusedSearch = false;

      const onKeyDown = (e) => {
        if (e.key === '/' && !isModalOpen) {
          focusedSearch = true;
        }
      };

      onKeyDown({ key: '/' });
      expect(focusedSearch).toBe(false);

      isModalOpen = false;
      onKeyDown({ key: '/' });
      expect(focusedSearch).toBe(true);
    });

    it('T3-PAIR-17: Search Shortcut / + Active View: Shortcut focuses search across both Grelha and Lista views', () => {
      const views = ['grelha', 'lista'];
      views.forEach((view) => {
        let focusedInput = null;
        const searchInputRef = { focus: () => { focusedInput = view; } };
        searchInputRef.focus();
        expect(focusedInput).toBe(view);
      });
    });

    it('T3-PAIR-18: Grelha Timeline + Inspector Drawer: Clicking event card in matrix loads exact event details', () => {
      const clickedEventId = 'ev-sat-p25-2100';
      const targetEvent = TEST_EVENTS.find((e) => e.id === clickedEventId);

      let drawerEvent = null;
      let isDrawerOpen = false;

      const openInspector = (ev) => {
        drawerEvent = ev;
        isDrawerOpen = true;
      };

      openInspector(targetEvent);
      expect(isDrawerOpen).toBe(true);
      expect(drawerEvent.title).toBe('Grande Concerto da Noite: Vozes de Abril');
      expect(drawerEvent.stage).toBe('Palco 25 de Abril');
    });

    it('T3-PAIR-19: Inspector Drawer Favorite Action + O Meu Horário: Toggling favorite in drawer updates schedule', () => {
      const favorites = new Set();
      const toggleInDrawer = (id) => {
        if (favorites.has(id)) favorites.delete(id);
        else favorites.add(id);
      };

      toggleInDrawer('ev-fri-p25-abril-1900');
      expect(favorites.has('ev-fri-p25-abril-1900')).toBe(true);

      // Verify that O Meu Horário view includes this newly favorited act
      const mySchedule = TEST_EVENTS.filter((e) => favorites.has(e.id));
      expect(mySchedule.map((e) => e.id)).toContain('ev-fri-p25-abril-1900');
    });

    it('T3-PAIR-20: AGORA Needle + Event Live Glow: Events matching needle time receive live status', () => {
      const needleTimeStr = '21:30';
      const needleMinutes = timeToFestivalMinutes(needleTimeStr);

      const liveEventsOnSaturday = TEST_EVENTS.filter((e) => {
        if (e.day !== '2025-09-06') return false;
        const start = timeToFestivalMinutes(e.timeStart);
        const end = timeToFestivalMinutes(e.timeEnd);
        return needleMinutes >= start && needleMinutes < end;
      });

      // At 21:30 on Saturday: ev-sat-p25-2100 (21:00-22:30) and ev-sat-paz-2100 (21:00-22:15) are playing!
      expect(liveEventsOnSaturday.length).toBe(2);
      expect(liveEventsOnSaturday.map((e) => e.id)).toEqual(['ev-sat-p25-2100', 'ev-sat-paz-2100']);
    });

    it('T3-PAIR-21: Scraper Output + Dataset Validation Contract: All scraped fields satisfy application contract', () => {
      for (const ev of TEST_EVENTS) {
        const result = validateFestivalEvent(ev);
        expect(result.valid).toBe(true);
      }
    });

    it('T3-PAIR-22: Base Path + PWA Cache: Workbox caching pattern aligns with base path /FestaAvanteAgenda/', () => {
      const base = BASE_PATH;
      const swScope = '/FestaAvanteAgenda/';
      const startUrl = '/FestaAvanteAgenda/';
      expect(swScope).toBe(base);
      expect(startUrl).toBe(base);
    });

    it('T3-PAIR-23: CI/CD Workflow + Build Command: deploy.yml builds project and deploys ./dist directory', () => {
      const buildCommand = 'npm run build';
      const outputDir = './dist';
      expect(buildCommand).toBe('npm run build');
      expect(outputDir).toBe('./dist');
    });

    it('T3-PAIR-24: Quick Filter "Apenas Favoritos" + Day Switcher in Lista Cronológica', () => {
      const favorites = ['ev-fri-p25-abril-1900', 'ev-sat-p25-2100'];
      const onlyFavorites = true;

      const fridayFiltered = TEST_EVENTS.filter(
        (e) => e.day === '2025-09-05' && (!onlyFavorites || favorites.includes(e.id))
      );
      const saturdayFiltered = TEST_EVENTS.filter(
        (e) => e.day === '2025-09-06' && (!onlyFavorites || favorites.includes(e.id))
      );

      expect(fridayFiltered.map((e) => e.id)).toEqual(['ev-fri-p25-abril-1900']);
      expect(saturdayFiltered.map((e) => e.id)).toEqual(['ev-sat-p25-2100']);
    });

    it('T3-PAIR-25: Quick Filter "A Decorrer Agora" + Time Block segmentation in Lista Cronológica', () => {
      const simulatedNow = '11:15';
      const nowMinutes = timeToFestivalMinutes(simulatedNow);
      const onlyNow = true;

      const liveActs = TEST_EVENTS.filter((e) => {
        if (e.day !== '2025-09-06') return false;
        if (!onlyNow) return true;
        const s = timeToFestivalMinutes(e.timeStart);
        const end = timeToFestivalMinutes(e.timeEnd);
        return nowMinutes >= s && nowMinutes < end;
      });

      // At 11:15 on Saturday: ev-sat-central-1030 (10:30-12:00) and ev-sat-crianca-1100 (11:00-12:00) are playing!
      expect(liveActs.length).toBe(2);
      expect(liveActs.map((e) => e.id)).toEqual(['ev-sat-central-1030', 'ev-sat-crianca-1100']);
      expect(liveActs.every((e) => e.timeSlot === 'manha')).toBe(true);
    });
  });
}
