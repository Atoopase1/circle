-- ============================================================
-- MIGRATION: Ensure ALL required tables are in the realtime publication
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- This is safe to run multiple times — duplicates are silently ignored.
-- ============================================================

-- Core chat tables
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.message_status;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Social / notification tables
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.statuses;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.status_comments;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.status_likes;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.status_ratings;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.follows;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Profiles (for presence updates)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Advanced interaction tables (if they exist)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.message_stars;
EXCEPTION WHEN duplicate_object THEN null;
WHEN undefined_table THEN null; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
EXCEPTION WHEN duplicate_object THEN null;
WHEN undefined_table THEN null; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.message_deletions;
EXCEPTION WHEN duplicate_object THEN null;
WHEN undefined_table THEN null; END $$;

-- Verify: List all tables currently in the publication
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
