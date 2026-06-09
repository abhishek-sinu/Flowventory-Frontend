import React, { useEffect, useState } from 'react';

/**
 * Handles the PWA experience:
 *  - Shows a branded splash screen (logo-full) briefly when the app opens.
 *  - Captures the browser's install prompt and shows an "Install" banner.
 *  - Shows iOS "Add to Home Screen" instructions (iOS has no install event).
 */
function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !window.MSStream;
}

export default function PwaInstall() {
  const [showSplash, setShowSplash] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  // Splash: fade out shortly after the app opens.
  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 1800);
    return () => clearTimeout(t);
  }, []);

  // Capture the Android/desktop install prompt.
  useEffect(() => {
    if (isStandalone()) return undefined;

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };

    const onInstalled = () => {
      setShowInstall(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    // iOS Safari has no beforeinstallprompt — show a manual hint instead,
    // unless the user already dismissed it before.
    if (isIos() && !localStorage.getItem('pwa-ios-hint-dismissed')) {
      const t = setTimeout(() => setIosHint(true), 2200);
      return () => {
        clearTimeout(t);
        window.removeEventListener('beforeinstallprompt', onBeforeInstall);
        window.removeEventListener('appinstalled', onInstalled);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice;
    } catch {
      /* no-op */
    }
    setDeferredPrompt(null);
    setShowInstall(false);
  };

  const dismissIosHint = () => {
    localStorage.setItem('pwa-ios-hint-dismissed', '1');
    setIosHint(false);
  };

  return (
    <>
      {/* Splash screen */}
      {showSplash && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white transition-opacity duration-500">
          <img src="/logo-full.png" alt="Flowventory" className="w-64 max-w-[70%] animate-pulse" />
        </div>
      )}

      {/* Android / desktop install banner */}
      {showInstall && (
        <div className="fixed bottom-4 left-1/2 z-[9998] w-[92%] max-w-md -translate-x-1/2 rounded-2xl border border-indigo-100 bg-white p-4 shadow-2xl">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="" className="h-11 w-11 flex-shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">Install Flowventory</p>
              <p className="text-xs text-gray-500">Add it to your device for quick, app-like access.</p>
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowInstall(false)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition"
            >
              Not now
            </button>
            <button
              type="button"
              onClick={handleInstall}
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
            >
              Install
            </button>
          </div>
        </div>
      )}

      {/* iOS install hint */}
      {iosHint && (
        <div className="fixed bottom-4 left-1/2 z-[9998] w-[92%] max-w-md -translate-x-1/2 rounded-2xl border border-indigo-100 bg-white p-4 shadow-2xl">
          <div className="flex items-start gap-3">
            <img src="/logo.png" alt="" className="h-11 w-11 flex-shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">Install Flowventory</p>
              <p className="mt-0.5 text-xs text-gray-500">
                Tap the <span className="font-semibold">Share</span> icon, then choose{' '}
                <span className="font-semibold">Add to Home Screen</span>.
              </p>
            </div>
            <button
              type="button"
              onClick={dismissIosHint}
              className="text-gray-400 hover:text-gray-700"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
