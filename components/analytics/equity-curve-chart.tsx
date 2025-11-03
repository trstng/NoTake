'use client'

import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Database } from '@/lib/database.types'

type DailyStat = Database['public']['Tables']['daily_stats']['Row']

interface EquityCurveChartProps {
  dailyStats: DailyStat[]
  showRealized?: boolean
  showUnrealized?: boolean
}

export function EquityCurveChart({
  dailyStats,
  showRealized = true,
  showUnrealized = false
}: EquityCurveChartProps) {
  const chartData = useMemo(() => {
    return dailyStats
      .map((stat) => ({
        date: new Date(stat.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        fullDate: stat.date,
        equity: stat.equity,
        realized_pnl: stat.realized_pnl,
        unrealized_pnl: stat.unrealized_pnl,
      }))
      .sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime())
  }, [dailyStats])

  if (chartData.length === 0) {
    return (
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle>Equity Curve</CardTitle>
          <CardDescription>Your account equity over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center border-2 border-dashed border-primary/20 rounded-lg">
            <p className="text-muted-foreground">No equity data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const startEquity = chartData[0]?.equity || 0
  const endEquity = chartData[chartData.length - 1]?.equity || 0
  const totalReturn = endEquity - startEquity
  const returnPercent = startEquity > 0 ? (totalReturn / startEquity) * 100 : 0

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle>Equity Curve</CardTitle>
        <CardDescription>
          ${startEquity.toLocaleString()} → ${endEquity.toLocaleString()} (
          <span className={totalReturn >= 0 ? 'text-success' : 'text-destructive'}>
            {totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)} / {returnPercent >= 0 ? '+' : ''}
            {returnPercent.toFixed(2)}%
          </span>
          )
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--surface))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))',
              }}
              labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
              formatter={(value: any) => [`$${Number(value).toFixed(2)}`, '']}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="equity"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              name="Total Equity"
            />
            {showRealized && (
              <Line
                type="monotone"
                dataKey="realized_pnl"
                stroke="hsl(var(--success))"
                strokeWidth={1}
                dot={false}
                name="Realized P&L"
              />
            )}
            {showUnrealized && (
              <Line
                type="monotone"
                dataKey="unrealized_pnl"
                stroke="hsl(var(--accent))"
                strokeWidth={1}
                dot={false}
                name="Unrealized P&L"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
