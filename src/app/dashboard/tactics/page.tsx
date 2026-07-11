'use client';

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shirt, Save, Shield, Swords } from "lucide-react";
import { toast } from "sonner";
import { Player, MatchTactics } from "@/types";

export default function TacticsPage() {
  const supabase = createClient();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [tactics, setTactics] = useState<MatchTactics>({
    mentality: 'balanced',
    pressing: 'medium',
    defensive_line: 'standard',
    style: 'possession',
    marking: 'zonal'
  });
  const [formation, setFormation] = useState('4-3-3');
  
  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/auth/login');

      const { data: coach } = await supabase
        .from('coaches')
        .select('*, club_owners(club_id)')
        .eq('user_id', user.id)
        .single();

      const clubId = coach?.club_owners?.[0]?.club_id;
      if (!clubId) return router.push('/onboarding/club');

      const { data: squad } = await supabase
        .from('players')
        .select('*')
        .eq('club_id', clubId)
        .order('overall', { ascending: false });

      if (squad) setPlayers(squad as Player[]);
      
      // Load current saved tactics logic here
      // For MVP we just use default state
      
      setLoading(false);
    }
    
    loadData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    // Simulate save
    await new Promise(r => setTimeout(r, 1000));
    toast.success('Táticas salvas com sucesso');
    setSaving(false);
  };

  const FieldView = () => (
    <div className="relative w-full h-[500px] bg-green-800 rounded-lg border-2 border-slate-700 overflow-hidden flex flex-col items-center justify-between py-12">
      {/* Field markings */}
      <div className="absolute inset-0 border-x-4 border-white opacity-20 pointer-events-none"></div>
      <div className="absolute top-0 w-[40%] h-[15%] border-b-2 border-x-2 border-white opacity-20 pointer-events-none"></div>
      <div className="absolute bottom-0 w-[40%] h-[15%] border-t-2 border-x-2 border-white opacity-20 pointer-events-none"></div>
      <div className="absolute top-1/2 left-0 w-full border-t-2 border-white opacity-20 pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border-2 border-white opacity-20 pointer-events-none"></div>

      {/* Basic representation of formation (hardcoded 4-3-3 visual for MVP) */}
      <div className="flex justify-center gap-16 w-full z-10 mt-4">
        <div className="w-10 h-10 rounded-full bg-slate-900 border-2 border-emerald-500 text-white flex items-center justify-center font-bold text-xs cursor-pointer shadow-lg">ATA</div>
        <div className="w-10 h-10 rounded-full bg-slate-900 border-2 border-emerald-500 text-white flex items-center justify-center font-bold text-xs cursor-pointer shadow-lg">ATA</div>
        <div className="w-10 h-10 rounded-full bg-slate-900 border-2 border-emerald-500 text-white flex items-center justify-center font-bold text-xs cursor-pointer shadow-lg">ATA</div>
      </div>
      
      <div className="flex justify-center gap-20 w-full z-10">
        <div className="w-10 h-10 rounded-full bg-slate-900 border-2 border-emerald-500 text-white flex items-center justify-center font-bold text-xs cursor-pointer shadow-lg">MEI</div>
        <div className="w-10 h-10 rounded-full bg-slate-900 border-2 border-emerald-500 text-white flex items-center justify-center font-bold text-xs cursor-pointer shadow-lg">MEI</div>
        <div className="w-10 h-10 rounded-full bg-slate-900 border-2 border-emerald-500 text-white flex items-center justify-center font-bold text-xs cursor-pointer shadow-lg">MEI</div>
      </div>

      <div className="flex justify-center gap-12 w-full z-10">
        <div className="w-10 h-10 rounded-full bg-slate-900 border-2 border-emerald-500 text-white flex items-center justify-center font-bold text-xs cursor-pointer shadow-lg">DEF</div>
        <div className="w-10 h-10 rounded-full bg-slate-900 border-2 border-emerald-500 text-white flex items-center justify-center font-bold text-xs cursor-pointer shadow-lg">DEF</div>
        <div className="w-10 h-10 rounded-full bg-slate-900 border-2 border-emerald-500 text-white flex items-center justify-center font-bold text-xs cursor-pointer shadow-lg">DEF</div>
        <div className="w-10 h-10 rounded-full bg-slate-900 border-2 border-emerald-500 text-white flex items-center justify-center font-bold text-xs cursor-pointer shadow-lg">DEF</div>
      </div>

      <div className="flex justify-center w-full z-10 mb-4">
        <div className="w-10 h-10 rounded-full bg-slate-900 border-2 border-yellow-500 text-white flex items-center justify-center font-bold text-xs cursor-pointer shadow-lg">GOL</div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Táticas e Escalação</h1>
          <p className="text-slate-400">Monte o seu time titular e defina as instruções coletivas.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar Táticas'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-2 bg-slate-900 border-slate-800">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Shirt className="w-5 h-5 text-emerald-500" />
              Campo Tático
            </CardTitle>
            <CardDescription className="text-slate-400">
              Arraste jogadores para escalar
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[500px] w-full bg-slate-950 rounded-lg animate-pulse"></div>
            ) : (
              <FieldView />
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-500" />
                Formação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={formation} onValueChange={(v) => v && setFormation(v)}>
                <SelectTrigger className="w-full bg-slate-950 border-slate-800">
                  <SelectValue placeholder="Selecione a formação" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                  <SelectItem value="4-4-2">4-4-2 Tradicional</SelectItem>
                  <SelectItem value="4-3-3">4-3-3 Ofensivo</SelectItem>
                  <SelectItem value="4-2-3-1">4-2-3-1 Controle</SelectItem>
                  <SelectItem value="3-5-2">3-5-2 Alas</SelectItem>
                  <SelectItem value="5-3-2">5-3-2 Ferrolho</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Swords className="w-5 h-5 text-emerald-500" />
                Instruções Coletivas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Mentalidade</label>
                <Select value={tactics.mentality} onValueChange={(v: any) => setTactics({...tactics, mentality: v})}>
                  <SelectTrigger className="w-full bg-slate-950 border-slate-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                    <SelectItem value="ultra_attack">Ultra Ofensiva</SelectItem>
                    <SelectItem value="attack">Ofensiva</SelectItem>
                    <SelectItem value="balanced">Equilibrada</SelectItem>
                    <SelectItem value="defense">Defensiva</SelectItem>
                    <SelectItem value="ultra_defense">Ultra Defensiva</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Estilo de Passe</label>
                <Select value={tactics.style} onValueChange={(v: any) => setTactics({...tactics, style: v})}>
                  <SelectTrigger className="w-full bg-slate-950 border-slate-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                    <SelectItem value="possession">Posse de Bola (Curtos)</SelectItem>
                    <SelectItem value="direct">Direto (Longos)</SelectItem>
                    <SelectItem value="counter">Contra-Ataque Rápido</SelectItem>
                    <SelectItem value="pressing">Gegenpressing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Pressão Alta</label>
                <Select value={tactics.pressing} onValueChange={(v: any) => setTactics({...tactics, pressing: v})}>
                  <SelectTrigger className="w-full bg-slate-950 border-slate-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                    <SelectItem value="high">Intensa (Ataque)</SelectItem>
                    <SelectItem value="medium">Normal (Meio Campo)</SelectItem>
                    <SelectItem value="low">Baixa (Defesa)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
