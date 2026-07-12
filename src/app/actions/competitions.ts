'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function simulateMatch(homeOvr: number, awayOvr: number) {
  const homeAdvantage = 2;
  const baseHome = (homeOvr + homeAdvantage) * 0.1;
  const baseAway = awayOvr * 0.1;

  let hGoals = Math.max(0, Math.round(baseHome * Math.random() * 1.5 - 2 + (Math.random() > 0.8 ? 1 : 0)));
  let aGoals = Math.max(0, Math.round(baseAway * Math.random() * 1.5 - 2 + (Math.random() > 0.8 ? 1 : 0)));

  return { homeGoals: hGoals, awayGoals: aGoals };
}

async function generateMatchEvents(matchId: string, hClubId: string, aClubId: string, hGoals: number, aGoals: number, sc: any) {
  const events = [];
  
  // Fake names if we don't query real players for performance
  const fakes = ['Silva', 'Santos', 'Oliveira', 'Costa', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira'];
  const getPlayer = () => fakes[Math.floor(Math.random() * fakes.length)];

  // Generate goal events
  for (let i=0; i<hGoals; i++) {
    events.push({ match_id: matchId, event_type: 'goal', minute: Math.floor(Math.random()*90)+1, club_id: hClubId, player_name: getPlayer() });
  }
  for (let i=0; i<aGoals; i++) {
    events.push({ match_id: matchId, event_type: 'goal', minute: Math.floor(Math.random()*90)+1, club_id: aClubId, player_name: getPlayer() });
  }
  
  // Cards
  const yCards = Math.floor(Math.random() * 4);
  for (let i=0; i<yCards; i++) {
    const isHome = Math.random() > 0.5;
    events.push({ match_id: matchId, event_type: 'yellow_card', minute: Math.floor(Math.random()*90)+1, club_id: isHome ? hClubId : aClubId, player_name: getPlayer() });
  }
  
  if (Math.random() > 0.8) {
    events.push({ match_id: matchId, event_type: 'red_card', minute: 60 + Math.floor(Math.random()*30), club_id: Math.random() > 0.5 ? hClubId : aClubId, player_name: getPlayer() });
  }

  if (events.length > 0) {
    await sc.from('match_events').insert(events);
  }
}

export async function generateSchedule(leagueId: string) {
  try {
    const sc = getServiceClient()
    const { data: clubs } = await sc.from('clubs').select('id').eq('league_id', leagueId)
    if (!clubs || clubs.length < 2) return { error: 'Not enough clubs' }
    
    const clubIds = clubs.map(c => c.id)
    const matchesToInsert = []
    
    // Round Robin
    for (let i = 0; i < clubIds.length; i++) {
      for (let j = i + 1; j < clubIds.length; j++) {
        matchesToInsert.push({ home_club_id: clubIds[i], away_club_id: clubIds[j], status: 'pending', match_type: 'league' })
      }
    }
    
    await sc.from('matches').insert(matchesToInsert)

    // Init standings
    const standingsToInsert = clubIds.map(cid => ({
      league_id: leagueId, club_id: cid, played: 0, won: 0, drawn: 0, lost: 0, goals_for: 0, goals_against: 0, points: 0
    }))
    await sc.from('league_standings').insert(standingsToInsert)

    await sc.from('leagues').update({ season_status: 'active' }).eq('id', leagueId)

    return { success: true }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function playNextRound(leagueId: string) {
  try {
    const sc = getServiceClient()
    const { data: leagueClubs } = await sc.from('clubs').select('id, players(overall)').eq('league_id', leagueId)
    const clubMap = new Map();
    leagueClubs?.forEach(c => {
      const ovr = c.players && c.players.length > 0 ? c.players.reduce((s:number, p:any) => s + p.overall, 0) / c.players.length : 50;
      clubMap.set(c.id, ovr);
    });
    
    const clubIds = leagueClubs?.map(c => c.id) || [];
    const { data: pendingMatches } = await sc.from('matches').select('*').in('home_club_id', clubIds).eq('match_type', 'league').eq('status', 'pending').limit(clubIds.length / 2)
    
    if (!pendingMatches || pendingMatches.length === 0) return { error: 'No matches left to play' }

    for (const m of pendingMatches) {
      const hOvr = clubMap.get(m.home_club_id) || 50
      const aOvr = clubMap.get(m.away_club_id) || 50
      const { homeGoals, awayGoals } = simulateMatch(hOvr, aOvr)
      
      await sc.from('matches').update({ home_goals: homeGoals, away_goals: awayGoals, status: 'finished' }).eq('id', m.id)
      
      // Generate events
      await generateMatchEvents(m.id, m.home_club_id, m.away_club_id, homeGoals, awayGoals, sc);
      
      // Update standings
      const { data: hStand } = await sc.from('league_standings').select('*').eq('club_id', m.home_club_id).eq('league_id', leagueId).single()
      const { data: aStand } = await sc.from('league_standings').select('*').eq('club_id', m.away_club_id).eq('league_id', leagueId).single()
      
      if (hStand && aStand) {
        let hW=hStand.won, hD=hStand.drawn, hL=hStand.lost, hPts=hStand.points;
        let aW=aStand.won, aD=aStand.drawn, aL=aStand.lost, aPts=aStand.points;
        
        if (homeGoals > awayGoals) { hW++; hPts+=3; aL++; }
        else if (awayGoals > homeGoals) { aW++; aPts+=3; hL++; }
        else { hD++; aD++; hPts+=1; aPts+=1; }
        
        await sc.from('league_standings').update({
          played: hStand.played + 1, won: hW, drawn: hD, lost: hL, points: hPts,
          goals_for: hStand.goals_for + homeGoals, goals_against: hStand.goals_against + awayGoals
        }).eq('id', hStand.id)

        await sc.from('league_standings').update({
          played: aStand.played + 1, won: aW, drawn: aD, lost: aL, points: aPts,
          goals_for: aStand.goals_for + awayGoals, goals_against: aStand.goals_against + homeGoals
        }).eq('id', aStand.id)
      }
    }
    
    return { success: true }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function endSeason(leagueId: string) {
  try {
    const sc = getServiceClient()
    
    const { data: leagueClubs } = await sc.from('clubs').select('id').eq('league_id', leagueId)
    const clubIds = leagueClubs?.map(c => c.id) || []
    const { count } = await sc.from('matches').select('*', { count: 'exact', head: true }).in('home_club_id', clubIds).eq('match_type', 'league').eq('status', 'pending')
    
    if (count && count > 0) return { error: 'Cannot end season with pending matches' }

    const { data: standings } = await sc.from('league_standings').select('*, clubs(id, name)').eq('league_id', leagueId).order('points', { ascending: false }).order('goals_for', { ascending: false })
    if (!standings || standings.length === 0) return { error: 'No standings found' }
    
    const champion = standings[0]
    
    await sc.from('leagues').update({ season_status: 'finished', season_champion_id: champion.club_id }).eq('id', leagueId)
    
    const { data: fin } = await sc.from('finances').select('cash_balance').eq('club_id', champion.club_id).single()
    if (fin) {
      const prize = 15000000;
      await sc.from('finances').update({ cash_balance: fin.cash_balance + prize }).eq('club_id', champion.club_id)
      await sc.from('financial_transactions').insert({
        club_id: champion.club_id, type: 'income', category: 'competition_prizes', amount: prize, description: 'Premiação de Campeão da Liga', balance_after: fin.cash_balance + prize
      })
    }
    
    return { success: true, championName: champion.clubs?.name }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function startNewSeason(leagueId: string) {
  try {
    const sc = getServiceClient()
    const { data: league } = await sc.from('leagues').select('current_season').eq('id', leagueId).single()
    const { data: leagueClubs } = await sc.from('clubs').select('id').eq('league_id', leagueId)
    const clubIds = leagueClubs?.map(c => c.id) || []
    
    await sc.from('matches').delete().in('home_club_id', clubIds).eq('match_type', 'league')
    await sc.from('league_standings').delete().eq('league_id', leagueId)
    
    await sc.from('leagues').update({ current_season: (league?.current_season || 1) + 1, season_status: 'active', season_champion_id: null }).eq('id', leagueId)
    
    await generateSchedule(leagueId)
    
    return { success: true }
  } catch (e: any) {
    return { error: e.message }
  }
}
