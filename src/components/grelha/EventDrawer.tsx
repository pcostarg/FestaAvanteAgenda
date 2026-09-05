import React, { useEffect } from 'react';
import type { FestivalEvent } from '../../types/program';
import type { ConflictResolutionAction } from '../../types/schedule';
import { timeToFestivalMinutes } from '../../utils/conflictDetector';
import { X, Star, CheckCircle2, AlertTriangle, Clock, MapPin } from 'lucide-react';

export interface EventDrawerProps {
  event: FestivalEvent | null;
  isOpen: boolean;
  onClose: () => void;
  isFavorite: boolean;
  isSeen: boolean;
  hasConflict: boolean;
  conflictingEvents?: FestivalEvent[];
  onToggleFavorite: (id: string) => void;
  onToggleSeen: (id: string) => void;
  onResolveConflict?: (action: ConflictResolutionAction, evAId: string, evBId: string) => void;
}

export const EventDrawer: React.FC<EventDrawerProps> = ({
  event,
  isOpen,
  onClose,
  isFavorite,
  isSeen,
  hasConflict,
  conflictingEvents = [],
  onToggleFavorite,
  onToggleSeen,
  onResolveConflict,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !event) return null;

  const startStr = event.startTime || event.timeStart || '';
  const endStr = event.endTime || event.timeEnd || '';
  let duration = 0;
  try {
    duration = Math.max(0, timeToFestivalMinutes(endStr) - timeToFestivalMinutes(startStr));
  } catch {
    duration = 0;
  }
  const timeIntervalLabel = `${startStr} – ${endStr} (${duration} min)`;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      {/* Backdrop click to dismiss */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-md bg-surface-card border-l border-border-subtle p-6 flex flex-col h-full overflow-y-auto shadow-card-elevation z-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-border-subtle">
          <div>
            <span className="text-[11px] font-bold text-stage-blue bg-stage-blue/10 px-2 py-0.5 rounded uppercase tracking-wider">
              {event.category}
            </span>
            <h2 className="font-display font-extrabold text-xl md:text-2xl text-text-primary mt-2">
              {event.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-surface-container"
            title="Fechar"
            aria-label="Fechar painel de detalhes"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metadata section */}
        <div className="py-4 space-y-3 border-b border-border-subtle">
          <div className="flex items-center gap-2.5 text-sm text-text-secondary">
            <MapPin className="w-4 h-4 text-brand-crimson shrink-0" />
            <span className="font-semibold">{event.stage}</span>
            {event.subStage && <span className="text-text-muted">({event.subStage})</span>}
          </div>

          <div className="flex items-center gap-2.5 text-sm text-text-secondary font-mono">
            <Clock className="w-4 h-4 text-brand-amber shrink-0" />
            <span>{timeIntervalLabel}</span>
          </div>
        </div>

        {/* Conflict Warning Banner if active */}
        {hasConflict && conflictingEvents.length > 0 && (
          <div className="my-4 p-3.5 rounded-xl bg-surface-container border-l-4 border-brand-amber shadow-conflict-glow space-y-2">
            <div className="flex items-center gap-2 text-brand-amber font-bold text-xs md:text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>Conflito de Horário Detetado</span>
            </div>
            <p className="text-xs text-text-secondary">
              Coincide com {conflictingEvents.map((c) => c.title).join(', ')}.
            </p>
            {(() => {
              const firstConflict = conflictingEvents[0];
              if (!onResolveConflict || !firstConflict) return null;
              return (
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <button
                    onClick={() => onResolveConflict('keepA', event.id, firstConflict.id)}
                    className="px-2.5 py-1 text-xs font-bold rounded bg-brand-crimson text-white hover:bg-brand-crimson-bright"
                  >
                    Manter este
                  </button>
                  <button
                    onClick={() => onResolveConflict('keepB', event.id, firstConflict.id)}
                    className="px-2.5 py-1 text-xs font-semibold rounded bg-surface-container-high text-text-secondary hover:text-text-primary"
                  >
                    Manter outro
                  </button>
                  <button
                    onClick={() => onResolveConflict('split', event.id, firstConflict.id)}
                    className="px-2.5 py-1 text-xs font-semibold rounded bg-surface-container-high text-text-secondary hover:text-text-primary"
                  >
                    Dividir tempo
                  </button>
                </div>
              );
            })()}
          </div>
        )}

        {/* Description (handles empty string & massive 5000+ character text) */}
        <div className="py-4 flex-1">
          <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
            Sobre a Atividade
          </h4>
          <div className="text-sm text-text-secondary leading-relaxed max-h-60 overflow-y-auto pr-1">
            {event.description && event.description.trim().length > 0
              ? event.description
              : 'Sem descrição disponível.'}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-border-subtle flex items-center gap-3">
          <button
            onClick={() => onToggleFavorite(event.id)}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-colors ${
              isFavorite
                ? 'bg-brand-amber/10 border-brand-amber text-brand-amber'
                : 'bg-surface-container border-border-subtle text-text-secondary hover:text-text-primary'
            }`}
          >
            <Star className={`w-4 h-4 ${isFavorite ? 'fill-brand-amber' : ''}`} />
            {isFavorite ? 'Guardado' : 'Guardar'}
          </button>

          <button
            onClick={() => onToggleSeen(event.id)}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-colors ${
              isSeen
                ? 'bg-tertiary/10 border-tertiary text-tertiary'
                : 'bg-surface-container border-border-subtle text-text-secondary hover:text-text-primary'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSeen ? 'Concluído' : 'Já Vi'}
          </button>
        </div>
      </div>
    </div>
  );
};
