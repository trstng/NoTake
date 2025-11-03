'use server'

import { createClient } from '@/lib/supabase/server'

export async function debugPnLCalculations() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    // 1. Get all positions and sum P&L
    const { data: positions } = await supabase
      .from('positions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'closed')

    const positionsPnL = positions?.reduce((sum, p) => sum + (p.pnl || 0), 0) || 0
    const positionsCount = positions?.length || 0

    // 2. Get all daily stats
    const { data: dailyStats } = await supabase
      .from('daily_stats')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: true })

    const totalRealizedFromStats = dailyStats?.reduce((sum, s) => sum + (s.realized_pnl || 0), 0) || 0
    const statsCount = dailyStats?.length || 0

    // 3. Get final equity
    const finalEquity = dailyStats?.[dailyStats.length - 1]?.equity || 0
    const firstEquity = dailyStats?.[0]?.equity || 0

    // 4. Calculate what the equity change should be
    const equityChange = finalEquity - firstEquity

    // 5. Sample positions for inspection
    const samplePositions = positions?.slice(0, 5).map(p => ({
      market: p.market_ticker,
      direction: p.direction,
      entry_price: p.entry_price,
      exit_price: p.exit_price,
      size: p.size,
      pnl: p.pnl,
      fees: p.fees,
    })) || []

    // 6. Sample daily stats
    const sampleStats = dailyStats?.slice(0, 5).map(s => ({
      date: s.date,
      realized_pnl: s.realized_pnl,
      equity: s.equity,
      trade_count: s.trade_count,
    })) || []

    return {
      success: true,
      data: {
        positions: {
          count: positionsCount,
          totalPnL: Math.round(positionsPnL * 100) / 100,
          sample: samplePositions,
        },
        dailyStats: {
          count: statsCount,
          totalRealizedPnL: Math.round(totalRealizedFromStats * 100) / 100,
          firstEquity,
          finalEquity,
          equityChange: Math.round(equityChange * 100) / 100,
          sample: sampleStats,
        },
        discrepancy: {
          positionsVsStats: Math.round((positionsPnL - totalRealizedFromStats) * 100) / 100,
          positionsVsEquityChange: Math.round((positionsPnL - equityChange) * 100) / 100,
        },
      },
    }
  } catch (error) {
    console.error('Debug error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
