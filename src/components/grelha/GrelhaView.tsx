import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { FestivalDay, FestivalEvent } from '../../types/program';
import type { ConflictResolutionAction, ConflictReport } from '../../types/schedule';
import { PRIMARY_STAGES } from '../../types/program';
import { FESTIVAL_EVENTS } from '../../data/program';
import { TimeAxisHeader } from './TimeAxisHeader';
import { StageTrack } from './StageTrack';
import { AgoraNeedle } from './AgoraNeedle';
import { EventDrawer } from './EventDrawer';
import { useFestivalTime } from '../../hooks/useFestivalTime';
import { normalizeDayKey, getEventFestivalMinutes } from '../../utils/conflictDetector';

export type StageCategoryFilter = 'todos' | 'principais' | 'culturais' | 'regionais';

export interface GrelhaViewProps {
  events?: FestivalEvent[];
  favorites: string[];
  seen: string[];
  toggleFavorite: (id: string) => void;
  toggleSeen: (id: string) => void;
  isFavorite: (id: string) => boolean;
  isSeen: (id: string) => boolean;
  hasConflict: (id: string, dayDateOrSlug: string, allEvents: FestivalEvent[]) => boolean;
  getConflictsForDay?: (dayDateOrSlug: string, allEvents: FestivalEvent[]) => ConflictReport;
  resolveConflict?: (action: ConflictResolutionAction, evAId: string, evBId: string) => void;
}

function getStageCategory(stage: string): 'principais' | 'culturais' | 'regionais' {
  if (PRIMARY_STAGES.some((s) => s === stage || stage.includes(s) || s.includes(stage))) {
    return 'principais';
  }
  if (
    stage.includes('Pavilhão') ||
    stage.includes('Fado') ||
    stage.includes('Livro') ||
    stage.includes('Internacional')
  ) {
    return 'culturais';
  }
  return 'regionais';
}

const STAGE_FILTERS: { id: StageCategoryFilter; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'principais', label: 'Palcos Principais' },
  { id: 'culturais', label: 'Espaços Culturais' },
  { id: 'regionais', label: 'Pavilhões Regionais' },
];

export const GrelhaView: React.FC<GrelhaViewProps> = ({
  events = FESTIVAL_EVENTS,
  toggleFavorite,
  toggleSeen,
  isFavorite,
  isSeen,
  hasConflict,
  getConflictsForDay,
  resolveConflict,
}) => {
  const [selectedDay, setSelectedDay] = useState<FestivalDay>('sexta');
  const [selectedEvent, setSelectedEvent] = useState<FestivalEvent | null>(null);
  const [stageCategoryFilter, setStageCategoryFilter] = useState<StageCategoryFilter>('todos');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { currentTime, currentMinutes, isOperatingWindow, agoraPercentage, currentDay } = useFestivalTime();

  // Filter events for selected day
  const dayEvents = useMemo(() => {
    return events.filter((e) => normalizeDayKey(e.day || e.date || e.dayCode || '') === selectedDay);
  }, [events, selectedDay]);

  // Collect all unique stages present in the selected day's events
  const stagesForDay = useMemo(() => {
    const presentStages = new Set<string>();
    for (const ev of dayEvents) {
      if (ev.stage) presentStages.add(ev.stage);
    }
    return presentStages;
  }, [dayEvents]);

  // Determine list of stages to display based on category filter
  const { visibleStages, stageCounts } = useMemo(() => {
    const primaryList = [...PRIMARY_STAGES];
    const culturalList = Array.from(stagesForDay)
      .filter((s) => getStageCategory(s) === 'culturais')
      .sort((a, b) => a.localeCompare(b, 'pt'));
    const regionalList = Array.from(stagesForDay)
      .filter((s) => getStageCategory(s) === 'regionais')
      .sort((a, b) => a.localeCompare(b, 'pt'));

    const counts: Record<StageCategoryFilter, number> = {
      todos: primaryList.length + culturalList.length + regionalList.length,
      principais: primaryList.length,
      culturais: culturalList.length > 0 ? culturalList.length : 5,
      regionais: regionalList.length,
    };

    let list: string[];
    if (stageCategoryFilter === 'principais') {
      list = primaryList;
    } else if (stageCategoryFilter === 'culturais') {
      list = culturalList.length > 0
        ? culturalList
        : ['Espaço Fado', 'Festa do Livro', 'Espaço Internacional', 'Pavilhão da Mulher', 'Pavilhão dos Imigrantes'];
    } else if (stageCategoryFilter === 'regionais') {
      list = regionalList;
    } else {
      list = [...primaryList, ...culturalList, ...regionalList];
    }

    return { visibleStages: list, stageCounts: counts };
  }, [stagesForDay, stageCategoryFilter]);

  // Group events by visible stage
  const eventsByStage = useMemo(() => {
    const map = new Map<string, FestivalEvent[]>();
    for (const stage of visibleStages) {
      map.set(stage, []);
    }
    for (const ev of dayEvents) {
      if (map.has(ev.stage)) {
        map.get(ev.stage)!.push(ev);
      } else {
        // Match slight naming variations (e.g. CineAvante vs CineAvante!)
        const matched = visibleStages.find((s) => ev.stage.includes(s) || s.includes(ev.stage));
        if (matched) {
          map.get(matched)!.push(ev);
        } else {
          if (!map.has(ev.stage)) {
            map.set(ev.stage, []);
          }
          map.get(ev.stage)!.push(ev);
        }
      }
    }
    return map;
  }, [dayEvents, visibleStages]);

  // Compute conflict report for the current day
  const dayConflictReport = useMemo(() => {
    return getConflictsForDay ? getConflictsForDay(selectedDay, events) : null;
  }, [getConflictsForDay, selectedDay, events]);

  // Handle day switch: safely dismisses event drawer if event not on newly selected day
  const handleDaySwitch = (day: FestivalDay) => {
    setSelectedDay(day);
    if (selectedEvent && normalizeDayKey(selectedEvent.day || selectedEvent.date || '') !== day) {
      setSelectedEvent(null);
    }
  };

  // Find conflicting events for selectedEvent
  const selectedEventConflicts = useMemo(() => {
    if (!selectedEvent || !dayConflictReport) return [];
    const pairs = dayConflictReport.conflictsByEventId.get(selectedEvent.id) || [];
    return pairs.map((p) => (p.eventA.id === selectedEvent.id ? p.eventB : p.eventA));
  }, [selectedEvent, dayConflictReport]);

  const isToday = selectedDay === currentDay;

  // Track last scrolled day to avoid resetting user scroll position on clock ticks
  const lastScrolledDayRef = useRef<FestivalDay | null>(null);

  // Initial horizontal auto-scroll to current hour or 10:00/first event, while allowing scrolling back to 08:00
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    if (lastScrolledDayRef.current === selectedDay) {
      return; // Already scrolled for this day selection
    }
    lastScrolledDayRef.current = selectedDay;

    let targetMinutes = 600; // 10:00 default
    if (isToday && isOperatingWindow) {
      targetMinutes = Math.max(480, Math.min(1560, currentMinutes));
    } else if (dayEvents.length > 0) {
      let earliest = 600;
      try {
        const starts = dayEvents.map((e) => getEventFestivalMinutes(e).startMinutes);
        earliest = Math.min(...starts);
      } catch {
        earliest = 600;
      }
      targetMinutes = Math.max(480, Math.min(earliest, 600));
    }

    const offsetMins = Math.max(0, targetMinutes - 480);
    const targetPx = (offsetMins / 1080) * 2400;
    const scrollLeft = Math.max(0, targetPx - 60);

    const rafId = requestAnimationFrame(() => {
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(rafId);
  }, [selectedDay, isToday, isOperatingWindow, currentMinutes, dayEvents]);

  return (
    <section className="space-y-4">
      {/* Top Controls: Header, Day Switcher & Stage Category Filters */}
      <div className="flex flex-col gap-3 pb-3 border-b border-border-subtle">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-extrabold text-2xl md:text-3xl text-text-primary tracking-tight">
              Grelha de Palcos
            </h1>
            <p className="text-text-secondary text-xs md:text-sm mt-0.5">
              Matriz contínua por palcos (08h às 02h) com indicador AGORA em tempo real.
            </p>
          </div>

          {/* Day Switcher Segmented Control */}
          <div className="flex items-center gap-1.5 bg-surface-card p-1 rounded-xl border border-border-subtle self-start" role="tablist">
            <button
              role="tab"
              aria-selected={selectedDay === 'sexta'}
              onClick={() => handleDaySwitch('sexta')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedDay === 'sexta'
                  ? 'bg-brand-crimson text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Sexta 5
            </button>
            <button
              role="tab"
              aria-selected={selectedDay === 'sabado'}
              onClick={() => handleDaySwitch('sabado')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedDay === 'sabado'
                  ? 'bg-brand-crimson text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Sábado 6
            </button>
            <button
              role="tab"
              aria-selected={selectedDay === 'domingo'}
              onClick={() => handleDaySwitch('domingo')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedDay === 'domingo'
                  ? 'bg-brand-crimson text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Domingo 7
            </button>
          </div>
        </div>

        {/* Stage Category Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-xs font-semibold text-text-muted mr-1">Espaços:</span>
          {STAGE_FILTERS.map((f) => {
            const isSelected = stageCategoryFilter === f.id;
            const count = stageCounts[f.id];
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setStageCategoryFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-surface-overlay text-brand-crimson font-bold border border-brand-crimson/40 shadow-sm'
                    : 'bg-surface-card hover:bg-surface-container text-text-secondary hover:text-text-primary border border-border-subtle'
                }`}
              >
                <span>{f.label}</span>
                <span className="text-[10px] font-mono opacity-80 bg-surface-container px-1 rounded">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Horizontal & Vertical Scrollable Matrix */}
      <div className="bg-surface-card rounded-xl border border-border-subtle shadow-card-elevation overflow-hidden">
        <div
          ref={scrollContainerRef}
          className="overflow-auto max-h-[calc(100vh-14rem)] min-h-[420px] relative"
        >
          {/* Real-time AGORA Needle Canvas Overlay */}
          <div className="absolute top-0 bottom-0 left-44 md:left-48 w-[2400px] pointer-events-none z-20">
            <AgoraNeedle
              currentTime={currentTime}
              percentage={agoraPercentage}
              isActive={isOperatingWindow && isToday}
            />
          </div>

          {/* Sticky Time Ruler */}
          <TimeAxisHeader />

          {/* Stage Tracks */}
          <div className="divide-y divide-border-subtle/50">
            {visibleStages.map((stage) => (
              <StageTrack
                key={stage}
                stageName={stage}
                events={eventsByStage.get(stage) || []}
                isFavorite={isFavorite}
                isSeen={isSeen}
                hasConflict={(id) => hasConflict(id, selectedDay, events)}
                currentMinutes={currentMinutes}
                isToday={isToday}
                onSelectEvent={setSelectedEvent}
                onToggleFavorite={(e, id) => {
                  e.stopPropagation();
                  toggleFavorite(id);
                }}
                onToggleSeen={(e, id) => {
                  e.stopPropagation();
                  toggleSeen(id);
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Event Details Inspector Drawer */}
      <EventDrawer
        event={selectedEvent}
        isOpen={selectedEvent !== null}
        onClose={() => setSelectedEvent(null)}
        isFavorite={selectedEvent ? isFavorite(selectedEvent.id) : false}
        isSeen={selectedEvent ? isSeen(selectedEvent.id) : false}
        hasConflict={selectedEvent ? hasConflict(selectedEvent.id, selectedDay, events) : false}
        conflictingEvents={selectedEventConflicts}
        onToggleFavorite={toggleFavorite}
        onToggleSeen={toggleSeen}
        onResolveConflict={resolveConflict}
      />
    </section>
  );
};
