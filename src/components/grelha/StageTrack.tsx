import React, { useMemo } from 'react';
import type { FestivalEvent, PrimaryFestivalStage } from '../../types/program';
import { getEventFestivalMinutes } from '../../utils/conflictDetector';
import { EventBlock } from './EventBlock';

export interface StageTrackProps {
  stageName: PrimaryFestivalStage | string;
  events: FestivalEvent[];
  isFavorite: (id: string) => boolean;
  isSeen: (id: string) => boolean;
  hasConflict: (id: string) => boolean;
  currentMinutes: number;
  isToday: boolean;
  onSelectEvent: (event: FestivalEvent) => void;
  onToggleFavorite: (e: React.MouseEvent, id: string) => void;
  onToggleSeen: (e: React.MouseEvent, id: string) => void;
}

const LANE_HEIGHT = 64;
const LANE_GAP = 6;
const TRACK_PADDING = 8;

export const StageTrack: React.FC<StageTrackProps> = ({
  stageName,
  events,
  isFavorite,
  isSeen,
  hasConflict,
  currentMinutes,
  isToday,
  onSelectEvent,
  onToggleFavorite,
  onToggleSeen,
}) => {
  // Multi-lane interval coloring: allocate overlapping events to parallel vertical lanes
  const { numLanes, laneAssignments } = useMemo(() => {
    if (events.length === 0) {
      return { numLanes: 1, laneAssignments: new Map<string, number>() };
    }

    // Sort events by start minutes ascending, then end minutes
    const sorted = [...events].sort((a, b) => {
      try {
        const sA = getEventFestivalMinutes(a).startMinutes;
        const sB = getEventFestivalMinutes(b).startMinutes;
        if (sA !== sB) return sA - sB;
        return getEventFestivalMinutes(a).endMinutes - getEventFestivalMinutes(b).endMinutes;
      } catch {
        return 0;
      }
    });

    const laneEndTimes: number[] = [];
    const assignments = new Map<string, number>();

    for (const ev of sorted) {
      try {
        const { startMinutes, endMinutes } = getEventFestivalMinutes(ev);
        let assignedLane = -1;

        // Find the first lane that finishes before or at startMinutes
        for (let i = 0; i < laneEndTimes.length; i++) {
          const laneEnd = laneEndTimes[i];
          if (laneEnd !== undefined && laneEnd <= startMinutes) {
            assignedLane = i;
            laneEndTimes[i] = endMinutes;
            break;
          }
        }

        if (assignedLane === -1) {
          assignedLane = laneEndTimes.length;
          laneEndTimes.push(endMinutes);
        }

        assignments.set(ev.id, assignedLane);
      } catch {
        assignments.set(ev.id, 0);
      }
    }

    return {
      numLanes: Math.max(1, laneEndTimes.length),
      laneAssignments: assignments,
    };
  }, [events]);

  const trackHeight =
    numLanes === 1
      ? 80
      : TRACK_PADDING * 2 + numLanes * LANE_HEIGHT + (numLanes - 1) * LANE_GAP;

  return (
    <div className="flex border-b border-border-subtle hover:bg-surface-card/40 transition-colors">
      {/* Sticky Stage Label Column */}
      <div className="sticky left-0 z-10 bg-surface border-r border-border-subtle w-44 md:w-48 shrink-0 p-3 flex flex-col justify-center">
        <span className="font-display font-bold text-xs md:text-sm text-text-primary truncate">
          {stageName}
        </span>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[11px] text-text-muted">
            {events.length} {events.length === 1 ? 'atuação' : 'atuações'}
          </span>
          {numLanes > 1 && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-surface-container text-text-secondary">
              {numLanes} pistas
            </span>
          )}
        </div>
      </div>

      {/* Track Canvas Area */}
      <div
        className="relative w-[2400px] shrink-0"
        style={{ height: `${trackHeight}px` }}
      >
        {events.length === 0 ? (
          <div className="absolute inset-0 flex items-center px-4 text-xs text-text-muted italic select-none">
            Sem atuações programadas
          </div>
        ) : (
          events.map((event) => {
            let isLiveNow = false;
            if (isToday) {
              try {
                const { startMinutes, endMinutes } = getEventFestivalMinutes(event);
                isLiveNow = currentMinutes >= startMinutes && currentMinutes < endMinutes;
              } catch {
                isLiveNow = false;
              }
            }

            const lane = laneAssignments.get(event.id) ?? 0;
            const laneTop = numLanes === 1 ? 8 : TRACK_PADDING + lane * (LANE_HEIGHT + LANE_GAP);
            const laneHeight = LANE_HEIGHT;

            return (
              <EventBlock
                key={event.id}
                event={event}
                isFavorite={isFavorite(event.id)}
                isSeen={isSeen(event.id)}
                hasConflict={hasConflict(event.id)}
                isLiveNow={isLiveNow}
                onSelect={onSelectEvent}
                onToggleFavorite={onToggleFavorite}
                onToggleSeen={onToggleSeen}
                laneTop={laneTop}
                laneHeight={laneHeight}
              />
            );
          })
        )}
      </div>
    </div>
  );
};
