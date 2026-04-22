import { useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/auth-store';
import { useNotificationStore } from '@/store/notification-store';
import toast from 'react-hot-toast';
import React from 'react';
import { BellRing, MessageSquare } from 'lucide-react';
import { useChatStore } from '@/store/chat-store';
import Avatar from '@/components/ui/Avatar';
import { useRouter } from 'next/navigation';

export function useAppNotifications() {
  const { profile } = useAuthStore();
  const addNotification = useNotificationStore(s => s.addNotification);
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();

  useEffect(() => {
    if (!profile) return;

    const playSound = () => {
      try {
        const audio = new Audio('/notify.ogg');
        audio.volume = 1.0;
        audio.play().catch(e => console.warn('Audio play blocked:', e));
      } catch (e) {}
    };

    const handleNewInteraction = async (payload: any, type: string) => {
      const record = payload.new;
      if (record.user_id === profile.id) return; // Don't notify self

      // 1. Verify the status belongs to the current user
      const { data: status } = await supabase
        .from('statuses')
        .select('id, user_id')
        .eq('id', record.status_id)
        .single();

      if (!status || status.user_id !== profile.id) return;

      // 2. Get the interacting user's profile
      const { data: actor } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', record.user_id)
        .single();
        
      if (!actor) return;

      let preview = '';
      if (type === 'comment') preview = `commented on your post: "${record.content}"`;
      if (type === 'like') preview = `liked your post`;
      if (type === 'rating') preview = `rated your post ${record.rating_value} stars`;

      // 3. Play loud pop up sound
      playSound();

      // 4. Add to global notification store
      addNotification({
        userId: record.user_id,
        userName: actor.display_name,
        userAvatar: actor.avatar_url,
        statusId: record.status_id,
        preview
      });

      // 5. Show beautiful top toast alert that stays on top
      toast.custom(
        (t) => (
          <div
            className={`${
              t.visible ? 'animate-bounceIn' : 'animate-bounceOut'
            } max-w-sm w-full bg-[var(--bg-primary)] shadow-[var(--shadow-xl)] rounded-2xl pointer-events-auto flex ring-1 ring-black/5 overflow-hidden border border-[var(--border-color)] cursor-pointer`}
            onClick={() => {
              toast.dismiss(t.id);
              router.push(`/profile/${profile.id}`); // Or direct to post
            }}
          >
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5 relative">
                  <Avatar src={actor.avatar_url} name={actor.display_name} size="md" />
                  <div className="absolute -bottom-1 -right-1 bg-[var(--wa-green)] rounded-full p-1 border-2 border-[var(--bg-primary)]">
                    <BellRing size={12} className="text-white" />
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {actor.display_name}
                  </p>
                  <p className="mt-1 text-[13px] text-[var(--text-muted)] line-clamp-2">
                    {preview}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-[var(--border-color)]">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toast.dismiss(t.id);
                }}
                className="w-full border border-transparent rounded-none rounded-r-2xl p-4 flex items-center justify-center text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors focus:outline-none"
              >
                Close
              </button>
            </div>
          </div>
        ),
        { duration: 6000, position: 'top-center' }
      );
    };

    const handleNewPost = async (payload: any) => {
      const newStatus = payload.new;
      if (newStatus.user_id === profile.id) return; // Don't notify self

      // Check if we follow this user
      const { data: followCheck } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('follower_id', profile.id)
        .eq('following_id', newStatus.user_id)
        .single();

      if (!followCheck) return;

      // Get poster profile
      const { data: actor } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', newStatus.user_id)
        .single();
        
      if (!actor) return;

      playSound();
      addNotification({
        userId: newStatus.user_id,
        userName: actor.display_name,
        userAvatar: actor.avatar_url,
        statusId: newStatus.id,
        preview: newStatus.text_content || (newStatus.media_url ? '📷 Shared a new photo' : 'Posted a new status'),
      });

      toast.custom(
        (t) => (
          <div
            className={`${
              t.visible ? 'animate-bounceIn' : 'animate-bounceOut'
            } max-w-sm w-full bg-[var(--bg-primary)] shadow-[var(--shadow-xl)] rounded-2xl pointer-events-auto flex ring-1 ring-black/5 overflow-hidden border border-[var(--border-color)] cursor-pointer`}
            onClick={() => {
              toast.dismiss(t.id);
              router.push(`/profile/${newStatus.user_id}`);
            }}
          >
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5 relative">
                  <Avatar src={actor.avatar_url} name={actor.display_name} size="md" />
                  <div className="absolute -bottom-1 -right-1 bg-[var(--emerald)] rounded-full p-1 border-2 border-[var(--bg-primary)]">
                    <BellRing size={12} className="text-white" />
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-semibold text-[var(--emerald)]">
                    New post from {actor.display_name}
                  </p>
                  <p className="mt-1 text-[13px] text-[var(--text-primary)] font-medium line-clamp-1">
                    {newStatus.text_content || 'Shared an update'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ),
        { duration: 6000, position: 'top-center' }
      );
    };

    const handleNewFollow = async (payload: any) => {
      const record = payload.new;
      if (record.following_id !== profile.id) return; // Only notify if we are being followed

      // Get follower's profile
      const { data: actor } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', record.follower_id)
        .single();
        
      if (!actor) return;

      playSound();
      addNotification({
        userId: record.follower_id,
        userName: actor.display_name,
        userAvatar: actor.avatar_url,
        statusId: 'profile', // No status ID for follow
        preview: `started following you`,
      });

      toast.custom(
        (t) => (
          <div
            className={`${
              t.visible ? 'animate-bounceIn' : 'animate-bounceOut'
            } max-w-sm w-full bg-[var(--bg-primary)] shadow-[var(--shadow-xl)] rounded-2xl pointer-events-auto flex ring-1 ring-black/5 overflow-hidden border border-[var(--border-color)] cursor-pointer`}
            onClick={() => {
              toast.dismiss(t.id);
              router.push(`/profile/${record.follower_id}`);
            }}
          >
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5 relative">
                  <Avatar src={actor.avatar_url} name={actor.display_name} size="md" />
                  <div className="absolute -bottom-1 -right-1 bg-[var(--wa-green)] rounded-full p-1 border-2 border-[var(--bg-primary)]">
                    <BellRing size={12} className="text-white" />
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-semibold text-[var(--emerald)]">
                    New Follower
                  </p>
                  <p className="mt-1 text-[13px] text-[var(--text-primary)] font-medium line-clamp-1">
                    {actor.display_name} started following you
                  </p>
                </div>
              </div>
            </div>
          </div>
        ),
        { duration: 6000, position: 'top-center' }
      );
    };

    const handleNewChatMessage = async (payload: any) => {
      const msg = payload.new;
      if (msg.sender_id === profile.id) return; // Don't notify self

      // Check if we are currently looking at this chat
      const activeChatId = useChatStore.getState().activeChatId;
      if (activeChatId === msg.chat_id) return;

      // Get sender profile
      const { data: actor } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', msg.sender_id)
        .single();
        
      if (!actor) return;

      playSound();

      toast.custom(
        (t) => (
          <div
            className={`${
              t.visible ? 'animate-bounceIn' : 'animate-bounceOut'
            } max-w-sm w-full bg-[var(--bg-primary)] shadow-[var(--shadow-xl)] rounded-2xl pointer-events-auto flex ring-1 ring-black/5 overflow-hidden border border-[var(--border-color)] cursor-pointer`}
            onClick={() => {
              toast.dismiss(t.id);
              router.push(`/${msg.chat_id}`);
            }}
          >
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5 relative">
                  <Avatar src={actor.avatar_url} name={actor.display_name} size="md" />
                  <div className="absolute -bottom-1 -right-1 bg-[var(--emerald)] rounded-full p-1 border-2 border-[var(--bg-primary)]">
                    <MessageSquare size={12} className="text-white fill-current" />
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-semibold text-[var(--emerald)]">
                    New message from {actor.display_name}
                  </p>
                  <p className="mt-1 text-[13px] text-[var(--text-primary)] font-medium line-clamp-1">
                    {msg.content || (msg.media_url ? '📷 Sent an image' : 'Sent a message')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ),
        { duration: 5000, position: 'top-center' }
      );
    };

    const channel = supabase.channel('app-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'statuses' }, handleNewPost)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'status_comments' }, payload => handleNewInteraction(payload, 'comment'))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'status_likes' }, payload => handleNewInteraction(payload, 'like'))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'status_ratings' }, payload => handleNewInteraction(payload, 'rating'))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'follows' }, handleNewFollow)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, handleNewChatMessage)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, addNotification, supabase, router]);
}
