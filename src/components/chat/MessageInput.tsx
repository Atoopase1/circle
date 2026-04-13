// ============================================================
// MessageInput — Premium glass input bar with attachments
// ============================================================
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Paperclip, Smile, Mic, X, ImageIcon, FileText, Video, Camera, Pencil } from 'lucide-react';
import { useChatStore } from '@/store/chat-store';
import { useTypingIndicator } from '@/hooks/usePresence';
import { uploadMedia, getMessageTypeFromFile } from '@/lib/media';
import toast from 'react-hot-toast';
import EmojiPicker, { Theme } from 'emoji-picker-react';

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
  const [showEmoji, setShowEmoji] = useState(false);
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
  const { sendTyping } = useTypingIndicator(chatId);

  // Populate text when editing starts
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.content || '');
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    } else if (!replyingTo) {
    }
  }, [editingMessage]);

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
        // Fire and forget, database handles it asynchronously
        sendMessage(
          chatId,
          trimmed || null!,
          messageType,
          mediaUrl,
          mediaMetadata,
          replyingTo?.id
        );
      }

      setText('');
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
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onEmojiClick = (emojiObject: any) => {
    setText((prev) => prev + emojiObject.emoji);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `audio-${Date.now()}.webm`, { type: 'audio/webm' });
        setSelectedFile(audioFile);
        setPreviewUrl(URL.createObjectURL(audioFile));
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
    <div className="glass-header border-t border-[var(--border-color)]">
      {/* File preview */}
      {selectedFile && (
        <div className="px-4 py-3 border-b border-[var(--border-color)] flex items-center gap-3 animate-slideUp">
          {previewUrl && selectedFile.type.startsWith('image/') ? (
            <img src={previewUrl} alt="Preview" className="w-14 h-14 object-cover rounded-xl" />
          ) : previewUrl && selectedFile.type.startsWith('audio/') ? (
            <audio src={previewUrl} controls className="h-10 max-w-[200px]" />
          ) : (
            <div className="w-14 h-14 bg-[var(--bg-secondary)] rounded-xl flex items-center justify-center shrink-0">
              <FileText size={22} className="text-[var(--text-muted)]" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[var(--text-primary)] truncate font-medium">{selectedFile.name}</p>
            <p className="text-xs text-[var(--text-muted)]">
              {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
            </p>
          </div>
          <button
            onClick={clearFile}
            className="p-2 rounded-xl hover:bg-[var(--bg-hover)] text-[var(--text-muted)] transition-all"
          >
            <X size={17} />
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
            <p className="text-[11px] font-semibold text-[var(--emerald)] mb-0.5">
              {replyingTo.sender?.display_name || 'User'}
            </p>
            <p className="text-[13px] text-[var(--text-secondary)] truncate">
              {replyingTo.content || (replyingTo.media_url ? '[Media]' : '')}
            </p>
          </div>
          <button 
            onClick={() => setReplyingTo(null)}
            className="p-2 ml-3 rounded-xl hover:bg-[var(--bg-hover)] text-[var(--text-muted)] transition-all"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* Editing Preview */}
      {editingMessage && (
        <div className="px-4 py-2.5 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-between animate-slideUp">
          <div className="flex-1 min-w-0 flex items-start gap-3 pl-1">
            <Pencil size={17} className="text-[var(--emerald)] mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[var(--emerald)] mb-0.5">
                Edit message
              </p>
              <p className="text-[13px] text-[var(--text-secondary)] truncate">
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
            <X size={17} />
          </button>
        </div>
      )}

      {/* Input bar */}
      <div className="flex items-end gap-2 px-4 py-3 relative">
        {showEmoji && (
          <div className="absolute bottom-[60px] left-4 z-50 animate-scaleIn">
            <EmojiPicker onEmojiClick={onEmojiClick} theme={Theme.AUTO} />
          </div>
        )}

        {/* Emoji button */}
        <button 
          onClick={() => setShowEmoji(!showEmoji)}
          className={`p-2.5 rounded-xl transition-all duration-200 shrink-0 mb-0.5 ${showEmoji ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'}`}
        >
          <Smile size={21} />
        </button>

        {/* Attachment button */}
        <div className="relative shrink-0 mb-0.5">
          <button
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className={`p-2.5 rounded-xl transition-all duration-200 ${
              showAttachMenu 
                ? 'bg-[var(--bg-hover)] text-[var(--text-primary)] rotate-45' 
                : 'hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Paperclip size={21} />
          </button>
          {showAttachMenu && (
            <div 
              className="absolute bottom-14 left-0 bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] py-2 min-w-[190px] animate-scaleIn z-10"
              style={{ boxShadow: 'var(--shadow-xl)' }}
            >
              {attachOptions.map(opt => (
                <button
                  key={opt.label}
                  onClick={() => handleFileSelect(opt.accept)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--bg-hover)] transition-all duration-150 text-[14px] text-[var(--text-primary)]"
                >
                  <opt.icon size={18} className={opt.color} />
                  {opt.label}
                </button>
              ))}
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
        <div className="flex-1 relative min-h-[44px] flex items-center">
          {isRecording ? (
            <div className="w-full flex items-center justify-between px-4 py-2 bg-[var(--bg-secondary)] rounded-2xl h-full border border-transparent">
              <div className="flex items-center gap-2">
                 <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                 <span className="text-[14px] font-medium animate-pulse text-red-500">Recording...</span>
              </div>
              <span className="text-[14px] font-medium text-[var(--text-muted)]">
                {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
              </span>
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message"
              rows={1}
              className="w-full px-4 py-2.5 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-2xl text-[14px] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]/20 focus:bg-[var(--bg-primary)] border border-transparent focus:border-[var(--emerald)]/15 resize-none max-h-[150px] leading-5 transition-all duration-200"
            />
          )}
        </div>

        {/* Send / Mic button */}
        <button
          onClick={text.trim() || selectedFile ? handleSend : handleMicClick}
          disabled={isSending && !isRecording}
          className={`p-2.5 rounded-xl transition-all duration-200 shrink-0 mb-0.5 ${
            text.trim() || selectedFile || isRecording
              ? 'text-white hover:-translate-y-[1px] active:scale-95'
              : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
          }`}
          style={text.trim() || selectedFile || isRecording ? {
            background: isRecording ? 'var(--gold)' : 'var(--emerald)',
            boxShadow: isRecording ? '0 4px 12px rgba(245, 158, 11, 0.25)' : '0 4px 12px rgba(22, 163, 74, 0.25)',
          } : undefined}
        >
          {text.trim() || selectedFile ? (
            <Send size={19} className={isSending ? 'animate-pulse' : ''} />
          ) : (
            isRecording ? <div className="w-3.5 h-3.5 bg-white rounded-[3px]" /> : <Mic size={21} />
          )}
        </button>
      </div>
    </div>
  );
}
