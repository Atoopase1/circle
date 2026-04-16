// ============================================================
// ProfileViewPage — LinkedIn-style profile with cover & avatar upload
// ============================================================
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Settings, Pencil, Camera, UserCheck, UserPlus, Image as ImageIcon, MessageSquare, Bell } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import ImageViewerModal from '@/components/ui/ImageViewerModal';
import NotificationPanel from '@/components/ui/NotificationPanel';
import StatusCard from '@/components/status/StatusCard';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/auth-store';
import { useChatStore } from '@/store/chat-store';
import { useNotificationStore } from '@/store/notification-store';
import toast from 'react-hot-toast';

export default function ProfileViewPage() {
  const params = useParams();
  const router = useRouter();
  const profileId = params.id as string;
  const { profile: currentUser, updateProfile } = useAuthStore();
  const { startDirectChat } = useChatStore();
  const supabase = getSupabaseBrowserClient();

  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [author, setAuthor] = useState<any>(null);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  
  const [followerCount, setFollowerCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [relationship, setRelationship] = useState<string | null>(null);
  const [showAvatarViewer, setShowAvatarViewer] = useState(false);

  const addNotification = useNotificationStore(s => s.addNotification);

  const isMe = currentUser?.id === profileId;

  useEffect(() => {
    const loadProfileData = async () => {
      setIsLoading(true);

      // Load Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();
      
      if (profileData) setAuthor(profileData);

      // Load statuses
      const { data: statusData } = await supabase
        .from('statuses')
        .select('*, profiles!statuses_user_id_fkey(*)')
        .eq('user_id', profileId)
        .order('created_at', { ascending: false });
      
      if (statusData) setStatuses(statusData);

      // Load Followers Count
      const { count } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', profileId);
      
      setFollowerCount(count || 0);

      // Check following status
      if (currentUser) {
        const { data: followData } = await supabase
          .from('follows')
          .select('*')
          .eq('follower_id', currentUser.id)
          .eq('following_id', profileId)
          .single();
        
        setIsFollowing(!!followData);

        // Check relationship status
        const { data: contactData } = await supabase
          .from('contacts')
          .select('category')
          .eq('user_id', currentUser.id)
          .eq('contact_id', profileId)
          .single();
        
        if (contactData) setRelationship(contactData.category);
      }

      setIsLoading(false);
    };

    loadProfileData();
  }, [profileId, currentUser, supabase]);

  // Keep author in sync with currentUser profile changes (for own profile)
  useEffect(() => {
    if (isMe && currentUser) {
      setAuthor((prev: any) => prev ? { ...prev, avatar_url: currentUser.avatar_url, cover_url: currentUser.cover_url, display_name: currentUser.display_name, bio: currentUser.bio } : prev);
    }
  }, [currentUser, isMe]);

  // ── Real-time subscription for followed users' new statuses ──
  useEffect(() => {
    if (!currentUser) return;

    // Subscribe to new statuses from ANY user (we'll filter by follows client-side)
    const channel = supabase
      .channel('followed-posts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'statuses' },
        async (payload) => {
          const newStatus = payload.new as any;
          // Don't notify about own posts
          if (newStatus.user_id === currentUser.id) return;

          // Check if we follow this user
          const { data: followCheck } = await supabase
            .from('follows')
            .select('id')
            .eq('follower_id', currentUser.id)
            .eq('following_id', newStatus.user_id)
            .single();

          if (!followCheck) return;

          // Get the poster's profile
          const { data: poster } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('id', newStatus.user_id)
            .single();

          if (poster) {
            addNotification({
              userId: newStatus.user_id,
              userName: poster.display_name,
              userAvatar: poster.avatar_url,
              statusId: newStatus.id,
              preview: newStatus.content || (newStatus.media_url ? '📷 Shared a photo' : 'New post'),
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, supabase, addNotification]);

  const toggleFollow = async () => {
    if (!currentUser) return;
    
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', profileId);
      setIsFollowing(false);
      setFollowerCount(p => Math.max(0, p - 1));
      toast.success('Unfollowed');
    } else {
      await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: profileId });
      setIsFollowing(true);
      setFollowerCount(p => p + 1);
      toast.success('Following!');
    }
  };

  const handleMessage = async () => {
    const chatId = await startDirectChat(profileId);
    if (chatId) router.push(`/${chatId}`);
  };
  
  const handleEditProfile = () => {
    router.push('/settings');
  };

  // ── Cover Image Upload ──
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    setIsUploadingCover(true);
    const fileName = `covers/${currentUser.id}-${Date.now()}.${file.name.split('.').pop()}`;

    const { data, error } = await supabase.storage
      .from('chat-media')
      .upload(fileName, file, { cacheControl: '3600', upsert: true });

    if (error) {
      toast.error(`Cover upload failed: ${error.message}`);
      setIsUploadingCover(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('chat-media').getPublicUrl(data.path);
    await updateProfile({ cover_url: urlData.publicUrl });
    setAuthor((prev: any) => ({ ...prev, cover_url: urlData.publicUrl }));
    toast.success('Cover photo updated!');
    setIsUploadingCover(false);
    // Reset the input so re-selecting the same file still triggers onChange
    e.target.value = '';
  };

  // ── Avatar Image Upload ──
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    setIsUploadingAvatar(true);
    const fileName = `avatars/${currentUser.id}-${Date.now()}.${file.name.split('.').pop()}`;

    const { data, error } = await supabase.storage
      .from('chat-media')
      .upload(fileName, file, { cacheControl: '3600', upsert: true });

    if (error) {
      toast.error(`Avatar upload failed: ${error.message}`);
      setIsUploadingAvatar(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('chat-media').getPublicUrl(data.path);
    await updateProfile({ avatar_url: urlData.publicUrl });
    setAuthor((prev: any) => ({ ...prev, avatar_url: urlData.publicUrl }));
    toast.success('Profile photo updated!');
    setIsUploadingAvatar(false);
    e.target.value = '';
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex justify-center items-center bg-[var(--bg-app)]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!author) {
    return (
      <div className="flex-1 flex justify-center items-center bg-[var(--bg-app)] text-[var(--text-primary)]">
        User not found.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-app)] w-full h-full relative">
      
      {/* Hidden file inputs */}
      <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />

      {/* Header bar (Pinned) */}
      <div className="glass-header w-full flex-shrink-0 z-20 flex items-center justify-between px-5 py-3 border-b border-[var(--border-color)]">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all duration-200">
          <ArrowLeft size={26} />
        </button>
        
        <h1 className="text-[15px] font-semibold text-[var(--text-primary)] truncate max-w-[200px]">{author.display_name}</h1>

        <div className="flex items-center gap-1">
          {isMe ? (
            <button onClick={handleEditProfile} className="p-2 rounded-xl hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all duration-200">
              <Settings size={26} />
            </button>
          ) : (
            <div className="w-9" />
          )}
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden relative h-full w-full pb-10">
        {/* ── Cover / Banner ── */}
        <div className="relative w-full h-44 sm:h-60 bg-[var(--bg-secondary)] overflow-hidden">
          {author.cover_url ? (
            <img src={author.cover_url} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[var(--emerald-dark,#15803D)]">
              <ImageIcon size={48} className="text-white opacity-10" />
            </div>
          )}

          {/* Uploading overlay */}
          {isUploadingCover && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
              <Spinner size="lg" />
            </div>
          )}

          {/* Cover edit button (own profile) */}
          {isMe && !isUploadingCover && (
            <button
              onClick={() => coverInputRef.current?.click()}
              className="absolute right-4 bottom-4 bg-black/40 hover:bg-black/60 backdrop-blur-md px-3.5 py-2 rounded-full text-white transition-all border border-white/15 flex items-center gap-2 text-[13px] font-medium shadow-lg"
            >
              <Camera size={26} />
              <span className="hidden sm:inline">Edit cover</span>
            </button>
          )}
        </div>

        {/* ── Profile body ── */}
        <div className="relative max-w-4xl mx-auto w-full px-4 sm:px-8">
          
          {/* Avatar overlapping banner — LinkedIn style */}
          <div className="relative flex justify-between items-end mt-[-56px] sm:mt-[-72px] mb-4">
            <div className="relative z-10">
              <div
                className="rounded-full border-[5px] border-[var(--bg-app)] inline-block cursor-pointer group"
                onClick={() => author?.avatar_url && setShowAvatarViewer(true)}
              >
                <div className="relative">
                  <Avatar src={author.avatar_url} name={author.display_name} size="xxl" className={isUploadingAvatar ? 'opacity-50' : ''} />
                  
                  {/* Camera overlay on own avatar */}
                  {isMe && !isUploadingAvatar && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        avatarInputRef.current?.click();
                      }}
                      className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 w-full h-full"
                    >
                      <Camera size={28} className="text-white" />
                    </button>
                  )}

                  {/* Uploading spinner */}
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 rounded-full flex items-center justify-center">
                      <Spinner size="md" />
                    </div>
                  )}
                </div>
              </div>

              {/* Small pencil badge on avatar */}
              {isMe && (
                <button 
                  onClick={() => !isUploadingAvatar && avatarInputRef.current?.click()}
                  className="absolute bottom-1 right-1 bg-[var(--wa-green)] hover:bg-[var(--wa-green-dark)] p-1.5 rounded-full text-white transition-all shadow-lg border-2 border-[var(--bg-app)]"
                >
                  <Pencil size={16} />
                </button>
              )}
            </div>
            
            {/* Actions */}
            {!isMe && (
              <div className="flex gap-2 mb-2">
                <Button variant={isFollowing ? 'secondary' : 'primary'} onClick={toggleFollow} size="sm">
                  {isFollowing ? <><UserCheck size={23} className="mr-1.5" /> Following</> : <><UserPlus size={23} className="mr-1.5" /> Follow</>}
                </Button>
                <Button variant="secondary" onClick={handleMessage} size="sm">
                  <MessageSquare size={23} className="mr-1.5" /> Message
                </Button>
              </div>
            )}
          </div>

          {/* Info card */}
          <div className="surface-card p-6 mb-8 relative">
            {isMe && (
              <button 
                onClick={handleEditProfile}
                className="absolute right-5 top-5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <Pencil size={26} />
              </button>
            )}

            <h2 className="text-[22px] font-bold text-[var(--text-primary)] flex items-center gap-2.5 mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
              {author.display_name}
              {relationship && (
                <span className={`text-[10px] uppercase px-2.5 py-0.5 rounded-full font-bold ${
                  relationship === 'family' 
                    ? 'bg-[var(--gold)]/10 text-[var(--gold)]' 
                    : 'bg-[var(--emerald)]/10 text-[var(--emerald)]'
                }`}>
                  {relationship}
                </span>
              )}
            </h2>
            <p className="text-[var(--text-muted)] text-[14px] mb-6 leading-relaxed">
              {author.bio || 'No bio available.'}
            </p>

            <div className="flex items-center gap-10 border-t border-[var(--border-color)] pt-5">
              <div className="flex flex-col">
                <span className="font-bold text-[20px] text-[var(--text-primary)]">{followerCount}</span>
                <span className="text-[14px] text-[var(--text-muted)] font-medium uppercase tracking-wider">Followers</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-[20px] text-[var(--text-primary)]">{statuses.length}</span>
                <span className="text-[14px] text-[var(--text-muted)] font-medium uppercase tracking-wider">Posts</span>
              </div>
            </div>
          </div>

          {/* Activity timeline */}
          <h3 className="text-[14px] font-semibold text-[var(--text-muted)] uppercase tracking-widest px-1 mb-4 flex items-center gap-2">
            Activity Timeline
          </h3>
          {statuses.length === 0 ? (
            <div className="text-center p-12 surface-card mb-20">
              <p className="text-[var(--text-muted)] text-[14px]">No posts shared yet.</p>
            </div>
          ) : (
            <div className="space-y-4 mb-20">
              {statuses.map(status => (
                <div key={status.id} className="opacity-90 hover:opacity-100 transition-opacity">
                  <StatusCard status={{...status, visibility: 'public'}} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ImageViewerModal 
        isOpen={showAvatarViewer} 
        onClose={() => setShowAvatarViewer(false)} 
        src={author.avatar_url} 
      />
    </div>
  );
}
