/**
 * Festa do Avante! 2025 - High-Contrast QR Code Display Component
 * File: src/components/sharing/QrDisplay.tsx
 *
 * Renders a camera-friendly QR code with high-contrast inverted styling
 * (black modules on a pure white background with mandatory quiet zone padding)
 * ensuring effortless scanning by phone cameras even in low-light festival conditions.
 */

import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { AlertCircle, QrCode as QrIcon } from 'lucide-react';

export interface QrDisplayProps {
  /** The URL or encoded string payload to represent */
  value: string;
  /** Canvas width/height in pixels (default: 240) */
  size?: number;
  /** Optional custom CSS classes for the container */
  className?: string;
  /** Optional helper text displayed below the code */
  caption?: string;
}

export const QrDisplay: React.FC<QrDisplayProps> = ({
  value,
  size = 240,
  className = '',
  caption = 'Apresenta este código no ecrã para ler com a câmara de outro telemóvel.',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(true);

  useEffect(() => {
    if (!value || !canvasRef.current) {
      setIsGenerating(false);
      return;
    }

    let isSubscribed = true;
    setIsGenerating(true);
    setRenderError(null);

    QRCode.toCanvas(
      canvasRef.current,
      value,
      {
        width: size,
        margin: 2, // 2-module internal quiet zone
        color: {
          dark: '#000000', // Pure black modules for maximum contrast
          light: '#FFFFFF', // Pure white background
        },
        errorCorrectionLevel: 'M', // 15% recovery, ideal data density
      },
      (error) => {
        if (!isSubscribed) return;
        setIsGenerating(false);
        if (error) {
          console.error('Falha ao gerar Código QR:', error);
          setRenderError('Não foi possível gerar o código QR para esta seleção.');
        }
      }
    );

    return () => {
      isSubscribed = false;
    };
  }, [value, size]);

  if (!value) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-surface-container rounded-2xl border border-border-subtle text-center">
        <QrIcon className="w-12 h-12 text-text-muted mb-2 opacity-50" />
        <p className="text-xs text-text-secondary font-medium">
          Nenhum dado disponível para gerar o código QR.
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {/* High-Contrast Container: Inverted White Card against Obsidian Canvas */}
      <div className="relative p-4 sm:p-5 bg-white rounded-2xl shadow-xl border-4 border-surface-container flex flex-col items-center justify-center">
        {renderError ? (
          <div className="w-[240px] h-[240px] flex flex-col items-center justify-center p-4 text-center text-brand-crimson">
            <AlertCircle className="w-8 h-8 mb-2" />
            <p className="text-xs font-semibold">{renderError}</p>
          </div>
        ) : (
          <>
            <canvas
              ref={canvasRef}
              className="rounded-lg max-w-full h-auto block"
              aria-label="Código QR da Agenda"
            />
            {isGenerating && (
              <div className="absolute inset-0 bg-white/90 rounded-2xl flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-brand-crimson border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </>
        )}
      </div>

      {caption && (
        <p className="text-xs text-text-secondary text-center mt-3 max-w-xs font-medium leading-relaxed">
          {caption}
        </p>
      )}
    </div>
  );
};
