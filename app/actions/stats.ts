'use server'

import { createClient } from '@/lib/supabase/server'
import { Database } from '@/lib/database.types'

type DailyStatInsert = Database['public']['Tables']['daily_stats']['Insert']

interface DailyData {
  date: string
  trade_count: number
  total_volume: number
  realized_pnl: number
}

export async function updateDailyStats(userId: string, startingCapital = 10000) {
  try {
    const supabase = await createClient()

    // Fetch all trades sorted by date
    const { data: trades, error: tradesError } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: true })

    if (tradesError) throw tradesError
    if (!trades || trades.length === 0) {
      return { success: true, count: 0, message: 'No trades to aggregate' }
    }

    // Fetch all closed positions for realized P&L
    const { data: positions, error: positionsError } = await supabase
      .from('positions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'closed')

    if (positionsError) throw positionsError

    // Group trades by date
    const tradesByDate = new Map<string, typeof trades>()
    for (const trade of trades) {
      const date = new Date(trade.timestamp).toISOString().split('T')[0]
      if (!tradesByDate.has(date)) {
        tradesByDate.set(date, [])
      }
      tradesByDate.get(date)!.push(trade)
    }

    // Group positions by exit date for realized P&L
    const realizedPnLByDate = new Map<string, number>()
    if (positions) {
      for (const position of positions) {
        if (position.exit_time) {
          const exitDate = new Date(position.exit_time).toISOString().split('T')[0]
          const currentPnL = realizedPnLByDate.get(exitDate) || 0
          realizedPnLByDate.set(exitDate, currentPnL + (position.pnl || 0))
        }
      }
    }

    // Calculate daily stats
    const dailyStats: DailyStatInsert[] = []
    const dates = Array.from(tradesByDate.keys()).sort()

    let cumulativeEquity = startingCapital

    for (const date of dates) {
      const dayTrades = tradesByDate.get(date) || []

      // Calculate total volume for the day
      const totalVolume = dayTrades.reduce((sum, trade) => {
        return sum + (trade.amount_contracts * trade.price_cents) / 100
      }, 0)

      // Get realized P&L for this day
      const realizedPnL = realizedPnLByDate.get(date) || 0

      // Update cumulative equity
      cumulativeEquity += realizedPnL

      dailyStats.push({
        user_id: userId,
        date,
        trade_count: dayTrades.length,
        total_volume: Math.round(totalVolume * 100) / 100,
        realized_pnl: Math.round(realizedPnL * 100) / 100,
        unrealized_pnl: 0, // TODO: Calculate from open positions
        total_pnl: Math.round(realizedPnL * 100) / 100, // For now, just realized
        equity: Math.round(cumulativeEquity * 100) / 100,
      })
    }

    // Check for existing stats to avoid duplicates
    const { data: existingStats } = await supabase
      .from('daily_stats')
      .select('date')
      .eq('user_id', userId)

    const existingDates = new Set(existingStats?.map((s) => s.date) || [])

    // Filter out existing dates (we'll update them instead)
    const newStats = dailyStats.filter((stat) => !existingDates.has(stat.date))
    const updateStats = dailyStats.filter((stat) => existingDates.has(stat.date))

    let inserted = 0
    let updated = 0

    // Insert new stats in batches
    if (newStats.length > 0) {
      const batchSize = 100
      for (let i = 0; i < newStats.length; i += batchSize) {
        const batch = newStats.slice(i, i + batchSize)
        const { error } = await supabase.from('daily_stats').insert(batch)

        if (error) {
          console.error('Error inserting daily stats batch:', error)
          throw error
        }

        inserted += batch.length
      }
    }

    // Update existing stats
    for (const stat of updateStats) {
      const { error } = await supabase
        .from('daily_stats')
        .update({
          trade_count: stat.trade_count,
          total_volume: stat.total_volume,
          realized_pnl: stat.realized_pnl,
          unrealized_pnl: stat.unrealized_pnl,
          total_pnl: stat.total_pnl,
          equity: stat.equity,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('date', stat.date)

      if (error) {
        console.error('Error updating daily stat:', error)
      } else {
        updated += 1
      }
    }

    return {
      success: true,
      count: inserted,
      updated,
      message: `Aggregated ${dates.length} days of stats (${inserted} new, ${updated} updated)`,
    }
  } catch (error) {
    console.error('Error updating daily stats:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function getDailyStats(userId: string, startDate?: string, endDate?: string) {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('daily_stats')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: true })

    if (startDate) {
      query = query.gte('date', startDate)
    }

    if (endDate) {
      query = query.lte('date', endDate)
    }

    const { data, error } = await query

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error fetching daily stats:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
