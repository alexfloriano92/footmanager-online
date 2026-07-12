-- ============================================================
-- ADD CUP ROUND TO MATCHES
-- ============================================================

ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS cup_round TEXT;
