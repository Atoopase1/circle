-- ============================================================
-- WhatsApp Clone — Full Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT UNIQUE,
  email TEXT,
  display_name TEXT NOT NULL DEFAULT 'User',
  avatar_url TEXT,
  bio TEXT DEFAULT 'Hey there! I am using WhatsApp.',
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- ============================================================
-- 2. CHATS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  is_group BOOLEAN DEFAULT false,
  group_name TEXT,
  group_icon_url TEXT,
  group_description TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  last_message_id UUID,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chats_last_message_at ON chats(last_message_at DESC);

-- ============================================================
-- 3. CHAT PARTICIPANTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  unread_count INTEGER DEFAULT 0,
  UNIQUE(chat_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_chat ON chat_participants(chat_id);

-- ============================================================
-- 4. MESSAGES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio', 'document')),
  media_url TEXT,
  media_metadata JSONB,
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON messages(chat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

-- Add foreign key for last_message_id now that messages table exists
ALTER TABLE chats DROP CONSTRAINT IF EXISTS fk_chats_last_message;
ALTER TABLE chats ADD CONSTRAINT fk_chats_last_message
  FOREIGN KEY (last_message_id) REFERENCES messages(id) ON DELETE SET NULL;

-- ============================================================
-- 5. MESSAGE STATUS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS message_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'seen')),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_message_status_message ON message_status(message_id);
CREATE INDEX IF NOT EXISTS idx_message_status_user ON message_status(user_id);

-- ============================================================
-- 5a. CONTACTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('friend', 'family')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_category ON contacts(user_id, category);

-- ============================================================
-- 5b. FOLLOWS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS follows (
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

-- ============================================================
-- 5c. STATUSES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS statuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'video', 'audio', 'document')),
  media_url TEXT,
  text_content TEXT,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'friends', 'family')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_statuses_user ON statuses(user_id);
CREATE INDEX IF NOT EXISTS idx_statuses_visibility ON statuses(visibility);
CREATE INDEX IF NOT EXISTS idx_statuses_created ON statuses(created_at DESC);

-- ============================================================
-- 6. DATABASE FUNCTIONS
-- ============================================================

-- Function: Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, phone, email, display_name)
  VALUES (
    NEW.id,
    NEW.phone,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'User')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger: Auto-create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function: Update chat's last message info
CREATE OR REPLACE FUNCTION update_chat_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chats
  SET last_message_id = NEW.id,
      last_message_at = NEW.created_at,
      updated_at = now()
  WHERE id = NEW.chat_id;

  -- Increment unread count for all participants except sender
  UPDATE chat_participants
  SET unread_count = unread_count + 1
  WHERE chat_id = NEW.chat_id AND user_id != NEW.sender_id;

  -- Create message_status entries for all recipients
  INSERT INTO message_status (message_id, user_id, status)
  SELECT NEW.id, cp.user_id, 'sent'
  FROM chat_participants cp
  WHERE cp.chat_id = NEW.chat_id AND cp.user_id != NEW.sender_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Update last message on new message
DROP TRIGGER IF EXISTS on_new_message ON messages;
CREATE TRIGGER on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_chat_last_message();

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function: Find or create a 1-to-1 chat
CREATE OR REPLACE FUNCTION find_or_create_direct_chat(other_user_id UUID)
RETURNS UUID AS $$
DECLARE
  existing_chat_id UUID;
  new_chat_id UUID;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();

  -- Find existing 1-to-1 chat
  SELECT cp1.chat_id INTO existing_chat_id
  FROM chat_participants cp1
  JOIN chat_participants cp2 ON cp1.chat_id = cp2.chat_id
  JOIN chats c ON c.id = cp1.chat_id
  WHERE cp1.user_id = current_user_id
    AND cp2.user_id = other_user_id
    AND c.is_group = false
  LIMIT 1;

  IF existing_chat_id IS NOT NULL THEN
    RETURN existing_chat_id;
  END IF;

  -- Create new chat
  INSERT INTO chats (is_group, created_by)
  VALUES (false, current_user_id)
  RETURNING id INTO new_chat_id;

  -- Add both participants
  INSERT INTO chat_participants (chat_id, user_id, role)
  VALUES
    (new_chat_id, current_user_id, 'admin'),
    (new_chat_id, other_user_id, 'member');

  RETURN new_chat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get user's chats (Bypasses RLS to prevent infinite recursion)
CREATE OR REPLACE FUNCTION public.get_my_chat_ids()
RETURNS SETOF uuid AS $$
  SELECT chat_id FROM chat_participants WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_status ENABLE ROW LEVEL SECURITY;

-- PROFILES policies
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- CHATS policies
DROP POLICY IF EXISTS "Users can view chats they participate in" ON chats;
CREATE POLICY "Users can view chats they participate in"
  ON chats FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT public.get_my_chat_ids())
  );

DROP POLICY IF EXISTS "Authenticated users can create chats" ON chats;
CREATE POLICY "Authenticated users can create chats"
  ON chats FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Chat admins can update chats" ON chats;
CREATE POLICY "Chat admins can update chats"
  ON chats FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT chat_id FROM chat_participants
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- CHAT PARTICIPANTS policies
DROP POLICY IF EXISTS "Users can view participants of their chats" ON chat_participants;
CREATE POLICY "Users can view participants of their chats"
  ON chat_participants FOR SELECT
  TO authenticated
  USING (
    chat_id IN (SELECT public.get_my_chat_ids())
  );

DROP POLICY IF EXISTS "Chat admins can add participants" ON chat_participants;
CREATE POLICY "Chat admins can add participants"
  ON chat_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    chat_id IN (
      SELECT chat_id FROM chat_participants
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Chat admins can remove participants" ON chat_participants;
CREATE POLICY "Chat admins can remove participants"
  ON chat_participants FOR DELETE
  TO authenticated
  USING (
    chat_id IN (
      SELECT chat_id FROM chat_participants
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can update own participant record" ON chat_participants;
CREATE POLICY "Users can update own participant record"
  ON chat_participants FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- MESSAGES policies
DROP POLICY IF EXISTS "Users can view messages in their chats" ON messages;
CREATE POLICY "Users can view messages in their chats"
  ON messages FOR SELECT
  TO authenticated
  USING (
    chat_id IN (SELECT public.get_my_chat_ids())
  );

DROP POLICY IF EXISTS "Users can send messages to their chats" ON messages;
CREATE POLICY "Users can send messages to their chats"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND chat_id IN (SELECT public.get_my_chat_ids())
  );

DROP POLICY IF EXISTS "Users can update own messages (soft delete)" ON messages;
CREATE POLICY "Users can update own messages (soft delete)"
  ON messages FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- MESSAGE STATUS policies
DROP POLICY IF EXISTS "Users can view message status in their chats" ON message_status;
CREATE POLICY "Users can view message status in their chats"
  ON message_status FOR SELECT
  TO authenticated
  USING (
    message_id IN (
      SELECT m.id FROM messages m
      JOIN chat_participants cp ON cp.chat_id = m.chat_id
      WHERE cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own message status" ON message_status;
CREATE POLICY "Users can update own message status"
  ON message_status FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "System can insert message status" ON message_status;
CREATE POLICY "System can insert message status"
  ON message_status FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- CONTACTS policies
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own contacts" ON contacts;
CREATE POLICY "Users can manage own contacts"
  ON contacts FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- FOLLOWS policies
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view follows" ON follows;
CREATE POLICY "Anyone can view follows"
  ON follows FOR SELECT
  TO authenticated
  USING (true);
DROP POLICY IF EXISTS "Users can manage own follows" ON follows;
CREATE POLICY "Users can manage own follows"
  ON follows FOR ALL
  TO authenticated
  USING (follower_id = auth.uid())
  WITH CHECK (follower_id = auth.uid());

-- STATUSES policies
ALTER TABLE statuses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view public statuses" ON statuses;
CREATE POLICY "Users can view public statuses"
  ON statuses FOR SELECT
  TO authenticated
  USING (visibility = 'public');

DROP POLICY IF EXISTS "Users can view family statuses" ON statuses;
CREATE POLICY "Users can view family statuses"
  ON statuses FOR SELECT
  TO authenticated
  USING (
    visibility = 'family' AND (
      user_id = auth.uid() OR
      user_id IN (SELECT contact_id FROM contacts WHERE user_id = auth.uid() AND category = 'family') OR
      user_id IN (SELECT user_id FROM contacts WHERE contact_id = auth.uid() AND category = 'family')
    )
  );

DROP POLICY IF EXISTS "Users can view friend statuses" ON statuses;
CREATE POLICY "Users can view friend statuses"
  ON statuses FOR SELECT
  TO authenticated
  USING (
    visibility = 'friends' AND (
      user_id = auth.uid() OR
      user_id IN (SELECT contact_id FROM contacts WHERE user_id = auth.uid() AND category = 'friend') OR
      user_id IN (SELECT user_id FROM contacts WHERE contact_id = auth.uid() AND category = 'friend')
    )
  );

DROP POLICY IF EXISTS "Users can manage own statuses" ON statuses;
CREATE POLICY "Users can manage own statuses"
  ON statuses FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 8. REALTIME PUBLICATION
-- ============================================================
-- Enable realtime (wrapped in a DO block to ignore "already exists" errors)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE message_status;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE chat_participants;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE contacts;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE follows;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE statuses;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================
-- 9. STORAGE BUCKET
-- ============================================================
-- NOTE: Create a bucket named 'chat-media' in the Supabase Dashboard
-- Then apply these policies via Dashboard → Storage → Policies:
--
-- Policy 1: Allow authenticated uploads
--   Operation: INSERT
--   Policy: (auth.role() = 'authenticated')
--
-- Policy 2: Allow authenticated reads
--   Operation: SELECT
--   Policy: (auth.role() = 'authenticated')
