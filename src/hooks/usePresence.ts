// ============================================================
// Presence hook — online status & typing indicators
// ============================================================
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { usePresenceStore } from '@/store/presence-store';
import { useAuthStore } from '@/store/auth-store';

/**
 * Track current user's online presence and subscribe to others' presence
 */
export function usePresence() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const { setUserOnline, setUserOffline, setOnlineUsers } = usePresenceStore();

  useEffect(() => {
    if (!user) return;

    const supabase = getSupabaseBrowserClient();

    // Set user online
    supabase
      .from('profiles')
      .update({ is_online: true, last_seen: new Date().toISOString() })
      .eq('id', user.id)
      .then();

    // Track presence via Supabase Realtime Presence
    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const onlineIds = Object.keys(state);
        setOnlineUsers(onlineIds);
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        if (key) setUserOnline(key);
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (key) setUserOffline(key);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            display_name: profile?.display_name || 'User',
            online_at: new Date().toISOString(),
          });
        }
      });

    // Handle page visibility / beforeunload
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        supabase
          .from('profiles')
          .update({ is_online: false, last_seen: new Date().toISOString() })
          .eq('id', user.id)
          .then();
      } else {
        supabase
          .from('profiles')
          .update({ is_online: true })
          .eq('id', user.id)
          .then();
      }
    };

    const handleBeforeUnload = () => {
      // Use fetch with keepalive for reliability on page close
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`;
      const body = JSON.stringify({ is_online: false, last_seen: new Date().toISOString() });
      try {
        fetch(url, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
            'Prefer': 'return=minimal',
          },
          body,
          keepalive: true,
        }).catch(() => {
          // Best-effort on unload, ignore network/adblocker fetch failures
        });
      } catch (e) {
        // Ignore synchronous errors
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      supabase.removeChannel(channel);

      supabase
        .from('profiles')
        .update({ is_online: false, last_seen: new Date().toISOString() })
        .eq('id', user.id)
        .then();
    };
  }, [user, profile, setUserOnline, setUserOffline, setOnlineUsers]);
}

/**
 * Hook to send and receive "typing" indicators for a specific chat.
 *
 * FIX: The previous implementation had a race condition where the broadcast
 * listener was attached AFTER subscribe() was called. The channel must be
 * fully configured (all .on() calls) before .subscribe() is invoked.
 * Additionally, the cleanup was incorrectly removing the new channel instead
 * of the previous one stored in channelRef.current.
 */
export function useTypingIndicator(chatId: string | null) {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const { addTypingUser, removeTypingUser } = usePresenceStore();
  // Store the channel ref so we can clean it up correctly
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabaseBrowserClient>['channel']> | null>(null);
  const lastTypingRef = useRef<number>(0);

  useEffect(() => {
    if (!chatId || !user) return;

    const supabase = getSupabaseBrowserClient();
    const channelName = `typing:${chatId}`;

    // Always clean up the PREVIOUS channel before creating a new one.
    // The old code was calling supabase.removeChannel(channel) at cleanup time,
    // but `channel` referred to the newly created variable — not the old one.
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Create and configure the channel BEFORE subscribing — all .on() handlers
    // must be registered before .subscribe() so no events are missed.
    const channel = supabase.channel(channelName);

    channel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (!payload || payload.user_id === user.id) return;
        addTypingUser({
          user_id: payload.user_id,
          display_name: payload.display_name,
          chat_id: chatId,
        });
      })
      .on('broadcast', { event: 'stop_typing' }, ({ payload }) => {
        // Immediately remove the typing indicator when the sender clears
        if (!payload || payload.user_id === user.id) return;
        removeTypingUser(payload.user_id, chatId);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Typing] Subscribed to ${channelName}`);
        }
      });

    channelRef.current = channel;

    return () => {
      // Remove the channel we stored in the ref — guaranteed to be this effect's channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [chatId, user, addTypingUser, removeTypingUser]);

  const sendTyping = useCallback(() => {
    if (!channelRef.current || !user || !chatId) return;

    // Throttle to once per 2 seconds
    const now = Date.now();
    if (now - lastTypingRef.current < 2000) return;
    lastTypingRef.current = now;

    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        user_id: user.id,
        display_name: profile?.display_name || 'User',
      },
    });
  }, [user, profile, chatId]);

  const sendStopTyping = useCallback(() => {
    if (!channelRef.current || !user || !chatId) return;
    lastTypingRef.current = 0; // Reset so next sendTyping fires immediately

    channelRef.current.send({
      type: 'broadcast',
      event: 'stop_typing',
      payload: {
        user_id: user.id,
      },
    });
  }, [user, chatId]);

  return { sendTyping, sendStopTyping };
}
