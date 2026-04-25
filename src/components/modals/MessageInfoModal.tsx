// MessageInfoModal — Premium read receipts & delivery info
'use client';

import { X, Check, CheckCheck } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import type { Message, Profile } from '@/types';
import { formatMessageTime } from '@/lib/utils';
import { useChatStore } from '@/store/chat-store';

interface MessageInfoModalProps {
  message: Message;
  chatParticipants: { user_id: string; profile: Profile }[];
  onClose: () => void;
}

export default function MessageInfoModal({ message, chatParticipants, onClose }: MessageInfoModalProps) {
  const statuses = message.status || [];
  
  const getStatusIcon = (status: string) => {
    if (status === 'seen') return <CheckCheck size={23} className="text-[var(--emerald)]" />;
    if (status === 'delivered') return <CheckCheck size={23} className="text-[var(--text-muted)]" />;
    return <Check size={23} className="text-[var(--text-muted)]" />;
  };

  const StatusSection = ({ title, filterStatus }: { title: string; filterStatus: string }) => {
    const filtered = chatParticipants.filter(p => statuses.find(s => s.user_id === p.user_id && s.status === filterStatus));
    return (
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-3">{title}</h3>
        {filtered.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No one {filterStatus === 'seen' ? 'yet' : 'else'}</p>
        ) : (
          <div className="space-y-3">
            {filtered.map(p => {
              const status = statuses.find(s => s.user_id === p.user_id && s.status === filterStatus)!;
              return (
                <div key={p.user_id} className="flex items-center gap-3">
                  <Avatar src={p.profile.avatar_url} name={p.profile.display_name} size="md" />
                  <div className="flex-1">
                    <p className="text-sm text-[var(--text-primary)] font-medium">{p.profile.display_name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {getStatusIcon(status.status)}
                      <p className="text-sm text-[var(--text-muted)]">{formatMessageTime(status.updated_at)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fadeIn">
      <div className="absolute inset-0 bg-[var(--navy)]/40 backdrop-blur-md" onClick={onClose} />
      <div 
        className="relative bg-[var(--bg-primary)] w-full max-w-md rounded-2xl overflow-hidden flex flex-col max-h-[80vh] animate-scaleIn"
        style={{ boxShadow: 'var(--shadow-2xl)' }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Message Info</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all duration-200">
            <X size={23} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 scrollbar-thin">
          {/* Original message preview */}
          <div className="mb-6 p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]">
            <p className="text-sm text-[var(--text-primary)]">{message.content || (message.media_url ? '[Media Message]' : '')}</p>
            <p className="text-sm text-[var(--text-muted)] mt-2">{formatMessageTime(message.created_at)}</p>
          </div>

          <StatusSection title="Read by" filterStatus="seen" />
          <StatusSection title="Delivered to" filterStatus="delivered" />
        </div>
      </div>
    </div>
  );
}
