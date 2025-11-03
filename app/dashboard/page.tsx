import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getDashboardData } from '@/app/actions/dashboard'
import { PLCurveChart } from '@/components/dashboard/pl-curve-chart'
import { TradingCalendar } from '@/components/dashboard/trading-calendar'
import { ClosedPositionsTable } from '@/components/dashboard/closed-positions-table'
import { AnalyticsGrid } from '@/components/dashboard/analytics-grid'
import { DollarSign, TrendingUp, TrendingDown, Activity } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardPage() {
  const { data, error } = await getDashboardData()

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="text-center py-12">
            <p className="text-destructive mb-4">{error || 'Failed to load dashboard data'}</p>
            <Link href="/dashboard">
              <Button>Try Again</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const { performance, dailyStats, recentPositions, activePositionsCount } = data

  const hasData = performance.totalTrades > 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard Overview</h1>
          <p className="text-muted-foreground">Track your prediction market performance</p>
        </div>

        {!hasData ? (
          <div className="text-center py-12">
            <Card className="max-w-2xl mx-auto">
              <CardContent className="pt-6">
                <p className="text-muted-foreground mb-4">No trading data yet</p>
                <p className="text-sm text-muted-foreground mb-6">
                  Import your first trades to see your performance metrics
                </p>
                <Link href="/dashboard">
                  <Button>Import Trades</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card className="p-6 bg-card/80 backdrop-blur-sm border-border/50 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-medium)] transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Total P/L</span>
                  <DollarSign className="w-4 h-4 text-primary" />
                </div>
                <p
                  className={`text-3xl font-bold ${
                    performance.totalPnL >= 0 ? 'text-success' : 'text-destructive'
                  }`}
                >
                  ${performance.totalPnL >= 0 ? '+' : ''}
                  {performance.totalPnL.toFixed(2)}
                </p>
                <div className="flex items-center mt-2 text-xs text-muted-foreground">
                  <TrendingUp
                    className={`w-3 h-3 mr-1 ${
                      performance.totalPnL >= 0 ? 'text-success' : 'text-destructive'
                    }`}
                  />
                  <span>All-time performance</span>
                </div>
              </Card>

              <Card className="p-6 bg-card/80 backdrop-blur-sm border-border/50 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-medium)] transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Win Rate</span>
                  <Activity className="w-4 h-4 text-primary" />
                </div>
                <p className="text-3xl font-bold text-foreground">{performance.winRate}%</p>
                <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${performance.winRate}%` }}
                  />
                </div>
              </Card>

              <Card className="p-6 bg-card/80 backdrop-blur-sm border-border/50 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-medium)] transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Avg Win</span>
                  <TrendingUp className="w-4 h-4 text-success" />
                </div>
                <p className="text-3xl font-bold text-success">
                  +${performance.avgWin.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-2">Per winning trade</p>
              </Card>

              <Card className="p-6 bg-card/80 backdrop-blur-sm border-border/50 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-medium)] transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Avg Loss</span>
                  <TrendingDown className="w-4 h-4 text-destructive" />
                </div>
                <p className="text-3xl font-bold text-destructive">
                  ${performance.avgLoss.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-2">Per losing trade</p>
              </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* P/L Curve */}
              <div className="lg:col-span-2">
                <Card className="p-6 bg-card/80 backdrop-blur-sm border-border/50 shadow-[var(--shadow-soft)]">
                  <h2 className="text-xl font-semibold mb-4 text-foreground">Profit/Loss Curve</h2>
                  <PLCurveChart dailyStats={dailyStats} />
                </Card>
              </div>

              {/* Trading Calendar */}
              <div className="lg:col-span-1">
                <TradingCalendar dailyStats={dailyStats} />
              </div>
            </div>

            {/* Analytics Grid */}
            <AnalyticsGrid />

            {/* Recent Closed Positions */}
            <div className="mt-6">
              <ClosedPositionsTable positions={recentPositions} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
