// ============================================================
// IncomingCallModal — Premium incoming call overlay
// ============================================================
'use client';

import { Phone, PhoneOff, Video } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { useCallStore } from '@/store/call-store';

export default function IncomingCallModal() {
  const { incomingCall, acceptCall, rejectCall } = useCallStore();

  if (!incomingCall) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center animate-fadeIn bg-[#0F172A]"
    >
      {/* Animated rings */}
      <div className="absolute w-56 h-56 rounded-full border border-[var(--emerald)]/10" style={{ animation: 'ringExpand 2.5s ease-out infinite' }} />
      <div className="absolute w-56 h-56 rounded-full border border-[var(--emerald)]/10" style={{ animation: 'ringExpand 2.5s ease-out infinite', animationDelay: '0.8s' }} />
      <div className="absolute w-56 h-56 rounded-full border border-[var(--emerald)]/10" style={{ animation: 'ringExpand 2.5s ease-out infinite', animationDelay: '1.6s' }} />

      {/* Caller info */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        <Avatar src={incomingCall.caller.avatar_url} name={incomingCall.caller.display_name || '?'} size="xxl" />
        
        <div className="text-center">
          <h2 className="text-[24px] font-semibold text-white tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
            {incomingCall.caller.display_name}
          </h2>
          <p className="text-white/50 text-[14px] mt-2 flex items-center gap-2 justify-center">
            {incomingCall.callType === 'video' && <Video size={26} className="text-white/40" />}
            <span className="animate-pulse text-[var(--emerald)]">
              Incoming {incomingCall.callType} call…
            </span>
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-12 mt-8">
          {/* Decline */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={rejectCall}
              className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-all duration-200 active:scale-95"
              style={{ boxShadow: '0 0 24px rgba(239, 68, 68, 0.4)' }}
            >
              <PhoneOff size={28} />
            </button>
            <span className="text-white/50 text-[14px] font-medium">Decline</span>
          </div>

          {/* Accept */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={acceptCall}
              className="w-16 h-16 rounded-full text-white flex items-center justify-center hover:brightness-110 transition-all duration-200 active:scale-95 bg-[var(--emerald)]"
              style={{ 
                boxShadow: '0 0 24px rgba(22, 163, 74, 0.4)',
              }}
            >
              <Phone size={28} />
            </button>
            <span className="text-white/50 text-[14px] font-medium">Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
}
