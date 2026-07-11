"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, RefreshCw, Play } from "lucide-react";
import { simulateRound } from "@/app/actions/competitions";

interface TeamStats {
  id: string;
  name: string;
  color: string;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
}

export default function CompetitionsPage() {
  const [leagueName, setLeagueName] = useState("Sua Liga");
  const [myClubId, setMyClubId] = useState<string | null>(null);
  const [table, setTable] = useState<TeamStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);

  const supabase = createClient();

  const loadLeague = async () => {
    setLoading(true);
    
    // 1. Get user club and league
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: coach } = await supabase
      .from('coaches')
      .select('club_owners(club_id)')
      .eq('user_id', user.id)
      .single();

    const cid = coach?.club_owners?.[0]?.club_id;
    setMyClubId(cid);

    if (!cid) return;

    const { data: club } = await supabase
      .from('clubs')
      .select('league_id, leagues(name)')
      .eq('id', cid)
      .single();

    if (!club?.league_id) return;
    const leagueData = Array.isArray(club.leagues) ? club.leagues[0] : club.leagues;
    setLeagueName((leagueData as any)?.name || "Liga Global");

    // 2. Fetch all clubs in the league
    const { data: leagueClubs } = await supabase
      .from('clubs')
      .select('id, name, primary_color')
      .eq('league_id', club.league_id);

    if (!leagueClubs) return;

    // 3. Fetch all league matches for these clubs
    const clubIds = leagueClubs.map(c => c.id);
    const { data: matches } = await supabase
      .from('matches')
      .select('*')
      .eq('match_type', 'league')
      .in('home_club_id', clubIds);

    // 4. Calculate table
    const stats: Record<string, TeamStats> = {};
    leagueClubs.forEach(c => {
      stats[c.id] = { id: c.id, name: c.name, color: c.primary_color, points: 0, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0 };
    });

    if (matches) {
      matches.forEach(m => {
        if (!stats[m.home_club_id] || !stats[m.away_club_id]) return;
        
        const h = stats[m.home_club_id];
        const a = stats[m.away_club_id];

        h.played += 1;
        a.played += 1;
        h.gf += m.home_goals;
        h.ga += m.away_goals;
        a.gf += m.away_goals;
        a.ga += m.home_goals;

        if (m.home_goals > m.away_goals) {
          h.won += 1; h.points += 3;
          a.lost += 1;
        } else if (m.home_goals < m.away_goals) {
          a.won += 1; a.points += 3;
          h.lost += 1;
        } else {
          h.drawn += 1; h.points += 1;
          a.drawn += 1; a.points += 1;
        }
      });
    }

    // 5. Compute Goal Difference and sort
    const sortedTable = Object.values(stats).map(s => {
      s.gd = s.gf - s.ga;
      return s;
    }).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.gd !== a.gd) return b.gd - a.gd;
      return b.gf - a.gf;
    });

    setTable(sortedTable);
    setLoading(false);
  };

  useEffect(() => {
    loadLeague();
  }, []);

  const handleSimulate = async () => {
    setSimulating(true);
    const res = await simulateRound();
    if (res.error) alert(`Erro: ${res.error}`);
    else {
      // Small delay for dramatic effect
      setTimeout(() => {
        loadLeague();
        setSimulating(false);
      }, 1000);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto p-4 md:p-8">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 flex items-center gap-3">
            <Trophy className="w-8 h-8 text-blue-500" />
            {leagueName}
          </h1>
          <p className="text-muted-foreground mt-1">Acompanhe a tabela e jogue as rodadas do campeonato.</p>
        </div>
        
        <Button 
          onClick={handleSimulate} 
          disabled={simulating || loading}
          className="bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]"
        >
          {simulating ? (
            <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Play className="w-5 h-5 mr-2" />
          )}
          {simulating ? "Simulando Rodada..." : "Jogar Próxima Rodada"}
        </Button>
      </div>

      {loading ? (
        <div className="h-96 flex items-center justify-center bg-slate-900/50 rounded-xl border border-slate-800 animate-pulse">
          <Trophy className="w-12 h-12 text-slate-700" />
        </div>
      ) : (
        <Card className="bg-slate-950 border-slate-800 shadow-2xl">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-400 uppercase bg-slate-900 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4 rounded-tl-lg text-center w-12">Pos</th>
                    <th className="px-6 py-4">Clube</th>
                    <th className="px-4 py-4 text-center" title="Pontos">PTS</th>
                    <th className="px-4 py-4 text-center" title="Jogos">J</th>
                    <th className="px-4 py-4 text-center" title="Vitórias">V</th>
                    <th className="px-4 py-4 text-center" title="Empates">E</th>
                    <th className="px-4 py-4 text-center" title="Derrotas">D</th>
                    <th className="px-4 py-4 text-center" title="Gols Pró">GP</th>
                    <th className="px-4 py-4 text-center" title="Gols Contra">GC</th>
                    <th className="px-4 py-4 text-center" title="Saldo de Gols">SG</th>
                  </tr>
                </thead>
                <tbody>
                  {table.map((team, index) => {
                    const isMe = team.id === myClubId;
                    // Colors for champions league, europa league, relegation
                    let rowClass = "border-b border-slate-800/50 hover:bg-slate-900/50 transition-colors ";
                    if (isMe) rowClass += "bg-blue-500/10 hover:bg-blue-500/20 font-bold ";
                    if (index < 4) rowClass += "border-l-4 border-l-blue-500 "; // Champions
                    else if (index < 6) rowClass += "border-l-4 border-l-amber-500 "; // Europa
                    else if (index >= table.length - 3 && table.length > 10) rowClass += "border-l-4 border-l-red-500 "; // Relegation
                    else rowClass += "border-l-4 border-l-transparent ";

                    return (
                      <tr key={team.id} className={rowClass}>
                        <td className="px-6 py-4 text-center font-bold text-slate-500">
                          {index + 1}º
                        </td>
                        <td className="px-6 py-4 flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: team.color }} />
                          <span className={isMe ? 'text-blue-400' : 'text-white'}>{team.name}</span>
                          {isMe && <Badge className="bg-blue-500 hover:bg-blue-600 text-white text-[10px] px-1.5 py-0 ml-2">VOCÊ</Badge>}
                        </td>
                        <td className="px-4 py-4 text-center font-black text-lg text-white">
                          {team.points}
                        </td>
                        <td className="px-4 py-4 text-center text-slate-300">{team.played}</td>
                        <td className="px-4 py-4 text-center text-emerald-400">{team.won}</td>
                        <td className="px-4 py-4 text-center text-slate-400">{team.drawn}</td>
                        <td className="px-4 py-4 text-center text-red-400">{team.lost}</td>
                        <td className="px-4 py-4 text-center text-slate-300">{team.gf}</td>
                        <td className="px-4 py-4 text-center text-slate-300">{team.ga}</td>
                        <td className="px-4 py-4 text-center font-medium text-white">{team.gd > 0 ? `+${team.gd}` : team.gd}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
