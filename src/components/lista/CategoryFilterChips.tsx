import React from 'react';
import type { EventCategory } from '../../types/program';
import { CATEGORIES } from '../../types/program';

export interface CategoryFilterChipsProps {
  activeCategory: EventCategory | null;
  onSelectCategory: (category: EventCategory | null) => void;
  counts?: Partial<Record<string, number>>;
  totalCount?: number;
}

export const CategoryFilterChips: React.FC<CategoryFilterChipsProps> = ({
  activeCategory,
  onSelectCategory,
  counts,
  totalCount,
}) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar scroll-smooth select-none">
      {/* "Todos" Option */}
      <button
        type="button"
        onClick={() => onSelectCategory(null)}
        className={`px-3.5 py-1.5 rounded-full text-xs whitespace-nowrap transition-all flex items-center gap-1.5 ${
          activeCategory === null
            ? 'bg-brand-crimson text-text-primary font-bold shadow-xs'
            : 'bg-surface-container text-text-secondary hover:text-text-primary border border-border-subtle hover:border-border-highlight'
        }`}
      >
        <span>#Todos</span>
        {totalCount !== undefined && (
          <span className="opacity-80">({totalCount})</span>
        )}
      </button>

      {/* Category Pills */}
      {CATEGORIES.map((category) => {
        const isActive = activeCategory === category;
        const count = counts?.[category];

        return (
          <button
            key={category}
            type="button"
            onClick={() => onSelectCategory(isActive ? null : category)}
            className={`px-3.5 py-1.5 rounded-full text-xs whitespace-nowrap transition-all flex items-center gap-1.5 ${
              isActive
                ? 'bg-brand-crimson text-text-primary font-bold shadow-xs'
                : 'bg-surface-container text-text-secondary hover:text-text-primary border border-border-subtle hover:border-border-highlight'
            }`}
          >
            <span>#{category}</span>
            {count !== undefined && (
              <span className="opacity-80">({count})</span>
            )}
          </button>
        );
      })}
    </div>
  );
};
