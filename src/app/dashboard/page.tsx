import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Trophy, Users, TrendingUp, AlertCircle, ChevronRight } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: coach } = await supabase
    .from('coaches')
    .select('*, club_owners(club_id)')
    .eq('user_id', user.id)
    .single();

  const clubId = coach?.club_owners?.[0]?.club_id;

  const { data: club } = await supabase
    .from('clubs')
    .select(`
      *,
      finances(*),
      stadiums(*)
    `)
    .eq('id', clubId)
    .single();

  const { data: squad } = await supabase
    .from('players')
    .select('id')
    .eq('club_id', clubId);
    
  const squadSize = squad?.length || 0;

  const formatCurrency = (value: number) => {
    if (!value) return "€0";
    if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `€${(value / 1000).toFixed(0)}K`;
    return `€${value}`;
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Bem-vindo, {coach?.name}!</h1>
        <p className="text-slate-400">Aqui está o resumo do seu clube para esta semana.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-300">Caixa Atual</CardTitle>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(club?.finances?.[0]?.cash_balance || 0)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Orçamento de transf.: {formatCurrency(club?.finances?.[0]?.transfer_budget || 0)}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-300">Elenco</CardTitle>
            <Users className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{squadSize} <span className="text-lg text-slate-400 font-normal">jogadores</span></div>
            <p className="text-xs text-slate-500 mt-1">
              Folha salarial: {formatCurrency(club?.finances?.[0]?.weekly_wage_bill || 0)}/sem
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-300">Reputação</CardTitle>
            <Trophy className="w-4 h-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{club?.prestige || 50}<span className="text-lg text-slate-400 font-normal">/100</span></div>
            <p className="text-xs text-slate-500 mt-1">
              {coach?.reputation || 50} (Treinador)
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-300">Próximo Jogo</CardTitle>
            <CalendarDays className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-white truncate">Sem jogos</div>
            <p className="text-xs text-slate-500 mt-1">
              Nenhuma partida agendada
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle>Visão Geral da Temporada</CardTitle>
            <CardDescription className="text-slate-400">Seu desempenho nas competições atuais</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
            <Trophy className="h-12 w-12 text-slate-700 mb-4" />
            <p>A temporada ainda não começou.</p>
            <p className="text-sm">Aguarde o sorteio dos campeonatos.</p>
            <Button variant="outline" className="mt-4 border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white">
              Ver Ligas
            </Button>
          </CardContent>
        </Card>
        
        <Card className="col-span-3 bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle>Avisos</CardTitle>
            <CardDescription className="text-slate-400">Atenção requerida</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-4 rounded-lg border border-slate-800 bg-slate-950 p-3">
                <AlertCircle className="mt-0.5 h-5 w-5 text-amber-500" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none text-slate-200">Elenco incompleto</p>
                  <p className="text-xs text-slate-400">Você precisa de pelo menos 18 jogadores para competir. (Atual: {squadSize})</p>
                </div>
              </div>
              <div className="flex items-start gap-4 rounded-lg border border-slate-800 bg-slate-950 p-3">
                <AlertCircle className="mt-0.5 h-5 w-5 text-emerald-500" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none text-slate-200">Bem-vindo ao clube!</p>
                  <p className="text-xs text-slate-400">Explore o menu lateral para conhecer as dependências do {club?.name}.</p>
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <Link href="/club">
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                  Acessar Sede do Clube <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
