// MessageList — Premium scrollable message list
'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import MessageBubble from '@/components/chat/MessageBubble';
import TypingIndicator from '@/components/chat/TypingIndicator';
import MessageSkeleton from '@/components/chat/MessageSkeleton';
import { useRealtimeConnection } from '@/hooks/useRealtimeMessages';
import { useChatStore } from '@/store/chat-store';
import { useAuthStore } from '@/store/auth-store';
import { usePresenceStore } from '@/store/presence-store';
import { formatDateSeparator } from '@/lib/utils';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Message } from '@/types';
import { Pin, WifiOff, ChevronDown, X } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';

interface MessageListProps {
  chatId: string;
  isGroup: boolean;
}

export default function MessageList({ chatId, isGroup }: MessageListProps) {
  const messages = useChatStore((s) => s.messages);
  const isLoadingMessages = useChatStore((s) => s.isLoadingMessages);
  const hasMoreMessages = useChatStore((s) => s.hasMoreMessages);
  const fetchMessages = useChatStore((s) => s.fetchMessages);
  const activeChat = useChatStore(s => s.activeChat);
  const unpinMessage = useChatStore(s => s.unpinMessage);
  const user = useAuthStore((s) => s.user);
  const typingUsersAll = usePresenceStore((s) => s.typingUsers);
  const typingUsers = typingUsersAll.filter((t) => t.chat_id === chatId);

  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const isAutoScrollRef = useRef(true);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isReconnecting = useRealtimeConnection();
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const prevMessageCountRef = useRef(messages.length);

  // Scroll to bottom when new messages arrive (or count new messages if scrolled up)
  useEffect(() => {
    const addedCount = messages.length - prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;

    if (isAutoScrollRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      setNewMessageCount(0);
    } else if (addedCount > 0) {
      // User is scrolled up — show them how many new messages arrived
      setNewMessageCount((c) => c + addedCount);
    }
  }, [messages]);

  // Initial scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView();
    setNewMessageCount(0);
  }, [chatId]);

  // Track if user is near bottom
  const handleScroll = useCallback(() => {
    if (!listRef.current) return;
    
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

    scrollTimeoutRef.current = setTimeout(() => {
      if (!listRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = listRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      isAutoScrollRef.current = isAtBottom;
      setShowScrollBottom(!isAtBottom);

      // Load more messages when scrolled to top
      if (scrollTop < 80 && hasMoreMessages && !isLoadingMessages && messages.length > 0) {
        const oldScrollHeight = scrollHeight;
        fetchMessages(chatId, messages[0].created_at).then(() => {
          // Maintain scroll position after prepending
          requestAnimationFrame(() => {
            if (listRef.current) {
              listRef.current.scrollTop = listRef.current.scrollHeight - oldScrollHeight;
            }
          });
        });
      }
    }, 150); // debounce scroll
  }, [chatId, hasMoreMessages, isLoadingMessages, messages, fetchMessages]);

  // Group messages by date
  const groupedMessages: { date: string; messages: Message[] }[] = [];
  messages.forEach((msg) => {
    const dateStr = new Date(msg.created_at).toDateString();
    const lastGroup = groupedMessages[groupedMessages.length - 1];
    if (lastGroup && lastGroup.date === dateStr) {
      lastGroup.messages.push(msg);
    } else {
      groupedMessages.push({ date: dateStr, messages: [msg] });
    }
  });

  const filteredTyping = typingUsers.filter((t) => t.user_id !== user?.id);

  // ---- Pinned message: always-visible sticky banner ----
  const personalPinnedMessageId = activeChat?.my_participant?.pinned_message_id ?? null;
  const groupPinnedMessageId = activeChat?.pinned_message_id ?? null;
  const pinnedMessageId = personalPinnedMessageId || groupPinnedMessageId;
  const pinnedScope = personalPinnedMessageId ? 'me' : 'everyone';

  const pinnedFromMessages = pinnedMessageId
    ? messages.find((m) => m.id === pinnedMessageId) ?? null
    : null;
  const [fetchedPinnedMsg, setFetchedPinnedMsg] = useState<Message | null>(null);

  // Fetch pinned message from DB if not in currently loaded messages
  useEffect(() => {
    if (!pinnedMessageId) {
      setFetchedPinnedMsg(null);
      return;
    }
    // Already available in loaded messages — no fetch needed
    if (pinnedFromMessages) {
      setFetchedPinnedMsg(null);
      return;
    }

    let cancelled = false;
    const supabase = getSupabaseBrowserClient();

    (async () => {
      const { data } = await supabase
        .from('messages')
        .select('*, sender:profiles!messages_sender_id_fkey(*)')
        .eq('id', pinnedMessageId)
        .single();

      if (!cancelled && data) {
        setFetchedPinnedMsg(data as Message);
      }
    })();

    return () => { cancelled = true; };
  }, [pinnedMessageId, pinnedFromMessages]);

  const pinnedMessage = pinnedFromMessages ?? fetchedPinnedMsg;

  // Helper: get pinned message preview text
  const getPinnedPreview = (msg: Message) => {
    if (msg.content) return msg.content;
    switch (msg.message_type) {
      case 'image': return '📷 Photo';
      case 'video': return '🎬 Video';
      case 'audio': return '🎵 Audio';
      case 'document': return '📄 Document';
      default: return msg.media_url ? '📎 Media' : '';
    }
  };

  // Scroll to the pinned message in the chat
  const scrollToPinned = () => {
    if (!pinnedMessage) return;
    const el = document.getElementById(`msg-${pinnedMessage.id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Flash highlight
      el.classList.add('pinned-highlight');
      setTimeout(() => el.classList.remove('pinned-highlight'), 2000);
    }
  };

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden bg-[var(--bg-chat)]" style={{
      backgroundImage: 'var(--chat-bg-pattern)',
      backgroundSize: '400px',
      backgroundRepeat: 'repeat',
    }}>
      {/* Pinned message bar — WhatsApp-style compact */}
      {pinnedMessage && (
        <div 
          className="absolute top-0 left-0 right-0 z-20 bg-[var(--bg-primary)]/90 backdrop-blur-md shadow-sm border-b border-[var(--border-color)] cursor-pointer hover:bg-[var(--bg-hover)] transition-all duration-200"
          style={{ animation: 'slideDown 0.2s ease-out' }}
          onClick={scrollToPinned}
        >
          <div className="flex items-center gap-3 px-3 py-2">
            {/* Left accent line */}
            <div className="w-[3px] h-6 rounded-full bg-white/80 dark:bg-[#E9EDEF] shrink-0" />
            
            {/* Pin Icon Container */}
            <div className="w-9 h-9 rounded-[10px] bg-[var(--bg-secondary)] flex items-center justify-center shrink-0">
              <Pin size={22} className="text-[var(--text-secondary)] fill-current" />
            </div>

            {/* Pinned Text */}
            <div className="flex-1 min-w-0 pr-2">
              <span className="text-base font-medium text-[var(--text-primary)] block truncate">
                {getPinnedPreview(pinnedMessage)}
              </span>
            </div>

            {/* Unpin button (subtly placed) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (activeChat) unpinMessage(activeChat.id, pinnedScope);
              }}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-white transition-all shrink-0"
              title="Unpin"
            >
              <X size={22} />
            </button>
          </div>
        </div>
      )}

      <div
        ref={listRef}
        onScroll={handleScroll}
        className={`flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin ${pinnedMessage ? 'pt-16' : ''}`}
      >
      {/* Loading spinner for older messages */}
      {isLoadingMessages && messages.length > 0 && (
        <div className="py-4 text-center">
          <span className="bg-[var(--bg-primary)] text-[var(--text-muted)] text-sm px-4 py-1.5 rounded-full border border-[var(--border-color)] animate-pulse inline-block">
            Loading earlier messages...
          </span>
        </div>
      )}

      {/* Initial loading - Skeletons */}
      {isLoadingMessages && messages.length === 0 && (
        <div className="flex flex-col gap-4 mt-8 opacity-60">
          <MessageSkeleton isOwn={false} />
          <MessageSkeleton isOwn={true} />
          <MessageSkeleton isOwn={false} />
          <MessageSkeleton isOwn={false} />
          <MessageSkeleton isOwn={true} />
        </div>
      )}

      {/* Messages */}
      <div className="py-2">
        {groupedMessages.map((group) => (
          <div key={group.date}>
            {/* Date separator — premium glass pill */}
            <div className="flex items-center justify-center my-4">
              <span 
                className="px-3 py-1 text-[var(--text-secondary)] text-xs rounded-full font-medium tracking-wide border border-[var(--border-color)]"
                style={{  
                  background: 'var(--bg-date-separator)',
                  backdropFilter: 'blur(8px)',
                  boxShadow: 'var(--shadow-xs)',
                }}
              >
                {formatDateSeparator(group.date)}
              </span>
            </div>
            {/* Messages for this date */}
            {group.messages.map((msg) => {
              const isMe = msg.sender_id === user?.id;
              if (msg.id.includes('temp')) {
                console.log(`[MessageList] Rendering optimistic message ${msg.id}: isOwn=${isMe} (sender=${msg.sender_id} user=${user?.id})`);
              }
              return (
                <div key={msg.id} id={`msg-${msg.id}`}>
                  <MessageBubble
                    message={msg}
                    isOwn={isMe}
                    showSenderName={isGroup}
                  />
                </div>
              );
            })}
          </div>
        ))}

        {/* Typing indicator */}
        <TypingIndicator names={filteredTyping.map((t) => t.display_name)} />
      </div>

      <div ref={bottomRef} />
      </div>
      
      {/* Scroll to Bottom FAB */}
      {showScrollBottom && (
        <button
          onClick={() => {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
            setNewMessageCount(0);
          }}
          className="absolute bottom-4 right-4 z-50 p-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-full text-[var(--emerald)] shadow-lg hover:bg-[var(--bg-hover)] transition-all animate-scaleIn"
        >
          {newMessageCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-[var(--emerald)] text-white text-[10px] font-bold min-w-[20px] h-[20px] flex items-center justify-center rounded-full px-1 shadow-md animate-scaleIn">
              {newMessageCount > 99 ? '99+' : newMessageCount}
            </span>
          )}
          <ChevronDown size={26} />
        </button>
      )}
    </div>
  );
}
