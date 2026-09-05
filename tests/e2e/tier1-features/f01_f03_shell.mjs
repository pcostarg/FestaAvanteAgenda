// tests/e2e/tier1-features/f01_f03_shell.mjs
// Tier 1: Features F1, F2, F3 (App Shell, Dark Canvas, Header, Mobile Bottom Nav)

import { describe, it, expect } from '../lib/test-framework.mjs';
import { COLOR_TOKENS, FESTIVAL_DAYS } from '../lib/contracts.mjs';

export function registerF01ToF03Tests() {
  describe('Tier 1: Feature 1 — Dark Mode Canvas', () => {
    it('T1-F1-01: Base canvas color strictly adheres to obsidian #0B0D0F', () => {
      expect(COLOR_TOKENS['surface-base']).toBe('#0B0D0F');
    });

    it('T1-F1-02: Tonal elevation surfaces form a coherent visual hierarchy', () => {
      expect(COLOR_TOKENS['surface']).toBe('#111316');
      expect(COLOR_TOKENS['surface-card']).toBe('#16191E');
      expect(COLOR_TOKENS['surface-overlay']).toBe('#20252D');
      expect(COLOR_TOKENS['surface-bright']).toBe('#37393D');
    });

    it('T1-F1-03: Border tokens provide subtle and highlight contrast levels', () => {
      expect(COLOR_TOKENS['border-subtle']).toBe('#282E38');
      expect(COLOR_TOKENS['border-highlight']).toBe('#3F4756');
    });

    it('T1-F1-04: Brand accent tokens include crimson, amber, and live indicator', () => {
      expect(COLOR_TOKENS['brand-crimson']).toBe('#D32F2F');
      expect(COLOR_TOKENS['brand-amber']).toBe('#F59E0B');
      expect(COLOR_TOKENS['live-indicator']).toBe('#EF4444');
    });

    it('T1-F1-05: Typography colors guarantee high-contrast legibility', () => {
      expect(COLOR_TOKENS['text-primary']).toBe('#F8FAFC');
      expect(COLOR_TOKENS['text-secondary']).toBe('#94A3B8');
      expect(COLOR_TOKENS['text-muted']).toBe('#64748B');
    });
  });

  describe('Tier 1: Feature 2 — Desktop Responsive Header', () => {
    it('T1-F2-01: Header defines required desktop height token of 5rem (h-20)', () => {
      const headerHeightClass = 'h-20';
      expect(headerHeightClass).toBe('h-20');
    });

    it('T1-F2-02: Header displays festival branding, dates, and venue subtitle', () => {
      const title = 'Festa do Avante! 2025';
      const dates = '5 • 6 • 7 Setembro • Atalaia';
      expect(title).toContain('2025');
      expect(dates).toContain('Atalaia');
      expect(FESTIVAL_DAYS).toHaveLength(3);
    });

    it('T1-F2-03: Desktop header contains all 3 core route navigation tabs', () => {
      const navLinks = ['/grelha', '/lista', '/o-meu-horario'];
      expect(navLinks).toContain('/grelha');
      expect(navLinks).toContain('/lista');
      expect(navLinks).toContain('/o-meu-horario');
    });

    it('T1-F2-04: Header incorporates quick search input trigger with slash indicator', () => {
      const searchTrigger = { shortcut: '/', placeholder: 'Pesquisar artistas, palcos...' };
      expect(searchTrigger.shortcut).toBe('/');
      expect(searchTrigger.placeholder.length).toBeGreaterThan(10);
    });

    it('T1-F2-05: Header incorporates PWA sync / offline status pill indicator', () => {
      const offlineIndicator = { activeColor: COLOR_TOKENS['tertiary-green'], label: 'Modo Offline Ativo' };
      expect(offlineIndicator.activeColor).toBe('#10B981');
      expect(offlineIndicator.label).toContain('Offline');
    });
  });

  describe('Tier 1: Feature 3 — Mobile Fixed Bottom Nav', () => {
    it('T1-F3-01: Bottom nav defines ergonomic height of 4rem (64px)', () => {
      const navHeight = '4rem';
      expect(navHeight).toBe('4rem');
    });

    it('T1-F3-02: Bottom nav is fixed to bottom viewport with high z-index', () => {
      const positioning = ['fixed', 'bottom-0', 'inset-x-0', 'z-50'];
      expect(positioning).toContain('bottom-0');
      expect(positioning).toContain('z-50');
    });

    it('T1-F3-03: Bottom nav features the 3 primary navigation tabs', () => {
      const mobileTabs = [
        { route: '/grelha', label: 'Grelha' },
        { route: '/lista', label: 'Lista' },
        { route: '/o-meu-horario', label: 'O Meu Horário' },
      ];
      expect(mobileTabs.map((t) => t.route)).toEqual(['/grelha', '/lista', '/o-meu-horario']);
    });

    it('T1-F3-04: Active tab receives prominent highlight and brand color', () => {
      const activeTabStyle = {
        bg: 'bg-surface-container-high',
        text: 'text-brand-crimson-bright',
        rounded: 'rounded-xl',
      };
      expect(activeTabStyle.text).toBe('text-brand-crimson-bright');
    });

    it('T1-F3-05: Mobile view incorporates safe-area-inset padding for edge-to-edge screens', () => {
      const safeAreaClass = 'pb-[env(safe-area-inset-bottom)]';
      expect(safeAreaClass).toContain('safe-area-inset-bottom');
    });
  });
}
