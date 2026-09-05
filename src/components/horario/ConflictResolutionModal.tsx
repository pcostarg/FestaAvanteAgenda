import React, { useEffect, useState } from 'react';
import type { ConflictReport, ConflictResolutionAction } from '../../types/schedule';
import { AlertTriangle, X, Check, ArrowRightLeft } from 'lucide-react';

export interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: ConflictReport;
  onResolve: (action: ConflictResolutionAction, eventAId: string, eventBId: string) => void;
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  isOpen,
  onClose,
  report,
  onResolve,
}) => {
  const [currentPairIndex, setCurrentPairIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset index if out of bounds
  useEffect(() => {
    if (currentPairIndex >= report.pairs.length && report.pairs.length > 0) {
      setCurrentPairIndex(0);
    }
  }, [report.pairs.length, currentPairIndex]);

  if (!isOpen) return null;

  const currentPair = report.pairs[currentPairIndex] || report.pairs[0];

  const handleAction = (action: ConflictResolutionAction) => {
    if (!currentPair) return;
    onResolve(action, currentPair.eventA.id, currentPair.eventB.id);

    // If more pairs remain, advance; otherwise if none remain, close
    if (report.pairs.length <= 1) {
      onClose();
    } else {
      setCurrentPairIndex((prev) => Math.min(prev, report.pairs.length - 2));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl bg-surface-card border border-border-subtle rounded-2xl p-6 shadow-card-elevation z-10 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-brand-amber/10 text-brand-amber">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-text-primary">
                Resolver Sobreposição de Horário
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                {report.pairs.length > 1
                  ? `Conflito ${currentPairIndex + 1} de ${report.pairs.length}`
                  : 'Dois concertos ou atividades coincidem no mesmo horário'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-surface-container"
            title="Fechar"
            aria-label="Fechar janela de resolução de conflitos"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {currentPair ? (
          <div className="space-y-4">
            {/* Overlap Info Banner */}
            <div className="p-3 rounded-xl bg-surface-container border border-border-subtle text-xs text-text-secondary flex items-center gap-2 font-mono">
              <ArrowRightLeft className="w-4 h-4 text-brand-amber shrink-0" />
              <span>Intervalo de sobreposição: {currentPair.formattedOverlap}</span>
            </div>

            {/* Comparison Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option A */}
              <div className="p-4 rounded-xl bg-surface-container-low border border-border-subtle flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-[10px] font-bold text-stage-blue bg-stage-blue/10 px-2 py-0.5 rounded uppercase">
                    {currentPair.eventA.stage}
                  </span>
                  <h4 className="font-display font-bold text-sm text-text-primary mt-1.5">
                    {currentPair.eventA.title}
                  </h4>
                  <div className="text-xs font-mono text-text-muted mt-1">
                    {currentPair.eventA.startTime || currentPair.eventA.timeStart} –{' '}
                    {currentPair.eventA.endTime || currentPair.eventA.timeEnd}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleAction('keepA')}
                  className="w-full py-2 px-3 text-xs font-bold rounded-lg bg-brand-crimson text-text-primary hover:bg-brand-crimson-bright shadow-sm transition-colors flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Manter Opção A</span>
                </button>
              </div>

              {/* Option B */}
              <div className="p-4 rounded-xl bg-surface-container-low border border-border-subtle flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-[10px] font-bold text-accent-orange bg-accent-orange/10 px-2 py-0.5 rounded uppercase">
                    {currentPair.eventB.stage}
                  </span>
                  <h4 className="font-display font-bold text-sm text-text-primary mt-1.5">
                    {currentPair.eventB.title}
                  </h4>
                  <div className="text-xs font-mono text-text-muted mt-1">
                    {currentPair.eventB.startTime || currentPair.eventB.timeStart} –{' '}
                    {currentPair.eventB.endTime || currentPair.eventB.timeEnd}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleAction('keepB')}
                  className="w-full py-2 px-3 text-xs font-bold rounded-lg bg-brand-crimson text-text-primary hover:bg-brand-crimson-bright shadow-sm transition-colors flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Manter Opção B</span>
                </button>
              </div>
            </div>

            {/* Split Option */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleAction('split')}
                className="w-full py-2.5 px-4 text-xs font-semibold rounded-xl bg-surface-container text-text-secondary hover:text-text-primary border border-border-subtle hover:border-border-highlight transition-colors flex items-center justify-center gap-2"
              >
                <span>Dividir o Tempo (Manter Ambos na Agenda)</span>
              </button>
              <p className="text-[11px] text-text-muted text-center mt-1.5">
                Escolhe esta opção se planeares assistir a uma parte de cada concerto.
              </p>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-text-muted">
            Todas as sobreposições foram resolvidas.
          </div>
        )}
      </div>
    </div>
  );
};
