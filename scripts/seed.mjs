/**
 * FootManager Online - Database Seeder
 * Populates the database with a 2026 Season Super League (20 clubs & players)
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env.local
dotenv.config({ path: resolve('.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lslphvgdjrftjtxzkolu.supabase.co';
// We MUST use the service role key to bypass RLS during seed
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzbHBodmdkanJmdGp0eHprb2x1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mzc4MDAzMiwiZXhwIjoyMDk5MzU2MDMyfQ.mGAu8t8knngVrFg5RypUfvuqKA0S3UCdrzZOooN1v3s';

const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// 1. DATA DEFINITIONS
// ==========================================

const LEAGUES = [
  {
    name: 'Super Liga Global 2026',
    short_name: 'SLG',
    country: 'Global',
    level: 1,
    max_clubs: 20
  }
];

const CLUBS = [
  { name: 'Real Madrid', short_name: 'RMA', slug: 'real-madrid', country: 'Espanha', city: 'Madrid', stadium: 'Santiago Bernabéu', capacity: 81044, primary_color: '#ffffff', secondary_color: '#1c1c1c', prestige: 100, fan_loyalty: 98, cash: 350000000 },
  { name: 'Manchester City', short_name: 'MCI', slug: 'manchester-city', country: 'Inglaterra', city: 'Manchester', stadium: 'Etihad Stadium', capacity: 53400, primary_color: '#6cabdd', secondary_color: '#ffffff', prestige: 98, fan_loyalty: 90, cash: 400000000 },
  { name: 'Arsenal', short_name: 'ARS', slug: 'arsenal', country: 'Inglaterra', city: 'Londres', stadium: 'Emirates Stadium', capacity: 60704, primary_color: '#ef0107', secondary_color: '#063672', prestige: 92, fan_loyalty: 96, cash: 200000000 },
  { name: 'Barcelona', short_name: 'FCB', slug: 'barcelona', country: 'Espanha', city: 'Barcelona', stadium: 'Camp Nou', capacity: 99354, primary_color: '#a50044', secondary_color: '#004d98', prestige: 96, fan_loyalty: 99, cash: 150000000 },
  { name: 'Bayern Munich', short_name: 'BAY', slug: 'bayern', country: 'Alemanha', city: 'Munique', stadium: 'Allianz Arena', capacity: 75000, primary_color: '#dc052d', secondary_color: '#ffffff', prestige: 97, fan_loyalty: 95, cash: 250000000 },
  { name: 'Liverpool', short_name: 'LIV', slug: 'liverpool', country: 'Inglaterra', city: 'Liverpool', stadium: 'Anfield', capacity: 61276, primary_color: '#c8102e', secondary_color: '#00b2a9', prestige: 95, fan_loyalty: 98, cash: 220000000 },
  { name: 'Paris Saint-Germain', short_name: 'PSG', slug: 'psg', country: 'França', city: 'Paris', stadium: 'Parc des Princes', capacity: 47929, primary_color: '#004170', secondary_color: '#da291c', prestige: 93, fan_loyalty: 85, cash: 300000000 },
  { name: 'Inter Milan', short_name: 'INT', slug: 'inter', country: 'Itália', city: 'Milão', stadium: 'San Siro', capacity: 75923, primary_color: '#0068a8', secondary_color: '#000000', prestige: 91, fan_loyalty: 94, cash: 180000000 },
  { name: 'AC Milan', short_name: 'MIL', slug: 'milan', country: 'Itália', city: 'Milão', stadium: 'San Siro', capacity: 75923, primary_color: '#fb090b', secondary_color: '#000000', prestige: 92, fan_loyalty: 95, cash: 170000000 },
  { name: 'Juventus', short_name: 'JUV', slug: 'juventus', country: 'Itália', city: 'Turim', stadium: 'Allianz Stadium', capacity: 41507, primary_color: '#000000', secondary_color: '#ffffff', prestige: 90, fan_loyalty: 93, cash: 160000000 },
  { name: 'Flamengo', short_name: 'FLA', slug: 'flamengo', country: 'Brasil', city: 'Rio de Janeiro', stadium: 'Maracanã', capacity: 78838, primary_color: '#c61d24', secondary_color: '#000000', prestige: 85, fan_loyalty: 99, cash: 100000000 },
  { name: 'Palmeiras', short_name: 'PAL', slug: 'palmeiras', country: 'Brasil', city: 'São Paulo', stadium: 'Allianz Parque', capacity: 43713, primary_color: '#006437', secondary_color: '#ffffff', prestige: 84, fan_loyalty: 96, cash: 90000000 },
  { name: 'Boca Juniors', short_name: 'BOC', slug: 'boca-juniors', country: 'Argentina', city: 'Buenos Aires', stadium: 'La Bombonera', capacity: 54000, primary_color: '#004990', secondary_color: '#f9b712', prestige: 86, fan_loyalty: 99, cash: 60000000 },
  { name: 'River Plate', short_name: 'RIV', slug: 'river-plate', country: 'Argentina', city: 'Buenos Aires', stadium: 'Más Monumental', capacity: 84567, primary_color: '#ffffff', secondary_color: '#ff0000', prestige: 86, fan_loyalty: 97, cash: 65000000 },
  { name: 'Borussia Dortmund', short_name: 'BVB', slug: 'dortmund', country: 'Alemanha', city: 'Dortmund', stadium: 'Signal Iduna Park', capacity: 81365, primary_color: '#fde100', secondary_color: '#000000', prestige: 88, fan_loyalty: 99, cash: 140000000 },
  { name: 'Bayer Leverkusen', short_name: 'B04', slug: 'leverkusen', country: 'Alemanha', city: 'Leverkusen', stadium: 'BayArena', capacity: 30210, primary_color: '#e32221', secondary_color: '#000000', prestige: 87, fan_loyalty: 88, cash: 120000000 },
  { name: 'Napoli', short_name: 'NAP', slug: 'napoli', country: 'Itália', city: 'Nápoles', stadium: 'Diego Armando Maradona', capacity: 54726, primary_color: '#0083cb', secondary_color: '#ffffff', prestige: 85, fan_loyalty: 96, cash: 110000000 },
  { name: 'Atlético Madrid', short_name: 'ATM', slug: 'atletico', country: 'Espanha', city: 'Madrid', stadium: 'Metropolitano', capacity: 70460, primary_color: '#cb3524', secondary_color: '#272e61', prestige: 89, fan_loyalty: 95, cash: 130000000 },
  { name: 'Chelsea', short_name: 'CHE', slug: 'chelsea', country: 'Inglaterra', city: 'Londres', stadium: 'Stamford Bridge', capacity: 40341, primary_color: '#034694', secondary_color: '#ffffff', prestige: 90, fan_loyalty: 92, cash: 280000000 },
  { name: 'Manchester United', short_name: 'MUN', slug: 'manchester-united', country: 'Inglaterra', city: 'Manchester', stadium: 'Old Trafford', capacity: 74310, primary_color: '#da291c', secondary_color: '#000000', prestige: 94, fan_loyalty: 97, cash: 250000000 }
];

const REAL_PLAYERS = [
  // Real Madrid
  { club: 'real-madrid', name: 'Vinícius Júnior', nationality: 'Brasil', pos: 'LW', ovr: 92, age: 25 },
  { club: 'real-madrid', name: 'Jude Bellingham', nationality: 'Inglaterra', pos: 'CAM', ovr: 91, age: 22 },
  { club: 'real-madrid', name: 'Kylian Mbappé', nationality: 'França', pos: 'ST', ovr: 93, age: 27 },
  { club: 'real-madrid', name: 'Fede Valverde', nationality: 'Uruguai', pos: 'CM', ovr: 89, age: 27 },
  { club: 'real-madrid', name: 'Thibaut Courtois', nationality: 'Bélgica', pos: 'GK', ovr: 90, age: 34 },
  
  // Manchester City
  { club: 'manchester-city', name: 'Erling Haaland', nationality: 'Noruega', pos: 'ST', ovr: 92, age: 25 },
  { club: 'manchester-city', name: 'Kevin De Bruyne', nationality: 'Bélgica', pos: 'CM', ovr: 90, age: 34 },
  { club: 'manchester-city', name: 'Rodri', nationality: 'Espanha', pos: 'CDM', ovr: 91, age: 29 },
  { club: 'manchester-city', name: 'Phil Foden', nationality: 'Inglaterra', pos: 'RW', ovr: 89, age: 26 },
  { club: 'manchester-city', name: 'Rúben Dias', nationality: 'Portugal', pos: 'CB', ovr: 89, age: 29 },

  // Arsenal
  { club: 'arsenal', name: 'Bukayo Saka', nationality: 'Inglaterra', pos: 'RW', ovr: 89, age: 24 },
  { club: 'arsenal', name: 'Martin Ødegaard', nationality: 'Noruega', pos: 'CAM', ovr: 88, age: 27 },
  { club: 'arsenal', name: 'William Saliba', nationality: 'França', pos: 'CB', ovr: 88, age: 25 },
  { club: 'arsenal', name: 'Declan Rice', nationality: 'Inglaterra', pos: 'CDM', ovr: 88, age: 27 },

  // Barcelona
  { club: 'barcelona', name: 'Lamine Yamal', nationality: 'Espanha', pos: 'RW', ovr: 87, age: 18 },
  { club: 'barcelona', name: 'Pedri', nationality: 'Espanha', pos: 'CM', ovr: 87, age: 23 },
  { club: 'barcelona', name: 'Gavi', nationality: 'Espanha', pos: 'CM', ovr: 86, age: 21 },
  { club: 'barcelona', name: 'Ronald Araujo', nationality: 'Uruguai', pos: 'CB', ovr: 88, age: 27 },

  // Bayern
  { club: 'bayern', name: 'Harry Kane', nationality: 'Inglaterra', pos: 'ST', ovr: 90, age: 32 },
  { club: 'bayern', name: 'Jamal Musiala', nationality: 'Alemanha', pos: 'CAM', ovr: 89, age: 23 },
  { club: 'bayern', name: 'Leroy Sané', nationality: 'Alemanha', pos: 'RM', ovr: 86, age: 30 },

  // Flamengo
  { club: 'flamengo', name: 'Pedro', nationality: 'Brasil', pos: 'ST', ovr: 82, age: 28 },
  { club: 'flamengo', name: 'De Arrascaeta', nationality: 'Uruguai', pos: 'CAM', ovr: 83, age: 32 },
  { club: 'flamengo', name: 'Nicolás De La Cruz', nationality: 'Uruguai', pos: 'CM', ovr: 82, age: 29 },

  // Palmeiras
  { club: 'palmeiras', name: 'Raphael Veiga', nationality: 'Brasil', pos: 'CAM', ovr: 81, age: 31 },
  { club: 'palmeiras', name: 'Gustavo Gómez', nationality: 'Paraguai', pos: 'CB', ovr: 81, age: 33 }
];

// Helper to generate a random number
const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
// Standard positions
const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST'];
const NAMES = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes', 'Soares', 'Fernandes', 'Vieira', 'Barbosa', 'Rocha', 'Dias', 'Nascimento', 'Andrade', 'Moreira', 'Nunes', 'Marques', 'Machado', 'Mendes', 'Freitas', 'Cardoso', 'Ramos', 'Gonçalves', 'Santana', 'Teixeira'];
const FIRST_NAMES = ['João', 'José', 'Antônio', 'Francisco', 'Carlos', 'Paulo', 'Pedro', 'Lucas', 'Luiz', 'Marcos', 'Luis', 'Gabriel', 'Rafael', 'Daniel', 'Marcelo', 'Bruno', 'Eduardo', 'Felipe', 'Raimundo', 'Rodrigo', 'Manoel', 'Mateus', 'André', 'Fernando', 'Fabio', 'Leonardo', 'Gustavo', 'Guilherme', 'Leandro', 'Tiago', 'Anderson', 'Ricardo', 'Márcio', 'Jorge', 'Alexandre', 'Roberto', 'Edson', 'Diego', 'Vitor', 'Antônio'];

function generateSquad(clubId, clubPrestige) {
  const squad = [];
  const baseOvr = Math.floor(clubPrestige * 0.9); // Higher prestige = better players
  
  // Required positions to have a valid squad
  const requiredPos = ['GK','GK','RB','LB','CB','CB','CB','CB','CDM','CM','CM','CAM','RM','LM','RW','LW','ST','ST','ST'];
  
  for (let i = 0; i < 25; i++) {
    const pos = i < requiredPos.length ? requiredPos[i] : POSITIONS[rnd(0, POSITIONS.length - 1)];
    const ovr = Math.max(50, Math.min(99, rnd(baseOvr - 8, baseOvr + 5)));
    
    // Distribute attributes based on overall
    squad.push({
      club_id: clubId,
      name: `${FIRST_NAMES[rnd(0, FIRST_NAMES.length-1)]} ${NAMES[rnd(0, NAMES.length-1)]}`,
      nationality: rnd(1,10) > 7 ? 'Brasil' : 'Espanha',
      birth_date: new Date(1990 + rnd(0, 16), rnd(0, 11), rnd(1, 28)).toISOString(),
      position: pos,
      height_cm: pos === 'GK' || pos === 'CB' ? rnd(185, 198) : rnd(165, 188),
      weight_kg: rnd(65, 90),
      overall: ovr,
      potential: Math.min(99, ovr + rnd(0, 15)),
      pace: Math.min(99, Math.max(1, rnd(ovr-15, ovr+10))),
      shooting: Math.min(99, Math.max(1, rnd(ovr-15, ovr+10))),
      passing: Math.min(99, Math.max(1, rnd(ovr-15, ovr+10))),
      dribbling: Math.min(99, Math.max(1, rnd(ovr-15, ovr+10))),
      defending: Math.min(99, Math.max(1, rnd(ovr-15, ovr+10))),
      physical: Math.min(99, Math.max(1, rnd(ovr-15, ovr+10))),
      market_value: (ovr * ovr * ovr) * 10,
      weekly_salary: (ovr * ovr) * 5
    });
  }
  return squad;
}

// ==========================================
// 2. SEEDER LOGIC
// ==========================================

async function runSeed() {
  console.log('🚀 Iniciando Seed do Banco de Dados 2026...\n');

  try {
    // 0. Limpar dados anteriores
    console.log('🧹 Limpando dados antigos...');
    await supabase.from('players').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('clubs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('stadiums').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('leagues').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('seasons').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 1. Season
    console.log('📅 Criando Temporada 2026...');
    const { data: season, error: e1 } = await supabase.from('seasons').insert({
      season_number: 2026,
      start_date: new Date('2026-07-01').toISOString(),
      end_date: new Date('2027-05-30').toISOString(),
      status: 'active',
      is_transfer_window_open: true
    }).select().single();
    if (e1) {
      if (e1.code === '23505') console.log('  ⚠️ Temporada já existe.');
      else throw e1;
    } else {
      console.log('  ✅ Temporada criada.');
    }

    // 2. League
    console.log('\n🏆 Criando Liga Global...');
    const { data: league, error: e2 } = await supabase.from('leagues').insert(LEAGUES[0]).select().single();
    if (e2 && e2.code !== '23505') throw e2;
    const leagueId = league?.id || (await supabase.from('leagues').select('id').eq('short_name', LEAGUES[0].short_name).single()).data.id;
    console.log('  ✅ Liga criada/encontrada.');

    // 3. Clubs & Stadiums
    console.log('\n🏟️ Criando 20 Clubes e Estádios...');
    for (const c of CLUBS) {
      // Stadium
      let stadiumId;
      const { data: st, error: e3 } = await supabase.from('stadiums').insert({
        name: c.stadium,
        city: c.city,
        capacity: c.capacity,
        pitch_quality: 90,
        facilities_level: 9
      }).select().single();
      if (e3) {
        if (e3.code === '23505') {
          stadiumId = (await supabase.from('stadiums').select('id').eq('name', c.stadium).single()).data.id;
        } else throw e3;
      } else {
        stadiumId = st.id;
      }

      // Club
      const { data: club, error: e4 } = await supabase.from('clubs').insert({
        name: c.name,
        short_name: c.short_name,
        slug: c.slug,
        country: c.country,
        city: c.city,
        league_id: leagueId,
        stadium_id: stadiumId,
        primary_color: c.primary_color,
        secondary_color: c.secondary_color,
        prestige: c.prestige,
        fan_loyalty: c.fan_loyalty
      }).select().single();
      
      let clubId;
      if (e4) {
        if (e4.code === '23505') {
          clubId = (await supabase.from('clubs').select('id').eq('slug', c.slug).single()).data.id;
        } else throw e4;
      } else {
        clubId = club.id;
        // Fix up finances for new club (update the trigger-created ones)
        await supabase.from('finances').update({
          cash_balance: c.cash,
          transfer_budget: c.cash * 0.3
        }).eq('club_id', clubId);
      }

      // 4. Players for this club
      console.log(`  👤 Gerando elenco para: ${c.name}`);
      
      // Real players first
      const clubReals = REAL_PLAYERS.filter(p => p.club === c.slug);
      for (const rp of clubReals) {
        const { error: ep } = await supabase.from('players').insert({
          club_id: clubId,
          name: rp.name,
          nationality: rp.nationality,
          birth_date: new Date(2026 - rp.age, 0, 1).toISOString(),
          position: rp.pos,
          overall: rp.ovr,
          potential: Math.min(99, rp.ovr + rnd(0, 5)),
          pace: rnd(rp.ovr-10, rp.ovr+5),
          shooting: rnd(rp.ovr-10, rp.ovr+5),
          passing: rnd(rp.ovr-10, rp.ovr+5),
          dribbling: rnd(rp.ovr-10, rp.ovr+5),
          defending: rnd(rp.ovr-10, rp.ovr+5),
          physical: rnd(rp.ovr-10, rp.ovr+5),
          market_value: (rp.ovr * rp.ovr * rp.ovr) * 12,
          weekly_salary: (rp.ovr * rp.ovr) * 10,
          is_real_player: true
        });
        if (ep && ep.code !== '23505') console.error('Error inserting real player', ep);
      }

      // Fill remaining squad
      const remainingNeeded = 25 - clubReals.length;
      if (remainingNeeded > 0) {
        const generated = generateSquad(clubId, c.prestige).slice(0, remainingNeeded);
        const { error: eg } = await supabase.from('players').insert(generated);
        if (eg) console.error('Error inserting generated players', eg);
      }
    }

    console.log('\n🎉 Seed completado com sucesso! 20 Clubes e ~500 Jogadores gerados.');

  } catch (err) {
    console.error('\n❌ Erro durante o seed:', err);
  }
}

runSeed();
