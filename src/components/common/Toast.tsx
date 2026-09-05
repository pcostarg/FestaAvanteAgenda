/**
 * Festa do Avante! 2025 - Global Toast Feedback Component
 * File: src/components/common/Toast.tsx
 *
 * Lightweight, accessible feedback notification for link copy,
 * image decoding, backup imports, and URL sync confirmation.
 */

import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastData {
  id: number;
  message: string;
  type?: 'success' | 'info' | 'error' | 'warning';
}

export interface ToastProps {
  toast: ToastData | null;
  onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 3500);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const type = toast.type || 'info';

  const iconMap = {
    success: <CheckCircle2 className="w-4 h-4 text-tertiary shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-brand-crimson-bright shrink-0" />,
    warning: <AlertCircle className="w-4 h-4 text-brand-amber shrink-0" />,
    info: <Info className="w-4 h-4 text-stage-blue shrink-0" />,
  };

  const borderMap = {
    success: 'border-tertiary/30 shadow-[0_4px_20px_rgba(16,185,129,0.15)]',
    error: 'border-brand-crimson/30 shadow-[0_4px_20px_rgba(211,47,47,0.15)]',
    warning: 'border-brand-amber/30 shadow-[0_4px_20px_rgba(245,158,11,0.15)]',
    info: 'border-stage-blue/30 shadow-[0_4px_20px_rgba(37,99,235,0.15)]',
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 max-w-sm w-full transition-all transform animate-in slide-in-from-bottom-5 fade-in duration-200"
    >
      <div
        className={`p-3.5 sm:p-4 rounded-xl bg-surface-card/95 backdrop-blur-md border ${borderMap[type]} flex items-center justify-between gap-3 shadow-card-elevation text-xs text-text-primary`}
      >
        <div className="flex items-center gap-2.5">
          {iconMap[type]}
          <span className="font-semibold leading-snug">{toast.message}</span>
        </div>

        <button
          onClick={onDismiss}
          className="p-1 text-text-muted hover:text-text-primary rounded-lg transition-colors shrink-0"
          aria-label="Dispensar notificação"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
