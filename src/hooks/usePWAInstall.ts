// usePWAInstall — Captures beforeinstallprompt for desktop & mobile
'use client';

import { useEffect, useState, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Check if user previously dismissed (with 7-day cooldown)
    const dismissedAt = localStorage.getItem('pwa-install-dismissed');
    if (dismissedAt) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        // Don't show the banner, but still capture the prompt for the Settings button
      }
    }

    const handler = (e: BeforeInstallPromptEvent) => {
      // Always prevent default so we control when the prompt appears
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      localStorage.removeItem('pwa-install-dismissed');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
        setDeferredPrompt(null);
        return true;
      } else {
        // User dismissed — store timestamp for cooldown
        localStorage.setItem('pwa-install-dismissed', Date.now().toString());
        return false;
      }
    } catch (err) {
      console.error('Failed to prompt install:', err);
      return false;
    }
  }, [deferredPrompt]);

  const dismissBanner = useCallback(() => {
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  }, []);

  return {
    isInstallable,
    isInstalled,
    promptInstall,
    dismissBanner,
  };
}
