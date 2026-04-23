-- ============================================================
-- MIGRATION: Group Admin Features
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Add admin_only_messages column to chats table
ALTER TABLE public.chats
ADD COLUMN IF NOT EXISTS admin_only_messages BOOLEAN DEFAULT FALSE;

-- 2. RPC: Update group settings (name, description, icon, admin_only_messages)
-- Only admins can call this successfully.
CREATE OR REPLACE FUNCTION public.update_group_settings(
  p_chat_id            UUID,
  p_name               TEXT DEFAULT NULL,
  p_description        TEXT DEFAULT NULL,
  p_icon_url           TEXT DEFAULT NULL,
  p_admin_only_messages BOOLEAN DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify caller is admin of this group
  IF NOT EXISTS (
    SELECT 1 FROM chat_participants
    WHERE chat_id = p_chat_id AND user_id = v_caller AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can update group settings';
  END IF;

  -- Update only the fields that were provided (non-null)
  UPDATE chats SET
    group_name           = COALESCE(p_name, group_name),
    group_description    = COALESCE(p_description, group_description),
    group_icon_url       = COALESCE(p_icon_url, group_icon_url),
    admin_only_messages  = COALESCE(p_admin_only_messages, admin_only_messages),
    updated_at           = NOW()
  WHERE id = p_chat_id AND is_group = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_group_settings(UUID, TEXT, TEXT, TEXT, BOOLEAN)
  TO authenticated;

-- 3. RPC: Remove a member from the group
CREATE OR REPLACE FUNCTION public.remove_group_member(
  p_chat_id UUID,
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Cannot remove yourself (use leave_group for that)
  IF v_caller = p_user_id THEN
    RAISE EXCEPTION 'Cannot remove yourself. Use leave group instead.';
  END IF;

  -- Verify caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM chat_participants
    WHERE chat_id = p_chat_id AND user_id = v_caller AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can remove members';
  END IF;

  -- Remove the member
  DELETE FROM chat_participants
  WHERE chat_id = p_chat_id AND user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_group_member(UUID, UUID)
  TO authenticated;

-- 4. RPC: Set member role (promote/demote)
CREATE OR REPLACE FUNCTION public.set_member_role(
  p_chat_id UUID,
  p_user_id UUID,
  p_role    TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate role
  IF p_role NOT IN ('admin', 'member') THEN
    RAISE EXCEPTION 'Invalid role. Must be admin or member.';
  END IF;

  -- Cannot change your own role
  IF v_caller = p_user_id THEN
    RAISE EXCEPTION 'Cannot change your own role';
  END IF;

  -- Verify caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM chat_participants
    WHERE chat_id = p_chat_id AND user_id = v_caller AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can change member roles';
  END IF;

  -- Update the role
  UPDATE chat_participants
  SET role = p_role
  WHERE chat_id = p_chat_id AND user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_member_role(UUID, UUID, TEXT)
  TO authenticated;

-- 5. RPC: Add new members to group
CREATE OR REPLACE FUNCTION public.add_group_members(
  p_chat_id   UUID,
  p_member_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM chat_participants
    WHERE chat_id = p_chat_id AND user_id = v_caller AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can add members';
  END IF;

  -- Insert new members (skip duplicates)
  INSERT INTO chat_participants (chat_id, user_id, role)
  SELECT p_chat_id, uid, 'member'
  FROM unnest(p_member_ids) AS uid
  ON CONFLICT (chat_id, user_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_group_members(UUID, UUID[])
  TO authenticated;

-- 6. RPC: Leave group (self-removal)
CREATE OR REPLACE FUNCTION public.leave_group(
  p_chat_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Remove self from participants
  DELETE FROM chat_participants
  WHERE chat_id = p_chat_id AND user_id = v_caller;
END;
$$;

GRANT EXECUTE ON FUNCTION public.leave_group(UUID)
  TO authenticated;

-- 7. Update message INSERT policy to respect admin_only_messages
-- Drop existing policy and recreate with admin check
DROP POLICY IF EXISTS "Users can insert messages into their chats" ON public.messages;
CREATE POLICY "Users can insert messages into their chats"
ON public.messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  auth.uid() IN (
    SELECT cp.user_id
    FROM public.chat_participants cp
    WHERE cp.chat_id = messages.chat_id
  ) AND
  -- If admin_only_messages is enabled, only admins can send
  (
    NOT EXISTS (
      SELECT 1 FROM public.chats c
      WHERE c.id = messages.chat_id AND c.admin_only_messages = true
    )
    OR
    EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.chat_id = messages.chat_id AND cp.user_id = auth.uid() AND cp.role = 'admin'
    )
  )
);
