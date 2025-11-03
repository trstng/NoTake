'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PerformanceMetrics } from '@/lib/analytics/performance'
import { TrendingUp, TrendingDown, Target, Award, Zap } from 'lucide-react'

interface PerformanceSummaryProps {
  metrics: PerformanceMetrics
}

export function PerformanceSummary({ metrics }: PerformanceSummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total P&L */}
      <Card className="border-primary/30">
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            {metrics.totalPnL >= 0 ? (
              <TrendingUp className="h-4 w-4 text-success" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
            Total P&L
          </CardDescription>
          <CardTitle
            className={`text-2xl ${metrics.totalPnL >= 0 ? 'text-success' : 'text-destructive'}`}
          >
            {metrics.totalPnL >= 0 ? '+' : ''}${metrics.totalPnL.toFixed(2)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            {metrics.totalTrades} closed position{metrics.totalTrades !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      {/* Win Rate */}
      <Card className="border-primary/30">
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Win Rate
          </CardDescription>
          <CardTitle className="text-2xl">{metrics.winRate.toFixed(1)}%</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Avg Win: ${metrics.avgWin.toFixed(2)} | Avg Loss: ${metrics.avgLoss.toFixed(2)}
          </p>
        </CardContent>
      </Card>

      {/* Profit Factor */}
      <Card className="border-primary/30">
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-accent" />
            Profit Factor
          </CardDescription>
          <CardTitle className="text-2xl">
            {metrics.profitFactor === Infinity ? '∞' : metrics.profitFactor.toFixed(2)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Total Wins / Total Losses
          </p>
        </CardContent>
      </Card>

      {/* Best/Worst */}
      <Card className="border-primary/30">
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <Award className="h-4 w-4 text-success" />
            Best / Worst
          </CardDescription>
          <CardTitle className="text-2xl text-success">
            +${metrics.largestWin.toFixed(2)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-destructive">
            ${metrics.largestLoss.toFixed(2)}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
