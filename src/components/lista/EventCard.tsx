import React from 'react';
import type { FestivalEvent } from '../../types/program';
import { Star, CheckCircle2, AlertTriangle, Clock, MapPin } from 'lucide-react';

export interface EventCardProps {
  event: FestivalEvent;
  isFavorite: boolean;
  isSeen: boolean;
  hasConflict?: boolean;
  onToggleFavorite: (id: string) => void;
  onToggleSeen: (id: string) => void;
  onSelect?: (event: FestivalEvent) => void;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  isFavorite,
  isSeen,
  hasConflict = false,
  onToggleFavorite,
  onToggleSeen,
  onSelect,
}) => {
  const startTime = event.startTime || event.timeStart || '';
  const endTime = event.endTime || event.timeEnd || '';

  // Stage color token
  const getStageBadgeClass = (stage: string) => {
    if (stage.includes('25 de Abril') || stage.includes('Paz') || stage.includes('1º de Maio')) {
      return 'text-stage-blue bg-stage-blue/10 border-stage-blue/20';
    }
    if (stage.includes('Juventude')) {
      return 'text-accent-orange bg-accent-orange/10 border-accent-orange/20';
    }
    if (stage.includes('Central') || stage.includes('Debates')) {
      return 'text-brand-amber bg-brand-amber/10 border-brand-amber/20';
    }
    if (stage.includes('Avanteatro') || stage.includes('Cine')) {
      return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
    }
    if (stage.includes('Criança') || stage.includes('Ciência') || stage.includes('Desporto')) {
      return 'text-tertiary bg-tertiary/10 border-tertiary/20';
    }
    return 'text-text-secondary bg-surface-container border-border-subtle';
  };

  return (
    <div
      onClick={() => onSelect?.(event)}
      className={`relative rounded-xl border p-4 transition-all bg-surface-card ${
        isSeen ? 'opacity-60' : 'opacity-100'
      } ${
        hasConflict
          ? 'border-brand-amber/60 shadow-conflict-glow'
          : 'border-border-subtle hover:border-border-highlight'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        {/* Left: Time block & Event Information */}
        <div className="flex items-start gap-3.5 flex-1 min-w-0">
          {/* Time Badge */}
          <div className="flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-surface-container border border-border-subtle shrink-0">
            <Clock className="w-3.5 h-3.5 text-text-muted mb-0.5" />
            <span
              className={`text-xs font-mono font-bold tabular-nums ${
                isSeen ? 'line-through text-text-muted' : 'text-text-primary'
              }`}
            >
              {startTime}
            </span>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${getStageBadgeClass(
                  event.stage
                )}`}
              >
                {event.stage}
              </span>

              <span className="text-[11px] text-text-muted font-mono">
                {startTime} – {endTime}
              </span>

              {hasConflict && (
                <span className="flex items-center gap-1 text-[11px] font-bold text-brand-amber bg-brand-amber/10 border border-brand-amber/30 px-2 py-0.5 rounded">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Sobreposição</span>
                </span>
              )}

              {isSeen && (
                <span className="text-[11px] font-bold text-tertiary bg-tertiary/10 border border-tertiary/30 px-2 py-0.5 rounded flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Concluído</span>
                </span>
              )}
            </div>

            <h3
              className={`font-display font-bold text-base md:text-lg tracking-tight truncate ${
                isSeen ? 'line-through text-text-muted' : 'text-text-primary'
              }`}
            >
              {event.title}
            </h3>

            {event.description && (
              <p className="text-xs text-text-secondary line-clamp-2 mt-1 leading-relaxed">
                {event.description}
              </p>
            )}

            {event.subStage && (
              <div className="flex items-center gap-1 text-[11px] text-text-muted mt-1.5">
                <MapPin className="w-3 h-3" />
                <span>{event.subStage}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Quick Actions (Star & Check) */}
        <div className="flex items-center gap-1.5 self-end sm:self-start shrink-0 pt-1 sm:pt-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSeen(event.id);
            }}
            className={`p-2 rounded-lg border transition-colors ${
              isSeen
                ? 'bg-tertiary/10 border-tertiary text-tertiary'
                : 'border-border-subtle text-text-muted hover:text-tertiary hover:bg-surface-container'
            }`}
            title={isSeen ? 'Marcar como não visto' : 'Marcar como já vi'}
            aria-label={isSeen ? 'Marcar como não visto' : 'Marcar como já vi'}
          >
            <CheckCircle2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(event.id);
            }}
            className={`p-2 rounded-lg border transition-colors ${
              isFavorite
                ? 'bg-brand-amber/10 border-brand-amber text-brand-amber'
                : 'border-border-subtle text-text-muted hover:text-brand-amber hover:bg-surface-container'
            }`}
            title={isFavorite ? 'Remover de O Meu Horário' : 'Guardar em O Meu Horário'}
            aria-label={isFavorite ? 'Remover de O Meu Horário' : 'Guardar em O Meu Horário'}
          >
            <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
};
