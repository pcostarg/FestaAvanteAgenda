// tests/e2e/lib/mock-env.mjs
// Isolated in-memory browser environment for opaque-box contract testing

import {
  LOCAL_STORAGE_KEY,
  detectScheduleConflicts,
  validateScheduleStorage,
} from './contracts.mjs';

export class MockLocalStorage {
  constructor() {
    this.store = new Map();
  }

  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }

  setItem(key, value) {
    const oldValue = this.getItem(key);
    const newValue = String(value);
    this.store.set(key, newValue);

    if (globalThis.window && typeof globalThis.window.dispatchEvent === 'function') {
      const event = {
        type: 'storage',
        key,
        oldValue,
        newValue,
        storageArea: this,
      };
      globalThis.window.dispatchEvent(event);
    }
  }

  removeItem(key) {
    const oldValue = this.getItem(key);
    this.store.delete(key);

    if (globalThis.window && typeof globalThis.window.dispatchEvent === 'function') {
      const event = {
        type: 'storage',
        key,
        oldValue,
        newValue: null,
        storageArea: this,
      };
      globalThis.window.dispatchEvent(event);
    }
  }

  clear() {
    this.store.clear();
    if (globalThis.window && typeof globalThis.window.dispatchEvent === 'function') {
      const event = {
        type: 'storage',
        key: null,
        oldValue: null,
        newValue: null,
        storageArea: this,
      };
      globalThis.window.dispatchEvent(event);
    }
  }

  get length() {
    return this.store.size;
  }

  key(index) {
    return Array.from(this.store.keys())[index] || null;
  }
}

export class MockWindow {
  constructor() {
    this.listeners = new Map();
    this.location = {
      href: 'https://pcostarg.github.io/FestaAvanteAgenda/',
      pathname: '/FestaAvanteAgenda/',
      search: '',
      hash: '',
    };
    this.history = {
      replaceState: (state, title, url) => {
        this.location.href = url;
        const [path, query] = url.split('?');
        this.location.pathname = path;
        this.location.search = query ? `?${query}` : '';
      },
    };
  }

  addEventListener(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type).push(callback);
  }

  removeEventListener(type, callback) {
    if (!this.listeners.has(type)) return;
    const filtered = this.listeners.get(type).filter((cb) => cb !== callback);
    this.listeners.set(type, filtered);
  }

  dispatchEvent(event) {
    const type = event.type;
    if (this.listeners.has(type)) {
      for (const cb of this.listeners.get(type)) {
        cb(event);
      }
    }
    return true;
  }
}

/**
 * Pure reactive schedule controller implementing M3 contract
 */
export class ScheduleManager {
  constructor(storage = new MockLocalStorage(), win = new MockWindow()) {
    this.storage = storage;
    this.window = win;
    this.listeners = new Set();
    this._load();
  }

  _load() {
    try {
      const raw = this.storage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const { valid } = validateScheduleStorage(parsed);
        if (valid) {
          this.favorites = parsed.favorites;
          this.seen = parsed.seen;
          this.updatedAt = parsed.updatedAt;
          return;
        }
      }
    } catch {
      // Fallback on corrupt JSON
    }
    this.favorites = [];
    this.seen = [];
    this.updatedAt = Date.now();
  }

  _save() {
    this.updatedAt = Date.now();
    const payload = {
      favorites: this.favorites,
      seen: this.seen,
      updatedAt: this.updatedAt,
    };
    this.storage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
    this.window.dispatchEvent({ type: 'avante_schedule_updated', detail: payload });
    for (const listener of this.listeners) {
      listener(payload);
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  toggleFavorite(eventId) {
    if (this.favorites.includes(eventId)) {
      this.favorites = this.favorites.filter((id) => id !== eventId);
    } else {
      this.favorites = [...this.favorites, eventId];
    }
    this._save();
  }

  toggleSeen(eventId) {
    if (this.seen.includes(eventId)) {
      this.seen = this.seen.filter((id) => id !== eventId);
    } else {
      this.seen = [...this.seen, eventId];
    }
    this._save();
  }

  isFavorite(eventId) {
    return this.favorites.includes(eventId);
  }

  isSeen(eventId) {
    return this.seen.includes(eventId);
  }

  replaceSchedule({ favorites = [], seen = [] }) {
    this.favorites = Array.isArray(favorites) ? Array.from(new Set(favorites)) : [];
    this.seen = Array.isArray(seen) ? Array.from(new Set(seen)) : [];
    this._save();
  }

  clearSchedule() {
    this.favorites = [];
    this.seen = [];
    this._save();
  }

  getConflictsForDay(dayDate, allEvents) {
    const savedEventsOnDay = allEvents.filter(
      (ev) => ev.day === dayDate && this.favorites.includes(ev.id)
    );
    return detectScheduleConflicts(savedEventsOnDay);
  }

  resolveConflict(action, eventAId, eventBId) {
    if (action === 'keepA') {
      this.favorites = this.favorites.filter((id) => id !== eventBId);
      this._save();
    } else if (action === 'keepB') {
      this.favorites = this.favorites.filter((id) => id !== eventAId);
      this._save();
    } else if (action === 'split') {
      // Both retained, flagged as split
      this._save();
    }
  }
}
