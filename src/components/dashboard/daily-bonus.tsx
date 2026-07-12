"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, CheckCircle } from "lucide-react";
import { claimDailyBonus } from "@/app/actions/daily";

export function DailyBonusCard({ streak, lastBonus }: { streak: number, lastBonus: string | null }) {
  const [claimed, setClaimed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const now = new Date();
  const last = lastBonus ? new Date(lastBonus) : null;
  const hoursSince = last ? (now.getTime() - last.getTime()) / (1000 * 60 * 60) : 999;
  
  const isAvailable = hoursSince >= 20;
  
  // se quebrou a ofensiva, o próximo é o dia 1
  let nextStreak = streak + 1;
  if (hoursSince > 48 || nextStreak > 7) nextStreak = 1;

  if (claimed || !isAvailable) return null;

  const handleClaim = async () => {
    setLoading(true);
    const res = await claimDailyBonus();
    if (res.success) {
      setClaimed(true);
      let text = `Resgatado €${res.rewardCash?.toLocaleString()}!`;
      if (res.youthPlayerGenerated) {
        text += ` + Jovem ${res.youthPlayerGenerated} recrutado!`;
      }
      setMsg(text);
      // reload page softly to update finances
      setTimeout(() => window.location.reload(), 2000);
    } else {
      setMsg(res.error || "Erro ao resgatar");
      setLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-to-r from-amber-500/20 to-orange-500/10 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)] mb-6">
      <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Gift className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-amber-500">Bônus Diário Disponível!</h3>
            <p className="text-slate-300 text-sm">
              Faça login todos os dias para recompensas maiores. Você está no Dia {nextStreak}/7.
              {nextStreak === 7 && " (HOJE TEM PRÊMIO MÁXIMO E RECRUTA BASE!)"}
            </p>
          </div>
        </div>
        <div>
          {msg ? (
            <div className="text-emerald-400 font-bold flex items-center gap-2">
              <CheckCircle className="w-5 h-5" /> {msg}
            </div>
          ) : (
            <Button 
              onClick={handleClaim} 
              disabled={loading}
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-8 shadow-[0_0_15px_rgba(245,158,11,0.4)]"
            >
              {loading ? "Resgatando..." : "Resgatar Bônus"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
