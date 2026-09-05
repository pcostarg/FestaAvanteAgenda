/**
 * Festa do Avante! 2025 - Local Storage & Reactivity Controller
 * File: src/utils/scheduleStorage.ts
 *
 * Provides reactive persistence in localStorage under key 'avante_schedule_v1',
 * cross-tab synchronization via storage events, intra-tab synchronization
 * via CustomEvent ('avante_schedule_updated'), and memory fallback for private browsing.
 */

import type { UserScheduleStorage, ConflictResolutionAction } from '../types/schedule';

export const LOCAL_STORAGE_KEY = 'avante_schedule_v1';
export const SCHEDULE_UPDATE_EVENT = 'avante_schedule_updated';

// In-memory fallback if localStorage is blocked (Private Browsing / SecurityError)
export class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
  get length(): number {
    return this.store.size;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] || null;
  }
}

function getSafeStorage(): Storage | MemoryStorage {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const testKey = '__storage_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return window.localStorage;
    }
  } catch {
    // Fall back to memory storage on SecurityError or quota
  }
  return new MemoryStorage();
}

const storage = getSafeStorage();

export function validateScheduleStorage(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Schedule payload must be an object'] };
  }
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.favorites)) {
    errors.push('favorites must be an array of event IDs');
  } else if (!obj.favorites.every((id) => typeof id === 'string')) {
    errors.push('all favorite entries must be strings');
  }
  if (!Array.isArray(obj.seen)) {
    errors.push('seen must be an array of event IDs');
  } else if (!obj.seen.every((id) => typeof id === 'string')) {
    errors.push('all seen entries must be strings');
  }
  if (typeof obj.updatedAt !== 'number' || isNaN(obj.updatedAt) || obj.updatedAt < 0) {
    errors.push('updatedAt must be a valid positive Unix timestamp');
  }
  return { valid: errors.length === 0, errors };
}

export function sanitizeIdArray(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  const validStrings = arr.filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
  return Array.from(new Set(validStrings));
}

export class ScheduleStore {
  private static instance: ScheduleStore;
  private state: UserScheduleStorage;
  private listeners = new Set<() => void>();

  private constructor() {
    this.state = this.loadFromStorage();
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorageEvent);
    }
  }

  public static getInstance(): ScheduleStore {
    if (!ScheduleStore.instance) {
      ScheduleStore.instance = new ScheduleStore();
    }
    return ScheduleStore.instance;
  }

  public loadFromStorage(): UserScheduleStorage {
    try {
      const raw = storage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const { valid } = validateScheduleStorage(parsed);
        if (valid) {
          return {
            favorites: sanitizeIdArray(parsed.favorites),
            seen: sanitizeIdArray(parsed.seen),
            updatedAt: parsed.updatedAt,
          };
        }
      }
    } catch {
      // Corrupted JSON fallback
    }
    return {
      favorites: [],
      seen: [],
      updatedAt: Date.now(),
    };
  }

  private persist(newState: UserScheduleStorage): void {
    this.state = newState;
    try {
      storage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newState));
    } catch (err) {
      console.warn('Storage write failed (possibly quota exceeded):', err);
    }
    this.notify();
  }

  private notify(): void {
    if (typeof window !== 'undefined') {
      try {
        const event = typeof CustomEvent !== 'undefined'
          ? new CustomEvent(SCHEDULE_UPDATE_EVENT, { detail: this.state })
          : { type: SCHEDULE_UPDATE_EVENT, detail: this.state };
        window.dispatchEvent(event as Event);
      } catch {
        // Safe dispatch fallback
      }
    }
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (e) {
        console.error('Error in schedule listener:', e);
      }
    }
  }

  private handleStorageEvent = (event: StorageEvent): void => {
    if (event.key === LOCAL_STORAGE_KEY || event.key === null) {
      this.state = this.loadFromStorage();
      for (const listener of this.listeners) {
        try {
          listener();
        } catch (e) {
          console.error('Error in schedule listener:', e);
        }
      }
    }
  };

  public getSnapshot = (): UserScheduleStorage => {
    return this.state;
  };

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  public toggleFavorite(eventId: string): void {
    if (!eventId || typeof eventId !== 'string') return;
    const exists = this.state.favorites.includes(eventId);
    const newFavorites = exists
      ? this.state.favorites.filter((id) => id !== eventId)
      : [...this.state.favorites, eventId];

    this.persist({
      ...this.state,
      favorites: Array.from(new Set(newFavorites)),
      updatedAt: Date.now(),
    });
  }

  public toggleSeen(eventId: string): void {
    if (!eventId || typeof eventId !== 'string') return;
    const exists = this.state.seen.includes(eventId);
    const newSeen = exists
      ? this.state.seen.filter((id) => id !== eventId)
      : [...this.state.seen, eventId];

    this.persist({
      ...this.state,
      seen: Array.from(new Set(newSeen)),
      updatedAt: Date.now(),
    });
  }

  public replaceSchedule(data: { favorites?: string[]; seen?: string[] }): void {
    const favorites = sanitizeIdArray(data.favorites);
    const seen = sanitizeIdArray(data.seen);

    this.persist({
      favorites,
      seen,
      updatedAt: Date.now(),
    });
  }

  public clearSchedule(): void {
    this.persist({
      favorites: [],
      seen: [],
      updatedAt: Date.now(),
    });
  }

  public resolveConflict(action: ConflictResolutionAction, eventAId: string, eventBId: string): void {
    if (action === 'keepA') {
      const newFavorites = this.state.favorites.filter((id) => id !== eventBId);
      this.persist({ ...this.state, favorites: newFavorites, updatedAt: Date.now() });
    } else if (action === 'keepB') {
      const newFavorites = this.state.favorites.filter((id) => id !== eventAId);
      this.persist({ ...this.state, favorites: newFavorites, updatedAt: Date.now() });
    } else if (action === 'split') {
      // Split keeps both in favorites
      this.persist({ ...this.state, updatedAt: Date.now() });
    }
  }
}
