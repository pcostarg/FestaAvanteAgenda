/**
 * Festa do Avante! 2025 - Program & Festival Data Types
 * File: src/types/program.ts
 *
 * Core data contracts for the festival schedule, views, timeline matrices,
 * conflict detection engine, and export/import serializers.
 */

/**
 * The 3 festival days
 */
export type FestivalDay = 'sexta' | 'sabado' | 'domingo';

/**
 * 3-letter day code compatibility type
 */
export type FestivalDayCode = 'fri' | 'sat' | 'sun';

/**
 * UI display labels for festival days
 */
export type DayLabel = 'Sexta 5' | 'Sábado 6' | 'Domingo 7';

/**
 * Primary 9 anchor stages required for Grelha de Palcos matrix view
 */
export type PrimaryFestivalStage =
  | 'Palco 25 de Abril'
  | 'Palco Paz'
  | 'Auditório 1º de Maio'
  | 'Cidade da Juventude'
  | 'Espaço Central'
  | 'Avanteatro'
  | 'CineAvante'
  | 'Espaço Criança'
  | 'Espaço Ciência & Desporto';

/**
 * Readonly tuple of the 9 primary stages in canonical grid display order
 */
export const PRIMARY_STAGES: readonly PrimaryFestivalStage[] = [
  'Palco 25 de Abril',
  'Palco Paz',
  'Auditório 1º de Maio',
  'Cidade da Juventude',
  'Espaço Central',
  'Avanteatro',
  'CineAvante',
  'Espaço Criança',
  'Espaço Ciência & Desporto',
] as const;

/**
 * PrimaryStage alias for compatibility
 */
export type PrimaryStage = PrimaryFestivalStage;

/**
 * Festival stage type: primary anchor stages plus regional spaces / exhibition pavilions
 */
export type FestivalStage =
  | PrimaryFestivalStage
  | 'Espaço Fado'
  | 'Festa do Livro'
  | 'Espaço Internacional'
  | 'Setúbal'
  | 'Lisboa'
  | 'Porto'
  | 'Alentejo'
  | (string & {});

/**
 * Canonical 6 event categories required by R1 and category filter chips
 */
export type EventCategory =
  | 'Música'
  | 'Debates'
  | 'Teatro'
  | 'Cinema'
  | 'Família/Criança'
  | 'Desporto';

/**
 * Readonly array of all 6 canonical categories
 */
export const CATEGORIES: readonly EventCategory[] = [
  'Música',
  'Debates',
  'Teatro',
  'Cinema',
  'Família/Criança',
  'Desporto',
] as const;

/**
 * Normalized category slug for CSS styling and icon mapping
 */
export type EventCategoryKey =
  | 'musica'
  | 'debates'
  | 'teatro'
  | 'cinema'
  | 'familia-crianca'
  | 'desporto';

/**
 * The 4 chronological time blocks for Lista Cronológica feed segmentation
 */
export type TimeBlock = 'manha' | 'tarde' | 'anoitecer' | 'noite-principal';

/**
 * Time block slot alias for test and component compatibility
 */
export type TimeBlockSlot = 'manha' | 'tarde' | 'anoitecer' | 'noite';

/**
 * Metadata definition for time blocks
 */
export interface TimeBlockDefinition {
  id: TimeBlock;
  slot: TimeBlockSlot;
  label: string;
  start: string;
  end: string;
}

/**
 * Authoritative definitions for the 4 chronological time blocks
 */
export const TIME_BLOCK_DEFINITIONS: readonly TimeBlockDefinition[] = [
  { id: 'manha', slot: 'manha', label: 'Manhã', start: '08:30', end: '13:59' },
  { id: 'tarde', slot: 'tarde', label: 'Tarde', start: '14:00', end: '18:59' },
  { id: 'anoitecer', slot: 'anoitecer', label: 'Anoitecer', start: '19:00', end: '21:59' },
  { id: 'noite-principal', slot: 'noite', label: 'Noite Principal', start: '22:00', end: '05:59' },
] as const;

/**
 * Authoritative Festival Event Interface
 * Supports both canonical specification fields and backward-compatible aliases.
 */
export interface FestivalEvent {
  /** Unique stable event identifier (e.g. "1328", "1382_1") */
  id: string;

  /** Title of performance, concert, debate, or activity */
  title: string;

  /** Stage or performance area */
  stage: FestivalStage;

  /** Sub-venue or specific room (e.g. "Ciência", "Desporto", "Auditório", "Fórum") */
  subStage?: string;

  /** Festival day identifier: 'sexta' | 'sabado' | 'domingo' */
  day: FestivalDay;

  /** Display label for the festival day (e.g. "Sexta 5", "Sábado 6", "Domingo 7") */
  dayLabel: DayLabel | string;

  /** ISO calendar date (YYYY-MM-DD): '2025-09-05' | '2025-09-06' | '2025-09-07' */
  date: string;

  /** Start time in 24h format HH:mm (e.g. "19:00", "00:30") */
  startTime: string;

  /** End time in 24h format HH:mm (e.g. "20:30", "02:00") */
  endTime: string;

  /** Categorized chronological time block */
  timeBlock: TimeBlock;

  /** Canonical event category */
  category: EventCategory;

  /** Searchable tags (category, stage, sub-types) */
  tags: string[];

  /** Short description, venue sub-location, or synopsis */
  description: string;

  /** Absolute image URL or undefined */
  imageUrl?: string;

  /** Link to official festival web page or details */
  url?: string;

  // --- Compatibility Aliases for E2E Contracts & ICS Helpers ---
  /** Alias for startTime (used in E2E contracts & ICS helpers) */
  timeStart?: string;

  /** Alias for endTime (used in E2E contracts & ICS helpers) */
  timeEnd?: string;

  /** 3-letter day code ('fri' | 'sat' | 'sun') */
  dayCode?: FestivalDayCode;

  /** Compatibility alias for timeBlock ('manha' | 'tarde' | 'anoitecer' | 'noite') */
  timeSlot?: TimeBlockSlot | string;

  /** Normalized category key slug */
  categoryKey?: EventCategoryKey | string;

  /** Whether this is a headline or featured act */
  highlight?: boolean;
}

/**
 * Festival Day Metadata
 */
export interface FestivalDayMeta {
  day: FestivalDay;
  code: FestivalDayCode;
  date: string;
  label: DayLabel;
  shortLabel: string;
  operatingHours: string;
}

/**
 * Festival Metadata envelope
 */
export interface FestivalMeta {
  name: string;
  year: number;
  dates: string[];
  location: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

/**
 * Full Program Dataset Envelope (for structured API or import payloads)
 */
export interface ProgramData {
  version: string;
  generatedAt: string;
  festival: FestivalMeta;
  stages: FestivalStage[];
  categories: EventCategory[];
  events: FestivalEvent[];
}

/**
 * Type of the default exported program.json dataset array
 */
export type ProgramDataset = FestivalEvent[];
