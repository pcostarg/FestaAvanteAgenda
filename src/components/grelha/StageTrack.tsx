import React from 'react';
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
  return (
    <div className="flex border-b border-border-subtle hover:bg-surface-card/40 transition-colors">
      {/* Sticky Stage Label Column */}
      <div className="sticky left-0 z-10 bg-surface border-r border-border-subtle w-44 md:w-48 shrink-0 p-3 flex flex-col justify-center">
        <span className="font-display font-bold text-xs md:text-sm text-text-primary truncate">
          {stageName}
        </span>
        <span className="text-[11px] text-text-muted mt-0.5">
          {events.length} {events.length === 1 ? 'atuação' : 'atuações'}
        </span>
      </div>

      {/* Track Canvas Area */}
      <div className="relative flex-1 h-20 min-w-[2400px]">
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
              />
            );
          })
        )}
      </div>
    </div>
  );
};
