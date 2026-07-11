'use server'

import { createClient } from '@/lib/supabase/server'

// Simple match engine
function simulateMatch(homeOvr: number, awayOvr: number) {
  const homeAdvantage = 2; // slight boost for playing at home
  const baseHome = (homeOvr + homeAdvantage) * 0.1;
  const baseAway = awayOvr * 0.1;

  // random variance
  const hGoals = Math.max(0, Math.round(baseHome * Math.random() * 1.5 - 2 + (Math.random() > 0.8 ? 1 : 0)));
  const aGoals = Math.max(0, Math.round(baseAway * Math.random() * 1.5 - 2 + (Math.random() > 0.8 ? 1 : 0)));

  return { homeGoals: hGoals, awayGoals: aGoals };
}

export async function simulateRound() {
  try {
    const supabase = await createClient()

    // 1. Get user and their club
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: coach } = await supabase
      .from('coaches')
      .select('club_owners(club_id)')
      .eq('user_id', user.id)
      .single()

    const clubId = coach?.club_owners?.[0]?.club_id
    if (!clubId) return { error: 'User has no club' }

    // 2. Get the club's league
    const { data: myClub } = await supabase
      .from('clubs')
      .select('league_id')
      .eq('id', clubId)
      .single()

    if (!myClub?.league_id) return { error: 'Club has no league' }

    // 3. Get all clubs in that league to generate a round
    const { data: leagueClubs } = await supabase
      .from('clubs')
      .select('id, players(overall)')
      .eq('league_id', myClub.league_id)

    if (!leagueClubs || leagueClubs.length < 2) return { error: 'Not enough clubs in league' }

    // Calculate average overall for each club to use in sim
    const clubsWithOvr = leagueClubs.map(c => {
      const ovr = c.players && c.players.length > 0 
        ? c.players.reduce((sum: number, p: any) => sum + p.overall, 0) / c.players.length 
        : 50;
      return { id: c.id, ovr };
    });

    // Shuffle and pair up (Simplified matchmaking for MVP: just random pairing every round, no strict round-robin yet)
    // A proper game would need a fixture generator, but this works for demonstration.
    const shuffled = [...clubsWithOvr].sort(() => Math.random() - 0.5);
    const matchesToInsert = [];

    for (let i = 0; i < shuffled.length; i += 2) {
      if (i + 1 >= shuffled.length) break; // odd number of teams

      const home = shuffled[i];
      const away = shuffled[i+1];

      const { homeGoals, awayGoals } = simulateMatch(home.ovr, away.ovr);

      matchesToInsert.push({
        home_club_id: home.id,
        away_club_id: away.id,
        home_goals: homeGoals,
        away_goals: awayGoals,
        status: 'finished',
        match_type: 'league'
      });
    }

    // 4. Insert matches
    const { error: insertError } = await supabase
      .from('matches')
      .insert(matchesToInsert);

    if (insertError) return { error: insertError.message }

    return { success: true, matchesSimulated: matchesToInsert.length }

  } catch (error: any) {
    console.error('Simulate round error', error)
    return { error: error.message }
  }
}
