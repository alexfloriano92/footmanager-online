/**
 * FootManager Online — Full World Seed
 * Downloads and processes Transfermarkt open dataset
 * Imports clubs & players from 15+ major leagues
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve('.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lslphvgdjrftjtxzkolu.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzbHBodmdkanJmdGp0eHprb2x1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mzc4MDAzMiwiZXhwIjoyMDk5MzU2MDMyfQ.mGAu8t8knngVrFg5RypUfvuqKA0S3UCdrzZOooN1v3s'
);

// ============================================================
// TARGET LEAGUES (Transfermarkt competition IDs)
// ============================================================
const LEAGUES_CONFIG = [
  { id: 'GB1', name: 'Premier League',         short: 'EPL', country: 'Inglaterra', level: 1 },
  { id: 'ES1', name: 'La Liga',                short: 'LAL', country: 'Espanha',    level: 1 },
  { id: 'L1',  name: 'Bundesliga',             short: 'BUN', country: 'Alemanha',   level: 1 },
  { id: 'IT1', name: 'Serie A',                short: 'SER', country: 'Itália',     level: 1 },
  { id: 'FR1', name: 'Ligue 1',               short: 'LIG', country: 'França',     level: 1 },
  { id: 'PO1', name: 'Primeira Liga',          short: 'PRL', country: 'Portugal',   level: 1 },
  { id: 'NL1', name: 'Eredivisie',             short: 'ERE', country: 'Holanda',    level: 1 },
  { id: 'BE1', name: 'Pro League',             short: 'BEL', country: 'Bélgica',   level: 1 },
  { id: 'TR1', name: 'Süper Lig',             short: 'TUR', country: 'Turquia',    level: 1 },
  { id: 'RU1', name: 'RPL',                   short: 'RPL', country: 'Rússia',     level: 1 },
  { id: 'GR1', name: 'Super League',           short: 'GRL', country: 'Grécia',    level: 1 },
  { id: 'SC1', name: 'Scottish Premiership',  short: 'SPR', country: 'Escócia',    level: 1 },
  { id: 'MX1', name: 'Liga MX',               short: 'MXL', country: 'México',     level: 1 },
  { id: 'AR1', name: 'Primera División',       short: 'ARG', country: 'Argentina',  level: 1 },
  { id: 'BR1', name: 'Brasileirão Série A',    short: 'BRA', country: 'Brasil',     level: 1 },
  { id: 'CL1', name: 'Primera División Chile', short: 'CHL', country: 'Chile',      level: 1 },
  { id: 'CO1', name: 'Liga BetPlay',           short: 'COL', country: 'Colômbia',   level: 1 },
  { id: 'JP1', name: 'J1 League',             short: 'J1L', country: 'Japão',      level: 1 },
  { id: 'SA1', name: 'Saudi Pro League',       short: 'SPL', country: 'Arábia',     level: 1 },
  { id: 'MLS', name: 'MLS',                   short: 'MLS', country: 'USA',         level: 1 },
];

const LEAGUE_IDS = new Set(LEAGUES_CONFIG.map(l => l.id));

// ============================================================
// CSV PARSER
// ============================================================
function parseCSV(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] || ''; });
    return obj;
  });
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      inQuotes = !inQuotes;
    } else if (line[i] === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += line[i];
    }
  }
  result.push(current.trim());
  return result;
}

// ============================================================
// ATTRIBUTE GENERATOR (from market value + position)
// ============================================================
const rnd = (min, max) => Math.min(99, Math.max(1, Math.floor(Math.random() * (max - min + 1)) + min));

function marketValueToOverall(mv) {
  if (!mv || mv === '') return 55;
  const n = parseFloat(mv);
  if (n >= 80000000) return rnd(88, 96);
  if (n >= 40000000) return rnd(83, 90);
  if (n >= 20000000) return rnd(78, 86);
  if (n >= 10000000) return rnd(73, 82);
  if (n >= 5000000)  return rnd(68, 78);
  if (n >= 2000000)  return rnd(63, 73);
  if (n >= 500000)   return rnd(58, 68);
  if (n >= 100000)   return rnd(52, 63);
  return rnd(45, 58);
}

// Map Transfermarkt sub_position to our CHECK constraint positions
const TM_POS_MAP = {
  'Goalkeeper': 'GK',
  'Centre-Back': 'CB', 'Left-Back': 'LB', 'Right-Back': 'RB',
  'Defensive Midfield': 'CDM', 'Central Midfield': 'CM', 'Attacking Midfield': 'CAM',
  'Left Midfield': 'LM', 'Right Midfield': 'RM',
  'Left Winger': 'LW', 'Right Winger': 'RW',
  'Centre-Forward': 'ST', 'Second Striker': 'CF',
  'Left-Wing': 'LW', 'Right-Wing': 'RW',
};

function mapPosition(sub_pos, pos) {
  if (TM_POS_MAP[sub_pos]) return TM_POS_MAP[sub_pos];
  if (pos === 'Goalkeeper') return 'GK';
  if (pos === 'Defender') return 'CB';
  if (pos === 'Midfield') return 'CM';
  if (pos === 'Attack') return 'ST';
  return 'CM'; // fallback
}

function generateAttributes(ovr, position) {
  const v = (base, bonus) => rnd(Math.max(1, base + bonus - 10), Math.min(99, base + bonus + 10));
  const is_gk = position === 'GK';
  const is_def = ['CB','LB','RB'].includes(position);
  const is_mid = ['CDM','CM','CAM','LM','RM'].includes(position);
  const is_att = ['LW','RW','ST','CF','SS'].includes(position);
  
  return {
    pace:      is_gk ? rnd(30,55) : is_def ? v(ovr,-10) : is_att ? v(ovr,+8) : v(ovr,-2),
    shooting:  is_gk ? rnd(10,30) : is_def ? v(ovr,-20) : is_att ? v(ovr,+10) : v(ovr,0),
    passing:   is_gk ? v(ovr,-10) : is_def ? v(ovr,-5)  : is_mid ? v(ovr,+8)  : v(ovr,-5),
    dribbling: is_gk ? rnd(20,45) : is_def ? v(ovr,-12) : is_att ? v(ovr,+8) : v(ovr,0),
    defending: is_gk ? rnd(20,45) : is_def ? v(ovr,+10) : is_mid ? v(ovr,-5)  : v(ovr,-20),
    physical:  is_gk ? v(ovr,-5) : is_def ? v(ovr,+5)  : v(ovr,-5),
  };
}

// ============================================================
// BATCH INSERT HELPER
// ============================================================
async function batchInsert(table, rows, batchSize = 100) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).insert(batch);
    if (error) {
      // Silently skip duplicate/constraint errors in batch, log others
      if (error.code !== '23505' && error.code !== '23514') {
        console.error(`  Batch error in ${table} [${i}-${i+batchSize}]: ${error.message.substring(0, 80)}`);
      }
    }
    inserted += batch.length;
  }
  return inserted;
}

// ============================================================
// MAIN SEED
// ============================================================
async function runFullWorldSeed() {
  console.log('\n🌍 FootManager Online — Full World Seed 2026\n');

  // Step 0: Clean
  console.log('🧹 Limpando banco de dados...');
  await supabase.from('players').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('club_owners').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('clubs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('stadiums').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('leagues').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('seasons').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('  ✅ Banco limpo.\n');

  // Step 1: Season
  const { data: season } = await supabase.from('seasons').insert({
    season_number: 2026,
    start_date: '2026-07-01',
    end_date: '2027-05-30',
    status: 'active',
    is_transfer_window_open: true
  }).select().single();
  console.log('📅 Temporada 2026 criada.');

  // Step 2: Leagues
  console.log('\n🏆 Criando ligas...');
  const leagueRows = LEAGUES_CONFIG.map(l => ({
    name: l.name, short_name: l.short, country: l.country, level: l.level, max_clubs: 22
  }));
  const { data: insertedLeagues } = await supabase.from('leagues').insert(leagueRows).select();
  const leagueByShort = {};
  insertedLeagues?.forEach(l => { leagueByShort[l.short_name] = l.id; });
  // Map from TM competition id → league UUID
  const leagueByTmId = {};
  LEAGUES_CONFIG.forEach((lc, i) => {
    if (insertedLeagues?.[i]) leagueByTmId[lc.id] = insertedLeagues[i].id;
  });
  console.log(`  ✅ ${insertedLeagues?.length} ligas inseridas.`);

  // Step 3: Parse CSVs
  console.log('\n📂 Lendo CSVs...');
  const allClubs = parseCSV('scripts/clubs_raw.csv');
  const allPlayers = parseCSV('scripts/players_raw.csv');
  console.log(`  Clubes totais no dataset: ${allClubs.length}`);
  console.log(`  Jogadores totais no dataset: ${allPlayers.length}`);

  // Filter clubs to only those in our target leagues
  const filteredClubs = allClubs.filter(c => LEAGUE_IDS.has(c.domestic_competition_id));
  console.log(`  Clubes filtrados (ligas-alvo): ${filteredClubs.length}`);

  // Step 4: Stadiums + Clubs
  console.log('\n🏟️ Inserindo clubes e estádios...');
  const clubTmIdToUuid = {};
  let clubCount = 0;

  // Color palette for generated clubs
  const COLOR_PAIRS = [
    ['#c61d24','#000000'], ['#004d98','#a50044'], ['#dc052d','#ffffff'],
    ['#034694','#ffffff'], ['#c8102e','#00b2a9'], ['#6cabdd','#ffffff'],
    ['#1a1a2e','#e94560'], ['#006437','#ffffff'], ['#004170','#da291c'],
    ['#fde100','#000000'], ['#0083cb','#ffffff'], ['#e32221','#000000'],
    ['#da291c','#000000'], ['#272e61','#cb3524'], ['#004990','#f9b712'],
  ];
  let colorIdx = 0;

  for (const club of filteredClubs) {
    const leagueUuid = leagueByTmId[club.domestic_competition_id];
    if (!leagueUuid) continue;

    const colors = COLOR_PAIRS[colorIdx % COLOR_PAIRS.length];
    colorIdx++;

    const capacity = parseInt(club.stadium_seats) || 30000;

    let stadiumId = null;
    if (club.stadium_name && club.stadium_name.trim()) {
      const { data: st } = await supabase.from('stadiums').insert({
        name: club.stadium_name.trim(),
        city: club.name,
        capacity: Math.max(5000, capacity),
        pitch_quality: 85,
        facilities_level: 8,
      }).select('id').single();
      stadiumId = st?.id || null;
    }

    const slug = club.club_code || club.name?.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const mv = parseFloat(club.total_market_value?.replace(/[^0-9.]/g,'') || '0') * 1000000;
    const prestige = Math.min(100, Math.max(40, Math.round(mv / 3000000 + 50)));

    const { data: clubRow, error: ce } = await supabase.from('clubs').insert({
      name: club.name,
      short_name: (club.club_code || club.name)?.substring(0, 10) || '???',
      slug: slug,
      country: LEAGUES_CONFIG.find(l => l.id === club.domestic_competition_id)?.country || 'Unknown',
      city: club.name,
      league_id: leagueUuid,
      stadium_id: stadiumId,
      primary_color: colors[0],
      secondary_color: colors[1],
      prestige: prestige,
      fan_loyalty: Math.min(99, prestige - 5 + Math.floor(Math.random()*15)),
    }).select('id').single();

    if (ce) {
      if (ce.code !== '23505') console.error(`  Club error [${club.name}]: ${ce.message.substring(0,60)}`);
      continue;
    }
    clubTmIdToUuid[club.club_id] = clubRow.id;

    // Update finances (trigger creates them on club insert)
    const cashBalance = Math.max(10000000, mv * 0.3);
    await supabase.from('finances').update({
      cash_balance: Math.round(cashBalance),
      transfer_budget: Math.round(cashBalance * 0.25)
    }).eq('club_id', clubRow.id);

    clubCount++;
    if (clubCount % 50 === 0) process.stdout.write(`    ${clubCount} clubes...`);
  }
  console.log(`\n  ✅ ${clubCount} clubes inseridos.`);

  // Step 5: Players
  console.log('\n👤 Inserindo jogadores...');

  // Filter players to only those belonging to our target clubs
  const targetClubTmIds = new Set(Object.keys(clubTmIdToUuid));
  const filteredPlayers = allPlayers.filter(p => {
    // Include player if: their current club is in our leagues OR they have a competition_id in our leagues
    return targetClubTmIds.has(p.current_club_id) || LEAGUE_IDS.has(p.current_club_domestic_competition_id);
  });

  console.log(`  Jogadores a inserir: ${filteredPlayers.length}`);

  const playerRows = [];
  for (const p of filteredPlayers) {
    const clubUuid = clubTmIdToUuid[p.current_club_id] || null;
    const mv = parseFloat(p.market_value_in_eur) || 0;
    const ovr = marketValueToOverall(mv);
    const position = mapPosition(p.sub_position, p.position);
    const attrs = generateAttributes(ovr, position);

    let birthDate = null;
    if (p.date_of_birth && p.date_of_birth.trim()) {
      try { birthDate = new Date(p.date_of_birth).toISOString().split('T')[0]; } catch {}
    }
    if (!birthDate) birthDate = '1995-01-01';

    playerRows.push({
      external_id: `tm_${p.player_id}`,
      name: p.name || `${p.first_name} ${p.last_name}`.trim() || 'Sem Nome',
      full_name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || null,
      nationality: p.country_of_citizenship || p.country_of_birth || 'Unknown',
      birth_date: birthDate,
      position: position,
      height_cm: parseInt(p.height_in_cm) || 178,
      dominant_foot: p.foot === 'left' ? 'left' : p.foot === 'both' ? 'both' : 'right',
      overall: ovr,
      potential: Math.min(99, ovr + rnd(0, 12)),
      ...attrs,
      market_value: mv || 100000,
      weekly_salary: Math.max(1000, Math.round(mv * 0.00002)),
      club_id: clubUuid,
      status: 'active',
      is_real_player: true,
      photo_url: p.image_url || null,
    });
  }

  // Insert players in batches
  const total = await batchInsert('players', playerRows, 200);
  console.log(`  ✅ ${total} jogadores inseridos.\n`);

  // Summary
  const { count: finalClubs } = await supabase.from('clubs').select('*', { count: 'exact', head: true });
  const { count: finalPlayers } = await supabase.from('players').select('*', { count: 'exact', head: true });

  console.log('═══════════════════════════════════════');
  console.log('🏆 SEED WORLD 2026 CONCLUÍDO!');
  console.log(`   ⚽ Ligas:    ${LEAGUES_CONFIG.length}`);
  console.log(`   🏟️  Clubes:   ${finalClubs}`);
  console.log(`   👤 Jogadores: ${finalPlayers}`);
  console.log('═══════════════════════════════════════\n');
}

runFullWorldSeed().catch(console.error);
