// ============================================================
// Default chat page — No chat selected
// ============================================================
import { Lock } from 'lucide-react';
import ChatSidebar from '@/components/chat/ChatSidebar';
import CircleLogo from '@/components/ui/CircleLogo';

export default function ChatDefaultPage() {
  return (
    <div className="flex w-full h-full">
      <div className="w-full max-w-[420px] lg:w-[420px] shrink-0 flex flex-col z-10 border-r border-[var(--border-color)]">
        <ChatSidebar />
      </div>

      <div className="flex-1 hidden lg:flex flex-col items-center justify-center bg-[var(--bg-chat)] border-b-4 border-[var(--wa-green)]">
        <div className="text-center max-w-md px-8">
          {/* Animated icon */}
          <div className="relative mb-8">
            <div className="w-64 h-64 mx-auto relative">
              {/* Decorative circles */}
              <div className="absolute inset-0 rounded-full border-2 border-[var(--border-color)] opacity-20 animate-ping" style={{ animationDuration: '3s' }} />
              <div className="absolute inset-4 rounded-full border-2 border-[var(--border-color)] opacity-15 animate-ping" style={{ animationDuration: '3s', animationDelay: '0.5s' }} />
              <div className="absolute inset-8 rounded-full border-2 border-[var(--border-color)] opacity-10 animate-ping" style={{ animationDuration: '3s', animationDelay: '1s' }} />

              {/* Center icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <CircleLogo size={80} />
              </div>
            </div>
          </div>

          <h2 className="text-3xl font-light text-[var(--text-primary)] mb-3">
            Circle
          </h2>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-8">
            Connect, share, and communicate with your circle.
            <br />
            Start a conversation or select a chat to get started.
          </p>
          <div className="flex items-center justify-center gap-1.5 text-xs text-[var(--text-muted)]">
            <Lock size={12} />
            <span>End-to-end encrypted</span>
          </div>
        </div>
      </div>
    </div>
  );
}
