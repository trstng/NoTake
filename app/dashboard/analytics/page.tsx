import { createClient } from '@/lib/supabase/server'
import { EquityCurveChart } from '@/components/analytics/equity-curve-chart'
import { PerformanceSummary } from '@/components/analytics/performance-summary'
import { MarketPerformanceTable } from '@/components/analytics/market-performance-table'
import { DrawdownChart } from '@/components/analytics/drawdown-chart'
import { MonthlyReturnsHeatmap } from '@/components/analytics/monthly-returns-heatmap'
import {
  calculatePerformanceMetrics,
  calculateMarketPerformance,
  calculateDrawdown,
  calculateMonthlyReturns,
} from '@/lib/analytics/performance'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch closed positions for performance metrics
  const { data: positions } = await supabase
    .from('positions')
    .select('*')
    .eq('user_id', user?.id)
    .eq('status', 'closed')
    .order('exit_time', { ascending: true })

  // Fetch daily stats for equity curve and drawdown
  const { data: dailyStats } = await supabase
    .from('daily_stats')
    .select('*')
    .eq('user_id', user?.id)
    .order('date', { ascending: true })

  // Calculate metrics
  const performanceMetrics = calculatePerformanceMetrics(positions || [])
  const marketPerformance = calculateMarketPerformance(positions || [])
  const drawdownMetrics = calculateDrawdown(dailyStats || [])
  const monthlyReturns = calculateMonthlyReturns(dailyStats || [])

  const hasData = positions && positions.length > 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Analytics
        </h1>
        <p className="text-muted-foreground mt-1">
          Deep dive into your trading performance
        </p>
      </div>

      {!hasData ? (
        <div className="py-12 text-center border-2 border-dashed border-primary/20 rounded-lg">
          <p className="text-muted-foreground mb-2">No analytics data yet</p>
          <p className="text-sm text-muted-foreground">
            Import trades to see your performance analytics
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Performance Summary Cards */}
          <PerformanceSummary metrics={performanceMetrics} />

          {/* Equity Curve */}
          <EquityCurveChart dailyStats={dailyStats || []} />

          {/* Drawdown Analysis */}
          <DrawdownChart dailyStats={dailyStats || []} metrics={drawdownMetrics} />

          {/* Monthly Returns Heatmap */}
          <MonthlyReturnsHeatmap monthlyReturns={monthlyReturns} />

          {/* Market Performance Table */}
          <MarketPerformanceTable markets={marketPerformance} />
        </div>
      )}
    </div>
  )
}
