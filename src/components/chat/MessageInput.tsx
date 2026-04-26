// MessageInput — Premium glass input bar with attachments
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Send, Paperclip, Smile, Mic, X, ImageIcon, FileText, Video, Camera, Pencil, Lock } from 'lucide-react';
import { useChatStore } from '@/store/chat-store';
import { useAuthStore } from '@/store/auth-store';
import { useTypingIndicator } from '@/hooks/usePresence';
import { uploadMedia, getMessageTypeFromFile } from '@/lib/media';
import toast from 'react-hot-toast';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import GifPicker from '@/components/chat/GifPicker';

interface MessageInputProps {
  chatId: string;
}

export default function MessageInput({ chatId }: MessageInputProps) {
  const activeChat = useChatStore((s) => s.activeChat);
  const currentUser = useAuthStore((s) => s.user);

  // Check if admin-only messaging is enabled and user is not admin
  const isAdminOnlyLocked = (() => {
    if (!activeChat?.is_group || !activeChat?.admin_only_messages) return false;
    const myParticipant = activeChat.participants?.find(p => p.user_id === currentUser?.id);
    return myParticipant?.role !== 'admin';
  })();

  if (isAdminOnlyLocked) {
    return (
      <div className="glass-header border-t border-[var(--border-color)]">
        <div className="flex items-center justify-center gap-3 px-4 py-4">
          <Lock size={18} className="text-[var(--text-muted)]" />
          <p className="text-sm text-[var(--text-muted)] font-medium">
            Only admins can send messages
          </p>
        </div>
      </div>
    );
  }
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [expirationDays, setExpirationDays] = useState<number | null>(7);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const sendMessage = useChatStore((s) => s.sendMessage);
  const replyingTo = useChatStore((s) => s.replyingTo);
  const setReplyingTo = useChatStore((s) => s.setReplyingTo);
  const editingMessage = useChatStore((s) => s.editingMessage);
  const setEditingMessage = useChatStore((s) => s.setEditingMessage);
  const editMessage = useChatStore((s) => s.editMessage);
  const { sendTyping, sendStopTyping } = useTypingIndicator(chatId);

  // Populate text when editing starts or from session storage
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.content || '');
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    } else if (!replyingTo) {
      // Restore draft from session storage if available
      const draft = sessionStorage.getItem(`draft-${chatId}`);
      if (draft && !text) {
        setText(draft);
      }
    }
  }, [editingMessage, chatId]);

  // Save draft to session storage as user types
  useEffect(() => {
    if (text && !editingMessage) {
      sessionStorage.setItem(`draft-${chatId}`, text);
    } else if (!text) {
      sessionStorage.removeItem(`draft-${chatId}`);
    }
  }, [text, chatId, editingMessage]);

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

      if (editingMessage) {
        await editMessage(editingMessage.id, trimmed);
        setEditingMessage(null);
      } else {
        // Stop the typing indicator immediately on the other end
        sendStopTyping();
        // Fire and forget, database handles it asynchronously
        let expiresAtStr: string | undefined;
        if (selectedFile && expirationDays !== null && expirationDays > 0) {
          expiresAtStr = new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toISOString();
        }

        sendMessage(
          chatId,
          trimmed || null!,
          messageType,
          mediaUrl,
          mediaMetadata,
          replyingTo?.id,
          expiresAtStr
        );

        // Trigger Web Push Notifications for all other participants
        if (activeChat?.participants) {
          const myId = currentUser?.id;
          activeChat.participants.forEach((p) => {
            if (p.user_id !== myId) {
              fetch('/api/web-push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: p.user_id,
                  title: `New message from ${currentUser?.display_name || 'Tekyel'}`,
                  body: trimmed || (mediaUrl ? '[Media]' : 'Sent a message'),
                  icon: currentUser?.avatar_url || '/icon-192.png',
                  url: `/?chatId=${chatId}`
                })
              }).catch(() => {});
            }
          });
        }
      }

      setText('');
      sessionStorage.removeItem(`draft-${chatId}`);
      setSelectedFile(null);
      setPreviewUrl(null);
      setUploadProgress(0);
      setReplyingTo(null);

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

  const handleGifSelect = (url: string) => {
    sendMessage(
      chatId,
      '',
      'image',
      url,
      { mime_type: 'image/gif', filename: 'giphy.gif' },
      replyingTo?.id
    );
    setShowGifPicker(false);
    if (replyingTo) {
      setReplyingTo(null);
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

    setSelectedFile(file);

    // Generate preview for images and audio
    if (file.type.startsWith('image/') || file.type.startsWith('audio/')) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setExpirationDays(7);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onEmojiClick = (emojiObject: any) => {
    setText((prev) => prev + emojiObject.emoji);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let mimeType = '';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        }
      }

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const actualMimeType = mediaRecorder.mimeType || mimeType || 'audio/mp4';
        const audioBlob = new Blob(audioChunksRef.current, { type: actualMimeType });
        const ext = actualMimeType.includes('webm') ? 'webm' : 'm4a';
        const audioFile = new File([audioBlob], `audio-${Date.now()}.${ext}`, { type: actualMimeType });
        setSelectedFile(audioFile);
        setPreviewUrl(URL.createObjectURL(audioFile));
        
        // Critical: Stop microphone access immediately to prevent "infinite recording" loop on mobile!
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone', err);
      toast.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  };

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const attachOptions = [
    { label: 'Photos', icon: ImageIcon, color: 'text-[var(--emerald)]', accept: 'image/*' },
    { label: 'Videos', icon: Video, color: 'text-red-500', accept: 'video/*' },
    { label: 'Audio', icon: Mic, color: 'text-[var(--gold)]', accept: 'audio/*' },
    { label: 'Document', icon: FileText, color: 'text-blue-500', accept: '*/*' },
  ];

  return (
    <div className="glass-header border-t border-[var(--border-color)] relative z-[200]">
      {/* File preview */}
      {selectedFile && (
        <div className="px-4 py-3 border-b border-[var(--border-color)] flex items-center gap-3 animate-slideUp overflow-hidden">
          {previewUrl && selectedFile.type.startsWith('image/') ? (
            <img src={previewUrl} alt="Preview" className="w-14 h-14 object-cover rounded-xl shrink-0" />
          ) : previewUrl && selectedFile.type.startsWith('audio/') ? (
            <audio src={previewUrl} controls className="h-10 w-[140px] shrink-0 sm:w-[200px]" />
          ) : (
            <div className="w-14 h-14 bg-[var(--bg-secondary)] rounded-xl flex items-center justify-center shrink-0">
              <FileText size={26} className="text-[var(--text-muted)]" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[var(--text-primary)] truncate font-medium">{selectedFile.name}</p>
            <div className="flex items-center gap-3 mt-0.5">
              <p className="text-sm text-[var(--text-muted)]">
                {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
              </p>
              <select
                value={expirationDays || 0}
                onChange={(e) => setExpirationDays(Number(e.target.value))}
                className="text-xs bg-[var(--bg-hover)] text-[var(--text-primary)] border-none rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-[var(--emerald)]"
              >
                <option value={0}>Permanent</option>
                <option value={1}>1 Day</option>
                <option value={2}>2 Days</option>
                <option value={3}>3 Days</option>
                <option value={7}>7 Days</option>
              </select>
            </div>
          </div>
          <button
            onClick={clearFile}
            className="p-2 rounded-xl hover:bg-[var(--bg-hover)] text-[var(--text-muted)] transition-all"
          >
            <X size={23} />
          </button>
        </div>
      )}

      {/* Upload progress */}
      {isSending && selectedFile && uploadProgress < 100 && (
        <div className="px-4 py-1">
          <div className="w-full bg-[var(--bg-secondary)] rounded-full h-1 overflow-hidden">
            <div
              className="h-1 rounded-full transition-all duration-300"
              style={{ 
                width: `${uploadProgress}%`,
                background: 'var(--emerald)',
              }}
            />
          </div>
        </div>
      )}

      {/* Replying To Preview */}
      {replyingTo && !editingMessage && (
        <div className="px-4 py-2.5 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-between animate-slideUp">
          <div className="flex-1 min-w-0 border-l-3 border-[var(--emerald)] pl-3">
            <p className="text-sm font-semibold text-[var(--emerald)] mb-0.5">
              {replyingTo.sender?.display_name || 'User'}
            </p>
            <p className="text-sm text-[var(--text-secondary)] truncate">
              {replyingTo.content || (replyingTo.media_url ? '[Media]' : '')}
            </p>
          </div>
          <button 
            onClick={() => setReplyingTo(null)}
            className="p-2 ml-3 rounded-xl hover:bg-[var(--bg-hover)] text-[var(--text-muted)] transition-all"
          >
            <X size={23} />
          </button>
        </div>
      )}

      {/* Editing Preview */}
      {editingMessage && (
        <div className="px-4 py-2.5 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-between animate-slideUp">
          <div className="flex-1 min-w-0 flex items-start gap-3 pl-1">
            <Pencil size={23} className="text-[var(--emerald)] mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--emerald)] mb-0.5">
                Edit message
              </p>
              <p className="text-sm text-[var(--text-secondary)] truncate">
                {editingMessage.content}
              </p>
            </div>
          </div>
          <button 
            onClick={() => {
              setEditingMessage(null);
              setText('');
            }}
            className="p-2 ml-3 rounded-xl hover:bg-[var(--bg-hover)] text-[var(--text-muted)] transition-all"
          >
            <X size={23} />
          </button>
        </div>
      )}

      {/* Input bar */}
      <div className="flex items-end gap-1 sm:gap-1.5 px-2 sm:px-4 py-2 sm:py-3 relative">
        {/* Emoji picker — portaled to body for guaranteed top-layer rendering */}
        {showEmoji && typeof document !== 'undefined' && createPortal(
          <>
            <div className="fixed inset-0 z-[9998]" onPointerDown={() => setShowEmoji(false)} onClick={(e) => { e.stopPropagation(); e.preventDefault(); }} />
            <div 
              className="fixed z-[9999] animate-scaleIn" 
              style={{ bottom: '70px', left: '16px' }}
              onClick={(e) => e.stopPropagation()}
            >
              <EmojiPicker onEmojiClick={onEmojiClick} theme={Theme.AUTO} />
            </div>
          </>,
          document.body
        )}

        {/* GIF picker — portaled to body for guaranteed top-layer rendering */}
        {showGifPicker && typeof document !== 'undefined' && createPortal(
          <>
            <div className="fixed inset-0 z-[9998]" onPointerDown={() => setShowGifPicker(false)} onClick={(e) => { e.stopPropagation(); e.preventDefault(); }} />
            <div 
              className="fixed z-[9999] animate-scaleIn" 
              style={{ bottom: '70px', left: '16px' }}
              onClick={(e) => e.stopPropagation()}
            >
              <GifPicker onGifSelect={handleGifSelect} />
            </div>
          </>,
          document.body
        )}

        {/* Attachment button (swapped — now first) */}
        <div className="relative shrink-0 mb-0.5">
          <button
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className={`p-1.5 sm:p-2 rounded-xl transition-all duration-200 ${
              showAttachMenu 
                ? 'bg-[var(--bg-hover)] text-[var(--text-primary)] rotate-45' 
                : 'hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Paperclip size={22} strokeWidth={2.2} />
          </button>
          {showAttachMenu && typeof document !== 'undefined' && createPortal(
            <>
              <div className="fixed inset-0 z-[9998]" onPointerDown={() => setShowAttachMenu(false)} onClick={(e) => { e.stopPropagation(); e.preventDefault(); }} />
              <div 
                className="fixed z-[9999] bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] py-2 min-w-[190px] animate-scaleIn origin-bottom-left"
                style={{ bottom: '70px', left: '16px', boxShadow: 'var(--shadow-xl)' }}
                onClick={(e) => e.stopPropagation()}
              >
                {attachOptions.map(opt => (
                  <button
                    key={opt.label}
                    onClick={() => {
                      handleFileSelect(opt.accept);
                      setShowAttachMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--bg-hover)] transition-all duration-150 text-sm text-[var(--text-primary)]"
                  >
                    <opt.icon size={22} className={opt.color} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </>,
            document.body
          )}
        </div>

        {/* Emoji button (swapped — now second) */}
        <button 
          onClick={() => {
            setShowEmoji(!showEmoji);
            setShowGifPicker(false);
          }}
          className={`p-1.5 sm:p-2 rounded-xl transition-all duration-200 shrink-0 mb-0.5 ${showEmoji ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'}`}
        >
          <Smile size={22} strokeWidth={2.2} />
        </button>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Text input with GIF button inside on right edge */}
        <div className="flex-1 relative min-h-[44px] flex items-center">
          {isRecording ? (
            <div className="w-full flex items-center justify-between px-4 py-2 bg-[var(--bg-secondary)] rounded-2xl h-full border border-transparent">
              <div className="flex items-center gap-2">
                 <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                 <span className="text-sm font-medium animate-pulse text-red-500">Recording...</span>
              </div>
              <span className="text-sm font-medium text-[var(--text-muted)]">
                {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
              </span>
            </div>
          ) : (
            <>
              <textarea
                ref={textareaRef}
                value={text}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                placeholder="Type a message"
                rows={1}
                className="w-full px-4 pr-12 py-2.5 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-2xl text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]/20 focus:bg-[var(--bg-primary)] border border-transparent focus:border-[var(--emerald)]/15 resize-none max-h-[150px] leading-5 transition-all duration-200"
              />
              {/* GIF button — inside input on right edge */}
              <button 
                onClick={() => {
                  setShowGifPicker(!showGifPicker);
                  setShowEmoji(false);
                }}
                className={`absolute right-2 bottom-1/2 translate-y-1/2 px-1.5 py-0.5 rounded-lg transition-all duration-200 text-xs font-bold border ${showGifPicker ? 'bg-[var(--emerald)]/15 text-[var(--emerald)] border-[var(--emerald)]/30' : 'text-[var(--text-muted)] border-[var(--text-muted)]/30 hover:text-[var(--text-primary)] hover:border-[var(--text-primary)]/30'}`}
              >
                GIF
              </button>
            </>
          )}
        </div>

        {/* Send / Mic button */}
        <button
          onClick={text.trim() || selectedFile ? handleSend : handleMicClick}
          disabled={isSending && !isRecording}
          className={`p-2 sm:p-2.5 rounded-xl transition-all duration-200 shrink-0 mb-0.5 ${
            text.trim() || selectedFile || isRecording
              ? 'text-white hover:-translate-y-[1px] active:scale-95'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
          }`}
          style={text.trim() || selectedFile || isRecording ? {
            background: isRecording ? 'var(--gold)' : 'var(--emerald)',
            boxShadow: isRecording ? '0 4px 12px rgba(245, 158, 11, 0.25)' : '0 4px 12px rgba(22, 163, 74, 0.25)',
          } : undefined}
        >
          {text.trim() || selectedFile ? (
            <Send size={22} strokeWidth={2.2} className={isSending ? 'animate-pulse' : ''} />
          ) : (
            isRecording ? <div className="w-3.5 h-3.5 bg-white rounded-[3px]" /> : <Mic size={22} strokeWidth={2.2} />
          )}
        </button>
      </div>
    </div>
  );
}
