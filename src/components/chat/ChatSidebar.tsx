// ============================================================
// ChatSidebar — Premium left panel with LinkedIn-style cover
// ============================================================
'use client';

import { useState, useEffect, useMemo } from 'react';
import { MessageSquarePlus, Users, Settings, LogOut, Image as ImageIcon, Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import SearchInput from '@/components/ui/SearchInput';
import ChatListItem from '@/components/chat/ChatListItem';
import Avatar from '@/components/ui/Avatar';
import Modal from '@/components/ui/Modal';
import ImageViewerModal from '@/components/ui/ImageViewerModal';
import NotificationPanel from '@/components/ui/NotificationPanel';
import FollowersModal from '@/components/modals/FollowersModal';
import Spinner from '@/components/ui/Spinner';
import CreateGroupModal from '@/components/chat/CreateGroupModal';
import { useChatStore } from '@/store/chat-store';
import { useAuthStore } from '@/store/auth-store';
import { useNotificationStore } from '@/store/notification-store';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Profile } from '@/types';

export default function ChatSidebar() {
  const router = useRouter();
  const { chats, isLoadingChats, fetchChats, setActiveChat, activeChatId, startDirectChat } = useChatStore();
  const { profile, signOut } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showAvatarViewer, setShowAvatarViewer] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchUsers, setSearchUsers] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [followerCount, setFollowerCount] = useState<number>(0);
  const [showFollowers, setShowFollowers] = useState(false);
  const [isBellShaking, setIsBellShaking] = useState(false);

  const unreadCount = useNotificationStore(s => s.unreadCount);
  const lastNewMessageAt = useChatStore(s => s.lastNewMessageAt);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // Shake bell on new message
  useEffect(() => {
    if (lastNewMessageAt) {
      setIsBellShaking(true);
      const timer = setTimeout(() => setIsBellShaking(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [lastNewMessageAt]);

  // Fetch follower count
  useEffect(() => {
    if (!profile?.id) return;
    const fetchFollowers = async () => {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.getSession(); // Ensure auth context is loaded for RLS
      const { data: followRows, error } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', profile.id);
      
      if (error) {
        console.error('[Sidebar] Follower count error:', error);
      }
      console.log('[Sidebar] Followers for', profile.id, ':', followRows);
      setFollowerCount(followRows?.length || 0);
    };
    fetchFollowers();
  }, [profile?.id]);

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

  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)]">

      {/* ── LinkedIn-style Cover + Profile Header ── */}
      <div className="relative shrink-0">
        {/* Cover Photo Banner */}
        <button
          onClick={() => profile?.id && router.push(`/profile/${profile.id}`)}
          className="block w-full h-24 overflow-hidden relative group"
        >
          {profile?.cover_url ? (
            <img
              src={profile.cover_url}
              alt="Cover"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center bg-[var(--emerald-dark,#15803D)]"
            >
              <ImageIcon size={32} className="text-white/8" />
            </div>
          )}
          {/* Gradient vignette at bottom for readability */}
          <div className="absolute inset-x-0 bottom-0 h-12" style={{ background: 'linear-gradient(to top, var(--bg-primary), transparent)' }} />
        </button>

        {/* Profile Info — overlapping the cover */}
        <div className="relative px-4 -mt-8 flex justify-between items-start">
          {/* Avatar + Name */}
          <div className="flex gap-3 min-w-0">
            <button
              onClick={() => profile?.avatar_url && setShowAvatarViewer(true)}
              className="shrink-0 rounded-full border-[4px] border-[var(--bg-primary)] shadow-lg hover:shadow-xl transition-shadow relative z-10 bg-[var(--bg-primary)]"
            >
              <Avatar
                src={profile?.avatar_url}
                name={profile?.display_name || 'User'}
                size="xl"
              />
            </button>
            <div className="pt-[42px] flex flex-col min-w-0">
              <button
                onClick={() => profile?.id && router.push(`/profile/${profile.id}`)}
                className="text-left group"
              >
                <span className="font-bold text-[var(--text-primary)] text-[16px] block leading-tight group-hover:text-[var(--emerald)] transition-colors truncate">
                  {profile?.display_name || 'User'}
                </span>
              </button>
              <div className="flex items-center gap-2 mt-3.5 min-w-0">
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--emerald)] shadow-[0_0_5px_var(--emerald)] animate-pulse" />
                  <span className="text-[12px] text-[var(--emerald)] font-semibold tracking-wide">Online</span>
                </div>
                <div className="w-1 h-1 rounded-full bg-[var(--text-muted)] opacity-50 shrink-0" />
                <button 
                  onClick={() => setShowFollowers(true)}
                  className="flex items-center gap-1 group/followers shrink-0"
                >
                  <Users size={16} className="shrink-0 text-[var(--text-muted)] group-hover/followers:text-[var(--text-primary)] transition-colors" />
                  <span className="text-[12px] text-[var(--text-muted)] font-medium tracking-wide group-hover/followers:text-[var(--text-primary)] transition-colors whitespace-nowrap">
                    {followerCount} {followerCount === 1 ? 'Follower' : 'Followers'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 sm:gap-1.5 pt-[40px] shrink-0">
            <button
              onClick={() => setShowNewGroup(true)}
              className="p-2 rounded-xl hover:bg-[var(--bg-hover)] transition-all duration-200 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              title="New group"
            >
              <Users size={28} strokeWidth={2.2} />
            </button>
            <button
              onClick={() => setShowNewChat(true)}
              className="p-2 rounded-xl hover:bg-[var(--bg-hover)] transition-all duration-200 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              title="New chat"
            >
              <MessageSquarePlus size={28} strokeWidth={2.2} />
            </button>
            <button
              onClick={() => router.push('/settings')}
              className="p-2 rounded-xl hover:bg-[var(--bg-hover)] transition-all duration-200 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              title="Settings"
            >
              <Settings size={28} strokeWidth={2.2} />
            </button>
            <button 
              onClick={() => setShowNotifications(!showNotifications)} 
              className="p-2 rounded-xl hover:bg-[var(--bg-hover)] transition-all duration-200 text-[var(--text-secondary)] hover:text-[var(--text-primary)] relative"
              title="Notifications"
            >
              <Bell size={28} strokeWidth={2.2} className={isBellShaking ? 'animate-shake text-[var(--emerald)]' : ''} />
              {unreadCount() > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold w-[16px] h-[16px] rounded-full flex items-center justify-center border-[2px] border-[var(--bg-primary)]">
                  {unreadCount() > 9 ? '9+' : unreadCount()}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-2 mx-4 h-px bg-[var(--border-color)]" />
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <SearchInput value={searchQuery} onChange={setSearchQuery} />
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoadingChats && filteredChats.length === 0 ? (
          <Spinner className="mt-12" />
        ) : filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20 text-[var(--text-muted)] px-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-secondary)] flex items-center justify-center mb-4">
              <MessageSquarePlus size={32} className="opacity-40" />
            </div>
            <p className="text-sm font-medium text-[var(--text-secondary)]">No conversations yet</p>
            <p className="text-[13px] mt-1.5 text-[var(--text-muted)]">Start a new chat to get going</p>
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
        <div className="max-h-80 overflow-y-auto -mx-2">
          {isSearching ? (
            <Spinner className="my-8" />
          ) : searchUsers.length === 0 ? (
            <p className="text-center text-[var(--text-muted)] py-8 text-sm">No users found</p>
          ) : (
            searchUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => handleStartChat(user.id)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[var(--bg-hover)] transition-all duration-200"
              >
                <Avatar src={user.avatar_url} name={user.display_name} size="md" />
                <div className="text-left">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{user.display_name}</p>
                  <p className="text-[13px] text-[var(--text-muted)]">{user.bio || 'Hey there!'}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </Modal>

      {/* Create Group Modal */}
      <CreateGroupModal isOpen={showNewGroup} onClose={() => setShowNewGroup(false)} />

      {/* Full screen Avatar viewer */}
      <ImageViewerModal 
        isOpen={showAvatarViewer} 
        onClose={() => setShowAvatarViewer(false)} 
        src={profile?.avatar_url} 
        align="left"
      />

      {/* Notification Panel */}
      <NotificationPanel isOpen={showNotifications} onClose={() => setShowNotifications(false)} />

      {/* Followers Modal */}
      {profile?.id && (
        <FollowersModal
          isOpen={showFollowers}
          onClose={() => setShowFollowers(false)}
          profileId={profile.id}
          followerCount={followerCount}
        />
      )}
    </div>
  );
}
