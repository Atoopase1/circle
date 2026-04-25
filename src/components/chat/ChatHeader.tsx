// ChatHeader — Premium glass header with call actions
'use client';

import { ArrowLeft, Phone, Video, Search, X, Trash2, Forward, Star, Copy } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Avatar from '@/components/ui/Avatar';
import { usePresenceStore } from '@/store/presence-store';
import { useAuthStore } from '@/store/auth-store';
import { useCallStore } from '@/store/call-store';
import { useChatStore } from '@/store/chat-store';
import { formatLastSeen } from '@/lib/utils';
import type { ChatWithDetails } from '@/types';

interface ChatHeaderProps {
  chat: ChatWithDetails;
  onInfoClick?: () => void;
}

export default function ChatHeader({ chat, onInfoClick }: ChatHeaderProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { isUserOnline, getTypingUsersForChat } = usePresenceStore();
  const initiateCall = useCallStore((s) => s.initiateCall);
  const { selectionMode, selectedMessageIds, clearSelection, deleteMessageForMe } = useChatStore();

  const handleBulkDelete = () => {
    selectedMessageIds.forEach(id => deleteMessageForMe(id));
    clearSelection();
  };

  if (selectionMode) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 glass-header border-b border-[var(--emerald)] bg-[var(--emerald)]/5 transition-colors">
        <button
          onClick={() => clearSelection()}
          className="p-2 -ml-2 rounded-xl text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all"
        >
          <X size={26} />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-[var(--text-primary)] text-base">
            {selectedMessageIds.length} Selected
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <button 
            disabled={selectedMessageIds.length === 0}
            className="p-2.5 rounded-xl text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 disabled:opacity-50 transition-all"
            onClick={handleBulkDelete}
            title="Delete Selected"
          >
            <Trash2 size={26} />
          </button>
          <button 
            disabled={selectedMessageIds.length === 0}
            className="p-2.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--emerald)] hover:bg-[var(--emerald)]/10 disabled:opacity-50 transition-all"
            title="Forward Selected"
          >
            <Forward size={26} />
          </button>
          <button 
            disabled={selectedMessageIds.length === 0}
            className="p-2.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--gold)] hover:bg-[var(--gold)]/10 disabled:opacity-50 transition-all"
            title="Star Selected"
          >
            <Star size={26} />
          </button>
          <button 
            disabled={selectedMessageIds.length === 0}
            className="p-2.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-50 transition-all"
            title="Copy Selected"
          >
            <Copy size={26} />
          </button>
        </div>
      </div>
    );
  }

  const displayName = chat.is_group
    ? chat.group_name || 'Group'
    : chat.other_user?.display_name || 'Unknown';

  const avatarSrc = chat.is_group ? chat.group_icon_url : chat.other_user?.avatar_url;

  const isOnline = !chat.is_group && chat.other_user
    ? isUserOnline(chat.other_user.id)
    : undefined;

  const typingUsers = getTypingUsersForChat(chat.id).filter(
    (t) => t.user_id !== user?.id
  );

  let statusText: React.ReactNode = '';
  if (typingUsers.length > 0) {
    const names = typingUsers.map((t) => t.display_name).join(', ');
    statusText = (
      <span className="text-[var(--emerald)] font-medium flex items-center gap-1.5">
        <span className="flex gap-0.5">
          <span className="w-1 h-1 rounded-full bg-[var(--emerald)]" style={{ animation: 'typingBounce 1.2s infinite', animationDelay: '0ms' }} />
          <span className="w-1 h-1 rounded-full bg-[var(--emerald)]" style={{ animation: 'typingBounce 1.2s infinite', animationDelay: '200ms' }} />
          <span className="w-1 h-1 rounded-full bg-[var(--emerald)]" style={{ animation: 'typingBounce 1.2s infinite', animationDelay: '400ms' }} />
        </span>
        {chat.is_group ? `${names} typing…` : 'typing…'}
      </span>
    );
  } else if (chat.is_group) {
    const participantNames = chat.participants
      .map((p) => (p.profile?.id === user?.id ? 'You' : p.profile?.display_name || 'Unknown'))
      .join(', ');
    statusText = participantNames;
  } else if (isOnline) {
    statusText = (
      <span className="text-[var(--text-muted)] font-medium tracking-wide">
        Online
      </span>
    );
  } else if (chat.other_user?.last_seen) {
    statusText = formatLastSeen(chat.other_user.last_seen);
  }

  const handleVideoCall = () => {
    if (!chat.is_group && chat.other_user) {
      initiateCall(chat.other_user, 'video');
    }
  };

  const handleAudioCall = () => {
    if (!chat.is_group && chat.other_user) {
      initiateCall(chat.other_user, 'audio');
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 glass-header border-b border-[var(--border-color)]">
      {/* Back button (mobile) */}
      <button
        onClick={() => router.push('/')}
        className="lg:hidden p-2 -ml-2 rounded-xl hover:bg-[var(--bg-hover)] transition-all duration-200 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft size={26} />
      </button>

      {/* Avatar */}
      <button 
        onClick={() => {
          if (onInfoClick) onInfoClick();
          else if (!chat.is_group && chat.other_user) router.push(`/profile/${chat.other_user.id}`);
        }} 
        className="shrink-0"
      >
        <Avatar src={avatarSrc} name={displayName} size="md" isOnline={isOnline} />
      </button>

      {/* Name & Status */}
      <button 
        onClick={() => {
          if (onInfoClick) onInfoClick();
          else if (!chat.is_group && chat.other_user) router.push(`/profile/${chat.other_user.id}`);
        }} 
        className="flex-1 min-w-0 text-left"
      >
        <h2 className="font-semibold text-[var(--text-primary)] text-base truncate">
          {displayName}
        </h2>
        {statusText && (
          <p className="text-sm text-[var(--text-muted)] truncate mt-0.5">{statusText}</p>
        )}
      </button>

      {/* Actions */}
      <div className="flex items-center gap-0.5 shrink-0">
        {!chat.is_group && (
          <>
            <button
              onClick={handleVideoCall}
              className="p-2.5 rounded-xl hover:bg-[var(--bg-hover)] transition-all duration-200 text-[var(--text-secondary)] hover:text-[var(--emerald)]"
              title="Video call"
            >
              <Video size={28} strokeWidth={2.2} />
            </button>
            <button
              onClick={handleAudioCall}
              className="p-2.5 rounded-xl hover:bg-[var(--bg-hover)] transition-all duration-200 text-[var(--text-secondary)] hover:text-[var(--emerald)]"
              title="Audio call"
            >
              <Phone size={28} strokeWidth={2.2} />
            </button>
          </>
        )}
        <button className="p-2.5 rounded-xl hover:bg-[var(--bg-hover)] transition-all duration-200 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          <Search size={28} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}
