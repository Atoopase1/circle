// ============================================================
// GroupInfoPanel — Premium group details side panel
// ============================================================
'use client';

import { X } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { useAuthStore } from '@/store/auth-store';
import { usePresenceStore } from '@/store/presence-store';
import type { ChatWithDetails } from '@/types';

interface GroupInfoPanelProps {
  chat: ChatWithDetails;
  isOpen: boolean;
  onClose: () => void;
}

export default function GroupInfoPanel({ chat, isOpen, onClose }: GroupInfoPanelProps) {
  const user = useAuthStore((s) => s.user);
  const isUserOnline = usePresenceStore((s) => s.isUserOnline);

  if (!isOpen) return null;

  const isAdmin = chat.participants.some(
    (p) => p.user_id === user?.id && p.role === 'admin'
  );

  return (
    <div className="w-80 h-full bg-[var(--bg-primary)] border-l border-[var(--border-color)] flex flex-col animate-slideInRight">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 glass-header border-b border-[var(--border-color)]">
        <button
          onClick={onClose}
          className="p-2 rounded-xl hover:bg-[var(--bg-hover)] transition-all duration-200 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <X size={23} />
        </button>
        <h2 className="font-semibold text-[var(--text-primary)] text-[15px]">Group info</h2>
      </div>

      {/* Group details */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="flex flex-col items-center py-8 px-5 border-b border-[var(--border-color)]">
          <div className="p-1 rounded-full" style={{ background: 'var(--emerald)' }}>
            <div className="rounded-full bg-[var(--bg-primary)] p-0.5">
              <Avatar
                src={chat.group_icon_url}
                name={chat.group_name || 'Group'}
                size="xl"
              />
            </div>
          </div>
          <h3 className="mt-4 text-[18px] font-semibold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-heading)' }}>
            {chat.group_name || 'Group'}
          </h3>
          <p className="text-[14px] text-[var(--text-muted)] mt-1">
            Group · {chat.participants.length} participants
          </p>
          {chat.group_description && (
            <p className="mt-3 text-[14px] text-[var(--text-secondary)] text-center leading-relaxed">
              {chat.group_description}
            </p>
          )}
        </div>

        {/* Participants */}
        <div className="py-4">
          <p className="px-5 text-[14px] font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-3">
            {chat.participants.length} Participants
          </p>
          {chat.participants.map((p) => (
            <div
              key={p.user_id}
              className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--bg-hover)] transition-all duration-200"
            >
              <Avatar
                src={p.profile?.avatar_url}
                name={p.profile?.display_name || 'User'}
                size="md"
                isOnline={isUserOnline(p.user_id)}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-medium text-[var(--text-primary)] truncate">
                    {p.user_id === user?.id ? 'You' : p.profile?.display_name || 'User'}
                  </span>
                  {p.role === 'admin' && (
                    <span className="text-[10px] px-2 py-0.5 bg-[var(--emerald)]/10 text-[var(--emerald)] rounded-full font-semibold">
                      Admin
                    </span>
                  )}
                </div>
                <p className="text-[14px] text-[var(--text-muted)] truncate mt-0.5">
                  {p.profile?.bio || 'Hey there!'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
