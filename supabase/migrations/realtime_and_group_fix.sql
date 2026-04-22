-- ============================================================
-- MIGRATION: Real-time publication fix + group chat RPC
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Ensure all required tables are in the realtime publication
-- (Safe to run even if already added — EXCEPTION block handles duplicates)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.message_status;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. SECURITY DEFINER function for group chat creation
-- This bypasses RLS safely — it validates the caller is authenticated
-- and only inserts participants into the chat it just created.
-- This fixes the RLS deadlock where is_chat_admin() returns false
-- because the creator hasn't been inserted yet.
CREATE OR REPLACE FUNCTION public.create_group_chat_with_members(
  p_name        TEXT,
  p_description TEXT,
  p_member_ids  UUID[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chat_id    UUID;
  v_creator_id UUID;
BEGIN
  -- Verify caller is authenticated
  v_creator_id := auth.uid();
  IF v_creator_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Create the group chat
  INSERT INTO chats (is_group, group_name, group_description, created_by)
  VALUES (true, p_name, p_description, v_creator_id)
  RETURNING id INTO v_chat_id;

  -- Add creator as admin first
  INSERT INTO chat_participants (chat_id, user_id, role)
  VALUES (v_chat_id, v_creator_id, 'admin');

  -- Add all other members (skip duplicates, e.g. if creator is in the list)
  INSERT INTO chat_participants (chat_id, user_id, role)
  SELECT v_chat_id, uid, 'member'
  FROM unnest(p_member_ids) AS uid
  WHERE uid <> v_creator_id
  ON CONFLICT (chat_id, user_id) DO NOTHING;

  RETURN v_chat_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_group_chat_with_members(TEXT, TEXT, UUID[])
  TO authenticated;
