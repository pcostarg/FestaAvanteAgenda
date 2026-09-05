/**
 * Festa do Avante! 2025 - Live QR Code Camera Scanner
 * File: src/components/sharing/QrScanner.tsx
 *
 * Real-time camera viewfinder using html5-qrcode.
 * Manages video tracks, rear-facing camera preference (environment),
 * target overlay box (250x250), duplicate scan suppression,
 * and graceful hardware error handling.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { RefreshCw, Smartphone } from 'lucide-react';

export interface QrScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onError?: (errorMessage: string) => void;
  onSwitchToFallback?: () => void;
}

export const QrScanner: React.FC<QrScannerProps> = ({
  onScanSuccess,
  onError,
  onSwitchToFallback,
}) => {
  const containerId = 'qr-camera-live-viewfinder';
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef<boolean>(false);

  const [hasCameraError, setHasCameraError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isStarting, setIsStarting] = useState<boolean>(true);

  useEffect(() => {
    isProcessingRef.current = false;
    let isMounted = true;

    const startScanner = async () => {
      setIsStarting(true);
      setHasCameraError(false);
      setErrorMessage('');

      try {
        const scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;

        // Configuration: environment camera & 250x250 qrbox (T1-F20-03, T1-F20-05)
        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };

        await scanner.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            if (!isMounted) return;
            // Suppress repetitive identical frames after first success (T2-F20-04)
            if (isProcessingRef.current) return;
            isProcessingRef.current = true;

            // Stop scanner cleanly before emitting (T1-F20-04)
            scanner
              .stop()
              .then(() => {
                scanner.clear();
                onScanSuccess(decodedText);
              })
              .catch((err) => {
                console.warn('Erro ao parar scanner após deteção:', err);
                onScanSuccess(decodedText);
              });
          },
          () => {
            // Frame miss heartbeat - ignore safe frame decoding misses
          }
        );

        if (!isMounted) {
          try {
            if (scanner.isScanning) {
              await scanner.stop();
              scanner.clear();
            }
          } catch {}
          return;
        }

        if (isMounted) setIsStarting(false);
      } catch (err: unknown) {
        if (!isMounted) return;
        setIsStarting(false);
        setHasCameraError(true);

        const errorStr = String(err);
        let userMessage = 'Não foi possível aceder à câmara.';

        // Permission denied (T2-F20-01)
        if (errorStr.includes('NotAllowedError') || errorStr.includes('Permission')) {
          userMessage =
            'Acesso à câmara recusado. Permite o acesso ou usa o carregamento de ficheiro.';
        }
        // No hardware camera (T2-F20-02, T2-F19-05)
        else if (
          errorStr.includes('NotFoundError') ||
          errorStr.includes('DevicesNotFoundError') ||
          errorStr.includes('Requested device not found')
        ) {
          userMessage =
            'Nenhuma câmara encontrada neste dispositivo. Utiliza o carregamento de imagem ou ficheiro JSON.';
        }

        setErrorMessage(userMessage);
        onError?.(userMessage);
      }
    };

    startScanner();

    // Clean teardown on unmount or tab switch (T1-F20-04, T2-F19-01, T2-F20-05)
    return () => {
      isMounted = false;
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current
              .stop()
              .then(() => scannerRef.current?.clear())
              .catch(() => {});
          } else {
            scannerRef.current.clear();
          }
        } catch {
          // Teardown fallback
        }
      }
    };
  }, [onScanSuccess, onError]);

  if (hasCameraError) {
    return (
      <div className="p-6 rounded-2xl bg-surface-container border border-border-subtle flex flex-col items-center justify-center text-center space-y-3">
        <div className="p-3 rounded-xl bg-brand-amber/10 text-brand-amber border border-brand-amber/20">
          <Smartphone className="w-8 h-8" />
        </div>
        <h4 className="font-display font-bold text-sm text-text-primary">
          Câmara Indisponível
        </h4>
        <p className="text-xs text-text-secondary max-w-xs leading-relaxed">
          {errorMessage}
        </p>
        {onSwitchToFallback && (
          <button
            type="button"
            onClick={onSwitchToFallback}
            className="mt-2 px-4 py-2 rounded-xl bg-surface-card border border-border-highlight text-xs font-bold text-brand-amber hover:bg-surface-bright transition-colors"
          >
            Carregar Imagem ou Ficheiro
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl overflow-hidden bg-black border border-border-subtle aspect-square max-w-[320px] mx-auto flex items-center justify-center">
      {/* HTML5 QR Container */}
      <div id={containerId} className="w-full h-full" />

      {/* Target Box Guidelines (T1-F20-05) */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="w-[250px] h-[250px] border-2 border-brand-crimson/80 rounded-xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
          {/* Target Corner Accents */}
          <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-brand-crimson rounded-tl" />
          <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-brand-crimson rounded-tr" />
          <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-brand-crimson rounded-bl" />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-brand-crimson rounded-br" />

          {/* Animated Scanning Guideline */}
          <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-brand-crimson-bright to-transparent animate-pulse" />
        </div>
      </div>

      {/* Loading Spinner during camera initialization */}
      {isStarting && (
        <div className="absolute inset-0 bg-surface-card flex flex-col items-center justify-center space-y-2 text-text-secondary z-20">
          <RefreshCw className="w-6 h-6 animate-spin text-brand-crimson" />
          <span className="text-xs font-semibold">A iniciar câmara...</span>
        </div>
      )}
    </div>
  );
};
