// ============================================================
// Message status hook — marks messages as read when chat opens
// NOTE: Real-time status update events (INSERT/UPDATE on message_status)
//       are handled centrally in useRealtimeMessages.ts to avoid
//       duplicate channel subscriptions on the same table.
// ============================================================
'use client';

import { useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/auth-store';
import { useChatStore } from '@/store/chat-store';

export function useMessageStatus(chatId: string | null) {
  const user = useAuthStore((s) => s.user);
  const messages = useChatStore((s) => s.messages);

  // When the chat opens or new messages load, mark unread messages as seen
  useEffect(() => {
    if (!chatId || !user || messages.length === 0) return;

    const supabase = getSupabaseBrowserClient();

    // Find messages sent by others that we haven't marked as seen yet
    const unreadMessageIds = messages
      .filter((m) => m.sender_id !== user.id)
      .filter((m) => {
        const myStatus = m.status?.find((s) => s.user_id === user.id);
        return !myStatus || myStatus.status !== 'seen';
      })
      .map((m) => m.id);

    if (unreadMessageIds.length === 0) return;

    // Mark them all as seen in the DB
    // The realtime listener in useRealtimeMessages will pick up the UPDATE
    // and reflect the blue double-tick on the sender's screen in real-time.
    const markSeen = async () => {
      const { data: statusRows } = await supabase
        .from('message_status')
        .select('id')
        .eq('user_id', user.id)
        .in('message_id', unreadMessageIds)
        .in('status', ['sent', 'delivered']);

      if (statusRows && statusRows.length > 0) {
        await supabase
          .from('message_status')
          .update({ status: 'seen', updated_at: new Date().toISOString() })
          .in('id', statusRows.map((s) => s.id));
      }
    };

    markSeen();
  }, [chatId, user, messages]);
}
