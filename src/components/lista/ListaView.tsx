import React, { useState, useMemo } from 'react';
import type { FestivalEvent, FestivalDay, EventCategory, TimeBlock } from '../../types/program';
import { FESTIVAL_EVENTS } from '../../data/program';
import { DaySwitcher } from './DaySwitcher';
import { CategoryFilterChips } from './CategoryFilterChips';
import { TimeBlockSection } from './TimeBlockSection';
import { normalizeDayKey, timeToFestivalMinutes } from '../../utils/conflictDetector';
import { getFestivalDayFromDate } from '../../hooks/useFestivalTime';
import { Search, EyeOff, RotateCcw, Sparkles, X } from 'lucide-react';

export interface ListaViewProps {
  events?: FestivalEvent[];
  favorites: string[];
  seen: string[];
  toggleFavorite: (id: string) => void;
  toggleSeen: (id: string) => void;
  isFavorite: (id: string) => boolean;
  isSeen: (id: string) => boolean;
  hasConflict: (id: string, dayDateOrSlug: string, allEvents: FestivalEvent[]) => boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onSelectEvent?: (event: FestivalEvent) => void;
  selectedDay?: FestivalDay;
  onSelectDay?: (day: FestivalDay) => void;
}

// Unicode NFD diacritic stripping for search
export const normalizeText = (str: string): string =>
  (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

// 4 canonical time blocks
const TIME_BLOCK_ORDER: TimeBlock[] = ['manha', 'tarde', 'anoitecer', 'noite-principal'];

export function getEventTimeBlock(event: FestivalEvent): TimeBlock {
  if (event.timeBlock) return event.timeBlock;
  const startStr = event.startTime || event.timeStart;
  if (!startStr) return 'noite-principal';
  try {
    const mins = timeToFestivalMinutes(startStr);
    if (mins < 13 * 60) return 'manha';
    if (mins < 18 * 60) return 'tarde';
    if (mins < 21 * 60) return 'anoitecer';
    return 'noite-principal';
  } catch {
    return 'noite-principal';
  }
}

export const ListaView: React.FC<ListaViewProps> = ({
  events = FESTIVAL_EVENTS,
  favorites: _favorites,
  seen: _seen,
  toggleFavorite,
  toggleSeen,
  isFavorite,
  isSeen,
  hasConflict,
  searchQuery = '',
  onSearchChange,
  onSelectEvent,
  selectedDay: propSelectedDay,
  onSelectDay,
}) => {
  const [localSelectedDay, setLocalSelectedDay] = useState<FestivalDay>(() => getFestivalDayFromDate(new Date()));
  const selectedDay = propSelectedDay ?? localSelectedDay;

  const handleDaySwitch = (day: FestivalDay) => {
    if (onSelectDay) {
      onSelectDay(day);
    } else {
      setLocalSelectedDay(day);
    }
  };

  const [selectedCategory, setSelectedCategory] = useState<EventCategory | null>(null);
  const [hideSeen, setHideSeen] = useState<boolean>(false);

  // 1. Filter by selected festival day
  const eventsOnDay = useMemo(() => {
    return events.filter(
      (e) => normalizeDayKey(e.day || e.date || e.dayCode || '') === selectedDay
    );
  }, [events, selectedDay]);

  // Counts for Day tabs
  const dayCounts = useMemo(() => {
    const counts: Partial<Record<FestivalDay, number>> = {
      sexta: 0,
      sabado: 0,
      domingo: 0,
    };
    for (const ev of events) {
      const k = normalizeDayKey(ev.day || ev.date || ev.dayCode || '');
      counts[k] = (counts[k] || 0) + 1;
    }
    return counts;
  }, [events]);

  // Counts for Categories on current day
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ev of eventsOnDay) {
      counts[ev.category] = (counts[ev.category] || 0) + 1;
    }
    return counts;
  }, [eventsOnDay]);

  // 2. Filter by category, search query, and hide seen
  const normalizedQuery = useMemo(() => normalizeText(searchQuery), [searchQuery]);

  const filteredEvents = useMemo(() => {
    return eventsOnDay.filter((ev) => {
      // Category filter
      if (selectedCategory && ev.category !== selectedCategory) {
        return false;
      }

      // Hide seen filter
      if (hideSeen && isSeen(ev.id)) {
        return false;
      }

      // Search query filter (diacritic-insensitive substring)
      if (normalizedQuery) {
        const titleNorm = normalizeText(ev.title);
        const stageNorm = normalizeText(ev.stage);
        const descNorm = normalizeText(ev.description || '');
        const catNorm = normalizeText(ev.category);
        const tagsNorm = (ev.tags || []).map(normalizeText).join(' ');

        const matches =
          titleNorm.includes(normalizedQuery) ||
          stageNorm.includes(normalizedQuery) ||
          descNorm.includes(normalizedQuery) ||
          catNorm.includes(normalizedQuery) ||
          tagsNorm.includes(normalizedQuery);

        if (!matches) return false;
      }

      return true;
    });
  }, [eventsOnDay, selectedCategory, hideSeen, isSeen, normalizedQuery]);

  // Group filtered events into 4 time blocks
  const eventsByBlock = useMemo(() => {
    const map = new Map<TimeBlock, FestivalEvent[]>();
    for (const b of TIME_BLOCK_ORDER) {
      map.set(b, []);
    }

    for (const ev of filteredEvents) {
      const block = getEventTimeBlock(ev);
      if (!map.has(block)) {
        map.set(block, []);
      }
      map.get(block)!.push(ev);
    }

    // Sort events within each block chronologically by start time
    for (const blockList of map.values()) {
      blockList.sort((a, b) => {
        const timeA = timeToFestivalMinutes(a.startTime || a.timeStart || '00:00');
        const timeB = timeToFestivalMinutes(b.startTime || b.timeStart || '00:00');
        return timeA - timeB;
      });
    }

    return map;
  }, [filteredEvents]);

  // Edge Case: All acts on day are seen and hidden
  const allActsSeenOnDay =
    hideSeen &&
    eventsOnDay.length > 0 &&
    filteredEvents.length === 0 &&
    eventsOnDay.every((ev) => isSeen(ev.id));

  return (
    <div className="space-y-4">
      {/* Top Header & Day Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border-subtle">
        <div>
          <h1 className="font-display font-extrabold text-2xl md:text-3xl text-text-primary tracking-tight">
            Lista Cronológica
          </h1>
          <p className="text-text-secondary text-xs md:text-sm mt-0.5">
            Programação diária em blocos horários com filtros rápidos.
          </p>
        </div>

        {/* Day Switcher */}
        <DaySwitcher
          activeDay={selectedDay}
          onDayChange={handleDaySwitch}
          counts={dayCounts}
        />
      </div>

      {/* Mobile Search Bar (Directly accessible on mobile when in Lista mode) */}
      <div className="relative lg:hidden flex items-center">
        <div className="absolute left-3.5 pointer-events-none text-text-muted flex items-center">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder="Pesquisar artistas, palcos, categorias..."
          className="w-full h-11 pl-10 pr-10 text-sm bg-surface-card border border-border-subtle rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-highlight focus:ring-1 focus:ring-brand-crimson transition-all shadow-sm"
          aria-label="Pesquisar programação na lista"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange?.('')}
            className="absolute right-3 p-1 text-text-muted hover:text-text-primary rounded-full hover:bg-surface-overlay transition-colors"
            aria-label="Limpar pesquisa"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category Ribbon */}
      <CategoryFilterChips
        activeCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        counts={categoryCounts}
        totalCount={eventsOnDay.length}
      />

      {/* Quick Controls Bar: "Ocultar já vistos" & Result Count */}
      <div className="flex items-center justify-between bg-surface-card px-4 py-2.5 rounded-xl border border-border-subtle">
        <div className="text-xs text-text-muted font-medium">
          A mostrar{' '}
          <span className="font-bold text-text-primary font-mono">
            {filteredEvents.length}
          </span>{' '}
          de {eventsOnDay.length} atividades
        </div>

        {/* Hide Seen Switch */}
        <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs font-semibold text-text-secondary hover:text-text-primary">
          <input
            type="checkbox"
            checked={hideSeen}
            onChange={(e) => setHideSeen(e.target.checked)}
            className="sr-only peer"
            aria-label="Ocultar eventos já vistos"
          />
          <div className="w-8 h-4 bg-surface-container peer-focus:outline-none rounded-full relative peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-secondary after:border-border-subtle after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-tertiary peer-checked:after:bg-white" />
          <span className="flex items-center gap-1">
            <EyeOff className="w-3.5 h-3.5" />
            Ocultar já vistos
          </span>
        </label>
      </div>

      {/* Feed Content */}
      {allActsSeenOnDay ? (
        /* Notice when all acts on this day are seen and hidden */
        <div className="py-12 px-4 text-center rounded-2xl bg-surface-card border border-border-subtle space-y-3">
          <div className="w-12 h-12 rounded-full bg-tertiary/10 text-tertiary flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="font-display font-bold text-base text-text-primary">
            Todas as atividades deste dia já foram vistas!
          </h3>
          <p className="text-xs text-text-secondary max-w-md mx-auto">
            Marcaste todos os eventos programados para {selectedDay} como concluídos. Desativa "Ocultar já vistos" para os rever.
          </p>
          <button
            type="button"
            onClick={() => setHideSeen(false)}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-surface-container text-text-primary hover:bg-surface-container-high border border-border-subtle transition-colors"
          >
            Mostrar eventos concluídos
          </button>
        </div>
      ) : filteredEvents.length === 0 ? (
        /* Empty State when search or category filter yields 0 matches */
        <div className="py-12 px-4 text-center rounded-2xl bg-surface-card border border-border-subtle space-y-3">
          <div className="w-12 h-12 rounded-full bg-surface-container text-text-muted flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="font-display font-bold text-base text-text-primary">
            Nenhum evento encontrado
          </h3>
          <p className="text-xs text-text-secondary max-w-md mx-auto">
            Não foram encontradas atividades correspondentes aos filtros selecionados.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory(null);
              setHideSeen(false);
              onSearchChange?.('');
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-brand-crimson text-text-primary hover:bg-brand-crimson-bright shadow-sm transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Limpar filtros
          </button>
        </div>
      ) : (
        /* Chronological Sections by Time Block */
        <div className="space-y-6">
          {TIME_BLOCK_ORDER.map((blockId) => (
            <TimeBlockSection
              key={blockId}
              blockId={blockId}
              events={eventsByBlock.get(blockId) || []}
              isFavorite={isFavorite}
              isSeen={isSeen}
              hasConflict={(id) => hasConflict(id, selectedDay, events)}
              onToggleFavorite={toggleFavorite}
              onToggleSeen={toggleSeen}
              onSelectEvent={onSelectEvent}
            />
          ))}
        </div>
      )}
    </div>
  );
};
