-- ============================================================
-- FootManager Online - Migration 005: Database Functions
-- ============================================================

-- ============================================================
-- FUNCTION: Complete a transfer atomically
-- ============================================================
CREATE OR REPLACE FUNCTION public.complete_transfer(
  p_offer_id UUID,
  p_player_id UUID,
  p_from_club_id UUID,
  p_to_club_id UUID,
  p_transfer_fee BIGINT,
  p_weekly_salary INTEGER,
  p_contract_years DECIMAL,
  p_transfer_type TEXT DEFAULT 'transfer'
) RETURNS JSONB AS $$
DECLARE
  v_transfer_id UUID;
  v_from_balance BIGINT;
  v_to_balance BIGINT;
BEGIN
  -- Check from_club has enough money
  IF p_transfer_fee > 0 AND p_from_club_id IS NOT NULL THEN
    SELECT cash_balance INTO v_from_balance FROM public.finances WHERE club_id = p_to_club_id;
    IF v_from_balance < p_transfer_fee THEN
      RAISE EXCEPTION 'Insufficient funds: club has % but transfer costs %', v_from_balance, p_transfer_fee;
    END IF;
  END IF;

  -- 1. Terminate old contract
  UPDATE public.contracts SET is_active = FALSE
  WHERE player_id = p_player_id AND is_active = TRUE;

  -- 2. Update player's club
  UPDATE public.players SET
    club_id = p_to_club_id,
    status = 'active',
    updated_at = NOW()
  WHERE id = p_player_id;

  -- 3. Create new contract
  INSERT INTO public.contracts (player_id, club_id, weekly_salary, contract_start, contract_end)
  VALUES (
    p_player_id,
    p_to_club_id,
    p_weekly_salary,
    CURRENT_DATE,
    CURRENT_DATE + (p_contract_years * 365)::INTEGER
  );

  -- 4. Deduct from buying club's finances
  IF p_transfer_fee > 0 AND p_from_club_id IS NOT NULL THEN
    UPDATE public.finances SET
      cash_balance = cash_balance - p_transfer_fee,
      transfer_budget = GREATEST(0, transfer_budget - p_transfer_fee),
      transfer_expenditure = transfer_expenditure + p_transfer_fee,
      updated_at = NOW()
    WHERE club_id = p_to_club_id;

    INSERT INTO public.financial_transactions
      (club_id, type, category, amount, description, reference_id, reference_type, balance_after)
    SELECT
      p_to_club_id, 'expense', 'transfer', p_transfer_fee,
      'Transferência recebida: jogador adquirido',
      p_offer_id, 'offer',
      cash_balance
    FROM public.finances WHERE club_id = p_to_club_id;

    -- 5. Add to selling club's finances
    IF p_from_club_id IS NOT NULL THEN
      UPDATE public.finances SET
        cash_balance = cash_balance + p_transfer_fee,
        transfer_income = transfer_income + p_transfer_fee,
        updated_at = NOW()
      WHERE club_id = p_from_club_id;

      INSERT INTO public.financial_transactions
        (club_id, type, category, amount, description, reference_id, reference_type, balance_after)
      SELECT
        p_from_club_id, 'income', 'transfer', p_transfer_fee,
        'Venda de jogador',
        p_offer_id, 'offer',
        cash_balance
      FROM public.finances WHERE club_id = p_from_club_id;
    END IF;
  END IF;

  -- 6. Record transfer
  INSERT INTO public.transfers
    (offer_id, player_id, from_club_id, to_club_id, transfer_fee, weekly_salary, contract_years, transfer_type)
  VALUES
    (p_offer_id, p_player_id, p_from_club_id, p_to_club_id, p_transfer_fee, p_weekly_salary, p_contract_years, p_transfer_type)
  RETURNING id INTO v_transfer_id;

  -- 7. Update offer status
  IF p_offer_id IS NOT NULL THEN
    UPDATE public.offers SET status = 'accepted', responded_at = NOW() WHERE id = p_offer_id;
  END IF;

  -- 8. Remove market listing if exists
  UPDATE public.market SET is_active = FALSE WHERE player_id = p_player_id;

  -- 9. Update player history
  UPDATE public.player_history SET left_at = NOW()
  WHERE player_id = p_player_id AND left_at IS NULL AND club_id = p_from_club_id;

  INSERT INTO public.player_history (player_id, club_id, joined_at, transfer_fee, transfer_type)
  VALUES (p_player_id, p_to_club_id, NOW(), p_transfer_fee, p_transfer_type);

  RETURN jsonb_build_object('success', TRUE, 'transfer_id', v_transfer_id);

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Transfer failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: Process weekly wages for a club
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_weekly_wages(p_club_id UUID)
RETURNS BIGINT AS $$
DECLARE
  v_total_wages BIGINT := 0;
  v_staff_wages BIGINT := 0;
  v_balance BIGINT;
BEGIN
  -- Calculate player wages
  SELECT COALESCE(SUM(c.weekly_salary), 0) INTO v_total_wages
  FROM public.contracts c
  WHERE c.club_id = p_club_id AND c.is_active = TRUE;

  -- Calculate staff wages
  SELECT COALESCE(SUM(s.weekly_salary), 0) INTO v_staff_wages
  FROM public.staff s
  WHERE s.club_id = p_club_id AND s.is_active = TRUE;

  v_total_wages := v_total_wages + v_staff_wages;

  -- Deduct from club finances
  UPDATE public.finances SET
    cash_balance = cash_balance - v_total_wages,
    weekly_wage_bill = v_total_wages,
    updated_at = NOW()
  WHERE club_id = p_club_id
  RETURNING cash_balance INTO v_balance;

  -- Log transaction
  INSERT INTO public.financial_transactions
    (club_id, type, category, amount, description, balance_after)
  VALUES
    (p_club_id, 'expense', 'salary', v_total_wages, 'Folha salarial semanal', v_balance);

  RETURN v_total_wages;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: Update competition standings after a match
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_standings_after_match()
RETURNS TRIGGER AS $$
DECLARE
  v_home_pts INTEGER := 0;
  v_away_pts INTEGER := 0;
BEGIN
  IF NEW.status = 'finished' AND NEW.competition_season_id IS NOT NULL THEN
    -- Determine points
    IF NEW.home_score > NEW.away_score THEN
      v_home_pts := 3; v_away_pts := 0;
    ELSIF NEW.home_score = NEW.away_score THEN
      v_home_pts := 1; v_away_pts := 1;
    ELSE
      v_home_pts := 0; v_away_pts := 3;
    END IF;

    -- Upsert home team standings
    INSERT INTO public.competition_standings
      (competition_season_id, club_id, played, won, drawn, lost, goals_for, goals_against, points)
    VALUES (
      NEW.competition_season_id, NEW.home_club_id, 1,
      CASE WHEN NEW.home_score > NEW.away_score THEN 1 ELSE 0 END,
      CASE WHEN NEW.home_score = NEW.away_score THEN 1 ELSE 0 END,
      CASE WHEN NEW.home_score < NEW.away_score THEN 1 ELSE 0 END,
      NEW.home_score, NEW.away_score, v_home_pts
    )
    ON CONFLICT (competition_season_id, club_id) DO UPDATE SET
      played = competition_standings.played + 1,
      won = competition_standings.won + CASE WHEN NEW.home_score > NEW.away_score THEN 1 ELSE 0 END,
      drawn = competition_standings.drawn + CASE WHEN NEW.home_score = NEW.away_score THEN 1 ELSE 0 END,
      lost = competition_standings.lost + CASE WHEN NEW.home_score < NEW.away_score THEN 1 ELSE 0 END,
      goals_for = competition_standings.goals_for + NEW.home_score,
      goals_against = competition_standings.goals_against + NEW.away_score,
      points = competition_standings.points + v_home_pts,
      updated_at = NOW();

    -- Upsert away team standings
    INSERT INTO public.competition_standings
      (competition_season_id, club_id, played, won, drawn, lost, goals_for, goals_against, points)
    VALUES (
      NEW.competition_season_id, NEW.away_club_id, 1,
      CASE WHEN NEW.away_score > NEW.home_score THEN 1 ELSE 0 END,
      CASE WHEN NEW.away_score = NEW.home_score THEN 1 ELSE 0 END,
      CASE WHEN NEW.away_score < NEW.home_score THEN 1 ELSE 0 END,
      NEW.away_score, NEW.home_score, v_away_pts
    )
    ON CONFLICT (competition_season_id, club_id) DO UPDATE SET
      played = competition_standings.played + 1,
      won = competition_standings.won + CASE WHEN NEW.away_score > NEW.home_score THEN 1 ELSE 0 END,
      drawn = competition_standings.drawn + CASE WHEN NEW.away_score = NEW.home_score THEN 1 ELSE 0 END,
      lost = competition_standings.lost + CASE WHEN NEW.away_score < NEW.home_score THEN 1 ELSE 0 END,
      goals_for = competition_standings.goals_for + NEW.away_score,
      goals_against = competition_standings.goals_against + NEW.home_score,
      points = competition_standings.points + v_away_pts,
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_standings
  AFTER UPDATE ON public.matches
  FOR EACH ROW
  WHEN (OLD.status != 'finished' AND NEW.status = 'finished')
  EXECUTE FUNCTION public.update_standings_after_match();

-- ============================================================
-- FUNCTION: Generate notifications on key events
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_on_offer()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_player_name TEXT;
  v_from_club_name TEXT;
BEGIN
  -- Get user_id from to_club's coach
  SELECT u.id INTO v_user_id
  FROM public.users u
  INNER JOIN public.coaches c ON c.user_id = u.id
  INNER JOIN public.club_owners co ON co.coach_id = c.id
  WHERE co.club_id = NEW.to_club_id;

  SELECT name INTO v_player_name FROM public.players WHERE id = NEW.player_id;
  SELECT name INTO v_from_club_name FROM public.clubs WHERE id = NEW.from_club_id;

  IF v_user_id IS NOT NULL AND TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, type, title, body, data, action_url)
    VALUES (
      v_user_id,
      'transfer_offer',
      'Nova Proposta de Transferência',
      format('%s quer contratar %s por €%s', v_from_club_name, v_player_name, NEW.offered_amount),
      jsonb_build_object('offer_id', NEW.id, 'player_id', NEW.player_id),
      '/market/offers'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_on_offer
  AFTER INSERT ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_offer();

-- ============================================================
-- FUNCTION: Claim a club (assign coach to club)
-- ============================================================
CREATE OR REPLACE FUNCTION public.claim_club(p_club_id UUID, p_coach_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_current_owner UUID;
  v_coach_current_club UUID;
BEGIN
  -- Check coach doesn't already own a club
  SELECT co.club_id INTO v_coach_current_club
  FROM public.club_owners co WHERE co.coach_id = p_coach_id;
  
  IF v_coach_current_club IS NOT NULL THEN
    RAISE EXCEPTION 'Coach already owns a club';
  END IF;

  -- Check club is not owned by a human (only AI)
  SELECT co.coach_id INTO v_current_owner
  FROM public.club_owners co WHERE co.club_id = p_club_id;

  IF v_current_owner IS NOT NULL THEN
    -- Check if the current owner is human (has user_id)
    IF EXISTS (SELECT 1 FROM public.coaches WHERE id = v_current_owner AND user_id IS NOT NULL) THEN
      RAISE EXCEPTION 'Club is already owned by another coach';
    END IF;
  END IF;

  -- Assign club to coach
  INSERT INTO public.club_owners (club_id, coach_id, acquired_at)
  VALUES (p_club_id, p_coach_id, NOW())
  ON CONFLICT (club_id) DO UPDATE SET
    coach_id = p_coach_id,
    acquired_at = NOW(),
    seasons_managed = 0,
    is_for_sale = FALSE,
    selling_price = NULL;

  -- Update club AI flag
  UPDATE public.clubs SET is_ai_controlled = FALSE WHERE id = p_club_id;

  -- Log history
  INSERT INTO public.history (entity_type, entity_id, event_type, event_data)
  VALUES ('club', p_club_id, 'new_owner', jsonb_build_object('coach_id', p_coach_id));

  RETURN jsonb_build_object('success', TRUE, 'club_id', p_club_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: Calculate player market value
-- ============================================================
CREATE OR REPLACE FUNCTION public.calculate_market_value(p_overall INTEGER, p_age INTEGER, p_potential INTEGER)
RETURNS BIGINT AS $$
DECLARE
  v_base BIGINT;
  v_age_factor DECIMAL;
  v_potential_factor DECIMAL;
BEGIN
  -- Base value from overall
  v_base := CASE
    WHEN p_overall >= 90 THEN 80000000
    WHEN p_overall >= 85 THEN 40000000
    WHEN p_overall >= 80 THEN 20000000
    WHEN p_overall >= 75 THEN 10000000
    WHEN p_overall >= 70 THEN 5000000
    WHEN p_overall >= 65 THEN 2000000
    WHEN p_overall >= 60 THEN 1000000
    ELSE 500000
  END;

  -- Age factor (peak at 26-28)
  v_age_factor := CASE
    WHEN p_age BETWEEN 23 AND 27 THEN 1.0
    WHEN p_age BETWEEN 20 AND 22 THEN 0.85
    WHEN p_age BETWEEN 28 AND 30 THEN 0.9
    WHEN p_age BETWEEN 18 AND 19 THEN 0.7
    WHEN p_age BETWEEN 31 AND 33 THEN 0.7
    WHEN p_age BETWEEN 34 AND 35 THEN 0.5
    ELSE 0.3
  END;

  -- Potential bonus for young players
  v_potential_factor := CASE
    WHEN p_potential - p_overall >= 15 AND p_age < 24 THEN 1.4
    WHEN p_potential - p_overall >= 10 AND p_age < 26 THEN 1.2
    WHEN p_potential - p_overall >= 5 THEN 1.1
    ELSE 1.0
  END;

  RETURN (v_base * v_age_factor * v_potential_factor)::BIGINT;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
