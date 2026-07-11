"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Swords, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function MatchesPage() {
  const [clubs, setClubs] = useState<any[]>([]);
  const [myClub, setMyClub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [matchResult, setMatchResult] = useState<any>(null);
  
  const supabase = createClient();

  useEffect(() => {
    async function loadClubs() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: coach } = await supabase
        .from("coaches")
        .select("*, club_owners(club_id)")
        .eq("user_id", user.id)
        .single();

      const clubId = coach?.club_owners?.[0]?.club_id;
      
      const { data: allClubs } = await supabase
        .from("clubs")
        .select("*, players(*)")
        .order("prestige", { ascending: false });

      if (allClubs) {
        setClubs(allClubs.filter(c => c.id !== clubId));
        setMyClub(allClubs.find(c => c.id === clubId));
      }
      setLoading(false);
    }
    loadClubs();
  }, []);

  const simulateMatch = async (opponent: any) => {
    setSimulating(true);
    setMatchResult(null);

    // Calculate team powers
    const getPower = (team: any) => {
      const players = team.players || [];
      if (players.length === 0) return { att: 50, def: 50 };
      
      const attackers = players.filter((p:any) => ['ST','LW','RW','CAM','RM','LM','CF'].includes(p.position));
      const defenders = players.filter((p:any) => ['CB','LB','RB','CDM','GK'].includes(p.position));
      
      const attAvg = attackers.length ? attackers.reduce((sum:number, p:any) => sum + (p.shooting + p.pace + p.dribbling)/3, 0) / attackers.length : 50;
      const defAvg = defenders.length ? defenders.reduce((sum:number, p:any) => sum + (p.defending + p.physical)/2, 0) / defenders.length : 50;
      
      return { att: attAvg, def: defAvg };
    };

    const myPower = getPower(myClub);
    const oppPower = getPower(opponent);

    // Give a slight advantage to the player for fun, but keep it mostly realistic
    const myGoals = Math.max(0, Math.round((myPower.att * 0.45 - oppPower.def * 0.35) + Math.random() * 2.5));
    const oppGoals = Math.max(0, Math.round((oppPower.att * 0.4 - myPower.def * 0.4) + Math.random() * 2));

    const result = {
      home: myClub,
      away: opponent,
      homeGoals: myGoals,
      awayGoals: oppGoals,
      stats: {
        possession: `${Math.round(40 + Math.random()*20)}% - ${Math.round(40 + Math.random()*20)}%`,
        shots: `${myGoals + Math.floor(Math.random()*5)} - ${oppGoals + Math.floor(Math.random()*5)}`,
        corners: `${Math.floor(Math.random()*8)} - ${Math.floor(Math.random()*8)}`
      }
    };

    // Simulate delay
    setTimeout(() => {
      setSimulating(false);
      setMatchResult(result);
    }, 2000);
  };

  if (loading) return <div className="p-8 text-center animate-pulse">Carregando adversários...</div>;
  if (!myClub) return <div className="p-8 text-center text-red-500">Erro: Clube não encontrado.</div>;

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Central de Partidas</h1>
          <p className="text-muted-foreground">Desafie outros clubes e teste sua tática.</p>
        </div>
        <Trophy className="w-12 h-12 text-primary opacity-20" />
      </div>

      <AnimatePresence>
        {matchResult && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          >
            <Card className="w-full max-w-2xl bg-slate-900 border-primary/50 shadow-2xl shadow-primary/20 overflow-hidden relative">
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-2 right-2 text-slate-400 hover:text-white"
                onClick={() => setMatchResult(null)}
              >
                <X className="w-5 h-5" />
              </Button>
              
              <div className="bg-gradient-to-b from-green-900/40 to-transparent p-8">
                <div className="text-center mb-8">
                  <h2 className="text-xl font-medium text-green-400 mb-2">FIM DE JOGO</h2>
                  <div className="flex items-center justify-center gap-8 text-4xl font-black">
                    <div className="flex-1 text-right truncate" style={{color: matchResult.home.primary_color}}>{matchResult.home.short_name}</div>
                    <div className="px-6 py-4 bg-slate-950 rounded-xl text-white min-w-[120px] flex justify-center gap-4">
                      <span>{matchResult.homeGoals}</span>
                      <span className="text-slate-600">-</span>
                      <span>{matchResult.awayGoals}</span>
                    </div>
                    <div className="flex-1 text-left truncate" style={{color: matchResult.away.primary_color}}>{matchResult.away.short_name}</div>
                  </div>
                </div>

                <div className="bg-slate-950/50 rounded-lg p-6 space-y-4 text-sm font-medium">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="text-slate-400 w-20 text-right">{matchResult.stats.possession.split('-')[0]}</span>
                    <span className="text-slate-500">Posse de Bola</span>
                    <span className="text-slate-400 w-20 text-left">{matchResult.stats.possession.split('-')[1]}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="text-slate-400 w-20 text-right">{matchResult.stats.shots.split('-')[0]}</span>
                    <span className="text-slate-500">Finalizações</span>
                    <span className="text-slate-400 w-20 text-left">{matchResult.stats.shots.split('-')[1]}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 w-20 text-right">{matchResult.stats.corners.split('-')[0]}</span>
                    <span className="text-slate-500">Escanteios</span>
                    <span className="text-slate-400 w-20 text-left">{matchResult.stats.corners.split('-')[1]}</span>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clubs.slice(0, 50).map((club) => (
          <Card key={club.id} className="bg-card hover:bg-slate-900/50 transition-colors border-slate-800">
            <CardHeader className="pb-4">
              <CardTitle className="flex justify-between items-center">
                <span className="truncate pr-2" style={{color: club.primary_color}}>{club.name}</span>
                <span className="text-sm font-normal text-muted-foreground bg-slate-900 px-2 py-1 rounded">
                  OVR {club.prestige}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => simulateMatch(club)} 
                disabled={simulating}
                className="w-full bg-slate-800 hover:bg-primary hover:text-primary-foreground text-white border-none"
                variant="outline"
              >
                <Swords className="w-4 h-4 mr-2" />
                Desafiar
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
