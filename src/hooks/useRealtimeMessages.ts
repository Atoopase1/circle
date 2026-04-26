// Real-time messages hook — subscribes to new messages via Supabase Realtime
'use client';

import { useEffect, useRef } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useChatStore } from '@/store/chat-store';
import { useAuthStore } from '@/store/auth-store';
import type { Message } from '@/types';
import { useState } from 'react';

// Global connection state to avoid multiple listeners if needed (simplified for React state)
let globalIsReconnecting = false;
let connectionListeners: ((state: boolean) => void)[] = [];
let reconnectUIVisibilityTimer: NodeJS.Timeout | null = null;

const setGlobalConnectionState = (state: boolean) => {
  if (state === true) {
    // Debounce: Wait 2 seconds before showing the "Waiting for network..." UI.
    // If we reconnect before 2s, the user never sees it flash.
    if (!reconnectUIVisibilityTimer && !globalIsReconnecting) {
      reconnectUIVisibilityTimer = setTimeout(() => {
        globalIsReconnecting = true;
        connectionListeners.forEach(listener => listener(true));
        reconnectUIVisibilityTimer = null;
      }, 2000);
    }
  } else {
    // On connect: Instantly hide the UI and cancel any pending show timers
    if (reconnectUIVisibilityTimer) {
      clearTimeout(reconnectUIVisibilityTimer);
      reconnectUIVisibilityTimer = null;
    }
    if (globalIsReconnecting !== false) {
      globalIsReconnecting = false;
      connectionListeners.forEach(listener => listener(false));
    }
  }
};

export function useRealtimeConnection() {
  const [isReconnecting, setIsReconnecting] = useState(globalIsReconnecting);

  useEffect(() => {
    connectionListeners.push(setIsReconnecting);
    return () => {
      connectionListeners = connectionListeners.filter(l => l !== setIsReconnecting);
    };
  }, []);

  return isReconnecting;
}

export function useRealtimeMessages(chatId: string | null) {
  const addMessage = useChatStore((s) => s.addMessage);
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabaseBrowserClient>['channel']> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isUnmountedRef = useRef(false);

  useEffect(() => {
    if (!chatId) return;
    isUnmountedRef.current = false;

    const supabase = getSupabaseBrowserClient();

    const subscribe = () => {
      // If already unmounted (navigated away), bail out
      if (isUnmountedRef.current) return;

      // Clean up any previous channel before creating a new one
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      // Unique channel name prevents stale duplicate conflicts on rapid remounts
      const uniqueChannelName = `messages:${chatId}:${Math.random().toString(36).substring(2, 9)}`;

      const channel = supabase
        .channel(uniqueChannelName)
        // ── New messages 
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `chat_id=eq.${chatId}`,
          },
          async (payload) => {
            const newMessage = payload.new as Message;
            const currentUser = useAuthStore.getState().user;

            console.log(`[Realtime] New message: ${newMessage.id}`);

            if (newMessage.sender_id === currentUser?.id) {
              const currentProfile = useAuthStore.getState().profile;
              addMessage({ ...newMessage, sender: currentProfile || undefined } as Message);
              return;
            }

            let senderProfile = undefined;
            try {
              const { data: sender, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', newMessage.sender_id)
                .single();
              if (!error && sender) senderProfile = sender;
            } catch (e) {
              console.warn('[Realtime] Failed to fetch sender profile for active message', e);
            }

            // Reconstruct the reply_to relation because Supabase realtime INSERT events 
            // only provide the raw row (reply_to_id) and not joined relations.
            let replyToData = undefined;
            if (newMessage.reply_to_id) {
              const store = useChatStore.getState();
              // First try to grab the replied message from our local cache (very fast)
              const cachedMsg = store.messagesByChat[newMessage.chat_id]?.find(m => m.id === newMessage.reply_to_id);
              
              if (cachedMsg) {
                replyToData = [cachedMsg];
              } else {
                // If it's an old message not in cache, fetch it from DB
                try {
                  const { data: repliedMsg } = await supabase
                    .from('messages')
                    .select('*, sender:profiles(*)')
                    .eq('id', newMessage.reply_to_id)
                    .single();
                  if (repliedMsg) replyToData = [repliedMsg];
                } catch (e) {
                  console.warn('[Realtime] Failed to fetch reply_to context', e);
                }
              }
            }

            addMessage({ 
              ...newMessage, 
              sender: senderProfile || undefined,
              reply_to: replyToData
            } as Message);
          }
        )
        // ── Edited / unsent messages 
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `chat_id=eq.${chatId}`,
          },
          async (payload) => {
            const updatedMessage = payload.new as Message;
            const existingMsg = useChatStore.getState().messages.find(m => m.id === updatedMessage.id);
            useChatStore.getState().updateMessageInList({
              ...updatedMessage,
              sender: existingMsg?.sender,
              status: existingMsg?.status,
              stars: existingMsg?.stars,
              reactions: existingMsg?.reactions,
            } as Message);
          }
        )
        // ── Deleted messages
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'messages',
            filter: `chat_id=eq.${chatId}`,
          },
          (payload) => {
            const deletedId = payload.old.id;
            console.log(`[Realtime] Message deleted: ${deletedId}`);
            useChatStore.getState().removeMessage(deletedId);
          }
        )
        // ── Message status (read receipts / delivery ticks) 
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'message_status' },
          (payload) => {
            const s = payload.new as Record<string, any>;
            if (s?.message_id) applyStatusUpdate(s);
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'message_status' },
          (payload) => {
            const s = payload.new as Record<string, any>;
            if (s?.message_id) applyStatusUpdate(s);
          }
        )
        .subscribe((status) => {
          if (isUnmountedRef.current) return;
          if (channelRef.current !== channel) return;

          if (status === 'SUBSCRIBED') {
            setGlobalConnectionState(false);
            reconnectAttemptsRef.current = 0; // Reset on success
            console.log(`[Realtime] ✅ Subscribed: ${uniqueChannelName}`);

          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setGlobalConnectionState(true);
            console.warn(`[Realtime] ⚠️ Channel ${status} — scheduling reconnect`);

            // Exponential backoff: 1s, 2s, 4s, 8s, max 15s
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 15_000);
            reconnectAttemptsRef.current += 1;

            reconnectTimerRef.current = setTimeout(() => {
              console.log(`[Realtime] 🔄 Reconnecting (attempt ${reconnectAttemptsRef.current})...`);
              subscribe();
            }, delay);
          }
        });

      channelRef.current = channel;
    };

    subscribe();

    // ── Tab Focus & Wake Up Synchronization 
    let syncLock = false;
    let lastSyncTime = Date.now();
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let lastPulseTime = Date.now();

    // Heartbeat to detect if device went to sleep and woke up (e.g. screen unlock)
    const wakeupInterval = setInterval(() => {
      const now = Date.now();
      // If more than 5s passed since the last 2s pulse, the device was asleep
      if (now - lastPulseTime > 5000) {
        console.log('[Realtime] Device wake up detected. Forcing sync...');
        handleFocusSync();
      }
      lastPulseTime = now;
    }, 2000);

    // Aggressive background network recovery rebooter
    // If the connection drops, force a complete teardown and rebuild every 5 seconds
    const networkRecoveryInterval = setInterval(() => {
      if (globalIsReconnecting) {
        console.log('[Realtime] Attempting aggressive background network recovery...');
        // Force the time check to pass
        lastSyncTime = 0;
        handleFocusSync();
      }
    }, 5000);

    const handleFocusSync = () => {
      if (isUnmountedRef.current || !chatId) return;

      if (debounceTimer) clearTimeout(debounceTimer);

      debounceTimer = setTimeout(async () => {
        const now = Date.now();
        // Skip if a sync just happened (<3s)
        if (now - lastSyncTime < 3000) return;
        // Block concurrent sync
        if (syncLock) return;
        
        syncLock = true;
        try {
          console.log('[Realtime] App focused, forcing hard sync for active chat...');
          
          // 1. Immediately unsubscribe from existing listener
          if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
          }
          
          // 2 & 3. Force fetch latest messages & merge into local state
          await useChatStore.getState().fetchMessages(chatId);
          
          lastSyncTime = Date.now();
        } catch (err) {
          console.warn('[Realtime] Focus sync failed:', err);
        } finally {
          // 4. Always re-subscribe to real-time updates even if fetch fails
          if (!isUnmountedRef.current) subscribe();
          syncLock = false;
        }
      }, 300); // 300ms debounce
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleFocusSync();
      }
    };

    // If chat appears frozen, tap interaction forces a silent background sync (max once per 30s)
    const handleInteractionSync = () => {
      if (Date.now() - lastSyncTime > 30000) {
        handleFocusSync();
      }
    };

    window.addEventListener('focus', handleFocusSync);
    window.addEventListener('online', handleFocusSync);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('touchstart', handleInteractionSync, { passive: true });
    window.addEventListener('mousedown', handleInteractionSync, { passive: true });

    return () => {
      isUnmountedRef.current = true;

      clearInterval(wakeupInterval);
      clearInterval(networkRecoveryInterval);
      window.removeEventListener('focus', handleFocusSync);
      window.removeEventListener('online', handleFocusSync);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('touchstart', handleInteractionSync);
      window.removeEventListener('mousedown', handleInteractionSync);

      if (debounceTimer) clearTimeout(debounceTimer);

      // Cancel any pending reconnect timer
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      // Remove the active channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [chatId, addMessage]);
}

/**
 * Merge an incoming message_status row into the matching message in the store.
 * Works for both INSERT (first delivery record) and UPDATE (seen/delivered change).
 */
function applyStatusUpdate(updatedStatus: Record<string, any>) {
  const store = useChatStore.getState();

  // Only process if this message is in the current active chat's list
  const targetMsg = store.messages.find((msg) => msg.id === updatedStatus.message_id);
  if (!targetMsg) return;

  // Remove any optimistic 'temp' statuses, then merge the real one
  const existingStatuses = (targetMsg.status || []).filter((s) => s.id !== 'temp');
  let found = false;

  const newStatuses = existingStatuses.map((s) => {
    if (s.user_id === updatedStatus.user_id) {
      found = true;
      return { ...s, status: updatedStatus.status, updated_at: updatedStatus.updated_at };
    }
    return s;
  });

  if (!found && updatedStatus.status) {
    newStatuses.push({
      id: updatedStatus.id || 'rt',
      message_id: updatedStatus.message_id,
      user_id: updatedStatus.user_id,
      status: updatedStatus.status,
      updated_at: updatedStatus.updated_at || new Date().toISOString(),
    });
  }

  store.updateMessageInList({ ...targetMsg, status: newStatuses });
}

/**
 * Hook to subscribe to all real-time updates for the chat list.
 * Listens to:
 * - messages table (new messages update last_message + reorder chats instantly)
 * - chat_participants table (new chats, removed from chats)
 * - chats table (group name changes, etc.)
 */
export function useRealtimeChatList() {
  const fetchChats = useChatStore((s) => s.fetchChats);
  const updateChatWithNewMessage = useChatStore((s) => s.updateChatWithNewMessage);
  const incrementUnreadCount = useChatStore((s) => s.incrementUnreadCount);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) return;

    const supabase = getSupabaseBrowserClient();
    let channelRef: ReturnType<typeof supabase.channel> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;
    let isUnmounted = false;

    const subscribe = () => {
      if (isUnmounted) return;
      if (channelRef) {
        supabase.removeChannel(channelRef);
        channelRef = null;
      }

      const uniqueChannelName = `chat-list-realtime:${user.id}:${Math.random().toString(36).substring(2, 9)}`;
      const channel = supabase
        .channel(uniqueChannelName)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          async (payload) => {
            const msg = payload.new as Message;
            
            // Fetch sender profile so the message renders correctly in the cache
            let senderProfile = undefined;
            if (msg.sender_id === user.id) {
              senderProfile = useAuthStore.getState().profile;
            } else {
              try {
                const { data: sender, error } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('id', msg.sender_id)
                  .single();
                if (!error && sender) senderProfile = sender;
              } catch (e) {
                console.warn('[Realtime] Failed to fetch sender profile for background message', e);
              }
            }

            // Reconstruct the reply_to relation for the background listener
            let replyToData = undefined;
            if (msg.reply_to_id) {
              const store = useChatStore.getState();
              const cachedMsg = store.messagesByChat[msg.chat_id]?.find(m => m.id === msg.reply_to_id);
              
              if (cachedMsg) {
                replyToData = [cachedMsg];
              } else {
                try {
                  const { data: repliedMsg } = await supabase
                    .from('messages')
                    .select('*, sender:profiles(*)')
                    .eq('id', msg.reply_to_id)
                    .single();
                  if (repliedMsg) replyToData = [repliedMsg];
                } catch (e) {
                  console.warn('[Realtime] Failed to fetch reply_to context for background message', e);
                }
              }
            }

            // addMessage handles updating the chat list AND inserting into the message cache
            // so when the user returns to the chat, the message is there instantly!
            const addMessage = useChatStore.getState().addMessage;
            addMessage({ 
              ...msg, 
              sender: senderProfile || undefined,
              reply_to: replyToData
            } as Message);
            
            if (msg.sender_id !== user.id) {
              incrementUnreadCount(msg.chat_id);
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'chat_participants' },
          () => { fetchChats(); }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'chats' },
          () => { fetchChats(); }
        )
        .subscribe((status) => {
          if (isUnmounted) return;
          if (channelRef !== channel) return;

          if (status === 'SUBSCRIBED') {
            setGlobalConnectionState(false);
            attempts = 0;
            console.log('[Realtime] ✅ Chat list subscribed');
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setGlobalConnectionState(true);
            console.warn(`[Realtime] ⚠️ Chat list channel ${status} — scheduling reconnect`);
            const delay = Math.min(1000 * Math.pow(2, attempts), 15_000);
            attempts += 1;
            reconnectTimer = setTimeout(() => { subscribe(); }, delay);
          }
        });

      channelRef = channel;
    };

    subscribe();

    // ── Tab Focus & Wake Up Synchronization 
    let syncLock = false;
    let lastSyncTime = Date.now();
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let lastPulseTime = Date.now();

    // Heartbeat to detect if device went to sleep and woke up
    const wakeupInterval = setInterval(() => {
      const now = Date.now();
      if (now - lastPulseTime > 5000) {
        console.log('[Realtime] ChatList: Device wake up detected. Forcing sync...');
        handleFocusSync();
      }
      lastPulseTime = now;
    }, 2000);

    const handleFocusSync = () => {
      if (isUnmounted || !user) return;

      if (debounceTimer) clearTimeout(debounceTimer);

      debounceTimer = setTimeout(async () => {
        const now = Date.now();
        // Skip if a sync just happened (<3s)
        if (now - lastSyncTime < 3000) return;
        // Block concurrent sync
        if (syncLock) return;
        
        syncLock = true;
        try {
          console.log('[Realtime] App focused, forcing hard sync for chat list...');
          
          // 1. Immediately unsubscribe from existing listener
          if (channelRef) {
            supabase.removeChannel(channelRef);
            channelRef = null;
          }
          
          // 2 & 3. Force fetch latest chats (bypasses cache due to our client.ts config)
          await useChatStore.getState().fetchChats();
          
          lastSyncTime = Date.now();
        } catch (err) {
          console.warn('[Realtime] Global focus sync failed:', err);
        } finally {
          // 4. Always re-subscribe to real-time updates even if fetch fails
          if (!isUnmounted) subscribe();
          syncLock = false;
        }
      }, 300); // 300ms debounce
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleFocusSync();
      }
    };

    const handleInteractionSync = () => {
      if (Date.now() - lastSyncTime > 30000) {
        handleFocusSync();
      }
    };

    window.addEventListener('focus', handleFocusSync);
    window.addEventListener('online', handleFocusSync);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('touchstart', handleInteractionSync, { passive: true });
    window.addEventListener('mousedown', handleInteractionSync, { passive: true });

    return () => {
      isUnmounted = true;

      clearInterval(wakeupInterval);
      window.removeEventListener('focus', handleFocusSync);
      window.removeEventListener('online', handleFocusSync);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('touchstart', handleInteractionSync);
      window.removeEventListener('mousedown', handleInteractionSync);

      if (debounceTimer) clearTimeout(debounceTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (channelRef) supabase.removeChannel(channelRef);
    };
  }, [user, fetchChats, updateChatWithNewMessage, incrementUnreadCount]);
}
