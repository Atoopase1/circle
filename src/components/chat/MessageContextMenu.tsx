// ============================================================
// MessageContextMenu — WhatsApp-style compact floating card
// ============================================================
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Reply, 
  Star, 
  Copy, 
  Info, 
  Pin, 
  Forward, 
  Trash2, 
  MoreVertical,
  Pencil,
  CheckCircle2
} from 'lucide-react';
import { useChatStore } from '@/store/chat-store';
import type { Message } from '@/types';
import { createPortal } from 'react-dom';

interface MessageContextMenuProps {
  message: Message;
  isOwn: boolean;
  onReply: () => void;
  onEdit: () => void;
  onStar: () => void;
  onCopy: () => void;
  onInfo: () => void;
  onPin: () => void;
  onForward: () => void;
  onDeleteForMe: () => void;
  onDeleteForEveryone: () => void;
  onReact: (emoji: string) => void;
  isStarred: boolean;
  isPinned: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
}

export default function MessageContextMenu(props: MessageContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; openUp: boolean } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isLongPressTriggered, setIsLongPressTriggered] = useState(false);
  const pointerStartPosRef = useRef<{ x: number, y: number } | null>(null);

  const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  const toggleSelectionMode = useChatStore(s => s.toggleSelectionMode);
  const clearSelection = useChatStore(s => s.clearSelection);
  const toggleMessageSelection = useChatStore(s => s.toggleMessageSelection);

  // Calculate where to place the floating card near the message
  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 240; // match CSS w-[240px]
    const menuHeight = 320; // approximate
    const gap = 4;

    // Decide up vs down
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUp = spaceBelow < menuHeight && spaceAbove > spaceBelow;

    let top: number;
    if (openUp) {
      top = rect.top - gap; // menu bottom anchored here
    } else {
      top = rect.bottom + gap;
    }

    // Horizontal: align to the side of the message
    let left: number;
    if (props.isOwn) {
      left = rect.right - menuWidth; // right-aligned for own messages
    } else {
      left = rect.left; // left-aligned for others
    }

    // Clamp to viewport edges
    const pad = 12; // safer padding for mobile edges
    if (left + menuWidth > window.innerWidth - pad) {
      left = window.innerWidth - menuWidth - pad;
    }
    if (left < pad) {
      left = pad;
    }
    if (!openUp && top + menuHeight > window.innerHeight - pad) {
      top = window.innerHeight - menuHeight - pad;
    }
    if (openUp && top < pad) top = pad;

    setMenuPos({ top, left, openUp });
  }, [props.isOwn]);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    requestAnimationFrame(() => calculatePosition());
  }, [calculatePosition]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current && !menuRef.current.contains(event.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(event.target as Node)
      ) {
        handleClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, handleClose]);

  // Close on scroll
  useEffect(() => {
    if (!isOpen) return;
    const onScroll = () => handleClose();
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, [isOpen, handleClose]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, handleClose]);

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (props.disabled) return;
    if (e.button === 2) return; // ignore right clicks
    
    // Ignore long press if clicking on an interactive element like an audio player
    const target = e.target as HTMLElement;
    if (target.closest('audio, video, button, a, input')) return;

    setIsLongPressTriggered(false);
    pointerStartPosRef.current = { x: e.clientX, y: e.clientY };

    longPressTimerRef.current = setTimeout(() => {
      setIsLongPressTriggered(true);
      handleOpen();
      
      // Haptic feedback if supported natively
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 450); // 450ms long press threshold
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointerStartPosRef.current) return;
    // Cancel if movement exceeds 10px (likely scrolling)
    const dx = e.clientX - pointerStartPosRef.current.x;
    const dy = e.clientY - pointerStartPosRef.current.y;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      clearLongPress();
    }
  };

  const ActionBtn = ({ icon: Icon, label, onClick, danger, iconClass, disabled }: { 
    icon: any; label: string; onClick: () => void; danger?: boolean; iconClass?: string; disabled?: boolean 
  }) => (
    <button 
      onClick={() => { onClick(); handleClose(); }} 
      disabled={disabled}
      className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl text-center transition-all duration-150 flex-1 min-w-0 ${
        danger 
          ? 'text-red-500 hover:bg-red-500/10 active:bg-red-500/20' 
          : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)] active:bg-[var(--bg-secondary)]'
      } ${disabled ? 'opacity-30 pointer-events-none' : ''}`}
    >
      <Icon size={26} className={danger ? 'text-red-500' : (iconClass || 'text-[var(--text-muted)]')} />
      <span className="text-[10px] font-medium leading-tight">{label}</span>
    </button>
  );

  return (
    <>
      <div 
        ref={triggerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={clearLongPress}
        onPointerCancel={clearLongPress}
        onContextMenu={(e) => {
          if (props.disabled) return;
          e.preventDefault(); // allow right click to just open the menu consistently!
          if (!isOpen && !isLongPressTriggered) handleOpen();
        }}
        onClick={(e) => {
          if (props.disabled) return;
          
          const target = e.target as HTMLElement;
          if (target.closest('audio, video, button, a, input')) return;

          // If a long press just triggered, swallow this click so we don't open the menu
          if (isLongPressTriggered) {
             e.preventDefault();
             e.stopPropagation();
             return;
          }
          if (!isOpen) {
            handleOpen();
          } else {
            handleClose();
          }
        }}
        className={`relative inline-flex transition-opacity ${isOpen ? 'opacity-90' : ''} ${isLongPressTriggered ? 'scale-[0.98]' : ''} transition-transform`}
        style={{ userSelect: props.disabled ? 'none' : 'auto', WebkitUserSelect: props.disabled ? 'none' : 'auto' }}
      >
        {props.children}
      </div>

      {isOpen && menuPos && typeof document !== 'undefined' && createPortal(
        <>
          {/* Invisible backdrop to catch taps */}
          <div 
            className="fixed inset-0 z-[9990]" 
            onClick={(e) => { e.stopPropagation(); handleClose(); }} 
          />
          
          {/* Floating card — WhatsApp style */}
          <div 
            ref={menuRef}
            className={`fixed z-[9991] w-[240px] bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl overflow-hidden ${
              menuPos.openUp ? 'origin-bottom' : 'origin-top'
            }`}
            style={{ 
              top: menuPos.openUp ? undefined : menuPos.top,
              bottom: menuPos.openUp ? (window.innerHeight - menuPos.top) : undefined,
              left: menuPos.left,
              boxShadow: '0 8px 30px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)',
              animation: 'ctxMenuIn 0.18s cubic-bezier(0.32, 0.72, 0, 1)',
              maxHeight: 'calc(100vh - 32px)',
              overflowY: 'auto',
            }}
          >
            {/* Emoji reaction row */}
            <div className="flex items-center justify-between px-2 py-2 border-b border-[var(--border-color)]">
              {EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => { props.onReact(e); handleClose(); }}
                  className="text-[20px] p-1.5 rounded-full hover:bg-[var(--bg-hover)] active:scale-125 transition-all duration-150"
                >
                  {e}
                </button>
              ))}
            </div>

            {/* Action grid — compact rows */}
            <div className="py-1">
              <Row>
                <ActionBtn icon={Reply} label="Reply" onClick={props.onReply} iconClass="text-[var(--emerald)]" />
                <ActionBtn icon={Copy} label="Copy" onClick={props.onCopy} />
                <ActionBtn icon={Forward} label="Forward" onClick={props.onForward} />
              </Row>
              <Row>
                <ActionBtn 
                  icon={Star} 
                  label={props.isStarred ? 'Unstar' : 'Star'} 
                  onClick={props.onStar}
                  iconClass={props.isStarred ? 'text-[var(--gold)] fill-[var(--gold)]' : 'text-[var(--text-muted)]'}
                />
                <ActionBtn 
                  icon={Pin} 
                  label={props.isPinned ? 'Unpin' : 'Pin'} 
                  onClick={props.onPin}
                  iconClass={props.isPinned ? 'text-[var(--emerald)]' : 'text-[var(--text-muted)]'}
                />
                {props.isOwn ? (
                  <ActionBtn icon={Pencil} label="Edit" onClick={props.onEdit} iconClass="text-[var(--emerald)]" disabled={props.message.message_type !== 'text'} />
                ) : (
                  <ActionBtn icon={Info} label="Info" onClick={props.onInfo} iconClass="text-blue-500" />
                )}
              </Row>

              {/* Divider */}
              <div className="h-px bg-[var(--border-color)] mx-3 my-0.5" />

              {/* Delete row */}
              <Row>
                <ActionBtn icon={Trash2} label="Delete" onClick={props.onDeleteForMe} danger />
                {props.isOwn && (
                  <>
                    <ActionBtn icon={Info} label="Info" onClick={props.onInfo} iconClass="text-blue-500" />
                    <ActionBtn icon={Trash2} label="Unsend" onClick={props.onDeleteForEveryone} danger />
                  </>
                )}
                <ActionBtn 
                  icon={CheckCircle2} 
                  label="Select" 
                  onClick={() => {
                    toggleSelectionMode(true);
                    toggleMessageSelection(props.message.id);
                  }} 
                />
              </Row>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}

/** Simple flex row for the grid layout */
function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-stretch justify-evenly px-1">
      {children}
    </div>
  );
}
