// ============================================================
// Individual Chat Page — Message thread for a specific chat
// ============================================================
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ChatHeader from '@/components/chat/ChatHeader';
import MessageList from '@/components/chat/MessageList';
import MessageInput from '@/components/chat/MessageInput';
import GroupInfoPanel from '@/components/chat/GroupInfoPanel';
import ChatSidebar from '@/components/chat/ChatSidebar';
import LottieLoader from '@/components/ui/LottieLoader';
import { useChatStore } from '@/store/chat-store';
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import { useMessageStatus } from '@/hooks/useMessageStatus';
export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const chatId = params.chatId as string;
  const { activeChat, setActiveChat, fetchChats, chats } = useChatStore();
  const hasFetchedOnce = useChatStore((s) => s._hasFetchedOnce);
  const [showGroupInfo, setShowGroupInfo] = useState(false);

  // Subscribe to realtime messages
  useRealtimeMessages(chatId);
  useMessageStatus(chatId);

  useEffect(() => {
    if (!chatId) return;
    let stale = false;
    
    const initChat = async () => {
      // If chats never fetched, fetch them first
      if (!useChatStore.getState()._hasFetchedOnce) {
        await fetchChats();
      }
      
      // Only proceed if this effect hasn't been superseded
      if (stale) return;
      
      // Now set the active chat (it will fetch messages inside)
      await setActiveChat(chatId);
    };

    initChat();

    return () => {
      stale = true;
      // Clear active chat when leaving the page to prevent background state contamination
      setActiveChat(null);
    };
  }, [chatId, hasFetchedOnce, fetchChats, setActiveChat]);

  // Check if chat actually exists to prevent race conditions during load
  const isChatValid = chats.some((c) => c.id === chatId);

  // Auto-redirect if chat is deleted or invalid
  useEffect(() => {
    if (hasFetchedOnce && !isChatValid) {
      router.replace('/');
    }
  }, [hasFetchedOnce, isChatValid, router]);

  if (hasFetchedOnce && !isChatValid) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[var(--bg-chat)] h-full">
        <LottieLoader size={100} />
        <p className="text-[var(--text-muted)] text-sm mt-4 animate-pulse">Redirecting to chats...</p>
      </div>
    );
  }

  // Still wait for activeChat to be populated by Zustand
  if (!activeChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--bg-chat)] h-full">
        <LottieLoader size={100} />
      </div>
    );
  }

  return (
    <div className="flex w-full h-full min-w-0 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="w-full max-w-[420px] lg:w-[420px] shrink-0 hidden lg:flex flex-col z-10 border-r border-[var(--border-color)]">
        <ChatSidebar />
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex h-full min-w-0 overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <ChatHeader
            chat={activeChat}
            onInfoClick={activeChat.is_group ? () => setShowGroupInfo(!showGroupInfo) : undefined}
          />
          <MessageList chatId={chatId} isGroup={activeChat.is_group} />
          <MessageInput chatId={chatId} />
        </div>

        {/* Group info panel */}
        {activeChat.is_group && (
          <GroupInfoPanel
            chat={activeChat}
            isOpen={showGroupInfo}
            onClose={() => setShowGroupInfo(false)}
          />
        )}
      </div>
    </div>
  );
}
