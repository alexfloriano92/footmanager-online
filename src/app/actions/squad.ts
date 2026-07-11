'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

function getServiceRoleClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase Service Role configuration.')
  }
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
      }
    }
  )
}

export async function renewContract(playerId: string) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return { error: 'Unauthorized' }

    // Get user's club
    const { data: ownerData, error: ownerError } = await supabase
      .from('club_owners')
      .select('club_id')
      .eq('user_id', user.id)
      .single()

    if (ownerError || !ownerData) return { error: 'User does not own a club' }
    const clubId = ownerData.club_id

    // Verify player belongs to club
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id, club_id, market_value')
      .eq('id', playerId)
      .single()

    if (playerError || !player) return { error: 'Player not found' }
    if (player.club_id !== clubId) return { error: 'Player does not belong to your club' }

    // Get current contract
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('id, weekly_salary, contract_end')
      .eq('player_id', playerId)
      .eq('club_id', clubId)
      .order('contract_end', { ascending: false })
      .limit(1)
      .single()

    if (contractError || !contract) return { error: 'Contract not found' }

    const currentSalary = contract.weekly_salary
    const newSalary = Math.round(currentSalary * 1.15)
    const signingBonus = Math.round(currentSalary * 8)

    // Calculate new contract end (+2 years)
    const currentEnd = new Date(contract.contract_end)
    const newEnd = new Date(currentEnd)
    newEnd.setFullYear(newEnd.getFullYear() + 2)

    // Get club finances
    const { data: finances, error: financesError } = await supabase
      .from('finances')
      .select('cash_balance')
      .eq('club_id', clubId)
      .single()

    if (financesError || !finances) return { error: 'Could not fetch finances' }
    if (finances.cash_balance < signingBonus) return { error: 'Insufficient funds for signing bonus' }

    const adminClient = getServiceRoleClient()

    // Update contract
    const { error: updateContractError } = await adminClient
      .from('contracts')
      .update({
        weekly_salary: newSalary,
        contract_end: newEnd.toISOString().split('T')[0],
      })
      .eq('id', contract.id)

    if (updateContractError) return { error: 'Failed to update contract' }

    // Deduct signing bonus from finances
    const { error: updateFinancesError } = await adminClient
      .from('finances')
      .update({ cash_balance: finances.cash_balance - signingBonus })
      .eq('club_id', clubId)

    if (updateFinancesError) return { error: 'Failed to deduct signing bonus' }

    // Record financial transaction
    await adminClient
      .from('financial_transactions')
      .insert({
        club_id: clubId,
        amount: -signingBonus,
        description: `Bônus de assinatura - renovação de contrato`,
      })

    revalidatePath('/dashboard/squad')
    return {
      success: true,
      newSalary,
      newContractEnd: newEnd.toISOString().split('T')[0],
      signingBonus,
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unexpected error'
    console.error('renewContract error', error)
    return { error: msg }
  }
}

export async function changePosition(playerId: string, newPosition: string) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return { error: 'Unauthorized' }

    // Get user's club
    const { data: ownerData, error: ownerError } = await supabase
      .from('club_owners')
      .select('club_id')
      .eq('user_id', user.id)
      .single()

    if (ownerError || !ownerData) return { error: 'User does not own a club' }
    const clubId = ownerData.club_id

    // Verify player belongs to club
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id, club_id')
      .eq('id', playerId)
      .single()

    if (playerError || !player) return { error: 'Player not found' }
    if (player.club_id !== clubId) return { error: 'Player does not belong to your club' }

    const adminClient = getServiceRoleClient()

    const { error: updateError } = await adminClient
      .from('players')
      .update({ position: newPosition })
      .eq('id', playerId)

    if (updateError) return { error: 'Failed to update position' }

    revalidatePath('/dashboard/squad')
    return { success: true }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unexpected error'
    console.error('changePosition error', error)
    return { error: msg }
  }
}
