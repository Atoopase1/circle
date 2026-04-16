// ============================================================
// NotificationPanel — Premium notification panel with post alerts
// ============================================================
'use client';

import { useState } from 'react';
import { X, Trash2, Bell, BellOff, Check, CheckCheck } from 'lucide-react';
import { useNotificationStore, type Notification } from '@/store/notification-store';
import Avatar from '@/components/ui/Avatar';
import { useRouter } from 'next/navigation';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export default function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const notifications = useNotificationStore(s => s.notifications);
  const markRead = useNotificationStore(s => s.markRead);
  const markAllRead = useNotificationStore(s => s.markAllRead);
  const deleteNotification = useNotificationStore(s => s.deleteNotification);
  const clearAll = useNotificationStore(s => s.clearAll);
  const router = useRouter();

  if (!isOpen) return null;

  const handleNotificationClick = (notification: Notification) => {
    markRead(notification.id);
    router.push(`/profile/${notification.userId}`);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9990] bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed right-4 top-16 z-[9991] w-[360px] max-w-[calc(100vw-32px)] max-h-[75vh] bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] flex flex-col overflow-hidden"
        style={{
          boxShadow: '0 12px 48px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)',
          animation: 'slideUp 0.25s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)] shrink-0">
          <div className="flex items-center gap-2.5">
            <Bell size={18} className="text-[var(--emerald)]" />
            <h2 className="text-[16px] font-bold text-[var(--text-primary)]">Notifications</h2>
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="bg-[var(--emerald)] text-white text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                {notifications.filter(n => !n.read).length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {notifications.length > 0 && (
              <>
                <button
                  onClick={markAllRead}
                  className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--emerald)] transition-all"
                  title="Mark all read"
                >
                  <CheckCheck size={16} />
                </button>
                <button
                  onClick={clearAll}
                  className="p-2 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500 transition-all"
                  title="Clear all"
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Notification list */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-16 h-16 mb-4 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center">
                <BellOff size={28} className="text-[var(--text-muted)]" />
              </div>
              <p className="text-[15px] font-semibold text-[var(--text-primary)] mb-1">No notifications yet</p>
              <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">
                When people you follow post updates, you'll see them here.
              </p>
            </div>
          ) : (
            <div className="py-1">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-3 px-5 py-3.5 cursor-pointer hover:bg-[var(--bg-hover)] transition-all duration-150 relative group ${
                    !notification.read ? 'bg-[var(--emerald)]/[0.04]' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  {/* Unread indicator */}
                  {!notification.read && (
                    <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[var(--emerald)]" />
                  )}

                  {/* Avatar */}
                  <Avatar
                    src={notification.userAvatar}
                    name={notification.userName}
                    size="sm"
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] text-[var(--text-primary)] leading-snug">
                      <span className="font-semibold">{notification.userName}</span>
                      <span className="text-[var(--text-muted)]"> shared a new post</span>
                    </p>
                    {notification.preview && (
                      <p className="text-[13px] text-[var(--text-muted)] truncate mt-0.5">{notification.preview}</p>
                    )}
                    <p className="text-[12px] text-[var(--text-muted)] mt-1 opacity-70">{timeAgo(notification.createdAt)}</p>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500 transition-all shrink-0"
                    title="Delete notification"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
