// ============================================================
// Circle — Type Definitions
// ============================================================

export interface Profile {
  id: string;
  phone: string | null;
  email: string | null;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  is_online: boolean;
  last_seen: string;
  created_at: string;
  updated_at: string;
}

export interface Chat {
  id: string;
  is_group: boolean;
  group_name: string | null;
  group_icon_url: string | null;
  group_description: string | null;
  created_by: string;
  last_message_id: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatParticipant {
  id: string;
  chat_id: string;
  user_id: string;
  role: 'member' | 'admin';
  joined_at: string;
  unread_count: number;
}

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document';
export type MessageStatusType = 'sent' | 'delivered' | 'seen';

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string | null;
  message_type: MessageType;
  media_url: string | null;
  media_metadata: {
    size?: number;
    duration?: number;
    width?: number;
    height?: number;
    filename?: string;
    mime_type?: string;
  } | null;
  reply_to_id: string | null;
  is_deleted: boolean;
  created_at: string;
  // Joined fields
  sender?: Profile;
  reply_to?: Message;
  status?: MessageStatus[];
}

export interface MessageStatus {
  id: string;
  message_id: string;
  user_id: string;
  status: MessageStatusType;
  updated_at: string;
}

// Extended types for UI
export interface ChatWithDetails extends Chat {
  participants: (ChatParticipant & { profile: Profile })[];
  last_message?: Message;
  other_user?: Profile; // For 1-to-1 chats
  my_participant?: ChatParticipant;
}

export interface TypingUser {
  user_id: string;
  display_name: string;
  chat_id: string;
}

export interface PresenceState {
  user_id: string;
  is_online: boolean;
  last_seen: string;
}

// Call types
export type CallType = 'audio' | 'video';
export type CallStatus = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';

export interface CallState {
  callId: string | null;
  callType: CallType;
  status: CallStatus;
  remoteUser: Profile | null;
  isMuted: boolean;
  isVideoOff: boolean;
  startedAt: string | null;
}
