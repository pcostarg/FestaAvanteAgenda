import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register PWA service worker with autoUpdate behavior
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.info('[PWA] Nova versão da agenda disponível.');
  },
  onOfflineReady() {
    console.info('[PWA] Aplicação pronta para funcionamento 100% offline.');
  },
  onRegistered(registration) {
    console.info('[PWA] Service Worker registado:', registration?.scope);
    // Periodic background check for SW updates (every 60 minutes)
    if (registration) {
      setInterval(() => {
        registration.update().catch((err) => {
          console.warn('[PWA] Falha ao verificar atualizações do Service Worker:', err);
        });
      }, 60 * 60 * 1000);
    }
  },
  onRegisterError(error) {
    console.error('[PWA] Falha no registo do Service Worker:', error);
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
