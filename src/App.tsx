/**
 * Festa do Avante! 2025 - Main Application Component
 * File: src/App.tsx
 *
 * App root integrating:
 * - Desktop & Mobile Header with export/import triggers
 * - Mobile fixed bottom nav
 * - Views: Grelha (/grelha), Lista (/lista), O Meu Horário (/o-meu-horario)
 * - Sharing: ExportModal, ImportModal, Toast system
 * - Startup URL query parameter import (?import=...) with silent overwrite
 *   and history.replaceState cleanup
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Header, ViewMode } from './components/common/Header';
import { BottomNav } from './components/common/BottomNav';
import { GrelhaView } from './components/grelha/GrelhaView';
import { ListaView } from './components/lista/ListaView';
import { HorarioView } from './components/horario/HorarioView';
import { EventDrawer } from './components/grelha/EventDrawer';
import { ExportModal } from './components/sharing/ExportModal';
import { ImportModal } from './components/sharing/ImportModal';
import { Toast, ToastData } from './components/common/Toast';
import { useSchedule } from './hooks/useSchedule';
import { useKeyboardShortcut } from './hooks/useKeyboardShortcut';
import { getFestivalDayFromDate } from './hooks/useFestivalTime';
import { normalizeDayKey } from './utils/conflictDetector';
import { FESTIVAL_EVENTS } from './data/program';
import { decodeSharePayload } from './utils/sharePayload';
import type { FestivalDay, FestivalEvent } from './types/program';

const getInitialFestivalDay = (): FestivalDay => {
  if (typeof window !== 'undefined') {
    try {
      const saved = sessionStorage.getItem('avante_selected_day') as FestivalDay | null;
      if (saved === 'sexta' || saved === 'sabado' || saved === 'domingo') {
        return saved;
      }
    } catch {}
  }
  return getFestivalDayFromDate(new Date());
};

const parseRouteFromLocation = (): ViewMode => {
  if (typeof window === 'undefined') return 'grelha';

  // 1. Check Hash Fragment first (primary routing for GitHub Pages SPA)
  const rawHash = window.location.hash.toLowerCase().replace(/^#/, '');
  const cleanHash = rawHash.split(/[?#/]/)[0];

  if (cleanHash === 'lista') return 'lista';
  if (cleanHash === 'horario' || cleanHash === 'o-meu-horario') return 'horario';
  if (cleanHash === 'grelha') return 'grelha';

  // 2. Check Pathname fallback (for dev server or direct path navigation)
  const rawPath = window.location.pathname.toLowerCase();
  const subPath = rawPath.replace(/^\/festaavanteagenda\/?/, '').split(/[?#/]/)[0];

  if (subPath === 'lista') return 'lista';
  if (subPath === 'horario' || subPath === 'o-meu-horario') return 'horario';
  if (subPath === 'grelha') return 'grelha';

  return 'grelha';
};

export const App: React.FC = () => {
  // 1. View Mode State with URL Hash Synchronization
  const [activeView, setActiveView] = useState<ViewMode>(parseRouteFromLocation);

  // 2. Global Festival Day State (Shared across all views & defaulted to today)
  const [selectedDay, setSelectedDay] = useState<FestivalDay>(getInitialFestivalDay);

  const handleSelectDay = useCallback((day: FestivalDay) => {
    setSelectedDay(day);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('avante_selected_day', day);
      } catch {}
    }
  }, []);

  // 3. Global Event Details Inspector Drawer (Opened across Grelha, Lista & Horário)
  const [selectedEvent, setSelectedEvent] = useState<FestivalEvent | null>(null);

  const handleOpenEventDrawer = useCallback((event: FestivalEvent | null) => {
    setSelectedEvent(event);
    if (event && typeof window !== 'undefined') {
      try {
        window.history.pushState({ modal: 'event-details', eventId: event.id }, '');
      } catch {}
    }
  }, []);

  const handleCloseEventDrawer = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.state?.modal === 'event-details') {
      window.history.back();
    } else {
      setSelectedEvent(null);
    }
  }, []);

  // Handle browser Back button closing drawer without losing scroll or view context
  useEffect(() => {
    const handlePopState = () => {
      if (selectedEvent) {
        setSelectedEvent(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedEvent]);

  const [searchQuery, setSearchQuery] = useState('');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // 4. Sharing & Import/Export Modal States
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  // 5. Global Toast State
  const [toast, setToast] = useState<ToastData | null>(null);

  const showToast = useCallback(
    (message: string, type: 'success' | 'info' | 'error' | 'warning' = 'info') => {
      setToast({ id: Date.now(), message, type });
    },
    []
  );

  // 6. User Schedule State & Conflicts Engine
  const schedule = useSchedule();

  // 7. Track window scroll positions across views
  const scrollPositions = useRef<Record<ViewMode, number>>({
    grelha: 0,
    lista: 0,
    horario: 0,
  });

  // Track Grelha 2D matrix scroll position
  const grelhaScrollPosRef = useRef<{ left: number; top: number }>({ left: -1, top: -1 });

  // Sync state to URL hash and restore scroll position
  const handleViewChange = useCallback((nextView: ViewMode) => {
    if (typeof window !== 'undefined') {
      scrollPositions.current[activeView] = window.scrollY;
    }
    setActiveView(nextView);
    const targetHash = nextView === 'horario' ? 'o-meu-horario' : nextView;
    if (window.location.hash !== `#${targetHash}`) {
      window.location.hash = targetHash;
    }
    requestAnimationFrame(() => {
      const savedY = scrollPositions.current[nextView] || 0;
      window.scrollTo({ top: savedY, behavior: 'instant' });
    });
  }, [activeView]);

  // Listen to browser hash changes (back/forward navigation)
  useEffect(() => {
    const handleHashChange = () => {
      const nextView = parseRouteFromLocation();
      setActiveView((prevView) => {
        if (prevView !== nextView) {
          if (typeof window !== 'undefined') {
            scrollPositions.current[prevView] = window.scrollY;
          }
          requestAnimationFrame(() => {
            const savedY = scrollPositions.current[nextView] || 0;
            window.scrollTo({ top: savedY, behavior: 'instant' });
          });
        }
        return nextView;
      });
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // 8. Startup URL Query Parameter Import (?import=...) (T1-F23-01 to T1-F23-05)
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const searchParams = new URLSearchParams(window.location.search);
      let importParam = searchParams.get('import');

      // Fallback: check if import is embedded in hash fragment (e.g., #lista?import=... or #?import=...)
      if (!importParam && window.location.hash.includes('import=')) {
        const hashQueryIndex = window.location.hash.indexOf('?');
        if (hashQueryIndex !== -1) {
          const hashParams = new URLSearchParams(window.location.hash.slice(hashQueryIndex));
          importParam = hashParams.get('import');
        }
      }

      if (importParam) {
        // Decode share payload
        const importedData = decodeSharePayload(importParam);

        // Rule: Silent Direct Overwrite (T1-F24-01, T2-F24-04)
        schedule.replaceSchedule(importedData);

        // Sanitize URL query param to prevent re-importing on page reload (T1-F23-03, T2-F23-04)
        const url = new URL(window.location.href);
        url.searchParams.delete('import');
        const searchStr = url.searchParams.toString();
        let cleanHash = url.hash;
        if (cleanHash.includes('import=')) {
          const qIdx = cleanHash.indexOf('?');
          cleanHash = cleanHash.slice(0, qIdx);
        }
        const cleanUrl = url.pathname + (searchStr ? `?${searchStr}` : '') + (cleanHash || '');
        window.history.replaceState({}, '', cleanUrl);

        // Switch to Horário view
        handleViewChange('horario');

        // Toast feedback (T1-F23-05)
        showToast('Horário partilhado importado com sucesso!', 'success');
      }
    } catch (err) {
      console.warn('Falha ao importar agenda do parâmetro URL:', err);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('import');
        const searchStr = url.searchParams.toString();
        let cleanHash = url.hash;
        if (cleanHash.includes('import=')) {
          const qIdx = cleanHash.indexOf('?');
          cleanHash = cleanHash.slice(0, qIdx);
        }
        const cleanUrl = url.pathname + (searchStr ? `?${searchStr}` : '') + (cleanHash || '');
        window.history.replaceState({}, '', cleanUrl);
      }
    }
  }, [schedule, handleViewChange, showToast]);

  // Network Online/Offline Listeners
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Global '/' Keyboard Shortcut for Search Focus
  useKeyboardShortcut({
    searchInputRef,
    onTrigger: () => {
      if (activeView !== 'lista') {
        handleViewChange('lista');
      }
    },
    onEscape: () => {
      setSearchQuery('');
    },
  });

  // Find conflicting events for selectedEvent
  const selectedEventConflicts = useMemo(() => {
    if (!selectedEvent) return [];
    const eventDay = normalizeDayKey(selectedEvent.day || selectedEvent.date || selectedDay);
    const report = schedule.getConflictsForDay(eventDay, FESTIVAL_EVENTS);
    const pairs = report.conflictsByEventId.get(selectedEvent.id) || [];
    return pairs.map((p) => (p.eventA.id === selectedEvent.id ? p.eventB : p.eventA));
  }, [selectedEvent, selectedDay, schedule]);

  return (
    <div className="min-h-screen bg-surface-base text-text-primary flex flex-col font-sans selection:bg-brand-crimson selection:text-text-primary antialiased">
      {/* Top Desktop & Mobile Header with Sharing Triggers */}
      <Header
        activeView={activeView}
        onViewChange={handleViewChange}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchFocus={() => {
          if (activeView !== 'lista') handleViewChange('lista');
        }}
        isOffline={isOffline}
        savedCount={schedule.unseenSavedCount}
        searchInputRef={searchInputRef}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenImport={() => setIsImportOpen(true)}
      />

      {/* Main View Area with Preserved Views to keep DOM & Scroll Context */}
      <main className="flex-1 pt-20 pb-24 md:pb-12 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        {/* VIEW 1: GRELHA DE PALCOS (/grelha) */}
        {activeView === 'grelha' && (
          <GrelhaView
            events={FESTIVAL_EVENTS}
            favorites={schedule.favorites}
            seen={schedule.seen}
            toggleFavorite={schedule.toggleFavorite}
            toggleSeen={schedule.toggleSeen}
            isFavorite={schedule.isFavorite}
            isSeen={schedule.isSeen}
            hasConflict={schedule.hasConflict}
            getConflictsForDay={schedule.getConflictsForDay}
            resolveConflict={schedule.resolveConflict}
            selectedDay={selectedDay}
            onSelectDay={handleSelectDay}
            selectedEvent={selectedEvent}
            onSelectEvent={handleOpenEventDrawer}
            initialScrollPos={grelhaScrollPosRef.current}
            onSaveScrollPos={(pos) => {
              grelhaScrollPosRef.current = pos;
            }}
          />
        )}

        {/* VIEW 2: LISTA CRONOLÓGICA (/lista) */}
        {activeView === 'lista' && (
          <ListaView
            events={FESTIVAL_EVENTS}
            favorites={schedule.favorites}
            seen={schedule.seen}
            toggleFavorite={schedule.toggleFavorite}
            toggleSeen={schedule.toggleSeen}
            isFavorite={schedule.isFavorite}
            isSeen={schedule.isSeen}
            hasConflict={schedule.hasConflict}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedDay={selectedDay}
            onSelectDay={handleSelectDay}
            onSelectEvent={handleOpenEventDrawer}
          />
        )}

        {/* VIEW 3: O MEU HORÁRIO (/o-meu-horario) */}
        {activeView === 'horario' && (
          <HorarioView
            events={FESTIVAL_EVENTS}
            favorites={schedule.favorites}
            seen={schedule.seen}
            toggleFavorite={schedule.toggleFavorite}
            toggleSeen={schedule.toggleSeen}
            isFavorite={schedule.isFavorite}
            isSeen={schedule.isSeen}
            hasConflict={schedule.hasConflict}
            getConflictsForDay={schedule.getConflictsForDay}
            resolveConflict={schedule.resolveConflict}
            selectedDay={selectedDay}
            onSelectDay={handleSelectDay}
            onSelectEvent={handleOpenEventDrawer}
            onNavigateGrelha={() => handleViewChange('grelha')}
            onNavigateLista={() => handleViewChange('lista')}
            onOpenExport={() => setIsExportOpen(true)}
            onOpenImport={() => setIsImportOpen(true)}
          />
        )}
      </main>

      {/* Global Event Details Inspector Drawer */}
      <EventDrawer
        event={selectedEvent}
        isOpen={selectedEvent !== null}
        onClose={handleCloseEventDrawer}
        isFavorite={selectedEvent ? schedule.isFavorite(selectedEvent.id) : false}
        isSeen={selectedEvent ? schedule.isSeen(selectedEvent.id) : false}
        hasConflict={selectedEvent ? schedule.hasConflict(selectedEvent.id, selectedDay, FESTIVAL_EVENTS) : false}
        conflictingEvents={selectedEventConflicts}
        onToggleFavorite={schedule.toggleFavorite}
        onToggleSeen={schedule.toggleSeen}
        onResolveConflict={schedule.resolveConflict}
      />

      {/* Mobile Fixed Bottom Navigation Bar */}
      <BottomNav
        activeView={activeView}
        onViewChange={handleViewChange}
        savedCount={schedule.unseenSavedCount}
      />

      {/* Sharing Modals */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        favorites={schedule.favorites}
        seen={schedule.seen}
        events={FESTIVAL_EVENTS}
        onToast={showToast}
      />

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportSuccess={(data) => {
          schedule.replaceSchedule(data);
          handleViewChange('horario');
        }}
        onToast={showToast}
      />

      {/* Global Toast Feedback Provider */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* Desktop Persistent Footer */}
      <footer className="hidden xl:block py-6 border-t border-border-subtle bg-surface text-center text-text-muted text-xs mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <div>
            Festa do Avante! 2025 • Quinta da Atalaia, Seixal • 5, 6 e 7 de Setembro
          </div>
          <div className="flex items-center gap-4 font-medium">
            <span>PWA Offline-First</span>
            <span>•</span>
            <span className="text-tertiary flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-tertiary"></span>
              Cache Ativa
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
