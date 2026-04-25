// ProfileEditor — Premium profile editor with cover + avatar
'use client';

import { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, X } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { useAuthStore } from '@/store/auth-store';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

export default function ProfileEditor() {
  const { profile, updateProfile } = useAuthStore();
  const [displayName, setDisplayName] = useState(profile?.display_name === 'User' ? '' : (profile?.display_name || ''));
  const [bio, setBio] = useState(profile?.bio === 'Hey there! I am using WhatsApp.' ? 'Hey there! I am using Tekyel.' : (profile?.bio || ''));
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    const supabase = getSupabaseBrowserClient();
    const fileName = `avatars/${profile?.id}-${Date.now()}.${file.name.split('.').pop()}`;

    const { data, error } = await supabase.storage
      .from('chat-media')
      .upload(fileName, file, { cacheControl: '3600', upsert: true });

    if (error) {
      console.error('Storage error:', error);
      toast.error(`Upload failed: ${error.message || 'Unknown error'}`);
      setIsUploadingAvatar(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('chat-media')
      .getPublicUrl(data.path);

    await updateProfile({ avatar_url: urlData.publicUrl });
    toast.success('Photo updated!');
    setIsUploadingAvatar(false);
    e.target.value = '';
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCover(true);
    const supabase = getSupabaseBrowserClient();
    const fileName = `covers/${profile?.id}-${Date.now()}.${file.name.split('.').pop()}`;

    const { data, error } = await supabase.storage
      .from('chat-media')
      .upload(fileName, file, { cacheControl: '3600', upsert: true });

    if (error) {
      console.error('Storage error:', error);
      toast.error(`Cover upload failed: ${error.message || 'Unknown error'}`);
      setIsUploadingCover(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('chat-media')
      .getPublicUrl(data.path);

    await updateProfile({ cover_url: urlData.publicUrl });
    toast.success('Cover photo updated!');
    setIsUploadingCover(false);
    e.target.value = '';
  };

  const handleRemoveCover = async () => {
    await updateProfile({ cover_url: null });
    toast.success('Cover photo removed');
  };

  const handleSave = async () => {
    setIsSaving(true);
    await updateProfile({
      display_name: displayName.trim() || 'User',
      bio: bio.trim(),
    });
    setIsSaving(false);
    toast.success('Profile updated!');
  };

  return (
    <div className="space-y-6">
      {/* Hidden file inputs */}
      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
      <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />

      {/* Cover Image */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
          Cover Photo
        </label>
        <div 
          className="relative w-full h-32 rounded-xl overflow-hidden cursor-pointer group border border-[var(--border-color)]"
          onClick={() => !isUploadingCover && coverInputRef.current?.click()}
        >
          {profile?.cover_url ? (
            <img src={profile.cover_url} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div 
              className="w-full h-full flex flex-col items-center justify-center gap-2 bg-[var(--emerald-dark,#15803D)]"
            >
              <ImageIcon size={28} className="text-white/30" />
              <span className="text-white/40 text-sm">Click to add cover photo</span>
            </div>
          )}

          {/* Hover overlay */}
          {!isUploadingCover && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
              <Camera size={28} className="text-white" />
            </div>
          )}

          {/* Uploading overlay */}
          {isUploadingCover && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Spinner size="md" />
            </div>
          )}

          {/* Remove cover button */}
          {profile?.cover_url && !isUploadingCover && (
            <button
              onClick={(e) => { e.stopPropagation(); handleRemoveCover(); }}
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 p-1.5 rounded-full text-white transition-all opacity-0 group-hover:opacity-100"
            >
              <X size={26} />
            </button>
          )}
        </div>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center">
        <div className="relative cursor-pointer group" onClick={() => !isUploadingAvatar && avatarInputRef.current?.click()}>
          <div className="p-1 rounded-full bg-[var(--emerald-dark,#15803D)]">
            <div className="rounded-full bg-[var(--bg-primary)] p-0.5">
              <Avatar
                src={profile?.avatar_url}
                name={profile?.display_name || 'User'}
                size="xl"
                className={isUploadingAvatar ? 'opacity-50' : ''}
              />
            </div>
          </div>
          {isUploadingAvatar && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Spinner size="md" />
            </div>
          )}
          {!isUploadingAvatar && (
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
              <Camera size={28} className="text-white" />
            </div>
          )}
        </div>
        <p className="text-sm text-[var(--text-muted)] mt-3">Click to change photo</p>
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
          Your name
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Enter your name"
          maxLength={50}
          className="w-full px-4 py-3 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]/30 focus:bg-[var(--bg-primary)] border border-transparent focus:border-[var(--emerald)]/20 transition-all duration-200"
        />
      </div>

      {/* Bio */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
          About
        </label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Write something about yourself..."
          rows={3}
          maxLength={200}
          className="w-full px-4 py-3 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]/30 focus:bg-[var(--bg-primary)] border border-transparent focus:border-[var(--emerald)]/20 resize-none transition-all duration-200"
        />
        <p className={`text-sm mt-1.5 text-right transition-colors ${bio.length > 180 ? 'text-[var(--gold)]' : 'text-[var(--text-muted)]'}`}>
          {bio.length}/200
        </p>
      </div>

      {/* Email/Phone info */}
      <div className="space-y-3 pt-2">
        {profile?.email && (
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider">Email</label>
            <p className="text-sm text-[var(--text-primary)]">{profile.email}</p>
          </div>
        )}
        {profile?.phone && (
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider">Phone</label>
            <p className="text-sm text-[var(--text-primary)]">{profile.phone}</p>
          </div>
        )}
      </div>

      <Button onClick={handleSave} isLoading={isSaving} className="w-full" size="lg">
        Save Changes
      </Button>
    </div>
  );
}

