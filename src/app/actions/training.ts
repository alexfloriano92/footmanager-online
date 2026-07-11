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

export async function startTraining(playerId: string, focusAttribute: string, durationHours: number) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return { error: 'Unauthorized' }

    // Check club ownership
    const { data: ownerData, error: ownerError } = await supabase
      .from('club_owners')
      .select('club_id')
      .eq('user_id', user.id)
      .single()

    if (ownerError || !ownerData) return { error: 'User does not own a club' }

    // Verify player belongs to club
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('club_id')
      .eq('id', playerId)
      .single()

    if (playerError || !player) return { error: 'Player not found' }
    if (player.club_id !== ownerData.club_id) return { error: 'Player does not belong to your club' }

    // Check if player already training
    const { data: existingSession, error: existingError } = await supabase
      .from('training_sessions')
      .select('id')
      .eq('player_id', playerId)
      .eq('status', 'active')
      .maybeSingle()
    
    if (existingSession) return { error: 'Player is already training' }

    const endTime = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString()

    const { error: insertError } = await supabase
      .from('training_sessions')
      .insert({
        club_id: ownerData.club_id,
        player_id: playerId,
        focus_attribute: focusAttribute,
        status: 'active',
        start_time: new Date().toISOString(),
        end_time: endTime
      })

    if (insertError) return { error: 'Failed to start training session' }

    revalidatePath('/dashboard/training')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Unexpected error' }
  }
}

export async function claimTraining(sessionId: string) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return { error: 'Unauthorized' }

    // Fetch session
    const { data: session, error: sessionError } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) return { error: 'Session not found' }
    if (session.status !== 'active') return { error: 'Session is not active' }

    if (new Date(session.end_time).getTime() > Date.now()) {
      return { error: 'Training session is not completed yet' }
    }

    // Verify ownership
    const { data: ownerData, error: ownerError } = await supabase
      .from('club_owners')
      .select('club_id')
      .eq('user_id', user.id)
      .single()

    if (ownerError || !ownerData || ownerData.club_id !== session.club_id) {
      return { error: 'Unauthorized to claim this session' }
    }

    // Fetch player
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('*')
      .eq('id', session.player_id)
      .single()

    if (playerError || !player) return { error: 'Player not found' }

    // Calculate XP
    let xpGained = 1;
    const isYoung = player.age && player.age < 23;
    const isOld = player.age && player.age > 30;

    const rand = Math.random();
    if (isYoung) {
      if (rand < 0.2) xpGained = 1;
      else if (rand < 0.6) xpGained = 2;
      else xpGained = 3;
    } else if (isOld) {
      if (rand < 0.8) xpGained = 1;
      else xpGained = 2;
    } else {
      if (rand < 0.4) xpGained = 1;
      else if (rand < 0.8) xpGained = 2;
      else xpGained = 3;
    }

    const attributeName = session.focus_attribute.toLowerCase();
    const validAttributes = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical'];
    if (!validAttributes.includes(attributeName)) return { error: 'Invalid focus attribute' }

    let currentVal = player[attributeName] || 50;
    let newVal = Math.min(99, currentVal + xpGained);

    const actualXpGained = newVal - currentVal;

    const pace = attributeName === 'pace' ? newVal : player.pace;
    const shooting = attributeName === 'shooting' ? newVal : player.shooting;
    const passing = attributeName === 'passing' ? newVal : player.passing;
    const dribbling = attributeName === 'dribbling' ? newVal : player.dribbling;
    const defending = attributeName === 'defending' ? newVal : player.defending;
    const physical = attributeName === 'physical' ? newVal : player.physical;

    const overall = Math.round((pace + shooting + passing + dribbling + defending + physical) / 6);

    const adminClient = getServiceRoleClient();

    const { error: updatePlayerError } = await adminClient
      .from('players')
      .update({
        [attributeName]: newVal,
        overall: overall
      })
      .eq('id', player.id);

    if (updatePlayerError) return { error: 'Failed to update player stats' }

    const { error: updateSessionError } = await adminClient
      .from('training_sessions')
      .update({
        status: 'completed',
        xp_gained: actualXpGained
      })
      .eq('id', sessionId);

    if (updateSessionError) return { error: 'Failed to update session' }

    revalidatePath('/dashboard/training')
    return { success: true, xpGained: actualXpGained }
  } catch (error: any) {
    return { error: error.message || 'Unexpected error' }
  }
}
