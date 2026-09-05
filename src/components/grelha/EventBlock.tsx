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
}) => {
  const { startMinutes, endMinutes } = getEventFestivalMinutes(event);
  const axisStart = 600; // 10:00
  const axisEnd = 1560; // 02:00
  const totalSpan = 960; // 16 hours

  const clampedStart = Math.max(axisStart, startMinutes);
  const clampedEnd = Math.min(axisEnd, endMinutes);
  const offsetMinutes = Math.max(0, clampedStart - axisStart);
  const durationMinutes = Math.max(15, clampedEnd - clampedStart);

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
      style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
      className={`absolute top-1.5 bottom-1.5 rounded-lg p-2 cursor-pointer border border-border-subtle bg-surface-card hover:bg-surface-overlay transition-all select-none overflow-hidden flex flex-col justify-between ${
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
      <div className="flex items-start justify-between gap-1">
        <span className={`text-xs font-bold text-text-primary truncate ${isSeen ? 'line-through text-text-muted' : ''}`}>
          {event.title}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {hasConflict && (
            <AlertTriangle className="w-3.5 h-3.5 text-brand-amber" aria-label="Conflito de horário" />
          )}
          <button
            type="button"
            onClick={(e) => onToggleFavorite(e, event.id)}
            className="p-0.5 hover:bg-surface-container rounded"
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

      <div className="flex items-center justify-between mt-auto text-[11px] font-mono text-text-muted">
        <span className="tabular-nums">
          {startTimeStr} – {endTimeStr}
        </span>
        {isSeen ? (
          <span className="text-[10px] text-tertiary font-bold flex items-center gap-0.5">
            <CheckCircle2 className="w-3 h-3" />
            Visto
          </span>
        ) : (
          <button
            type="button"
            onClick={(e) => onToggleSeen(e, event.id)}
            className="text-[10px] text-text-muted hover:text-tertiary font-medium flex items-center gap-0.5 px-1 rounded hover:bg-surface-container"
            title="Marcar como visto"
            aria-label="Marcar como visto"
          >
            <CheckCircle2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
