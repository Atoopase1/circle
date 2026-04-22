// ============================================================
// Real-time messages hook — subscribes to new messages via Supabase Realtime
// ============================================================
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
const setGlobalConnectionState = (state: boolean) => {
  globalIsReconnecting = state;
  connectionListeners.forEach(listener => listener(state));
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
  const isFetched = useChatStore((s) => chatId ? s._fetchedChats[chatId] : false);
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabaseBrowserClient>['channel']> | null>(null);

  useEffect(() => {
    // Only subscribe AFTER we have successfully fetched the initial historical messages for this chat
    if (!chatId || !isFetched) return;

    const supabase = getSupabaseBrowserClient();

    // Clean up previous subscription before creating a new one
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`messages:${chatId}`)
      .on('system', { event: '*' }, (_payload) => {
        // Connection health monitoring — no-op handler
      })
      // ── New messages ──────────────────────────────────────────────────────
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

          console.log(`[Realtime] New message received: ${newMessage.id} from ${newMessage.sender_id}`);

          // If the message is from me, I already have the profile in the store
          if (newMessage.sender_id === currentUser?.id) {
            const currentProfile = useAuthStore.getState().profile;
            addMessage({ ...newMessage, sender: currentProfile || undefined } as Message);
            return;
          }

          // Fetch sender profile for incoming messages
          const { data: sender } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newMessage.sender_id)
            .single();

          addMessage({ ...newMessage, sender: sender || undefined } as Message);
        }
      )
      // ── Edited / unsent messages ──────────────────────────────────────────
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

          // Preserve existing sender profile — no need to re-fetch on simple edits
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
      // ── Message status (read receipts / delivery ticks) ───────────────────
      // Handles both INSERT (first delivery) and UPDATE (seen) events.
      // We listen globally (no filter) because message_status has no chat_id;
      // we scope updates client-side by checking if message_id is in our list.
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_status',
        },
        (payload) => {
          const newStatus = payload.new as Record<string, any>;
          if (!newStatus?.message_id) return;
          applyStatusUpdate(newStatus);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'message_status',
        },
        (payload) => {
          const updatedStatus = payload.new as Record<string, any>;
          if (!updatedStatus?.message_id) return;
          applyStatusUpdate(updatedStatus);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setGlobalConnectionState(false);
          console.log(`[Realtime] Subscribed to messages:${chatId}`);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setGlobalConnectionState(true);
          console.warn(`[Realtime] Channel issue: ${status}`);
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [chatId, isFetched, addMessage]);
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

    const channel = supabase
      .channel('chat-list-realtime')
      // Listen for new messages across ALL chats — instant chat list reorder
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const msg = payload.new as Message;

          // Optimistically update chat list with new message preview + timestamp
          updateChatWithNewMessage(msg.chat_id, msg);

          // Increment unread count if the message is from someone else
          if (msg.sender_id !== user.id) {
            incrementUnreadCount(msg.chat_id);
          }
        }
      )
      // Listen for chat participant changes (added/removed from chats)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_participants',
        },
        () => {
          // Full refresh needed — new chat appeared or we left a chat
          fetchChats();
        }
      )
      // Listen for chat metadata changes (group name, icon, etc.)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chats',
        },
        () => {
          fetchChats();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setGlobalConnectionState(false);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setGlobalConnectionState(true);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchChats, updateChatWithNewMessage, incrementUnreadCount]);
}
