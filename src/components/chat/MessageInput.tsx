// ============================================================
// MessageInput — Message input bar with attachments
// ============================================================
'use client';

import { useState, useRef, useCallback } from 'react';
import { Send, Paperclip, Smile, Mic, X, ImageIcon, FileText, Video, Camera } from 'lucide-react';
import { useChatStore } from '@/store/chat-store';
import { useTypingIndicator } from '@/hooks/usePresence';
import { uploadMedia, getMessageTypeFromFile } from '@/lib/media';
import toast from 'react-hot-toast';

interface MessageInputProps {
  chatId: string;
}

export default function MessageInput({ chatId }: MessageInputProps) {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const sendMessage = useChatStore((s) => s.sendMessage);
  const { sendTyping } = useTypingIndicator(chatId);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed && !selectedFile) return;
    if (isSending) return;

    setIsSending(true);

    try {
      let mediaUrl: string | undefined;
      let mediaMetadata: Record<string, unknown> | undefined;
      let messageType = 'text';

      // Upload media if selected
      if (selectedFile) {
        const result = await uploadMedia(selectedFile, chatId, setUploadProgress);
        mediaUrl = result.url;
        mediaMetadata = result.metadata;
        messageType = getMessageTypeFromFile(selectedFile);
      }

      // Fire and forget, database handles it asynchronously
      sendMessage(
        chatId,
        trimmed || null!,
        messageType,
        mediaUrl,
        mediaMetadata
      );

      setText('');
      setSelectedFile(null);
      setPreviewUrl(null);
      setUploadProgress(0);

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err) {
      console.error('Send error:', err);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  }, [text, selectedFile, isSending, chatId, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    sendTyping();

    // Auto-resize textarea
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 150) + 'px';
  };

  const handleFileSelect = (accept: string) => {
    setShowAttachMenu(false);
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Allow all file sizes per user request (limit will be enforced by Supabase bucket settings)

    setSelectedFile(file);

    // Generate preview for images
    if (file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="bg-[var(--bg-header)] border-t border-[var(--border-color)]">
      {/* File preview */}
      {selectedFile && (
        <div className="px-4 py-3 border-b border-[var(--border-color)] flex items-center gap-3">
          {previewUrl ? (
            <img src={previewUrl} alt="Preview" className="w-16 h-16 object-cover rounded-lg" />
          ) : (
            <div className="w-16 h-16 bg-[var(--bg-hover)] rounded-lg flex items-center justify-center">
              <FileText size={24} className="text-[var(--text-muted)]" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[var(--text-primary)] truncate">{selectedFile.name}</p>
            <p className="text-xs text-[var(--text-muted)]">
              {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
            </p>
          </div>
          <button
            onClick={clearFile}
            className="p-1.5 rounded-full hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Upload progress */}
      {isSending && selectedFile && uploadProgress < 100 && (
        <div className="px-4">
          <div className="w-full bg-[var(--bg-hover)] rounded-full h-1">
            <div
              className="bg-[var(--wa-green)] h-1 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="flex items-end gap-2 px-4 py-3">
        {/* Emoji button */}
        <button className="p-2 rounded-full hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-muted)] shrink-0 mb-0.5">
          <Smile size={22} />
        </button>

        {/* Attachment button */}
        <div className="relative shrink-0 mb-0.5">
          <button
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className="p-2 rounded-full hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-muted)]"
          >
            <Paperclip size={22} />
          </button>
          {showAttachMenu && (
            <div className="absolute bottom-12 left-0 bg-[var(--bg-primary)] rounded-xl shadow-xl border border-[var(--border-color)] py-2 min-w-[180px] animate-scaleIn z-10">
              <button
                onClick={() => handleFileSelect('image/*')}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--bg-hover)] transition-colors text-sm text-[var(--text-primary)]"
              >
                <ImageIcon size={18} className="text-[#09A5DB]" />
                Photos
              </button>
              <button
                onClick={() => handleFileSelect('video/*')}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--bg-hover)] transition-colors text-sm text-[var(--text-primary)]"
              >
                <Video size={18} className="text-red-500" />
                Videos
              </button>
              <button
                onClick={() => handleFileSelect('audio/*')}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--bg-hover)] transition-colors text-sm text-[var(--text-primary)]"
              >
                <Mic size={18} className="text-orange-500" />
                Audio
              </button>
              <button
                onClick={() => handleFileSelect('*/*')}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--bg-hover)] transition-colors text-sm text-[var(--text-primary)]"
              >
                <FileText size={18} className="text-blue-500" />
                Document
              </button>
            </div>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message"
            rows={1}
            className="w-full px-4 py-2.5 bg-[var(--bg-search)] text-[var(--text-primary)] rounded-xl text-sm placeholder:text-[var(--text-muted)] focus:outline-none resize-none max-h-[150px] leading-5"
          />
        </div>

        {/* Send / Mic button */}
        <button
          onClick={text.trim() || selectedFile ? handleSend : undefined}
          disabled={isSending}
          className={`p-2.5 rounded-full transition-all duration-200 shrink-0 mb-0.5 ${
            text.trim() || selectedFile
              ? 'bg-[var(--wa-green)] text-white hover:bg-[var(--wa-green-dark)] shadow-lg'
              : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'
          }`}
        >
          {text.trim() || selectedFile ? (
            <Send size={20} className={isSending ? 'animate-pulse' : ''} />
          ) : (
            <Mic size={22} />
          )}
        </button>
      </div>
    </div>
  );
}
