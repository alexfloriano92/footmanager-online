'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Search, Trophy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ClubOnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClub, setSelectedClub] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coachId, setCoachId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return router.push('/auth/login');

        const { data: coach } = await supabase
          .from('coaches')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!coach) return router.push('/onboarding/coach');
        setCoachId(coach.id);

        // Fetch AI controlled clubs (available to be claimed)
        const { data: availableClubs, error } = await supabase
          .from('clubs')
          .select('*, leagues(name, country)')
          .eq('is_ai_controlled', true)
          .order('prestige', { ascending: false })
          .limit(20);

        if (error) throw error;
        setClubs(availableClubs || []);
      } catch (error: any) {
        toast.error('Erro ao carregar dados', { description: error.message });
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const filteredClubs = clubs.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.leagues?.country?.toLowerCase().includes(search.toLowerCase())
  );

  async function handleClaimClub() {
    if (!selectedClub || !coachId) return;
    
    setIsSubmitting(true);
    try {
      // Usar a RPC de claim_club que criamos na migration 005
      const { data, error } = await supabase.rpc('claim_club', {
        p_club_id: selectedClub,
        p_coach_id: coachId
      });

      if (error) throw error;

      toast.success('Clube assumido com sucesso!');
      router.push('/dashboard');
      
    } catch (error: any) {
      toast.error('Não foi possível assumir este clube', { description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-slate-50">Escolha seu Clube</h1>
          <p className="text-slate-400">
            Selecione o clube que você irá treinar. Você só pode controlar equipes disponíveis.
          </p>
        </div>

        <div className="flex justify-center">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
            <Input
              placeholder="Buscar clube por nome ou país..."
              className="pl-10 bg-slate-900 border-slate-800 text-white h-12"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredClubs.map((club) => (
                <Card 
                  key={club.id} 
                  className={`bg-slate-900 border-slate-800 cursor-pointer transition-all hover:border-emerald-500 ${
                    selectedClub === club.id ? 'ring-2 ring-emerald-500 border-emerald-500' : ''
                  }`}
                  onClick={() => setSelectedClub(club.id)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center p-2">
                          {club.badge_url ? (
                            <img src={club.badge_url} alt={club.name} className="w-full h-full object-contain" />
                          ) : (
                            <Shield className="w-6 h-6 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-lg leading-tight">{club.name}</h3>
                          <p className="text-sm text-slate-400">{club.leagues?.country || club.country}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="block text-slate-500">Reputação</span>
                        <span className="font-medium text-slate-200 flex items-center gap-1">
                          <Trophy className="w-3 h-3 text-yellow-500" /> {club.prestige}
                        </span>
                      </div>
                      <div>
                        <span className="block text-slate-500">Divisão</span>
                        <span className="font-medium text-slate-200">{club.leagues?.name || 'Divisão Principal'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredClubs.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-400 bg-slate-900 rounded-lg border border-slate-800">
                  Nenhum clube disponível encontrado.
                </div>
              )}
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/80 backdrop-blur border-t border-slate-800 flex justify-center z-50">
              <Button 
                size="lg" 
                className="w-full max-w-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12"
                disabled={!selectedClub || isSubmitting}
                onClick={handleClaimClub}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Assumindo clube...
                  </>
                ) : (
                  'Assinar Contrato'
                )}
              </Button>
            </div>
            {/* Espaço extra para o footer fixo */}
            <div className="h-20"></div>
          </>
        )}
      </div>
    </div>
  );
}
