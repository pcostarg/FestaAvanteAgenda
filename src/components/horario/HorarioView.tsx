import React, { useState, useMemo } from 'react';
import type { FestivalEvent, FestivalDay, EventCategory } from '../../types/program';
import type { ConflictResolutionAction, ConflictReport } from '../../types/schedule';
import { FESTIVAL_EVENTS } from '../../data/program';
import { DaySwitcher } from '../lista/DaySwitcher';
import { EventCard } from '../lista/EventCard';
import { ConflictWarningBanner } from './ConflictWarningBanner';
import { ConflictResolutionModal } from './ConflictResolutionModal';
import { EmptyHorarioState } from './EmptyHorarioState';
import { normalizeDayKey, timeToFestivalMinutes } from '../../utils/conflictDetector';
import { getFestivalDayFromDate } from '../../hooks/useFestivalTime';
import { Share2, Download, EyeOff, Sparkles } from 'lucide-react';

export interface HorarioViewProps {
  events?: FestivalEvent[];
  favorites: string[];
  seen: string[];
  toggleFavorite: (id: string) => void;
  toggleSeen: (id: string) => void;
  isFavorite: (id: string) => boolean;
  isSeen: (id: string) => boolean;
  resolveConflict: (action: ConflictResolutionAction, eventAId: string, eventBId: string) => void;
  getConflictsForDay: (dayDateOrSlug: string, allEvents: FestivalEvent[]) => ConflictReport;
  hasConflict: (id: string, dayDateOrSlug: string, allEvents: FestivalEvent[]) => boolean;
  onNavigateGrelha: () => void;
  onNavigateLista: () => void;
  onOpenExport?: () => void;
  onOpenImport?: () => void;
  onSelectEvent?: (event: FestivalEvent) => void;
  selectedDay?: FestivalDay;
  onSelectDay?: (day: FestivalDay) => void;
}

export const HorarioView: React.FC<HorarioViewProps> = ({
  events = FESTIVAL_EVENTS,
  favorites: _favorites,
  seen: _seen,
  toggleFavorite,
  toggleSeen,
  isFavorite,
  isSeen,
  resolveConflict,
  getConflictsForDay,
  hasConflict,
  onNavigateGrelha,
  onNavigateLista,
  onOpenExport,
  onOpenImport,
  onSelectEvent,
  selectedDay: propSelectedDay,
  onSelectDay,
}) => {
  const [localSelectedDay, setLocalSelectedDay] = useState<FestivalDay>(() => getFestivalDayFromDate(new Date()));
  const selectedDay = propSelectedDay ?? localSelectedDay;

  const handleDaySwitch = (day: FestivalDay) => {
    if (onSelectDay) {
      onSelectDay(day);
    } else {
      setLocalSelectedDay(day);
    }
  };

  const [hideSeen, setHideSeen] = useState<boolean>(false);
  const [isResolverOpen, setIsResolverOpen] = useState<boolean>(false);

  // 1. Compute day counts strictly for favorited acts (per T1-F9-02, T2-F9-05)
  const favoritedDayCounts = useMemo(() => {
    const counts: Record<FestivalDay, number> = {
      sexta: 0,
      sabado: 0,
      domingo: 0,
    };
    for (const ev of events) {
      if (isFavorite(ev.id)) {
        const d = normalizeDayKey(ev.day || ev.date || ev.dayCode || '');
        counts[d] = (counts[d] || 0) + 1;
      }
    }
    return counts;
  }, [events, isFavorite]);

  // 2. All favorited events on selected day
  const favoritedEventsOnDay = useMemo(() => {
    return events.filter((e) => {
      const matchesDay = normalizeDayKey(e.day || e.date || e.dayCode || '') === selectedDay;
      return matchesDay && isFavorite(e.id);
    });
  }, [events, selectedDay, isFavorite]);

  // 3. Category breakdown on selected day (sum equals total favorited, per T2-F9-04)
  const categoryBreakdown = useMemo(() => {
    const breakdown: Partial<Record<EventCategory, number>> = {};
    for (const ev of favoritedEventsOnDay) {
      breakdown[ev.category] = (breakdown[ev.category] || 0) + 1;
    }
    return breakdown;
  }, [favoritedEventsOnDay]);

  // 4. Sorted chronologically using continuous festival minutes
  const sortedFavoritedEvents = useMemo(() => {
    return [...favoritedEventsOnDay].sort((a, b) => {
      const timeA = timeToFestivalMinutes(a.startTime || a.timeStart || '00:00');
      const timeB = timeToFestivalMinutes(b.startTime || b.timeStart || '00:00');
      return timeA - timeB;
    });
  }, [favoritedEventsOnDay]);

  // 5. Apply "Ocultar já vistos" filter
  const visibleEvents = useMemo(() => {
    if (!hideSeen) return sortedFavoritedEvents;
    return sortedFavoritedEvents.filter((ev) => !isSeen(ev.id));
  }, [sortedFavoritedEvents, hideSeen, isSeen]);

  // 6. Conflicts on selected day (always computed across all favorited acts, even if seen is hidden per T3-PAIR-05)
  const conflictReport = useMemo(() => {
    return getConflictsForDay(selectedDay, events);
  }, [getConflictsForDay, selectedDay, events]);

  const allSeenHiddenOnDay =
    hideSeen &&
    favoritedEventsOnDay.length > 0 &&
    visibleEvents.length === 0;

  return (
    <div className="space-y-4">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border-subtle">
        <div>
          <h1 className="font-display font-extrabold text-2xl md:text-3xl text-text-primary tracking-tight">
            O Meu Horário
          </h1>
          <p className="text-text-secondary text-xs md:text-sm mt-0.5">
            A tua agenda personalizada com deteção automática de sobreposições.
          </p>
        </div>

        {/* Action Triggers: Day Switcher & Share/Import */}
        <div className="flex flex-wrap items-center gap-2">
          <DaySwitcher
            activeDay={selectedDay}
            onDayChange={handleDaySwitch}
            counts={favoritedDayCounts}
          />

          <div className="flex items-center gap-1.5 pl-1 border-l border-border-subtle">
            {onOpenExport && (
              <button
                type="button"
                onClick={onOpenExport}
                className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-card rounded-xl border border-border-subtle transition-colors flex items-center gap-1.5 text-xs font-semibold"
                title="Partilhar ou exportar agenda"
                aria-label="Partilhar ou exportar agenda"
              >
                <Share2 className="w-4 h-4 text-brand-amber" />
                <span className="hidden md:inline">Partilhar</span>
              </button>
            )}

            {onOpenImport && (
              <button
                type="button"
                onClick={onOpenImport}
                className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-card rounded-xl border border-border-subtle transition-colors flex items-center gap-1.5 text-xs font-semibold"
                title="Importar agenda"
                aria-label="Importar agenda"
              >
                <Download className="w-4 h-4 text-stage-blue" />
                <span className="hidden md:inline">Importar</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Metric Banner: Total Count & Category Breakdown */}
      {favoritedEventsOnDay.length > 0 && (
        <div className="p-4 rounded-xl bg-surface-card border border-border-subtle flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold text-brand-crimson-bright bg-surface-container px-3 py-1 rounded-lg border border-border-subtle font-mono">
              {favoritedEventsOnDay.length}{' '}
              {favoritedEventsOnDay.length === 1
                ? 'Atividade Selecionada'
                : 'Atividades Selecionadas'}
            </span>

            {/* Category breakdown tags */}
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-text-muted">
              <span>•</span>
              {Object.entries(categoryBreakdown).map(([cat, count]) => (
                <span key={cat} className="bg-surface-container/60 px-2 py-0.5 rounded text-[11px] font-medium">
                  {cat}: {count}
                </span>
              ))}
            </div>
          </div>

          {/* Hide Seen Switch */}
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-text-secondary hover:text-text-primary self-start md:self-auto">
            <input
              type="checkbox"
              checked={hideSeen}
              onChange={(e) => setHideSeen(e.target.checked)}
              className="sr-only peer"
              aria-label="Ocultar eventos já vistos"
            />
            <div className="w-8 h-4 bg-surface-container peer-focus:outline-none rounded-full relative peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-secondary after:border-border-subtle after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-tertiary peer-checked:after:bg-white" />
            <span className="flex items-center gap-1 text-[11px] font-semibold">
              <EyeOff className="w-3.5 h-3.5" />
              Ocultar já vistos
            </span>
          </label>
        </div>
      )}

      {/* Conflict Warning Banner */}
      {conflictReport.hasConflicts && (
        <ConflictWarningBanner
          report={conflictReport}
          onOpenResolver={() => setIsResolverOpen(true)}
        />
      )}

      {/* Schedule Content */}
      {favoritedEventsOnDay.length === 0 ? (
        <EmptyHorarioState
          onNavigateGrelha={onNavigateGrelha}
          onNavigateLista={onNavigateLista}
        />
      ) : allSeenHiddenOnDay ? (
        <EmptyHorarioState
          isAllSeenHidden={true}
          onShowSeen={() => setHideSeen(false)}
          onNavigateGrelha={onNavigateGrelha}
          onNavigateLista={onNavigateLista}
        />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-amber" />
              Itinerário Diário ({visibleEvents.length})
            </span>
          </div>

          <div className="space-y-2.5">
            {visibleEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                isFavorite={true}
                isSeen={isSeen(event.id)}
                hasConflict={hasConflict(event.id, selectedDay, events)}
                onToggleFavorite={toggleFavorite}
                onToggleSeen={toggleSeen}
                onSelect={onSelectEvent}
              />
            ))}
          </div>
        </div>
      )}

      {/* Conflict Resolution Modal */}
      <ConflictResolutionModal
        isOpen={isResolverOpen}
        onClose={() => setIsResolverOpen(false)}
        report={conflictReport}
        onResolve={(action, evAId, evBId) => {
          resolveConflict(action, evAId, evBId);
        }}
      />
    </div>
  );
};
