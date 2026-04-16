// ============================================================
// StatusCard — Post card with like, follow, save, download
// ============================================================
'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { UserPlus, UserCheck, Bookmark, BookmarkCheck, Download, Heart, MessageSquare, Star, Send } from 'lucide-react';
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

  const [liked, setLiked] = useState(() => 
    status.status_likes?.some((l: any) => l.user_id === profile?.id) || false
  );
  const [likeCount, setLikeCount] = useState(status.status_likes?.length || 0);
  const [likeAnimating, setLikeAnimating] = useState(false);

  // Ratings State
  const initialMyRating = status.status_ratings?.find((r: any) => r.user_id === profile?.id)?.rating_value || 0;
  const [myRating, setMyRating] = useState<number>(initialMyRating);
  
  const totalRatingSum = status.status_ratings?.reduce((sum: number, r: any) => sum + r.rating_value, 0) || 0;
  const ratingCount = status.status_ratings?.length || 0;
  const averageRating = ratingCount > 0 ? (totalRatingSum / ratingCount).toFixed(1) : '0.0';

  // Comments State
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<any[]>(status.status_comments || []);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const [followed, setFollowed] = useState(false);
  const [saved, setSaved] = useState(false);

  const isOwnPost = status.user_id === profile?.id;

  const handleLike = async () => {
    if (!profile) return;
    const previousLiked = liked;
    
    // Optimistic Update
    setLiked(!liked);
    setLikeCount((prev: number) => !liked ? prev + 1 : prev - 1);
    if (!liked) {
      setLikeAnimating(true);
      setTimeout(() => setLikeAnimating(false), 600);
    }

    if (!previousLiked) {
      // Like
      const { error } = await supabase.from('status_likes').insert({ status_id: status.id, user_id: profile.id });
      if (error) { toast.error('Failed to like post'); setLiked(false); setLikeCount((prev: number) => prev - 1); }
    } else {
      // Unlike
      const { error } = await supabase.from('status_likes').delete().match({ status_id: status.id, user_id: profile.id });
      if (error) { toast.error('Failed to unlike post'); setLiked(true); setLikeCount((prev: number) => prev + 1); }
    }
  };

  const handleRating = async (ratingValue: number) => {
    if (!profile) return;
    
    // Optimistic Update
    setMyRating(ratingValue);
    
    const { error } = await supabase
      .from('status_ratings')
      .upsert({ status_id: status.id, user_id: profile.id, rating_value: ratingValue }, { onConflict: 'status_id,user_id' });
    
    if (error) {
      toast.error('Failed to rate');
    } else {
      toast.success(`Rated ${ratingValue} stars!`);
    }
  };

  const submitComment = async () => {
    if (!profile || !commentText.trim()) return;
    setIsSubmittingComment(true);

    const { data, error } = await supabase
      .from('status_comments')
      .insert({ status_id: status.id, user_id: profile.id, content: commentText.trim() })
      .select('*, profiles(*)')
      .single();

    if (error) {
      toast.error('Failed to post comment');
    } else if (data) {
      setComments((prev) => [data, ...prev]);
      setCommentText('');
    }
    setIsSubmittingComment(false);
  };

  const handleFollow = async () => {
    if (!profile || isOwnPost) return;
    if (!followed && onAddContact) onAddContact(status.user_id, 'friend');
    setFollowed(!followed);
  };

  const handleDownload = async () => { /* ...existing download handler... */ };
  const handleSaveImage = async () => { /* ...existing save handler... */ };

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
            <span className="text-[13px] text-[var(--text-muted)]">
              {formatDistanceToNow(new Date(created_at), { addSuffix: true })}
            </span>
          </div>
        </div>

        {/* Follow button (only for others' posts) */}
        {!isOwnPost && (
          <button
            onClick={handleFollow}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all ${
              followed
                ? 'bg-[var(--wa-green)]/10 text-[var(--wa-green)] border border-[var(--wa-green)]/30'
                : 'bg-[var(--wa-green)] text-white hover:bg-[var(--wa-green-dark)] shadow-sm'
            }`}
          >
            {followed ? <UserCheck size={26} /> : <UserPlus size={26} />}
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

      {/* Media Content (truncated logic for brevity, assuming standard rendering) */}
      {media_url && content_type === 'image' && (
        <div className="relative w-full bg-black">
          <img src={media_url} alt="Status media" className="object-contain w-full max-h-[500px]" />
        </div>
      )}
      
      {media_url && content_type === 'video' && (
        <div className="relative w-full bg-black">
          <video src={media_url} controls className="w-full max-h-[500px]" />
        </div>
      )}

      {/* Action bar: Like, Comments, Rating */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-color)] flex-wrap gap-y-3">
        <div className="flex items-center gap-3 sm:gap-5 flex-wrap">
          {/* Like */}
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 transition-colors ${
              liked ? 'text-[var(--wa-green)]' : 'text-[var(--text-muted)] hover:text-[var(--wa-green)]'
            }`}
          >
            <Heart
              size={26}
              fill={liked ? 'currentColor' : 'none'}
              className={`transition-transform ${likeAnimating ? 'scale-125' : 'scale-100'}`}
            />
            {likeCount > 0 && <span className="text-[13px] font-medium">{likeCount}</span>}
          </button>

          {/* Comment Toggle */}
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <MessageSquare size={26} />
            {comments.length > 0 && <span className="text-[13px] font-medium">{comments.length}</span>}
          </button>

          {/* 5-Star Rating System */}
          <div className="flex items-center gap-1 sm:ml-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} onClick={() => handleRating(star)} className="focus:outline-none transition-transform hover:scale-110">
                <Star size={26} className={`${star <= myRating ? 'text-yellow-400 fill-yellow-400' : 'text-[var(--text-muted)] hover:text-yellow-200'}`} />
              </button>
            ))}
            {ratingCount > 0 && <span className="text-[13px] text-[var(--text-muted)] ml-1">({averageRating})</span>}
          </div>
        </div>

        {/* Save/Bookmark */}
        <button
          onClick={() => { setSaved(!saved); toast.success(saved ? 'Removed from saved' : 'Saved!'); }}
          className={`p-1.5 rounded-full transition-colors ${
            saved ? 'text-[var(--wa-green)]' : 'text-[var(--text-muted)] hover:text-[var(--wa-green)]'
          }`}
        >
           {saved ? <BookmarkCheck size={26} /> : <Bookmark size={26} />}
        </button>
      </div>

      {/* Expandable Comments Section */}
      {showComments && (
        <div className="px-4 py-3 bg-[var(--bg-secondary)] border-t border-[var(--border-color)]">
          {/* Comment Input */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="flex-1 bg-[var(--bg-primary)] px-3 py-2 rounded-xl text-sm text-[var(--text-primary)] border border-[var(--border-color)] focus:outline-none focus:border-[var(--wa-green)]"
              onKeyDown={(e) => e.key === 'Enter' && submitComment()}
            />
            <button
              onClick={submitComment}
              disabled={isSubmittingComment || !commentText.trim()}
              className="bg-[var(--wa-green)] text-white p-2 rounded-xl disabled:opacity-50 hover:bg-[var(--wa-green-dark)] transition-colors"
            >
              <Send size={26} />
            </button>
          </div>

          {/* Comment List */}
          <div className="space-y-3 max-h-48 overflow-y-auto">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-2">
                <Avatar src={comment.profiles?.avatar_url} name={comment.profiles?.display_name || '?'} size="sm" />
                <div className="bg-[var(--bg-primary)] p-2 px-3 rounded-2xl rounded-tl-sm border border-[var(--border-color)]">
                  <p className="text-[13px] font-semibold text-[var(--text-primary)] mb-0.5">{comment.profiles?.display_name || 'Unknown User'}</p>
                  <p className="text-sm text-[var(--text-primary)]">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
