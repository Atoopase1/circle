// ============================================================
// GroupInfoPanel — Full admin management panel
// ============================================================
'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Camera, Pencil, Check, UserPlus, Shield, ShieldOff, UserMinus, LogOut, Lock, MoreVertical, Search } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Toggle from '@/components/ui/Toggle';
import Spinner from '@/components/ui/Spinner';
import { useAuthStore } from '@/store/auth-store';
import { useChatStore } from '@/store/chat-store';
import { usePresenceStore } from '@/store/presence-store';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import type { ChatWithDetails, Profile } from '@/types';

interface GroupInfoPanelProps {
  chat: ChatWithDetails;
  isOpen: boolean;
  onClose: () => void;
}

export default function GroupInfoPanel({ chat, isOpen, onClose }: GroupInfoPanelProps) {
  const user = useAuthStore((s) => s.user);
  const isUserOnline = usePresenceStore((s) => s.isUserOnline);
  const {
    updateGroupSettings,
    removeGroupMember,
    setMemberRole,
    addGroupMembers,
    leaveGroup,
  } = useChatStore();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [memberMenuId, setMemberMenuId] = useState<string | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const iconInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const isAdmin = chat.participants.some(
    (p) => p.user_id === user?.id && p.role === 'admin'
  );

  const handleStartEdit = () => {
    setEditName(chat.group_name || '');
    setEditDescription(chat.group_description || '');
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    await updateGroupSettings(chat.id, {
      name: editName.trim() || 'Group',
      description: editDescription.trim(),
    });
    setIsSaving(false);
    setIsEditingProfile(false);
    toast.success('Group updated!');
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingIcon(true);
    const supabase = getSupabaseBrowserClient();
    const fileName = `group-icons/${chat.id}-${Date.now()}.${file.name.split('.').pop()}`;

    const { data, error } = await supabase.storage
      .from('chat-media')
      .upload(fileName, file, { cacheControl: '3600', upsert: true });

    if (error) {
      toast.error(`Upload failed: ${error.message}`);
      setIsUploadingIcon(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('chat-media')
      .getPublicUrl(data.path);

    await updateGroupSettings(chat.id, { iconUrl: urlData.publicUrl });
    toast.success('Group photo updated!');
    setIsUploadingIcon(false);
    e.target.value = '';
  };

  const handleToggleAdminOnly = async (checked: boolean) => {
    await updateGroupSettings(chat.id, { adminOnlyMessages: checked });
    toast.success(checked ? 'Only admins can send messages now' : 'All members can send messages now');
  };

  const handleRemoveMember = async (userId: string) => {
    setMemberMenuId(null);
    await removeGroupMember(chat.id, userId);
    toast.success('Member removed');
  };

  const handleToggleRole = async (userId: string, currentRole: string) => {
    setMemberMenuId(null);
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    await setMemberRole(chat.id, userId, newRole);
    toast.success(newRole === 'admin' ? 'Promoted to admin' : 'Removed as admin');
  };

  const handleLeaveGroup = async () => {
    setShowLeaveConfirm(false);
    onClose();
    await leaveGroup(chat.id);
    toast.success('You left the group');
  };

  // Sort: admins first, then members
  const sortedParticipants = [...chat.participants].sort((a, b) => {
    if (a.role === 'admin' && b.role !== 'admin') return -1;
    if (a.role !== 'admin' && b.role === 'admin') return 1;
    return 0;
  });

  return (
    <div className="w-80 h-full bg-[var(--bg-primary)] border-l border-[var(--border-color)] flex flex-col animate-slideInRight">
      {/* Hidden file input */}
      <input ref={iconInputRef} type="file" accept="image/*" className="hidden" onChange={handleIconUpload} />

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 glass-header border-b border-[var(--border-color)] shrink-0">
        <button
          onClick={onClose}
          className="p-2 rounded-xl hover:bg-[var(--bg-hover)] transition-all duration-200 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <X size={23} />
        </button>
        <h2 className="font-semibold text-[var(--text-primary)] text-[15px]">Group info</h2>
        {isAdmin && !isEditingProfile && (
          <button
            onClick={handleStartEdit}
            className="ml-auto p-2 rounded-xl hover:bg-[var(--bg-hover)] transition-all duration-200 text-[var(--text-muted)] hover:text-[var(--emerald)]"
            title="Edit group"
          >
            <Pencil size={18} />
          </button>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* Group Profile */}
        <div className="flex flex-col items-center py-8 px-5 border-b border-[var(--border-color)]">
          {/* Group Icon */}
          <div className="relative">
            <div className="p-1 rounded-full" style={{ background: 'var(--emerald)' }}>
              <div className="rounded-full bg-[var(--bg-primary)] p-0.5">
                <Avatar
                  src={chat.group_icon_url}
                  name={chat.group_name || 'Group'}
                  size="xl"
                  className={isUploadingIcon ? 'opacity-50' : ''}
                />
              </div>
            </div>
            {isUploadingIcon && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Spinner size="md" />
              </div>
            )}
            {isAdmin && (
              <button
                onClick={() => iconInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 bg-[var(--emerald)] rounded-full flex items-center justify-center text-white shadow-lg hover:bg-[var(--emerald-light,#22c55e)] transition-all hover:scale-110 active:scale-95"
                title="Change group photo"
              >
                <Camera size={15} />
              </button>
            )}
          </div>

          {/* Name / Description */}
          {isEditingProfile ? (
            <div className="w-full mt-4 space-y-3">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Group name"
                maxLength={50}
                className="w-full px-4 py-2.5 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]/30 border border-transparent focus:border-[var(--emerald)]/20 text-center transition-all duration-200"
                autoFocus
              />
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Group description (optional)"
                rows={2}
                maxLength={200}
                className="w-full px-4 py-2.5 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]/30 border border-transparent focus:border-[var(--emerald)]/20 resize-none text-center transition-all duration-200"
              />
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1"
                  onClick={() => setIsEditingProfile(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleSaveProfile}
                  isLoading={isSaving}
                >
                  <Check size={15} className="mr-1" /> Save
                </Button>
              </div>
            </div>
          ) : (
            <>
              <h3
                className="mt-4 text-[18px] font-semibold text-[var(--text-primary)] truncate w-full text-center px-4"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
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
            </>
          )}
        </div>

        {/* Group Settings (admin only) */}
        {isAdmin && (
          <div className="px-5 py-4 border-b border-[var(--border-color)] space-y-4">
            <p className="text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-widest">
              Group Settings
            </p>

            <Toggle
              checked={chat.admin_only_messages ?? false}
              onChange={handleToggleAdminOnly}
              label="Only admins can send messages"
              description="Restrict messaging to admins only"
            />
          </div>
        )}

        {/* Non-admin notice if admin_only is on */}
        {!isAdmin && chat.admin_only_messages && (
          <div className="px-5 py-4 border-b border-[var(--border-color)]">
            <div className="flex items-center gap-3 p-3 bg-[var(--gold)]/10 rounded-xl border border-[var(--gold)]/20">
              <Lock size={18} className="text-[var(--gold)] shrink-0" />
              <p className="text-[13px] text-[var(--gold)] leading-relaxed">
                Only admins can send messages in this group.
              </p>
            </div>
          </div>
        )}

        {/* Participants */}
        <div className="py-4">
          <div className="flex items-center justify-between px-5 mb-3">
            <p className="text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-widest">
              {chat.participants.length} Participants
            </p>
            {isAdmin && (
              <button
                onClick={() => setShowAddMembers(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-[var(--emerald)] hover:bg-[var(--emerald)]/10 transition-all duration-200"
              >
                <UserPlus size={15} />
                Add
              </button>
            )}
          </div>

          {sortedParticipants.map((p) => (
            <div
              key={p.user_id}
              className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--bg-hover)] transition-all duration-200 group relative"
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
                <p className="text-[12px] text-[var(--text-muted)] truncate mt-0.5">
                  {p.profile?.bio || 'Hey there!'}
                </p>
              </div>

              {/* Admin actions (3-dot menu for other members) */}
              {isAdmin && p.user_id !== user?.id && (
                <div className="relative">
                  <button
                    onClick={() => setMemberMenuId(memberMenuId === p.user_id ? null : p.user_id)}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] opacity-0 group-hover:opacity-100 transition-all duration-200"
                  >
                    <MoreVertical size={16} />
                  </button>

                  {/* Context menu */}
                  {memberMenuId === p.user_id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setMemberMenuId(null)} />
                      <div
                        className="absolute right-0 top-8 z-50 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] py-1.5 min-w-[180px] animate-scaleIn origin-top-right"
                        style={{ boxShadow: 'var(--shadow-xl)' }}
                      >
                        <button
                          onClick={() => handleToggleRole(p.user_id, p.role)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--bg-hover)] transition-all text-[13px] text-[var(--text-primary)]"
                        >
                          {p.role === 'admin' ? (
                            <>
                              <ShieldOff size={16} className="text-[var(--gold)]" />
                              Remove as admin
                            </>
                          ) : (
                            <>
                              <Shield size={16} className="text-[var(--emerald)]" />
                              Make admin
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleRemoveMember(p.user_id)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-500/10 transition-all text-[13px] text-red-500"
                        >
                          <UserMinus size={16} />
                          Remove from group
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Leave Group */}
        <div className="px-5 py-4 border-t border-[var(--border-color)]">
          {showLeaveConfirm ? (
            <div className="space-y-3">
              <p className="text-[13px] text-[var(--text-secondary)] text-center">
                Are you sure you want to leave this group?
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="flex-1" onClick={() => setShowLeaveConfirm(false)}>
                  Cancel
                </Button>
                <Button variant="danger" size="sm" className="flex-1" onClick={handleLeaveGroup}>
                  <LogOut size={15} className="mr-1" /> Leave
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowLeaveConfirm(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-500/10 transition-all duration-200 text-[14px] font-medium"
            >
              <LogOut size={18} />
              Leave Group
            </button>
          )}
        </div>
      </div>

      {/* Add Members Overlay */}
      {showAddMembers && (
        <AddMembersOverlay
          chat={chat}
          onClose={() => setShowAddMembers(false)}
          onAdd={async (ids) => {
            await addGroupMembers(chat.id, ids);
            setShowAddMembers(false);
            toast.success(`${ids.length} member${ids.length > 1 ? 's' : ''} added`);
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// AddMembersOverlay — Inline member search/select overlay
// ============================================================
function AddMembersOverlay({
  chat,
  onClose,
  onAdd,
}: {
  chat: ChatWithDetails;
  onClose: () => void;
  onAdd: (ids: string[]) => Promise<void>;
}) {
  const { profile } = useAuthStore();
  const [users, setUsers] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  const existingUserIds = chat.participants.map((p) => p.user_id);

  useEffect(() => {
    const loadUsers = async () => {
      setIsLoading(true);
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('display_name');
      // Filter out self and existing members
      const available = ((data as Profile[]) || []).filter(
        (u) => u.id !== profile?.id && !existingUserIds.includes(u.id)
      );
      setUsers(available);
      setIsLoading(false);
    };
    loadUsers();
  }, []);

  const toggleUser = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const filtered = users.filter((u) =>
    u.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = async () => {
    if (selectedIds.length === 0) return;
    setIsAdding(true);
    await onAdd(selectedIds);
    setIsAdding(false);
  };

  return (
    <div className="absolute inset-0 bg-[var(--bg-primary)] z-50 flex flex-col animate-slideInRight">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 glass-header border-b border-[var(--border-color)] shrink-0">
        <button
          onClick={onClose}
          className="p-2 rounded-xl hover:bg-[var(--bg-hover)] transition-all duration-200 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <X size={23} />
        </button>
        <h2 className="font-semibold text-[var(--text-primary)] text-[15px]">Add Members</h2>
        {selectedIds.length > 0 && (
          <span className="ml-auto text-[12px] text-[var(--emerald)] font-semibold bg-[var(--emerald)]/10 px-2.5 py-1 rounded-full">
            {selectedIds.length} selected
          </span>
        )}
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-[var(--border-color)]">
        <div className="relative">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contacts"
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]/30 border border-transparent focus:border-[var(--emerald)]/20 transition-all duration-200"
            autoFocus
          />
        </div>
      </div>

      {/* Selected chips */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 py-2 border-b border-[var(--border-color)]">
          {selectedIds.map((id) => {
            const u = users.find((x) => x.id === id);
            return (
              <button
                key={id}
                onClick={() => toggleUser(id)}
                className="flex items-center gap-1 px-2.5 py-1 bg-[var(--emerald)]/10 rounded-full text-[12px] text-[var(--emerald)] font-medium hover:bg-[var(--emerald)]/20 transition-colors"
              >
                <span className="truncate max-w-[80px]">{u?.display_name || 'User'}</span>
                <span className="text-[10px] opacity-60">✕</span>
              </button>
            );
          })}
        </div>
      )}

      {/* User list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-[var(--text-muted)] text-[14px] py-12">
            {searchQuery ? 'No contacts found' : 'No contacts available to add'}
          </p>
        ) : (
          filtered.map((u) => {
            const isSelected = selectedIds.includes(u.id);
            return (
              <button
                key={u.id}
                onClick={() => toggleUser(u.id)}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-[var(--bg-hover)] transition-all duration-200"
              >
                <Avatar src={u.avatar_url} name={u.display_name} size="md" />
                <div className="flex-1 text-left min-w-0">
                  <p className="text-[14px] font-medium text-[var(--text-primary)] truncate">{u.display_name}</p>
                  <p className="text-[12px] text-[var(--text-muted)] truncate">{u.bio || 'Hey there!'}</p>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                    isSelected
                      ? 'bg-[var(--emerald)] border-[var(--emerald)]'
                      : 'border-[var(--text-muted)]/40'
                  }`}
                >
                  {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Add button */}
      <div className="px-5 py-4 border-t border-[var(--border-color)] shrink-0">
        <Button
          className="w-full"
          onClick={handleAdd}
          disabled={selectedIds.length === 0}
          isLoading={isAdding}
        >
          <UserPlus size={17} className="mr-2" />
          Add {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
        </Button>
      </div>
    </div>
  );
}
