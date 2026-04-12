// ============================================================
// Chat Layout — Sidebar + Main panel (protected)
// ============================================================
'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { usePresence } from '@/hooks/usePresence';
import { useRealtimeChatList } from '@/hooks/useRealtimeMessages';
import { useCallSignaling } from '@/hooks/useCallSignaling';
import CallModal from '@/components/chat/CallModal';
import IncomingCallModal from '@/components/chat/IncomingCallModal';
import LottieLoader from '@/components/ui/LottieLoader';
import { Toaster } from 'react-hot-toast';
import AppNavigation from '@/components/layout/AppNavigation';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const { initialize, isLoading, isInitialized } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Start presence tracking
  usePresence();

  // Subscribe to chat list updates (real-time)
  useRealtimeChatList();

  // Listen for incoming calls
  useCallSignaling();

  if (!isInitialized || isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-2">
          <LottieLoader size={160} />
          <p className="text-[var(--text-muted)] text-sm animate-pulse">Loading Circle…</p>
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
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
          },
        }}
      />

      {/* Call overlays */}
      <CallModal />
      <IncomingCallModal />

      {/* Main Navigation Tab Bar */}
      <AppNavigation />

      {/* Main content area — pb-16 on mobile to clear the fixed bottom nav */}
      <div className="flex-1 flex min-w-0 lg:h-full h-[calc(100vh-64px)] pb-16 lg:pb-0 relative">
        <div className="flex-1 flex min-w-0 h-full w-full">
            {children}
        </div>
      </div>
    </div>
  );
}
