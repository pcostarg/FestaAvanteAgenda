/**
 * Festa do Avante! 2025 - Export Modal Component
 * File: src/components/sharing/ExportModal.tsx
 *
 * Full-featured export dialog providing:
 * 1. High-contrast QR Code on-screen display (QrDisplay)
 * 2. One-click shareable link copying with navigator.clipboard fallback
 * 3. JSON backup download (minha-agenda-avante.json) with size indicator & Blob leak prevention
 * 4. RFC 5545 calendar download (meu_avante_2025.ics) with midnight hour roll
 */

import React, { useState, useEffect, useMemo } from 'react';
import type { FestivalEvent } from '../../types/program';
import { QrDisplay } from './QrDisplay';
import { encodeSharePayload, createShareUrl } from '../../utils/sharePayload';
import { generateIcsCalendar, downloadIcsCalendar } from '../../utils/ics';
import { createJsonBackup, downloadJsonBackup } from '../../utils/jsonBackup';
import {
  X,
  QrCode as QrIcon,
  Link2,
  Copy,
  Check,
  Download,
  Calendar,
  FileJson,
  Share2,
  Sparkles,
} from 'lucide-react';

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  favorites: string[];
  seen: string[];
  events: FestivalEvent[];
  onToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export type ExportTab = 'qr' | 'link' | 'json' | 'ics';

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  favorites,
  seen,
  events,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<ExportTab>('qr');
  const [copied, setCopied] = useState<boolean>(false);

  // Keyboard Escape listener (T2-F15-04)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Compute shareable payload and full URL
  const sharePayload = useMemo(() => {
    return encodeSharePayload(favorites, seen);
  }, [favorites, seen]);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const base = `${window.location.origin}${window.location.pathname}`;
    return createShareUrl(sharePayload, base);
  }, [sharePayload]);

  // Filter actual event objects for favorited acts
  const favoritedEvents = useMemo(() => {
    const favSet = new Set(favorites);
    return events.filter((ev) => favSet.has(ev.id));
  }, [events, favorites]);

  // JSON Export payload & approximate size calculation (T2-F15-05)
  const jsonBackupData = useMemo(() => {
    return createJsonBackup(favorites, seen, favoritedEvents);
  }, [favorites, seen, favoritedEvents]);

  const jsonSizeKb = useMemo(() => {
    const jsonString = JSON.stringify(jsonBackupData, null, 2);
    const bytes = new Blob([jsonString]).size;
    return (bytes / 1024).toFixed(1);
  }, [jsonBackupData]);

  // 1. Copy Link Handler with Robust Fallback (T1-F15-04, T2-F15-02)
  const handleCopyLink = async () => {
    if (!shareUrl) return;

    let success = false;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        success = true;
      }
    } catch {
      success = false;
    }

    // Fallback using invisible textarea (T2-F15-02)
    if (!success && typeof document !== 'undefined') {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        success = document.execCommand('copy');
        document.body.removeChild(textArea);
      } catch {
        success = false;
      }
    }

    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onToast?.('Link copiado para a área de transferência!', 'success');
    } else {
      onToast?.('Não foi possível copiar automaticamente. Seleciona o link manualmente.', 'error');
    }
  };

  // 2. Download minha-agenda-avante.json (T1-F17-01 to T1-F17-05)
  const handleDownloadJson = () => {
    try {
      downloadJsonBackup(jsonBackupData);
      onToast?.('Ficheiro minha-agenda-avante.json descarregado com sucesso!', 'success');
    } catch (err) {
      console.error('Erro ao descarregar JSON:', err);
      onToast?.('Erro ao descarregar ficheiro JSON.', 'error');
    }
  };

  // 3. Download meu_avante_2025.ics (T1-F18-01 to T1-F18-05)
  const handleDownloadIcs = () => {
    try {
      const icsContent = generateIcsCalendar(favoritedEvents);
      downloadIcsCalendar(icsContent);
      onToast?.('Calendário meu_avante_2025.ics descarregado com sucesso!', 'success');
    } catch (err) {
      console.error('Erro ao gerar ficheiro ICS:', err);
      onToast?.('Erro ao gerar ficheiro de calendário.', 'error');
    }
  };

  if (!isOpen) return null;

  // Notice matching T1-F15-03 & T2-F15-01
  const countNotice =
    favorites.length === 0
      ? 'Nenhum evento selecionado'
      : `A exportar ${favorites.length} eventos`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
    >
      {/* Backdrop with blur */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-lg bg-surface-card border border-border-subtle rounded-2xl shadow-card-elevation z-10 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border-subtle flex items-center justify-between gap-3 bg-surface-container/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-amber/10 text-brand-amber border border-brand-amber/20">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="export-modal-title"
                className="font-display font-bold text-lg text-text-primary tracking-tight"
              >
                Partilhar & Exportar
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                    favorites.length > 0
                      ? 'bg-brand-crimson/15 text-brand-crimson-bright border-brand-crimson/30'
                      : 'bg-surface-container text-text-muted border-border-subtle'
                  }`}
                >
                  {countNotice}
                </span>
                {favorites.length > 0 && (
                  <span className="text-[11px] text-text-muted">
                    ({seen.length} já vistos)
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-primary rounded-xl hover:bg-surface-container transition-colors"
            aria-label="Fechar janela de partilha"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-4 sm:px-5 pt-3 border-b border-border-subtle bg-surface-container/30">
          <nav className="flex space-x-1 sm:space-x-2" role="tablist">
            <button
              role="tab"
              aria-selected={activeTab === 'qr'}
              onClick={() => setActiveTab('qr')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-xl border-b-2 transition-all ${
                activeTab === 'qr'
                  ? 'border-brand-crimson text-brand-crimson-bright bg-surface-container'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <QrIcon className="w-3.5 h-3.5" />
              <span>Código QR</span>
            </button>

            <button
              role="tab"
              aria-selected={activeTab === 'link'}
              onClick={() => setActiveTab('link')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-xl border-b-2 transition-all ${
                activeTab === 'link'
                  ? 'border-brand-crimson text-brand-crimson-bright bg-surface-container'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Link Direto</span>
            </button>

            <button
              role="tab"
              aria-selected={activeTab === 'json'}
              onClick={() => setActiveTab('json')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-xl border-b-2 transition-all ${
                activeTab === 'json'
                  ? 'border-brand-crimson text-brand-crimson-bright bg-surface-container'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <FileJson className="w-3.5 h-3.5" />
              <span>Backup JSON</span>
            </button>

            <button
              role="tab"
              aria-selected={activeTab === 'ics'}
              onClick={() => setActiveTab('ics')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-xl border-b-2 transition-all ${
                activeTab === 'ics'
                  ? 'border-brand-crimson text-brand-crimson-bright bg-surface-container'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Calendário</span>
            </button>
          </nav>
        </div>

        {/* Tab Content Container */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* TAB 1: QR CODE */}
          {activeTab === 'qr' && (
            <div className="flex flex-col items-center space-y-4">
              <QrDisplay value={shareUrl} size={220} />

              <div className="w-full flex flex-col sm:flex-row items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full py-2.5 px-4 bg-brand-crimson hover:bg-brand-crimson-bright text-text-primary text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 active:scale-98"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Link Copiado!' : 'Copiar Link de Partilha'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: DIRECT SHAREABLE LINK */}
          {activeTab === 'link' && (
            <div className="space-y-4">
              <p className="text-xs text-text-secondary leading-relaxed">
                Envia este link direto a amigos por mensagem, WhatsApp ou redes sociais.
                Ao abrir o link, a tua seleção será importada automaticamente para o dispositivo deles.
              </p>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                  URL de Partilha
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    className="w-full h-11 pl-3 pr-28 text-xs font-mono bg-surface-container-high border border-border-subtle rounded-xl text-text-primary select-all focus:outline-none focus:border-brand-crimson"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="absolute right-1.5 h-8 px-3 text-xs font-bold rounded-lg bg-brand-crimson text-text-primary hover:bg-brand-crimson-bright flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-container border border-border-subtle flex items-start gap-2.5 text-xs text-text-secondary">
                <Sparkles className="w-4 h-4 text-brand-amber shrink-0 mt-0.5" />
                <p>
                  O link contém todos os identificadores codificados de forma comprimida e segura
                  (Base64URL), sem necessidade de registo nem servidores intermédios.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: JSON BACKUP FILE */}
          {activeTab === 'json' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-surface-container border border-border-subtle flex items-start gap-3">
                <FileJson className="w-8 h-8 text-stage-blue shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-display font-bold text-sm text-text-primary">
                    minha-agenda-avante.json
                  </h4>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Cópia de segurança completa do teu horário local em formato JSON standard.
                    Permite restaurar ou migrar a tua agenda para outro navegador ou computador.
                  </p>
                  <div className="text-[11px] font-mono text-text-muted pt-1">
                    Tamanho do ficheiro: ~{jsonSizeKb} KB • {favorites.length} favoritos • {seen.length} vistos
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownloadJson}
                className="w-full py-3 px-4 bg-stage-blue hover:bg-blue-600 text-text-primary text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                <Download className="w-4 h-4" />
                <span>Descarregar minha-agenda-avante.json</span>
              </button>
            </div>
          )}

          {/* TAB 4: RFC 5545 ICS CALENDAR */}
          {activeTab === 'ics' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-surface-container border border-border-subtle flex items-start gap-3">
                <Calendar className="w-8 h-8 text-tertiary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-display font-bold text-sm text-text-primary">
                    meu_avante_2025.ics
                  </h4>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Ficheiro de calendário standard RFC 5545 compatível com Google Calendar, Apple
                    Calendar e Microsoft Outlook.
                  </p>
                  <p className="text-[11px] text-text-muted pt-1">
                    Os concertos noturnos após a meia-noite são devidamente calculados com o dia
                    seguinte correto.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownloadIcs}
                className="w-full py-3 px-4 bg-tertiary hover:bg-emerald-600 text-text-primary text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                <Download className="w-4 h-4" />
                <span>Descarregar meu_avante_2025.ics</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 px-5 bg-surface-container border-t border-border-subtle flex items-center justify-between text-xs text-text-muted">
          <span>Festa do Avante! 2025 • PWA Offline</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-text-secondary hover:text-text-primary rounded-lg hover:bg-surface-card transition-colors font-medium"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
