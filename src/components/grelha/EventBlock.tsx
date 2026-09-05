import React from 'react';
import type { FestivalEvent } from '../../types/program';
import { getEventFestivalMinutes } from '../../utils/conflictDetector';
import { Star, CheckCircle2, AlertTriangle } from 'lucide-react';

export interface EventBlockProps {
  event: FestivalEvent;
  isFavorite: boolean;
  isSeen: boolean;
  hasConflict: boolean;
  isLiveNow: boolean;
  onSelect: (event: FestivalEvent) => void;
  onToggleFavorite: (e: React.MouseEvent, id: string) => void;
  onToggleSeen: (e: React.MouseEvent, id: string) => void;
  laneTop?: number;
  laneHeight?: number;
}

export const EventBlock: React.FC<EventBlockProps> = ({
  event,
  isFavorite,
  isSeen,
  hasConflict,
  isLiveNow,
  onSelect,
  onToggleFavorite,
  onToggleSeen,
  laneTop,
  laneHeight,
}) => {
  const { startMinutes, endMinutes } = getEventFestivalMinutes(event);
  const axisStart = 480; // 08:00
  const axisEnd = 1560; // 02:00
  const totalSpan = 1080; // 18 hours (1560 - 480)

  // Ensure clamped bounds are strictly well-ordered: clampedEnd >= clampedStart
  const clampedStart = Math.min(axisEnd, Math.max(axisStart, startMinutes));
  const clampedEnd = Math.max(clampedStart, Math.min(axisEnd, endMinutes));
  const offsetMinutes = Math.max(0, clampedStart - axisStart);
  const rawDuration = clampedEnd - clampedStart;
  const durationMinutes = rawDuration <= 0 ? 15 : Math.max(15, rawDuration);

  const leftPercent = (offsetMinutes / totalSpan) * 100;
  const widthPercent = (durationMinutes / totalSpan) * 100;

  // Category border accent
  const getCategoryBorder = (cat: string) => {
    switch (cat) {
      case 'Música': return 'border-l-stage-blue';
      case 'Debates': return 'border-l-brand-amber';
      case 'Teatro': return 'border-l-purple-500';
      case 'Cinema': return 'border-l-indigo-500';
      case 'Família/Criança': return 'border-l-tertiary-green';
      case 'Desporto': return 'border-l-accent-orange';
      default: return 'border-l-border-highlight';
    }
  };

  const startTimeStr = event.startTime || event.timeStart || '';
  const endTimeStr = event.endTime || event.timeEnd || '';

  const isCompact = durationMinutes < 45; // e.g. 30min acts (66px wide)

  return (
    <div
      onClick={() => onSelect(event)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(event);
        }
      }}
      role="button"
      tabIndex={0}
      style={{
        left: `${leftPercent}%`,
        width: `${widthPercent}%`,
        ...(laneTop !== undefined && laneHeight !== undefined
          ? { top: `${laneTop}px`, height: `${laneHeight}px`, bottom: 'auto' }
          : {}),
      }}
      className={`absolute ${laneTop !== undefined ? '' : 'top-1.5 bottom-1.5'} rounded-lg px-2 py-1.5 cursor-pointer border border-border-subtle bg-surface-card hover:bg-surface-overlay transition-all select-none overflow-hidden flex flex-col justify-between ${
        getCategoryBorder(event.category)
      } border-l-4 ${
        isSeen ? 'opacity-60' : 'opacity-100'
      } ${
        isLiveNow ? 'ring-1 ring-live-indicator shadow-live-glow' : ''
      } ${
        hasConflict ? 'ring-1 ring-brand-amber/80 shadow-conflict-glow' : ''
      }`}
      aria-label={`${event.title} às ${startTimeStr} em ${event.stage}`}
    >
      <div className="flex items-start justify-between gap-1 min-w-0">
        <span className={`text-xs font-bold text-text-primary truncate min-w-0 ${isSeen ? 'line-through text-text-muted' : ''}`}>
          {event.title}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {hasConflict && (
            <AlertTriangle className="w-3.5 h-3.5 text-brand-amber shrink-0" aria-label="Conflito de horário" />
          )}
          <button
            type="button"
            onClick={(e) => onToggleFavorite(e, event.id)}
            className="p-0.5 hover:bg-surface-container rounded shrink-0"
            title={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          >
            <Star
              className={`w-3.5 h-3.5 ${
                isFavorite ? 'fill-brand-amber text-brand-amber' : 'text-text-muted hover:text-text-primary'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mt-auto min-w-0 overflow-hidden text-[10px] md:text-[11px] font-mono text-text-muted whitespace-nowrap">
        <span className="tabular-nums truncate">
          {isCompact ? startTimeStr : `${startTimeStr} – ${endTimeStr}`}
        </span>
        {isSeen ? (
          <span className="text-[10px] text-tertiary font-bold flex items-center gap-0.5 shrink-0 ml-1">
            <CheckCircle2 className="w-3 h-3 shrink-0" />
            {!isCompact && 'Visto'}
          </span>
        ) : (
          <button
            type="button"
            onClick={(e) => onToggleSeen(e, event.id)}
            className="text-[10px] text-text-muted hover:text-tertiary font-medium flex items-center gap-0.5 px-1 rounded hover:bg-surface-container shrink-0 ml-1"
            title="Marcar como visto"
            aria-label="Marcar como visto"
          >
            <CheckCircle2 className="w-3 h-3 shrink-0" />
          </button>
        )}
      </div>
    </div>
  );
};
