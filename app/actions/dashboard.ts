'use server'

import { createClient } from '@/lib/supabase/server'
import {
  calculatePerformanceMetrics,
  calculateDrawdown,
  calculateAverageHoldTime,
} from '@/lib/analytics/performance'
import { Database } from '@/lib/database.types'

type Position = Database['public']['Tables']['positions']['Row']
type DailyStat = Database['public']['Tables']['daily_stats']['Row']

export interface DashboardData {
  performance: ReturnType<typeof calculatePerformanceMetrics>
  drawdown: ReturnType<typeof calculateDrawdown>
  avgHoldTime: ReturnType<typeof calculateAverageHoldTime>
  dailyStats: DailyStat[]
  recentPositions: Position[]
  allPositions: Position[]
  activePositionsCount: number
}

export async function getDashboardData(): Promise<{ data: DashboardData | null; error: string | null }> {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { data: null, error: 'Not authenticated' }
  }

  try {
    // Fetch all closed positions
    const { data: closedPositions, error: positionsError } = await supabase
      .from('positions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'closed')
      .order('exit_time', { ascending: false })

    if (positionsError) {
      console.error('Error fetching positions:', positionsError)
      return { data: null, error: 'Failed to fetch positions' }
    }

    // Fetch daily stats
    const { data: dailyStats, error: statsError } = await supabase
      .from('daily_stats')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: true })

    if (statsError) {
      console.error('Error fetching daily stats:', statsError)
      return { data: null, error: 'Failed to fetch daily stats' }
    }

    // Count active positions
    const { count: activeCount, error: activeError } = await supabase
      .from('positions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (activeError) {
      console.error('Error fetching active positions:', activeError)
    }

    // Calculate metrics
    const performance = calculatePerformanceMetrics(closedPositions || [])
    const drawdown = calculateDrawdown(dailyStats || [])
    const avgHoldTime = calculateAverageHoldTime(closedPositions || [])

    // Get recent 10 closed positions
    const recentPositions = (closedPositions || []).slice(0, 10)

    return {
      data: {
        performance,
        drawdown,
        avgHoldTime,
        dailyStats: dailyStats || [],
        recentPositions,
        allPositions: closedPositions || [],
        activePositionsCount: activeCount || 0,
      },
      error: null,
    }
  } catch (error) {
    console.error('Error in getDashboardData:', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}
