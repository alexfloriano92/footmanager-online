-- ============================================================
-- FootManager Online - Migration 004: Row Level Security
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_department ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_growth ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youth_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rankings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Get current user's coach ID
CREATE OR REPLACE FUNCTION public.get_my_coach_id()
RETURNS UUID AS $$
  SELECT id FROM public.coaches WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get current user's club ID
CREATE OR REPLACE FUNCTION public.get_my_club_id()
RETURNS UUID AS $$
  SELECT co.club_id 
  FROM public.club_owners co
  INNER JOIN public.coaches c ON c.id = co.coach_id
  WHERE c.user_id = auth.uid()
  LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT role = 'admin' FROM public.users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- USERS POLICIES
-- ============================================================
CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT USING (id = auth.uid() OR is_admin());

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE USING (id = auth.uid()) WITH CHECK (
    id = auth.uid() AND role = (SELECT role FROM public.users WHERE id = auth.uid())
  );

-- ============================================================
-- COACHES POLICIES
-- ============================================================
CREATE POLICY "Coaches are viewable by all authenticated users"
  ON public.coaches FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Coaches can only be created by their owner"
  ON public.coaches FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Coaches can only be updated by their owner"
  ON public.coaches FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- ============================================================
-- CLUBS POLICIES
-- ============================================================
CREATE POLICY "Clubs are viewable by all authenticated users"
  ON public.clubs FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Only admins can create/delete clubs"
  ON public.clubs FOR ALL USING (is_admin());

-- ============================================================
-- CLUB OWNERS POLICIES
-- ============================================================
CREATE POLICY "Club ownership viewable by all"
  ON public.club_owners FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Only admins can manage club ownership"
  ON public.club_owners FOR ALL USING (is_admin());

-- ============================================================
-- PLAYERS POLICIES
-- ============================================================
CREATE POLICY "Players viewable by all authenticated users"
  ON public.players FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Admins can manage players"
  ON public.players FOR ALL USING (is_admin());

-- ============================================================
-- CONTRACTS POLICIES
-- ============================================================
CREATE POLICY "Contracts viewable by all"
  ON public.contracts FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Club owners can manage their player contracts"
  ON public.contracts FOR ALL TO authenticated USING (
    club_id = get_my_club_id() OR is_admin()
  );

-- ============================================================
-- FINANCES POLICIES
-- ============================================================
CREATE POLICY "Club owners can view their own finances"
  ON public.finances FOR SELECT TO authenticated USING (
    club_id = get_my_club_id() OR is_admin()
  );

CREATE POLICY "Admins can manage all finances"
  ON public.finances FOR ALL USING (is_admin());

-- ============================================================
-- FINANCIAL TRANSACTIONS POLICIES
-- ============================================================
CREATE POLICY "Club owners can view their own transactions"
  ON public.financial_transactions FOR SELECT TO authenticated USING (
    club_id = get_my_club_id() OR is_admin()
  );

-- ============================================================
-- STAFF POLICIES
-- ============================================================
CREATE POLICY "Staff viewable by all"
  ON public.staff FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Club owners can manage their staff"
  ON public.staff FOR ALL TO authenticated USING (
    club_id = get_my_club_id() OR is_admin()
  );

-- ============================================================
-- SCOUTS POLICIES
-- ============================================================
CREATE POLICY "Club owners can manage their scouts"
  ON public.scouts FOR ALL TO authenticated USING (
    club_id = get_my_club_id() OR is_admin()
  );

-- ============================================================
-- MEDICAL POLICIES
-- ============================================================
CREATE POLICY "Club owners can view their medical records"
  ON public.medical_department FOR SELECT TO authenticated USING (
    club_id = get_my_club_id() OR is_admin()
  );

CREATE POLICY "Club owners can manage their medical records"
  ON public.medical_department FOR ALL TO authenticated USING (
    club_id = get_my_club_id() OR is_admin()
  );

-- ============================================================
-- MATCHES POLICIES
-- ============================================================
CREATE POLICY "Matches viewable by all"
  ON public.matches FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Admins can manage matches"
  ON public.matches FOR ALL USING (is_admin());

-- ============================================================
-- MATCH EVENTS POLICIES
-- ============================================================
CREATE POLICY "Match events viewable by all"
  ON public.match_events FOR SELECT TO authenticated USING (TRUE);

-- ============================================================
-- COMPETITION STANDINGS POLICIES
-- ============================================================
CREATE POLICY "Standings viewable by all"
  ON public.competition_standings FOR SELECT TO authenticated USING (TRUE);

-- ============================================================
-- PLAYER STATISTICS POLICIES
-- ============================================================
CREATE POLICY "Player statistics viewable by all"
  ON public.player_statistics FOR SELECT TO authenticated USING (TRUE);

-- ============================================================
-- YOUTH PLAYERS POLICIES
-- ============================================================
CREATE POLICY "Club owners can see their youth players"
  ON public.youth_players FOR SELECT TO authenticated USING (
    club_id = get_my_club_id() OR is_admin()
  );

CREATE POLICY "Club owners can manage their youth players"
  ON public.youth_players FOR ALL TO authenticated USING (
    club_id = get_my_club_id() OR is_admin()
  );

-- ============================================================
-- MARKET POLICIES
-- ============================================================
CREATE POLICY "Market listings viewable by all"
  ON public.market FOR SELECT TO authenticated USING (is_active = TRUE);

CREATE POLICY "Club owners can create market listings"
  ON public.market FOR INSERT TO authenticated WITH CHECK (
    club_id = get_my_club_id()
  );

CREATE POLICY "Club owners can manage their own listings"
  ON public.market FOR UPDATE TO authenticated USING (
    club_id = get_my_club_id() OR is_admin()
  );

-- ============================================================
-- OFFERS POLICIES
-- ============================================================
CREATE POLICY "Clubs can see offers they are part of"
  ON public.offers FOR SELECT TO authenticated USING (
    from_club_id = get_my_club_id() OR
    to_club_id = get_my_club_id() OR
    is_admin()
  );

CREATE POLICY "Club owners can make offers"
  ON public.offers FOR INSERT TO authenticated WITH CHECK (
    from_club_id = get_my_club_id()
  );

CREATE POLICY "Clubs can update offers they are part of"
  ON public.offers FOR UPDATE TO authenticated USING (
    from_club_id = get_my_club_id() OR
    to_club_id = get_my_club_id() OR
    is_admin()
  );

-- ============================================================
-- AUCTIONS POLICIES
-- ============================================================
CREATE POLICY "Auctions viewable by all"
  ON public.auctions FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Club owners can create auctions for their players"
  ON public.auctions FOR INSERT TO authenticated WITH CHECK (
    seller_club_id = get_my_club_id()
  );

CREATE POLICY "Auction bids viewable by all"
  ON public.auction_bids FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can place bids"
  ON public.auction_bids FOR INSERT TO authenticated WITH CHECK (
    club_id = get_my_club_id()
  );

-- ============================================================
-- TRAINING POLICIES
-- ============================================================
CREATE POLICY "Club owners can manage their training"
  ON public.training_sessions FOR ALL TO authenticated USING (
    club_id = get_my_club_id() OR is_admin()
  );

-- ============================================================
-- CLUB PROPOSALS POLICIES
-- ============================================================
CREATE POLICY "Coaches can see proposals they are part of"
  ON public.club_proposals FOR SELECT TO authenticated USING (
    from_coach_id = get_my_coach_id() OR
    to_coach_id = get_my_coach_id() OR
    is_admin()
  );

CREATE POLICY "Authenticated coaches can create proposals"
  ON public.club_proposals FOR INSERT TO authenticated WITH CHECK (
    from_coach_id = get_my_coach_id()
  );

CREATE POLICY "Coaches can update proposals they are part of"
  ON public.club_proposals FOR UPDATE TO authenticated USING (
    from_coach_id = get_my_coach_id() OR
    to_coach_id = get_my_coach_id() OR
    is_admin()
  );

-- ============================================================
-- MESSAGES POLICIES
-- ============================================================
CREATE POLICY "Users can see their own messages"
  ON public.messages FOR SELECT TO authenticated USING (
    from_coach_id = get_my_coach_id() OR
    to_coach_id = get_my_coach_id() OR
    is_admin()
  );

CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT TO authenticated WITH CHECK (
    from_coach_id = get_my_coach_id()
  );

CREATE POLICY "Recipients can mark messages as read"
  ON public.messages FOR UPDATE TO authenticated USING (
    to_coach_id = get_my_coach_id()
  ) WITH CHECK (
    to_coach_id = get_my_coach_id() AND is_read = TRUE
  );

-- ============================================================
-- NOTIFICATIONS POLICIES
-- ============================================================
CREATE POLICY "Users can see their own notifications"
  ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can mark notifications as read"
  ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- ============================================================
-- CHAT MESSAGES POLICIES
-- ============================================================
CREATE POLICY "Chat messages viewable by authenticated users"
  ON public.chat_messages FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can send chat messages"
  ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (
    coach_id = get_my_coach_id()
  );

-- ============================================================
-- ACHIEVEMENTS POLICIES
-- ============================================================
CREATE POLICY "Coach achievements viewable by all"
  ON public.coach_achievements FOR SELECT TO authenticated USING (TRUE);

-- ============================================================
-- RANKINGS POLICIES
-- ============================================================
CREATE POLICY "Rankings viewable by all"
  ON public.rankings FOR SELECT TO authenticated USING (TRUE);
