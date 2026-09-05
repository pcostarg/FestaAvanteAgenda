import React, { useState, useMemo } from 'react';
import type { FestivalDay, FestivalEvent } from '../../types/program';
import type { ConflictResolutionAction, ConflictReport } from '../../types/schedule';
import { PRIMARY_STAGES } from '../../types/program';
import { FESTIVAL_EVENTS } from '../../data/program';
import { TimeAxisHeader } from './TimeAxisHeader';
import { StageTrack } from './StageTrack';
import { AgoraNeedle } from './AgoraNeedle';
import { EventDrawer } from './EventDrawer';
import { useFestivalTime } from '../../hooks/useFestivalTime';
import { normalizeDayKey } from '../../utils/conflictDetector';

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

  const { currentTime, currentMinutes, isOperatingWindow, agoraPercentage, currentDay } = useFestivalTime();

  // Filter events for selected day
  const dayEvents = useMemo(() => {
    return events.filter((e) => normalizeDayKey(e.day || e.date || e.dayCode || '') === selectedDay);
  }, [events, selectedDay]);

  // Group events by primary stage
  const eventsByStage = useMemo(() => {
    const map = new Map<string, FestivalEvent[]>();
    for (const stage of PRIMARY_STAGES) {
      map.set(stage, []);
    }
    for (const ev of dayEvents) {
      if (map.has(ev.stage)) {
        map.get(ev.stage)!.push(ev);
      } else {
        // Match slight naming variations (e.g. CineAvante vs CineAvante!)
        const matched = PRIMARY_STAGES.find((s) => ev.stage.includes(s) || s.includes(ev.stage));
        if (matched) {
          map.get(matched)!.push(ev);
        }
      }
    }
    return map;
  }, [dayEvents]);

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

  return (
    <section className="space-y-4">
      {/* Top Controls: Header & Day Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border-subtle">
        <div>
          <h1 className="font-display font-extrabold text-2xl md:text-3xl text-text-primary tracking-tight">
            Grelha de Palcos
          </h1>
          <p className="text-text-secondary text-xs md:text-sm mt-0.5">
            Matriz contínua por palcos (10h às 02h) com indicador AGORA em tempo real.
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

      {/* Main Horizontal Scrollable Matrix */}
      <div className="bg-surface-card rounded-xl border border-border-subtle overflow-hidden shadow-card-elevation">
        <div className="overflow-x-auto overflow-y-hidden relative">
          {/* Real-time AGORA Needle */}
          <AgoraNeedle
            currentTime={currentTime}
            percentage={agoraPercentage}
            isActive={isOperatingWindow && isToday}
          />

          {/* Sticky Time Ruler */}
          <TimeAxisHeader />

          {/* Primary Stage Tracks */}
          <div className="divide-y divide-border-subtle/50">
            {PRIMARY_STAGES.map((stage) => (
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
