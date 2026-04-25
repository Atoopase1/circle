// ============================================================
// Chat Layout — Premium sidebar + main panel (protected)
// ============================================================
'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { usePresence } from '@/hooks/usePresence';
import { useRealtimeChatList } from '@/hooks/useRealtimeMessages';
import { useCallSignaling } from '@/hooks/useCallSignaling';
import { useAppNotifications } from '@/hooks/useAppNotifications';
import CallModal from '@/components/chat/CallModal';
import IncomingCallModal from '@/components/chat/IncomingCallModal';
import LottieLoader from '@/components/ui/LottieLoader';
import PWAInstallBanner from '@/components/ui/PWAInstallBanner';
import { Toaster } from 'react-hot-toast';
import AppNavigation from '@/components/layout/AppNavigation';
import { useChatStore } from '@/store/chat-store';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const { initialize, isLoading, isInitialized } = useAuthStore();
  const initOfflineQueue = useChatStore((s) => s.initOfflineQueue);

  useEffect(() => {
    initialize();
    initOfflineQueue();
  }, [initialize, initOfflineQueue]);

  // Start presence tracking
  usePresence();

  // Subscribe to chat list updates (real-time)
  useRealtimeChatList();

  // Listen for incoming calls
  useCallSignaling();

  // Listen for global notifications (posts, likes, comments, ratings)
  useAppNotifications();

  if (!isInitialized || isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--bg-app)]">
        <div className="flex flex-col items-center gap-3">
          <LottieLoader size={160} />
          <p className="text-[var(--text-muted)] text-[14px] font-medium animate-pulse tracking-wide">Loading Tekyel…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-[var(--bg-app)]">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-lg)',
            fontSize: '14px',
          },
        }}
      />

      {/* Call overlays */}
      <CallModal />
      <IncomingCallModal />

      {/* PWA Install prompt for desktop */}
      <PWAInstallBanner />

      {/* Main Navigation Tab Bar */}
      <AppNavigation />

      {/* Main content area */}
      <div className="flex-1 flex min-w-0 lg:h-full h-[calc(100vh-64px)] relative">
        <div className="flex-1 flex min-w-0 h-full w-full">
            {children}
        </div>
      </div>
    </div>
  );
}
