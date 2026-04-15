// ============================================================
// MessageList — Premium scrollable message list
// ============================================================
'use client';

import { useRef, useEffect, useCallback } from 'react';
import MessageBubble from '@/components/chat/MessageBubble';
import TypingIndicator from '@/components/chat/TypingIndicator';
import MessageSkeleton from '@/components/chat/MessageSkeleton';
import { useRealtimeConnection } from '@/hooks/useRealtimeMessages';
import { useChatStore } from '@/store/chat-store';
import { useAuthStore } from '@/store/auth-store';
import { usePresenceStore } from '@/store/presence-store';
import { formatDateSeparator } from '@/lib/utils';
import type { Message } from '@/types';
import { Pin, WifiOff, ChevronDown } from 'lucide-react';
import { useState } from 'react';

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
  const user = useAuthStore((s) => s.user);
  const typingUsersAll = usePresenceStore((s) => s.typingUsers);
  const typingUsers = typingUsersAll.filter((t) => t.chat_id === chatId);

  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const isAutoScrollRef = useRef(true);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isReconnecting = useRealtimeConnection();
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (isAutoScrollRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Initial scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView();
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

  const pinnedMessage = activeChat?.pinned_message_id 
    ? messages.find(m => m.id === activeChat.pinned_message_id) 
    : null;

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden bg-[var(--bg-chat)]" style={{
      backgroundImage: 'var(--chat-bg-pattern)',
      backgroundSize: '400px',
      backgroundRepeat: 'repeat',
    }}>
      {/* Reconnecting banner */}
      {isReconnecting && (
        <div className="absolute top-0 left-0 right-0 z-30 bg-[var(--gold)]/90 text-[var(--navy)] text-[14px] py-1.5 text-center font-medium backdrop-blur-sm flex items-center justify-center gap-2">
          <WifiOff size={13} />
          Waiting for network...
        </div>
      )}

      {/* Pinned message bar */}
      {pinnedMessage && (
        <div 
          className={`absolute left-0 right-0 z-20 glass-header border-b border-[var(--border-color)] p-2.5 px-4 flex items-center gap-3 cursor-pointer hover:bg-[var(--bg-hover)] transition-all duration-200 ${isReconnecting ? 'top-8' : 'top-0'}`} 
          onClick={() => {}}
        >
          <Pin size={19} className="text-[var(--emerald)] shrink-0" />
          <div className="flex-1 min-w-0 border-l-3 border-[var(--emerald)] pl-2.5">
            <p className="text-[14px] font-semibold text-[var(--emerald)] mb-0.5">Pinned Message</p>
            <p className="text-[14px] text-[var(--text-secondary)] truncate">{pinnedMessage.content || (pinnedMessage.media_url ? '[Media]' : '')}</p>
          </div>
        </div>
      )}

      <div
        ref={listRef}
        onScroll={handleScroll}
        className={`flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin ${pinnedMessage ? (isReconnecting ? 'pt-20' : 'pt-16') : (isReconnecting ? 'pt-8' : '')}`}
      >
      {/* Loading spinner for older messages */}
      {isLoadingMessages && messages.length > 0 && (
        <div className="py-4 text-center">
          <span className="bg-[var(--bg-primary)] text-[var(--text-muted)] text-[14px] px-4 py-1.5 rounded-full border border-[var(--border-color)] animate-pulse inline-block">
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
                className="px-3 py-1 text-[var(--text-secondary)] text-[12px] rounded-full font-medium tracking-wide border border-[var(--border-color)]"
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
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isOwn={isMe}
                  showSenderName={isGroup}
                />
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
          onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="absolute bottom-4 right-4 z-50 p-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-full text-[var(--emerald)] shadow-lg hover:bg-[var(--bg-hover)] transition-all animate-scaleIn"
        >
          <ChevronDown size={22} />
        </button>
      )}
    </div>
  );
}
