-- ═══════════════════════════════════════════════════════════
-- Firebase Cloud Messaging — Supabase SQL Setup
-- Run this in Supabase SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════════════

-- ── 1. fcm_tokens ─────────────────────────────────────────
-- Stores one or more device tokens per user (multi-device support)
CREATE TABLE IF NOT EXISTS public.fcm_tokens (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token       text        NOT NULL,
  platform    text        NOT NULL DEFAULT 'web',   -- 'web' | 'android' | 'ios'
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, token)
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS fcm_tokens_user_id_idx ON public.fcm_tokens(user_id);
-- Index for admin dashboard queries (all tokens for a given platform)
CREATE INDEX IF NOT EXISTS fcm_tokens_platform_idx ON public.fcm_tokens(platform);

-- ── Row Level Security ────────────────────────────────────
ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their OWN tokens
DROP POLICY IF EXISTS "fcm_tokens: owner read" ON public.fcm_tokens;
CREATE POLICY "fcm_tokens: owner read"
  ON public.fcm_tokens FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "fcm_tokens: owner upsert" ON public.fcm_tokens;
CREATE POLICY "fcm_tokens: owner upsert"
  ON public.fcm_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "fcm_tokens: owner update" ON public.fcm_tokens;
CREATE POLICY "fcm_tokens: owner update"
  ON public.fcm_tokens FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "fcm_tokens: owner delete" ON public.fcm_tokens;
CREATE POLICY "fcm_tokens: owner delete"
  ON public.fcm_tokens FOR DELETE
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

-- ── Done ──────────────────────────────────────────────────
-- Tables created:
--   public.fcm_tokens         — device push tokens
--   public.notification_log   — sent notification history
