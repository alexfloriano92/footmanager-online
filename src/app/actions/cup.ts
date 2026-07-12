'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// Simple match engine (reused)
function simulateMatch(homeOvr: number, awayOvr: number) {
  const homeAdvantage = 2; 
  const baseHome = (homeOvr + homeAdvantage) * 0.1;
  const baseAway = awayOvr * 0.1;

  let hGoals = Math.max(0, Math.round(baseHome * Math.random() * 1.5 - 2 + (Math.random() > 0.8 ? 1 : 0)));
  let aGoals = Math.max(0, Math.round(baseAway * Math.random() * 1.5 - 2 + (Math.random() > 0.8 ? 1 : 0)));

  // Cup matches cannot end in a draw! Simulate penalties if tied.
  if (hGoals === aGoals) {
    if (Math.random() > 0.5) hGoals += 1;
    else aGoals += 1;
  }

  return { homeGoals: hGoals, awayGoals: aGoals };
}

const CUP_ROUNDS = ['Oitavas', 'Quartas', 'Semi', 'Final', 'Concluída'];

export async function generateCup() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: coach } = await supabase
      .from('coaches')
      .select('club_owners(club_id)')
      .eq('user_id', user.id)
      .single()

    const clubId = coach?.club_owners?.[0]?.club_id
    if (!clubId) return { error: 'Club not found' }

    const { data: myClub } = await supabase.from('clubs').select('league_id').eq('id', clubId).single()
    if (!myClub?.league_id) return { error: 'No league' }

    // Use service client to bypass RLS for match generation
    const serviceClient = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Delete existing cup matches for this league's clubs (to restart cup)
    const { data: leagueClubs } = await serviceClient.from('clubs').select('id').eq('league_id', myClub.league_id)
    if (!leagueClubs) return { error: 'No clubs' }
    const clubIds = leagueClubs.map(c => c.id);

    await serviceClient.from('matches').delete().in('home_club_id', clubIds).eq('match_type', 'cup')

    // Shuffle and pick 16 clubs
    const shuffled = [...clubIds].sort(() => Math.random() - 0.5).slice(0, 16);
    if (shuffled.length < 16) return { error: 'Not enough clubs in league for a cup' }

    const matchesToInsert = [];
    for (let i = 0; i < 16; i += 2) {
      matchesToInsert.push({
        home_club_id: shuffled[i],
        away_club_id: shuffled[i+1],
        home_goals: 0,
        away_goals: 0,
        status: 'pending',
        match_type: 'cup',
        cup_round: 'Oitavas'
      });
    }

    const { error } = await serviceClient.from('matches').insert(matchesToInsert);
    if (error) return { error: error.message }

    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function simulateCupRound() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: coach } = await supabase.from('coaches').select('club_owners(club_id)').eq('user_id', user.id).single()
    const clubId = coach?.club_owners?.[0]?.club_id
    if (!clubId) return { error: 'Club not found' }

    const { data: myClub } = await supabase.from('clubs').select('league_id').eq('id', clubId).single()

    const serviceClient = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data: leagueClubs } = await serviceClient.from('clubs').select('id, players(overall)').eq('league_id', myClub?.league_id)
    const clubMap = new Map();
    leagueClubs?.forEach(c => {
      const ovr = c.players && c.players.length > 0 ? c.players.reduce((sum: number, p: any) => sum + p.overall, 0) / c.players.length : 50;
      clubMap.set(c.id, ovr);
    });

    const clubIds = leagueClubs?.map(c => c.id) || [];
    const { data: pendingMatches } = await serviceClient.from('matches').select('*').in('home_club_id', clubIds).eq('match_type', 'cup').eq('status', 'pending');

    if (!pendingMatches || pendingMatches.length === 0) return { error: 'No pending cup matches found' }

    const currentRound = pendingMatches[0].cup_round;
    const currentRoundIdx = CUP_ROUNDS.indexOf(currentRound);

    const winners = [];

    // Simulate current matches
    for (const m of pendingMatches) {
      const hOvr = clubMap.get(m.home_club_id) || 50;
      const aOvr = clubMap.get(m.away_club_id) || 50;
      const { homeGoals, awayGoals } = simulateMatch(hOvr, aOvr);
      
      await serviceClient.from('matches').update({
        home_goals: homeGoals,
        away_goals: awayGoals,
        status: 'finished'
      }).eq('id', m.id);

      winners.push(homeGoals > awayGoals ? m.home_club_id : m.away_club_id);
    }

    // Generate next round
    const nextRound = CUP_ROUNDS[currentRoundIdx + 1];
    
    if (nextRound === 'Concluída') {
      // The final was played, give prize to the sole winner
      const championId = winners[0];
      const { data: fin } = await serviceClient.from('finances').select('cash_balance').eq('club_id', championId).single();
      if (fin) {
        await serviceClient.from('finances').update({ cash_balance: fin.cash_balance + 20000000 }).eq('club_id', championId);
        await serviceClient.from('financial_transactions').insert({
          club_id: championId,
          type: 'income',
          category: 'competition_prizes',
          amount: 20000000,
          description: 'Prêmio Campeão da Copa',
          balance_after: fin.cash_balance + 20000000
        });
      }
    } else {
      // Create new matches
      const newMatches = [];
      for (let i = 0; i < winners.length; i += 2) {
        newMatches.push({
          home_club_id: winners[i],
          away_club_id: winners[i+1],
          home_goals: 0,
          away_goals: 0,
          status: 'pending',
          match_type: 'cup',
          cup_round: nextRound
        });
      }
      await serviceClient.from('matches').insert(newMatches);
    }

    return { success: true, nextRound }
  } catch (error: any) {
    return { error: error.message }
  }
}
