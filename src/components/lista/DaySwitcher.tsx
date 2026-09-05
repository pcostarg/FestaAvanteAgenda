import React from 'react';
import type { FestivalDay } from '../../types/program';

export interface DaySwitcherProps {
  activeDay: FestivalDay;
  onDayChange: (day: FestivalDay) => void;
  counts?: Partial<Record<FestivalDay, number>>;
}

export const DaySwitcher: React.FC<DaySwitcherProps> = ({
  activeDay,
  onDayChange,
  counts,
}) => {
  const days: { id: FestivalDay; label: string; date: string }[] = [
    { id: 'sexta', label: 'Sexta 5', date: '5 Set' },
    { id: 'sabado', label: 'Sábado 6', date: '6 Set' },
    { id: 'domingo', label: 'Domingo 7', date: '7 Set' },
  ];

  return (
    <div
      className="flex items-center gap-1.5 bg-surface-card p-1 rounded-xl border border-border-subtle select-none"
      role="tablist"
      aria-label="Dias do festival"
    >
      {days.map((day) => {
        const isActive = activeDay === day.id;
        const count = counts?.[day.id];

        return (
          <button
            key={day.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onDayChange(day.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all ${
              isActive
                ? 'bg-brand-crimson text-text-primary font-bold shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-container'
            }`}
          >
            <span>{day.label}</span>
            {count !== undefined && count > 0 && (
              <span
                className={`px-1.5 py-0.2 text-[10px] font-bold rounded-full ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-surface-container-high text-text-secondary'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
