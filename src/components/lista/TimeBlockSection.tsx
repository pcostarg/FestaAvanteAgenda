import React from 'react';
import type { FestivalEvent, TimeBlock } from '../../types/program';
import { EventCard } from './EventCard';
import { Sun, SunMedium, Sunset, Moon } from 'lucide-react';

export interface TimeBlockSectionProps {
  blockId: TimeBlock;
  events: FestivalEvent[];
  isFavorite: (id: string) => boolean;
  isSeen: (id: string) => boolean;
  hasConflict: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  onToggleSeen: (id: string) => void;
  onSelectEvent?: (event: FestivalEvent) => void;
}

interface BlockMeta {
  title: string;
  hours: string;
  icon: React.ComponentType<{ className?: string }>;
}

const BLOCK_META: Record<TimeBlock, BlockMeta> = {
  manha: {
    title: 'Manhã',
    hours: '10h-14h',
    icon: Sun,
  },
  tarde: {
    title: 'Tarde',
    hours: '14h-19h',
    icon: SunMedium,
  },
  anoitecer: {
    title: 'Anoitecer',
    hours: '19h-22h',
    icon: Sunset,
  },
  'noite-principal': {
    title: 'Noite Principal',
    hours: '22h-02h',
    icon: Moon,
  },
};

export const TimeBlockSection: React.FC<TimeBlockSectionProps> = ({
  blockId,
  events,
  isFavorite,
  isSeen,
  hasConflict,
  onToggleFavorite,
  onToggleSeen,
  onSelectEvent,
}) => {
  // If no events in this time block, hide section cleanly (per T2-F7-04)
  if (events.length === 0) return null;

  const meta = BLOCK_META[blockId] || {
    title: blockId,
    hours: '',
    icon: Sun,
  };
  const Icon = meta.icon;

  return (
    <section className="space-y-3 pt-2">
      {/* Time Block Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border-subtle/60 sticky top-16 md:top-20 z-10 bg-surface-base/95 backdrop-blur-sm py-2">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-surface-container border border-border-subtle text-brand-crimson">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-display font-bold text-sm md:text-base text-text-primary">
              {meta.title}{' '}
              <span className="text-xs font-mono font-normal text-text-muted">
                ({meta.hours})
              </span>
            </h2>
          </div>
        </div>

        <span className="text-xs text-text-muted font-mono">
          {events.length} {events.length === 1 ? 'evento' : 'eventos'}
        </span>
      </div>

      {/* Event Cards in this block */}
      <div className="space-y-2.5">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            isFavorite={isFavorite(event.id)}
            isSeen={isSeen(event.id)}
            hasConflict={hasConflict(event.id)}
            onToggleFavorite={onToggleFavorite}
            onToggleSeen={onToggleSeen}
            onSelect={onSelectEvent}
          />
        ))}
      </div>
    </section>
  );
};
