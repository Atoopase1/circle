// OfflineBanner — Uses the app's signature yellow snake-wave "Waiting for network" animation
'use client';

import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { WifiOff, Wifi } from 'lucide-react';

export default function OfflineBanner() {
  const { isOnline, wasOffline } = useNetworkStatus();

  // Reconnected state — brief green pill then vanishes
  if (wasOffline && isOnline) {
    return (
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none" style={{ animation: 'slideDown 0.3s ease-out' }}>
        <div 
          className="px-4 py-1.5 rounded-full flex items-center gap-1.5 text-sm font-medium tracking-wide border border-[var(--emerald)]/30"
          style={{  
            background: 'var(--bg-date-separator)',
            backdropFilter: 'blur(8px)',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <Wifi size={14} className="text-[var(--emerald)]" />
          <span className="text-[var(--emerald)] font-semibold">Connected</span>
        </div>
      </div>
    );
  }

  // Offline state — yellow snake-wave animation matching MessageList style
  if (!isOnline) {
    return (
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none" style={{ animation: 'slideDown 0.3s ease-out' }}>
        <div 
          className="px-4 py-1.5 rounded-full flex items-center gap-1.5 text-sm font-medium tracking-wide border border-[var(--border-color)]"
          style={{  
            background: 'var(--bg-date-separator)',
            backdropFilter: 'blur(8px)',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <WifiOff size={14} className="animate-pulse opacity-80 text-[#FBBF24]" />
          <div className="flex">
            {"Waiting for network...".split('').map((char, i) => (
              <span
                key={i}
                className="animate-snakeWave"
                style={{
                  animationDelay: `${i * 0.05}s`,
                  whiteSpace: char === ' ' ? 'pre' : 'normal',
                }}
              >
                {char}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
