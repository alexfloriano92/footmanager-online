'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Trophy, Swords, X, Loader2, Shield } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClubPlayer {
  id: string
  name: string
  position: string
  shooting: number
  pace: number
  dribbling: number
  defending: number
  physical: number
}

interface Club {
  id: string
  name: string
  short_name: string
  primary_color: string
  secondary_color: string
  prestige: number
  players: ClubPlayer[]
}

type EventType = 'goal' | 'yellow_card' | 'red_card' | 'penalty' | 'own_goal'

interface MatchEvent {
  id: string
  minute: number
  event_type: EventType
  club_id: string
  player_name: string
  description?: string
}

interface MatchStats {
  possession: string
  shots: string
  corners: string
}

interface MatchResult {
  matchId: string | null
  home: Club
  away: Club
  homeGoals: number
  awayGoals: number
  stats: MatchStats
  events: MatchEvent[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// Fake attacker names for when no players are found
const FAKE_NAMES = [
  'Silva', 'Costa', 'Santos', 'Oliveira', 'Pereira', 'Ferreira',
  'Rodrigues', 'Almeida', 'Nascimento', 'Lima', 'Araújo', 'Carvalho',
  'Gomes', 'Martins', 'Ribeiro', 'Fernandes', 'Souza', 'Moura',
]

function pickGoalScorer(club: Club): string {
  const attackers = club.players.filter((p) =>
    ['ST', 'LW', 'RW', 'CF', 'CAM', 'LM', 'RM', 'CM'].includes(p.position)
  )
  if (attackers.length > 0) {
    // Weight by shooting
    const sorted = [...attackers].sort((a, b) => b.shooting - a.shooting)
    // Pick from top-weighted attackers with some randomness
    const pool = sorted.slice(0, Math.min(6, sorted.length))
    return randFrom(pool).name
  }
  return randFrom(FAKE_NAMES)
}

function pickCardReceiver(club: Club): string {
  if (club.players.length > 0) return randFrom(club.players).name
  return randFrom(FAKE_NAMES)
}

function generateMatchEvents(
  homeClub: Club,
  awayClub: Club,
  homeGoals: number,
  awayGoals: number
): Omit<MatchEvent, 'id'>[] {
  const events: Omit<MatchEvent, 'id'>[] = []

  // Goal events
  const homeGoalMinutes: number[] = []
  for (let i = 0; i < homeGoals; i++) {
    homeGoalMinutes.push(randInt(1, 90))
  }
  homeGoalMinutes.forEach((minute) => {
    events.push({
      minute,
      event_type: 'goal',
      club_id: homeClub.id,
      player_name: pickGoalScorer(homeClub),
      description: `Gol de ${homeClub.short_name}`,
    })
  })

  const awayGoalMinutes: number[] = []
  for (let i = 0; i < awayGoals; i++) {
    awayGoalMinutes.push(randInt(1, 90))
  }
  awayGoalMinutes.forEach((minute) => {
    events.push({
      minute,
      event_type: 'goal',
      club_id: awayClub.id,
      player_name: pickGoalScorer(awayClub),
      description: `Gol de ${awayClub.short_name}`,
    })
  })

  // Yellow cards: 2-4 total, distributed randomly
  const yellowCount = randInt(2, 4)
  for (let i = 0; i < yellowCount; i++) {
    const isHome = Math.random() < 0.5
    const club = isHome ? homeClub : awayClub
    events.push({
      minute: randInt(1, 90),
      event_type: 'yellow_card',
      club_id: club.id,
      player_name: pickCardReceiver(club),
      description: 'Cartão amarelo',
    })
  }

  // Red card: 20% chance after 60th minute
  if (Math.random() < 0.2) {
    const isHome = Math.random() < 0.5
    const club = isHome ? homeClub : awayClub
    events.push({
      minute: randInt(61, 90),
      event_type: 'red_card',
      club_id: club.id,
      player_name: pickCardReceiver(club),
      description: 'Cartão vermelho',
    })
  }

  return events
}

// ─── Event Icon / Label ───────────────────────────────────────────────────────

function eventIcon(type: EventType): string {
  switch (type) {
    case 'goal': return '⚽'
    case 'penalty': return '⚽'
    case 'own_goal': return '⚽'
    case 'yellow_card': return '🟨'
    case 'red_card': return '🟥'
    default: return '•'
  }
}

// ─── Match Event Feed ─────────────────────────────────────────────────────────

function EventFeed({
  events,
  homeClub,
  awayClub,
}: {
  events: MatchEvent[]
  homeClub: Club
  awayClub: Club
}) {
  const sorted = [...events].sort((a, b) => a.minute - b.minute)

  return (
    <div style={{ marginTop: '24px' }}>
      <p style={{
        margin: '0 0 14px',
        fontSize: '11px',
        fontWeight: 700,
        color: '#475569',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        textAlign: 'center',
      }}>
        Lance a Lance
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {sorted.map((ev, i) => {
          const isHome = ev.club_id === homeClub.id
          const isGoal = ev.event_type === 'goal' || ev.event_type === 'penalty' || ev.event_type === 'own_goal'
          const homeColor = homeClub.primary_color || '#6366f1'
          const awayColor = awayClub.primary_color || '#e11d48'

          return (
            <div
              key={ev.id || i}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isHome ? 'flex-start' : 'flex-end',
                gap: '10px',
              }}
            >
              {/* Home side */}
              {isHome && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: isGoal
                    ? `${homeColor}20`
                    : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isGoal ? homeColor + '50' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: '10px',
                  padding: '8px 14px',
                  maxWidth: '70%',
                }}>
                  {/* Minute badge */}
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    color: '#64748b',
                    background: 'rgba(255,255,255,0.06)',
                    padding: '3px 7px',
                    borderRadius: '6px',
                    flexShrink: 0,
                    minWidth: '32px',
                    textAlign: 'center',
                  }}>
                    {ev.minute}&apos;
                  </span>
                  <span style={{ fontSize: '16px', flexShrink: 0 }}>{eventIcon(ev.event_type)}</span>
                  <div style={{ minWidth: 0 }}>
                    <p style={{
                      margin: 0,
                      fontSize: '13px',
                      fontWeight: 700,
                      color: isGoal ? homeColor : '#94a3b8',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {ev.player_name}
                    </p>
                    <p style={{ margin: 0, fontSize: '10px', color: '#475569' }}>
                      {homeClub.short_name}
                    </p>
                  </div>
                </div>
              )}

              {/* Center dot separator when not home */}
              {!isHome && (
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
              )}

              {/* Away side */}
              {!isHome && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: isGoal
                    ? `${awayColor}20`
                    : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isGoal ? awayColor + '50' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: '10px',
                  padding: '8px 14px',
                  maxWidth: '70%',
                  flexDirection: 'row-reverse',
                }}>
                  {/* Minute badge */}
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    color: '#64748b',
                    background: 'rgba(255,255,255,0.06)',
                    padding: '3px 7px',
                    borderRadius: '6px',
                    flexShrink: 0,
                    minWidth: '32px',
                    textAlign: 'center',
                  }}>
                    {ev.minute}&apos;
                  </span>
                  <span style={{ fontSize: '16px', flexShrink: 0 }}>{eventIcon(ev.event_type)}</span>
                  <div style={{ minWidth: 0, textAlign: 'right' }}>
                    <p style={{
                      margin: 0,
                      fontSize: '13px',
                      fontWeight: 700,
                      color: isGoal ? awayColor : '#94a3b8',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {ev.player_name}
                    </p>
                    <p style={{ margin: 0, fontSize: '10px', color: '#475569' }}>
                      {awayClub.short_name}
                    </p>
                  </div>
                </div>
              )}

              {/* Home side line when away event */}
              {isHome && (
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Club Card ────────────────────────────────────────────────────────────────

function ClubCard({
  club,
  onChallenge,
  simulating,
}: {
  club: Club
  onChallenge: (club: Club) => void
  simulating: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const accentColor = club.primary_color || '#6366f1'

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'linear-gradient(145deg, #12121e, #0d0d18)',
        border: `1px solid ${hovered ? accentColor + '40' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        transition: 'all 0.3s ease',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hovered
          ? `0 12px 40px rgba(0,0,0,0.5), 0 0 20px ${accentColor}20`
          : '0 4px 20px rgba(0,0,0,0.3)',
        cursor: 'default',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top accent line */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '2px',
        background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
        opacity: hovered ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }} />

      {/* Club header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: `${accentColor}20`,
          border: `1px solid ${accentColor}40`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Shield size={20} color={accentColor} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: 800,
            color: '#f1f5f9',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {club.name}
          </p>
          <p style={{ margin: 0, fontSize: '11px', color: '#475569', marginTop: '2px' }}>
            {club.players.length} jogadores
          </p>
        </div>
        <div style={{
          padding: '4px 10px',
          borderRadius: '8px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          fontSize: '12px',
          fontWeight: 800,
          color: '#94a3b8',
          flexShrink: 0,
        }}>
          {club.prestige}
        </div>
      </div>

      {/* Challenge button */}
      <button
        onClick={() => onChallenge(club)}
        disabled={simulating}
        style={{
          width: '100%',
          padding: '10px 0',
          borderRadius: '10px',
          background: simulating
            ? 'rgba(99,102,241,0.2)'
            : hovered
            ? `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`
            : 'rgba(255,255,255,0.06)',
          border: `1px solid ${hovered ? accentColor + '60' : 'rgba(255,255,255,0.1)'}`,
          color: hovered ? '#fff' : '#94a3b8',
          fontSize: '12px',
          fontWeight: 800,
          cursor: simulating ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '7px',
          transition: 'all 0.2s ease',
          letterSpacing: '0.05em',
          opacity: simulating ? 0.5 : 1,
        }}
      >
        <Swords size={14} />
        Desafiar
      </button>
    </div>
  )
}

// ─── Result Modal ─────────────────────────────────────────────────────────────

function ResultModal({
  result,
  onClose,
}: {
  result: MatchResult
  onClose: () => void
}) {
  const { home, away, homeGoals, awayGoals, stats, events } = result
  const homeColor = home.primary_color || '#6366f1'
  const awayColor = away.primary_color || '#e11d48'

  let outcome = 'EMPATE'
  let outcomeColor = '#f59e0b'
  if (homeGoals > awayGoals) { outcome = 'VITÓRIA'; outcomeColor = '#10b981' }
  if (homeGoals < awayGoals) { outcome = 'DERROTA'; outcomeColor = '#ef4444' }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.82)',
        backdropFilter: 'blur(10px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(145deg, #13131f, #0a0a14)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '24px',
          padding: '32px',
          width: '100%',
          maxWidth: '560px',
          boxShadow: '0 30px 80px rgba(0,0,0,0.8)',
          position: 'relative',
          marginTop: '20px',
          marginBottom: '20px'
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={16} />
        </button>

        {/* Outcome badge */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <span style={{
            fontSize: '11px',
            fontWeight: 800,
            color: outcomeColor,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            background: `${outcomeColor}18`,
            padding: '5px 14px',
            borderRadius: '20px',
            border: `1px solid ${outcomeColor}40`,
          }}>
            {outcome}
          </span>
        </div>

        {/* Score */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          marginBottom: '24px',
        }}>
          <div style={{ flex: 1, textAlign: 'right' }}>
            <p style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 900,
              color: homeColor,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {home.short_name}
            </p>
            <p style={{ margin: 0, fontSize: '10px', color: '#475569', marginTop: '2px' }}>
              Casa
            </p>
          </div>
          <div style={{
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: '36px', fontWeight: 900, color: '#f1f5f9' }}>{homeGoals}</span>
            <span style={{ fontSize: '22px', color: '#334155', fontWeight: 300 }}>–</span>
            <span style={{ fontSize: '36px', fontWeight: 900, color: '#f1f5f9' }}>{awayGoals}</span>
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <p style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 900,
              color: awayColor,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {away.short_name}
            </p>
            <p style={{ margin: 0, fontSize: '10px', color: '#475569', marginTop: '2px' }}>
              Visitante
            </p>
          </div>
        </div>

        {/* Stats */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '14px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          marginBottom: '8px',
        }}>
          {[
            { label: 'Posse de Bola', value: stats.possession },
            { label: 'Finalizações', value: stats.shots },
            { label: 'Escanteios', value: stats.corners },
          ].map(({ label, value }) => {
            const [left, right] = value.split('-').map((s) => s.trim())
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', width: '40px', textAlign: 'right', flexShrink: 0 }}>
                  {left}
                </span>
                <span style={{ fontSize: '10px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', flex: 1, textAlign: 'center' }}>
                  {label}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', width: '40px', textAlign: 'left', flexShrink: 0 }}>
                  {right}
                </span>
              </div>
            )
          })}
        </div>

        {/* Events Feed */}
        {events.length > 0 && (
          <EventFeed events={events} homeClub={home} awayClub={away} />
        )}
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function MatchesPage() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [myClub, setMyClub] = useState<Club | null>(null)
  const [loading, setLoading] = useState(true)
  const [simulating, setSimulating] = useState(false)
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const supabase = createClient()

  const loadClubs = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get user's club via club_owners
    const { data: ownerData } = await supabase
      .from('club_owners')
      .select('club_id')
      .eq('user_id', user.id)
      .single()

    const clubId = ownerData?.club_id

    const { data: allClubs } = await supabase
      .from('clubs')
      .select(`
        id, name, short_name, primary_color, secondary_color, prestige,
        players(id, name, position, shooting, pace, dribbling, defending, physical)
      `)
      .order('prestige', { ascending: false })

    if (allClubs) {
      const typed = allClubs as Club[]
      setClubs(typed.filter((c) => c.id !== clubId))
      const mine = typed.find((c) => c.id === clubId)
      if (mine) setMyClub(mine)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadClubs()
  }, [loadClubs])

  const simulateMatch = async (opponent: Club) => {
    if (!myClub) return
    setSimulating(true)
    setMatchResult(null)

    // Calculate team powers
    const getPower = (club: Club) => {
      const players = club.players || []
      if (players.length === 0) return { att: 50, def: 50 }
      const attackers = players.filter((p) =>
        ['ST', 'LW', 'RW', 'CAM', 'RM', 'LM', 'CF'].includes(p.position)
      )
      const defenders = players.filter((p) =>
        ['CB', 'LB', 'RB', 'CDM', 'GK'].includes(p.position)
      )
      const attAvg = attackers.length
        ? attackers.reduce((s, p) => s + (p.shooting + p.pace + p.dribbling) / 3, 0) / attackers.length
        : 50
      const defAvg = defenders.length
        ? defenders.reduce((s, p) => s + (p.defending + p.physical) / 2, 0) / defenders.length
        : 50
      return { att: attAvg, def: defAvg }
    }

    const myPower = getPower(myClub)
    const oppPower = getPower(opponent)

    const homeGoals = Math.max(
      0,
      Math.round((myPower.att * 0.45 - oppPower.def * 0.35) + Math.random() * 2.5)
    )
    const awayGoals = Math.max(
      0,
      Math.round((oppPower.att * 0.4 - myPower.def * 0.4) + Math.random() * 2)
    )

    // Generate events
    const rawEvents = generateMatchEvents(myClub, opponent, homeGoals, awayGoals)

    // Assign temp IDs for rendering
    const events: MatchEvent[] = rawEvents.map((ev, i) => ({
      ...ev,
      id: `temp-${i}`,
    }))

    // Try to insert match + events into DB (best-effort, non-blocking)
    let matchId: string | null = null
    try {
      // Insert match record
      const { data: matchData } = await supabase
        .from('matches')
        .insert({
          home_club_id: myClub.id,
          away_club_id: opponent.id,
          home_score: homeGoals,
          away_score: awayGoals,
          status: 'finished',
          match_type: 'friendly',
          played_at: new Date().toISOString(),
          scheduled_at: new Date().toISOString(),
          season_id: '00000000-0000-0000-0000-000000000000', // placeholder
        })
        .select('id')
        .single()

      if (matchData?.id) {
        matchId = matchData.id
        // Insert events
        const eventsToInsert = rawEvents.map((ev) => ({
          match_id: matchId!,
          event_type: ev.event_type,
          minute: ev.minute,
          club_id: ev.club_id,
          player_name: ev.player_name,
          description: ev.description,
        }))
        await supabase.from('match_events').insert(eventsToInsert)
      }
    } catch {
      // DB insert failed (e.g., missing season) – still show result in UI
    }

    const result: MatchResult = {
      matchId,
      home: myClub,
      away: opponent,
      homeGoals,
      awayGoals,
      stats: {
        possession: `${randInt(40, 60)}% - ${randInt(40, 60)}%`,
        shots: `${homeGoals + randInt(2, 8)} - ${awayGoals + randInt(1, 6)}`,
        corners: `${randInt(1, 9)} - ${randInt(1, 7)}`,
      },
      events,
    }

    // Simulate delay
    setTimeout(() => {
      setSimulating(false)
      setMatchResult(result)
    }, 1800)
  }

  const filteredClubs = clubs.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.short_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        fontFamily: '"Inter", system-ui, sans-serif',
      }}>
        <Loader2 size={24} color="#818cf8" className="animate-spin" />
        <span style={{ color: '#475569', fontSize: '14px' }}>Carregando adversários...</span>
        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} } .animate-spin{animation:spin 1s linear infinite}`}</style>
      </div>
    )
  }

  if (!myClub) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"Inter", system-ui, sans-serif',
      }}>
        <p style={{ color: '#ef4444', fontSize: '14px' }}>Erro: Clube não encontrado.</p>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      padding: '32px 24px',
      fontFamily: '"Inter", system-ui, sans-serif',
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '32px',
          gap: '16px',
          flexWrap: 'wrap',
        }}>
          <div>
            <h1 style={{
              margin: '0 0 6px',
              fontSize: '32px',
              fontWeight: 900,
              color: '#f1f5f9',
              letterSpacing: '-0.02em',
            }}>
              Central de Partidas
            </h1>
            <p style={{ margin: 0, fontSize: '14px', color: '#475569' }}>
              Desafie outros clubes e veja o lance a lance
            </p>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: '14px',
            padding: '12px 18px',
          }}>
            <Trophy size={20} color="#818cf8" />
            <div>
              <p style={{ margin: 0, fontSize: '10px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Meu Clube</p>
              <p style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#c7d2fe' }}>
                {myClub.short_name}
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div style={{ marginBottom: '24px' }}>
          <input
            type="text"
            placeholder="Pesquisar clube..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              maxWidth: '400px',
              padding: '10px 16px',
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#f1f5f9',
              fontSize: '14px',
              outline: 'none',
              fontFamily: '"Inter", system-ui, sans-serif',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Simulating overlay */}
        {simulating && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(99,102,241,0.15)',
              border: '2px solid rgba(99,102,241,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span style={{ fontSize: '28px', animation: 'bounce 0.8s infinite alternate' }}>⚽</span>
            </div>
            <p style={{ color: '#818cf8', fontSize: '16px', fontWeight: 700, margin: 0 }}>Simulando partida...</p>
            <p style={{ color: '#475569', fontSize: '13px', margin: 0 }}>Calculando resultado e eventos</p>
          </div>
        )}

        {/* Club Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '16px',
        }}>
          {filteredClubs.slice(0, 60).map((club) => (
            <ClubCard
              key={club.id}
              club={club}
              onChallenge={simulateMatch}
              simulating={simulating}
            />
          ))}
          {filteredClubs.length === 0 && (
            <div style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: '60px 0',
              color: '#475569',
              fontSize: '14px',
            }}>
              Nenhum clube encontrado
            </div>
          )}
        </div>
      </div>

      {/* Result Modal */}
      {matchResult && (
        <ResultModal result={matchResult} onClose={() => setMatchResult(null)} />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes bounce { from{transform:translateY(0)} to{transform:translateY(-8px)} }
        .animate-spin { animation: spin 1s linear infinite; }
        * { box-sizing: border-box; }
        input::placeholder { color: #475569; }
      `}</style>
    </div>
  )
}
