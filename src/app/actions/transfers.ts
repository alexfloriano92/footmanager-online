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

export async function createOffer(targetPlayerId: string, offeredCash: number, offeredPlayerIds: string[] = []) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return { error: 'Unauthorized' }

    // Get user's club
    const { data: ownerData, error: ownerError } = await supabase
      .from('club_owners')
      .select('club_id')
      .eq('user_id', user.id)
      .single()

    if (ownerError || !ownerData) return { error: 'User does not own a club' }
    const fromClubId = ownerData.club_id

    // Get target player
    const { data: targetPlayer, error: playerError } = await supabase
      .from('players')
      .select('club_id, market_value')
      .eq('id', targetPlayerId)
      .single()

    if (playerError || !targetPlayer) return { error: 'Target player not found' }
    const toClubId = targetPlayer.club_id

    if (fromClubId === toClubId) return { error: 'Cannot buy your own player' }

    // Check finances
    const { data: finances, error: financesError } = await supabase
      .from('finances')
      .select('cash_balance')
      .eq('club_id', fromClubId)
      .single()

    if (financesError || !finances) return { error: 'Could not fetch finances' }
    if (finances.cash_balance < offeredCash) return { error: 'Insufficient funds' }

    // Insert offer
    const { data: newOffer, error: offerError } = await supabase
      .from('transfer_offers')
      .insert({
        from_club_id: fromClubId,
        to_club_id: toClubId,
        target_player_id: targetPlayerId,
        offered_cash: offeredCash,
        offered_player_ids: offeredPlayerIds,
        status: 'pending'
      })
      .select('id')
      .single()

    if (offerError || !newOffer) return { error: 'Failed to create offer' }

    const offerId = newOffer.id

    // AI Logic
    const { data: toClubOwners, error: toClubOwnersError } = await supabase
      .from('club_owners')
      .select('user_id')
      .eq('club_id', toClubId)

    if (toClubOwnersError) return { error: 'Failed to check target club ownership' }

    if (toClubOwners.length === 0) {
      // AI Club
      let totalValue = offeredCash

      if (offeredPlayerIds.length > 0) {
        const { data: offeredPlayers, error: opError } = await supabase
          .from('players')
          .select('market_value')
          .in('id', offeredPlayerIds)
        
        if (!opError && offeredPlayers) {
          totalValue += offeredPlayers.reduce((sum, p) => sum + (p.market_value || 0), 0)
        }
      }

      if (totalValue >= targetPlayer.market_value * 1.2) {
        // AI Accepts
        await acceptOffer(offerId)
      } else {
        // AI Rejects
        await rejectOffer(offerId)
      }
    }

    return { success: true }
  } catch (error: any) {
    console.error('createOffer error', error)
    return { error: error.message || 'An unexpected error occurred' }
  }
}

export async function acceptOffer(offerId: string) {
  try {
    const supabase = getServiceRoleClient()

    // Fetch offer
    const { data: offer, error: offerError } = await supabase
      .from('transfer_offers')
      .select('*')
      .eq('id', offerId)
      .single()

    if (offerError || !offer) return { error: 'Offer not found' }
    if (offer.status !== 'pending') return { error: 'Offer is not pending' }

    // Fetch from_club finances
    const { data: buyerFinances, error: buyerFinancesError } = await supabase
      .from('finances')
      .select('cash_balance')
      .eq('club_id', offer.from_club_id)
      .single()

    if (buyerFinancesError || !buyerFinances) return { error: 'Failed to fetch buyer finances' }
    if (buyerFinances.cash_balance < offer.offered_cash) return { error: 'Buyer has insufficient funds' }

    // Fetch to_club finances
    const { data: sellerFinances, error: sellerFinancesError } = await supabase
      .from('finances')
      .select('cash_balance')
      .eq('club_id', offer.to_club_id)
      .single()

    if (sellerFinancesError || !sellerFinances) return { error: 'Failed to fetch seller finances' }

    // Process transaction
    // 1. Deduct cash from buyer
    const { error: deductError } = await supabase
      .from('finances')
      .update({ cash_balance: buyerFinances.cash_balance - offer.offered_cash })
      .eq('club_id', offer.from_club_id)

    if (deductError) return { error: 'Failed to deduct funds' }

    // 2. Add cash to seller
    const { error: addError } = await supabase
      .from('finances')
      .update({ cash_balance: sellerFinances.cash_balance + offer.offered_cash })
      .eq('club_id', offer.to_club_id)

    if (addError) return { error: 'Failed to add funds' }

    // 3. Update target player club
    const { error: targetPlayerUpdateError } = await supabase
      .from('players')
      .update({ club_id: offer.from_club_id })
      .eq('id', offer.target_player_id)

    if (targetPlayerUpdateError) return { error: 'Failed to transfer target player' }

    // 4. Update offered players clubs
    if (offer.offered_player_ids && offer.offered_player_ids.length > 0) {
      const { error: offeredPlayersUpdateError } = await supabase
        .from('players')
        .update({ club_id: offer.to_club_id })
        .in('id', offer.offered_player_ids)
      
      if (offeredPlayersUpdateError) return { error: 'Failed to transfer offered players' }
    }

    // 5. Insert financial transactions
    if (offer.offered_cash > 0) {
      const { error: insertTxError } = await supabase
        .from('financial_transactions')
        .insert([
          { club_id: offer.from_club_id, amount: -offer.offered_cash, description: 'Player transfer fee (expense)' },
          { club_id: offer.to_club_id, amount: offer.offered_cash, description: 'Player transfer fee (income)' }
        ])
      if (insertTxError) return { error: 'Failed to record financial transactions' }
    }

    // 6. Update offer status
    const { error: statusError } = await supabase
      .from('transfer_offers')
      .update({ status: 'accepted' })
      .eq('id', offerId)

    if (statusError) return { error: 'Failed to update offer status' }

    return { success: true }
  } catch (error: any) {
    console.error('acceptOffer error', error)
    return { error: error.message || 'An unexpected error occurred' }
  }
}

export async function rejectOffer(offerId: string) {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('transfer_offers')
      .update({ status: 'rejected' })
      .eq('id', offerId)

    if (error) return { error: 'Failed to reject offer' }

    return { success: true }
  } catch (error: any) {
    console.error('rejectOffer error', error)
    return { error: error.message || 'An unexpected error occurred' }
  }
}
