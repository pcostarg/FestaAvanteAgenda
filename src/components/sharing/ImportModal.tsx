/**
 * Festa do Avante! 2025 - Import Modal Component
 * File: src/components/sharing/ImportModal.tsx
 *
 * Full-featured import dialog offering 3 channels:
 * 1. Camera tab: Live QR code viewfinder (QrScanner)
 * 2. Image upload tab: File picker / dropzone to decode photo/screenshot (ImageQrUploader)
 * 3. JSON file tab: File picker / dropzone to restore minha-agenda-avante.json (JsonBackupUploader)
 *
 * Architectural Rule:
 * Silently and directly replaces local schedule state (Silent Direct Overwrite Rule).
 * Never triggers window.confirm() prompts (prohibited by T2-F24-04).
 */

import React, { useState, useEffect } from 'react';
import { QrScanner } from './QrScanner';
import { ImageQrUploader } from './ImageQrUploader';
import { JsonBackupUploader } from './JsonBackupUploader';
import { extractScheduleFromScannedText, DecodedScheduleData } from '../../utils/sharePayload';
import {
  X,
  Camera,
  Image as ImageIcon,
  FileJson,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react';

export interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (data: { favorites: string[]; seen: string[] }) => void;
  onToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export type ImportTab = 'camera' | 'image' | 'json';

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<ImportTab>('camera');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Clear errors when opening modal or switching tabs
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
    }
  }, [isOpen, activeTab]);

  // Keyboard Escape listener (T2-F19-04)
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

  // Centralized success dispatcher complying with Silent Direct Overwrite
  const applyImportData = (
    data: DecodedScheduleData,
    successToastText: string
  ) => {
    // Overwrite without window.confirm() (T1-F24-01, T2-F24-04)
    onImportSuccess({ favorites: data.favorites, seen: data.seen });
    onToast?.(successToastText, 'success');
    onClose();
  };

  // 1. Live Camera QR Scan Handler
  const handleCameraScanSuccess = (scannedText: string) => {
    setErrorMessage(null);
    try {
      const schedule = extractScheduleFromScannedText(scannedText);
      applyImportData(schedule, 'Código QR lido com sucesso!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Código QR lido é inválido.';
      setErrorMessage(msg);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
    >
      {/* Backdrop */}
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
            <div className="p-2 rounded-xl bg-stage-blue/10 text-stage-blue border border-stage-blue/20">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="import-modal-title"
                className="font-display font-bold text-lg text-text-primary tracking-tight"
              >
                Importar Agenda
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Restaura ou sincroniza a agenda de outro festivaleiro
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-primary rounded-xl hover:bg-surface-container transition-colors"
            aria-label="Fechar janela de importação"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation (T1-F19-02) */}
        <div className="px-4 sm:px-5 pt-3 border-b border-border-subtle bg-surface-container/30">
          <nav className="flex space-x-1 sm:space-x-2" role="tablist">
            <button
              role="tab"
              aria-selected={activeTab === 'camera'}
              onClick={() => {
                setActiveTab('camera');
                setErrorMessage(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-xl border-b-2 transition-all ${
                activeTab === 'camera'
                  ? 'border-brand-crimson text-brand-crimson-bright bg-surface-container'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Câmara</span>
            </button>

            <button
              role="tab"
              aria-selected={activeTab === 'image'}
              onClick={() => {
                setActiveTab('image');
                setErrorMessage(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-xl border-b-2 transition-all ${
                activeTab === 'image'
                  ? 'border-brand-crimson text-brand-crimson-bright bg-surface-container'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Imagem QR</span>
            </button>

            <button
              role="tab"
              aria-selected={activeTab === 'json'}
              onClick={() => {
                setActiveTab('json');
                setErrorMessage(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-xl border-b-2 transition-all ${
                activeTab === 'json'
                  ? 'border-brand-crimson text-brand-crimson-bright bg-surface-container'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <FileJson className="w-3.5 h-3.5" />
              <span>Ficheiro JSON</span>
            </button>
          </nav>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Explanatory Overwrite Advisory (T1-F19-03) */}
          <div className="p-3.5 rounded-xl bg-brand-amber/10 border border-brand-amber/20 flex items-start gap-2.5 text-xs text-brand-amber">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="font-bold">Atenção:</strong> A importação irá substituir o teu
              horário local. A tua lista atual de favoritos e vistos será atualizada diretamente com
              os novos dados.
            </p>
          </div>

          {/* Error Notice */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-brand-crimson/10 border border-brand-crimson/20 flex items-start gap-2.5 text-xs text-brand-crimson-bright animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">{errorMessage}</p>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="p-1 text-brand-crimson-bright hover:opacity-80"
                aria-label="Dispensar erro"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* TAB 1: LIVE CAMERA QR SCANNER */}
          {activeTab === 'camera' && (
            <div className="space-y-3">
              <QrScanner
                onScanSuccess={handleCameraScanSuccess}
                onError={(err) => setErrorMessage(err)}
                onSwitchToFallback={() => setActiveTab('image')}
              />
            </div>
          )}

          {/* TAB 2: IMAGE FILE QR UPLOAD */}
          {activeTab === 'image' && (
            <div className="space-y-3">
              <ImageQrUploader
                onSuccess={(data) => applyImportData(data, 'Código QR lido com sucesso!')}
                onError={(err) => setErrorMessage(err)}
              />
            </div>
          )}

          {/* TAB 3: JSON FILE UPLOAD */}
          {activeTab === 'json' && (
            <div className="space-y-3">
              <JsonBackupUploader
                onSuccess={(data) => applyImportData(data, 'Agenda importada com sucesso!')}
                onError={(err) => setErrorMessage(err)}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 px-5 bg-surface-container border-t border-border-subtle flex items-center justify-between text-xs text-text-muted">
          <span>Substituição direta e segura</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-text-secondary hover:text-text-primary rounded-lg hover:bg-surface-card transition-colors font-medium"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
