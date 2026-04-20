// ============================================================
// MessageBubble — Premium individual message bubble
// ============================================================
'use client';

import { Check, CheckCheck, Clock, Download, Play, FileText, X, ZoomIn, ZoomOut } from 'lucide-react';
import { formatMessageTime, formatFileSize } from '@/lib/utils';
import type { Message, MessageStatusType } from '@/types';
import React, { useState, useCallback } from 'react';
import { Star, RefreshCw, AlertCircle, Reply } from 'lucide-react';
import { motion, useAnimation, PanInfo } from 'framer-motion';
import { useChatStore } from '@/store/chat-store';
import { useAuthStore } from '@/store/auth-store';
import { useInView } from '@/hooks/useInView';
import toast from 'react-hot-toast';
import MessageContextMenu from './MessageContextMenu';
import { useGifStore } from '@/store/gif-store';
import MessageInfoModal from '../modals/MessageInfoModal';
import ForwardModal from '../modals/ForwardModal';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showSenderName?: boolean;
}

function StatusIcon({ status }: { status?: MessageStatusType }) {
  switch (status) {
    case 'seen':
      return <CheckCheck size={19} className="text-[#53bDEB] ml-0.5" strokeWidth={2.5} />;
    case 'delivered':
      return <CheckCheck size={19} className="text-[var(--bubble-out-meta,#667781)] ml-0.5 opacity-90" strokeWidth={2} />;
    case 'sent':
      return <Check size={19} className="text-[var(--bubble-out-meta,#667781)] ml-0.5 opacity-90" strokeWidth={2} />;
    case 'failed':
      return <AlertCircle size={17} className="text-red-500 ml-0.5" strokeWidth={2} />;
    case 'queued':
      return <Clock size={16} className="text-[var(--bubble-out-meta,#667781)] ml-0.5 opacity-80" strokeWidth={2} />;
    default:
      return <Clock size={16} className="text-[var(--bubble-out-meta,#667781)] ml-0.5 opacity-80" strokeWidth={2} />;
  }
}

const MessageBubble = React.memo(function MessageBubble({ message, isOwn, showSenderName }: MessageBubbleProps) {
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showForward, setShowForward] = useState(false);
  const [showMenuHover, setShowMenuHover] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [lightboxType, setLightboxType] = useState<'image' | 'video' | 'document'>('image');

  const openLightbox = useCallback((type: 'image' | 'video' | 'document' = 'image') => {
    setLightboxZoom(1);
    setLightboxType(type);
    setLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    setLightboxZoom(1);
  }, []);
  const { ref: mediaRef, isInView: isMediaInView } = useInView({ threshold: 0.1 });

  const controls = useAnimation();
  const [dragX, setDragX] = useState(0);

  const handleDragEnd = async (event: any, info: PanInfo) => {
    if (info.offset.x > 60) {
      setReplyingTo(message);
    }
    controls.start({ x: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } });
    setDragX(0);
  };

  const currentUser = useAuthStore(s => s.user);
  const activeChat = useChatStore(s => s.activeChat);
  const addGif = useGifStore(s => s.addGif);
  const {
    setReplyingTo,
    deleteMessageForMe,
    deleteMessageForEveryone,
    pinMessage,
    unpinMessage,
    starMessage,
    unstarMessage,
    addReaction,
    removeReaction,
    setEditingMessage,
    retryMessage,
    selectionMode,
    selectedMessageIds,
    toggleMessageSelection
  } = useChatStore();

  const isStarred = message.stars?.some(s => s.user_id === currentUser?.id) || false;
  const isPinned = activeChat?.pinned_message_id === message.id;

  const overallStatus = message.status?.length
    ? message.status.some((s) => s.status === 'failed')
      ? 'failed'
      : message.status.some((s) => s.status === 'queued')
        ? 'queued'
        : message.status.every((s) => s.status === 'seen')
          ? 'seen'
          : message.status.every((s) => s.status === 'delivered' || s.status === 'seen')
            ? 'delivered'
            : 'sent'
    : 'sent';

  if (message.is_deleted) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1.5 px-4 group`}>
        <div className="relative flex items-center gap-2 px-4 py-2 rounded-2xl bg-[var(--bg-secondary)] text-[var(--text-muted)] text-[14px] italic border border-[var(--border-color)]">
          <span>🚫 This message was deleted</span>
          <button
            onClick={() => deleteMessageForMe(message.id)}
            className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-red-500/10 text-red-400 hover:text-red-500 transition-all duration-200"
            title="Remove this message"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    );
  }

  const getDisplayName = (profile: any): string | null => {
    if (!profile) return null;
    if (profile.display_name && profile.display_name !== 'User') return profile.display_name;
    if (profile.phone) return profile.phone;
    if (profile.email) return profile.email.split('@')[0];
    return null;
  };

  const isSelected = selectedMessageIds.includes(message.id);

  return (
    <div
      className={`flex w-full mb-1.5 px-4 group relative transition-all ${isSelected ? 'bg-emerald-500/10 -mx-4 px-8 py-1' : ''
        }`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: isOwn ? 'flex-end' : 'flex-start',
        alignItems: isOwn ? 'flex-end' : 'flex-start',
      }}
      onMouseEnter={() => setShowMenuHover(true)}
      onMouseLeave={() => setShowMenuHover(false)}
    >
      {/* Selection Checkbox */}
      {selectionMode && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            toggleMessageSelection(message.id);
          }}
          className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors ${isSelected ? 'bg-[var(--emerald)] border-[var(--emerald)]' : 'border-[var(--text-muted)] bg-transparent hover:border-[var(--text-primary)]'
            }`}
        >
          {isSelected && <Check size={16} className="text-white" strokeWidth={3} />}
        </div>
      )}

      {/* Constraints Wrapper for perfect ~70% max width anchoring */}
      <div
        className="max-w-[85%] sm:max-w-[70%] relative flex items-center"
        style={{
          width: 'fit-content',
          minWidth: 0,
          marginLeft: isOwn ? 'auto' : '0',
          marginRight: isOwn ? '0' : 'auto',
          boxSizing: 'border-box',
        }}
      >
        {/* Reply Icon Background Indicator */}
        <div 
          className="absolute flex items-center justify-center rounded-full text-white/80 bg-black/30 dark:bg-white/10 shrink-0 shadow-sm"
          style={{ 
            width: 32, 
            height: 32,
            left: -40,
            opacity: dragX > 10 ? Math.min((dragX - 10) / 40, 1) : 0,
            transform: `scale(${dragX > 10 ? Math.min((dragX - 10) / 40, 1) : 0})`,
            zIndex: 0,
            pointerEvents: 'none'
          }}
        >
          <Reply size={18} />
        </div>

        {/* Draggable Message payload */}
        <motion.div
           drag="x"
           dragConstraints={{ left: 0, right: 0 }}
           dragElastic={{ left: 0, right: 0.5 }}
           onDrag={(e, info) => setDragX(info.offset.x)}
           onDragEnd={handleDragEnd}
           animate={controls}
           className="z-10 w-full"
           style={{ 
             touchAction: 'pan-y',
             display: 'flex',
             flexDirection: 'column',
           }}
        >
        <MessageContextMenu
          message={message}
          isOwn={isOwn}
          isStarred={isStarred}
          isPinned={isPinned}
          onReply={() => setReplyingTo(message)}
          onEdit={() => setEditingMessage(message)}
          onStar={() => {
            if (isStarred) {
              unstarMessage(message.id);
            } else {
              starMessage(message.id);
              if ((message.message_type === 'image' || message.media_metadata?.mime_type?.startsWith('image/') || message.media_metadata?.filename?.match(/\.(gif)$/i)) && message.media_url) {
                addGif(message.media_url);
                toast.success('Added to your GIF collection!');
              }
            }
          }}
          onCopy={() => navigator.clipboard.writeText(message.content || message.media_url || '')}
          onInfo={() => setShowInfo(true)}
          onPin={() => isPinned ? unpinMessage(message.chat_id) : pinMessage(message.chat_id, message.id)}
          onForward={() => setShowForward(true)}
          onDeleteForMe={() => deleteMessageForMe(message.id)}
          onDeleteForEveryone={() => deleteMessageForEveryone(message.id)}
          onReact={(emoji) => addReaction(message.id, emoji)}
          disabled={selectionMode}
        >
          <div
            onClick={(e) => {
              if (selectionMode) {
                e.stopPropagation();
                toggleMessageSelection(message.id);
              }
            }}
            className={`relative ${selectionMode ? 'cursor-pointer' : ''} ${isOwn
                ? 'bg-[var(--bubble-out)] text-[var(--bubble-out-text)] bubble-tail-out'
                : 'bg-[var(--bubble-in)] text-[var(--bubble-in-text)] border border-[var(--border-color)] bubble-tail-in'
              }`}
            style={{
              padding: '8px 12px',
              borderRadius: '12px',
              minWidth: '60px',
              width: 'fit-content',
              wordBreak: 'break-word',
              overflowWrap: 'anywhere',
              whiteSpace: 'pre-wrap',
              boxSizing: 'border-box',
              boxShadow: isOwn
                ? '0 1px 3px rgba(22, 163, 74, 0.12)'
                : 'var(--shadow-xs)',
            }}
          >

            {/* Replied To */}
            {message.reply_to_id && message.reply_to && (!Array.isArray(message.reply_to) || message.reply_to.length > 0) && (() => {
              const replyData = Array.isArray(message.reply_to) ? message.reply_to[0] : message.reply_to;
              if (!replyData) return null;
              
              const senderColor = `hsl(${(replyData.sender?.id ? replyData.sender.id.charCodeAt(0) * 37 : 1) % 360}, 65%, 55%)`;
              const isReplyingToMe = replyData.sender?.id === currentUser?.id;
              const displayName = isReplyingToMe ? 'You' : getDisplayName(replyData.sender) || 'User';

              return (
                <div 
                  className="mb-1.5 p-2 rounded-lg flex flex-col cursor-pointer transition-colors border-l-[3.5px] bg-black/10 dark:bg-black/20 hover:bg-black/15 dark:hover:bg-black/30 shadow-sm"
                  style={{ borderColor: senderColor }}
                  onClick={(e) => {
                    e.stopPropagation();
                    const el = document.getElementById(`msg-${replyData.id}`);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      el.classList.add('pinned-highlight');
                      setTimeout(() => el.classList.remove('pinned-highlight'), 2000);
                    }
                  }}
                >
                  <span 
                    className="text-[13px] font-semibold mb-0.5 max-w-full truncate"
                    style={{ color: senderColor }}
                  >
                    {displayName}
                  </span>
                  <span className={`text-[13px] line-clamp-2 leading-[18px] flex gap-1 items-center ${isOwn ? 'text-[var(--bubble-out-text)] opacity-80' : 'text-[var(--bubble-in-text)] opacity-80'}`}>
                    {replyData.message_type === 'image' && '📷 Photo'}
                    {replyData.message_type === 'video' && '🎬 Video'}
                    {replyData.message_type === 'audio' && '🎵 Audio'}
                    {replyData.message_type === 'document' && '📄 Document'}
                    {replyData.content || (!replyData.message_type && replyData.media_url ? '📎 Media' : '')}
                  </span>
                </div>
              );
            })()}

            {/* Sender name in groups — only show if we have a real name */}
            {showSenderName && !isOwn && message.sender && getDisplayName(message.sender) && (
              <p
                className="text-[14px] font-semibold mb-1"
                style={{ color: `hsl(${(message.sender.id ? message.sender.id.charCodeAt(0) * 37 : 1) % 360}, 65%, 55%)` }}
              >
                {getDisplayName(message.sender)}
              </p>
            )}

            {/* Media content — Image */}
            {((message.message_type === 'image') ||
              message.media_metadata?.mime_type?.startsWith('image/') ||
              message.media_metadata?.filename?.match(/\.(jpg|jpeg|png|gif|webp)$/i)) && message.media_url && (
                <div ref={mediaRef} className="mb-1.5 -mx-1 -mt-0.5 min-h-[150px] overflow-hidden rounded-xl bg-[var(--bg-hover)] relative">
                  {isMediaInView && !mediaError ? (
                    <img
                      src={message.media_url}
                      alt="Photo"
                      className={`w-full max-h-[300px] object-cover cursor-pointer transition-all duration-500 ${mediaLoaded ? 'opacity-100 blur-0 scale-100' : 'opacity-0 blur-md scale-105'
                        }`}
                      onLoad={() => setMediaLoaded(true)}
                      onError={() => setMediaError(true)}
                      loading="lazy"
                      onClick={(e) => { e.stopPropagation(); openLightbox('image'); }}
                    />
                  ) : mediaError ? (
                    <div className="flex flex-col items-center justify-center p-6 text-red-400">
                      <AlertCircle size={28} className="mb-2" />
                      <span className="text-[13px]">Failed to load media</span>
                    </div>
                  ) : null}
                  {!mediaLoaded && !mediaError && (
                    <div className="absolute inset-0 animate-shimmer" />
                  )}
                </div>
              )}

            {/* Video */}
            {((message.message_type === 'video') ||
              (message.message_type !== 'audio' && message.message_type !== 'image' && message.message_type !== 'document' && (message.media_metadata?.mime_type?.startsWith('video/') ||
                message.media_metadata?.filename?.match(/\.(mp4|webm|ogg|mov)$/i)))) && message.media_url && (
                <div ref={mediaRef} className="mb-1.5 -mx-1 -mt-0.5 min-h-[150px] overflow-hidden rounded-xl bg-[var(--bg-hover)] relative cursor-pointer" onClick={(e) => { e.stopPropagation(); openLightbox('video'); }}>
                  {isMediaInView ? (
                    <video
                      src={message.media_url}
                      className="w-full max-h-[300px] object-cover transition-opacity pointer-events-none"
                      preload="metadata"
                      onLoadedData={() => setMediaLoaded(true)}
                      onError={() => setMediaError(true)}
                      muted
                    />
                  ) : null}
                  {!mediaLoaded && !mediaError && (
                    <div className="absolute inset-0 animate-shimmer" />
                  )}
                  {mediaError && (
                    <div className="flex flex-col items-center justify-center p-6 text-red-400">
                      <AlertCircle size={28} className="mb-2" />
                      <span className="text-[13px]">Failed to load video</span>
                    </div>
                  )}
                  {/* Play overlay */}
                  {mediaLoaded && !mediaError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors">
                      <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                        <Play size={26} className="text-gray-800 ml-0.5" fill="currentColor" />
                      </div>
                    </div>
                  )}
                </div>
              )}

            {/* Audio */}
            {((message.message_type === 'audio') ||
              (message.message_type !== 'video' && message.message_type !== 'image' && message.message_type !== 'document' && (message.media_metadata?.mime_type?.startsWith('audio/') ||
                message.media_metadata?.filename?.match(/\.(mp3|wav|ogg|m4a|webm)$/i)))) && message.media_url && (
                <div className="mb-1.5 min-w-[200px]">
                  <audio src={message.media_url} controls className="w-full h-10" preload="none" />
                </div>
              )}

            {/* Document */}
            {message.message_type === 'document' &&
              !message.media_metadata?.mime_type?.startsWith('image/') &&
              !message.media_metadata?.filename?.match(/\.(jpg|jpeg|png|gif|webp)$/i) &&
              !message.media_metadata?.mime_type?.startsWith('video/') &&
              !message.media_metadata?.filename?.match(/\.(mp4|webm|ogg|mov)$/i) &&
              !message.media_metadata?.mime_type?.startsWith('audio/') &&
              !message.media_metadata?.filename?.match(/\.(mp3|wav|ogg|m4a)$/i) &&
              message.media_url && (
                <div
                  onClick={(e) => { e.stopPropagation(); openLightbox('document'); }}
                  className={`flex items-center gap-3 mb-1.5 p-3 rounded-xl hover:opacity-80 transition-opacity cursor-pointer ${isOwn ? 'bg-white/10' : 'bg-[var(--bg-secondary)]'
                    }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isOwn ? 'bg-white/15' : 'bg-[var(--emerald)]/10'}`}>
                    <FileText size={26} className={isOwn ? 'text-white/80' : 'text-[var(--emerald)]'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate font-medium ${isOwn ? 'text-white' : 'text-[var(--text-primary)]'}`}>
                      {message.media_metadata?.filename || 'Document'}
                    </p>
                    <p className={`text-[13px] ${isOwn ? 'text-white/60' : 'text-[var(--text-muted)]'}`}>
                      {message.media_metadata?.size
                        ? formatFileSize(message.media_metadata.size as number)
                        : 'File'}
                    </p>
                  </div>
                  <Download size={23} className={isOwn ? 'text-white/60' : 'text-[var(--text-muted)]'} />
                </div>
              )}

            {/* Text content */}
            {message.content && (
              <p className={`text-[14px] leading-relaxed m-0`} style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', wordBreak: 'break-word', color: isOwn ? 'var(--bubble-out-text)' : 'var(--bubble-in-text)', boxSizing: 'border-box', minWidth: 0 }}>
                {message.content}
              </p>
            )}

            {/* Time & Status */}
            <div className="flex items-center justify-end gap-1 -mb-0.5 mt-1" style={{ minWidth: isOwn ? '64px' : '44px' }}>
              {isStarred && <Star size={10} className={isOwn ? 'fill-[var(--gold)] text-[var(--gold)]' : 'fill-[var(--gold)] text-[var(--gold)]'} />}
              <span className="text-[11px] font-normal" style={{ color: isOwn ? 'var(--bubble-out-meta, #667781)' : 'var(--bubble-in-meta, #667781)' }}>
                {formatMessageTime(message.created_at)}
              </span>
              {isOwn && overallStatus === 'failed' && (
                <button
                  onClick={() => retryMessage(message.id, message.chat_id, message.content as string, message.message_type, message.media_url as string, message.media_metadata as any, message.reply_to_id as string)}
                  className="text-red-400 hover:text-red-300 transition-colors rounded-full p-0.5 ml-0.5"
                  title="Retry sending"
                >
                  <RefreshCw size={16} />
                </button>
              )}
              {isOwn && overallStatus !== 'failed' && <StatusIcon status={overallStatus as MessageStatusType | undefined} />}
            </div>

            {/* Reactions beneath bubble */}
            {message.reactions && message.reactions.length > 0 && (
              <div
                className={`absolute -bottom-3 ${isOwn ? '-left-2' : '-right-2'} bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-full px-2 py-0.5 text-[13px] flex gap-1 items-center`}
                style={{ boxShadow: 'var(--shadow-sm)' }}
              >
                {Array.from(new Set(message.reactions.map(r => r.emoji))).map(emoji => (
                  <span key={emoji}>{emoji}</span>
                ))}
                {message.reactions.length > 1 && <span className="text-[var(--text-muted)] text-[10px] font-medium">{message.reactions.length}</span>}
              </div>
            )}
          </div>
        </MessageContextMenu>
        </motion.div>
      </div>

      {showInfo && activeChat && (
        <MessageInfoModal
          message={message}
          chatParticipants={activeChat.participants}
          onClose={() => setShowInfo(false)}
        />
      )}

      {showForward && (
        <ForwardModal message={message} onClose={() => setShowForward(false)} />
      )}

      {/* Image Lightbox */}
      {lightboxOpen && message.media_url && (
        <div
          className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center animate-fadeIn"
          onClick={closeLightbox}
        >
          {/* Controls */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10 bg-black/60">
            <p className="text-white/80 text-sm font-medium truncate max-w-[60%]">
              {lightboxType === 'image' ? (message.sender?.display_name || 'Photo')
                : lightboxType === 'video' ? (message.sender?.display_name || 'Video')
                  : (message.media_metadata?.filename || 'Document')}
            </p>
            <div className="flex items-center gap-2">
              {lightboxType === 'image' && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); setLightboxZoom(z => Math.max(0.5, z - 0.25)); }}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  >
                    <ZoomOut size={26} />
                  </button>
                  <span className="text-white/60 text-[13px] font-mono min-w-[40px] text-center">{Math.round(lightboxZoom * 100)}%</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setLightboxZoom(z => Math.min(3, z + 0.25)); }}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  >
                    <ZoomIn size={26} />
                  </button>
                </>
              )}
              <a
                href={message.media_url}
                download
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <Download size={26} />
              </a>
              <button
                onClick={closeLightbox}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X size={26} />
              </button>
            </div>
          </div>

          {/* Media Content */}
          {lightboxType === 'image' && (
            <img
              src={message.media_url}
              alt="Full view"
              className="max-w-[90vw] max-h-[85vh] object-contain transition-transform duration-300 ease-out rounded-lg"
              style={{ transform: `scale(${lightboxZoom})` }}
              onClick={(e) => e.stopPropagation()}
              draggable={false}
            />
          )}

          {lightboxType === 'video' && (
            <video
              src={message.media_url}
              className="max-w-[90vw] max-h-[85vh] rounded-lg shadow-2xl"
              controls
              autoPlay
              onClick={(e) => e.stopPropagation()}
            />
          )}

          {lightboxType === 'document' && (
            <div
              className="bg-[var(--bg-primary)] rounded-2xl p-8 max-w-md w-[90vw] shadow-2xl text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 rounded-2xl bg-[var(--emerald)]/10 flex items-center justify-center mx-auto mb-4">
                <FileText size={36} className="text-[var(--emerald)]" />
              </div>
              <p className="text-[var(--text-primary)] font-semibold text-lg mb-1">
                {message.media_metadata?.filename || 'Document'}
              </p>
              <p className="text-[var(--text-muted)] text-sm mb-6">
                {message.media_metadata?.size
                  ? formatFileSize(message.media_metadata.size as number)
                  : 'File'}
                {message.media_metadata?.mime_type && ` • ${message.media_metadata.mime_type}`}
              </p>
              <div className="flex gap-3">
                <a
                  href={message.media_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)] font-medium text-sm hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <FileText size={26} />
                  Open
                </a>
                <a
                  href={message.media_url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[var(--emerald)] text-white font-medium text-sm hover:opacity-90 transition-opacity"
                >
                  <Download size={26} />
                  Download
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default MessageBubble;
