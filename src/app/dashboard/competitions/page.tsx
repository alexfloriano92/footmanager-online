"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Play, Star, Calendar, RefreshCw } from "lucide-react";
import { generateSchedule, playNextRound, endSeason, startNewSeason } from "@/app/actions/competitions";
import { applyMoraleEffect, applyMatchFatigue, applyMoraleDrift } from "@/app/actions/player-dynamics";
import { collectMatchDayRevenue } from "@/app/actions/stadium";
import { toast } from "sonner";
import Link from "next/link";

export default function CompetitionsPage() {
  const [league, setLeague] = useState<any>(null);
  const [standings, setStandings] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [myClubId, setMyClubId] = useState<string | null>(null);

  const supabase = createClient();

  const loadData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: coach } = await supabase.from('coaches').select('club_owners(club_id)').eq('user_id', user.id).single();
    const clubId = coach?.club_owners?.[0]?.club_id;
    setMyClubId(clubId);

    if (clubId) {
      const { data: club } = await supabase.from('clubs').select('league_id').eq('id', clubId).single();
      
      if (club?.league_id) {
        const { data: lg } = await supabase.from('leagues').select('*').eq('id', club.league_id).single();
        setLeague(lg);

        const { data: st } = await supabase.from('league_standings').select('*, clubs(id, name)').eq('league_id', club.league_id).order('points', { ascending: false }).order('goals_for', { ascending: false });
        setStandings(st || []);

        const { data: clubsData } = await supabase.from('clubs').select('id').eq('league_id', club.league_id);
        const cIds = clubsData?.map(c => c.id) || [];

        const { data: ms } = await supabase.from('matches').select('*, home:home_club_id(name), away:away_club_id(name)').in('home_club_id', cIds).eq('match_type', 'league').order('created_at', { ascending: false }).limit(20);
        setMatches(ms || []);
      }
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleGenerate = async () => {
    setSimulating(true);
    await generateSchedule(league.id);
    await loadData();
    setSimulating(false);
  };

  const handleSimulate = async () => {
    setSimulating(true);
    const res = await playNextRound(league.id);
    
    // Apply dynamics for my club (simplified: assuming my club played)
    if (myClubId) {
      // Find my club's last match to see result
      const myMatch = matches.find(m => m.home_club_id === myClubId || m.away_club_id === myClubId);
      if (myMatch && myMatch.status === 'finished') {
        const isHome = myMatch.home_club_id === myClubId;
        const myGoals = isHome ? myMatch.home_goals : myMatch.away_goals;
        const opGoals = isHome ? myMatch.away_goals : myMatch.home_goals;
        const result = myGoals > opGoals ? 'win' : myGoals < opGoals ? 'loss' : 'draw';
        
        await applyMoraleEffect(myClubId, result);
        await applyMatchFatigue(myClubId);
        await applyMoraleDrift(myClubId);
        
        if (isHome) {
          const rev = await collectMatchDayRevenue(myClubId, true);
          if (rev.revenue > 0) toast.success(`Renda do Estádio: €${(rev.revenue/1000).toFixed(0)}K`);
        }
      }
    }

    if (res.success) toast.success("Rodada simulada com sucesso!");
    else toast.error(res.error);

    await loadData();
    setSimulating(false);
  };

  const handleEndSeason = async () => {
    setSimulating(true);
    const res = await endSeason(league.id);
    if (res.success) toast.success(`Temporada Encerrada! Campeão: ${res.championName}`);
    else toast.error(res.error);
    await loadData();
    setSimulating(false);
  };

  const handleNewSeason = async () => {
    setSimulating(true);
    const res = await startNewSeason(league.id);
    if (res.success) toast.success("Nova temporada iniciada!");
    await loadData();
    setSimulating(false);
  };

  const pendingMatchesCount = matches.filter(m => m.status === 'pending').length;
  const isFinished = league?.season_status === 'finished';

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto p-4 md:p-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Trophy className="w-8 h-8 text-emerald-500" />
            {league?.name || 'Liga Nacional'}
          </h1>
          <p className="text-slate-400 mt-1 flex items-center gap-2">
            <span className="font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md text-sm">
              Temporada {league?.current_season || 1}
            </span>
            {isFinished ? (
              <span className="text-amber-400 font-bold text-sm bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/30">ENCERRADA</span>
            ) : (
              <span className="text-emerald-400 font-bold text-sm bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30">ATIVA</span>
            )}
          </p>
        </div>
        
        {!isFinished && standings.length === 0 && (
          <Button onClick={handleGenerate} disabled={simulating || loading} className="bg-emerald-600 hover:bg-emerald-500 text-white">
            <Calendar className="w-5 h-5 mr-2" />
            Gerar Calendário
          </Button>
        )}
        {!isFinished && standings.length > 0 && pendingMatchesCount > 0 && (
          <Button onClick={handleSimulate} disabled={simulating || loading} className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]">
            {simulating ? <RefreshCw className="w-5 h-5 mr-2 animate-spin" /> : <Play className="w-5 h-5 mr-2" />}
            Jogar Próxima Rodada
          </Button>
        )}
        {!isFinished && standings.length > 0 && pendingMatchesCount === 0 && (
          <Button onClick={handleEndSeason} disabled={simulating || loading} className="bg-amber-600 hover:bg-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]">
            <Trophy className="w-5 h-5 mr-2" />
            Encerrar Temporada
          </Button>
        )}
      </div>

      {isFinished && (
        <Card className="bg-gradient-to-r from-amber-900/40 to-yellow-900/20 border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.2)] mb-6 overflow-hidden relative">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 mix-blend-overlay"></div>
          <CardContent className="p-12 text-center flex flex-col items-center gap-4 relative z-10">
            <div className="w-24 h-24 bg-amber-500/20 rounded-full flex items-center justify-center border-4 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.5)] mb-2">
              <Trophy className="w-12 h-12 text-amber-400" />
            </div>
            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-600">
              TEMPORADA {league?.current_season} ENCERRADA!
            </h2>
            <p className="text-xl text-slate-300 font-medium">O grande campeão foi consagrado e as premiações distribuídas.</p>
            <Button onClick={handleNewSeason} disabled={simulating || loading} className="mt-6 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-8 py-6 text-lg rounded-full">
              <Star className="w-5 h-5 mr-2" /> Iniciar Temporada {league?.current_season + 1}
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="h-96 flex justify-center items-center"><RefreshCw className="w-8 h-8 animate-spin text-emerald-500" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-300">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-950/50 border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Pos</th>
                      <th className="px-4 py-3">Clube</th>
                      <th className="px-4 py-3 text-center">PTS</th>
                      <th className="px-2 py-3 text-center">J</th>
                      <th className="px-2 py-3 text-center">V</th>
                      <th className="px-2 py-3 text-center">E</th>
                      <th className="px-2 py-3 text-center">D</th>
                      <th className="px-2 py-3 text-center">GP</th>
                      <th className="px-2 py-3 text-center">GC</th>
                      <th className="px-2 py-3 text-center">SG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((s, index) => {
                      const isMyClub = s.club_id === myClubId;
                      const isChampion = index === 0;
                      const isRelegation = index >= standings.length - 3;
                      
                      return (
                        <tr key={s.id} className={`border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors ${isMyClub ? 'bg-slate-800/80 border-l-4 border-l-emerald-500' : ''}`}>
                          <td className="px-4 py-3 font-bold">
                            <span className={`flex items-center justify-center w-6 h-6 rounded-full ${isChampion ? 'bg-amber-500 text-slate-900' : isRelegation ? 'bg-red-500/20 text-red-400' : 'bg-slate-800'}`}>
                              {index + 1}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-200">
                            <Link href={`/club/${s.club_id}`} className="hover:underline hover:text-emerald-400 flex items-center gap-2">
                              {s.clubs?.name}
                              {isMyClub && <span className="text-[10px] bg-emerald-500 text-slate-900 px-1.5 py-0.5 rounded uppercase font-bold">Você</span>}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-white">{s.points}</td>
                          <td className="px-2 py-3 text-center text-slate-400">{s.played}</td>
                          <td className="px-2 py-3 text-center text-emerald-400/80">{s.won}</td>
                          <td className="px-2 py-3 text-center text-slate-400">{s.drawn}</td>
                          <td className="px-2 py-3 text-center text-red-400/80">{s.lost}</td>
                          <td className="px-2 py-3 text-center text-slate-400">{s.goals_for}</td>
                          <td className="px-2 py-3 text-center text-slate-400">{s.goals_against}</td>
                          <td className="px-2 py-3 text-center font-medium">{s.goals_for - s.goals_against}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <div>
            <Card className="bg-slate-900 border-slate-800 shadow-xl">
              <CardHeader className="bg-slate-950/50 border-b border-slate-800 pb-3">
                <CardTitle className="text-lg text-slate-200 flex items-center gap-2">
                  <Play className="w-4 h-4 text-emerald-500" />
                  Últimos Resultados
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex flex-col max-h-[600px] overflow-y-auto">
                  {matches.filter(m => m.status === 'finished').slice(0, 15).map(m => {
                    const isMyMatch = m.home_club_id === myClubId || m.away_club_id === myClubId;
                    return (
                      <div key={m.id} className={`flex justify-between items-center p-3 border-b border-slate-800/50 hover:bg-slate-800/30 ${isMyMatch ? 'bg-slate-800/20' : ''}`}>
                        <div className={`text-sm truncate flex-1 text-right ${m.home_club_id === myClubId ? 'font-bold text-emerald-400' : 'text-slate-300'}`}>
                          {m.home.name}
                        </div>
                        <div className="flex items-center gap-2 mx-3 bg-slate-950 px-2 py-1 rounded-md border border-slate-800">
                          <span className="font-bold text-white">{m.home_goals}</span>
                          <span className="text-slate-600 text-xs">x</span>
                          <span className="font-bold text-white">{m.away_goals}</span>
                        </div>
                        <div className={`text-sm truncate flex-1 text-left ${m.away_club_id === myClubId ? 'font-bold text-emerald-400' : 'text-slate-300'}`}>
                          {m.away.name}
                        </div>
                      </div>
                    );
                  })}
                  {matches.filter(m => m.status === 'finished').length === 0 && (
                    <div className="p-6 text-center text-slate-500 text-sm">
                      Nenhuma partida jogada ainda.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
