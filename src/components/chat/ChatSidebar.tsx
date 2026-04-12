// ============================================================
// ChatSidebar — Left panel with chat list, search, new chat
// ============================================================
'use client';

import { useState, useEffect, useMemo } from 'react';
import { MessageSquarePlus, Users, Settings, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import SearchInput from '@/components/ui/SearchInput';
import ChatListItem from '@/components/chat/ChatListItem';
import Avatar from '@/components/ui/Avatar';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';
import CreateGroupModal from '@/components/chat/CreateGroupModal';
import { useChatStore } from '@/store/chat-store';
import { useAuthStore } from '@/store/auth-store';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Profile } from '@/types';

export default function ChatSidebar() {
  const router = useRouter();
  const { chats, isLoadingChats, fetchChats, setActiveChat, activeChatId, startDirectChat } = useChatStore();
  const { profile, signOut } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [searchUsers, setSearchUsers] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // Search users for new chat
  useEffect(() => {
    if (!showNewChat) return;
    const searchForUsers = async () => {
      setIsSearching(true);
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', profile?.id || '')
        .order('display_name');

      setSearchUsers((data as Profile[]) || []);
      setIsSearching(false);
    };
    searchForUsers();
  }, [showNewChat, profile?.id]);

  const filteredChats = useMemo(() => {
    if (!searchQuery) return chats;
    const q = searchQuery.toLowerCase();
    return chats.filter((chat) => {
      const name = chat.is_group
        ? chat.group_name
        : chat.other_user?.display_name;
      return name?.toLowerCase().includes(q);
    });
  }, [chats, searchQuery]);

  const handleStartChat = async (userId: string) => {
    const chatId = await startDirectChat(userId);
    if (chatId) {
      setShowNewChat(false);
      router.push(`/${chatId}`);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)] border-r border-[var(--border-color)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--bg-header)]">
        <div className="flex items-center gap-3">
          <Avatar
            src={profile?.avatar_url}
            name={profile?.display_name || 'User'}
            size="md"
          />
          <span className="font-semibold text-[var(--text-primary)] text-[15px]">
            {profile?.display_name || 'User'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowNewGroup(true)}
            className="p-2 rounded-full hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-muted)]"
            title="New group"
          >
            <Users size={20} />
          </button>
          <button
            onClick={() => setShowNewChat(true)}
            className="p-2 rounded-full hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-muted)]"
            title="New chat"
          >
            <MessageSquarePlus size={20} />
          </button>
          <button
            onClick={() => router.push('/settings')}
            className="p-2 rounded-full hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-muted)]"
            title="Settings"
          >
            <Settings size={20} />
          </button>
          <button
            onClick={handleSignOut}
            className="p-2 rounded-full hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-muted)]"
            title="Log out"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <SearchInput value={searchQuery} onChange={setSearchQuery} />
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoadingChats && filteredChats.length === 0 ? (
          <Spinner className="mt-12" />
        ) : filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20 text-[var(--text-muted)] px-6 text-center">
            <MessageSquarePlus size={48} className="mb-4 opacity-50" />
            <p className="text-sm">No chats yet</p>
            <p className="text-xs mt-1">Start a new conversation!</p>
          </div>
        ) : (
          filteredChats.map((chat) => (
            <ChatListItem
              key={chat.id}
              chat={chat}
              isActive={chat.id === activeChatId}
              onClick={() => {
                setActiveChat(chat.id);
                router.push(`/${chat.id}`);
              }}
            />
          ))
        )}
      </div>

      {/* New Chat Modal */}
      <Modal isOpen={showNewChat} onClose={() => setShowNewChat(false)} title="New Chat">
        <div className="max-h-80 overflow-y-auto">
          {isSearching ? (
            <Spinner className="my-8" />
          ) : searchUsers.length === 0 ? (
            <p className="text-center text-[var(--text-muted)] py-8 text-sm">No users found</p>
          ) : (
            searchUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => handleStartChat(user.id)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
              >
                <Avatar src={user.avatar_url} name={user.display_name} size="md" />
                <div className="text-left">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{user.display_name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{user.bio || 'Hey there!'}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </Modal>

      {/* Create Group Modal */}
      <CreateGroupModal isOpen={showNewGroup} onClose={() => setShowNewGroup(false)} />
    </div>
  );
}
