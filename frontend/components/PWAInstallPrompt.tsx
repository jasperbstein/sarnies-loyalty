'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, Share, Plus, MoreVertical, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Check if previously dismissed
    const wasDismissed = localStorage.getItem('pwa-install-dismissed');
    if (wasDismissed) {
      const dismissedTime = parseInt(wasDismissed);
      // Show again after 7 days
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
      }
    }

    // Detect platform
    const ua = navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua) && !(window as any).MSStream;
    const isAndroidDevice = /android/.test(ua);

    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);

    // Listen for install prompt (Chrome/Edge on Android/Desktop)
    const handleBeforeInstall = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!standalone && !wasDismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // For iOS, show instructions if not standalone and not dismissed
    if (isIOSDevice && !standalone && !wasDismissed) {
      // Delay showing on iOS to not be annoying
      setTimeout(() => setShowPrompt(true), 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Don't show if already installed or dismissed
  if (isStandalone || dismissed || !showPrompt) {
    return null;
  }

  // iOS specific instructions
  if (isIOS) {
    return (
      <div className="fixed bottom-24 left-4 right-4 z-50 animate-in slide-in-from-bottom duration-300">
        <div className="bg-white rounded-2xl shadow-xl border border-stone-200 p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-stone-900 mb-1">
                Install Sarnies App
              </p>
              <p className="text-xs text-stone-500 mb-3">
                Add to your home screen for the best experience
              </p>

              {/* iOS Instructions */}
              <div className="bg-stone-50 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-stone-200 rounded flex items-center justify-center text-xs font-bold text-stone-600">1</div>
                  <div className="flex items-center gap-1.5 text-xs text-stone-600">
                    <span>Tap</span>
                    <Share className="w-4 h-4" />
                    <span>Share button</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-stone-200 rounded flex items-center justify-center text-xs font-bold text-stone-600">2</div>
                  <div className="flex items-center gap-1.5 text-xs text-stone-600">
                    <span>Tap</span>
                    <Plus className="w-4 h-4" />
                    <span>Add to Home Screen</span>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0"
            >
              <X className="w-4 h-4 text-stone-500" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Android/Desktop with install prompt
  if (deferredPrompt) {
    return (
      <div className="fixed bottom-24 left-4 right-4 z-50 animate-in slide-in-from-bottom duration-300">
        <div className="bg-white rounded-2xl shadow-xl border border-stone-200 p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Download className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-stone-900 mb-1">
                Install Sarnies App
              </p>
              <p className="text-xs text-stone-500 mb-3">
                Get quick access from your home screen
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleInstall}
                  className="flex-1 bg-stone-900 text-white py-2.5 rounded-xl text-sm font-medium"
                >
                  Install
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-stone-500 bg-stone-100"
                >
                  Later
                </button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0"
            >
              <X className="w-4 h-4 text-stone-500" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Android without prompt (fallback instructions)
  if (isAndroid) {
    return (
      <div className="fixed bottom-24 left-4 right-4 z-50 animate-in slide-in-from-bottom duration-300">
        <div className="bg-white rounded-2xl shadow-xl border border-stone-200 p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-stone-900 mb-1">
                Install Sarnies App
              </p>
              <p className="text-xs text-stone-500 mb-3">
                Add to your home screen for the best experience
              </p>

              {/* Android Instructions */}
              <div className="bg-stone-50 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-stone-200 rounded flex items-center justify-center text-xs font-bold text-stone-600">1</div>
                  <div className="flex items-center gap-1.5 text-xs text-stone-600">
                    <span>Tap</span>
                    <MoreVertical className="w-4 h-4" />
                    <span>menu</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-stone-200 rounded flex items-center justify-center text-xs font-bold text-stone-600">2</div>
                  <div className="flex items-center gap-1.5 text-xs text-stone-600">
                    <span>Tap "Install app" or "Add to Home"</span>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0"
            >
              <X className="w-4 h-4 text-stone-500" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
