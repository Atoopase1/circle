// ============================================================
// ChatHeader — Top bar of an active chat with call buttons
// ============================================================
'use client';

import { ArrowLeft, Phone, Video, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Avatar from '@/components/ui/Avatar';
import { usePresenceStore } from '@/store/presence-store';
import { useAuthStore } from '@/store/auth-store';
import { useCallStore } from '@/store/call-store';
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
      <span className="text-[var(--wa-green)] animate-pulse">
        {chat.is_group ? `${names} typing…` : 'typing…'}
      </span>
    );
  } else if (chat.is_group) {
    const participantNames = chat.participants
      .map((p) => (p.profile?.id === user?.id ? 'You' : p.profile?.display_name || 'Unknown'))
      .join(', ');
    statusText = participantNames;
  } else if (isOnline) {
    statusText = 'online';
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
    <div className="flex items-center gap-3 px-4 py-3 bg-[var(--bg-header)] border-b border-[var(--border-color)]">
      {/* Back button (mobile) */}
      <button
        onClick={() => router.push('/')}
        className="lg:hidden p-1.5 -ml-2 rounded-full hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-muted)]"
      >
        <ArrowLeft size={20} />
      </button>

      {/* Avatar */}
      <button onClick={onInfoClick} className="shrink-0">
        <Avatar src={avatarSrc} name={displayName} size="md" isOnline={isOnline} />
      </button>

      {/* Name & Status */}
      <button onClick={onInfoClick} className="flex-1 min-w-0 text-left">
        <h2 className="font-semibold text-[var(--text-primary)] text-[15px] truncate">
          {displayName}
        </h2>
        {statusText && (
          <p className="text-xs text-[var(--text-muted)] truncate">{statusText}</p>
        )}
      </button>

      {/* Actions — Call buttons work in 1-on-1 chats */}
      <div className="flex items-center gap-1">
        {!chat.is_group && (
          <>
            <button
              onClick={handleVideoCall}
              className="p-2 rounded-full hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-muted)] hover:text-[var(--wa-green)]"
              title="Video call"
            >
              <Video size={20} />
            </button>
            <button
              onClick={handleAudioCall}
              className="p-2 rounded-full hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-muted)] hover:text-[var(--wa-green)]"
              title="Audio call"
            >
              <Phone size={20} />
            </button>
          </>
        )}
        <button className="p-2 rounded-full hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-muted)]">
          <Search size={20} />
        </button>
      </div>
    </div>
  );
}
