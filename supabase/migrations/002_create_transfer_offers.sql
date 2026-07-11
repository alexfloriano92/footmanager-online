-- ============================================================
-- MULTIPLAYER NEGOTIATION SYSTEM
-- ============================================================

CREATE TABLE public.transfer_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  to_club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  target_player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  offered_cash BIGINT NOT NULL DEFAULT 0,
  offered_player_ids UUID[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'canceled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying an inbox
CREATE INDEX idx_transfer_offers_to_club ON public.transfer_offers(to_club_id, status);
CREATE INDEX idx_transfer_offers_from_club ON public.transfer_offers(from_club_id, status);

CREATE TRIGGER trg_transfer_offers_updated_at 
  BEFORE UPDATE ON public.transfer_offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS Policies
ALTER TABLE public.transfer_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view transfer offers" 
  ON public.transfer_offers FOR SELECT 
  USING (true);

-- Only service role or specific users can insert/update for now, we'll use server actions with service role to bypass for simplicity.
CREATE POLICY "Service role can manage offers" 
  ON public.transfer_offers FOR ALL 
  USING (true)
  WITH CHECK (true);
