'use server'

import { createClient } from '@/lib/supabase/server'
import { calculatePositions } from './positions'
import { updateDailyStats } from './stats'

export async function recalculateAll() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Delete existing positions and daily stats
    await supabase.from('positions').delete().eq('user_id', user.id)
    await supabase.from('daily_stats').delete().eq('user_id', user.id)

    // Recalculate positions from trades
    const positionResult = await calculatePositions(user.id)

    if (!positionResult.success) {
      return positionResult
    }

    // Recalculate daily stats with $0 starting capital
    const statsResult = await updateDailyStats(user.id, 0)

    return {
      success: true,
      message: `Recalculated ${positionResult.count} positions and ${statsResult.count} days of stats`,
      positionResult,
      statsResult,
    }
  } catch (error) {
    console.error('Recalculate error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
