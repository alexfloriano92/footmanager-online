'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Player } from '@/types';
import { Shield, Save, ChevronDown, Swords, Star, TrendingUp, Users, Loader2 } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type FormationKey = '4-3-3' | '4-4-2' | '4-2-3-1' | '3-5-2' | '5-3-2' | '4-1-4-1';

interface SlotDef {
  key: string;   // unique slot key e.g. "CB1"
  label: string; // display label e.g. "CB"
}

interface RowDef {
  rowLabel: string;
  slots: SlotDef[];
}

type FormationLayout = RowDef[]; // index 0 = attack row (top of pitch), last = GK row (bottom)

// Player slots map: slotKey → player id
type PlayerSlots = Record<string, string>;

// ─── Formation Definitions ────────────────────────────────────────────────────

const FORMATIONS: Record<FormationKey, FormationLayout> = {
  '4-3-3': [
    { rowLabel: 'Attack',    slots: [{ key: 'LW', label: 'LW' }, { key: 'ST', label: 'ST' }, { key: 'RW', label: 'RW' }] },
    { rowLabel: 'Midfield',  slots: [{ key: 'CM1', label: 'CM' }, { key: 'CM2', label: 'CM' }, { key: 'CM3', label: 'CM' }] },
    { rowLabel: 'Defense',   slots: [{ key: 'LB', label: 'LB' }, { key: 'CB1', label: 'CB' }, { key: 'CB2', label: 'CB' }, { key: 'RB', label: 'RB' }] },
    { rowLabel: 'Goal',      slots: [{ key: 'GK', label: 'GK' }] },
  ],
  '4-4-2': [
    { rowLabel: 'Attack',    slots: [{ key: 'ST1', label: 'ST' }, { key: 'ST2', label: 'ST' }] },
    { rowLabel: 'Midfield',  slots: [{ key: 'LM', label: 'LM' }, { key: 'CM1', label: 'CM' }, { key: 'CM2', label: 'CM' }, { key: 'RM', label: 'RM' }] },
    { rowLabel: 'Defense',   slots: [{ key: 'LB', label: 'LB' }, { key: 'CB1', label: 'CB' }, { key: 'CB2', label: 'CB' }, { key: 'RB', label: 'RB' }] },
    { rowLabel: 'Goal',      slots: [{ key: 'GK', label: 'GK' }] },
  ],
  '4-2-3-1': [
    { rowLabel: 'Attack',    slots: [{ key: 'ST', label: 'ST' }] },
    { rowLabel: 'AMidfield', slots: [{ key: 'LW', label: 'LW' }, { key: 'CAM', label: 'CAM' }, { key: 'RW', label: 'RW' }] },
    { rowLabel: 'DMidfield', slots: [{ key: 'CDM1', label: 'CDM' }, { key: 'CDM2', label: 'CDM' }] },
    { rowLabel: 'Defense',   slots: [{ key: 'LB', label: 'LB' }, { key: 'CB1', label: 'CB' }, { key: 'CB2', label: 'CB' }, { key: 'RB', label: 'RB' }] },
    { rowLabel: 'Goal',      slots: [{ key: 'GK', label: 'GK' }] },
  ],
  '3-5-2': [
    { rowLabel: 'Attack',    slots: [{ key: 'ST1', label: 'ST' }, { key: 'ST2', label: 'ST' }] },
    { rowLabel: 'Midfield',  slots: [{ key: 'LM', label: 'LM' }, { key: 'CM1', label: 'CM' }, { key: 'CM2', label: 'CM' }, { key: 'CM3', label: 'CM' }, { key: 'RM', label: 'RM' }] },
    { rowLabel: 'Defense',   slots: [{ key: 'CB1', label: 'CB' }, { key: 'CB2', label: 'CB' }, { key: 'CB3', label: 'CB' }] },
    { rowLabel: 'Goal',      slots: [{ key: 'GK', label: 'GK' }] },
  ],
  '5-3-2': [
    { rowLabel: 'Attack',    slots: [{ key: 'ST1', label: 'ST' }, { key: 'ST2', label: 'ST' }] },
    { rowLabel: 'Midfield',  slots: [{ key: 'CM1', label: 'CM' }, { key: 'CM2', label: 'CM' }, { key: 'CM3', label: 'CM' }] },
    { rowLabel: 'Defense',   slots: [{ key: 'LB', label: 'LB' }, { key: 'CB1', label: 'CB' }, { key: 'CB2', label: 'CB' }, { key: 'CB3', label: 'CB' }, { key: 'RB', label: 'RB' }] },
    { rowLabel: 'Goal',      slots: [{ key: 'GK', label: 'GK' }] },
  ],
  '4-1-4-1': [
    { rowLabel: 'Attack',    slots: [{ key: 'ST', label: 'ST' }] },
    { rowLabel: 'Midfield',  slots: [{ key: 'LM', label: 'LM' }, { key: 'CM1', label: 'CM' }, { key: 'CM2', label: 'CM' }, { key: 'RM', label: 'RM' }] },
    { rowLabel: 'DMidfield', slots: [{ key: 'CDM', label: 'CDM' }] },
    { rowLabel: 'Defense',   slots: [{ key: 'LB', label: 'LB' }, { key: 'CB1', label: 'CB' }, { key: 'CB2', label: 'CB' }, { key: 'RB', label: 'RB' }] },
    { rowLabel: 'Goal',      slots: [{ key: 'GK', label: 'GK' }] },
  ],
};

// Which base positions each slot accepts
const SLOT_POSITIONS: Record<string, string[]> = {
  GK:   ['GK'],
  LB:   ['LB', 'LWB', 'CB'],
  RB:   ['RB', 'RWB', 'CB'],
  CB1:  ['CB', 'CDM'],
  CB2:  ['CB', 'CDM'],
  CB3:  ['CB', 'CDM'],
  LM:   ['LM', 'LW', 'CM', 'CAM'],
  RM:   ['RM', 'RW', 'CM', 'CAM'],
  CM1:  ['CM', 'CDM', 'CAM'],
  CM2:  ['CM', 'CDM', 'CAM'],
  CM3:  ['CM', 'CDM', 'CAM'],
  CDM:  ['CDM', 'CM'],
  CDM1: ['CDM', 'CM'],
  CDM2: ['CDM', 'CM'],
  CAM:  ['CAM', 'CM', 'LM', 'RM'],
  LW:   ['LW', 'LM', 'ST'],
  RW:   ['RW', 'RM', 'ST'],
  ST:   ['ST', 'CF', 'LW', 'RW'],
  ST1:  ['ST', 'CF', 'LW', 'RW'],
  ST2:  ['ST', 'CF', 'LW', 'RW'],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSlotPositions(slotKey: string): string[] {
  return SLOT_POSITIONS[slotKey] ?? ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST'];
}

function getOvrColor(ovr: number): string {
  if (ovr >= 85) return '#f59e0b';
  if (ovr >= 75) return '#10b981';
  if (ovr >= 65) return '#3b82f6';
  return '#94a3b8';
}

function getPositionBadgeColor(pos: string): string {
  if (pos === 'GK') return '#f97316';
  if (['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(pos)) return '#3b82f6';
  if (['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(pos)) return '#10b981';
  return '#f59e0b';
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TacticsPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [clubId, setClubId] = useState<string | null>(null);
  const [formation, setFormation] = useState<FormationKey>('4-3-3');
  const [playerSlots, setPlayerSlots] = useState<PlayerSlots>({});
  const [saveMsg, setSaveMsg] = useState<'success' | 'error' | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // ── Fetch data ──────────────────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: coach } = await supabase
        .from('coaches')
        .select('*, club_owners(club_id)')
        .eq('user_id', user.id)
        .single();

      const cid = coach?.club_owners?.[0]?.club_id ?? null;
      setClubId(cid);
      if (!cid) { setLoading(false); return; }

      const { data: playersData } = await supabase
        .from('players')
        .select('*')
        .eq('club_id', cid)
        .order('overall', { ascending: false });

      setPlayers((playersData as Player[]) ?? []);

      // Load existing tactics
      const { data: tactics } = await supabase
        .from('tactics')
        .select('*')
        .eq('club_id', cid)
        .single();

      if (tactics) {
        setFormation((tactics.formation as FormationKey) ?? '4-3-3');
        setPlayerSlots((tactics.player_slots as PlayerSlots) ?? {});
      }

      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Formation change: clear slots that don't exist in new formation ─────────

  const handleFormationChange = useCallback((f: FormationKey) => {
    setFormation(f);
    const layout = FORMATIONS[f];
    const allSlotKeys = new Set(layout.flatMap(row => row.slots.map(s => s.key)));
    setPlayerSlots(prev => {
      const next: PlayerSlots = {};
      for (const k of Object.keys(prev)) {
        if (allSlotKeys.has(k)) next[k] = prev[k];
      }
      return next;
    });
    setOpenDropdown(null);
  }, []);

  // ── Slot assignment ─────────────────────────────────────────────────────────

  const assignPlayer = useCallback((slotKey: string, playerId: string) => {
    setPlayerSlots(prev => {
      const next = { ...prev };
      // Remove the player from any other slot first
      for (const k of Object.keys(next)) {
        if (next[k] === playerId) delete next[k];
      }
      if (playerId === '') {
        delete next[slotKey];
      } else {
        next[slotKey] = playerId;
      }
      return next;
    });
    setOpenDropdown(null);
  }, []);

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!clubId) return;
    setSaving(true);
    setSaveMsg(null);
    const { error } = await supabase
      .from('tactics')
      .upsert({ club_id: clubId, formation, player_slots: playerSlots }, { onConflict: 'club_id' });
    setSaving(false);
    setSaveMsg(error ? 'error' : 'success');
    setTimeout(() => setSaveMsg(null), 3000);
  }, [supabase, clubId, formation, playerSlots]);

  // ── Derived data ────────────────────────────────────────────────────────────

  const layout = FORMATIONS[formation];
  const allSlotKeys = layout.flatMap(row => row.slots.map(s => s.key));
  const assignedPlayerIds = new Set(Object.values(playerSlots).filter(Boolean));
  const benchPlayers = players.filter(p => !assignedPlayerIds.has(p.id));

  const startersInXI: Player[] = allSlotKeys
    .map(k => players.find(p => p.id === playerSlots[k]))
    .filter((p): p is Player => !!p);

  const avgOVR = startersInXI.length
    ? Math.round(startersInXI.reduce((sum, p) => sum + p.overall, 0) / startersInXI.length)
    : 0;

  const attackPower = startersInXI.filter(p => ['ST', 'CF', 'LW', 'RW'].includes(p.position)).length
    ? Math.round(
        startersInXI
          .filter(p => ['ST', 'CF', 'LW', 'RW', 'CAM', 'LM', 'RM'].includes(p.position))
          .reduce((s, p) => s + ((p.shooting ?? 0) * 0.5 + (p.dribbling ?? 0) * 0.3 + (p.passing ?? 0) * 0.2), 0) /
        Math.max(1, startersInXI.filter(p => ['ST', 'CF', 'LW', 'RW', 'CAM', 'LM', 'RM'].includes(p.position)).length)
      )
    : 0;

  const defensePower = startersInXI.filter(p => ['CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'GK'].includes(p.position)).length
    ? Math.round(
        startersInXI
          .filter(p => ['CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'GK'].includes(p.position))
          .reduce((s, p) => s + ((p.defending ?? 0) * 0.6 + (p.physical ?? 0) * 0.4), 0) /
        Math.max(1, startersInXI.filter(p => ['CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'GK'].includes(p.position)).length)
      )
    : 0;

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20" />
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
          </div>
          <p className="text-slate-400 text-sm">Carregando táticas…</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full max-w-7xl mx-auto flex flex-col gap-6"
      onClick={() => openDropdown && setOpenDropdown(null)}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <Shield className="w-5 h-5 text-emerald-400" />
            </span>
            Táticas
          </h1>
          <p className="text-slate-400 text-sm ml-[52px]">
            Configure sua formação e escalação inicial.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {saveMsg === 'success' && (
            <span className="text-emerald-400 text-sm font-medium animate-pulse">
              ✓ Táticas salvas!
            </span>
          )}
          {saveMsg === 'error' && (
            <span className="text-red-400 text-sm font-medium">
              ✗ Erro ao salvar
            </span>
          )}
          <Button
            onClick={e => { e.stopPropagation(); handleSave(); }}
            disabled={saving}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 h-10 rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar Formação
          </Button>
        </div>
      </div>

      {/* Formation Selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-slate-400 text-sm font-medium">Formação:</span>
        {(Object.keys(FORMATIONS) as FormationKey[]).map(f => (
          <button
            key={f}
            onClick={e => { e.stopPropagation(); handleFormationChange(f); }}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold border transition-all ${
              formation === f
                ? 'bg-emerald-500 border-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-emerald-500/50 hover:text-slate-100'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Main Layout: Pitch + Bench */}
      <div className="flex gap-6 items-start flex-wrap lg:flex-nowrap">

        {/* ── Pitch ── */}
        <div className="flex-1 min-w-0">
          <div
            className="relative w-full mx-auto rounded-2xl overflow-hidden shadow-2xl shadow-black/50"
            style={{ maxWidth: 480, aspectRatio: '480/660' }}
          >
            {/* Pitch background */}
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to top, #1a4a1a, #2d7a2d)' }}
            />

            {/* Grass stripes */}
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute left-0 right-0"
                style={{
                  top: `${i * 12.5}%`,
                  height: '12.5%',
                  background: i % 2 === 0 ? 'rgba(0,0,0,0.06)' : 'transparent',
                }}
              />
            ))}

            {/* Outer border */}
            <div
              className="absolute"
              style={{
                top: '5%', left: '5%', right: '5%', bottom: '5%',
                border: '2px solid rgba(255,255,255,0.55)',
                borderRadius: 4,
              }}
            />

            {/* Midfield line */}
            <div
              className="absolute left-[5%] right-[5%]"
              style={{ top: '50%', height: 2, background: 'rgba(255,255,255,0.55)' }}
            />

            {/* Center circle */}
            <div
              className="absolute"
              style={{
                width: '22%',
                aspectRatio: '1',
                borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.45)',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            />
            {/* Center dot */}
            <div
              className="absolute rounded-full"
              style={{
                width: 6, height: 6,
                background: 'rgba(255,255,255,0.8)',
                top: '50%', left: '50%',
                transform: 'translate(-50%,-50%)',
              }}
            />

            {/* Top penalty box */}
            <div
              className="absolute"
              style={{
                top: '5%', left: '22%', right: '22%', height: '16%',
                border: '2px solid rgba(255,255,255,0.45)',
                borderTop: 'none',
              }}
            />
            {/* Top goal box */}
            <div
              className="absolute"
              style={{
                top: '5%', left: '36%', right: '36%', height: '7%',
                border: '2px solid rgba(255,255,255,0.35)',
                borderTop: 'none',
              }}
            />

            {/* Bottom penalty box */}
            <div
              className="absolute"
              style={{
                bottom: '5%', left: '22%', right: '22%', height: '16%',
                border: '2px solid rgba(255,255,255,0.45)',
                borderBottom: 'none',
              }}
            />
            {/* Bottom goal box */}
            <div
              className="absolute"
              style={{
                bottom: '5%', left: '36%', right: '36%', height: '7%',
                border: '2px solid rgba(255,255,255,0.35)',
                borderBottom: 'none',
              }}
            />

            {/* Goal top */}
            <div
              className="absolute"
              style={{
                top: '3.5%', left: '42%', right: '42%', height: '1.5%',
                background: 'rgba(255,255,255,0.6)',
                borderRadius: 2,
              }}
            />
            {/* Goal bottom */}
            <div
              className="absolute"
              style={{
                bottom: '3.5%', left: '42%', right: '42%', height: '1.5%',
                background: 'rgba(255,255,255,0.6)',
                borderRadius: 2,
              }}
            />

            {/* Rows of slots — absolute positioned inside pitch */}
            <div
              className="absolute inset-0 flex flex-col justify-around items-center"
              style={{ padding: '7% 4%' }}
            >
              {layout.map((row, rowIdx) => (
                <div
                  key={`${formation}-${rowIdx}`}
                  className="flex justify-center items-center w-full gap-1"
                  style={{ flex: 1 }}
                >
                  {row.slots.map(slot => {
                    const assignedPlayerId = playerSlots[slot.key];
                    const assignedPlayer = players.find(p => p.id === assignedPlayerId);
                    const isOpen = openDropdown === slot.key;
                    const compatible = players.filter(p =>
                      getSlotPositions(slot.key).includes(p.position)
                    );

                    return (
                      <div
                        key={slot.key}
                        className="relative flex flex-col items-center"
                        style={{ flex: 1, maxWidth: 100 }}
                        onClick={e => e.stopPropagation()}
                      >
                        {/* Slot button */}
                        <button
                          onClick={() => setOpenDropdown(isOpen ? null : slot.key)}
                          className={`
                            relative flex flex-col items-center justify-center rounded-full
                            transition-all duration-200 cursor-pointer select-none
                            ${assignedPlayer
                              ? 'shadow-lg scale-105'
                              : 'hover:scale-105'
                            }
                          `}
                          style={{
                            width: 52,
                            height: 52,
                            background: assignedPlayer
                              ? `radial-gradient(circle at 35% 35%, ${getOvrColor(assignedPlayer.overall)}33, ${getOvrColor(assignedPlayer.overall)}11)`
                              : 'rgba(0,0,0,0.35)',
                            border: assignedPlayer
                              ? `2px solid ${getOvrColor(assignedPlayer.overall)}`
                              : '2px dashed rgba(255,255,255,0.4)',
                            boxShadow: assignedPlayer
                              ? `0 0 16px ${getOvrColor(assignedPlayer.overall)}55`
                              : 'none',
                          }}
                          title={slot.label}
                        >
                          {assignedPlayer ? (
                            <>
                              <span className="text-white font-black text-[10px] leading-none">
                                {assignedPlayer.name.split(' ').at(-1)?.slice(0, 7)}
                              </span>
                              <span
                                className="text-[9px] font-bold mt-0.5"
                                style={{ color: getOvrColor(assignedPlayer.overall) }}
                              >
                                {assignedPlayer.overall}
                              </span>
                            </>
                          ) : (
                            <span className="text-white/70 text-[10px] font-bold">{slot.label}</span>
                          )}
                        </button>

                        {/* Position label below */}
                        <span
                          className="text-[9px] font-bold mt-1 px-1.5 py-0.5 rounded-full"
                          style={{
                            background: assignedPlayer
                              ? `${getPositionBadgeColor(assignedPlayer.position)}33`
                              : 'rgba(0,0,0,0.5)',
                            color: assignedPlayer
                              ? getPositionBadgeColor(assignedPlayer.position)
                              : 'rgba(255,255,255,0.5)',
                          }}
                        >
                          {slot.label}
                        </span>

                        {/* Dropdown */}
                        {isOpen && (
                          <div
                            className="absolute z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl shadow-black/80 overflow-hidden"
                            style={{
                              top: 64,
                              left: '50%',
                              transform: 'translateX(-50%)',
                              width: 180,
                              maxHeight: 220,
                              overflowY: 'auto',
                            }}
                          >
                            {/* Remove option */}
                            <button
                              onClick={() => assignPlayer(slot.key, '')}
                              className="w-full text-left px-3 py-2 text-xs text-slate-400 hover:bg-slate-800 border-b border-slate-800 transition-colors"
                            >
                              — Remover jogador
                            </button>
                            {compatible.length === 0 && (
                              <div className="px-3 py-2 text-xs text-slate-500">Nenhum jogador</div>
                            )}
                            {compatible.map(p => {
                              const isAssigned = assignedPlayerIds.has(p.id) && playerSlots[slot.key] !== p.id;
                              return (
                                <button
                                  key={p.id}
                                  onClick={() => assignPlayer(slot.key, p.id)}
                                  disabled={isAssigned}
                                  className={`
                                    w-full text-left px-3 py-2 flex items-center gap-2 transition-colors
                                    ${playerSlots[slot.key] === p.id
                                      ? 'bg-emerald-500/20 text-emerald-300'
                                      : isAssigned
                                        ? 'opacity-30 cursor-not-allowed text-slate-500'
                                        : 'text-slate-200 hover:bg-slate-800'
                                    }
                                  `}
                                >
                                  <span
                                    className="text-[10px] font-black rounded-full w-7 h-7 flex items-center justify-center shrink-0"
                                    style={{
                                      background: `${getOvrColor(p.overall)}22`,
                                      color: getOvrColor(p.overall),
                                      border: `1px solid ${getOvrColor(p.overall)}55`,
                                    }}
                                  >
                                    {p.overall}
                                  </span>
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-semibold truncate">{p.name}</span>
                                    <span className="text-[9px] text-slate-500">{p.position}</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Formation overlay label */}
            <div
              className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-black text-white/80"
              style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
            >
              {formation}
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            <StatCard
              icon={<Star className="w-4 h-4 text-yellow-400" />}
              label="OVR Médio"
              value={avgOVR || '—'}
              color="#f59e0b"
            />
            <StatCard
              icon={<Swords className="w-4 h-4 text-red-400" />}
              label="Ataque"
              value={attackPower || '—'}
              color="#ef4444"
            />
            <StatCard
              icon={<Shield className="w-4 h-4 text-blue-400" />}
              label="Defesa"
              value={defensePower || '—'}
              color="#3b82f6"
            />
          </div>
        </div>

        {/* ── Bench / Squad sidebar ── */}
        <div className="w-full lg:w-72 shrink-0">
          <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-sm sticky top-4">
            <CardHeader className="pb-3 border-b border-slate-800">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                Banco de Reservas
                <Badge
                  className="ml-auto bg-slate-800 text-slate-300 border-slate-700 text-xs"
                >
                  {benchPlayers.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              {benchPlayers.length === 0 ? (
                <p className="text-center text-slate-500 text-sm py-6">
                  Todos os jogadores escalados
                </p>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-[560px] overflow-y-auto pr-1">
                  {benchPlayers.map(p => (
                    <div
                      key={p.id}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50 hover:border-emerald-500/30 hover:bg-slate-800 transition-all group"
                    >
                      {/* OVR */}
                      <span
                        className="text-[11px] font-black rounded-lg w-8 h-8 flex items-center justify-center shrink-0"
                        style={{
                          background: `${getOvrColor(p.overall)}18`,
                          color: getOvrColor(p.overall),
                          border: `1.5px solid ${getOvrColor(p.overall)}44`,
                        }}
                      >
                        {p.overall}
                      </span>

                      {/* Name + pos */}
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-xs font-semibold text-slate-200 truncate group-hover:text-white transition-colors">
                          {p.name}
                        </span>
                        <span className="text-[10px] text-slate-500 truncate">{p.nationality}</span>
                      </div>

                      {/* Position badge */}
                      <span
                        className="text-[9px] font-black px-1.5 py-0.5 rounded-md shrink-0"
                        style={{
                          background: `${getPositionBadgeColor(p.position)}22`,
                          color: getPositionBadgeColor(p.position),
                          border: `1px solid ${getPositionBadgeColor(p.position)}44`,
                        }}
                      >
                        {p.position}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* XI Summary */}
          {startersInXI.length > 0 && (
            <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-sm mt-4">
              <CardHeader className="pb-3 border-b border-slate-800">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  XI Inicial
                  <Badge className="ml-auto bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs">
                    {startersInXI.length}/11
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <div className="flex flex-col gap-1">
                  {layout.flatMap(row => row.slots).map(slot => {
                    const p = players.find(pl => pl.id === playerSlots[slot.key]);
                    return (
                      <div key={slot.key} className="flex items-center gap-2 py-0.5">
                        <span
                          className="text-[9px] font-black w-8 text-right shrink-0"
                          style={{ color: p ? getPositionBadgeColor(p.position) : '#475569' }}
                        >
                          {slot.label}
                        </span>
                        <div className="flex-1 h-px bg-slate-800" />
                        {p ? (
                          <span className="text-xs text-slate-300 font-medium truncate max-w-[100px]">
                            {p.name}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-600 italic">Vazio</span>
                        )}
                        {p && (
                          <span
                            className="text-[10px] font-black ml-1 shrink-0"
                            style={{ color: getOvrColor(p.overall) }}
                          >
                            {p.overall}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div
      className="relative flex flex-col gap-1 p-4 rounded-2xl border overflow-hidden"
      style={{
        background: `${color}09`,
        borderColor: `${color}30`,
      }}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs text-slate-400 font-medium">{label}</span>
      </div>
      <span
        className="text-2xl font-black tabular-nums"
        style={{ color }}
      >
        {value}
      </span>
      {/* Decorative glow */}
      <div
        className="absolute -bottom-4 -right-4 w-16 h-16 rounded-full blur-2xl opacity-20"
        style={{ background: color }}
      />
    </div>
  );
}
