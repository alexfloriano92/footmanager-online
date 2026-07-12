'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const SECTOR_UPGRADES = [
  { level: 1, capacity_bonus: 1000, revenue_bonus: 20000, cost_multiplier: 1 },
  { level: 2, capacity_bonus: 2000, revenue_bonus: 50000, cost_multiplier: 2 },
  { level: 3, capacity_bonus: 3000, revenue_bonus: 80000, cost_multiplier: 4 },
  { level: 4, capacity_bonus: 5000, revenue_bonus: 150000, cost_multiplier: 8 },
  { level: 5, capacity_bonus: 8000, revenue_bonus: 250000, cost_multiplier: 15 }, // Max level
]

const MAX_STADIUM_LEVEL = 5

/**
 * Upgrade a specific stadium sector.
 * Costs money, increases capacity + revenue_per_match.
 */
export async function upgradeSector(sectorId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: coach } = await supabase.from('coaches').select('club_owners(club_id)').eq('user_id', user.id).single()
    const clubId = coach?.club_owners?.[0]?.club_id
    if (!clubId) return { error: 'Club not found' }

    const sc = getServiceClient()

    // Get sector info
    const { data: sector } = await sc.from('stadium_sectors').select('*, stadiums(club_id)').eq('id', sectorId).single()
    if (!sector) return { error: 'Sector not found' }
    if (sector.stadiums?.club_id !== clubId) return { error: 'Not your stadium' }
    if (sector.level >= MAX_STADIUM_LEVEL) return { error: 'Setor já está no nível máximo!' }

    const nextLevel = sector.level + 1
    const upgradeCost = sector.upgrade_cost * SECTOR_UPGRADES[nextLevel - 1].cost_multiplier
    const capacityBonus = SECTOR_UPGRADES[nextLevel - 1].capacity_bonus
    const revenueBonus = SECTOR_UPGRADES[nextLevel - 1].revenue_bonus

    // Check finances
    const { data: fin } = await sc.from('finances').select('cash_balance').eq('club_id', clubId).single()
    if (!fin || fin.cash_balance < upgradeCost) return { error: `Dinheiro insuficiente. Custo: €${(upgradeCost/1000000).toFixed(1)}M` }

    // Deduct cost
    await sc.from('finances').update({ cash_balance: fin.cash_balance - upgradeCost }).eq('club_id', clubId)

    // Upgrade sector
    await sc.from('stadium_sectors').update({
      level: nextLevel,
      capacity: sector.capacity + capacityBonus,
      revenue_per_match: sector.revenue_per_match + revenueBonus,
      upgrade_cost: sector.upgrade_cost * 2, // next upgrade costs more
    }).eq('id', sectorId)

    // Update total stadium capacity
    const { data: allSectors } = await sc.from('stadium_sectors').select('capacity').eq('stadium_id', sector.stadium_id)
    const totalCapacity = allSectors?.reduce((sum, s) => sum + s.capacity, 0) || 0
    await sc.from('stadiums').update({ capacity: totalCapacity }).eq('id', sector.stadium_id)

    // Record transaction
    await sc.from('financial_transactions').insert({
      club_id: clubId,
      type: 'expense',
      category: 'infrastructure',
      amount: upgradeCost,
      description: `Upgrade do ${sector.sector_name} para Nível ${nextLevel}`,
      balance_after: fin.cash_balance - upgradeCost
    })

    return { success: true, newLevel: nextLevel }
  } catch (e: any) {
    return { error: e.message }
  }
}

/**
 * Collect match day revenue from stadium sectors.
 * Called automatically when a match is played.
 */
export async function collectMatchDayRevenue(clubId: string, isHome: boolean) {
  if (!isHome) return { revenue: 0 } // Only home team collects

  const sc = getServiceClient()
  const { data: stadium } = await sc.from('stadiums').select('id').eq('club_id', clubId).single()
  if (!stadium) return { revenue: 0 }

  const { data: sectors } = await sc.from('stadium_sectors').select('revenue_per_match').eq('stadium_id', stadium.id)
  const revenue = sectors?.reduce((sum, s) => sum + s.revenue_per_match, 0) || 50000

  const { data: fin } = await sc.from('finances').select('cash_balance').eq('club_id', clubId).single()
  if (fin) {
    await sc.from('finances').update({ cash_balance: fin.cash_balance + revenue }).eq('club_id', clubId)
    await sc.from('financial_transactions').insert({
      club_id: clubId,
      type: 'income',
      category: 'ticket_sales',
      amount: revenue,
      description: 'Renda da Bilheteria',
      balance_after: fin.cash_balance + revenue
    })
  }

  return { revenue }
}
