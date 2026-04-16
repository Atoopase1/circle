// ============================================================
// Default chat page — Premium "no chat selected" landing
// ============================================================
import { Shield } from 'lucide-react';
import ChatSidebar from '@/components/chat/ChatSidebar';
import CircleLogo from '@/components/ui/CircleLogo';

export default function ChatDefaultPage() {
  return (
    <div className="flex w-full h-full justify-center lg:justify-start bg-[var(--bg-app)]">
      <div className="w-full md:max-w-[420px] lg:max-w-none lg:w-[420px] shrink-0 flex flex-col z-10 mx-auto lg:mx-0 border-r-0 lg:border-r border-[var(--border-color)] shadow-xl lg:shadow-none">
        <ChatSidebar />
      </div>

      <div className="flex-1 hidden lg:flex flex-col items-center justify-center relative overflow-hidden bg-[var(--bg-app)]">
        {/* Subtle decorative element removed - no more gradients */}

        <div className="text-center max-w-md px-8 relative z-10">
          {/* Animated logo */}
          <div className="relative mb-10">
            <div className="w-52 h-52 mx-auto relative">
              {/* Decorative rings */}
              <div className="absolute inset-0 rounded-full border border-[var(--border-color)] opacity-20" style={{ animation: 'ringExpand 3s ease-in-out infinite' }} />
              <div className="absolute inset-4 rounded-full border border-[var(--border-color)] opacity-15" style={{ animation: 'ringExpand 3s ease-in-out infinite', animationDelay: '0.5s' }} />
              <div className="absolute inset-8 rounded-full border border-[var(--border-color)] opacity-10" style={{ animation: 'ringExpand 3s ease-in-out infinite', animationDelay: '1s' }} />

              {/* Center logo */}
              <div className="absolute inset-0 flex items-center justify-center animate-float">
                <CircleLogo size={84} />
              </div>
            </div>
          </div>

          <h2 className="text-[28px] font-light text-[var(--text-primary)] mb-3 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
            Circle
          </h2>
          <p className="text-[14px] text-[var(--text-muted)] leading-relaxed mb-10">
            Connect, share, and communicate with your circle.
            <br />
            Start a conversation or select a chat to get started.
          </p>
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center justify-center gap-2 text-[14px] text-[var(--text-muted)] bg-[var(--bg-primary)] rounded-full px-4 py-2 border border-[var(--border-color)] shadow-sm">
              <Shield size={17} className="text-[var(--emerald)]" />
              <span>End-to-end encrypted</span>
            </div>
            
            <div className="text-[14px] text-[var(--text-muted)] opacity-80">
              Built by <a href="https://technoidfix.online" target="_blank" rel="noopener noreferrer" className="font-bold text-[var(--emerald)] hover:underline ml-1">technoidfix</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
