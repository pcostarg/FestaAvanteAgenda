/**
 * Festa do Avante! 2025 - JSON Backup Uploader Component
 * File: src/components/sharing/JsonBackupUploader.tsx
 *
 * Drag-and-drop & file picker component restoring schedule backups
 * from minha-agenda-avante.json with schema validation and sanitization.
 */

import React, { useRef, useState } from 'react';
import { FileJson, AlertCircle } from 'lucide-react';
import { validateJsonBackup } from '../../utils/jsonBackup';
import { validateScheduleStorage, sanitizeIdArray } from '../../utils/scheduleStorage';
import type { DecodedScheduleData } from '../../utils/sharePayload';

export interface JsonBackupUploaderProps {
  onSuccess: (data: DecodedScheduleData) => void;
  onError?: (error: string) => void;
}

export const JsonBackupUploader: React.FC<JsonBackupUploaderProps> = ({ onSuccess, onError }) => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = (file: File | null) => {
    if (!file) return;
    setErrorMessage(null);

    // 1. Format filter validation (T1-F22-01)
    const isJsonExt = file.name.toLowerCase().endsWith('.json');
    const isJsonMime = file.type === 'application/json' || file.type === '';
    if (!isJsonExt && !isJsonMime) {
      const msg = 'Por favor seleciona um ficheiro .json válido.';
      setErrorMessage(msg);
      onError?.(msg);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          // Syntax corruption (T2-F22-01)
          throw new Error('Ficheiro JSON corrompido ou inválido.');
        }

        // Schema validation (T2-F22-02, T2-F22-03)
        // Accepts official minha-agenda-avante.json backups (validateJsonBackup)
        // or raw storage dumps with updatedAt (validateScheduleStorage)
        const backupValidation = validateJsonBackup(parsed);
        let isValid = backupValidation.valid;
        let validationError = backupValidation.errors[0];

        if (!isValid) {
          const storageValidation = validateScheduleStorage(parsed);
          if (storageValidation.valid) {
            isValid = true;
          } else {
            validationError = backupValidation.errors[0] || storageValidation.errors[0] || 'Formato de agenda inválido.';
          }
        }

        if (!isValid) {
          throw new Error(validationError || 'Formato de agenda inválido.');
        }

        const obj = parsed as Record<string, unknown>;
        const favorites = sanitizeIdArray(obj.favorites);
        const seen = sanitizeIdArray(obj.seen);

        if (fileInputRef.current) fileInputRef.current.value = '';
        setIsProcessing(false);

        onSuccess({ favorites, seen });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao processar ficheiro JSON.';
        setErrorMessage(msg);
        onError?.(msg);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      const msg = 'Falha ao ler o ficheiro local.';
      setErrorMessage(msg);
      onError?.(msg);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setIsProcessing(false);
    };

    reader.readAsText(file);
  };

  return (
    <div className="space-y-3">
      {/* Hidden File Input (T1-F22-01) */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={(e) => handleFile(e.target.files?.[0] || null)}
        className="hidden"
        aria-label="Carregar ficheiro JSON de cópia de segurança"
      />

      {/* Dropzone Container */}
      <div
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          handleFile(e.dataTransfer.files?.[0] || null);
        }}
        className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-150 ${
          isDragOver
            ? 'border-stage-blue bg-stage-blue/10'
            : 'border-border-highlight hover:border-stage-blue bg-surface-container/40 hover:bg-surface-container'
        } ${isProcessing ? 'pointer-events-none opacity-60' : ''}`}
      >
        <div className="w-12 h-12 rounded-full bg-surface-container-high border border-border-subtle flex items-center justify-center mx-auto mb-3 text-text-muted group-hover:text-stage-blue transition-colors">
          <FileJson className="w-6 h-6" />
        </div>

        <h4 className="font-display font-bold text-sm text-text-primary mb-1">
          Restaurar Ficheiro JSON
        </h4>

        <p className="text-xs text-text-secondary max-w-xs mx-auto mb-3 leading-relaxed">
          Seleciona o ficheiro <code className="text-stage-blue font-mono">minha-agenda-avante.json</code> exportado anteriormente.
        </p>

        <span className="inline-block px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface-container-high border border-border-subtle text-text-primary hover:bg-stage-blue transition-colors">
          Selecionar Ficheiro JSON
        </span>
      </div>

      {/* Inline Error Notice */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-brand-crimson/10 border border-brand-crimson/20 flex items-start gap-2 text-xs text-brand-crimson-bright">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
