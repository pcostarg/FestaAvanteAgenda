import React from 'react';
import { Calendar, Sparkles, LayoutGrid, List } from 'lucide-react';

export interface EmptyHorarioStateProps {
  isAllSeenHidden?: boolean;
  onShowSeen?: () => void;
  onNavigateGrelha: () => void;
  onNavigateLista: () => void;
}

export const EmptyHorarioState: React.FC<EmptyHorarioStateProps> = ({
  isAllSeenHidden = false,
  onShowSeen,
  onNavigateGrelha,
  onNavigateLista,
}) => {
  if (isAllSeenHidden) {
    return (
      <div className="py-16 px-6 text-center rounded-2xl bg-surface-card border border-border-subtle max-w-lg mx-auto space-y-4 shadow-card-elevation">
        <div className="w-14 h-14 rounded-2xl bg-tertiary/10 text-tertiary flex items-center justify-center mx-auto border border-tertiary/20">
          <Sparkles className="w-7 h-7" />
        </div>
        <div>
          <h3 className="font-display font-bold text-lg text-text-primary">
            Eventos Concluídos
          </h3>
          <p className="text-xs md:text-sm text-text-secondary mt-1 max-w-md mx-auto leading-relaxed">
            Todos os teus eventos selecionados para este dia já foram concluídos e estão ocultos.
          </p>
        </div>
        <button
          type="button"
          onClick={onShowSeen}
          className="px-5 py-2.5 text-xs font-bold rounded-xl bg-tertiary text-surface-base hover:bg-tertiary/90 transition-colors shadow-sm"
        >
          Mostrar eventos concluídos
        </button>
      </div>
    );
  }

  return (
    <div className="py-16 px-6 text-center rounded-2xl bg-surface-card border border-border-subtle max-w-lg mx-auto space-y-5 shadow-card-elevation">
      <div className="w-16 h-16 rounded-2xl bg-surface-container text-brand-crimson flex items-center justify-center mx-auto border border-border-subtle">
        <Calendar className="w-8 h-8" />
      </div>

      <div className="space-y-1.5">
        <h3 className="font-display font-bold text-lg md:text-xl text-text-primary tracking-tight">
          Ainda não guardaste eventos para este dia
        </h3>
        <p className="text-xs md:text-sm text-text-secondary max-w-sm mx-auto leading-relaxed">
          Explora o programa completo da Festa do Avante! e marca os concertos, debates e espetáculos que queres ver.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={onNavigateGrelha}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-brand-crimson text-text-primary hover:bg-brand-crimson-bright shadow-sm transition-all"
        >
          <LayoutGrid className="w-4 h-4" />
          <span>Explorar na Grelha</span>
        </button>

        <button
          type="button"
          onClick={onNavigateLista}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-surface-container text-text-primary hover:bg-surface-container-high border border-border-subtle transition-colors"
        >
          <List className="w-4 h-4" />
          <span>Explorar na Lista</span>
        </button>
      </div>
    </div>
  );
};
