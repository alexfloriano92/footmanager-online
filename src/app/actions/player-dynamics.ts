'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ============================================================
// MORALE
// ============================================================

/**
 * Called after every match result.
 * Win: morale +10 for all players in the club (capped at 100)
 * Draw: no change
 * Lose: morale -8 (floored at 10)
 */
export async function applyMoraleEffect(clubId: string, result: 'win' | 'draw' | 'loss') {
  const sc = getServiceClient()
  const { data: players } = await sc.from('players').select('id, morale').eq('club_id', clubId)
  if (!players) return

  const delta = result === 'win' ? 10 : result === 'loss' ? -8 : 0
  if (delta === 0) return

  for (const p of players) {
    const newMorale = Math.max(10, Math.min(100, p.morale + delta))
    await sc.from('players').update({ morale: newMorale }).eq('id', p.id)
  }
}

/**
 * Morale slowly recovers toward 70 (neutral) over time when idle (daily drift).
 * +2 per day if below 70, -1 if above 70 (star players become complacent).
 */
export async function applyMoraleDrift(clubId: string) {
  const sc = getServiceClient()
  const { data: players } = await sc.from('players').select('id, morale').eq('club_id', clubId)
  if (!players) return

  for (const p of players) {
    let newMorale = p.morale
    if (p.morale < 70) newMorale = Math.min(70, p.morale + 2)
    else if (p.morale > 70) newMorale = Math.max(70, p.morale - 1)
    if (newMorale !== p.morale) {
      await sc.from('players').update({ morale: newMorale }).eq('id', p.id)
    }
  }
}

// ============================================================
// FATIGUE / CONDITION
// ============================================================

/**
 * After a match, reduce condition for starters.
 * Each match: -15% condition for players who played.
 * During training rest (no match day): +10% condition recovery per day.
 */
export async function applyMatchFatigue(clubId: string) {
  const sc = getServiceClient()
  const { data: players } = await sc.from('players').select('id, condition_pct').eq('club_id', clubId)
  if (!players) return

  for (const p of players) {
    const newCondition = Math.max(30, p.condition_pct - 15) // Minimum 30% (exhausted but playable)
    await sc.from('players').update({ condition_pct: newCondition }).eq('id', p.id)
  }
}

export async function applyConditionRecovery(clubId: string) {
  const sc = getServiceClient()
  const { data: players } = await sc.from('players').select('id, condition_pct').eq('club_id', clubId)
  if (!players) return

  for (const p of players) {
    const newCondition = Math.min(100, p.condition_pct + 10)
    if (newCondition !== p.condition_pct) {
      await sc.from('players').update({ condition_pct: newCondition }).eq('id', p.id)
    }
  }
}

// ============================================================
// AGING
// ============================================================

function getAge(birthDate: string): number {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

/**
 * Apply annual aging effects:
 * - Players 31+: lose 1 point from their weakest attribute each year
 * - Players 35+: lose 2 points
 * - Players 38+: retire (set status = 'retired', club_id = null)
 */
export async function applyAnnualAging() {
  const sc = getServiceClient()
  const { data: players } = await sc.from('players').select('*').eq('status', 'active')
  if (!players) return { retired: 0, declined: 0 }

  let retired = 0, declined = 0

  for (const p of players) {
    if (!p.birth_date) continue
    const age = getAge(p.birth_date)

    if (age >= 38) {
      // Retire the player
      await sc.from('players').update({ status: 'retired', club_id: null }).eq('id', p.id)
      retired++
      continue
    }

    if (age >= 31) {
      const decay = age >= 35 ? 2 : 1
      const attrs: { [key: string]: number } = {
        pace: p.pace,
        shooting: p.shooting,
        passing: p.passing,
        dribbling: p.dribbling,
        defending: p.defending,
        physical: p.physical
      }

      // Find weakest attribute to decay first (realistic: pace goes first)
      const sortedAttrs = Object.entries(attrs).sort((a, b) => a[1] - b[1])
      const decayUpdates: Record<string, number> = {}
      let remaining = decay

      // Pace decays fastest for older players
      if (age >= 31) {
        const newPace = Math.max(40, p.pace - Math.min(remaining, 2))
        if (newPace !== p.pace) {
          decayUpdates.pace = newPace
          remaining -= (p.pace - newPace)
        }
      }

      // Then weakest
      for (const [attr, val] of sortedAttrs) {
        if (remaining <= 0) break
        if (attr === 'pace') continue
        const newVal = Math.max(40, val - 1)
        if (newVal !== val) {
          decayUpdates[attr] = newVal
          remaining--
        }
      }

      if (Object.keys(decayUpdates).length > 0) {
        // Recalculate overall
        const updatedAttrs = { ...attrs, ...decayUpdates }
        const newOverall = Math.round(
          (updatedAttrs.pace + updatedAttrs.shooting + updatedAttrs.passing +
           updatedAttrs.dribbling + updatedAttrs.defending + updatedAttrs.physical) / 6
        )
        await sc.from('players').update({ ...decayUpdates, overall: newOverall }).eq('id', p.id)
        declined++
      }
    }
  }

  return { retired, declined }
}
