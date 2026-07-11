"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRightLeft, Check, X, Inbox, Send } from "lucide-react";
import { acceptOffer, rejectOffer } from "@/app/actions/transfers";

export default function NegotiationsPage() {
  const [incomingOffers, setIncomingOffers] = useState<any[]>([]);
  const [outgoingOffers, setOutgoingOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const supabase = createClient();

  const loadOffers = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: coach } = await supabase
      .from('coaches')
      .select('club_owners(club_id)')
      .eq('user_id', user.id)
      .single();

    const myClubId = coach?.club_owners?.[0]?.club_id;
    if (!myClubId) return;

    // Fetch incoming offers
    const { data: incoming } = await supabase
      .from('transfer_offers')
      .select(`
        *,
        from_club:clubs!from_club_id(name, primary_color),
        target_player:players!target_player_id(id, name, position, overall, market_value)
      `)
      .eq('to_club_id', myClubId)
      .order('created_at', { ascending: false });

    // Fetch outgoing offers
    const { data: outgoing } = await supabase
      .from('transfer_offers')
      .select(`
        *,
        to_club:clubs!to_club_id(name, primary_color),
        target_player:players!target_player_id(id, name, position, overall, market_value)
      `)
      .eq('from_club_id', myClubId)
      .order('created_at', { ascending: false });

    // For each offer, we need to fetch the offered players details
    const enrichOffers = async (offers: any[]) => {
      const enriched = [];
      for (const off of offers) {
        let players: any[] = [];
        if (off.offered_player_ids && off.offered_player_ids.length > 0) {
          const { data: p } = await supabase
            .from('players')
            .select('id, name, position, overall, market_value')
            .in('id', off.offered_player_ids);
          if (p) players = p;
        }
        enriched.push({ ...off, offered_players: players });
      }
      return enriched;
    };

    if (incoming) setIncomingOffers(await enrichOffers(incoming));
    if (outgoing) setOutgoingOffers(await enrichOffers(outgoing));
    setLoading(false);
  };

  useEffect(() => {
    loadOffers();
  }, []);

  const handleAccept = async (offerId: string) => {
    setProcessing(offerId);
    const res = await acceptOffer(offerId);
    if (res.error) alert(`Erro: ${res.error}`);
    else alert('Proposta ACEITA! O jogador agora é do outro clube, e o dinheiro/trocas foram transferidos.');
    await loadOffers();
    setProcessing(null);
  };

  const handleReject = async (offerId: string) => {
    setProcessing(offerId);
    const res = await rejectOffer(offerId);
    if (res.error) alert(`Erro: ${res.error}`);
    await loadOffers();
    setProcessing(null);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending': return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/50">Pendente</Badge>;
      case 'accepted': return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/50">Aceita</Badge>;
      case 'rejected': return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/50">Rejeitada</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) return <div className="p-8 text-center animate-pulse">Carregando Negociações...</div>;

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <ArrowRightLeft className="w-8 h-8 text-primary" />
          Central de Negociações
        </h1>
        <p className="text-muted-foreground mt-1">Gerencie propostas recebidas pelos seus jogadores e acompanhe as ofertas que você enviou.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* INCOMING */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2 border-b border-slate-800 pb-2">
            <Inbox className="w-5 h-5 text-emerald-500" />
            Caixa de Entrada (Recebidas)
          </h2>
          
          {incomingOffers.length === 0 ? (
            <div className="text-center p-8 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed text-slate-500">
              Nenhuma proposta recebida.
            </div>
          ) : (
            incomingOffers.map(offer => (
              <Card key={offer.id} className="bg-slate-950 border-slate-800 overflow-hidden">
                <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">De:</span>
                    <span className="font-bold text-white">{offer.from_club?.name}</span>
                  </div>
                  {getStatusBadge(offer.status)}
                </div>
                
                <CardContent className="p-4 space-y-4">
                  <div>
                    <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Eles querem:</span>
                    <div className="flex items-center gap-3 mt-2 bg-slate-900 p-3 rounded-lg border border-slate-800">
                      <div className="text-2xl font-black text-amber-400">{offer.target_player?.overall}</div>
                      <div>
                        <div className="font-bold text-white">{offer.target_player?.name}</div>
                        <div className="text-xs text-slate-400">{offer.target_player?.position} • Valor: {formatCurrency(offer.target_player?.market_value)}</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Eles oferecem:</span>
                    <div className="mt-2 space-y-2">
                      <div className="flex justify-between items-center bg-emerald-950/30 p-3 rounded-lg border border-emerald-900/50">
                        <span className="text-sm font-medium text-emerald-500">Dinheiro:</span>
                        <span className="font-bold text-emerald-400">{formatCurrency(offer.offered_cash)}</span>
                      </div>
                      
                      {offer.offered_players?.map((p: any) => (
                        <div key={p.id} className="flex items-center gap-3 bg-slate-900 p-2 rounded-lg border border-slate-800">
                          <div className="text-lg font-black text-blue-400">{p.overall}</div>
                          <div>
                            <div className="font-bold text-sm text-white flex items-center gap-2">
                              <ArrowRightLeft className="w-3 h-3 text-slate-500" />
                              {p.name}
                            </div>
                            <div className="text-xs text-slate-400">{p.position} • Valor: {formatCurrency(p.market_value)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {offer.status === 'pending' && (
                    <div className="flex gap-3 pt-2">
                      <Button 
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white"
                        onClick={() => handleAccept(offer.id)}
                        disabled={processing !== null}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        {processing === offer.id ? "Processando..." : "Aceitar Oferta"}
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-1 border-red-900/50 text-red-500 hover:bg-red-950"
                        onClick={() => handleReject(offer.id)}
                        disabled={processing !== null}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Rejeitar
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* OUTGOING */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2 border-b border-slate-800 pb-2">
            <Send className="w-5 h-5 text-blue-500" />
            Propostas Enviadas
          </h2>
          
          {outgoingOffers.length === 0 ? (
            <div className="text-center p-8 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed text-slate-500">
              Você não enviou nenhuma proposta.
            </div>
          ) : (
            outgoingOffers.map(offer => (
              <Card key={offer.id} className="bg-slate-950 border-slate-800 overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
                <div className="p-3 border-b border-slate-800 bg-slate-900/30 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Para:</span>
                    <span className="font-bold text-sm text-white">{offer.to_club?.name}</span>
                  </div>
                  {getStatusBadge(offer.status)}
                </div>
                
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">Alvo:</span>
                    <span className="font-bold text-amber-400">{offer.target_player?.name}</span>
                  </div>
                  <div className="flex flex-col gap-1 text-sm">
                    <span className="text-xs text-slate-500">Sua Oferta:</span>
                    <div className="text-emerald-400 font-medium">{formatCurrency(offer.offered_cash)}</div>
                    {offer.offered_players?.map((p:any) => (
                      <div key={p.id} className="text-slate-300 text-xs">+ {p.name} ({p.overall})</div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
