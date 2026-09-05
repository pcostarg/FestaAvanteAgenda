/**
 * Festa do Avante! 2025 - Image File QR Code Uploader
 * File: src/components/sharing/ImageQrUploader.tsx
 *
 * Drag-and-drop & file picker component decoding QR codes from photos/screenshots
 * via html5-qrcode's scanFile API, with MIME filtering, 15MB boundary, and input reset.
 */

import React, { useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { UploadCloud, AlertCircle, RefreshCw } from 'lucide-react';
import { extractScheduleFromScannedText, DecodedScheduleData } from '../../utils/sharePayload';

export const MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB per T2-F21-03

export interface ImageQrUploaderProps {
  onSuccess: (data: DecodedScheduleData) => void;
  onError?: (error: string) => void;
}

export const ImageQrUploader: React.FC<ImageQrUploaderProps> = ({ onSuccess, onError }) => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setErrorMessage(null);

    // 1. Boundary: MIME type validation (T2-F21-02)
    if (!file.type.startsWith('image/')) {
      const msg = 'Por favor, seleciona um ficheiro de imagem válido (PNG, JPG, WebP).';
      setErrorMessage(msg);
      onError?.(msg);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // 2. Boundary: Max file size 15MB (T2-F21-03)
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      const msg = 'A imagem é demasiado grande (máximo 15MB).';
      setErrorMessage(msg);
      onError?.(msg);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsProcessing(true);

    try {
      // Ensure a DOM container element exists for html5-qrcode
      const tempContainerId = 'qr-image-temp-canvas';
      let container = document.getElementById(tempContainerId);
      if (!container) {
        container = document.createElement('div');
        container.id = tempContainerId;
        container.style.display = 'none';
        document.body.appendChild(container);
      }

      const html5Qr = new Html5Qrcode(tempContainerId, false);
      let decodedText: string;
      try {
        decodedText = await html5Qr.scanFile(file, false);
      } catch (scanErr: unknown) {
        const errStr = String(scanErr);
        if (
          errStr.includes('No QR code found') ||
          errStr.includes('No MultiFormat Readers') ||
          errStr.includes('NotFoundException')
        ) {
          throw new Error('Não foi encontrado nenhum código QR nesta imagem.');
        }
        throw new Error('Não foi encontrado nenhum código QR nesta imagem.');
      } finally {
        try {
          html5Qr.clear();
        } catch {
          // Teardown safe
        }
      }

      // Extract and decode schedule payload
      const schedule = extractScheduleFromScannedText(decodedText);

      // Reset input value to allow re-uploading same file (T1-F21-04)
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setIsProcessing(false);
      onSuccess(schedule);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Não foi encontrado nenhum código QR nesta imagem.';
      setErrorMessage(msg);
      onError?.(msg);
      // Reset input value on error too (T1-F21-04)
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Hidden DOM sandbox container */}
      <div id="qr-image-temp-canvas" className="hidden" aria-hidden="true" />

      {/* Hidden File Input (T1-F21-01) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFile(e.target.files?.[0] || null)}
        className="hidden"
        aria-label="Carregar imagem com código QR"
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
            ? 'border-brand-crimson bg-brand-crimson/10'
            : 'border-border-highlight hover:border-brand-crimson bg-surface-container/40 hover:bg-surface-container'
        } ${isProcessing ? 'pointer-events-none opacity-60' : ''}`}
      >
        <div className="w-12 h-12 rounded-full bg-surface-container-high border border-border-subtle flex items-center justify-center mx-auto mb-3 text-text-muted group-hover:text-brand-crimson transition-colors">
          {isProcessing ? (
            <RefreshCw className="w-6 h-6 animate-spin text-brand-amber" />
          ) : (
            <UploadCloud className="w-6 h-6" />
          )}
        </div>

        <h4 className="font-display font-bold text-sm text-text-primary mb-1">
          {isProcessing ? 'A analisar imagem...' : 'Carregar Foto ou Captura de Ecrã'}
        </h4>

        <p className="text-xs text-text-secondary max-w-xs mx-auto mb-3 leading-relaxed">
          Arrasta uma imagem com um Código QR da agenda ou clica para procurar no dispositivo.
        </p>

        <span className="inline-block px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface-container-high border border-border-subtle text-text-primary hover:bg-brand-crimson transition-colors">
          Selecionar Imagem
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
