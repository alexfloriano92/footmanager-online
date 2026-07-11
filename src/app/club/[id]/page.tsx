import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Globe, Star, Users, Swords } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

const POSITION_ORDER = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'CF', 'ST'];

function getOvrColor(ovr: number) {
  if (ovr >= 90) return 'text-amber-300';
  if (ovr >= 80) return 'text-emerald-400';
  if (ovr >= 70) return 'text-sky-400';
  return 'text-slate-400';
}

function formatValue(val: number) {
  if (val >= 1_000_000) return `€${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `€${(val / 1_000).toFixed(0)}K`;
  return `€${val}`;
}

export default async function ClubProfilePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch club info
  const { data: club } = await supabase
    .from('clubs')
    .select('id, name, country, prestige, primary_color, founded_year')
    .eq('id', id)
    .single();

  if (!club) notFound();

  // Fetch top 25 players
  const { data: players } = await supabase
    .from('players')
    .select('id, name, position, nationality, overall, market_value')
    .eq('club_id', id)
    .order('overall', { ascending: false })
    .limit(25);

  // Fetch tactics
  const { data: tactics } = await supabase
    .from('tactics')
    .select('formation, player_slots')
    .eq('club_id', id)
    .single();

  const formation = tactics?.formation ?? null;
  const prestige = club.prestige ?? 50;
  const primaryColor = club.primary_color ?? '#22c55e';

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Hero Section */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}33 0%, #0f172a 60%, #020617 100%)`,
        }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            background: `radial-gradient(circle at 20% 50%, ${primaryColor} 0%, transparent 60%)`,
          }}
        />
        <div className="relative z-10 max-w-5xl mx-auto px-4 md:px-8 py-14 flex flex-col md:flex-row items-start md:items-center gap-8">
          {/* Color dot / crest placeholder */}
          <div
            className="w-24 h-24 rounded-2xl flex items-center justify-center shadow-2xl border-2 border-white/10 flex-shrink-0"
            style={{ backgroundColor: `${primaryColor}22`, borderColor: `${primaryColor}55` }}
          >
            <div className="w-14 h-14 rounded-full" style={{ backgroundColor: primaryColor }} />
          </div>

          <div className="flex-1">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight">{club.name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              {club.country && (
                <span className="flex items-center gap-1.5 text-slate-300 text-sm">
                  <Globe className="w-4 h-4 text-slate-400" />
                  {club.country}
                </span>
              )}
              {club.founded_year && (
                <span className="flex items-center gap-1.5 text-slate-300 text-sm">
                  <Star className="w-4 h-4 text-amber-400" />
                  Fundado em {club.founded_year}
                </span>
              )}
              {formation && (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-amber-300 font-bold text-sm">
                  <Swords className="w-3.5 h-3.5" />
                  {formation}
                </span>
              )}
            </div>

            {/* Prestige Bar */}
            <div className="mt-5 max-w-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-slate-400 uppercase tracking-wider">Prestígio</span>
                <span className="text-xs font-bold text-white">{prestige}/100</span>
              </div>
              <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${prestige}%`,
                    background: `linear-gradient(90deg, ${primaryColor}, #000000)`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-8">
        {/* Back link */}
        <Link
          href="/dashboard/ranking"
          className="self-start text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1.5"
        >
          ← Voltar ao Ranking
        </Link>

        {/* Players table */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-bold text-slate-100">Elenco Principal</h2>
          </div>

          <div className="rounded-xl border border-slate-800 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-400 uppercase bg-slate-900 border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5 w-10">#</th>
                    <th className="px-5 py-3.5">Jogador</th>
                    <th className="px-5 py-3.5 text-center">Pos.</th>
                    <th className="px-5 py-3.5 text-center">OVR</th>
                    <th className="px-5 py-3.5">Nacionalidade</th>
                    <th className="px-5 py-3.5 text-right">Valor de Mercado</th>
                  </tr>
                </thead>
                <tbody className="bg-slate-950 divide-y divide-slate-800/60">
                  {(players ?? []).map((player, idx) => (
                    <tr
                      key={player.id}
                      className="hover:bg-slate-900/50 transition-colors"
                    >
                      <td className="px-5 py-3 text-slate-600 font-mono text-xs">{idx + 1}</td>
                      <td className="px-5 py-3 font-semibold text-white">{player.name}</td>
                      <td className="px-5 py-3 text-center">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          {player.position ?? '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`font-black text-base ${getOvrColor(player.overall ?? 0)}`}>
                          {player.overall ?? '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-400">{player.nationality ?? '—'}</td>
                      <td className="px-5 py-3 text-right font-medium text-emerald-400/80">
                        {player.market_value ? formatValue(player.market_value) : '—'}
                      </td>
                    </tr>
                  ))}
                  {(players ?? []).length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-slate-600">
                        Nenhum jogador encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
