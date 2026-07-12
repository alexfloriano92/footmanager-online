"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { upgradeSector } from "@/app/actions/stadium";
import { Building2, TrendingUp, Users, Star, ArrowUp } from "lucide-react";

const MAX_STADIUM_LEVEL = 5;

interface Sector {
  id: string;
  sector_name: string;
  capacity: number;
  level: number;
  upgrade_cost: number;
  revenue_per_match: number;
}

interface Stadium {
  id: string;
  name: string;
  capacity: number;
  city: string;
}

const LEVEL_COLORS = ["", "text-gray-400", "text-blue-400", "text-purple-400", "text-amber-400", "text-emerald-400"];
const LEVEL_LABELS = ["", "Bronze", "Prata", "Ouro", "Platina", "Elite ⭐"];

export default function StadiumPage() {
  const [stadium, setStadium] = useState<Stadium | null>(null);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [clubId, setClubId] = useState<string | null>(null);
  const [cashBalance, setCashBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const supabase = createClient();

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: coach } = await supabase.from("coaches").select("club_owners(club_id)").eq("user_id", user.id).single();
    const cid = coach?.club_owners?.[0]?.club_id;
    setClubId(cid);
    if (!cid) return;

    const [{ data: stadData }, { data: finData }] = await Promise.all([
      supabase.from("stadiums").select("*").eq("club_id", cid).single(),
      supabase.from("finances").select("cash_balance").eq("club_id", cid).single(),
    ]);

    setStadium(stadData);
    setCashBalance(finData?.cash_balance || 0);

    if (stadData) {
      const { data: sectorData } = await supabase.from("stadium_sectors").select("*").eq("stadium_id", stadData.id).order("sector_name");
      setSectors(sectorData || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleUpgrade = async (sectorId: string) => {
    setUpgrading(sectorId);
    setMsg(null);
    const res = await upgradeSector(sectorId);
    if (res.success) {
      setMsg({ text: `✅ Upgrade concluído! Setor agora no Nível ${res.newLevel}`, type: "success" });
      await load();
    } else {
      setMsg({ text: `❌ ${res.error}`, type: "error" });
    }
    setUpgrading(null);
  };

  const formatCurrency = (v: number) => v >= 1000000 ? `€${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `€${(v / 1000).toFixed(0)}K` : `€${v}`;

  const totalRevenue = sectors.reduce((sum, s) => sum + s.revenue_per_match, 0);
  const totalCapacity = sectors.reduce((sum, s) => sum + s.capacity, 0);

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto p-4 md:p-8">
      <div className="flex items-center gap-3 mb-2">
        <Building2 className="w-8 h-8 text-emerald-500" />
        <div>
          <h1 className="text-3xl font-bold text-white">{stadium?.name || "Estádio"}</h1>
          <p className="text-slate-400">{stadium?.city} — Expanda os setores para aumentar a renda do clube</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-slate-400 text-xs">Capacidade Total</p>
              <p className="text-2xl font-bold text-white">{totalCapacity.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-emerald-500" />
            <div>
              <p className="text-slate-400 text-xs">Renda por Partida</p>
              <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalRevenue)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <Star className="w-8 h-8 text-amber-500" />
            <div>
              <p className="text-slate-400 text-xs">Caixa Disponível</p>
              <p className="text-2xl font-bold text-amber-400">{formatCurrency(cashBalance)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${msg.type === "success" ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400" : "bg-red-500/10 border border-red-500/30 text-red-400"}`}>
          {msg.text}
        </div>
      )}

      {/* Sectors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 bg-slate-900 border border-slate-800 rounded-xl animate-pulse" />
          ))
        ) : sectors.length === 0 ? (
          <Card className="bg-slate-900 border-slate-800 col-span-2 p-8 text-center">
            <Building2 className="w-12 h-12 text-slate-700 mx-auto mb-2" />
            <p className="text-slate-400">Nenhum setor encontrado. Execute o SQL de migração 010.</p>
          </Card>
        ) : (
          sectors.map((sector) => {
            const isMax = sector.level >= MAX_STADIUM_LEVEL;
            const canAfford = cashBalance >= sector.upgrade_cost;
            const nextLevelLabel = isMax ? "MAX" : LEVEL_LABELS[sector.level + 1];
            return (
              <Card key={sector.id} className={`bg-slate-900 border-slate-800 hover:border-slate-600 transition-all`}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-white text-lg">{sector.sector_name}</CardTitle>
                    <span className={`font-bold text-sm ${LEVEL_COLORS[sector.level]}`}>
                      {LEVEL_LABELS[sector.level]}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Level bar */}
                  <div className="flex gap-1">
                    {Array.from({ length: MAX_STADIUM_LEVEL }).map((_, i) => (
                      <div key={i} className={`h-1.5 flex-1 rounded-full ${i < sector.level ? "bg-emerald-500" : "bg-slate-700"}`} />
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-slate-800 rounded-md p-2">
                      <p className="text-slate-500 text-xs">Capacidade</p>
                      <p className="text-white font-bold">{sector.capacity.toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-800 rounded-md p-2">
                      <p className="text-slate-500 text-xs">Renda/Jogo</p>
                      <p className="text-emerald-400 font-bold">{formatCurrency(sector.revenue_per_match)}</p>
                    </div>
                  </div>

                  {isMax ? (
                    <div className="text-center text-emerald-500 font-bold text-sm py-1">⭐ Nível Máximo Atingido!</div>
                  ) : (
                    <Button
                      onClick={() => handleUpgrade(sector.id)}
                      disabled={!canAfford || upgrading === sector.id}
                      className={`w-full ${canAfford ? "bg-emerald-600 hover:bg-emerald-500" : "bg-slate-700 opacity-60"} text-white`}
                    >
                      <ArrowUp className="w-4 h-4 mr-2" />
                      {upgrading === sector.id ? "Upgradando..." : `Upgrade → ${nextLevelLabel} (${formatCurrency(sector.upgrade_cost)})`}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
