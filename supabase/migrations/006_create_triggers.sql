-- ============================================================
-- FootManager Online - Migration 006: Triggers
-- ============================================================

-- ============================================================
-- TRIGGER: Validate max clubs in a league
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_league_capacity()
RETURNS TRIGGER AS $$
DECLARE
  v_current_count INTEGER;
  v_max_count INTEGER;
BEGIN
  IF NEW.league_id IS NOT NULL THEN
    SELECT max_clubs INTO v_max_count FROM public.leagues WHERE id = NEW.league_id;
    SELECT COUNT(*) INTO v_current_count FROM public.clubs WHERE league_id = NEW.league_id AND id != NEW.id;
    
    IF v_current_count >= v_max_count THEN
      RAISE EXCEPTION 'League is full (max % clubs)', v_max_count;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_league_capacity
  BEFORE INSERT OR UPDATE OF league_id ON public.clubs
  FOR EACH ROW
  EXECUTE FUNCTION public.check_league_capacity();

-- ============================================================
-- TRIGGER: Initialize club finances on creation
-- ============================================================
CREATE OR REPLACE FUNCTION public.init_club_finances()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.finances (club_id, cash_balance, transfer_budget)
  VALUES (NEW.id, 100000000, 25000000);
  
  INSERT INTO public.fans (club_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_init_club_finances
  AFTER INSERT ON public.clubs
  FOR EACH ROW
  EXECUTE FUNCTION public.init_club_finances();

-- ============================================================
-- TRIGGER: Update club owner on proposal accept
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_club_proposal()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    -- Transfer ownership
    PERFORM public.claim_club(NEW.club_id, NEW.from_coach_id);
    
    -- Generate system message to old owner if human
    IF NEW.to_coach_id IS NOT NULL THEN
      INSERT INTO public.messages (from_coach_id, to_coach_id, subject, body, message_type)
      VALUES (
        NEW.from_coach_id, 
        NEW.to_coach_id, 
        'Clube Vendido', 
        'Sua proposta pelo clube foi aceita.', 
        'system'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_process_club_proposal
  AFTER UPDATE OF status ON public.club_proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.process_club_proposal();

-- ============================================================
-- TRIGGER: Calculate match tickets revenue
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_match_tickets()
RETURNS TRIGGER AS $$
DECLARE
  v_capacity INTEGER;
  v_prestige INTEGER;
  v_loyalty INTEGER;
  v_attendance INTEGER;
BEGIN
  -- Only create ticket entry if it's a scheduled competitive match
  IF NEW.match_type IN ('league', 'cup', 'continental') THEN
    -- Get stadium details
    SELECT s.capacity, c.prestige, c.fan_loyalty
    INTO v_capacity, v_prestige, v_loyalty
    FROM public.clubs c
    LEFT JOIN public.stadiums s ON s.id = c.stadium_id
    WHERE c.id = NEW.home_club_id;
    
    -- Rough attendance calculation based on prestige and loyalty
    v_attendance := LEAST(v_capacity, v_capacity * ((v_prestige + v_loyalty) / 200.0));
    
    INSERT INTO public.tickets (match_id, home_club_id, sold_regular, sold_premium)
    VALUES (NEW.id, NEW.home_club_id, (v_attendance * 0.9)::INTEGER, (v_attendance * 0.1)::INTEGER);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_match_tickets
  AFTER INSERT ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_match_tickets();

-- ============================================================
-- TRIGGER: Pay out ticket revenue when match finishes
-- ============================================================
CREATE OR REPLACE FUNCTION public.payout_ticket_revenue()
RETURNS TRIGGER AS $$
DECLARE
  v_revenue BIGINT;
BEGIN
  IF OLD.status != 'finished' AND NEW.status = 'finished' THEN
    SELECT revenue INTO v_revenue FROM public.tickets WHERE match_id = NEW.id;
    
    IF v_revenue > 0 THEN
      UPDATE public.finances SET 
        cash_balance = cash_balance + v_revenue,
        stadium_revenue = stadium_revenue + v_revenue
      WHERE club_id = NEW.home_club_id;
      
      INSERT INTO public.financial_transactions (club_id, type, category, amount, description, reference_id, reference_type, balance_after)
      SELECT NEW.home_club_id, 'income', 'ticket', v_revenue, 'Receita de bilheteria', NEW.id, 'match', cash_balance
      FROM public.finances WHERE club_id = NEW.home_club_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_payout_ticket_revenue
  AFTER UPDATE OF status ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.payout_ticket_revenue();
