// ============================================================
// useCallSignaling — Listen for incoming calls via Supabase Realtime
// ============================================================
'use client';

import { useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/auth-store';
import { useCallStore } from '@/store/call-store';

export function useCallSignaling() {
  const user = useAuthStore((s) => s.user);
  const setIncomingCall = useCallStore((s) => s.setIncomingCall);
  const status = useCallStore((s) => s.status);

  useEffect(() => {
    if (!user) return;

    const supabase = getSupabaseBrowserClient();

    // Subscribe to the user's personal channel for incoming call signals
    const channel = supabase
      .channel(`user:${user.id}`)
      .on('broadcast', { event: 'incoming-call' }, (message) => {
        // Don't accept calls if already in one
        if (status !== 'idle') return;

        const { callId, callType, caller, offer } = message.payload;
        setIncomingCall({
          callId,
          callType,
          caller: caller.display_name ? caller : { ...caller, display_name: 'Unknown' },
          offer,
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, setIncomingCall, status]);
}
