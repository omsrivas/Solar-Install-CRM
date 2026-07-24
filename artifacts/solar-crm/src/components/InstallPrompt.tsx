import { useState, useEffect } from 'react';
import { X, Download, Sun } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

/**
 * PWA install banner.
 *
 * – Listens for the browser's `beforeinstallprompt` event (Chrome/Edge/Samsung)
 * – Respects a localStorage flag so it isn't re-shown after the user dismisses it
 * – Hides automatically when the app is already running in standalone mode
 * – iOS users (where `beforeinstallprompt` is not fired) are shown a manual
 *   "Add to Home Screen" instruction instead
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showAndroid, setShowAndroid] = useState(false);
  const [showIOS, setShowIOS] = useState(false);

  useEffect(() => {
    // Already installed — nothing to show
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    // User already dismissed previously
    if (localStorage.getItem('pwa-install-dismissed') === 'true') return;

    // Android / Chrome / Edge
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowAndroid(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // iOS Safari — no event; detect and show manual instructions
    const isIOS =
      /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !(window.navigator as unknown as { standalone?: boolean }).standalone;
    if (isIOS) setShowIOS(true);

    return () =>
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const dismiss = () => {
    setShowAndroid(false);
    setShowIOS(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShowAndroid(false);
    setDeferredPrompt(null);
  };

  // ── Android / Chrome banner ──────────────────────────────────────────────
  if (showAndroid) {
    return (
      <div
        role="dialog"
        aria-label="Install SunPower CRM"
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[9999] bg-white border border-amber-100 rounded-2xl shadow-xl p-4 flex items-start gap-3 animate-in slide-in-from-bottom-4 duration-300"
      >
        <div className="flex-shrink-0 w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center">
          <Sun className="w-6 h-6 text-amber-500" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 leading-tight">
            Install SunPower CRM
          </p>
          <p className="text-xs text-gray-500 mt-0.5 leading-snug">
            Add to your home screen for fast, offline-ready access
          </p>

          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleInstall}
              className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Install app
            </button>
            <button
              onClick={dismiss}
              className="text-xs text-gray-400 hover:text-gray-600 px-2 py-2 rounded-lg transition-colors"
            >
              Not now
            </button>
          </div>
        </div>

        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="flex-shrink-0 text-gray-300 hover:text-gray-500 transition-colors mt-0.5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // ── iOS manual-install hint ──────────────────────────────────────────────
  if (showIOS) {
    return (
      <div
        role="dialog"
        aria-label="Add SunPower CRM to Home Screen"
        className="fixed bottom-4 left-4 right-4 z-[9999] bg-white border border-amber-100 rounded-2xl shadow-xl p-4 flex items-start gap-3 animate-in slide-in-from-bottom-4 duration-300"
      >
        <div className="flex-shrink-0 w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center">
          <Sun className="w-6 h-6 text-amber-500" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 leading-tight">
            Add to Home Screen
          </p>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            Tap the{' '}
            <span className="inline-flex items-center gap-0.5 font-medium text-gray-700">
              Share{' '}
              {/* iOS share icon approximation */}
              <svg
                viewBox="0 0 24 24"
                className="w-3.5 h-3.5 inline text-blue-500"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            </span>{' '}
            button in Safari, then choose{' '}
            <strong className="text-gray-700">"Add to Home Screen"</strong>.
          </p>
        </div>

        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="flex-shrink-0 text-gray-300 hover:text-gray-500 transition-colors mt-0.5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return null;
}
