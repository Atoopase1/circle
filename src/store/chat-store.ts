// Chat Store — Zustand store for chat & message state
'use client';

import { create } from 'zustand';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { ChatWithDetails, Message, Profile } from '@/types';
import { useAuthStore } from '@/store/auth-store';
import { cacheMessages, getCachedMessages, cacheChatList, getCachedChatList } from '@/lib/message-cache';

interface ChatState {
  chats: ChatWithDetails[];
  activeChat: ChatWithDetails | null;
  activeChatId: string | null;
  messages: Message[];
  messagesByChat: Record<string, Message[]>;
  isLoadingChats: boolean;
  isLoadingMessages: boolean;
  hasMoreMessages: boolean;
  searchQuery: string;
  _hasFetchedOnce: boolean;
  _fetchedChats: Record<string, boolean>;
  replyingTo: Message | null;
  editingMessage: Message | null;
  selectionMode: boolean;
  selectedMessageIds: string[];

  // Actions
  fetchChats: () => Promise<void>;
  setActiveChat: (chatId: string | null) => Promise<void>;
  fetchMessages: (chatId: string, before?: string) => Promise<void>;
  lastNewMessageAt: number | null;
  sendMessage: (chatId: string, content: string, messageType?: string, mediaUrl?: string, mediaMetadata?: Record<string, unknown>, replyToId?: string) => Promise<Message | null>;
  markAsRead: (chatId: string) => Promise<void>;
  addMessage: (message: Message) => void;
  updateMessageInList: (message: Message) => void;
  setSearchQuery: (query: string) => void;
  startDirectChat: (otherUserId: string) => Promise<string | null>;
  createGroupChat: (name: string, participantIds: string[], description?: string) => Promise<string | null>;
  resetUnreadCount: (chatId: string) => void;
  updateChatWithNewMessage: (chatId: string, message: Message) => void;
  incrementUnreadCount: (chatId: string) => void;
  setReplyingTo: (message: Message | null) => void;
  setEditingMessage: (message: Message | null) => void;
  editMessage: (messageId: string, newContent: string) => Promise<void>;
  retryMessage: (messageId: string, chatId: string, content: string, messageType?: string, mediaUrl?: string, mediaMetadata?: Record<string, unknown>, replyToId?: string) => Promise<void>;
  initOfflineQueue: () => void;
  deleteMessageForMe: (messageId: string) => Promise<void>;
  deleteMessageForEveryone: (messageId: string) => Promise<void>;
  pinMessage: (chatId: string, messageId: string, scope: 'me' | 'everyone') => Promise<void>;
  unpinMessage: (chatId: string, scope: 'me' | 'everyone') => Promise<void>;
  starMessage: (messageId: string) => Promise<void>;
  unstarMessage: (messageId: string) => Promise<void>;
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  removeReaction: (messageId: string, emoji: string) => Promise<void>;
  toggleSelectionMode: (force?: boolean) => void;
  toggleMessageSelection: (messageId: string) => void;
  clearSelection: () => void;
  deleteChat: (chatId: string) => Promise<void>;
  updateGroupSettings: (chatId: string, settings: { name?: string; description?: string; iconUrl?: string; adminOnlyMessages?: boolean }) => Promise<void>;
  removeGroupMember: (chatId: string, userId: string) => Promise<void>;
  setMemberRole: (chatId: string, userId: string, role: 'admin' | 'member') => Promise<void>;
  addGroupMembers: (chatId: string, memberIds: string[]) => Promise<void>;
  leaveGroup: (chatId: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  activeChat: null,
  activeChatId: null,
  messages: [],
  messagesByChat: {},
  isLoadingChats: false,
  isLoadingMessages: false,
  hasMoreMessages: true,
  searchQuery: '',
  _hasFetchedOnce: false,
  _fetchedChats: {},
  replyingTo: null,
  editingMessage: null,
  selectionMode: false,
  selectedMessageIds: [],
  lastNewMessageAt: null,

  fetchChats: async () => {
    const hasCachedChats = get().chats.length > 0;
    
    // Only show loading spinner on first load — subsequent fetches are silent background refreshes
    if (!hasCachedChats) {
      set({ isLoadingChats: true });

      // Instantly load cached chat list from IndexedDB while we fetch from network
      try {
        const cachedChats = await getCachedChatList();
        if (cachedChats && cachedChats.length > 0 && get().chats.length === 0) {
          set({ chats: cachedChats as ChatWithDetails[], isLoadingChats: false });
        }
      } catch (e) {
        // Ignore cache read errors
      }
    }

    const supabase = getSupabaseBrowserClient();
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ isLoadingChats: false });
      return;
    }

    try {
      // Step 1: Get our participations (needed to know which chats to fetch)
      const { data: myParticipations, error: partError } = await supabase
        .from('chat_participants')
        .select('chat_id, role, unread_count')
        .eq('user_id', user.id);

      if (partError) throw partError;

      if (!myParticipations?.length) {
        set({ chats: [], isLoadingChats: false, _hasFetchedOnce: true });
        return;
      }

      const chatIds = myParticipations.map((p) => p.chat_id);

      // Step 2: Fetch chats, participants, and messages IN PARALLEL
      const [chatsResult, participantsResult] = await Promise.all([
        supabase
          .from('chats')
          .select('*')
          .in('id', chatIds)
          .order('last_message_at', { ascending: false, nullsFirst: false }),
        supabase
          .from('chat_participants')
          .select('*, profile:profiles(*)')
          .in('chat_id', chatIds),
      ]);

      if (chatsResult.error) throw chatsResult.error;
      if (participantsResult.error) throw participantsResult.error;

      const chatsData = chatsResult.data;
      const allParticipants = participantsResult.data;

      if (!chatsData) {
        set({ chats: [], isLoadingChats: false, _hasFetchedOnce: true });
        return;
      }

      // Step 3: Fetch last messages in parallel (only if we have message IDs)
      const lastMessageIds = chatsData
        .map((c) => c.last_message_id)
        .filter(Boolean);

      let lastMessages: Message[] = [];
      if (lastMessageIds.length) {
        const { data } = await supabase
          .from('messages')
          .select('*')
          .in('id', lastMessageIds);
        lastMessages = (data || []) as Message[];
      }

      // Build ChatWithDetails
      const currentActiveChatId = get().activeChatId;

      const chats: ChatWithDetails[] = chatsData.map((chat) => {
        const participants = (allParticipants || []).filter(
          (p) => p.chat_id === chat.id
        );
        const myParticipant = myParticipations.find(
          (p) => p.chat_id === chat.id
        );
        const otherParticipant = participants.find(
          (p) => p.user_id !== user.id
        );
        const lastMessage = lastMessages.find(
          (m) => m.id === chat.last_message_id
        );

        // If this is the currently active (open) chat, always treat unread_count
        // as 0 — the user is reading it right now. This prevents a background
        // fetchChats() from restoring a stale DB-incremented count.
        const effectiveUnreadCount =
          chat.id === currentActiveChatId ? 0 : (myParticipant?.unread_count ?? 0);

        return {
          ...chat,
          participants,
          last_message: lastMessage,
          other_user: !chat.is_group && otherParticipant
            ? otherParticipant.profile
            : undefined,
          my_participant: myParticipant
            ? { ...myParticipant, id: '', chat_id: chat.id, user_id: user.id, joined_at: '', unread_count: effectiveUnreadCount }
            : undefined,
        } as ChatWithDetails;
      });

      // Also sync activeChat so pinned messages, group name changes, etc.
      // are reflected for the receiver in real-time without re-entering the chat.
      const updatedActiveChat = currentActiveChatId
        ? chats.find((c) => c.id === currentActiveChatId) ?? null
        : null;

      set({
        chats,
        isLoadingChats: false,
        _hasFetchedOnce: true,
        ...(updatedActiveChat ? { activeChat: updatedActiveChat } : {}),
      });

      // Persist chat list to IndexedDB for instant loading next session
      cacheChatList(chats).catch(() => {});
    } catch (err: any) {
      const errMsg = err?.message || err?.toString?.() || JSON.stringify(err) || String(err);
      if (typeof errMsg === 'string' && errMsg.toLowerCase().includes('fetch')) {
        console.warn('Network offline or Failed to fetch chats (will retry naturally later).');
      } else {
        console.warn('fetchChats error (non-fetch):', errMsg);
      }
      set({ isLoadingChats: false });
    }
  },

  setActiveChat: async (chatId: string | null) => {
    if (!chatId) {
      // Only clear the view state — preserve message cache + fetched flags
      // so re-entering a chat loads instantly from cache without a full network round trip
      set({ activeChat: null, activeChatId: null, messages: [] });
      return;
    }

    let cached = get().messagesByChat[chatId];

    // If no in-memory cache, try IndexedDB for instant display
    if (!cached || cached.length === 0) {
      try {
        const idbMessages = await getCachedMessages(chatId);
        if (idbMessages && idbMessages.length > 0) {
          cached = idbMessages as Message[];
          // Pre-populate the in-memory cache
          set((state) => ({
            messagesByChat: { ...state.messagesByChat, [chatId]: cached! },
          }));
        }
      } catch (e) {
        // Ignore cache read errors
      }
    }

    set({ 
      activeChatId: chatId,
      messages: cached || [],
      hasMoreMessages: cached ? cached.length >= 20 : true
    });

    const chat = get().chats.find((c) => c.id === chatId);
    if (chat) {
      set({ activeChat: chat });
    }

    // IMMEDIATELY clear the unread badge — don't wait for the async DB call.
    // This prevents the race where a background fetchChats() reloads the
    // DB-incremented count before markAsRead has had a chance to reset it.
    get().resetUnreadCount(chatId);

    // ALWAYS fetch messages fresh to ensure consistency — don't skip based on cache
    await get().fetchMessages(chatId);
    // Mark as read (resets DB count + marks statuses as seen)
    await get().markAsRead(chatId);
  },

  fetchMessages: async (chatId: string, before?: string) => {
    const hasCached = (get().messagesByChat[chatId]?.length || 0) > 0;
    if (!before && !hasCached) {
      set({ isLoadingMessages: true });
    }
    const supabase = getSupabaseBrowserClient();

    try {
      // Build query — try with advanced features, fall back to basic if tables don't exist
      const buildQuery = (advanced: boolean) => {
        const selectStr = advanced
          ? '*, sender:profiles!messages_sender_id_fkey(*), status:message_status(*), reply_to:messages!messages_reply_to_id_fkey(*), stars:message_stars!message_stars_message_id_fkey(*), reactions:message_reactions!message_reactions_message_id_fkey(*, profile:profiles!message_reactions_user_id_fkey(*)), deletions:message_deletions!message_deletions_message_id_fkey(*)'
          : '*, sender:profiles(*), status:message_status(*), reply_to:messages(*)';
        
        let q = supabase
          .from('messages')
          .select(selectStr)
          .eq('chat_id', chatId)
          .order('created_at', { ascending: false })
          .limit(20);

        if (before) {
          q = q.lt('created_at', before);
        }
        return q;
      };

      let { data, error } = await buildQuery(true);
      
      // Fallback to basic query if advanced tables don't exist
      if (error && (error.message?.includes('schema cache') || error.message?.includes('relationship'))) {
        console.warn('Advanced interaction tables not found, falling back to basic query');
        const result = await buildQuery(false);
        data = result.data;
        error = result.error;
      }

      if (error) throw error;

      const user = useAuthStore.getState().user;
      const rawMessages = (data || []) as Message[];
      
      const localDeletedIds = typeof localStorage !== 'undefined' && user ? JSON.parse(localStorage.getItem(`deleted-messages-${user.id}`) || '[]') : [];

      // Filter out messages deleted for ME (from DB or local fallback)
      const filteredMessages = rawMessages.filter(m => 
        !localDeletedIds.includes(m.id) && !m.deletions?.some(d => d.user_id === user?.id)
      );

      const messages = filteredMessages.reverse();

      if (before) {
        // Prepend older messages
        set((state) => {
          const combined = [...messages, ...state.messages];
          return {
            messages: combined,
            messagesByChat: { ...state.messagesByChat, [chatId]: combined },
            hasMoreMessages: messages.length === 20,
            isLoadingMessages: false,
          };
        });
      } else {
        set((state) => {
          const cached = state.messagesByChat[chatId] || [];
          
          // Instead of wiping out the cache, merge the newly fetched messages (latest 20)
          // with our existing cache to preserve scroll history and offline messages.
          const msgMap = new Map(cached.map(m => [m.id, m]));
          messages.forEach(m => msgMap.set(m.id, m));
          
          const mergedMessages = Array.from(msgMap.values()).sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );

          // Persist to IndexedDB in the background for next session
          cacheMessages(chatId, mergedMessages).catch(() => {});

          return {
            messages: mergedMessages,
            messagesByChat: { ...state.messagesByChat, [chatId]: mergedMessages },
            hasMoreMessages: cached.length > 0 ? state.hasMoreMessages : messages.length === 20,
            isLoadingMessages: false,
            _fetchedChats: { ...state._fetchedChats, [chatId]: true }
          };
        });
      }
    } catch (err: any) {
      const errMsg = err?.message || err?.toString?.() || JSON.stringify(err) || String(err);
      if (typeof errMsg === 'string' && errMsg.toLowerCase().includes('fetch')) {
        console.warn('Network offline or Failed to fetch messages (will retry naturally later).');
      } else {
        console.warn('fetchMessages error (non-fetch):', errMsg);
      }
      // CRITICAL: Always mark as fetched even on error so realtime can still subscribe
      // This prevents the chat from being permanently stuck with no realtime updates
      set((state) => ({ 
        isLoadingMessages: false,
        _fetchedChats: { ...state._fetchedChats, [chatId]: true }
      }));
    }
  },

  sendMessage: async (chatId, content, messageType = 'text', mediaUrl, mediaMetadata, replyToId) => {
    const supabase = getSupabaseBrowserClient();
    const user = useAuthStore.getState().user;
    const profile = useAuthStore.getState().profile;
    if (!user) {
      console.error('[ChatStore] No user found - cannot send message');
      return null;
    }

    const messageId = crypto.randomUUID();
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    const replyingToMessage = replyToId ? get().messages.find(m => m.id === replyToId) : null;

    // 1. Create Optimistic Message
    const optimisticMessage = {
      id: messageId,
      chat_id: chatId,
      sender_id: user.id,
      content,
      message_type: messageType as any,
      media_url: mediaUrl || null,
      media_metadata: mediaMetadata || null,
      reply_to_id: replyToId || null,
      reply_to: replyingToMessage ? [replyingToMessage] : undefined,
      is_deleted: false,
      created_at: new Date().toISOString(),
      sender: profile || undefined,
      status: [{ 
        id: 'temp', 
        message_id: messageId, 
        user_id: user.id, 
        status: isOffline ? 'queued' : 'sent', 
        updated_at: new Date().toISOString() 
      }],
    } as Message;

    console.log(`[ChatStore] Optimistic send: id=${messageId} user=${user.id}`);

    // 2. Instantly show it on screen
    get().addMessage(optimisticMessage);
    get().updateChatWithNewMessage(chatId, optimisticMessage);

    if (isOffline) {
      const queue = JSON.parse(localStorage.getItem('offline-messages-queue') || '[]');
      queue.push({ chatId, content, messageType, mediaUrl, mediaMetadata, replyToId, optimisticId: messageId });
      localStorage.setItem('offline-messages-queue', JSON.stringify(queue));
      return optimisticMessage;
    }

    // 3. Send to Database in background
    const { error } = await supabase
      .from('messages')
      .insert({
        id: messageId,
        chat_id: chatId,
        sender_id: user.id,
        content: content || null,
        message_type: messageType,
        media_url: mediaUrl || null,
        media_metadata: mediaMetadata || null,
        reply_to_id: replyToId || null,
      });

    if (error) {
      console.error('[ChatStore] Supabase insert failed:', error);
      
      // Push to offline queue so it survives a browser refresh and can be retried
      const queue = JSON.parse(localStorage.getItem('offline-messages-queue') || '[]');
      queue.push({ chatId, content, messageType, mediaUrl, mediaMetadata, replyToId, optimisticId: messageId });
      localStorage.setItem('offline-messages-queue', JSON.stringify(queue));

      // Mark as queued/failed so the user sees it hasn't gone through yet
      get().updateMessageInList({
        ...optimisticMessage,
        status: [{ id: 'temp', message_id: messageId, user_id: user.id, status: 'queued', updated_at: new Date().toISOString() }],
      });
      
      // Show error toast if possible
      if (typeof window !== 'undefined') {
        const toast = (await import('react-hot-toast')).default;
        toast.error('Network disconnected. Message queued and will retry.');
      }
      return optimisticMessage;
    }

    return optimisticMessage;
  },

  markAsRead: async (chatId: string) => {
    const supabase = getSupabaseBrowserClient();
    const user = useAuthStore.getState().user;
    if (!user) return;

    // Reset local unread badge IMMEDIATELY (optimistic) before any async work.
    // This ensures the badge disappears the instant you open the chat and never
    // reappears due to a background fetchChats() loading the stale DB value.
    get().resetUnreadCount(chatId);

    // Reset unread count in DB
    await supabase
      .from('chat_participants')
      .update({ unread_count: 0 })
      .eq('chat_id', chatId)
      .eq('user_id', user.id);

    // Update message statuses to 'seen'
    const { data: unreadStatuses } = await supabase
      .from('message_status')
      .select('id')
      .eq('user_id', user.id)
      .in('status', ['sent', 'delivered'])
      .in(
        'message_id',
        get()
          .messages.filter((m) => m.sender_id !== user.id)
          .map((m) => m.id)
      );

    if (unreadStatuses?.length) {
      await supabase
        .from('message_status')
        .update({ status: 'seen', updated_at: new Date().toISOString() })
        .in('id', unreadStatuses.map((s) => s.id));
    }
  },

  addMessage: (message: Message) => {
    set((state) => {
      const chatId = message.chat_id;
      const cached = state.messagesByChat[chatId] || [];
      if (cached.some((m) => m.id === message.id)) return state;
      
      const newCache = [...cached, message];
      const updates: Partial<ChatState> = {
        messagesByChat: { ...state.messagesByChat, [chatId]: newCache }
      };
      if (state.activeChatId === chatId) {
        updates.messages = [...state.messages, message];
      }
      return updates;
    });

    // Update chat list with the new message
    get().updateChatWithNewMessage(message.chat_id, message);
  },

  updateChatWithNewMessage: (chatId: string, message: Message) => {
    set((state) => ({
      chats: state.chats
        .map((c) =>
          c.id === chatId
            ? { ...c, last_message: message, last_message_at: message.created_at }
            : c
        )
        .sort((a, b) => {
          const aTime = a.last_message_at || a.created_at;
          const bTime = b.last_message_at || b.created_at;
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        }),
    }));
  },

  incrementUnreadCount: (chatId: string) => {
    const activeChatId = get().activeChatId;
    
    // Trigger global shake for new message arrival
    set({ lastNewMessageAt: Date.now() });

    // Don't increment if we're currently viewing this chat
    if (activeChatId === chatId) return;

    set((state) => ({
      chats: state.chats.map((c) =>
        c.id === chatId && c.my_participant
          ? { ...c, my_participant: { ...c.my_participant, unread_count: (c.my_participant.unread_count || 0) + 1 } }
          : c
      ),
    }));
  },

  updateMessageInList: (message: Message) => {
    set((state) => {
      const chatId = message.chat_id;
      const cached = state.messagesByChat[chatId] || [];
      const newCache = cached.map((m) => (m.id === message.id ? { ...message, sender: m.sender } : m));
      
      const updates: Partial<ChatState> = {
        messagesByChat: { ...state.messagesByChat, [chatId]: newCache }
      };
      if (state.activeChatId === chatId) {
        updates.messages = state.messages.map((m) => (m.id === message.id ? { ...message, sender: m.sender } : m));
      }
      return updates;
    });
  },

  setSearchQuery: (query: string) => set({ searchQuery: query }),

  startDirectChat: async (otherUserId: string) => {
    const supabase = getSupabaseBrowserClient();

    const { data, error } = await supabase.rpc('find_or_create_direct_chat', {
      other_user_id: otherUserId,
    });

    if (error) {
      console.error('startDirectChat error:', error);
      if (typeof window !== 'undefined') {
        const { toast } = require('react-hot-toast');
        toast.error(`Chat Error: ${error.message}`);
      }
      return null;
    }

    // Refresh chats
    await get().fetchChats();
    return data as string;
  },

  createGroupChat: async (name: string, participantIds: string[], description?: string) => {
    const supabase = getSupabaseBrowserClient();
    const user = useAuthStore.getState().user;
    if (!user) return null;

    // Use SECURITY DEFINER RPC to atomically create the group and add all participants
    // in one server-side transaction. This avoids the RLS deadlock where
    // is_chat_admin() returns false because the creator record doesn't exist yet
    // at the time the first chat_participants INSERT is evaluated.
    const { data: chatId, error } = await supabase.rpc('create_group_chat_with_members', {
      p_name: name,
      p_description: description || null,
      p_member_ids: participantIds,
    });

    if (error || !chatId) {
      console.error('createGroupChat RPC error:', error);
      if (typeof window !== 'undefined') {
        const toast = (await import('react-hot-toast')).default;
        toast.error(`Failed to create group: ${error?.message || 'Unknown error'}`);
      }
      return null;
    }

    await get().fetchChats();
    return chatId as string;
  },

  resetUnreadCount: (chatId: string) => {
    set((state) => ({
      chats: state.chats.map((c) =>
        c.id === chatId && c.my_participant
          ? { ...c, my_participant: { ...c.my_participant, unread_count: 0 } }
          : c
      ),
    }));
  },

  setReplyingTo: (message: Message | null) => {
    set({ replyingTo: message });
  },

  setEditingMessage: (message: Message | null) => {
    set({ editingMessage: message });
  },

  editMessage: async (messageId: string, newContent: string) => {
    const supabase = getSupabaseBrowserClient();
    
    // Optimistic cache update
    set((state) => {
      const msgs = state.messages.map((m) =>
        m.id === messageId ? { ...m, content: newContent } : m
      );
      const msgsByChat = Object.fromEntries(
        Object.entries(state.messagesByChat).map(([cId, chatMsgs]) => [
          cId,
          chatMsgs.map((m) =>
            m.id === messageId ? { ...m, content: newContent } : m
          ),
        ])
      );
      return { messages: msgs, messagesByChat: msgsByChat };
    });

    const { error } = await supabase
      .from('messages')
      .update({ content: newContent })
      .eq('id', messageId);

    if (error) {
      console.error('editMessage error:', error);
      if (typeof window !== 'undefined') {
        const { toast } = require('react-hot-toast');
        toast.error(`Edit Error: ${error.message}`);
      }
    }
  },

  retryMessage: async (messageId, chatId, content, messageType = 'text', mediaUrl, mediaMetadata, replyToId) => {
    const supabase = getSupabaseBrowserClient();
    const user = useAuthStore.getState().user;
    if (!user) return;

    // Optimistically set to sending (sent)
    const existing = get().messages.find(m => m.id === messageId);
    if (existing) {
      get().updateMessageInList({
        ...existing,
        status: [{ id: 'temp', message_id: messageId, user_id: '', status: 'sent', updated_at: new Date().toISOString() }],
      });
    }

    const { error } = await supabase
      .from('messages')
      .insert({
        id: messageId,
        chat_id: chatId,
        sender_id: user.id,
        content,
        message_type: messageType,
        media_url: mediaUrl || null,
        media_metadata: mediaMetadata || null,
        reply_to_id: replyToId || null,
      });

    if (error) {
      // Mark as failed again
      if (existing) {
        get().updateMessageInList({
          ...existing,
          status: [{ id: 'temp', message_id: messageId, user_id: '', status: 'failed', updated_at: new Date().toISOString() }],
        });
      }
    } else {
      // Remove from queue if it was there
      const queue = JSON.parse(localStorage.getItem('offline-messages-queue') || '[]');
      const newQueue = queue.filter((q: any) => q.optimisticId !== messageId);
      localStorage.setItem('offline-messages-queue', JSON.stringify(newQueue));
    }
  },

  initOfflineQueue: () => {
    if (typeof window === 'undefined') return;
    
    const handleOnline = async () => {
      console.log('[Offline] Network restored — flushing queue and syncing...');

      // 1. Flush queued messages sequentially
      const queue = JSON.parse(localStorage.getItem('offline-messages-queue') || '[]');
      if (queue.length > 0) {
        const toast = (await import('react-hot-toast')).default;
        toast.success(`Sending ${queue.length} queued message${queue.length > 1 ? 's' : ''}…`, {
          icon: '📤',
          duration: 2000,
        });
        for (const q of queue) {
          await get().retryMessage(q.optimisticId, q.chatId, q.content, q.messageType, q.mediaUrl, q.mediaMetadata, q.replyToId);
        }
      }

      // 2. Refresh chat list to sync any messages received while offline
      await get().fetchChats();

      // 3. If user has an active chat open, refresh its messages too
      const activeChatId = get().activeChatId;
      if (activeChatId) {
        await get().fetchMessages(activeChatId);
      }
    };

    window.addEventListener('online', handleOnline);

    // Also run immediately on boot if we are already online
    if (navigator.onLine) {
      setTimeout(handleOnline, 1000); // Give the app a second to boot up before flushing
    }
  },

  deleteMessageForMe: async (messageId: string) => {
    const supabase = getSupabaseBrowserClient();
    const user = useAuthStore.getState().user;
    if (!user) return;

    // Save to localStorage as a reliable local fallback to keep it permanently hidden
    if (typeof localStorage !== 'undefined') {
      const localDeletedIds = JSON.parse(localStorage.getItem(`deleted-messages-${user.id}`) || '[]');
      if (!localDeletedIds.includes(messageId)) {
        localDeletedIds.push(messageId);
        localStorage.setItem(`deleted-messages-${user.id}`, JSON.stringify(localDeletedIds));
      }
    }

    // Optimistically hide it
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== messageId),
      messagesByChat: Object.fromEntries(
        Object.entries(state.messagesByChat).map(([cId, msgs]) => [
          cId,
          msgs.filter((m) => m.id !== messageId)
        ])
      )
    }));

    // Try to save to DB (this syncs across devices if DB RLS allows)
    const { error } = await supabase.from('message_deletions').insert({
      user_id: user.id,
      message_id: messageId,
    });
    if (error) {
      console.warn('[ChatStore] message_deletions insert failed, relying on localStorage fallback:', error.message);
    }
  },

  deleteMessageForEveryone: async (messageId: string) => {
    const supabase = getSupabaseBrowserClient();
    
    // Check if message is already marked as deleted (unsent) — if so, fully remove from local view
    const existingMsg = get().messages.find(m => m.id === messageId);
    if (existingMsg?.is_deleted) {
      // Already unsent in DB (is_deleted=true), just remove from local view
      set((state) => ({
        messages: state.messages.filter((m) => m.id !== messageId),
        messagesByChat: Object.fromEntries(
          Object.entries(state.messagesByChat).map(([cId, msgs]) => [
            cId,
            msgs.filter((m) => m.id !== messageId)
          ])
        )
      }));
      return;
    }

    // Optimistically update — mark as deleted for everyone
    set((state) => ({
      messages: state.messages.map((m) => 
        m.id === messageId ? { ...m, is_deleted: true } : m
      ),
      messagesByChat: Object.fromEntries(
        Object.entries(state.messagesByChat).map(([cId, msgs]) => [
          cId,
          msgs.map((m) => m.id === messageId ? { ...m, is_deleted: true } : m)
        ])
      )
    }));

    await supabase.from('messages').update({ is_deleted: true }).eq('id', messageId);
  },

  pinMessage: async (chatId: string, messageId: string, scope: 'me' | 'everyone') => {
    const supabase = getSupabaseBrowserClient();
    const user = useAuthStore.getState().user;
    if (!user) return;

    if (scope === 'everyone') {
      set((state) => ({
        chats: state.chats.map((c) => 
          c.id === chatId ? { ...c, pinned_message_id: messageId } : c
        ),
        activeChat: state.activeChat?.id === chatId 
          ? { ...state.activeChat, pinned_message_id: messageId } 
          : state.activeChat,
      }));
      await supabase.from('chats').update({ pinned_message_id: messageId }).eq('id', chatId);
    } else {
      set((state) => {
        const updatedActiveChat = state.activeChat?.id === chatId && state.activeChat.my_participant
          ? { ...state.activeChat, my_participant: { ...state.activeChat.my_participant, pinned_message_id: messageId } }
          : state.activeChat;

        return {
          chats: state.chats.map((c) => 
            c.id === chatId && c.my_participant ? { ...c, my_participant: { ...c.my_participant, pinned_message_id: messageId } } : c
          ),
          activeChat: updatedActiveChat as any,
        };
      });
      await supabase.from('chat_participants').update({ pinned_message_id: messageId }).eq('chat_id', chatId).eq('user_id', user.id);
    }
  },

  unpinMessage: async (chatId: string, scope: 'me' | 'everyone') => {
    const supabase = getSupabaseBrowserClient();
    const user = useAuthStore.getState().user;
    if (!user) return;

    if (scope === 'everyone') {
      set((state) => ({
        chats: state.chats.map((c) => 
          c.id === chatId ? { ...c, pinned_message_id: null } : c
        ),
        activeChat: state.activeChat?.id === chatId 
          ? { ...state.activeChat, pinned_message_id: null } 
          : state.activeChat,
      }));
      await supabase.from('chats').update({ pinned_message_id: null }).eq('id', chatId);
    } else {
      set((state) => {
        const updatedActiveChat = state.activeChat?.id === chatId && state.activeChat.my_participant
          ? { ...state.activeChat, my_participant: { ...state.activeChat.my_participant, pinned_message_id: null } }
          : state.activeChat;

        return {
          chats: state.chats.map((c) => 
            c.id === chatId && c.my_participant ? { ...c, my_participant: { ...c.my_participant, pinned_message_id: null } } : c
          ),
          activeChat: updatedActiveChat as any,
        };
      });
      await supabase.from('chat_participants').update({ pinned_message_id: null }).eq('chat_id', chatId).eq('user_id', user.id);
    }
  },

  starMessage: async (messageId: string) => {
    const supabase = getSupabaseBrowserClient();
    const user = useAuthStore.getState().user;
    if (!user) return;

    // Optimistic update
    set((state) => ({
      messages: state.messages.map((m) => 
        m.id === messageId ? { 
          ...m, 
          stars: [...(m.stars || []), { id: 'temp', user_id: user.id, message_id: messageId, created_at: '' }] 
        } : m
      ),
      messagesByChat: Object.fromEntries(
        Object.entries(state.messagesByChat).map(([cId, msgs]) => [
          cId,
          msgs.map((m) => m.id === messageId ? { ...m, stars: [...(m.stars || []), { id: 'temp', user_id: user.id, message_id: messageId, created_at: '' }] } : m)
        ])
      )
    }));

    await supabase.from('message_stars').insert({ user_id: user.id, message_id: messageId });
  },

  unstarMessage: async (messageId: string) => {
    const supabase = getSupabaseBrowserClient();
    const user = useAuthStore.getState().user;
    if (!user) return;

    set((state) => ({
      messages: state.messages.map((m) => 
        m.id === messageId ? { 
          ...m, 
          stars: (m.stars || []).filter(s => s.user_id !== user.id) 
        } : m
      ),
      messagesByChat: Object.fromEntries(
        Object.entries(state.messagesByChat).map(([cId, msgs]) => [
          cId,
          msgs.map((m) => m.id === messageId ? { ...m, stars: (m.stars || []).filter(s => s.user_id !== user.id) } : m)
        ])
      )
    }));

    await supabase.from('message_stars').delete().eq('user_id', user.id).eq('message_id', messageId);
  },

  deleteChat: async (chatId: string) => {
    const supabase = getSupabaseBrowserClient();
    const user = useAuthStore.getState().user;
    if (!user) return;
    
    set((state) => ({
      chats: state.chats.filter(c => c.id !== chatId),
      activeChat: state.activeChatId === chatId ? null : state.activeChat,
      activeChatId: state.activeChatId === chatId ? null : state.activeChatId,
    }));

    const { error } = await supabase
      .from('chat_participants')
      .delete()
      .eq('chat_id', chatId)
      .eq('user_id', user.id);
      
    if (error) {
       console.error('Failed to delete chat', JSON.stringify(error, null, 2));
    }
  },

  addReaction: async (messageId: string, emoji: string) => {
    const supabase = getSupabaseBrowserClient();
    const user = useAuthStore.getState().user;
    const profile = useAuthStore.getState().profile;
    if (!user || !profile) return;

    // Optimistic
    set((state) => {
      const msgs = state.messages.map((m) => {
        if (m.id !== messageId) return m;
        // remove existing reaction by user if any
        const filtered = (m.reactions || []).filter(r => r.user_id !== user.id);
        return {
          ...m,
          reactions: [...filtered, { id: 'temp', user_id: user.id, message_id: messageId, emoji, created_at: '', profile }],
        };
      });
      const msgsByChat = Object.fromEntries(
        Object.entries(state.messagesByChat).map(([cId, chatMsgs]) => [
          cId,
          chatMsgs.map((m) => {
            if (m.id !== messageId) return m;
            const filtered = (m.reactions || []).filter(r => r.user_id !== user.id);
            return {
              ...m,
              reactions: [...filtered, { id: 'temp', user_id: user.id, message_id: messageId, emoji, created_at: '', profile }],
            };
          })
        ])
      );
      return { messages: msgs, messagesByChat: msgsByChat };
    });

    // Delete existing first to avoid unique constraint if changing emoji
    await supabase.from('message_reactions').delete().eq('user_id', user.id).eq('message_id', messageId);
    await supabase.from('message_reactions').insert({ user_id: user.id, message_id: messageId, emoji });
  },

  removeReaction: async (messageId: string, emoji: string) => {
    const supabase = getSupabaseBrowserClient();
    const user = useAuthStore.getState().user;
    if (!user) return;

    set((state) => ({
      messages: state.messages.map((m) => 
        m.id === messageId ? { 
          ...m, 
          reactions: (m.reactions || []).filter(r => !(r.user_id === user.id && r.emoji === emoji)) 
        } : m
      ),
      messagesByChat: Object.fromEntries(
        Object.entries(state.messagesByChat).map(([cId, msgs]) => [
          cId,
          msgs.map((m) => m.id === messageId ? { ...m, reactions: (m.reactions || []).filter(r => !(r.user_id === user.id && r.emoji === emoji)) } : m)
        ])
      )
    }));

    await supabase.from('message_reactions').delete().eq('user_id', user.id).eq('message_id', messageId).eq('emoji', emoji);
  },

  toggleSelectionMode: (force?: boolean) => {
    set(state => {
      const active = force !== undefined ? force : !state.selectionMode;
      return {
        selectionMode: active,
        selectedMessageIds: active ? state.selectedMessageIds : []
      };
    });
  },

  toggleMessageSelection: (messageId: string) => {
    set(state => {
      const selected = state.selectedMessageIds.includes(messageId);
      return {
        selectedMessageIds: selected
          ? state.selectedMessageIds.filter(id => id !== messageId)
          : [...state.selectedMessageIds, messageId]
      };
    });
  },

  clearSelection: () => {
    set({ selectionMode: false, selectedMessageIds: [] });
  },

  updateGroupSettings: async (chatId, settings) => {
    const supabase = getSupabaseBrowserClient();

    // Optimistic update
    set((state) => {
      const update: Partial<ChatWithDetails> = {};
      if (settings.name !== undefined) update.group_name = settings.name;
      if (settings.description !== undefined) update.group_description = settings.description;
      if (settings.iconUrl !== undefined) update.group_icon_url = settings.iconUrl;
      if (settings.adminOnlyMessages !== undefined) update.admin_only_messages = settings.adminOnlyMessages;

      return {
        chats: state.chats.map((c) => c.id === chatId ? { ...c, ...update } : c),
        activeChat: state.activeChat?.id === chatId ? { ...state.activeChat, ...update } : state.activeChat,
      };
    });

    const { error } = await supabase.rpc('update_group_settings', {
      p_chat_id: chatId,
      p_name: settings.name ?? null,
      p_description: settings.description ?? null,
      p_icon_url: settings.iconUrl ?? null,
      p_admin_only_messages: settings.adminOnlyMessages ?? null,
    });

    if (error) {
      console.error('updateGroupSettings error:', error);
      if (typeof window !== 'undefined') {
        const toast = (await import('react-hot-toast')).default;
        toast.error(`Failed to update group: ${error.message}`);
      }
      // Revert on error
      await get().fetchChats();
    }
  },

  removeGroupMember: async (chatId, userId) => {
    const supabase = getSupabaseBrowserClient();

    // Optimistic: remove participant from list
    set((state) => {
      const filterParticipants = (c: ChatWithDetails) => ({
        ...c,
        participants: c.participants.filter((p) => p.user_id !== userId),
      });
      return {
        chats: state.chats.map((c) => c.id === chatId ? filterParticipants(c) : c),
        activeChat: state.activeChat?.id === chatId ? filterParticipants(state.activeChat) : state.activeChat,
      };
    });

    const { error } = await supabase.rpc('remove_group_member', {
      p_chat_id: chatId,
      p_user_id: userId,
    });

    if (error) {
      console.error('removeGroupMember error:', error);
      if (typeof window !== 'undefined') {
        const toast = (await import('react-hot-toast')).default;
        toast.error(`Failed to remove member: ${error.message}`);
      }
      await get().fetchChats();
    }
  },

  setMemberRole: async (chatId, userId, role) => {
    const supabase = getSupabaseBrowserClient();

    // Optimistic update
    set((state) => {
      const updateRole = (c: ChatWithDetails) => ({
        ...c,
        participants: c.participants.map((p) =>
          p.user_id === userId ? { ...p, role } : p
        ),
      });
      return {
        chats: state.chats.map((c) => c.id === chatId ? updateRole(c) : c),
        activeChat: state.activeChat?.id === chatId ? updateRole(state.activeChat) : state.activeChat,
      };
    });

    const { error } = await supabase.rpc('set_member_role', {
      p_chat_id: chatId,
      p_user_id: userId,
      p_role: role,
    });

    if (error) {
      console.error('setMemberRole error:', error);
      if (typeof window !== 'undefined') {
        const toast = (await import('react-hot-toast')).default;
        toast.error(`Failed to change role: ${error.message}`);
      }
      await get().fetchChats();
    }
  },

  addGroupMembers: async (chatId, memberIds) => {
    const supabase = getSupabaseBrowserClient();

    const { error } = await supabase.rpc('add_group_members', {
      p_chat_id: chatId,
      p_member_ids: memberIds,
    });

    if (error) {
      console.error('addGroupMembers error:', error);
      if (typeof window !== 'undefined') {
        const toast = (await import('react-hot-toast')).default;
        toast.error(`Failed to add members: ${error.message}`);
      }
    }

    // Always refresh to get full participant profiles
    await get().fetchChats();
    // Also refresh activeChat
    const activeChatId = get().activeChatId;
    if (activeChatId === chatId) {
      const updatedChat = get().chats.find(c => c.id === chatId);
      if (updatedChat) set({ activeChat: updatedChat });
    }
  },

  leaveGroup: async (chatId) => {
    const supabase = getSupabaseBrowserClient();

    // Optimistic: remove chat from list
    set((state) => ({
      chats: state.chats.filter((c) => c.id !== chatId),
      activeChat: state.activeChatId === chatId ? null : state.activeChat,
      activeChatId: state.activeChatId === chatId ? null : state.activeChatId,
    }));

    const { error } = await supabase.rpc('leave_group', {
      p_chat_id: chatId,
    });

    if (error) {
      console.error('leaveGroup error:', error);
      if (typeof window !== 'undefined') {
        const toast = (await import('react-hot-toast')).default;
        toast.error(`Failed to leave group: ${error.message}`);
      }
      await get().fetchChats();
    }
  },
}));
