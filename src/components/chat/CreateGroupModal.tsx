// ============================================================
// CreateGroupModal — Premium group creation modal
// ============================================================
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import SearchInput from '@/components/ui/SearchInput';
import Spinner from '@/components/ui/Spinner';
import { useChatStore } from '@/store/chat-store';
import { useAuthStore } from '@/store/auth-store';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Profile } from '@/types';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateGroupModal({ isOpen, onClose }: CreateGroupModalProps) {
  const router = useRouter();
  const { createGroupChat } = useChatStore();
  const { profile } = useAuthStore();

  const [step, setStep] = useState<'select' | 'details'>('select');
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setStep('select');
      setGroupName('');
      setGroupDescription('');
      setSelectedIds([]);
      setSearchQuery('');
      return;
    }

    const loadUsers = async () => {
      setIsLoading(true);
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', profile?.id || '')
        .order('display_name');
      setUsers((data as Profile[]) || []);
      setIsLoading(false);
    };
    loadUsers();
  }, [isOpen, profile?.id]);

  const toggleUser = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const filteredUsers = users.filter((u) =>
    u.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = async () => {
    if (!groupName.trim() || selectedIds.length === 0) return;
    setIsCreating(true);

    const chatId = await createGroupChat(groupName.trim(), selectedIds, groupDescription.trim());

    setIsCreating(false);
    if (chatId) {
      onClose();
      router.push(`/${chatId}`);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={step === 'select' ? 'Add group members' : 'New group'}>
      {step === 'select' ? (
        <>
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search contacts"
            className="mb-4"
          />

          {/* Selected chips */}
          {selectedIds.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedIds.map((id) => {
                const u = users.find((x) => x.id === id);
                return (
                  <button
                    key={id}
                    onClick={() => toggleUser(id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--emerald)]/10 rounded-full text-[14px] text-[var(--emerald)] font-medium hover:bg-[var(--emerald)]/20 transition-colors"
                  >
                    <span className="truncate max-w-[100px]">{u?.display_name || 'User'}</span>
                    <span className="text-[10px] opacity-60">✕</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="max-h-60 overflow-y-auto scrollbar-thin -mx-2">
            {isLoading ? (
              <Spinner className="my-8" />
            ) : (
              filteredUsers.map((user) => {
                const isSelected = selectedIds.includes(user.id);
                return (
                  <button
                    key={user.id}
                    onClick={() => toggleUser(user.id)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[var(--bg-hover)] transition-all duration-200"
                  >
                    <Avatar src={user.avatar_url} name={user.display_name} size="md" />
                    <div className="flex-1 text-left">
                      <p className="text-[14px] font-medium text-[var(--text-primary)] truncate">{user.display_name}</p>
                      <p className="text-[14px] text-[var(--text-muted)]">{user.bio || 'Hey there!'}</p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                        isSelected
                          ? 'bg-[var(--emerald)] border-[var(--emerald)]'
                          : 'border-[var(--text-muted)]/40'
                      }`}
                    >
                      {isSelected && <Check size={16} className="text-white" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="mt-5 flex justify-end">
            <Button
              onClick={() => setStep('details')}
              disabled={selectedIds.length === 0}
            >
              Next
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-5">
            <div>
              <label className="block text-[14px] font-medium text-[var(--text-primary)] mb-2">
                Group name
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name"
                className="w-full px-4 py-3 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]/30 focus:bg-[var(--bg-primary)] border border-transparent focus:border-[var(--emerald)]/20 transition-all duration-200"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[var(--text-primary)] mb-2">
                Description (optional)
              </label>
              <textarea
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="What is this group about?"
                rows={2}
                className="w-full px-4 py-3 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]/30 focus:bg-[var(--bg-primary)] border border-transparent focus:border-[var(--emerald)]/20 resize-none transition-all duration-200"
              />
            </div>
            <p className="text-[14px] text-[var(--text-muted)]">
              {selectedIds.length} participant{selectedIds.length !== 1 ? 's' : ''} selected
            </p>
          </div>

          <div className="mt-5 flex justify-between">
            <Button variant="ghost" onClick={() => setStep('select')}>
              Back
            </Button>
            <Button onClick={handleCreate} isLoading={isCreating} disabled={!groupName.trim()}>
              Create Group
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
