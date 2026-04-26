// FollowersModal — Shows list of followers for a profile
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, MessageSquare, UserCheck, UserPlus } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import Spinner from '@/components/ui/Spinner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/auth-store';
import { useChatStore } from '@/store/chat-store';
import toast from 'react-hot-toast';

interface FollowerProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
}

interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: string;
  followerCount: number;
}

export default function FollowersModal({ isOpen, onClose, profileId, followerCount }: FollowersModalProps) {
  const router = useRouter();
  const { profile: currentUser } = useAuthStore();
  const { startDirectChat } = useChatStore();
  const supabase = getSupabaseBrowserClient();

  const [followers, setFollowers] = useState<FollowerProfile[]>([]);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchFollowers = async () => {
      // Try to load from cache first
      const cacheKey = `followers-list-${profileId}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.followers) setFollowers(parsed.followers);
          if (parsed.followingMap) setFollowingMap(parsed.followingMap);
          setIsLoading(false);
        } catch (e) {
          console.error('Failed to parse cached followers data', e);
        }
      }

      if (!cached) {
        setIsLoading(true);
      }

      // Get all follower records for this profile
      await supabase.auth.getSession();
      const { data: followRows, error } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', profileId);

      if (error) {
        console.warn('Network offline or Failed to fetch followers, relying on cache if available:', error);
        setIsLoading(false);
        return;
      }

      if (!followRows || followRows.length === 0) {
        setFollowers([]);
        localStorage.setItem(cacheKey, JSON.stringify({ followers: [], followingMap: {} }));
        setIsLoading(false);
        return;
      }

      const followerIds = followRows.map(r => r.follower_id);

      // Fetch their profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, bio')
        .in('id', followerIds);

      const fetchedFollowers = (profiles as FollowerProfile[]) || [];
      
      let fetchedFollowingMap: Record<string, boolean> = {};

      // Check which of these followers the current user is following back
      if (currentUser) {
        const { data: myFollows } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', currentUser.id)
          .in('following_id', followerIds);

        (myFollows || []).forEach(f => { fetchedFollowingMap[f.following_id] = true; });
      }

      // Update state and cache only after full fetch succeeds
      setFollowers(fetchedFollowers);
      setFollowingMap(fetchedFollowingMap);
      
      localStorage.setItem(cacheKey, JSON.stringify({
        followers: fetchedFollowers,
        followingMap: fetchedFollowingMap
      }));

      setIsLoading(false);
    };

    fetchFollowers();
  }, [isOpen, profileId, currentUser, supabase]);

  const toggleFollow = async (userId: string) => {
    if (!currentUser || togglingId) return;
    setTogglingId(userId);

    // Refresh session to ensure RLS policies work
    await supabase.auth.getSession();

    if (followingMap[userId]) {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUser.id)
        .eq('following_id', userId);

      if (!error) {
        setFollowingMap(prev => ({ ...prev, [userId]: false }));
        toast.success('Unfollowed');
      } else {
        console.error('Unfollow error:', error);
        toast.error(`Failed to unfollow: ${error.message}`);
      }
    } else {
      // Use upsert to prevent duplicate-key errors when follow state is stale
      const { error } = await supabase
        .from('follows')
        .upsert(
          { follower_id: currentUser.id, following_id: userId },
          { onConflict: 'follower_id,following_id' }
        );

      if (!error) {
        setFollowingMap(prev => ({ ...prev, [userId]: true }));
        toast.success('Following!');
      } else {
        console.error('Follow error:', error);
        toast.error(`Failed to follow: ${error.message}`);
      }
    }
    setTogglingId(null);
  };

  const handleMessage = async (userId: string) => {
    const chatId = await startDirectChat(userId);
    if (chatId) {
      onClose();
      router.push(`/${chatId}`);
    }
  };

  const handleProfileClick = (userId: string) => {
    onClose();
    router.push(`/profile/${userId}`);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Followers · ${followerCount}`} maxWidth="max-w-sm">
      <div className="max-h-[400px] overflow-y-auto -mx-2 scrollbar-thin">
        {isLoading ? (
          <Spinner className="my-12" />
        ) : followers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-secondary)] flex items-center justify-center mb-4">
              <Users size={32} className="opacity-30 text-[var(--text-muted)]" />
            </div>
            <p className="text-sm font-medium text-[var(--text-secondary)]">No followers yet</p>
            <p className="text-sm mt-1.5 text-[var(--text-muted)]">Share your profile to get started</p>
          </div>
        ) : (
          <div className="space-y-1">
            {followers.map(follower => {
              const isMe = follower.id === currentUser?.id;
              const amFollowing = followingMap[follower.id];

              return (
                <div
                  key={follower.id}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[var(--bg-hover)] transition-all duration-200 group"
                >
                  {/* Avatar + Info — clickable to go to their profile */}
                  <button
                    onClick={() => handleProfileClick(follower.id)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    <Avatar src={follower.avatar_url} name={follower.display_name} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[var(--text-primary)] truncate group-hover:text-[var(--emerald)] transition-colors">
                        {follower.display_name}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] truncate leading-snug mt-0.5">
                        {follower.bio || 'Hey there! 👋'}
                      </p>
                    </div>
                  </button>

                  {/* Action buttons (don't show for self) */}
                  {!isMe && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleMessage(follower.id)}
                        className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--emerald)] transition-all duration-200"
                        title="Message"
                      >
                        <MessageSquare size={18} />
                      </button>
                      <button
                        onClick={() => toggleFollow(follower.id)}
                        disabled={togglingId === follower.id}
                        className={`p-2 rounded-lg transition-all duration-200 ${
                          amFollowing
                            ? 'text-[var(--emerald)] hover:bg-[var(--emerald)]/10'
                            : 'text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                        } ${togglingId === follower.id ? 'opacity-50' : ''}`}
                        title={amFollowing ? 'Following' : 'Follow back'}
                      >
                        {amFollowing ? <UserCheck size={18} /> : <UserPlus size={18} />}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
