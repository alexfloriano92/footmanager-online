import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Player } from "@/types";

export default async function SquadPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: coach } = await supabase
    .from('coaches')
    .select('*, club_owners(club_id)')
    .eq('user_id', user.id)
    .single();

  const clubId = coach?.club_owners?.[0]?.club_id;
  if (!clubId) redirect('/onboarding/club');

  const { data: players } = await supabase
    .from('players')
    .select(`
      *,
      contracts(weekly_salary, contract_end)
    `)
    .eq('club_id', clubId)
    .order('overall', { ascending: false });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  };

  const getPositionCategory = (pos: string) => {
    if (['GK'].includes(pos)) return 'Goleiros';
    if (['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(pos)) return 'Defensores';
    if (['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(pos)) return 'Meio-campistas';
    if (['LW', 'RW', 'ST', 'CF', 'SS'].includes(pos)) return 'Atacantes';
    return 'Outros';
  };

  const calculateAge = (birthDate: string) => {
    const diff = Date.now() - new Date(birthDate).getTime();
    return Math.abs(new Date(diff).getUTCFullYear() - 1970);
  };

  const PlayerTable = ({ filterFn }: { filterFn: (p: any) => boolean }) => (
    <Table>
      <TableHeader className="bg-slate-900 border-slate-800">
        <TableRow className="border-slate-800 hover:bg-slate-900">
          <TableHead className="w-[80px]">Pos</TableHead>
          <TableHead>Nome</TableHead>
          <TableHead className="text-center w-[80px]">Idade</TableHead>
          <TableHead className="text-center w-[80px]">OVR</TableHead>
          <TableHead className="text-center w-[120px]">Salário</TableHead>
          <TableHead className="text-right w-[100px]">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {players?.filter(filterFn).map((player) => (
          <TableRow key={player.id} className="border-slate-800 border-b hover:bg-slate-800/50">
            <TableCell className="font-medium">
              <Badge variant="outline" className="border-emerald-500 text-emerald-400">
                {player.position}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex flex-col">
                <span className="font-bold text-slate-200">{player.name}</span>
                <span className="text-xs text-slate-500">{player.nationality}</span>
              </div>
            </TableCell>
            <TableCell className="text-center text-slate-300">{calculateAge(player.birth_date)}</TableCell>
            <TableCell className="text-center">
              <Badge className="bg-slate-800 hover:bg-slate-800 text-slate-50 font-bold border-none">
                {player.overall}
              </Badge>
            </TableCell>
            <TableCell className="text-center text-slate-300">
              {formatCurrency(player.contracts?.[0]?.weekly_salary || player.weekly_salary)}
            </TableCell>
            <TableCell className="text-right">
              <Link href={`/dashboard/squad/${player.id}`}>
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                  Ver
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Plantel Profissional</h1>
        <p className="text-slate-400">Gerencie seus jogadores, salários e contratos.</p>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle>Jogadores</CardTitle>
          <CardDescription className="text-slate-400">
            {players?.length || 0} jogadores sob contrato.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="bg-slate-950 border border-slate-800 text-slate-400">
              <TabsTrigger value="all" className="data-[state=active]:bg-slate-800 data-[state=active]:text-slate-50">Todos</TabsTrigger>
              <TabsTrigger value="gk" className="data-[state=active]:bg-slate-800 data-[state=active]:text-slate-50">Goleiros</TabsTrigger>
              <TabsTrigger value="def" className="data-[state=active]:bg-slate-800 data-[state=active]:text-slate-50">Defensores</TabsTrigger>
              <TabsTrigger value="mid" className="data-[state=active]:bg-slate-800 data-[state=active]:text-slate-50">Meio-campo</TabsTrigger>
              <TabsTrigger value="atk" className="data-[state=active]:bg-slate-800 data-[state=active]:text-slate-50">Atacantes</TabsTrigger>
            </TabsList>
            
            <div className="mt-6 rounded-md border border-slate-800 overflow-hidden">
              <TabsContent value="all" className="m-0 border-none">
                <PlayerTable filterFn={() => true} />
              </TabsContent>
              <TabsContent value="gk" className="m-0 border-none">
                <PlayerTable filterFn={(p) => getPositionCategory(p.position) === 'Goleiros'} />
              </TabsContent>
              <TabsContent value="def" className="m-0 border-none">
                <PlayerTable filterFn={(p) => getPositionCategory(p.position) === 'Defensores'} />
              </TabsContent>
              <TabsContent value="mid" className="m-0 border-none">
                <PlayerTable filterFn={(p) => getPositionCategory(p.position) === 'Meio-campistas'} />
              </TabsContent>
              <TabsContent value="atk" className="m-0 border-none">
                <PlayerTable filterFn={(p) => getPositionCategory(p.position) === 'Atacantes'} />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
