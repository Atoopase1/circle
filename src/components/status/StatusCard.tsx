// ============================================================
// StatusCard — Post card with like, follow, save, download
// ============================================================
'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { UserPlus, UserCheck, Bookmark, BookmarkCheck, Download, Heart } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/auth-store';
import toast from 'react-hot-toast';

interface StatusCardProps {
  status: any;
  onAddContact?: (id: string, category: 'friend' | 'family') => void;
}

export default function StatusCard({ status, onAddContact }: StatusCardProps) {
  const router = useRouter();
  const { profile } = useAuthStore();
  const supabase = getSupabaseBrowserClient();

  const { profiles, content_type, media_url, text_content, created_at, visibility } = status;

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(status.like_count || 0);
  const [followed, setFollowed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeAnimating, setLikeAnimating] = useState(false);

  const isOwnPost = status.user_id === profile?.id;

  const handleLike = async () => {
    setLiked(!liked);
    setLikeCount((prev: number) => liked ? prev - 1 : prev + 1);

    if (!liked) {
      setLikeAnimating(true);
      setTimeout(() => setLikeAnimating(false), 600);
    }

    // Optimistic — in production you'd persist this via a status_likes table
    // For now we just toggle the UI state
  };

  const handleFollow = async () => {
    if (!profile || isOwnPost) return;
    
    if (!followed && onAddContact) {
      onAddContact(status.user_id, 'friend');
    }
    setFollowed(!followed);
  };

  const handleSaveImage = async () => {
    if (!media_url) return;
    
    try {
      const response = await fetch(media_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `circle_image_${Date.now()}.${blob.type.split('/')[1] || 'jpg'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setSaved(true);
      toast.success('Image saved!');
    } catch {
      toast.error('Failed to save image');
    }
  };

  const handleDownload = async () => {
    if (!media_url) return;
    
    try {
      const response = await fetch(media_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = content_type === 'video' ? 'mp4' : content_type === 'audio' ? 'mp3' : 'file';
      a.download = `circle_${content_type}_${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success(`${content_type === 'video' ? 'Video' : 'Audio'} downloaded!`);
    } catch {
      toast.error('Download failed');
    }
  };

  return (
    <div className="bg-[var(--bg-primary)] rounded-xl shadow-sm border border-[var(--border-color)] mb-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-2">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push(`/profile/${status.user_id}`)}>
          <Avatar src={profiles.avatar_url} name={profiles.display_name} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[var(--text-primary)] text-sm">{profiles.display_name}</span>
              <span className="text-[10px] uppercase bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded text-[var(--text-muted)]">
                {visibility}
              </span>
            </div>
            <span className="text-xs text-[var(--text-muted)]">
              {formatDistanceToNow(new Date(created_at), { addSuffix: true })}
            </span>
          </div>
        </div>

        {/* Follow button (only for others' posts) */}
        {!isOwnPost && (
          <button
            onClick={handleFollow}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              followed
                ? 'bg-[var(--wa-green)]/10 text-[var(--wa-green)] border border-[var(--wa-green)]/30'
                : 'bg-[var(--wa-green)] text-white hover:bg-[var(--wa-green-dark)] shadow-sm'
            }`}
          >
            {followed ? <UserCheck size={14} /> : <UserPlus size={14} />}
            {followed ? 'Following' : 'Follow'}
          </button>
        )}
      </div>

      {/* Text content */}
      {text_content && (
        <div className="px-4 py-2">
          <p className="text-[var(--text-primary)] whitespace-pre-wrap text-sm leading-relaxed">{text_content}</p>
        </div>
      )}

      {/* Media */}
      {media_url && content_type === 'image' && (
        <div className="relative w-full bg-black">
          <img src={media_url} alt="Status media" className="object-contain w-full max-h-[500px]" />
          {/* Save image button overlay */}
          <button
            onClick={handleSaveImage}
            className="absolute bottom-3 right-3 p-2.5 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-all group"
            title="Save image"
          >
            {saved ? <BookmarkCheck size={18} className="text-[var(--wa-green)]" /> : <Bookmark size={18} className="group-hover:scale-110 transition-transform" />}
          </button>
        </div>
      )}

      {media_url && content_type === 'video' && (
        <div className="relative w-full border-y border-[var(--border-color)]">
          <video src={media_url} controls className="w-full max-h-[500px] bg-black" />
          {/* Download video button */}
          <button
            onClick={handleDownload}
            className="absolute bottom-3 right-3 p-2.5 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-all group"
            title="Download video"
          >
            <Download size={18} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>
      )}

      {media_url && content_type === 'audio' && (
        <div className="px-4 py-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
            <audio src={media_url} controls className="flex-1 h-10" />
            <button
              onClick={handleDownload}
              className="p-2 rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--wa-green)] transition-all"
              title="Download audio"
            >
              <Download size={18} />
            </button>
          </div>
        </div>
      )}

      {media_url && content_type === 'document' && (
        <div className="px-4 py-2">
          <a
            href={media_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--wa-green)] hover:underline text-sm font-medium p-3 bg-[var(--bg-secondary)] rounded-lg text-center block"
          >
            View Attachment
          </a>
        </div>
      )}

      {/* Action bar: Like + interactions */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-color)]">
        <div className="flex items-center gap-4">
          {/* Like */}
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 transition-all ${
              liked ? 'text-red-500' : 'text-[var(--text-muted)] hover:text-red-400'
            }`}
          >
            <Heart
              size={20}
              fill={liked ? 'currentColor' : 'none'}
              className={`transition-transform ${likeAnimating ? 'scale-125' : 'scale-100'}`}
            />
            {likeCount > 0 && (
              <span className="text-xs font-medium">{likeCount}</span>
            )}
          </button>
        </div>

        {/* Save/Bookmark for text posts */}
        {content_type === 'text' && (
          <button
            onClick={() => { setSaved(!saved); toast.success(saved ? 'Removed from saved' : 'Saved!'); }}
            className={`p-1.5 rounded-full transition-all ${
              saved ? 'text-[var(--wa-green)]' : 'text-[var(--text-muted)] hover:text-[var(--wa-green)]'
            }`}
          >
            {saved ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
          </button>
        )}
      </div>
    </div>
  );
}
