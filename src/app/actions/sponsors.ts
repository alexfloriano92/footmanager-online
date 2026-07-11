'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

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

export const SPONSORS = [
  { id: 'energybull', name: 'Energy Bull', logo: '⚡', category: 'Bebida Energética', upfront: 5000000, perWin: 200000, duration: '1 temporada' },
  { id: 'techcorp', name: 'TechCorp Global', logo: '💻', category: 'Tecnologia', upfront: 8000000, perWin: 0, duration: '2 temporadas' },
  { id: 'royalbank', name: 'Royal Bank FC', logo: '🏦', category: 'Financeiro', upfront: 3000000, perWin: 500000, duration: '1 temporada' },
  { id: 'sportswear', name: 'Sportswear Pro', logo: '👕', category: 'Vestuário', upfront: 12000000, perWin: 0, duration: '3 temporadas' },
  { id: 'globalbet', name: 'GlobalBet', logo: '🎲', category: 'Apostas', upfront: 6000000, perWin: 300000, duration: '1 temporada' },
] as const

export async function signSponsor(sponsorId: string) {
  try {
    // 1. Get user club id
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return { error: 'Unauthorized' }

    const { data: ownerData, error: ownerError } = await supabase
      .from('club_owners')
      .select('club_id')
      .eq('user_id', user.id)
      .single()

    if (ownerError || !ownerData) return { error: 'User does not own a club' }
    const clubId = ownerData.club_id

    // Find the sponsor details
    const sponsor = SPONSORS.find(s => s.id === sponsorId)
    if (!sponsor) return { error: 'Sponsor not found' }

    // Use service role client for all mutations
    const adminClient = getServiceRoleClient()

    // 2. Get current finances
    const { data: finances, error: finError } = await adminClient
      .from('finances')
      .select('cash_balance')
      .eq('club_id', clubId)
      .single()

    if (finError || !finances) return { error: 'Could not fetch finances' }

    const newBalance = finances.cash_balance + sponsor.upfront

    // 3. Add upfront payment to cash_balance
    const { error: updateError } = await adminClient
      .from('finances')
      .update({ cash_balance: newBalance })
      .eq('club_id', clubId)

    if (updateError) return { error: 'Failed to update finances' }

    // 4. Insert a financial_transactions record
    const { error: txError } = await adminClient
      .from('financial_transactions')
      .insert({
        club_id: clubId,
        type: 'income',
        category: 'sponsorship',
        amount: sponsor.upfront,
        description: `Contrato de patrocínio - ${sponsor.name}`,
        balance_after: newBalance,
      })

    if (txError) return { error: 'Failed to record transaction' }

    // 5. Insert into club_sponsors table
    const { error: sponsorError } = await adminClient
      .from('club_sponsors')
      .insert({
        club_id: clubId,
        sponsor_id: sponsor.id,
        sponsor_name: sponsor.name,
        upfront_paid: sponsor.upfront,
        per_win_bonus: sponsor.perWin,
      })

    if (sponsorError) return { error: 'Failed to record sponsor contract' }

    return { success: true, newBalance }
  } catch (error: unknown) {
    console.error('signSponsor error', error)
    const message = error instanceof Error ? error.message : 'An unexpected error occurred'
    return { error: message }
  }
}
