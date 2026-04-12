// ============================================================
// IncomingCallModal — Incoming call notification overlay
// ============================================================
'use client';

import { Phone, PhoneOff, Video } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { useCallStore } from '@/store/call-store';

export default function IncomingCallModal() {
  const { incomingCall, acceptCall, rejectCall } = useCallStore();

  if (!incomingCall) return null;

  const isVideo = incomingCall.callType === 'video';

  return (
    <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-center justify-center animate-fadeIn">
      <div className="bg-gradient-to-b from-[#1a1a3e] to-[#0d0d2a] rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl border border-white/10">
        {/* Ripple animation */}
        <div className="relative flex items-center justify-center mb-6">
          <div className="absolute w-32 h-32 rounded-full border border-white/10 animate-ping" style={{ animationDuration: '1.5s' }} />
          <div className="absolute w-24 h-24 rounded-full border border-white/5 animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0.3s' }} />
          <Avatar
            src={incomingCall.caller.avatar_url}
            name={incomingCall.caller.display_name}
            size="xl"
          />
        </div>

        {/* Info */}
        <div className="text-center mb-8">
          <h2 className="text-xl font-semibold text-white">{incomingCall.caller.display_name}</h2>
          <p className="text-white/50 text-sm mt-1 flex items-center justify-center gap-1.5">
            {isVideo ? <Video size={14} /> : <Phone size={14} />}
            Incoming {isVideo ? 'video' : 'audio'} call…
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-12">
          {/* Reject */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={rejectCall}
              className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-all shadow-lg shadow-red-500/30 animate-pulse"
              style={{ animationDuration: '2s' }}
            >
              <PhoneOff size={26} />
            </button>
            <span className="text-white/60 text-xs">Decline</span>
          </div>

          {/* Accept */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={acceptCall}
              className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/30 animate-pulse"
              style={{ animationDuration: '2s' }}
            >
              {isVideo ? <Video size={26} /> : <Phone size={26} />}
            </button>
            <span className="text-white/60 text-xs">Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
}
