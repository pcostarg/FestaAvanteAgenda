/**
 * Festa do Avante! 2025 - Global Keyboard Shortcut Hook
 * File: src/hooks/useKeyboardShortcut.ts
 *
 * Implements the global '/' shortcut to quickly focus festival search,
 * with modifier suppression, form element exclusion, and modal detection.
 */

import { useEffect, RefObject } from 'react';

export interface UseKeyboardShortcutOptions {
  searchInputRef?: RefObject<HTMLInputElement | null>;
  onTrigger?: () => void;
  onEscape?: () => void;
  isModalOpen?: boolean;
}

export function useKeyboardShortcut({
  searchInputRef,
  onTrigger,
  onEscape,
  isModalOpen = false,
}: UseKeyboardShortcutOptions): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Check for modal dialogs or explicit isModalOpen flag
      if (isModalOpen || document.querySelector('[role="dialog"]') !== null) {
        return;
      }

      // 2. Modifier key suppression (e.g. Ctrl+/, Cmd+/, Alt+/)
      if (e.ctrlKey || e.altKey || e.metaKey) {
        return;
      }

      if (e.key === '/') {
        const activeElem = document.activeElement;
        const tagName = activeElem?.tagName.toUpperCase();
        const isEditable =
          tagName === 'INPUT' ||
          tagName === 'TEXTAREA' ||
          tagName === 'SELECT' ||
          (activeElem as HTMLElement | null)?.isContentEditable;

        if (!isEditable) {
          e.preventDefault();
          if (searchInputRef?.current) {
            searchInputRef.current.focus();
            searchInputRef.current.select();
          }
          onTrigger?.();
        }
      } else if (e.key === 'Escape') {
        if (
          searchInputRef?.current &&
          document.activeElement === searchInputRef.current
        ) {
          e.preventDefault();
          searchInputRef.current.blur();
          onEscape?.();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchInputRef, onTrigger, onEscape, isModalOpen]);
}
