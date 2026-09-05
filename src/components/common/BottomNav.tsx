import React from 'react';
import { LayoutGrid, List, BookmarkCheck } from 'lucide-react';

export type ViewMode = 'grelha' | 'lista' | 'horario';

export interface BottomNavProps {
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  savedCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeView,
  onViewChange,
  savedCount = 0,
}) => {
  const tabs = [
    {
      id: 'grelha' as ViewMode,
      label: 'Grelha',
      icon: LayoutGrid,
    },
    {
      id: 'lista' as ViewMode,
      label: 'Lista',
      icon: List,
    },
    {
      id: 'horario' as ViewMode,
      label: 'O Meu Horário',
      icon: BookmarkCheck,
      badge: savedCount > 0 ? savedCount : null,
    },
  ];

  return (
    <nav 
      className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-surface-card/95 backdrop-blur-md border-t border-border-subtle shadow-bar-bottom pb-safe"
      role="navigation"
      aria-label="Navegação inferior móvel"
    >
      <div className="grid grid-cols-3 h-16 max-w-md mx-auto px-2">
        {tabs.map((tab) => {
          const isActive = activeView === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onViewChange(tab.id)}
              className={`relative flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl transition-all duration-150 active:scale-95 ${
                isActive
                  ? 'text-brand-crimson-bright font-bold bg-surface-container-high/60'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {/* Active top pill indicator */}
              {isActive && (
                <span className="absolute top-1 w-6 h-0.5 rounded-full bg-brand-crimson" />
              )}

              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-brand-crimson-bright' : ''}`} />
                {tab.badge !== null && tab.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold bg-brand-crimson text-text-primary flex items-center justify-center leading-none shadow-xs">
                    {tab.badge}
                  </span>
                )}
              </div>

              <span className={`text-[11px] leading-tight tracking-tight ${isActive ? 'font-bold text-text-primary' : 'font-medium'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
