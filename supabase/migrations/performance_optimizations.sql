-- ============================================================
-- MIGRATION: Performance Optimizations for Message Loading
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Create critical foreign key indexes for nested message fetches
-- Without these, fetching nested relations causes full table scans for every message loaded.

CREATE INDEX IF NOT EXISTS idx_message_status_message_id 
ON public.message_status(message_id);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id 
ON public.message_reactions(message_id);

CREATE INDEX IF NOT EXISTS idx_message_stars_message_id 
ON public.message_stars(message_id);

CREATE INDEX IF NOT EXISTS idx_message_deletions_message_id 
ON public.message_deletions(message_id);

-- 2. Create composite index for incredibly fast chat permission checks
-- This index allows RLS policies to verify membership in ~1ms instead of scanning all participants.
CREATE INDEX IF NOT EXISTS idx_chat_participants_chat_user 
ON public.chat_participants(chat_id, user_id);

-- 3. Optimize the messages SELECT RLS Policy
-- Drop the existing slow policy that uses an inefficient IN (SELECT...) subquery
DROP POLICY IF EXISTS "Users can view messages in their chats" ON public.messages;

-- Create the heavily optimized policy using EXISTS
CREATE POLICY "Users can view messages in their chats"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.chat_participants cp 
    WHERE cp.chat_id = messages.chat_id 
      AND cp.user_id = auth.uid()
  )
);
