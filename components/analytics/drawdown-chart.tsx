'use client'

import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Database } from '@/lib/database.types'
import { DrawdownMetrics } from '@/lib/analytics/performance'

type DailyStat = Database['public']['Tables']['daily_stats']['Row']

interface DrawdownChartProps {
  dailyStats: DailyStat[]
  metrics: DrawdownMetrics
}

export function DrawdownChart({ dailyStats, metrics }: DrawdownChartProps) {
  const chartData = useMemo(() => {
    const sorted = [...dailyStats].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    let peak = sorted[0]?.equity || 0

    return sorted.map((stat) => {
      if (stat.equity > peak) {
        peak = stat.equity
      }

      const drawdown = peak - stat.equity
      const drawdownPercent = peak > 0 ? (drawdown / peak) * 100 : 0

      return {
        date: new Date(stat.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        drawdown: -Math.abs(drawdown), // Negative for chart display
        drawdownPercent: -Math.abs(drawdownPercent),
      }
    })
  }, [dailyStats])

  if (chartData.length === 0) {
    return (
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle>Drawdown Analysis</CardTitle>
          <CardDescription>Track equity drawdowns over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center border-2 border-dashed border-primary/20 rounded-lg">
            <p className="text-muted-foreground">No drawdown data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle>Drawdown Analysis</CardTitle>
        <CardDescription>
          Max Drawdown:{' '}
          <span className="text-destructive font-medium">
            ${metrics.maxDrawdown.toFixed(2)} ({metrics.maxDrawdownPercent.toFixed(2)}%)
          </span>
          {metrics.recoveryDays !== null && (
            <> · Recovery: {metrics.recoveryDays} day{metrics.recoveryDays !== 1 ? 's' : ''}</>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Current Drawdown</p>
            <p className="text-sm font-medium text-destructive">
              ${metrics.currentDrawdown.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">
              {metrics.currentDrawdownPercent.toFixed(2)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Peak Equity</p>
            <p className="text-sm font-medium text-primary">
              ${metrics.peakEquity.toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Avg Drawdown</p>
            <p className="text-sm font-medium">
              ${metrics.avgDrawdown.toFixed(2)}
            </p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorDrawdown" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value.toFixed(0)}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--surface))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))',
              }}
              labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
              formatter={(value: any) => [`${Number(value).toFixed(2)}%`, 'Drawdown']}
            />
            <Area
              type="monotone"
              dataKey="drawdownPercent"
              stroke="hsl(var(--destructive))"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorDrawdown)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
