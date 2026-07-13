const fs = require('fs');

const leagues = {
    'aa000000-0000-0000-0000-000000000001': {name: 'Brasileirão Série A', country: 'Brasil', clubs: [
        ['Flamengo', 'FLA', 'flamengo', 'Rio de Janeiro', 70000, 92, 120000000],
        ['Palmeiras', 'PAL', 'palmeiras', 'São Paulo', 43713, 91, 110000000],
        ['São Paulo', 'SAO', 'sao-paulo', 'São Paulo', 66795, 88, 80000000],
        ['Corinthians', 'COR', 'corinthians', 'São Paulo', 49205, 85, 90000000],
        ['Fluminense', 'FLU', 'fluminense', 'Rio de Janeiro', 70000, 86, 70000000],
        ['Botafogo', 'BOT', 'botafogo', 'Rio de Janeiro', 46831, 87, 85000000],
        ['Vasco da Gama', 'VAS', 'vasco', 'Rio de Janeiro', 21880, 82, 60000000],
        ['Grêmio', 'GRE', 'gremio', 'Porto Alegre', 55662, 85, 75000000],
        ['Internacional', 'INT', 'internacional', 'Porto Alegre', 50128, 86, 75000000],
        ['Atlético-MG', 'CAM', 'atletico-mg', 'Belo Horizonte', 46000, 88, 85000000],
        ['Cruzeiro', 'CRU', 'cruzeiro', 'Belo Horizonte', 61846, 84, 65000000],
        ['Athletico-PR', 'CAP', 'athletico-pr', 'Curitiba', 42372, 82, 60000000],
        ['Fortaleza', 'FOR', 'fortaleza', 'Fortaleza', 63903, 83, 50000000],
        ['Bahia', 'BAH', 'bahia', 'Salvador', 50025, 80, 55000000],
        ['Vitória', 'VIT', 'vitoria', 'Salvador', 34535, 75, 30000000],
        ['Bragantino', 'RBB', 'bragantino', 'Bragança Paulista', 15010, 78, 45000000],
        ['Juventude', 'JUV', 'juventude', 'Caxias do Sul', 19924, 70, 20000000],
        ['Mirassol', 'MIR', 'mirassol', 'Mirassol', 15000, 68, 15000000],
        ['Ceará', 'CEA', 'ceara', 'Fortaleza', 63903, 75, 30000000],
        ['Sport Recife', 'SPO', 'sport-recife', 'Recife', 32983, 72, 25000000],
    ]},
    'aa000000-0000-0000-0000-000000000002': {name: 'Premier League', country: 'Inglaterra', clubs: [
        ['Arsenal', 'ARS', 'arsenal', 'London', 60704, 88, 150000000],
        ['Manchester City', 'MCI', 'manchester-city', 'Manchester', 53400, 92, 250000000],
        ['Liverpool', 'LIV', 'liverpool', 'Liverpool', 61276, 90, 180000000],
        ['Chelsea', 'CHE', 'chelsea', 'London', 40343, 85, 200000000],
        ['Manchester United', 'MUN', 'manchester-united', 'Manchester', 74310, 87, 220000000],
        ['Tottenham', 'TOT', 'tottenham', 'London', 62850, 82, 120000000],
        ['Newcastle', 'NEW', 'newcastle', 'Newcastle', 52305, 80, 150000000],
        ['Aston Villa', 'AVL', 'aston-villa', 'Birmingham', 42682, 78, 100000000],
        ['Brighton', 'BHA', 'brighton', 'Brighton', 31800, 72, 80000000],
        ['West Ham', 'WHU', 'west-ham', 'London', 62500, 75, 90000000],
        ['Bournemouth', 'BOU', 'bournemouth', 'Bournemouth', 11364, 65, 50000000],
        ['Crystal Palace', 'CRY', 'crystal-palace', 'London', 25486, 68, 60000000],
        ['Fulham', 'FUL', 'fulham', 'London', 25700, 66, 55000000],
        ['Brentford', 'BRE', 'brentford', 'London', 17250, 68, 50000000],
        ['Wolverhampton', 'WOL', 'wolves', 'Wolverhampton', 32050, 70, 65000000],
        ['Nottingham Forest', 'NFO', 'nottingham-forest', 'Nottingham', 30445, 72, 70000000],
        ['Everton', 'EVE', 'everton', 'Liverpool', 39414, 70, 60000000],
        ['Leicester City', 'LEI', 'leicester-city', 'Leicester', 32312, 72, 65000000],
        ['Ipswich Town', 'IPS', 'ipswich-town', 'Ipswich', 30311, 55, 30000000],
        ['Southampton', 'SOU', 'southampton', 'Southampton', 32384, 60, 40000000],
    ]},
    'aa000000-0000-0000-0000-000000000003': {name: 'La Liga', country: 'Espanha', clubs: [
        ['Real Madrid', 'RMA', 'real-madrid', 'Madrid', 81044, 95, 500000000],
        ['FC Barcelona', 'BAR', 'barcelona', 'Barcelona', 99354, 93, 350000000],
        ['Atlético de Madrid', 'ATM', 'atletico-madrid', 'Madrid', 70460, 85, 200000000],
        ['Athletic Bilbao', 'ATH', 'athletic-bilbao', 'Bilbao', 53289, 78, 100000000],
        ['Real Sociedad', 'RSO', 'real-sociedad', 'San Sebastián', 39500, 76, 80000000],
        ['Real Betis', 'BET', 'real-betis', 'Sevilla', 60720, 75, 80000000],
        ['Villarreal', 'VIL', 'villarreal', 'Villarreal', 23500, 76, 90000000],
        ['Sevilla FC', 'SEV', 'sevilla', 'Sevilla', 43883, 78, 90000000],
        ['Valencia CF', 'VAL', 'valencia', 'Valencia', 49430, 74, 60000000],
        ['Girona FC', 'GIR', 'girona', 'Girona', 14286, 68, 50000000],
        ['Osasuna', 'OSA', 'osasuna', 'Pamplona', 23576, 65, 40000000],
        ['Celta de Vigo', 'CEL', 'celta-vigo', 'Vigo', 29000, 68, 45000000],
        ['Getafe CF', 'GET', 'getafe', 'Getafe', 17393, 62, 30000000],
        ['Rayo Vallecano', 'RAY', 'rayo-vallecano', 'Madrid', 14708, 60, 25000000],
        ['RCD Mallorca', 'MAL', 'mallorca', 'Palma', 23142, 62, 30000000],
        ['UD Las Palmas', 'LPA', 'las-palmas', 'Las Palmas', 32400, 58, 25000000],
        ['RCD Espanyol', 'ESP', 'espanyol', 'Barcelona', 40500, 64, 35000000],
        ['Deportivo Alavés', 'ALA', 'alaves', 'Vitoria', 19840, 55, 20000000],
        ['Real Valladolid', 'VLL', 'valladolid', 'Valladolid', 26512, 58, 22000000],
        ['CD Leganés', 'LEG', 'leganes', 'Leganés', 12450, 52, 18000000],
    ]},
    'aa000000-0000-0000-0000-000000000004': {name: 'Serie A', country: 'Itália', clubs: [
        ['Inter Milan', 'INT', 'inter-milan', 'Milan', 75923, 90, 250000000],
        ['AC Milan', 'MIL', 'ac-milan', 'Milan', 75923, 86, 200000000],
        ['Juventus', 'JUV', 'juventus', 'Turin', 41507, 88, 250000000],
        ['SSC Napoli', 'NAP', 'napoli', 'Naples', 54726, 85, 180000000],
        ['AS Roma', 'ROM', 'roma', 'Rome', 70634, 82, 150000000],
        ['SS Lazio', 'LAZ', 'lazio', 'Rome', 70634, 78, 100000000],
        ['Atalanta', 'ATA', 'atalanta', 'Bergamo', 21300, 82, 120000000],
        ['ACF Fiorentina', 'FIO', 'fiorentina', 'Florence', 43147, 75, 80000000],
        ['Bologna FC', 'BOL', 'bologna', 'Bologna', 36462, 72, 70000000],
        ['Torino FC', 'TOR', 'torino', 'Turin', 27958, 68, 60000000],
        ['Monza', 'MON', 'monza', 'Monza', 16917, 58, 40000000],
        ['Udinese', 'UDI', 'udinese', 'Udine', 25144, 62, 45000000],
        ['Empoli FC', 'EMP', 'empoli', 'Empoli', 16284, 55, 25000000],
        ['Genoa CFC', 'GEN', 'genoa', 'Genoa', 36685, 65, 45000000],
        ['Cagliari', 'CAG', 'cagliari', 'Cagliari', 16416, 62, 35000000],
        ['Hellas Verona', 'HEL', 'hellas-verona', 'Verona', 39211, 58, 30000000],
        ['US Lecce', 'LEC', 'lecce', 'Lecce', 33876, 55, 25000000],
        ['Como 1907', 'COM', 'como', 'Como', 13602, 50, 35000000],
        ['Parma Calcio', 'PAR', 'parma', 'Parma', 22352, 62, 40000000],
        ['Venezia FC', 'VEN', 'venezia', 'Venice', 11150, 48, 20000000],
    ]}
};

let sql = [];

for (const [lid, linfo] of Object.entries(leagues)) {
    const country = linfo.country;
    linfo.clubs.forEach((club, idx) => {
        const [name, short, slug, city, cap, pres, cash] = club;
        const cid = `c${lid.charAt(2)}00000-0000-0000-0000-${String(idx+1).padStart(12, '0')}`;
        const sid = `b${lid.charAt(2)}00000-0000-0000-0000-${String(idx+1).padStart(12, '0')}`;
        
        sql.push(`INSERT INTO public.stadiums (id, name, city, capacity) VALUES ('${sid}', '${name} Stadium', '${city}', ${cap}) ON CONFLICT DO NOTHING;`);
        sql.push(`INSERT INTO public.clubs (id, name, short_name, slug, country, city, league_id, stadium_id, prestige, fan_loyalty, infrastructure, youth_academy, is_ai_controlled, primary_color, secondary_color, founded_year) VALUES ('${cid}', '${name}', '${short}', '${slug}', '${country}', '${city}', '${lid}', '${sid}', ${pres}, 80, 80, 80, true, '#1a1a2e', '#16213e', 1900) ON CONFLICT DO NOTHING;`);
        sql.push(`INSERT INTO public.finances (club_id, cash_balance, transfer_budget) VALUES ('${cid}', ${cash}, ${Math.floor(cash / 2)}) ON CONFLICT (club_id) DO NOTHING;`);
        
        // generate 22 players
        const positions = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST'];
        for (let i = 0; i < 22; i++) {
            const pos = positions[Math.floor(Math.random() * positions.length)];
            const year = Math.floor(Math.random() * (2006 - 1990 + 1)) + 1990;
            let ovr = pres - 15 + Math.floor(Math.random() * 20);
            ovr = Math.max(50, Math.min(95, ovr));
            const pname = `Player ${i+1} ${short}`;
            sql.push(`SELECT seed_player('${pname}', '${pos}', ${ovr}, '${country}', ${year}, '${cid}');`);
        }
    });
}

// Write stadium sectors for ALL new stadiums
sql.push(`
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
`);

fs.writeFileSync('seed_gen.sql', sql.join('\n'), 'utf8');
