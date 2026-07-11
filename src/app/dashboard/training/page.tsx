'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { startTraining, claimTraining } from '@/app/actions/training'
import { Dumbbell, Zap, CheckCircle, Users } from 'lucide-react'

export default function TrainingPage() {
  const [players, setPlayers] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selections, setSelections] = useState<Record<string, string>>({})
  const supabase = createClient()

  const fetchData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: owner } = await supabase
      .from('club_owners')
      .select('club_id')
      .eq('user_id', user.id)
      .single()

    if (!owner) return

    const { data: playersData } = await supabase
      .from('players')
      .select('*')
      .eq('club_id', owner.club_id)

    const { data: sessionsData } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('club_id', owner.club_id)
      .in('status', ['active', 'completed'])

    setPlayers(playersData || [])
    setSessions(sessionsData || [])
    
    // Default selections
    const newSelections: Record<string, string> = {}
    playersData?.forEach(p => {
      newSelections[p.id] = 'pace'
    })
    setSelections(newSelections)
    
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleStart = async (playerId: string) => {
    const focus = selections[playerId] || 'pace'
    const res = await startTraining(playerId, focus, 1)
    if (res?.success) {
      fetchData()
    } else {
      alert(res?.error)
    }
  }

  const handleClaim = async (sessionId: string) => {
    const res = await claimTraining(sessionId)
    if (res?.success) {
      alert(`Treino resgatado! XP Ganhos: +${res.xpGained}`)
      fetchData()
    } else {
      alert(res?.error)
    }
  }

  // Update progress bars periodically
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-white text-xl">Carregando...</div>

  const activePlayersIds = sessions.filter(s => s.status === 'active').map(s => s.player_id)
  const availablePlayers = players.filter(p => !activePlayersIds.includes(p.id))
  
  const getProgress = (start: string, end: string) => {
    const startTime = new Date(start).getTime()
    const endTime = new Date(end).getTime()
    const current = now
    if (current >= endTime) return 100
    if (current <= startTime) return 0
    return ((current - startTime) / (endTime - startTime)) * 100
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200 p-6 md:p-12 font-sans selection:bg-emerald-400 selection:text-black">
      <div className="max-w-6xl mx-auto space-y-12">
        <header className="flex items-center gap-4 border-b border-slate-800 pb-6">
          <div className="bg-emerald-500/10 p-4 rounded-2xl">
            <Dumbbell className="text-4xl text-emerald-400" size={40} />
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white flex items-center gap-3">
              Centro de Treinamento
            </h1>
            <p className="text-slate-400 mt-2 text-lg">Evolua seus jogadores para o próximo nível.</p>
          </div>
        </header>

        <section className="space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
            <Zap className="text-yellow-400" /> Em Treinamento
          </h2>
          
          {sessions.filter(s => s.status === 'active').length === 0 ? (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 text-center text-slate-400">
              Nenhum jogador em treinamento no momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sessions.filter(s => s.status === 'active').map(session => {
                const player = players.find(p => p.id === session.player_id)
                if (!player) return null

                const isReady = new Date(session.end_time).getTime() <= now
                const progress = getProgress(session.start_time, session.end_time)

                return (
                  <div key={session.id} className="relative bg-slate-800 border border-slate-700 rounded-3xl p-6 overflow-hidden hover:border-emerald-500/50 transition-colors shadow-xl shadow-black/20 group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-slate-700">
                      <div 
                        className="h-full bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)] transition-all duration-1000 ease-linear" 
                        style={{ width: `${progress}%` }} 
                      />
                    </div>
                    
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white">{player.name}</h3>
                        <p className="text-sm text-slate-400 uppercase tracking-widest mt-1 font-semibold flex items-center gap-1">
                          Foco: <span className="text-emerald-400">{session.focus_attribute}</span>
                        </p>
                      </div>
                      <div className="bg-slate-900 px-3 py-1 rounded-full text-lg font-black border border-slate-700">
                        {player.overall}
                      </div>
                    </div>

                    <div className="mt-6">
                      {isReady ? (
                        <button 
                          onClick={() => handleClaim(session.id)}
                          className="w-full bg-gradient-to-r from-emerald-500 to-green-400 text-black font-bold py-3 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(52,211,153,0.4)] flex justify-center items-center gap-2"
                        >
                          <CheckCircle size={20} /> Resgatar Treino
                        </button>
                      ) : (
                        <button disabled className="w-full bg-slate-900 text-slate-500 font-bold py-3 rounded-xl border border-slate-700 cursor-not-allowed">
                          Treinando... {Math.floor(progress)}%
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
            <Users className="text-slate-300" /> Elenco Disponível
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {availablePlayers.map(player => (
              <div key={player.id} className="bg-slate-800/80 border border-slate-700 rounded-3xl p-6 hover:bg-slate-800 transition-colors">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="font-bold text-lg text-white truncate max-w-[150px]">{player.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">Idade: {player.age}</p>
                  </div>
                  <div className="bg-slate-900 px-2 py-1 rounded-lg text-sm font-black border border-slate-700 text-emerald-400">
                    OVR {player.overall}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase mb-2 block">Atributo Alvo</label>
                    <select 
                      value={selections[player.id] || 'pace'}
                      onChange={(e) => setSelections({...selections, [player.id]: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-white appearance-none"
                    >
                      <option value="pace">Pace ({player.pace})</option>
                      <option value="shooting">Shooting ({player.shooting})</option>
                      <option value="passing">Passing ({player.passing})</option>
                      <option value="dribbling">Dribbling ({player.dribbling})</option>
                      <option value="defending">Defending ({player.defending})</option>
                      <option value="physical">Physical ({player.physical})</option>
                    </select>
                  </div>
                  
                  <button 
                    onClick={() => handleStart(player.id)}
                    className="w-full bg-slate-700 hover:bg-emerald-500 hover:text-black hover:shadow-[0_0_15px_rgba(52,211,153,0.3)] text-white font-bold py-2.5 rounded-xl transition-all text-sm"
                  >
                    Iniciar Treino (1h)
                  </button>
                </div>
              </div>
            ))}
            
            {availablePlayers.length === 0 && (
              <div className="col-span-full text-center py-12 text-slate-500 bg-slate-800/30 rounded-2xl border border-slate-800 border-dashed">
                Todos os seus jogadores estão em treinamento.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
