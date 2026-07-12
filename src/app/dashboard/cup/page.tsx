"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, RefreshCw, Play, Plus } from "lucide-react";
import { generateCup, simulateCupRound } from "@/app/actions/cup";

export default function CupPage() {
  const [myClubId, setMyClubId] = useState<string | null>(null);
  const [leagueId, setLeagueId] = useState<string | null>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [clubs, setClubs] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);

  const supabase = createClient();

  const loadCup = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: coach } = await supabase.from('coaches').select('club_owners(club_id)').eq('user_id', user.id).single();
    const cid = coach?.club_owners?.[0]?.club_id;
    setMyClubId(cid);

    if (!cid) return;

    const { data: club } = await supabase.from('clubs').select('league_id').eq('id', cid).single();
    setLeagueId(club?.league_id);

    if (club?.league_id) {
      // get clubs mapping
      const { data: leagueClubs } = await supabase.from('clubs').select('id, name, badge_url, primary_color').eq('league_id', club.league_id);
      const clubMap: any = {};
      const cIds: string[] = [];
      leagueClubs?.forEach(c => {
        clubMap[c.id] = c;
        cIds.push(c.id);
      });
      setClubs(clubMap);

      // get cup matches
      const { data: cupMatches } = await supabase
        .from('matches')
        .select('*')
        .eq('match_type', 'cup')
        .in('home_club_id', cIds)
        .order('created_at', { ascending: true });

      setMatches(cupMatches || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCup();
  }, []);

  const handleGenerate = async () => {
    setSimulating(true);
    await generateCup();
    await loadCup();
    setSimulating(false);
  };

  const handleSimulate = async () => {
    setSimulating(true);
    await simulateCupRound();
    await loadCup();
    setSimulating(false);
  };

  const getMatchesByRound = (roundName: string) => {
    return matches.filter(m => m.cup_round === roundName);
  };

  const oitavas = getMatchesByRound('Oitavas');
  const quartas = getMatchesByRound('Quartas');
  const semi = getMatchesByRound('Semi');
  const final = getMatchesByRound('Final');

  const pendingMatches = matches.filter(m => m.status === 'pending');
  const cupIsOver = oitavas.length > 0 && final.length > 0 && pendingMatches.length === 0;

  const renderMatch = (m: any) => {
    if (!m) return (
      <div className="w-full h-16 bg-slate-900/50 border border-slate-800 rounded-md flex items-center justify-center text-slate-600 text-xs">
        Aguardando
      </div>
    );
    
    const h = clubs[m.home_club_id];
    const a = clubs[m.away_club_id];
    const isMyMatch = m.home_club_id === myClubId || m.away_club_id === myClubId;
    const isFinished = m.status === 'finished';

    return (
      <div className={`w-full bg-slate-900 border rounded-md overflow-hidden flex flex-col ${isMyMatch ? 'border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'border-slate-800'}`}>
        <div className="flex justify-between items-center px-3 py-1.5 border-b border-slate-800">
          <span className={`text-xs truncate ${h?.id === myClubId ? 'text-amber-400 font-bold' : 'text-slate-300'}`}>{h?.name}</span>
          <span className={`font-bold ${isFinished ? (m.home_goals > m.away_goals ? 'text-emerald-400' : 'text-slate-500') : 'text-slate-600'}`}>{isFinished ? m.home_goals : '-'}</span>
        </div>
        <div className="flex justify-between items-center px-3 py-1.5 bg-slate-950/50">
          <span className={`text-xs truncate ${a?.id === myClubId ? 'text-amber-400 font-bold' : 'text-slate-300'}`}>{a?.name}</span>
          <span className={`font-bold ${isFinished ? (m.away_goals > m.home_goals ? 'text-emerald-400' : 'text-slate-500') : 'text-slate-600'}`}>{isFinished ? m.away_goals : '-'}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto p-4 md:p-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-600 flex items-center gap-3">
            <Trophy className="w-8 h-8 text-amber-500" />
            Copa Nacional
          </h1>
          <p className="text-muted-foreground mt-1">Torneio mata-mata com 16 equipes. Vencer ou voltar pra casa.</p>
        </div>
        
        {oitavas.length === 0 ? (
          <Button onClick={handleGenerate} disabled={simulating || loading} className="bg-amber-600 hover:bg-amber-500 text-white">
            <Plus className="w-5 h-5 mr-2" />
            Sortear Chaveamento
          </Button>
        ) : cupIsOver ? (
          <Button onClick={handleGenerate} disabled={simulating || loading} className="bg-slate-700 hover:bg-slate-600 text-white">
            <RefreshCw className="w-5 h-5 mr-2" />
            Nova Copa
          </Button>
        ) : (
          <Button onClick={handleSimulate} disabled={simulating || loading || pendingMatches.length === 0} className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]">
            {simulating ? <RefreshCw className="w-5 h-5 mr-2 animate-spin" /> : <Play className="w-5 h-5 mr-2" />}
            {simulating ? "Simulando..." : "Jogar Próxima Rodada"}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center bg-slate-900/50 rounded-xl border border-slate-800 animate-pulse">
          <Trophy className="w-12 h-12 text-slate-700" />
        </div>
      ) : oitavas.length === 0 ? (
        <Card className="bg-slate-900 border-slate-800 text-center p-12">
          <Trophy className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-300">Nenhum torneio ativo</h3>
          <p className="text-slate-500 mt-2">Clique no botão acima para sortear as oitavas de final da Copa Nacional.</p>
        </Card>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-8">
          {/* Oitavas */}
          <div className="flex flex-col gap-4 w-48 shrink-0">
            <div className="text-center font-bold text-slate-500 mb-2 uppercase tracking-wider text-sm">Oitavas</div>
            {Array.from({length: 8}).map((_, i) => (
              <div key={i} className="mb-4">{renderMatch(oitavas[i])}</div>
            ))}
          </div>

          {/* Lines */}
          <div className="w-8 shrink-0 relative hidden md:block"></div>

          {/* Quartas */}
          <div className="flex flex-col justify-around w-48 shrink-0 py-8">
            <div className="text-center font-bold text-slate-500 mb-2 uppercase tracking-wider text-sm">Quartas</div>
            {Array.from({length: 4}).map((_, i) => (
              <div key={i} className="">{renderMatch(quartas[i])}</div>
            ))}
          </div>

          {/* Lines */}
          <div className="w-8 shrink-0 relative hidden md:block"></div>

          {/* Semi */}
          <div className="flex flex-col justify-around w-48 shrink-0 py-24">
            <div className="text-center font-bold text-slate-500 mb-2 uppercase tracking-wider text-sm">Semifinal</div>
            {Array.from({length: 2}).map((_, i) => (
              <div key={i} className="">{renderMatch(semi[i])}</div>
            ))}
          </div>

          {/* Lines */}
          <div className="w-8 shrink-0 relative hidden md:block"></div>

          {/* Final */}
          <div className="flex flex-col justify-center w-56 shrink-0">
            <div className="text-center font-bold text-amber-500 mb-4 uppercase tracking-wider text-xl flex flex-col items-center gap-2">
              <Trophy className="w-8 h-8 text-amber-400" />
              Grande Final
            </div>
            <div className="transform scale-110">
              {renderMatch(final[0])}
            </div>
            {cupIsOver && (
              <div className="mt-8 text-center bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <p className="text-amber-400 font-bold mb-1">Campeão Consagrado!</p>
                <p className="text-xs text-slate-400">+ € 20.000.000 em prêmios</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
