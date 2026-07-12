'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const REWARD_AMOUNTS = [
  2000000, // Day 1
  3000000, // Day 2
  4000000, // Day 3
  5000000, // Day 4
  6000000, // Day 5
  8000000, // Day 6
  15000000 // Day 7
];

function generateYouthPlayer(clubId: string) {
  const positions = ['CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST', 'GK'];
  const firstNames = ['João', 'Pedro', 'Lucas', 'Mateus', 'Gabriel', 'Enzo', 'Miguel', 'Arthur', 'Davi', 'Bernardo'];
  const lastNames = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes'];
  
  const name = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
  const pos = positions[Math.floor(Math.random() * positions.length)];
  
  const baseOvr = 55 + Math.floor(Math.random() * 10); // 55-64
  
  return {
    name,
    nationality: 'Brasil',
    birth_date: new Date(new Date().setFullYear(new Date().getFullYear() - 16)).toISOString().split('T')[0],
    position: pos,
    overall: baseOvr,
    potential: baseOvr + 15 + Math.floor(Math.random() * 10), // 70-89
    pace: baseOvr,
    shooting: baseOvr,
    passing: baseOvr,
    dribbling: baseOvr,
    defending: baseOvr,
    physical: baseOvr,
    market_value: 500000,
    club_id: clubId,
    status: 'active'
  }
}

export async function claimDailyBonus() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // Use service role for admin tasks
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Get coach info
    const { data: coach } = await serviceClient
      .from('coaches')
      .select('id, login_streak, last_login_bonus, club_owners(club_id)')
      .eq('user_id', user.id)
      .single()

    if (!coach) return { error: 'Coach not found' }
    
    const clubId = coach.club_owners?.[0]?.club_id;
    if (!clubId) return { error: 'Club not found' }

    const now = new Date()
    let currentStreak = coach.login_streak || 0
    let lastBonus = coach.last_login_bonus ? new Date(coach.last_login_bonus) : null

    if (lastBonus) {
      const hoursSinceLast = (now.getTime() - lastBonus.getTime()) / (1000 * 60 * 60)
      
      if (hoursSinceLast < 20) {
        return { error: 'Bônus ainda não está disponível.' }
      }
      
      // se passou mais de 48h, quebrou a ofensiva
      if (hoursSinceLast > 48) {
        currentStreak = 0;
      }
    }

    // Increment streak
    let newStreak = currentStreak + 1;
    let isDay7 = false;
    
    if (newStreak > 7) {
      newStreak = 1; // reset after full week completion
    }
    
    if (newStreak === 7) {
      isDay7 = true;
    }

    const rewardCash = REWARD_AMOUNTS[newStreak - 1];

    // 2. Give Rewards
    // Add cash
    const { data: financeData } = await serviceClient
      .from('finances')
      .select('cash_balance')
      .eq('club_id', clubId)
      .single()

    if (financeData) {
      await serviceClient
        .from('finances')
        .update({ cash_balance: financeData.cash_balance + rewardCash })
        .eq('club_id', clubId)
        
      // Record transaction
      await serviceClient
        .from('financial_transactions')
        .insert({
          club_id: clubId,
          type: 'income',
          category: 'sponsorship', // using sponsorship category as generic income
          amount: rewardCash,
          description: `Bônus de Login Diário (Dia ${newStreak})`,
          balance_after: financeData.cash_balance + rewardCash
        })
    }

    // Generate youth player on day 7
    let youthPlayerName = null;
    if (isDay7) {
      const newPlayer = generateYouthPlayer(clubId);
      const { data: insertedPlayer, error: pError } = await serviceClient
        .from('players')
        .insert(newPlayer)
        .select()
        .single();
        
      if (!pError && insertedPlayer) {
        youthPlayerName = newPlayer.name;
        // add contract
        await serviceClient
          .from('contracts')
          .insert({
            player_id: insertedPlayer.id,
            club_id: clubId,
            weekly_salary: 1500,
            contract_start: now.toISOString().split('T')[0],
            contract_end: new Date(now.setFullYear(now.getFullYear() + 3)).toISOString().split('T')[0]
          })
      }
    }

    // 3. Update coach state
    await serviceClient
      .from('coaches')
      .update({ 
        login_streak: newStreak,
        last_login_bonus: new Date().toISOString()
      })
      .eq('id', coach.id)

    return { 
      success: true, 
      rewardCash, 
      streak: newStreak,
      youthPlayerGenerated: youthPlayerName 
    }

  } catch (error: any) {
    console.error('Daily bonus error', error)
    return { error: error.message }
  }
}
