'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { renewContract, changePosition } from '@/app/actions/squad'
import { AlertTriangle, X, RefreshCw, Edit3, Loader2, ChevronDown } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Contract {
  weekly_salary: number
  contract_end: string
}

interface PlayerWithContract {
  id: string
  name: string
  position: string
  nationality: string
  overall: number
  pace: number
  shooting: number
  passing: number
  dribbling: number
  defending: number
  physical: number
  market_value: number
  birth_date: string
  contracts: Contract[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(value: number) {
  if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `€${(value / 1_000).toFixed(0)}K`
  return `€${value}`
}

function formatSalary(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}

function isContractExpiringSoon(contractEnd: string): boolean {
  const end = new Date(contractEnd)
  const sixMonthsFromNow = new Date()
  sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6)
  return end <= sixMonthsFromNow
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function getNationalityFlag(nationality: string): string {
  const flags: Record<string, string> = {
    Brazil: '🇧🇷', Argentina: '🇦🇷', France: '🇫🇷', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    Germany: '🇩🇪', Spain: '🇪🇸', Portugal: '🇵🇹', Italy: '🇮🇹',
    Netherlands: '🇳🇱', Belgium: '🇧🇪', Croatia: '🇭🇷', Uruguay: '🇺🇾',
    Colombia: '🇨🇴', Mexico: '🇲🇽', USA: '🇺🇸', Japan: '🇯🇵',
    Senegal: '🇸🇳', Morocco: '🇲🇦', Nigeria: '🇳🇬', Ghana: '🇬🇭',
    Egypt: '🇪🇬', Australia: '🇦🇺', Serbia: '🇷🇸', Poland: '🇵🇱',
    Denmark: '🇩🇰', Sweden: '🇸🇪', Norway: '🇳🇴', Switzerland: '🇨🇭',
    Austria: '🇦🇹', Ukraine: '🇺🇦', Turkey: '🇹🇷', Iran: '🇮🇷',
    'South Korea': '🇰🇷', 'Ivory Coast': '🇨🇮', Cameroon: '🇨🇲',
  }
  return flags[nationality] || '🌍'
}

type PositionCategory = 'GK' | 'DEF' | 'MID' | 'ATT'

function getPositionCategory(pos: string): PositionCategory {
  if (pos === 'GK') return 'GK'
  if (['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(pos)) return 'DEF'
  if (['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(pos)) return 'MID'
  return 'ATT'
}

const POSITION_COLORS: Record<PositionCategory, { bg: string; text: string; glow: string }> = {
  GK: { bg: 'rgba(245,158,11,0.2)', text: '#f59e0b', glow: '0 0 12px rgba(245,158,11,0.4)' },
  DEF: { bg: 'rgba(59,130,246,0.2)', text: '#60a5fa', glow: '0 0 12px rgba(59,130,246,0.4)' },
  MID: { bg: 'rgba(34,197,94,0.2)', text: '#4ade80', glow: '0 0 12px rgba(34,197,94,0.4)' },
  ATT: { bg: 'rgba(239,68,68,0.2)', text: '#f87171', glow: '0 0 12px rgba(239,68,68,0.4)' },
}

function getOvrStyle(ovr: number): { color: string; glow: string; border: string } {
  if (ovr >= 90) return { color: '#fbbf24', glow: '0 0 20px rgba(251,191,36,0.7)', border: '#fbbf24' }
  if (ovr >= 80) return { color: '#4ade80', glow: '0 0 16px rgba(74,222,128,0.5)', border: '#4ade80' }
  if (ovr >= 70) return { color: '#60a5fa', glow: '0 0 14px rgba(96,165,250,0.4)', border: '#60a5fa' }
  return { color: '#94a3b8', glow: 'none', border: '#475569' }
}

const ATTR_COLORS: Record<string, string> = {
  PAC: '#f472b6',
  SHO: '#fb923c',
  PAS: '#a78bfa',
  DRI: '#34d399',
  DEF: '#60a5fa',
  PHY: '#fbbf24',
}

const POSITION_ALTERNATIVES: Record<string, string[]> = {
  LB: ['LWB', 'LM'],
  RB: ['RWB', 'RM'],
  CB: ['CDM'],
  CDM: ['CB', 'CM'],
  CM: ['CAM', 'CDM'],
  CAM: ['CM', 'LW', 'RW'],
  LM: ['LW', 'LB'],
  RM: ['RW', 'RB'],
  LW: ['LM', 'ST', 'CAM'],
  RW: ['RM', 'ST', 'CAM'],
  ST: ['LW', 'RW', 'CF'],
  CF: ['ST', 'CAM'],
  GK: [],
  LWB: ['LB', 'LM'],
  RWB: ['RB', 'RM'],
}

// ─── Stat Bar ─────────────────────────────────────────────────────────────────

function StatBar({ label, value }: { label: string; value: number }) {
  const color = ATTR_COLORS[label] || '#94a3b8'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', width: '22px', flexShrink: 0, letterSpacing: '0.05em' }}>{label}</span>
      <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <div
          style={{
            width: `${Math.min(100, value)}%`,
            height: '100%',
            borderRadius: '2px',
            background: color,
            boxShadow: `0 0 6px ${color}80`,
            transition: 'width 0.6s ease',
          }}
        />
      </div>
      <span style={{ fontSize: '9px', fontWeight: 700, color, width: '18px', textAlign: 'right', flexShrink: 0 }}>{value}</span>
    </div>
  )
}

// ─── OVR Badge ────────────────────────────────────────────────────────────────

function OvrBadge({ ovr }: { ovr: number }) {
  const style = getOvrStyle(ovr)
  return (
    <div
      style={{
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        border: `2px solid ${style.border}`,
        boxShadow: style.glow,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `${style.border}15`,
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: '14px', fontWeight: 900, color: style.color, lineHeight: 1 }}>{ovr}</span>
    </div>
  )
}

// ─── Player Card ──────────────────────────────────────────────────────────────

function PlayerCard({
  player,
  onRenew,
  onEditPosition,
}: {
  player: PlayerWithContract
  onRenew: (player: PlayerWithContract) => void
  onEditPosition: (player: PlayerWithContract) => void
}) {
  const [hovered, setHovered] = useState(false)
  const contract = player.contracts?.[0]
  const cat = getPositionCategory(player.position)
  const posStyle = POSITION_COLORS[cat]
  const expiring = contract && isContractExpiringSoon(contract.contract_end)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        borderRadius: '16px',
        background: 'linear-gradient(145deg, #12121e 0%, #0d0d18 100%)',
        border: `1px solid ${hovered ? posStyle.text + '50' : 'rgba(255,255,255,0.06)'}`,
        boxShadow: hovered
          ? `0 8px 40px rgba(0,0,0,0.5), ${posStyle.glow}`
          : '0 4px 20px rgba(0,0,0,0.3)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        transition: 'all 0.3s ease',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        cursor: 'default',
        overflow: 'hidden',
      }}
    >
      {/* Subtle gradient top accent */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: `linear-gradient(90deg, transparent, ${posStyle.text}, transparent)`,
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        {/* Position Badge */}
        <div
          style={{
            padding: '4px 10px',
            borderRadius: '8px',
            background: posStyle.bg,
            border: `1px solid ${posStyle.text}40`,
            fontSize: '11px',
            fontWeight: 800,
            color: posStyle.text,
            letterSpacing: '0.08em',
            flexShrink: 0,
          }}
        >
          {player.position}
        </div>

        {/* Name + Nationality */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {player.name}
          </p>
          <p style={{ margin: 0, fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            {getNationalityFlag(player.nationality)} {player.nationality}
          </p>
        </div>

        {/* OVR */}
        <OvrBadge ovr={player.overall} />
      </div>

      {/* Attributes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <StatBar label="PAC" value={player.pace} />
        <StatBar label="SHO" value={player.shooting} />
        <StatBar label="PAS" value={player.passing} />
        <StatBar label="DRI" value={player.dribbling} />
        <StatBar label="DEF" value={player.defending} />
        <StatBar label="PHY" value={player.physical} />
      </div>

      {/* Market Value */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Valor de mercado</span>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#a78bfa' }}>{formatCurrency(player.market_value)}</span>
      </div>

      {/* Contract Info */}
      {contract ? (
        <div
          style={{
            borderRadius: '10px',
            background: expiring ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${expiring ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.06)'}`,
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', color: '#64748b' }}>Salário semanal</span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0' }}>{formatSalary(contract.weekly_salary)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', color: '#64748b' }}>Contrato até</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: expiring ? '#f87171' : '#94a3b8' }}>
              {formatDate(contract.contract_end)}
            </span>
          </div>
          {expiring && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
              <AlertTriangle size={11} color="#f87171" />
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Contrato Expirando!
              </span>
            </div>
          )}
        </div>
      ) : (
        <div style={{ fontSize: '11px', color: '#475569', textAlign: 'center' }}>Sem contrato ativo</div>
      )}

      {/* Hover Action Buttons */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          opacity: hovered ? 1 : 0,
          transform: hovered ? 'translateY(0)' : 'translateY(6px)',
          transition: 'all 0.25s ease',
          pointerEvents: hovered ? 'auto' : 'none',
        }}
      >
        <button
          onClick={() => onRenew(player)}
          style={{
            flex: 1,
            padding: '8px 0',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            border: 'none',
            color: '#fff',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            letterSpacing: '0.04em',
          }}
        >
          <RefreshCw size={11} />
          Renovar Contrato
        </button>
        <button
          onClick={() => onEditPosition(player)}
          style={{
            flex: 1,
            padding: '8px 0',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#cbd5e1',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            letterSpacing: '0.04em',
          }}
        >
          <Edit3 size={11} />
          Editar Posição
        </button>
      </div>
    </div>
  )
}

// ─── Renew Contract Modal ─────────────────────────────────────────────────────

function RenewContractModal({
  player,
  onClose,
  onSuccess,
}: {
  player: PlayerWithContract
  onClose: () => void
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const contract = player.contracts?.[0]
  const newSalary = contract ? Math.round(contract.weekly_salary * 1.15) : 0
  const signingBonus = contract ? Math.round(contract.weekly_salary * 8) : 0

  let newContractEnd = 'N/A'
  if (contract) {
    const d = new Date(contract.contract_end)
    d.setFullYear(d.getFullYear() + 2)
    newContractEnd = formatDate(d.toISOString())
  }

  const handleConfirm = async () => {
    setLoading(true)
    setError(null)
    const result = await renewContract(player.id)
    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      onSuccess()
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(145deg, #13131f, #0d0d1a)',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: '20px',
          padding: '32px',
          maxWidth: '420px',
          width: '100%',
          boxShadow: '0 25px 80px rgba(0,0,0,0.7), 0 0 40px rgba(99,102,241,0.15)',
          position: 'relative',
        }}
      >
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}>
            <RefreshCw size={20} color="#818cf8" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#f1f5f9' }}>Renovar Contrato</h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>{player.name}</p>
          </div>
        </div>

        {/* Current contract */}
        <div style={{ marginBottom: '16px' }}>
          <p style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Contrato Atual</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ margin: '0 0 4px', fontSize: '10px', color: '#64748b' }}>Salário Atual</p>
              <p style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#e2e8f0' }}>{contract ? formatSalary(contract.weekly_salary) : '—'}</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ margin: '0 0 4px', fontSize: '10px', color: '#64748b' }}>Expira em</p>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#e2e8f0' }}>{contract ? formatDate(contract.contract_end) : '—'}</p>
            </div>
          </div>
        </div>

        {/* Arrow */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '8px 0' }}>
          <ChevronDown size={20} color="#4f46e5" />
        </div>

        {/* Proposed */}
        <div style={{ marginBottom: '20px' }}>
          <p style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Proposta de Renovação</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div style={{ background: 'rgba(99,102,241,0.1)', borderRadius: '10px', padding: '12px', border: '1px solid rgba(99,102,241,0.25)' }}>
              <p style={{ margin: '0 0 4px', fontSize: '10px', color: '#818cf8' }}>Novo Salário</p>
              <p style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#c7d2fe' }}>{formatSalary(newSalary)}</p>
              <p style={{ margin: '2px 0 0', fontSize: '9px', color: '#6366f1' }}>+15%</p>
            </div>
            <div style={{ background: 'rgba(99,102,241,0.1)', borderRadius: '10px', padding: '12px', border: '1px solid rgba(99,102,241,0.25)' }}>
              <p style={{ margin: '0 0 4px', fontSize: '10px', color: '#818cf8' }}>Novo Término</p>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#c7d2fe' }}>{newContractEnd}</p>
              <p style={{ margin: '2px 0 0', fontSize: '9px', color: '#6366f1' }}>+2 anos</p>
            </div>
          </div>
          <div style={{ background: 'rgba(239,68,68,0.08)', borderRadius: '10px', padding: '12px', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, fontSize: '10px', color: '#f87171' }}>Bônus de Assinatura</p>
              <p style={{ margin: 0, fontSize: '9px', color: '#ef4444', marginTop: '2px' }}>8x o salário atual</p>
            </div>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#f87171' }}>-{formatCurrency(signingBonus)}</p>
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: '16px', padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={14} color="#f87171" />
            <span style={{ fontSize: '12px', color: '#f87171' }}>{error}</span>
          </div>
        )}

        <button
          onClick={handleConfirm}
          disabled={loading || !contract}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '12px',
            background: loading ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            border: 'none',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 800,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            letterSpacing: '0.05em',
            boxShadow: loading ? 'none' : '0 4px 20px rgba(99,102,241,0.4)',
          }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          {loading ? 'Processando...' : 'Confirmar Renovação'}
        </button>
      </div>
    </div>
  )
}

// ─── Edit Position Modal ───────────────────────────────────────────────────────

function EditPositionModal({
  player,
  onClose,
  onSuccess,
}: {
  player: PlayerWithContract
  onClose: () => void
  onSuccess: (newPos: string) => void
}) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const alternatives = POSITION_ALTERNATIVES[player.position] ?? []

  const handleSelect = async (pos: string) => {
    setLoading(pos)
    setError(null)
    const result = await changePosition(player.id, pos)
    setLoading(null)
    if (result.error) {
      setError(result.error)
    } else {
      setSuccessMsg(`Posição alterada para ${pos}!`)
      setTimeout(() => {
        onSuccess(pos)
      }, 1200)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(145deg, #13131f, #0d0d1a)',
          border: '1px solid rgba(52,211,153,0.3)',
          borderRadius: '20px',
          padding: '32px',
          maxWidth: '380px',
          width: '100%',
          boxShadow: '0 25px 80px rgba(0,0,0,0.7), 0 0 40px rgba(52,211,153,0.1)',
          position: 'relative',
        }}
      >
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)' }}>
            <Edit3 size={20} color="#34d399" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#f1f5f9' }}>Editar Posição</h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>{player.name}</p>
          </div>
        </div>

        {/* Current position */}
        <div style={{ marginBottom: '20px' }}>
          <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Posição Atual</p>
          <div style={{ display: 'inline-flex', alignItems: 'center', padding: '8px 16px', borderRadius: '10px', background: POSITION_COLORS[getPositionCategory(player.position)].bg, border: `1px solid ${POSITION_COLORS[getPositionCategory(player.position)].text}40` }}>
            <span style={{ fontSize: '16px', fontWeight: 900, color: POSITION_COLORS[getPositionCategory(player.position)].text }}>{player.position}</span>
          </div>
        </div>

        {/* Alternatives */}
        {alternatives.length > 0 ? (
          <div>
            <p style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Posições Alternativas</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {alternatives.map((pos) => {
                const alt = getPositionCategory(pos)
                const altStyle = POSITION_COLORS[alt]
                const isLoading = loading === pos
                return (
                  <button
                    key={pos}
                    onClick={() => handleSelect(pos)}
                    disabled={!!loading}
                    style={{
                      padding: '12px 20px',
                      borderRadius: '10px',
                      background: altStyle.bg,
                      border: `1px solid ${altStyle.text}50`,
                      color: altStyle.text,
                      fontSize: '14px',
                      fontWeight: 800,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      opacity: loading && !isLoading ? 0.5 : 1,
                      transition: 'all 0.2s ease',
                      boxShadow: isLoading ? altStyle.glow : 'none',
                    }}
                  >
                    {isLoading && <Loader2 size={13} className="animate-spin" />}
                    {pos}
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <p style={{ fontSize: '13px', color: '#475569', textAlign: 'center', padding: '20px 0' }}>
            Nenhuma posição alternativa disponível para {player.position}
          </p>
        )}

        {successMsg && (
          <div style={{ marginTop: '16px', padding: '10px 14px', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: '8px', textAlign: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#34d399' }}>✓ {successMsg}</span>
          </div>
        )}

        {error && (
          <div style={{ marginTop: '16px', padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={14} color="#f87171" />
            <span style={{ fontSize: '12px', color: '#f87171' }}>{error}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Filter Tab ───────────────────────────────────────────────────────────────

function FilterTab({ label, active, onClick, count }: { label: string; active: boolean; onClick: () => void; count: number }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 18px',
        borderRadius: '10px',
        background: active ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${active ? 'transparent' : 'rgba(255,255,255,0.08)'}`,
        color: active ? '#fff' : '#64748b',
        fontSize: '13px',
        fontWeight: 700,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '7px',
        transition: 'all 0.2s ease',
        boxShadow: active ? '0 4px 14px rgba(99,102,241,0.35)' : 'none',
      }}
    >
      {label}
      <span style={{
        fontSize: '10px',
        fontWeight: 800,
        padding: '2px 6px',
        borderRadius: '6px',
        background: active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)',
        color: active ? '#fff' : '#475569',
      }}>
        {count}
      </span>
    </button>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

type FilterType = 'all' | 'GK' | 'DEF' | 'MID' | 'ATT'

export default function SquadPage() {
  const [players, setPlayers] = useState<PlayerWithContract[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [renewPlayer, setRenewPlayer] = useState<PlayerWithContract | null>(null)
  const [editPlayer, setEditPlayer] = useState<PlayerWithContract | null>(null)
  const [successBanner, setSuccessBanner] = useState<string | null>(null)

  const fetchPlayers = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: ownerData } = await supabase
      .from('club_owners')
      .select('club_id')
      .eq('user_id', user.id)
      .single()

    if (!ownerData?.club_id) return

    const { data } = await supabase
      .from('players')
      .select(`
        id, name, position, nationality, overall,
        pace, shooting, passing, dribbling, defending, physical,
        market_value, birth_date,
        contracts(weekly_salary, contract_end)
      `)
      .eq('club_id', ownerData.club_id)
      .order('overall', { ascending: false })

    if (data) setPlayers(data as PlayerWithContract[])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchPlayers()
  }, [fetchPlayers])

  const handleRenewSuccess = () => {
    setRenewPlayer(null)
    setSuccessBanner('Contrato renovado com sucesso!')
    fetchPlayers()
    setTimeout(() => setSuccessBanner(null), 4000)
  }

  const handlePositionSuccess = (newPos: string) => {
    setEditPlayer(null)
    setSuccessBanner(`Posição alterada para ${newPos}!`)
    fetchPlayers()
    setTimeout(() => setSuccessBanner(null), 4000)
  }

  const filtered = players.filter((p) => {
    if (filter === 'all') return true
    return getPositionCategory(p.position) === filter
  })

  const counts = {
    all: players.length,
    GK: players.filter((p) => getPositionCategory(p.position) === 'GK').length,
    DEF: players.filter((p) => getPositionCategory(p.position) === 'DEF').length,
    MID: players.filter((p) => getPositionCategory(p.position) === 'MID').length,
    ATT: players.filter((p) => getPositionCategory(p.position) === 'ATT').length,
  }

  const expiringCount = players.filter((p) => p.contracts?.[0] && isContractExpiringSoon(p.contracts[0].contract_end)).length

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0f',
        padding: '32px 24px',
        fontFamily: '"Inter", system-ui, sans-serif',
      }}
    >
      {/* Success Banner */}
      {successBanner && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2000,
            background: 'linear-gradient(135deg, #059669, #10b981)',
            borderRadius: '12px',
            padding: '12px 24px',
            boxShadow: '0 8px 30px rgba(16,185,129,0.4)',
            color: '#fff',
            fontWeight: 700,
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          ✓ {successBanner}
        </div>
      )}

      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Page Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ margin: '0 0 8px', fontSize: '32px', fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.02em' }}>
            Plantel Profissional
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#475569' }}>
            Gerencie seus jogadores, contratos e posições
          </p>
        </div>

        {/* Stats Bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          {[
            { label: 'Total de Jogadores', value: players.length, color: '#818cf8' },
            { label: 'Goleiros', value: counts.GK, color: '#f59e0b' },
            { label: 'Defensores', value: counts.DEF, color: '#60a5fa' },
            { label: 'Meio-campistas', value: counts.MID, color: '#4ade80' },
            { label: 'Atacantes', value: counts.ATT, color: '#f87171' },
            { label: 'Contratos Expirando', value: expiringCount, color: '#f87171', alert: true },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: 'linear-gradient(145deg, #12121e, #0d0d18)',
                border: stat.alert && expiringCount > 0 ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.06)',
                borderRadius: '14px',
                padding: '18px 20px',
                boxShadow: stat.alert && expiringCount > 0 ? '0 4px 20px rgba(239,68,68,0.1)' : 'none',
              }}
            >
              <p style={{ margin: '0 0 6px', fontSize: '10px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{stat.label}</p>
              <p style={{ margin: 0, fontSize: '28px', fontWeight: 900, color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '28px' }}>
          <FilterTab label="Todos" active={filter === 'all'} onClick={() => setFilter('all')} count={counts.all} />
          <FilterTab label="Goleiros" active={filter === 'GK'} onClick={() => setFilter('GK')} count={counts.GK} />
          <FilterTab label="Defensores" active={filter === 'DEF'} onClick={() => setFilter('DEF')} count={counts.DEF} />
          <FilterTab label="Meio-campo" active={filter === 'MID'} onClick={() => setFilter('MID')} count={counts.MID} />
          <FilterTab label="Atacantes" active={filter === 'ATT'} onClick={() => setFilter('ATT')} count={counts.ATT} />
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '12px' }}>
            <Loader2 size={24} color="#818cf8" className="animate-spin" />
            <span style={{ color: '#475569', fontSize: '14px' }}>Carregando plantel...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
            <span style={{ color: '#475569', fontSize: '14px' }}>Nenhum jogador encontrado</span>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '20px',
            }}
          >
            {filtered.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                onRenew={setRenewPlayer}
                onEditPosition={setEditPlayer}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {renewPlayer && (
        <RenewContractModal
          player={renewPlayer}
          onClose={() => setRenewPlayer(null)}
          onSuccess={handleRenewSuccess}
        />
      )}
      {editPlayer && (
        <EditPositionModal
          player={editPlayer}
          onClose={() => setEditPlayer(null)}
          onSuccess={handlePositionSuccess}
        />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
        @keyframes fadeIn { from { opacity: 0; transform: translateX(-50%) translateY(-8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  )
}
