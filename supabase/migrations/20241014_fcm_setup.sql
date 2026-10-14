-- ═══════════════════════════════════════════════════════════
-- Firebase Cloud Messaging — Supabase SQL Setup (Updated)
-- Run this in Supabase SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════════════

-- ── 1. fcm_tokens ─────────────────────────────────────────
-- Stores one or more device tokens per user or guest visitor
CREATE TABLE IF NOT EXISTS public.fcm_tokens (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  token       text        NOT NULL UNIQUE,
  platform    text        NOT NULL DEFAULT 'web',   -- 'web' | 'android' | 'ios'
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- In case table was previously created with user_id NOT NULL or composite unique key:
ALTER TABLE public.fcm_tokens ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.fcm_tokens DROP CONSTRAINT IF EXISTS fcm_tokens_user_id_token_key;
ALTER TABLE public.fcm_tokens DROP CONSTRAINT IF EXISTS fcm_tokens_token_key;
ALTER TABLE public.fcm_tokens ADD CONSTRAINT fcm_tokens_token_key UNIQUE (token);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS fcm_tokens_user_id_idx ON public.fcm_tokens(user_id);
-- Index for admin dashboard queries (all tokens for a given platform)
CREATE INDEX IF NOT EXISTS fcm_tokens_platform_idx ON public.fcm_tokens(platform);

-- ── Row Level Security ────────────────────────────────────
ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Allow client browsers to register / refresh their device tokens
DROP POLICY IF EXISTS "fcm_tokens: public insert" ON public.fcm_tokens;
CREATE POLICY "fcm_tokens: public insert"
  ON public.fcm_tokens FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "fcm_tokens: public update" ON public.fcm_tokens;
CREATE POLICY "fcm_tokens: public update"
  ON public.fcm_tokens FOR UPDATE
  USING (true);

-- Users can read their own tokens
DROP POLICY IF EXISTS "fcm_tokens: owner read" ON public.fcm_tokens;
CREATE POLICY "fcm_tokens: owner read"
  ON public.fcm_tokens FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can read ALL tokens (needed for the notification sender)
DROP POLICY IF EXISTS "fcm_tokens: admin read all" ON public.fcm_tokens;
CREATE POLICY "fcm_tokens: admin read all"
  ON public.fcm_tokens FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND (is_admin = true OR role IN ('admin','municipal_administrator'))
    )
    OR (auth.jwt() ->> 'email') IN ('ouikey41@gmail.com')
  );

-- Admins or owners can delete tokens
DROP POLICY IF EXISTS "fcm_tokens: owner delete" ON public.fcm_tokens;
CREATE POLICY "fcm_tokens: owner delete"
  ON public.fcm_tokens FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND (is_admin = true OR role IN ('admin','municipal_administrator'))
    )
    OR (auth.jwt() ->> 'email') IN ('ouikey41@gmail.com')
  );

-- ── 2. notification_log ───────────────────────────────────
-- Audit trail of every push notification sent by admins
CREATE TABLE IF NOT EXISTS public.notification_log (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title          text        NOT NULL,
  body           text        NOT NULL,
  url            text        DEFAULT '/',
  sent_to_count  int         NOT NULL DEFAULT 0,
  failed_count   int         NOT NULL DEFAULT 0,
  sent_by        uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Index so admins can view recent notifications quickly
CREATE INDEX IF NOT EXISTS notification_log_created_idx
  ON public.notification_log(created_at DESC);

-- ── Row Level Security ────────────────────────────────────
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read/insert the log
DROP POLICY IF EXISTS "notification_log: admin only" ON public.notification_log;
CREATE POLICY "notification_log: admin only"
  ON public.notification_log FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND (is_admin = true OR role IN ('admin','municipal_administrator'))
    )
    OR (auth.jwt() ->> 'email') IN ('ouikey41@gmail.com')
  );

-- ── 3. Auto-update updated_at on fcm_tokens ───────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fcm_tokens_set_updated_at ON public.fcm_tokens;
CREATE TRIGGER fcm_tokens_set_updated_at
  BEFORE UPDATE ON public.fcm_tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
