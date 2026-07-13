-- ============================================================
-- FootManager Online - SEED DATA
-- Populates the game world with leagues, clubs, stadiums,
-- players, finances and contracts.
-- ============================================================

-- 1. CREATE LEAGUE
INSERT INTO public.leagues (id, name, short_name, country, level, max_clubs)
VALUES ('a0000000-0000-0000-0000-000000000001', 'Brasileirão Série A', 'BSA', 'Brasil', 1, 20)
ON CONFLICT DO NOTHING;

-- 2. CREATE STADIUMS
INSERT INTO public.stadiums (id, name, city, capacity) VALUES
('b0000000-0000-0000-0000-000000000001', 'Arena Tempestade', 'São Paulo', 55000),
('b0000000-0000-0000-0000-000000000002', 'Estádio Maracanã Virtual', 'Rio de Janeiro', 70000),
('b0000000-0000-0000-0000-000000000003', 'Arena Gaúcha', 'Porto Alegre', 50000),
('b0000000-0000-0000-0000-000000000004', 'Estádio Mineirão Digital', 'Belo Horizonte', 60000),
('b0000000-0000-0000-0000-000000000005', 'Arena Nordeste', 'Salvador', 45000),
('b0000000-0000-0000-0000-000000000006', 'Estádio Curitibano', 'Curitiba', 40000),
('b0000000-0000-0000-0000-000000000007', 'Arena Amazônia Virtual', 'Manaus', 35000),
('b0000000-0000-0000-0000-000000000008', 'Estádio Pantanal', 'Cuiabá', 38000),
('b0000000-0000-0000-0000-000000000009', 'Arena Recife', 'Recife', 42000),
('b0000000-0000-0000-0000-000000000010', 'Estádio Fortaleza Digital', 'Fortaleza', 48000),
('b0000000-0000-0000-0000-000000000011', 'Arena Santos', 'Santos', 30000),
('b0000000-0000-0000-0000-000000000012', 'Estádio Campinas', 'Campinas', 32000),
('b0000000-0000-0000-0000-000000000013', 'Arena Goiânia', 'Goiânia', 36000),
('b0000000-0000-0000-0000-000000000014', 'Estádio Florianópolis', 'Florianópolis', 28000),
('b0000000-0000-0000-0000-000000000015', 'Arena Brasília', 'Brasília', 65000),
('b0000000-0000-0000-0000-000000000016', 'Estádio Belém', 'Belém', 40000),
('b0000000-0000-0000-0000-000000000017', 'Arena Vitória', 'Vitória', 30000),
('b0000000-0000-0000-0000-000000000018', 'Estádio Natal', 'Natal', 35000),
('b0000000-0000-0000-0000-000000000019', 'Arena Maceió', 'Maceió', 28000),
('b0000000-0000-0000-0000-000000000020', 'Estádio João Pessoa', 'João Pessoa', 25000)
ON CONFLICT DO NOTHING;

-- 3. CREATE CLUBS (20 fictional Brazilian clubs)
INSERT INTO public.clubs (id, name, short_name, slug, country, city, league_id, stadium_id, prestige, fan_loyalty, infrastructure, youth_academy, is_ai_controlled, primary_color, secondary_color, founded_year) VALUES
('c0000000-0000-0000-0000-000000000001', 'Tempestade FC', 'TEM', 'tempestade-fc', 'Brasil', 'São Paulo', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 88, 90, 85, 80, true, '#e11d48', '#1e293b', 1920),
('c0000000-0000-0000-0000-000000000002', 'Flamengo Virtual', 'FLV', 'flamengo-virtual', 'Brasil', 'Rio de Janeiro', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 92, 95, 88, 85, true, '#b91c1c', '#0a0a0a', 1895),
('c0000000-0000-0000-0000-000000000003', 'Grêmio Digital', 'GRD', 'gremio-digital', 'Brasil', 'Porto Alegre', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 82, 85, 78, 82, true, '#1d4ed8', '#0a0a0a', 1903),
('c0000000-0000-0000-0000-000000000004', 'Atlético Mineiro Virtual', 'AMV', 'atletico-mineiro-virtual', 'Brasil', 'Belo Horizonte', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', 85, 88, 82, 75, true, '#0a0a0a', '#ffffff', 1908),
('c0000000-0000-0000-0000-000000000005', 'Bahia Esporte Clube', 'BEC', 'bahia-esporte', 'Brasil', 'Salvador', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005', 72, 80, 68, 70, true, '#1d4ed8', '#dc2626', 1931),
('c0000000-0000-0000-0000-000000000006', 'Furacão Curitiba', 'FRC', 'furacao-curitiba', 'Brasil', 'Curitiba', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000006', 76, 75, 72, 78, true, '#dc2626', '#0a0a0a', 1924),
('c0000000-0000-0000-0000-000000000007', 'Manaus United', 'MNU', 'manaus-united', 'Brasil', 'Manaus', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000007', 58, 65, 55, 60, true, '#059669', '#fbbf24', 1975),
('c0000000-0000-0000-0000-000000000008', 'Pantanal FC', 'PAN', 'pantanal-fc', 'Brasil', 'Cuiabá', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000008', 55, 60, 52, 55, true, '#059669', '#0a0a0a', 1998),
('c0000000-0000-0000-0000-000000000009', 'Sport Recife Digital', 'SRD', 'sport-recife-digital', 'Brasil', 'Recife', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000009', 68, 78, 65, 72, true, '#dc2626', '#0a0a0a', 1905),
('c0000000-0000-0000-0000-000000000010', 'Ceará Sporting', 'CES', 'ceara-sporting', 'Brasil', 'Fortaleza', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000010', 70, 76, 66, 68, true, '#0a0a0a', '#ffffff', 1914),
('c0000000-0000-0000-0000-000000000011', 'Santos Legends', 'SNL', 'santos-legends', 'Brasil', 'Santos', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000011', 80, 82, 72, 90, true, '#0a0a0a', '#ffffff', 1912),
('c0000000-0000-0000-0000-000000000012', 'Guarani Campinas', 'GUA', 'guarani-campinas', 'Brasil', 'Campinas', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000012', 52, 55, 50, 58, true, '#059669', '#ffffff', 1911),
('c0000000-0000-0000-0000-000000000013', 'Goiás Esmeraldino', 'GOE', 'goias-esmeraldino', 'Brasil', 'Goiânia', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000013', 62, 68, 60, 62, true, '#059669', '#ffffff', 1943),
('c0000000-0000-0000-0000-000000000014', 'Figueirense Virtual', 'FIG', 'figueirense-virtual', 'Brasil', 'Florianópolis', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000014', 50, 52, 48, 55, true, '#0a0a0a', '#ffffff', 1921),
('c0000000-0000-0000-0000-000000000015', 'Brasília FC', 'BFC', 'brasilia-fc', 'Brasil', 'Brasília', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000015', 65, 60, 70, 58, true, '#fbbf24', '#1d4ed8', 1960),
('c0000000-0000-0000-0000-000000000016', 'Paysandu Digital', 'PAY', 'paysandu-digital', 'Brasil', 'Belém', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000016', 60, 72, 55, 65, true, '#1d4ed8', '#ffffff', 1914),
('c0000000-0000-0000-0000-000000000017', 'Desportiva Capixaba', 'DCA', 'desportiva-capixaba', 'Brasil', 'Vitória', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000017', 48, 50, 45, 50, true, '#fbbf24', '#059669', 1936),
('c0000000-0000-0000-0000-000000000018', 'América Potiguar', 'AMP', 'america-potiguar', 'Brasil', 'Natal', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000018', 55, 58, 50, 52, true, '#dc2626', '#ffffff', 1915),
('c0000000-0000-0000-0000-000000000019', 'CRB Alagoas', 'CRB', 'crb-alagoas', 'Brasil', 'Maceió', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000019', 50, 55, 48, 50, true, '#dc2626', '#ffffff', 1912),
('c0000000-0000-0000-0000-000000000020', 'Botafogo PB Virtual', 'BPB', 'botafogo-pb-virtual', 'Brasil', 'João Pessoa', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000020', 48, 52, 45, 48, true, '#0a0a0a', '#ffffff', 1931)
ON CONFLICT DO NOTHING;

-- 4. CREATE FINANCES for each club
INSERT INTO public.finances (club_id, cash_balance, transfer_budget) VALUES
('c0000000-0000-0000-0000-000000000001', 80000000, 35000000),
('c0000000-0000-0000-0000-000000000002', 120000000, 50000000),
('c0000000-0000-0000-0000-000000000003', 60000000, 25000000),
('c0000000-0000-0000-0000-000000000004', 75000000, 30000000),
('c0000000-0000-0000-0000-000000000005', 35000000, 15000000),
('c0000000-0000-0000-0000-000000000006', 40000000, 18000000),
('c0000000-0000-0000-0000-000000000007', 15000000, 8000000),
('c0000000-0000-0000-0000-000000000008', 12000000, 6000000),
('c0000000-0000-0000-0000-000000000009', 28000000, 12000000),
('c0000000-0000-0000-0000-000000000010', 30000000, 13000000),
('c0000000-0000-0000-0000-000000000011', 55000000, 22000000),
('c0000000-0000-0000-0000-000000000012', 10000000, 5000000),
('c0000000-0000-0000-0000-000000000013', 20000000, 10000000),
('c0000000-0000-0000-0000-000000000014', 8000000, 4000000),
('c0000000-0000-0000-0000-000000000015', 25000000, 11000000),
('c0000000-0000-0000-0000-000000000016', 18000000, 8000000),
('c0000000-0000-0000-0000-000000000017', 7000000, 3000000),
('c0000000-0000-0000-0000-000000000018', 12000000, 6000000),
('c0000000-0000-0000-0000-000000000019', 9000000, 4000000),
('c0000000-0000-0000-0000-000000000020', 8000000, 3500000)
ON CONFLICT DO NOTHING;

-- 5. GENERATE PLAYERS (22 per club = 440 players)
-- Using a DO block to generate procedurally

DO $$
DECLARE
  v_club_id UUID;
  v_club_ids UUID[] := ARRAY[
    'c0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000003','c0000000-0000-0000-0000-000000000004','c0000000-0000-0000-0000-000000000005',
    'c0000000-0000-0000-0000-000000000006','c0000000-0000-0000-0000-000000000007','c0000000-0000-0000-0000-000000000008','c0000000-0000-0000-0000-000000000009','c0000000-0000-0000-0000-000000000010',
    'c0000000-0000-0000-0000-000000000011','c0000000-0000-0000-0000-000000000012','c0000000-0000-0000-0000-000000000013','c0000000-0000-0000-0000-000000000014','c0000000-0000-0000-0000-000000000015',
    'c0000000-0000-0000-0000-000000000016','c0000000-0000-0000-0000-000000000017','c0000000-0000-0000-0000-000000000018','c0000000-0000-0000-0000-000000000019','c0000000-0000-0000-0000-000000000020'
  ];
  v_positions TEXT[] := ARRAY['GK','CB','CB','LB','RB','CDM','CM','CM','CAM','LM','RM','LW','RW','ST','ST','CF','GK','CB','RB','CDM','CM','ST'];
  v_first_names TEXT[] := ARRAY['Lucas','Gabriel','Matheus','Rafael','Pedro','João','Bruno','Vinicius','Felipe','Thiago','Marcos','André','Diego','Leandro','Caio','Gustavo','Rodrigo','Eduardo','Daniel','Alex','Fernando','Carlos'];
  v_last_names TEXT[] := ARRAY['Silva','Santos','Oliveira','Souza','Lima','Pereira','Costa','Ferreira','Rodrigues','Almeida','Nascimento','Araújo','Melo','Barbosa','Ribeiro','Carvalho','Gomes','Martins','Rocha','Cardoso','Correia','Moura'];
  v_nationalities TEXT[] := ARRAY['Brasil','Brasil','Brasil','Brasil','Brasil','Brasil','Brasil','Brasil','Brasil','Brasil','Brasil','Brasil','Brasil','Brasil','Brasil','Argentina','Uruguai','Colômbia','Chile','Portugal','Espanha','França'];
  v_name TEXT;
  v_pos TEXT;
  v_nat TEXT;
  v_ovr INTEGER;
  v_pot INTEGER;
  v_pac INTEGER; v_sho INTEGER; v_pas INTEGER; v_dri INTEGER; v_def INTEGER; v_phy INTEGER;
  v_age INTEGER;
  v_birth DATE;
  v_salary INTEGER;
  v_market_value BIGINT;
  v_club_prestige INTEGER;
  v_player_id UUID;
  i INTEGER;
  j INTEGER;
BEGIN
  FOR i IN 1..array_length(v_club_ids, 1) LOOP
    v_club_id := v_club_ids[i];
    
    -- Get club prestige to scale player quality
    SELECT prestige INTO v_club_prestige FROM public.clubs WHERE id = v_club_id;
    
    FOR j IN 1..22 LOOP
      v_pos := v_positions[j];
      v_name := v_first_names[((i * 7 + j * 3) % 22) + 1] || ' ' || v_last_names[((i * 5 + j * 11) % 22) + 1];
      v_nat := v_nationalities[((i + j) % 22) + 1];
      
      -- Scale overall to club prestige (stronger clubs = better players)
      v_ovr := GREATEST(48, LEAST(92, v_club_prestige - 15 + (random() * 20)::int));
      v_pot := GREATEST(v_ovr, LEAST(95, v_ovr + 2 + (random() * 8)::int));
      
      -- Generate attributes around overall
      v_pac := GREATEST(40, LEAST(95, v_ovr - 5 + (random() * 10)::int));
      v_sho := GREATEST(40, LEAST(95, v_ovr - 5 + (random() * 10)::int));
      v_pas := GREATEST(40, LEAST(95, v_ovr - 5 + (random() * 10)::int));
      v_dri := GREATEST(40, LEAST(95, v_ovr - 5 + (random() * 10)::int));
      v_def := GREATEST(40, LEAST(95, v_ovr - 5 + (random() * 10)::int));
      v_phy := GREATEST(40, LEAST(95, v_ovr - 5 + (random() * 10)::int));
      
      -- Age: 18 to 35
      v_age := 18 + (random() * 17)::int;
      v_birth := CURRENT_DATE - (v_age * 365 + (random() * 365)::int);
      
      -- Salary and value based on overall
      v_salary := GREATEST(2000, (v_ovr * v_ovr * 2));
      v_market_value := GREATEST(500000, (v_ovr::bigint * v_ovr * v_ovr * 100));

      INSERT INTO public.players (
        name, nationality, birth_date, position, overall, potential,
        pace, shooting, passing, dribbling, defending, physical,
        technique, stamina, experience, morale, fitness,
        market_value, weekly_salary, club_id, status
      ) VALUES (
        v_name, v_nat, v_birth, v_pos, v_ovr, v_pot,
        v_pac, v_sho, v_pas, v_dri, v_def, v_phy,
        v_ovr, v_ovr, LEAST(100, v_age * 3), 70, 100,
        v_market_value, v_salary, v_club_id, 'active'
      ) RETURNING id INTO v_player_id;
      
      -- Create contract for each player
      INSERT INTO public.contracts (
        player_id, club_id, weekly_salary,
        contract_start, contract_end, is_active
      ) VALUES (
        v_player_id, v_club_id, v_salary,
        CURRENT_DATE - interval '180 days',
        CURRENT_DATE + ((1 + (random() * 4)::int) * interval '365 days'),
        true
      );
      
    END LOOP;
  END LOOP;
END $$;

-- 6. POPULATE STADIUM SECTORS for all stadiums
INSERT INTO public.stadium_sectors (stadium_id, sector_name, capacity, level, upgrade_cost, revenue_per_match)
SELECT s.id, sector.name, sector.cap, 1, sector.cost, sector.rev
FROM public.stadiums s
CROSS JOIN (
  VALUES 
    ('Setor Norte', 2000, 1500000, 40000),
    ('Setor Sul', 2000, 1500000, 40000),
    ('Setor Leste', 1500, 1200000, 30000),
    ('Setor Oeste', 1500, 1200000, 30000),
    ('Camarotes VIP', 200, 5000000, 100000)
) AS sector(name, cap, cost, rev)
WHERE NOT EXISTS (
  SELECT 1 FROM public.stadium_sectors ss WHERE ss.stadium_id = s.id AND ss.sector_name = sector.name
);

-- 7. FUNCTION: claim_club (used by the onboarding page)
CREATE OR REPLACE FUNCTION public.claim_club(p_club_id UUID, p_coach_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Set club as human controlled
  UPDATE public.clubs SET is_ai_controlled = false WHERE id = p_club_id;
  
  -- Insert or update club_owners
  INSERT INTO public.club_owners (club_id, coach_id, acquired_at)
  VALUES (p_club_id, p_coach_id, NOW())
  ON CONFLICT (club_id) DO UPDATE SET coach_id = p_coach_id, acquired_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
