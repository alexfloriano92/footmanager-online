-- ============================================================
-- ENABLE REALTIME FOR TRANSFER OFFERS
-- ============================================================

-- Drop the publication if it already exists (to avoid duplicate errors), then create it.
-- Supabase manages a special publication called supabase_realtime.
ALTER PUBLICATION supabase_realtime ADD TABLE transfer_offers;
