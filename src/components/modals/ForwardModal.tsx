// ForwardModal — Premium forward message modal
'use client';

import { useState } from 'react';
import { X, Search, Check, Send } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import type { ChatWithDetails, Message } from '@/types';
import { useChatStore } from '@/store/chat-store';
import { useAuthStore } from '@/store/auth-store';

interface ForwardModalProps {
  message: Message;
  onClose: () => void;
}

export default function ForwardModal({ message, onClose }: ForwardModalProps) {
  const chats = useChatStore(s => s.chats);
  const sendMessage = useChatStore(s => s.sendMessage);
  const currentUser = useAuthStore(s => s.user);
  
  const [search, setSearch] = useState('');
  const [selectedChatIds, setSelectedChatIds] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);

  const filteredChats = chats.filter(c => {
    if (!search) return true;
    const name = c.is_group ? c.group_name : c.other_user?.display_name;
    return name?.toLowerCase().includes(search.toLowerCase());
  });

  const toggleSelect = (id: string) => {
    setSelectedChatIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleForward = async () => {
    if (selectedChatIds.length === 0 || isSending) return;
    setIsSending(true);

    try {
      for (const chatId of selectedChatIds) {
        let content = message.content;
        await sendMessage(
          chatId,
          content || '',
          message.message_type,
          message.media_url || undefined,
          message.media_metadata || undefined
        );
      }
    } finally {
      setIsSending(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fadeIn">
      <div className="absolute inset-0 bg-[var(--navy)]/40 backdrop-blur-md" onPointerDown={onClose} onClick={(e) => { e.stopPropagation(); e.preventDefault(); }} />
      <div 
        className="relative bg-[var(--bg-primary)] w-full max-w-md rounded-2xl overflow-hidden flex flex-col max-h-[80vh] animate-scaleIn"
        style={{ boxShadow: 'var(--shadow-2xl)' }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border-color)] flex items-center gap-3">
          <button onClick={onClose} className="p-2 -ml-2 rounded-xl hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all duration-200">
            <X size={23} />
          </button>
          <h2 className="text-base font-semibold text-[var(--text-primary)] flex-1">Forward to...</h2>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-[var(--border-color)]">
          <div className="relative group">
            <Search size={26} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] transition-colors group-focus-within:text-[var(--emerald)]" />
            <input
              type="text"
              placeholder="Search chats"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[var(--bg-secondary)] text-[var(--text-primary)] pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]/30 focus:bg-[var(--bg-primary)] border border-transparent focus:border-[var(--emerald)]/20 transition-all duration-200"
            />
          </div>
        </div>

        {/* Chat list */}
        <div className="p-2 overflow-y-auto flex-1 h-[300px] scrollbar-thin">
          {filteredChats.length === 0 ? (
            <div className="p-6 text-center text-sm text-[var(--text-muted)]">No chats found</div>
          ) : (
            filteredChats.map(chat => {
              const name = chat.is_group ? chat.group_name : chat.other_user?.display_name;
              const img = chat.is_group ? chat.group_icon_url : chat.other_user?.avatar_url;
              const isSelected = selectedChatIds.includes(chat.id);

              return (
                <button
                  key={chat.id}
                  onClick={() => toggleSelect(chat.id)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-[var(--bg-hover)] rounded-xl transition-all duration-200 text-left"
                >
                  <div className="relative">
                    <Avatar src={img} name={name || '?'} size="lg" />
                    {isSelected && (
                      <div 
                        className="absolute -bottom-1 -right-1 w-5 h-5 bg-[var(--emerald)] rounded-full flex items-center justify-center border-2 border-[var(--bg-primary)]"
                        style={{ boxShadow: '0 0 6px rgba(22, 163, 74, 0.3)' }}
                      >
                        <Check size={16} className="text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--text-primary)] truncate text-sm">{name}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Forward action bar */}
        {selectedChatIds.length > 0 && (
          <div className="p-4 glass-header border-t border-[var(--border-color)] flex justify-between items-center animate-slideUp">
            <span className="text-sm text-[var(--text-muted)]">{selectedChatIds.length} chat{selectedChatIds.length !== 1 ? 's' : ''} selected</span>
            <button
              onClick={handleForward}
              disabled={isSending}
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white transition-all duration-200 disabled:opacity-50 active:scale-95 hover:-translate-y-[1px] bg-[var(--emerald)]"
              style={{
                boxShadow: '0 4px 14px rgba(22, 163, 74, 0.25)',
              }}
            >
              <Send size={23} className={isSending ? "animate-pulse" : ""} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
