import React from 'react';
import type { ConflictReport } from '../../types/schedule';
import { AlertTriangle, ChevronRight } from 'lucide-react';

export interface ConflictWarningBannerProps {
  report: ConflictReport;
  onOpenResolver: () => void;
}

export const ConflictWarningBanner: React.FC<ConflictWarningBannerProps> = ({
  report,
  onOpenResolver,
}) => {
  if (!report.hasConflicts) return null;

  const pairCount = report.pairs.length;
  const firstPair = report.pairs[0];

  return (
    <div className="p-4 rounded-xl bg-surface-card border-l-4 border-brand-amber shadow-conflict-glow flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-brand-amber/10 text-brand-amber shrink-0 mt-0.5">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs md:text-sm font-bold text-brand-amber flex items-center gap-2">
            Aviso de Sobreposição de Horário
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-amber/20 text-brand-amber font-mono font-bold">
              {pairCount} {pairCount === 1 ? 'conflito' : 'conflitos'}
            </span>
          </h4>
          <p className="text-xs text-text-secondary mt-1 leading-relaxed">
            {pairCount === 1 && firstPair
              ? `Tens 2 eventos coincidentes: "${firstPair.eventA.title}" e "${firstPair.eventB.title}" (${firstPair.formattedOverlap}).`
              : `Tens ${pairCount} sobreposições de horário entre eventos guardados para este dia.`}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenResolver}
        className="self-end sm:self-center inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-brand-amber text-surface-base hover:bg-brand-amber/90 transition-colors shadow-sm shrink-0"
      >
        <span>Resolver Conflitos</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};
