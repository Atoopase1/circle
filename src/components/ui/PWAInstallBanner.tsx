// ============================================================
// PWA Install Banner — Slide-in desktop install prompt
// ============================================================
'use client';

import { useState, useEffect } from 'react';
import { Download, X, Monitor, Smartphone } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export default function PWAInstallBanner() {
  const { isInstallable, isInstalled, promptInstall, dismissBanner } = usePWAInstall();
  const [show, setShow] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (!isInstallable || isInstalled) return;

    // Check if user previously dismissed (with 7-day cooldown)
    const dismissedAt = localStorage.getItem('pwa-install-dismissed');
    if (dismissedAt) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) return;
    }

    // Delay showing the banner so it doesn't flash on page load
    const timer = setTimeout(() => {
      setShow(true);
      setIsMobile(window.innerWidth < 768);
    }, 3000);
    return () => clearTimeout(timer);
  }, [isInstallable, isInstalled]);

  const handleDismiss = () => {
    setIsAnimatingOut(true);
    dismissBanner();
    setTimeout(() => setShow(false), 300);
  };

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) {
      setIsAnimatingOut(true);
      setTimeout(() => setShow(false), 300);
    }
  };

  if (!show) return null;

  return (
    <div
      className={`fixed z-[9999] transition-all duration-300 ${
        isMobile 
          ? 'bottom-4 left-4 right-4' 
          : 'bottom-6 right-6 max-w-[360px] w-full'
      } ${
        isAnimatingOut
          ? 'opacity-0 translate-y-4 scale-95'
          : 'opacity-100 translate-y-0 scale-100 animate-slideUp'
      }`}
    >
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] shadow-2xl">
        {/* Gradient accent bar */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[var(--emerald)] via-[#3b82f6] to-[var(--emerald)]" />

        <div className="p-5">
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-200"
            aria-label="Dismiss install prompt"
          >
            <X size={16} />
          </button>

          {/* Icon + Content */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--emerald)]/20 to-[#3b82f6]/20 flex items-center justify-center shrink-0 border border-[var(--emerald)]/30">
              {isMobile ? (
                <Smartphone size={24} className="text-[var(--emerald)]" />
              ) : (
                <Monitor size={24} className="text-[var(--emerald)]" />
              )}
            </div>
            <div className="flex-1 min-w-0 pr-4">
              <h3 className="text-[15px] font-semibold text-[var(--text-primary)] leading-tight">
                Install Tekyel
              </h3>
              <p className="text-[13px] text-[var(--text-muted)] mt-1 leading-relaxed">
                {isMobile 
                  ? 'Add Tekyel to your home screen for faster access and notifications.'
                  : 'Get the full desktop app experience — faster access, notifications, and offline support.'}
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleInstall}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--emerald)] hover:bg-[var(--emerald-hover)] text-white text-[14px] font-semibold transition-all duration-200 shadow-lg shadow-[var(--emerald)]/20 hover:shadow-[var(--emerald)]/40 active:scale-[0.97]"
            >
              <Download size={16} />
              Install App
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2.5 rounded-xl text-[14px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors duration-200"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
