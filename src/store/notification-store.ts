// ============================================================
// NotificationStore — Local notifications for followed user posts
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Notification {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  statusId: string;
  preview: string;
  createdAt: number;
  read: boolean;
}

interface NotificationStore {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
  unreadCount: () => number;
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      notifications: [],

      addNotification: (notification) => {
        const { notifications } = get();
        // Prevent duplicate notifications for same status
        if (notifications.some(n => n.statusId === notification.statusId)) return;

        set({
          notifications: [
            {
              ...notification,
              id: Math.random().toString(36).substring(2, 9),
              createdAt: Date.now(),
              read: false,
            },
            ...notifications
          ]
        });
      },

      markRead: (id) => {
        set({
          notifications: get().notifications.map(n =>
            n.id === id ? { ...n, read: true } : n
          )
        });
      },

      markAllRead: () => {
        set({
          notifications: get().notifications.map(n => ({ ...n, read: true }))
        });
      },

      deleteNotification: (id) => {
        set({
          notifications: get().notifications.filter(n => n.id !== id)
        });
      },

      clearAll: () => {
        set({ notifications: [] });
      },

      unreadCount: () => {
        return get().notifications.filter(n => !n.read).length;
      },
    }),
    {
      name: 'tekyel-notifications',
    }
  )
);
