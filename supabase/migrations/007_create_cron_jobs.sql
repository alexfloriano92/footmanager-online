-- ============================================================
-- FootManager Online - Migration 007: Cron Jobs
-- ============================================================

-- Requires pg_cron extension
-- Note: In Supabase, pg_cron is usually enabled and managed via SQL or dashboard

-- ============================================================
-- CRON: Process AI Managers (Hourly)
-- ============================================================
-- This calls an edge function to do the heavy lifting of AI logic
-- We use a webhook/pg_net request to hit the edge function
CREATE EXTENSION IF NOT EXISTS "pg_net";

CREATE OR REPLACE FUNCTION public.invoke_ai_manager()
RETURNS void AS $$
BEGIN
  -- Assuming edge function URL is set in an environment variable or secure config
  -- For local dev/MVP, this is a placeholder. 
  -- Real implementation in Supabase would use pg_net.http_post
  -- SELECT net.http_post(
  --   url := 'https://[PROJECT_REF].supabase.co/functions/v1/ai-manager',
  --   headers := '{"Authorization": "Bearer [SERVICE_ROLE_KEY]"}'::jsonb
  -- );
END;
$$ LANGUAGE plpgsql;

-- Schedule the AI manager to run every hour
-- SELECT cron.schedule('ai-manager-hourly', '0 * * * *', 'SELECT public.invoke_ai_manager()');

-- ============================================================
-- CRON: Process Match Simulations (Every 5 minutes)
-- ============================================================
-- Checks for scheduled matches that are due and simulates them
CREATE OR REPLACE FUNCTION public.invoke_match_simulator()
RETURNS void AS $$
BEGIN
  -- SELECT net.http_post(
  --   url := 'https://[PROJECT_REF].supabase.co/functions/v1/simulate-match',
  --   headers := '{"Authorization": "Bearer [SERVICE_ROLE_KEY]"}'::jsonb
  -- );
END;
$$ LANGUAGE plpgsql;

-- Schedule match simulator
-- SELECT cron.schedule('match-simulator-5m', '*/5 * * * *', 'SELECT public.invoke_match_simulator()');

-- ============================================================
-- CRON: Season Tick (Daily at midnight)
-- ============================================================
-- Handles weekly wages, contract expiries, injuries updates, training
CREATE OR REPLACE FUNCTION public.invoke_season_tick()
RETURNS void AS $$
BEGIN
  -- SELECT net.http_post(
  --   url := 'https://[PROJECT_REF].supabase.co/functions/v1/season-tick',
  --   headers := '{"Authorization": "Bearer [SERVICE_ROLE_KEY]"}'::jsonb
  -- );
END;
$$ LANGUAGE plpgsql;

-- Schedule daily season tick
-- SELECT cron.schedule('season-tick-daily', '0 0 * * *', 'SELECT public.invoke_season_tick()');

-- ============================================================
-- INTERNAL CRON: Clean up expired market listings
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_market()
RETURNS void AS $$
BEGIN
  UPDATE public.market 
  SET is_active = FALSE 
  WHERE is_active = TRUE AND expires_at < NOW();
  
  UPDATE public.offers
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- SELECT cron.schedule('cleanup-market-hourly', '0 * * * *', 'SELECT public.cleanup_expired_market()');
