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
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabaseBrowserClient>['channel']> | null>(null);

  useEffect(() => {
    if (!chatId) return;

    const supabase = getSupabaseBrowserClient();

    // Clean up previous subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`messages:${chatId}`)
      .on('system', { event: '*' }, (payload) => {
        if (payload.extension === 'postgres_changes' && payload.extra?.status === 'error') {
          // You could also specifically look for CHANNEL_ERROR or disconnected
        }
      })
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

          // Fetch sender profile
          const { data: sender } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newMessage.sender_id)
            .single();

          addMessage({ ...newMessage, sender: sender || undefined } as Message);
        }
      )
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
          
          // Re-fetch sender since it's just updating message content
          const { data: sender } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', updatedMessage.sender_id)
            .single();

          useChatStore.getState().updateMessageInList({ ...updatedMessage, sender: sender || undefined });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_status',
        },
        (payload) => {
          // @ts-ignore - explicitly suppressing any potential nested typing complaints
          const updatedStatus = payload.new as Record<string, any>;
          if (!updatedStatus || !updatedStatus.message_id) return;

          // Update the specific message's status securely in the Zustand store
          useChatStore.getState().messages.forEach((msg) => {
            if (msg.id === updatedStatus.message_id) {
              // Remove temp optimistic statuses
              const existingStatuses = (msg.status || []).filter((s) => s.id !== 'temp');
              let found = false;
              
              const newStatuses = existingStatuses.map((s) => {
                if (s.user_id === updatedStatus.user_id) {
                  found = true;
                  return { ...s, status: updatedStatus.status };
                }
                return s;
              });

              if (!found && updatedStatus.status) {
                newStatuses.push(updatedStatus);
              }

              // Optimistically update message list
              useChatStore.getState().updateMessageInList({ ...msg, status: newStatuses });
            }
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setGlobalConnectionState(false);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setGlobalConnectionState(true);
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, addMessage]);
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
