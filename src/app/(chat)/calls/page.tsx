// ============================================================
// Calls Page — Premium call history
// ============================================================
'use client';

import { Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';

// Placeholder call history data
const callHistory = [
  { id: '1', type: 'outgoing' as const, callType: 'audio' as const, name: 'No recent calls', time: '' },
];

export default function CallsPage() {
  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-app)]">
      {/* Header */}
      <div className="glass-header px-6 py-6 border-b border-[var(--border-color)] z-10">
        <h1 className="text-[22px] font-semibold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-heading)' }}>
          Calls
        </h1>
        <p className="text-[14px] text-[var(--text-muted)] mt-1">Your recent calls will appear here</p>
      </div>

      {/* Call history */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="flex flex-col items-center justify-center h-full text-center px-8">
          <div 
            className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5 bg-[var(--emerald)]/10"
          >
            <Phone size={36} className="text-[var(--emerald)] opacity-50" />
          </div>
          <h3 className="text-[16px] font-medium text-[var(--text-primary)] mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
            No Recent Calls
          </h3>
          <p className="text-[14px] text-[var(--text-muted)] max-w-xs leading-relaxed">
            Start a voice or video call from any chat. Your call history will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}
