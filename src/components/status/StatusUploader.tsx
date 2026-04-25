// StatusUploader — Create status with edit/preview before posting
'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Image as ImageIcon,
  X,
  Send,
  Video,
  FileText,
  Eye,
  Edit3,
  RotateCcw,
  Type,
  Sparkles,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/auth-store';
import toast from 'react-hot-toast';

type EditorStep = 'compose' | 'preview';

export default function StatusUploader({ onStatusPosted }: { onStatusPosted: () => void }) {
  const { profile } = useAuthStore();
  const supabase = getSupabaseBrowserClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [textContent, setTextContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'family'>('public');
  const [isPosting, setIsPosting] = useState(false);
  const [step, setStep] = useState<EditorStep>('compose');

  const determineContentType = (file: File | null) => {
    if (!file) return 'text';
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'document';
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    
    setFile(selected);

    // Create preview URL
    if (selected.type.startsWith('image/') || selected.type.startsWith('video/')) {
      const url = URL.createObjectURL(selected);
      setFilePreviewUrl(url);
    } else {
      setFilePreviewUrl(null);
    }
  }, []);

  const clearFile = () => {
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setFile(null);
    setFilePreviewUrl(null);
  };

  const canPreview = textContent.trim() || file;

  const handleGoToPreview = () => {
    if (!canPreview) {
      toast.error('Add some text or media first');
      return;
    }
    setStep('preview');
  };

  const handleBackToEdit = () => {
    setStep('compose');
  };

  const handlePost = async () => {
    if (!textContent.trim() && !file) return;

    setIsPosting(true);
    let mediaUrl = null;

    try {
      if (file) {
        const fileName = `status/${profile?.id}-${Date.now()}.${file.name.split('.').pop()}`;
        const { data, error } = await supabase.storage
          .from('chat-media')
          .upload(fileName, file, { cacheControl: '3600', upsert: false });

        if (error) throw error;

        const { data: urlData } = supabase.storage.from('chat-media').getPublicUrl(data.path);
        mediaUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from('statuses').insert({
        user_id: profile?.id,
        content_type: determineContentType(file),
        media_url: mediaUrl,
        text_content: textContent.trim() || null,
        visibility,
      });

      if (error) throw error;

      toast.success('Status posted!');
      setTextContent('');
      clearFile();
      setStep('compose');
      onStatusPosted();
    } catch (err: any) {
      toast.error(`Failed to post status: ${err.message}`);
    } finally {
      setIsPosting(false);
    }
  };

  // Preview mode
  if (step === 'preview') {
    return (
      <div className="bg-[var(--bg-primary)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-hidden">
        {/* Preview header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
            <Eye size={26} className="text-[var(--wa-green)]" />
            Preview
          </div>
          <button
            onClick={handleBackToEdit}
            className="flex items-center gap-1.5 text-sm text-[var(--wa-green)] hover:underline font-medium"
          >
            <Edit3 size={26} />
            Edit
          </button>
        </div>

        {/* Preview content */}
        <div className="p-4">
          {textContent && (
            <p className="text-[var(--text-primary)] whitespace-pre-wrap text-sm leading-relaxed text-center mb-3">
              {textContent}
            </p>
          )}

          {file && filePreviewUrl && file.type.startsWith('image/') && (
            <div className="rounded-lg overflow-hidden bg-black mb-3">
              <img src={filePreviewUrl} alt="Preview" className="w-full max-h-[400px] object-contain" />
            </div>
          )}

          {file && filePreviewUrl && file.type.startsWith('video/') && (
            <div className="rounded-lg overflow-hidden bg-black mb-3">
              <video src={filePreviewUrl} controls className="w-full max-h-[400px]" />
            </div>
          )}

          {file && file.type.startsWith('audio/') && filePreviewUrl && (
            <div className="p-3 bg-[var(--bg-secondary)] rounded-lg mb-3">
              <audio src={filePreviewUrl} controls className="w-full" />
            </div>
          )}

          {file && !filePreviewUrl && (
            <div className="flex items-center gap-2 p-3 bg-[var(--bg-secondary)] rounded-lg mb-3 text-sm text-[var(--text-primary)]">
              <FileText size={26} />
              {file.name}
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <Sparkles size={16} />
            Posting as <span className="font-medium text-[var(--text-primary)]">{visibility}</span>
          </div>
        </div>

        {/* Post button */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-color)]">
          <button
            onClick={handleBackToEdit}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <RotateCcw size={26} />
            Back to edit
          </button>
          <Button
            onClick={handlePost}
            disabled={isPosting}
            className="flex items-center gap-2"
            size="sm"
          >
            {isPosting ? <Spinner size="sm" /> : <Send size={26} />}
            Publish
          </Button>
        </div>
      </div>
    );
  }

  // Compose mode
  return (
    <div className="bg-[var(--bg-primary)] p-4 rounded-xl shadow-sm border border-[var(--border-color)]">
      <textarea
        value={textContent}
        onChange={(e) => setTextContent(e.target.value)}
        placeholder="What's on your mind? Share with your tekyel..."
        className="w-full bg-transparent border-none focus:outline-none resize-none text-[var(--text-primary)] placeholder-[var(--text-muted)] min-h-[60px]"
        disabled={isPosting}
      />
      
      {file && (
        <div className="relative inline-block mb-3">
          {/* Image/video thumbnail preview */}
          {filePreviewUrl && file.type.startsWith('image/') && (
            <div className="relative rounded-lg overflow-hidden border border-[var(--border-color)] max-w-[200px]">
              <img src={filePreviewUrl} alt="Selected" className="w-full h-auto max-h-[150px] object-cover" />
              <button
                onClick={clearFile}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors"
              >
                <X size={26} />
              </button>
            </div>
          )}

          {filePreviewUrl && file.type.startsWith('video/') && (
            <div className="relative rounded-lg overflow-hidden border border-[var(--border-color)] max-w-[200px]">
              <video src={filePreviewUrl} className="w-full max-h-[150px] object-cover" />
              <button
                onClick={clearFile}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors"
              >
                <X size={26} />
              </button>
              <div className="absolute bottom-1 left-1 bg-black/60 text-white rounded px-1.5 py-0.5 text-xs">
                <Video size={10} className="inline mr-1" />Video
              </div>
            </div>
          )}

          {(!filePreviewUrl || (!file.type.startsWith('image/') && !file.type.startsWith('video/'))) && filePreviewUrl === null && (
            <div className="relative border border-[var(--border-color)] rounded-lg p-2 bg-[var(--bg-secondary)]">
              <button
                onClick={clearFile}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
              >
                <X size={26} />
              </button>
              <div className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                {file.type.startsWith('audio/') ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                ) : (
                  <FileText size={26} />
                )}
                <span className="truncate max-w-[200px]">{file.name}</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-y-3 mt-2 pt-3 border-t border-[var(--border-color)]">
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileSelect}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--wa-green)] hover:bg-[var(--bg-secondary)] rounded-full transition-colors"
            disabled={isPosting}
            title="Add media"
          >
            <ImageIcon size={26} />
          </button>
          
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as any)}
            className="bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm rounded-lg px-2 py-1 outline-none border-none cursor-pointer"
            disabled={isPosting}
          >
            <option value="public">🌍 Public (Discoverable)</option>
            <option value="friends">👥 Friends Only</option>
            <option value="family">🛡️ Family Only</option>
          </select>
        </div>

        <Button
          onClick={handleGoToPreview}
          disabled={isPosting || (!textContent.trim() && !file)}
          className="flex items-center gap-2"
          size="sm"
        >
          <Eye size={26} />
          Preview & Post
        </Button>
      </div>
    </div>
  );
}
