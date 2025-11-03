import { Database } from '@/lib/database.types'

type Position = Database['public']['Tables']['positions']['Row']
type DailyStat = Database['public']['Tables']['daily_stats']['Row']

export interface PerformanceMetrics {
  totalTrades: number
  totalPnL: number
  winRate: number
  avgWin: number
  avgLoss: number
  profitFactor: number
  largestWin: number
  largestLoss: number
  consecutiveWins: number
  consecutiveLosses: number
}

export interface MarketPerformance {
  market_ticker: string
  totalTrades: number
  winCount: number
  lossCount: number
  winRate: number
  totalPnL: number
  avgPnL: number
  largestWin: number
  largestLoss: number
}

export interface DrawdownMetrics {
  maxDrawdown: number
  maxDrawdownPercent: number
  currentDrawdown: number
  currentDrawdownPercent: number
  peakEquity: number
  recoveryDays: number | null
  avgDrawdown: number
  drawdownPeriods: Array<{
    start: string
    end: string | null
    amount: number
    percent: number
    recovered: boolean
  }>
}

/**
 * Calculate overall performance metrics from closed positions
 */
export function calculatePerformanceMetrics(positions: Position[]): PerformanceMetrics {
  if (positions.length === 0) {
    return {
      totalTrades: 0,
      totalPnL: 0,
      winRate: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
      largestWin: 0,
      largestLoss: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
    }
  }

  const totalPnL = positions.reduce((sum, p) => sum + (p.pnl || 0), 0)
  const winners = positions.filter((p) => (p.pnl || 0) > 0)
  const losers = positions.filter((p) => (p.pnl || 0) < 0)

  const totalWins = winners.reduce((sum, p) => sum + (p.pnl || 0), 0)
  const totalLosses = Math.abs(losers.reduce((sum, p) => sum + (p.pnl || 0), 0))

  const avgWin = winners.length > 0 ? totalWins / winners.length : 0
  const avgLoss = losers.length > 0 ? totalLosses / losers.length : 0
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0

  const largestWin = winners.length > 0 ? Math.max(...winners.map((p) => p.pnl || 0)) : 0
  const largestLoss = losers.length > 0 ? Math.min(...losers.map((p) => p.pnl || 0)) : 0

  // Calculate consecutive wins/losses
  let maxConsecutiveWins = 0
  let maxConsecutiveLosses = 0
  let currentWinStreak = 0
  let currentLossStreak = 0

  // Sort by exit time to get chronological order
  const sortedPositions = [...positions].sort((a, b) => (a.exit_time || 0) - (b.exit_time || 0))

  for (const position of sortedPositions) {
    const pnl = position.pnl || 0
    if (pnl > 0) {
      currentWinStreak += 1
      currentLossStreak = 0
      maxConsecutiveWins = Math.max(maxConsecutiveWins, currentWinStreak)
    } else if (pnl < 0) {
      currentLossStreak += 1
      currentWinStreak = 0
      maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentLossStreak)
    }
  }

  return {
    totalTrades: positions.length,
    totalPnL: Math.round(totalPnL * 100) / 100,
    winRate: Math.round((winners.length / positions.length) * 10000) / 100,
    avgWin: Math.round(avgWin * 100) / 100,
    avgLoss: Math.round(avgLoss * 100) / 100,
    profitFactor: Math.round(profitFactor * 100) / 100,
    largestWin: Math.round(largestWin * 100) / 100,
    largestLoss: Math.round(largestLoss * 100) / 100,
    consecutiveWins: maxConsecutiveWins,
    consecutiveLosses: maxConsecutiveLosses,
  }
}

/**
 * Calculate performance metrics grouped by market
 */
export function calculateMarketPerformance(positions: Position[]): MarketPerformance[] {
  const marketMap = new Map<string, Position[]>()

  for (const position of positions) {
    const ticker = position.market_ticker
    if (!marketMap.has(ticker)) {
      marketMap.set(ticker, [])
    }
    marketMap.get(ticker)!.push(position)
  }

  const results: MarketPerformance[] = []

  for (const [ticker, marketPositions] of marketMap.entries()) {
    const totalPnL = marketPositions.reduce((sum, p) => sum + (p.pnl || 0), 0)
    const winners = marketPositions.filter((p) => (p.pnl || 0) > 0)
    const losers = marketPositions.filter((p) => (p.pnl || 0) < 0)
    const largestWin = winners.length > 0 ? Math.max(...winners.map((p) => p.pnl || 0)) : 0
    const largestLoss = losers.length > 0 ? Math.min(...losers.map((p) => p.pnl || 0)) : 0

    results.push({
      market_ticker: ticker,
      totalTrades: marketPositions.length,
      winCount: winners.length,
      lossCount: losers.length,
      winRate: Math.round((winners.length / marketPositions.length) * 10000) / 100,
      totalPnL: Math.round(totalPnL * 100) / 100,
      avgPnL: Math.round((totalPnL / marketPositions.length) * 100) / 100,
      largestWin: Math.round(largestWin * 100) / 100,
      largestLoss: Math.round(largestLoss * 100) / 100,
    })
  }

  // Sort by total P&L descending
  return results.sort((a, b) => b.totalPnL - a.totalPnL)
}

/**
 * Calculate drawdown metrics from daily equity data
 */
export function calculateDrawdown(dailyStats: DailyStat[]): DrawdownMetrics {
  if (dailyStats.length === 0) {
    return {
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
      currentDrawdown: 0,
      currentDrawdownPercent: 0,
      peakEquity: 0,
      recoveryDays: null,
      avgDrawdown: 0,
      drawdownPeriods: [],
    }
  }

  // Sort by date
  const sorted = [...dailyStats].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  let peakEquity = sorted[0].equity
  let maxDrawdown = 0
  let maxDrawdownPercent = 0
  const drawdownPeriods: DrawdownMetrics['drawdownPeriods'] = []
  let currentDrawdownStart: string | null = null
  let currentDrawdownPeak = peakEquity

  for (const stat of sorted) {
    const equity = stat.equity

    // Update peak
    if (equity > peakEquity) {
      peakEquity = equity

      // End current drawdown period if any
      if (currentDrawdownStart) {
        drawdownPeriods[drawdownPeriods.length - 1].end = stat.date
        drawdownPeriods[drawdownPeriods.length - 1].recovered = true
        currentDrawdownStart = null
      }
    }

    // Calculate current drawdown
    const drawdown = peakEquity - equity
    const drawdownPercent = peakEquity > 0 ? (drawdown / peakEquity) * 100 : 0

    // Track max drawdown
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown
      maxDrawdownPercent = drawdownPercent
    }

    // Start new drawdown period if needed
    if (drawdown > 0 && !currentDrawdownStart) {
      currentDrawdownStart = stat.date
      currentDrawdownPeak = peakEquity
      drawdownPeriods.push({
        start: stat.date,
        end: null,
        amount: drawdown,
        percent: drawdownPercent,
        recovered: false,
      })
    }

    // Update current drawdown period
    if (currentDrawdownStart && drawdownPeriods.length > 0) {
      const lastPeriod = drawdownPeriods[drawdownPeriods.length - 1]
      lastPeriod.amount = Math.max(lastPeriod.amount, drawdown)
      lastPeriod.percent = Math.max(lastPeriod.percent, drawdownPercent)
    }
  }

  const lastStat = sorted[sorted.length - 1]
  const currentEquity = lastStat.equity
  const currentDrawdown = peakEquity - currentEquity
  const currentDrawdownPercent = peakEquity > 0 ? (currentDrawdown / peakEquity) * 100 : 0

  // Calculate recovery days for max drawdown
  let recoveryDays: number | null = null
  const maxDDPeriod = drawdownPeriods.find((p) => p.amount === maxDrawdown)
  if (maxDDPeriod && maxDDPeriod.end) {
    const start = new Date(maxDDPeriod.start)
    const end = new Date(maxDDPeriod.end)
    recoveryDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  }

  // Calculate average drawdown
  const avgDrawdown =
    drawdownPeriods.length > 0
      ? drawdownPeriods.reduce((sum, p) => sum + p.amount, 0) / drawdownPeriods.length
      : 0

  return {
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    maxDrawdownPercent: Math.round(maxDrawdownPercent * 100) / 100,
    currentDrawdown: Math.round(currentDrawdown * 100) / 100,
    currentDrawdownPercent: Math.round(currentDrawdownPercent * 100) / 100,
    peakEquity: Math.round(peakEquity * 100) / 100,
    recoveryDays,
    avgDrawdown: Math.round(avgDrawdown * 100) / 100,
    drawdownPeriods,
  }
}

/**
 * Calculate monthly returns from daily stats
 */
export function calculateMonthlyReturns(dailyStats: DailyStat[]): Map<string, number> {
  const monthlyReturns = new Map<string, number>()

  // Sort by date
  const sorted = [...dailyStats].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  for (const stat of sorted) {
    const date = new Date(stat.date)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

    const currentReturn = monthlyReturns.get(monthKey) || 0
    monthlyReturns.set(monthKey, currentReturn + stat.realized_pnl)
  }

  return monthlyReturns
}

/**
 * Calculate average hold time for closed positions
 * Returns object with hours and formatted string
 */
export function calculateAverageHoldTime(positions: Position[]): {
  hours: number
  days: number
  formatted: string
} {
  if (positions.length === 0) {
    return {
      hours: 0,
      days: 0,
      formatted: '0 hours',
    }
  }

  const holdTimes = positions
    .filter((p) => p.entry_time && p.exit_time)
    .map((p) => p.exit_time! - p.entry_time!)

  if (holdTimes.length === 0) {
    return {
      hours: 0,
      days: 0,
      formatted: '0 hours',
    }
  }

  const avgMilliseconds = holdTimes.reduce((sum, time) => sum + time, 0) / holdTimes.length
  const avgHours = avgMilliseconds / (1000 * 60 * 60)
  const avgDays = avgHours / 24

  // Format as human-readable string
  let formatted: string
  if (avgDays >= 1) {
    formatted = `${avgDays.toFixed(1)} day${avgDays >= 2 ? 's' : ''}`
  } else if (avgHours >= 1) {
    formatted = `${avgHours.toFixed(1)} hour${avgHours >= 2 ? 's' : ''}`
  } else {
    const avgMinutes = avgMilliseconds / (1000 * 60)
    formatted = `${avgMinutes.toFixed(0)} minute${avgMinutes >= 2 ? 's' : ''}`
  }

  return {
    hours: Math.round(avgHours * 100) / 100,
    days: Math.round(avgDays * 100) / 100,
    formatted,
  }
}
