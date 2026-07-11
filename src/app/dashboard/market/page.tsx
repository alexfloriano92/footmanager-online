import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Filter, ShoppingCart } from "lucide-react";
import Link from "next/link";

export default async function MarketPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: coach } = await supabase
    .from('coaches')
    .select('*, club_owners(club_id)')
    .eq('user_id', user.id)
    .single();

  const clubId = coach?.club_owners?.[0]?.club_id;

  const { data: marketListings } = await supabase
    .from('market')
    .select(`
      *,
      player:players(id, name, position, overall, age, nationality),
      club:clubs(id, name, badge_url)
    `)
    .eq('is_active', true)
    .neq('club_id', clubId) // Não mostrar próprios jogadores
    .order('listed_at', { ascending: false })
    .limit(50);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Mercado de Transferências</h1>
        <p className="text-slate-400">Encontre novos talentos para reforçar seu elenco.</p>
      </div>

      <div className="flex gap-4 items-center mb-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
          <Input 
            placeholder="Buscar por nome, posição ou clube..." 
            className="pl-9 bg-slate-900 border-slate-800 text-white"
          />
        </div>
        <Button variant="outline" className="border-slate-800 bg-slate-900 text-slate-300">
          <Filter className="mr-2 h-4 w-4" />
          Filtros
        </Button>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle>Jogadores Listados</CardTitle>
          <CardDescription className="text-slate-400">
            Mostrando os {marketListings?.length || 0} jogadores mais recentes no mercado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-800 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-950 border-slate-800">
                <TableRow className="border-slate-800 hover:bg-slate-900">
                  <TableHead className="w-[80px]">Pos</TableHead>
                  <TableHead>Jogador</TableHead>
                  <TableHead>Clube</TableHead>
                  <TableHead className="text-center w-[80px]">OVR</TableHead>
                  <TableHead className="text-center w-[120px]">Valor Base</TableHead>
                  <TableHead className="text-right w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {marketListings?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                      O mercado está vazio no momento.
                    </TableCell>
                  </TableRow>
                ) : (
                  marketListings?.map((listing: any) => (
                    <TableRow key={listing.id} className="border-slate-800 border-b hover:bg-slate-800/50">
                      <TableCell className="font-medium">
                        <Badge variant="outline" className="border-emerald-500 text-emerald-400">
                          {listing.player.position}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-200">{listing.player.name}</span>
                          <span className="text-xs text-slate-500">{listing.player.nationality}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-300">{listing.club.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-slate-800 hover:bg-slate-800 text-slate-50 font-bold border-none">
                          {listing.player.overall}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-slate-300 font-medium">
                        {formatCurrency(listing.listing_price)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/dashboard/market/offer/${listing.player.id}`}>
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Proposta
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
