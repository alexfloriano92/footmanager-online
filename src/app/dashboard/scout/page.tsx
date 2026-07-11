"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Euro, X, Plus } from "lucide-react";
// Assuming we will have this action available shortly
// import { createOffer } from "@/app/actions/transfers"; 
import { motion, AnimatePresence } from "framer-motion";

// Helper to convert country names to flag emojis
const getFlagEmoji = (countryCode: string) => {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char =>  127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

const flagMap: Record<string, string> = {
  "Brasil": "BR", "Espanha": "ES", "Alemanha": "DE", "França": "FR",
  "Inglaterra": "GB", "Portugal": "PT", "Argentina": "AR", "Itália": "IT",
  "Holanda": "NL", "Bélgica": "BE", "Uruguai": "UY", "Colômbia": "CO",
  "Chile": "CL", "México": "MX", "USA": "US", "Japão": "JP",
};

export default function ScoutPage() {
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // My Club Info for proposals
  const [myClubId, setMyClubId] = useState<string | null>(null);
  const [myCash, setMyCash] = useState<number>(0);
  const [myPlayers, setMyPlayers] = useState<any[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [position, setPosition] = useState("");
  const [minOverall, setMinOverall] = useState(50);
  const [maxAge, setMaxAge] = useState(40);
  const [sortBy, setSortBy] = useState("overall_desc");

  // Proposal Modal State
  const [selectedTarget, setSelectedTarget] = useState<any | null>(null);
  const [offerCash, setOfferCash] = useState<number>(0);
  const [offerPlayers, setOfferPlayers] = useState<string[]>([]);
  const [submittingOffer, setSubmittingOffer] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      // 1. Get user club info
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: coach } = await supabase.from('coaches').select('club_owners(club_id)').eq('user_id', user.id).single();
        const cid = coach?.club_owners?.[0]?.club_id;
        if (cid) {
          setMyClubId(cid);
          // Get finances
          const { data: fin } = await supabase.from('finances').select('cash_balance').eq('club_id', cid).single();
          if (fin) setMyCash(fin.cash_balance);
          // Get my players
          const { data: mp } = await supabase.from('players').select('id, name, position, overall, market_value').eq('club_id', cid);
          if (mp) setMyPlayers(mp);
        }
      }

      // 2. Fetch scout players
      const { data } = await supabase
        .from("players")
        .select(`*, clubs(name, country)`)
        .order("overall", { ascending: false })
        .limit(300); // Limit for UI performance, in a real app we'd paginate

      if (data) setPlayers(data);
      setLoading(false);
    }
    loadData();
  }, []);

  const filteredPlayers = useMemo(() => {
    return players
      .filter(p => {
        if (p.club_id === myClubId) return false; // Don't show my own players
        if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (position && p.position !== position) return false;
        if (p.overall < minOverall) return false;
        const age = p.birth_date ? new Date().getFullYear() - new Date(p.birth_date).getFullYear() : 25;
        if (age > maxAge) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "overall_desc") return b.overall - a.overall;
        if (sortBy === "value_desc") return b.market_value - a.market_value;
        if (sortBy === "age_asc") {
          const ageA = new Date().getFullYear() - new Date(a.birth_date).getFullYear();
          const ageB = new Date().getFullYear() - new Date(b.birth_date).getFullYear();
          return ageA - ageB;
        }
        return 0;
      });
  }, [players, searchQuery, position, minOverall, maxAge, sortBy, myClubId]);

  const handleSubmitOffer = async () => {
    if (!selectedTarget) return;
    setSubmittingOffer(true);
    
    // Dynamically import the server action
    const { createOffer } = await import("@/app/actions/transfers");
    const res = await createOffer(selectedTarget.id, offerCash, offerPlayers);
    
    setSubmittingOffer(false);
    if (res.error) {
      alert(`Erro: ${res.error}`);
    } else {
      alert(res.result || 'Proposta enviada!');
      setSelectedTarget(null);
      // Deduct local cash temp
      if (res.status === 'pending') {
         setMyCash(prev => prev - offerCash);
      } else if (res.status === 'accepted') {
         // Reload page or remove player from list
         window.location.reload();
      }
    }
  };

  const toggleOfferPlayer = (pid: string) => {
    setOfferPlayers(prev => prev.includes(pid) ? prev.filter(id => id !== pid) : [...prev, pid]);
  };

  const getPosColor = (pos: string) => {
    if (['GK'].includes(pos)) return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50';
    if (['CB', 'LB', 'RB'].includes(pos)) return 'bg-blue-500/20 text-blue-500 border-blue-500/50';
    if (['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(pos)) return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/50';
    return 'bg-red-500/20 text-red-500 border-red-500/50';
  };

  const getOvrColor = (ovr: number) => {
    if (ovr >= 90) return 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]';
    if (ovr >= 80) return 'text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]';
    if (ovr >= 70) return 'text-blue-400';
    return 'text-slate-400';
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="flex flex-col md:flex-row gap-6 w-full max-w-7xl mx-auto p-4 md:p-8">
      {/* Proposal Modal */}
      <AnimatePresence>
        {selectedTarget && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                <div>
                  <h2 className="text-2xl font-bold text-white">Fazer Proposta</h2>
                  <p className="text-slate-400 text-sm">Negociando com {selectedTarget.clubs?.name || 'Agente Livre'}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedTarget(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Target Player Info */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-3">Alvo</h3>
                    <Card className="bg-slate-950/50 border-slate-800 p-4">
                      <div className="flex items-center gap-4">
                        <div className={`text-4xl font-black ${getOvrColor(selectedTarget.overall)}`}>{selectedTarget.overall}</div>
                        <div>
                          <h4 className="text-lg font-bold text-white">{selectedTarget.name}</h4>
                          <div className="flex items-center gap-2 text-sm text-slate-400">
                            <Badge variant="outline" className={`${getPosColor(selectedTarget.position)}`}>{selectedTarget.position}</Badge>
                            <span>Valor: {formatCurrency(selectedTarget.market_value)}</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-3">Sua Oferta Financeira</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Dinheiro Ofertado</span>
                        <span className="text-emerald-400 font-medium">{formatCurrency(offerCash)}</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max={myCash} 
                        step="1000000"
                        value={offerCash} 
                        onChange={(e) => setOfferCash(parseInt(e.target.value))}
                        className="w-full accent-primary"
                      />
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>€0</span>
                        <span>Max: {formatCurrency(myCash)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Swap Players */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-3">
                    Incluir Jogadores na Troca ({offerPlayers.length})
                  </h3>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {myPlayers.sort((a,b) => b.overall - a.overall).map(p => {
                      const isSelected = offerPlayers.includes(p.id);
                      return (
                        <div 
                          key={p.id} 
                          onClick={() => toggleOfferPlayer(p.id)}
                          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                            isSelected ? 'bg-primary/10 border-primary' : 'bg-slate-950/50 border-slate-800 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`font-bold w-6 text-center ${getOvrColor(p.overall)}`}>{p.overall}</span>
                            <div>
                              <div className="font-medium text-sm text-white">{p.name}</div>
                              <div className="text-xs text-slate-500">{p.position} • {formatCurrency(p.market_value)}</div>
                            </div>
                          </div>
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'bg-primary border-primary text-black' : 'border-slate-600'}`}>
                            {isSelected && <Plus className="w-3 h-3" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-800 bg-slate-950 flex justify-between items-center">
                <div className="text-sm">
                  <span className="text-slate-400">Valor Total da Proposta: </span>
                  <span className="text-xl font-bold text-emerald-400">
                    {formatCurrency(offerCash + myPlayers.filter(p => offerPlayers.includes(p.id)).reduce((acc, p) => acc + p.market_value, 0))}
                  </span>
                </div>
                <Button 
                  className="bg-primary text-primary-foreground hover:bg-primary/90" 
                  onClick={handleSubmitOffer}
                  disabled={submittingOffer || (offerCash === 0 && offerPlayers.length === 0)}
                >
                  {submittingOffer ? "Enviando..." : "Confirmar Proposta"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar Filters */}
      <div className="w-full md:w-64 space-y-6 flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2 mb-6">
            <Search className="w-5 h-5 text-primary" />
            Scout
          </h2>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Nome do Jogador</label>
              <Input 
                placeholder="Ex: Vinícius..." 
                className="bg-slate-900 border-slate-800"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Posição</label>
              <select 
                className="w-full flex h-10 w-full items-center justify-between rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              >
                <option value="">Todas</option>
                <option value="GK">Goleiro (GK)</option>
                <option value="CB">Zagueiro (CB)</option>
                <option value="LB">Lateral Esq (LB)</option>
                <option value="RB">Lateral Dir (RB)</option>
                <option value="CDM">Volante (CDM)</option>
                <option value="CM">Meio-Campo (CM)</option>
                <option value="CAM">Meia Ofensivo (CAM)</option>
                <option value="LW">Ponta Esq (LW)</option>
                <option value="RW">Ponta Dir (RW)</option>
                <option value="ST">Atacante (ST)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">
                Overall Mínimo: {minOverall}
              </label>
              <input 
                type="range" 
                min="50" max="99" 
                value={minOverall} 
                onChange={(e) => setMinOverall(parseInt(e.target.value))}
                className="w-full accent-primary"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">
                Idade Máxima: {maxAge}
              </label>
              <input 
                type="range" 
                min="16" max="45" 
                value={maxAge} 
                onChange={(e) => setMaxAge(parseInt(e.target.value))}
                className="w-full accent-primary"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Ordenar por</label>
              <select 
                className="w-full flex h-10 w-full items-center justify-between rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="overall_desc">Maior Overall</option>
                <option value="value_desc">Maior Valor</option>
                <option value="age_asc">Mais Jovem</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Results Grid */}
      <div className="flex-1">
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 animate-pulse">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-48 bg-slate-900 rounded-xl" />)}
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-slate-500">
              Mostrando {filteredPlayers.length} jogadores no mercado global
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredPlayers.slice(0, 50).map(player => (
                <Card key={player.id} className="bg-slate-950/50 border-slate-800/50 hover:border-primary/50 hover:shadow-[0_0_15px_rgba(0,255,136,0.1)] transition-all overflow-hidden group">
                  <div className="p-4 flex gap-4 relative">
                    <div className="flex flex-col items-center gap-2">
                      <div className={`text-3xl font-black ${getOvrColor(player.overall)}`}>
                        {player.overall}
                      </div>
                      <Badge variant="outline" className={`${getPosColor(player.position)} font-bold`}>
                        {player.position}
                      </Badge>
                      <div className="text-2xl mt-1">
                        {flagMap[player.nationality] ? getFlagEmoji(flagMap[player.nationality]) : '🏳️'}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg truncate pr-2 text-white group-hover:text-primary transition-colors" title={player.name}>
                        {player.name}
                      </h3>
                      <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{player.clubs?.name || 'Agente Livre'}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-4">
                        {[
                          { lbl: 'PAC', val: player.pace },
                          { lbl: 'SHO', val: player.shooting },
                          { lbl: 'PAS', val: player.passing },
                          { lbl: 'DRI', val: player.dribbling },
                          { lbl: 'DEF', val: player.defending },
                          { lbl: 'PHY', val: player.physical },
                        ].map(stat => (
                          <div key={stat.lbl} className="flex items-center gap-2 text-[10px] font-medium text-slate-500">
                            <span className="w-6">{stat.lbl}</span>
                            <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary/70" 
                                style={{ width: `${Math.max(5, stat.val)}%` }}
                              />
                            </div>
                            <span className="w-4 text-right text-slate-300">{stat.val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-slate-900/50 p-3 flex items-center justify-between border-t border-slate-800/50">
                    <div className="flex items-center gap-1 text-xs font-medium text-slate-300">
                      <Euro className="w-3.5 h-3.5 text-emerald-500" />
                      {formatCurrency(player.market_value)}
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-7 text-xs border-primary/50 text-primary hover:bg-primary hover:text-black" 
                      onClick={() => {
                        setSelectedTarget(player);
                        setOfferCash(0);
                        setOfferPlayers([]);
                      }}
                    >
                      Fazer Proposta
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
