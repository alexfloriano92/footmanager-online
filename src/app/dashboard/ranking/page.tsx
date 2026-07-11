import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Globe, User } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function RankingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  // Get current user's club to highlight it
  const { data: coach } = await supabase
    .from('coaches')
    .select('*, club_owners(club_id)')
    .eq('user_id', user.id)
    .single();

  const myClubId = coach?.club_owners?.[0]?.club_id;

  // Fetch clubs with finances and calculate average overall
  const { data: clubsRaw } = await supabase
    .from('clubs')
    .select(`
      *,
      finances(cash_balance),
      club_owners(id),
      players(overall)
    `);

  const clubs = clubsRaw?.map(c => {
    // Calculate average overall
    const players = c.players || [];
    const avgOverall = players.length > 0 
      ? players.reduce((sum: number, p: any) => sum + p.overall, 0) / players.length 
      : 50;

    const isHuman = c.club_owners && c.club_owners.length > 0;
    const cash = c.finances?.[0]?.cash_balance || 0;
    
    // Complex scoring algorithm
    // - OVR is heavy weighted (0 to ~40 pts)
    // - Prestige gives base bonus (0 to 30 pts)
    // - Cash gives a minor bonus
    const score = (avgOverall * 0.4) + (c.prestige * 0.3) + ((cash / 1000000) * 0.05);

    return {
      ...c,
      avgOverall: Math.round(avgOverall),
      cash,
      isHuman,
      score: Math.round(score * 10) / 10
    };
  }) || [];

  // Sort by score descending
  clubs.sort((a, b) => b.score - a.score);

  const formatCurrency = (val: number) => {
    if (val >= 1000000) return `€${(val / 1000000).toFixed(1)}M`;
    return `€${val}`;
  };

  const getMedal = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return <span className="text-slate-500 font-medium w-6 text-center">{index + 1}º</span>;
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto p-4 md:p-8">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 flex items-center gap-3">
            <Globe className="w-8 h-8 text-amber-500" />
            Ranking Global
          </h1>
          <p className="text-muted-foreground mt-1">Os melhores clubes do mundo rankeados por performance e poder financeiro.</p>
        </div>
      </div>

      <Card className="bg-slate-950 border-slate-800 shadow-2xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 uppercase bg-slate-900 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 rounded-tl-lg text-center w-16">Pos</th>
                  <th className="px-6 py-4">Clube</th>
                  <th className="px-6 py-4 text-center">OVR Médio</th>
                  <th className="px-6 py-4 text-center">Prestígio</th>
                  <th className="px-6 py-4 text-right">Caixa</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right rounded-tr-lg">Score</th>
                </tr>
              </thead>
              <tbody>
                {clubs.slice(0, 50).map((club, index) => {
                  const isMe = club.id === myClubId;
                  return (
                    <tr 
                      key={club.id} 
                      className={`border-b border-slate-800/50 hover:bg-slate-900/50 transition-colors ${
                        isMe ? 'bg-amber-500/10 hover:bg-amber-500/20' : ''
                      }`}
                    >
                      <td className="px-6 py-4 text-center text-xl">
                        {getMedal(index)}
                      </td>
                      <td className="px-6 py-4 font-bold flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full shadow-sm" 
                          style={{ backgroundColor: club.primary_color }} 
                        />
                        <Link
                          href={'/club/' + club.id}
                          className={`hover:underline underline-offset-2 transition-colors ${
                            isMe ? 'text-amber-400 hover:text-amber-300' : 'text-white hover:text-slate-300'
                          }`}
                        >
                          {club.name}
                        </Link>
                        {isMe && <Badge className="bg-amber-500 hover:bg-amber-600 text-black text-[10px] px-1.5 py-0">VOCÊ</Badge>}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant="outline" className={`
                          ${club.avgOverall >= 85 ? 'border-amber-500 text-amber-500' : 
                            club.avgOverall >= 75 ? 'border-emerald-500 text-emerald-500' : 'border-slate-600 text-slate-400'}
                        `}>
                          {club.avgOverall}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="w-full bg-slate-800 rounded-full h-2 max-w-[80px] mx-auto overflow-hidden">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${club.prestige}%` }} 
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-emerald-400/80">
                        {formatCurrency(club.cash)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {club.isHuman ? (
                          <User className="w-4 h-4 mx-auto text-blue-400" />
                        ) : (
                          <span className="text-xs text-slate-600 font-mono">IA</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-black text-lg text-amber-400/90">
                        {club.score.toFixed(1)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
