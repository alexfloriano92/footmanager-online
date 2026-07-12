-- ============================================================
-- DAILY LOGIN BONUS
-- ============================================================

ALTER TABLE public.coaches 
ADD COLUMN IF NOT EXISTS login_streak INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_login_bonus TIMESTAMPTZ;
