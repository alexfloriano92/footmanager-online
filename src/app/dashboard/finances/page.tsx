"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight, PiggyBank, Handshake, CheckCircle2, Loader2 } from "lucide-react";
import { signSponsor, SPONSORS } from "@/app/actions/sponsors";

export default function FinancesPage() {
  const [finances, setFinances] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedSponsors, setSignedSponsors] = useState<string[]>([]);
  const [signingId, setSigningId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: coach } = await supabase
        .from('coaches')
        .select('club_owners(club_id)')
        .eq('user_id', user.id)
        .single();

      const cid = coach?.club_owners?.[0]?.club_id;
      if (!cid) return;

      // Get finances
      const { data: fin } = await supabase
        .from('finances')
        .select('*')
        .eq('club_id', cid)
        .single();

      if (fin) setFinances(fin);

      // Get transactions
      const { data: txs } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('club_id', cid)
        .order('created_at', { ascending: false })
        .limit(20);

      if (txs) setTransactions(txs);

      // Get signed sponsors
      const { data: sps } = await supabase
        .from('club_sponsors')
        .select('sponsor_id')
        .eq('club_id', cid);

      if (sps) setSignedSponsors(sps.map((s: any) => s.sponsor_id));
      setLoading(false);
    }
    load();
  }, []);

  const fmt = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val || 0);

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-[60vh]">
      <div className="text-slate-500 animate-pulse text-lg">Carregando Finanças...</div>
    </div>
  );

  const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <PiggyBank className="w-8 h-8 text-emerald-500" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
            Centro Financeiro
          </span>
        </h1>
        <p className="text-muted-foreground mt-1">Controle a saúde financeira do seu clube.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Saldo em Caixa", value: finances?.cash_balance, icon: DollarSign, color: "text-emerald-400", glow: "shadow-[0_0_15px_rgba(52,211,153,0.2)]" },
          { label: "Orçamento Transferências", value: finances?.transfer_budget, icon: TrendingUp, color: "text-blue-400", glow: "shadow-[0_0_15px_rgba(96,165,250,0.2)]" },
          { label: "Receitas (histórico)", value: income, icon: ArrowUpRight, color: "text-emerald-400", glow: "" },
          { label: "Despesas (histórico)", value: expense, icon: ArrowDownRight, color: "text-red-400", glow: "" },
        ].map(card => (
          <Card key={card.label} className={`bg-slate-950 border-slate-800 ${card.glow}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <p className="text-sm font-medium text-slate-400">{card.label}</p>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-black ${card.color}`}>{fmt(card.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Income Streams */}
      {finances && (
        <Card className="bg-slate-950 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-200">Fontes de Receita</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: "Receita de Estádio", value: finances.stadium_revenue },
                { label: "Patrocínios", value: finances.sponsorship_income },
                { label: "Direitos de TV", value: finances.tv_rights_income },
                { label: "Prêmios de Competição", value: finances.competition_prizes },
                { label: "Receita de Transferências", value: finances.transfer_income },
                { label: "Merchandise", value: finances.merchandise_revenue },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-sm text-slate-400">{item.label}</span>
                  <span className={`font-bold ${item.value > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>{fmt(item.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction History */}
      <Card className="bg-slate-950 border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-slate-200">Histórico de Transações</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Nenhuma transação registrada ainda.</div>
          ) : (
            <div className="divide-y divide-slate-800">
              {transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-slate-900/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${tx.type === 'income' ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'}`}>
                      {tx.type === 'income' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="font-medium text-white text-sm">{tx.description}</div>
                      <div className="text-xs text-slate-500">
                        <Badge variant="outline" className="text-[10px] h-4 mr-1">{tx.category}</Badge>
                        {new Date(tx.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`font-bold ${tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
                    </div>
                    <div className="text-xs text-slate-500">Saldo: {fmt(tx.balance_after)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sponsors Section */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Handshake className="w-6 h-6 text-amber-400" />
          <h2 className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-500">
            Patrocinadores Disponíveis
          </h2>
        </div>
        <p className="text-slate-400 text-sm mb-6">
          Assine contratos de patrocínio para receber pagamentos iniciais e bônus por vitória.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SPONSORS.map(sponsor => {
            const isSigned = signedSponsors.includes(sponsor.id);
            const isLoading = signingId === sponsor.id && isPending;
            return (
              <div
                key={sponsor.id}
                className={`relative rounded-xl border p-5 flex flex-col gap-3 transition-all duration-300 ${
                  isSigned
                    ? 'bg-emerald-950/30 border-emerald-700/50 shadow-[0_0_20px_rgba(52,211,153,0.08)]'
                    : 'bg-slate-900 border-slate-700 hover:border-amber-500/50 hover:shadow-[0_0_20px_rgba(251,191,36,0.1)]'
                }`}
              >
                {/* Top row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{sponsor.logo}</span>
                    <div>
                      <p className="font-bold text-white text-sm">{sponsor.name}</p>
                      <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-400/40 mt-0.5">
                        {sponsor.category}
                      </Badge>
                    </div>
                  </div>
                  {isSigned && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  )}
                </div>

                {/* Values */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-800/60 rounded-lg p-2.5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Pagamento Inicial</p>
                    <p className="text-emerald-400 font-black text-sm mt-0.5">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(sponsor.upfront)}
                    </p>
                  </div>
                  <div className="bg-slate-800/60 rounded-lg p-2.5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Bônus/Vitória</p>
                    <p className={`font-black text-sm mt-0.5 ${sponsor.perWin > 0 ? 'text-amber-400' : 'text-slate-600'}`}>
                      {sponsor.perWin > 0
                        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(sponsor.perWin)
                        : '—'}
                    </p>
                  </div>
                </div>

                {/* Duration */}
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Duração: <span className="text-slate-300 font-medium">{sponsor.duration}</span></span>
                </div>

                {/* Action */}
                {isSigned ? (
                  <div className="mt-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-emerald-900/40 text-emerald-400 text-sm font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    Contrato Assinado
                  </div>
                ) : (
                  <button
                    disabled={isLoading || isPending}
                    onClick={() => {
                      setSigningId(sponsor.id);
                      startTransition(async () => {
                        const result = await signSponsor(sponsor.id);
                        if (result.success) {
                          setSignedSponsors(prev => [...prev, sponsor.id]);
                          if (result.newBalance !== undefined) {
                            setFinances((prev: any) => prev ? { ...prev, cash_balance: result.newBalance } : prev);
                          }
                        }
                        setSigningId(null);
                      });
                    }}
                    className="mt-1 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm transition-all duration-200 bg-gradient-to-r from-amber-500 to-yellow-400 text-black hover:from-amber-400 hover:to-yellow-300 hover:shadow-[0_0_15px_rgba(251,191,36,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Assinando...</>
                    ) : (
                      <><Handshake className="w-4 h-4" /> Assinar Contrato</>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
