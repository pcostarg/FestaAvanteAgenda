import type { Config } from 'tailwindcss';

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Avante Festival Pulse Surface & Elevation Hierarchy (OLED Dark Mode)
        'surface-base': '#0B0D0F',             // Deep canvas obsidian for OLED battery conservation
        'surface': '#111316',                  // Default body backplane and level 0 containers
        'surface-card': '#16191E',             // Level 1 surface for event cards, tracks, headers
        'surface-container-lowest': '#0C0E11', // Darkest recessed elements, badge backgrounds
        'surface-container-low': '#1A1C1F',    // Alternating matrix stage tracks, secondary wells
        'surface-container': '#1E2023',        // Interactive chip backgrounds, inactive tabs
        'surface-container-high': '#282A2D',   // Active tab background, card hover fill
        'surface-container-highest': '#333538',// Divider accents, active hover fills
        'surface-overlay': '#20252D',          // Active search drawers, modal dialogs, tooltips
        'surface-bright': '#37393D',           // Elevated popups and dialog boundaries

        // Borders & Delimiters
        'border-subtle': '#282E38',            // Level 1 crisp ghost borders (1px)
        'border-highlight': '#3F4756',         // Level 2 focused borders, active chips

        // Typography & Contrast Tones
        'text-primary': '#F8FAFC',             // High-contrast primary headers and text
        'text-secondary': '#94A3B8',           // Stage names, metadata, secondary copy
        'text-muted': '#64748B',               // Time codes, inactive icons, helper hints

        // Brand & Accent Colors
        'brand-crimson': '#D32F2F',            // Primary brand accent, selected day tab
        'brand-crimson-bright': '#E53935',     // Primary call-to-actions, active nav highlight
        'brand-amber': '#F59E0B',              // Debates, political talks, bookmarks, conflict warnings
        'stage-blue': '#2563EB',               // Palco 25 de Abril, Palco Paz, headliners
        'accent-orange': '#FA6E33',            // Cidade da Juventude, hip-hop, workshops
        'tertiary': '#4EDEA3',                 // Ciência, gastronomia regional, PWA synced indicator
        'tertiary-green': '#10B981',           // Emerald alternative
        'secondary': '#FFB59A',                // Desporto, tournaments, gymnastics
        'live-indicator': '#EF4444',           // "AO VIVO" / "AGORA" time needle, pulsing dots
        'error': '#FFB4AB',                    // Conflict error state, destructive actions
        'error-container': '#93000A',          // Conflict alert card background tint
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', 'monospace'],
      },
      fontSize: {
        'headline-xl': ['2.25rem', { lineHeight: '2.75rem', letterSpacing: '-0.02em', fontWeight: '800' }],
        'headline-xl-mobile': ['1.75rem', { lineHeight: '2.125rem', letterSpacing: '-0.02em', fontWeight: '800' }],
        'headline-lg': ['1.75rem', { lineHeight: '2.25rem', letterSpacing: '-0.015em', fontWeight: '700' }],
        'headline-lg-mobile': ['1.375rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em', fontWeight: '700' }],
        'headline-md': ['1.25rem', { lineHeight: '1.625rem', letterSpacing: '-0.01em', fontWeight: '700' }],
        'headline-sm': ['1rem', { lineHeight: '1.375rem', fontWeight: '700' }],
        'body-lg': ['1rem', { lineHeight: '1.5rem', fontWeight: '400' }],
        'body-md': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '400' }],
        'body-sm': ['0.75rem', { lineHeight: '1rem', fontWeight: '400' }],
        'label-lg': ['0.875rem', { lineHeight: '1.125rem', fontWeight: '600' }],
        'label-md': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.02em', fontWeight: '600' }],
        'label-sm': ['0.625rem', { lineHeight: '0.875rem', letterSpacing: '0.04em', fontWeight: '700' }],
      },
      spacing: {
        'gutter-mobile': '0.75rem',            // 12px
        'gutter-desktop': '1.5rem',             // 24px
        'timeline-track-height': '4.5rem',      // 72px
        'timeline-time-col-width': '3.75rem',   // 60px
        'nav-bottom-height': '4rem',            // 64px (h-16)
        'header-desktop-height': '5rem',        // 80px (h-20)
        'header-mobile-height': '4rem',         // 64px (h-16)
      },
      boxShadow: {
        'live-glow': '0 0 16px -2px rgba(229, 57, 53, 0.35)',
        'conflict-glow': '0 0 24px -4px rgba(229, 57, 53, 0.25)',
        'bar-top': '0 1px 8px rgba(0, 0, 0, 0.5)',
        'bar-bottom': '0 -1px 8px rgba(0, 0, 0, 0.5)',
        'card-elevation': '0 4px 12px rgba(0, 0, 0, 0.4)',
      },
      borderRadius: {
        'card': '0.5rem',                       // 8px
        'card-lg': '0.75rem',                   // 12px
      },
      animation: {
        'pulse-live': 'pulse-live 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'pulse-live': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.4', transform: 'scale(1.05)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
