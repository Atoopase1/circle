// ============================================================
// Chat Store — Zustand store for chat & message state
// ============================================================
'use client';

import { create } from 'zustand';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { ChatWithDetails, Message, Profile } from '@/types';
import { useAuthStore } from '@/store/auth-store';

interface ChatState {
  chats: ChatWithDetails[];
  activeChat: ChatWithDetails | null;
  activeChatId: string | null;
  messages: Message[];
  isLoadingChats: boolean;
  isLoadingMessages: boolean;
  hasMoreMessages: boolean;
  searchQuery: string;
  _hasFetchedOnce: boolean;

  // Actions
  fetchChats: () => Promise<void>;
  setActiveChat: (chatId: string | null) => Promise<void>;
  fetchMessages: (chatId: string, before?: string) => Promise<void>;
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
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  activeChat: null,
  activeChatId: null,
  messages: [],
  isLoadingChats: false,
  isLoadingMessages: false,
  hasMoreMessages: true,
  searchQuery: '',
  _hasFetchedOnce: false,

  fetchChats: async () => {
    const hasCachedChats = get().chats.length > 0;
    
    // Only show loading spinner on first load — subsequent fetches are silent background refreshes
    if (!hasCachedChats) {
      set({ isLoadingChats: true });
    }

    const supabase = getSupabaseBrowserClient();
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ isLoadingChats: false });
      return;
    }

    try {
      // Step 1: Get our participations (needed to know which chats to fetch)
      const { data: myParticipations } = await supabase
        .from('chat_participants')
        .select('chat_id, role, unread_count')
        .eq('user_id', user.id);

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

        return {
          ...chat,
          participants,
          last_message: lastMessage,
          other_user: !chat.is_group && otherParticipant
            ? otherParticipant.profile
            : undefined,
          my_participant: myParticipant
            ? { ...myParticipant, id: '', chat_id: chat.id, user_id: user.id, joined_at: '' }
            : undefined,
        } as ChatWithDetails;
      });

      set({ chats, isLoadingChats: false, _hasFetchedOnce: true });
    } catch (err) {
      console.error('fetchChats error:', err);
      set({ isLoadingChats: false });
    }
  },

  setActiveChat: async (chatId: string | null) => {
    if (!chatId) {
      set({ activeChat: null, activeChatId: null, messages: [] });
      return;
    }

    set({ activeChatId: chatId });

    const chat = get().chats.find((c) => c.id === chatId);
    if (chat) {
      set({ activeChat: chat });
    }

    // Fetch messages
    await get().fetchMessages(chatId);
    // Mark as read
    await get().markAsRead(chatId);
  },

  fetchMessages: async (chatId: string, before?: string) => {
    set({ isLoadingMessages: true });
    const supabase = getSupabaseBrowserClient();

    try {
      let query = supabase
        .from('messages')
        .select('*, sender:profiles(*), status:message_status(*)')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (before) {
        query = query.lt('created_at', before);
      }

      const { data, error } = await query;

      if (error) throw error;

      const messages = ((data || []) as Message[]).reverse();

      if (before) {
        // Prepend older messages
        set((state) => ({
          messages: [...messages, ...state.messages],
          hasMoreMessages: messages.length === 50,
          isLoadingMessages: false,
        }));
      } else {
        set({
          messages,
          hasMoreMessages: messages.length === 50,
          isLoadingMessages: false,
        });
      }
    } catch (err) {
      console.error('fetchMessages error:', err);
      set({ isLoadingMessages: false });
    }
  },

  sendMessage: async (chatId, content, messageType = 'text', mediaUrl, mediaMetadata, replyToId) => {
    const supabase = getSupabaseBrowserClient();
    const user = useAuthStore.getState().user;
    const profile = useAuthStore.getState().profile;
    if (!user) return null;

    const messageId = crypto.randomUUID();
    
    // 1. Create Optimistic Message
    const optimisticMessage = {
      id: messageId,
      chat_id: chatId,
      sender_id: user.id,
      content,
      message_type: messageType,
      media_url: mediaUrl || null,
      media_metadata: mediaMetadata || null,
      reply_to_id: replyToId || null,
      is_deleted: false,
      created_at: new Date().toISOString(),
      sender: profile || undefined,
      status: [],
    } as Message;

    // 2. Instantly show it on screen
    get().addMessage(optimisticMessage);
    get().updateChatWithNewMessage(chatId, optimisticMessage);

    // 3. Send to Database in background (minimal — no heavy joins)
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
      console.error('sendMessage error:', error);
      if (typeof window !== 'undefined') {
        const { toast } = require('react-hot-toast');
        toast.error(`Send Error: ${error.message}`);
      }
      // Remove the optimistic message on failure
      set((state) => ({
        messages: state.messages.filter((m) => m.id !== messageId),
      }));
      return null;
    }

    // 4. Mark optimistic message as "sent" (single checkmark)
    get().updateMessageInList({
      ...optimisticMessage,
      status: [{ id: '', message_id: messageId, user_id: '', status: 'sent', updated_at: new Date().toISOString() }],
    });

    return optimisticMessage;
  },

  markAsRead: async (chatId: string) => {
    const supabase = getSupabaseBrowserClient();
    const user = useAuthStore.getState().user;
    if (!user) return;

    // Reset unread count
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

    // Update local state
    get().resetUnreadCount(chatId);
  },

  addMessage: (message: Message) => {
    set((state) => {
      // Avoid duplicates
      if (state.messages.some((m) => m.id === message.id)) return state;
      return { messages: [...state.messages, message] };
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
    set((state) => ({
      messages: state.messages.map((m) => (m.id === message.id ? { ...message, sender: m.sender } : m)),
    }));
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

    // Create chat
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .insert({
        is_group: true,
        group_name: name,
        group_description: description || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (chatError || !chat) {
      console.error('createGroupChat error:', chatError);
      return null;
    }

    // Add creator as admin
    await supabase.from('chat_participants').insert({
      chat_id: chat.id,
      user_id: user.id,
      role: 'admin',
    });

    // Add other participants
    const participants = participantIds.map((id) => ({
      chat_id: chat.id,
      user_id: id,
      role: 'member' as const,
    }));

    if (participants.length) {
      await supabase.from('chat_participants').insert(participants);
    }

    await get().fetchChats();
    return chat.id;
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
}));
