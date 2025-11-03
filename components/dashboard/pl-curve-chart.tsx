'use client'

import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Database } from '@/lib/database.types'

type DailyStat = Database['public']['Tables']['daily_stats']['Row']

interface PLCurveChartProps {
  dailyStats: DailyStat[]
}

export function PLCurveChart({ dailyStats }: PLCurveChartProps) {
  const chartData = useMemo(() => {
    if (dailyStats.length === 0) return []

    // Sort by date first
    const sortedStats = [...dailyStats].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    // Calculate cumulative P/L from realized_pnl
    let cumulativePnL = 0
    const dataPoints = sortedStats.map((stat) => {
      cumulativePnL += stat.realized_pnl
      return {
        date: new Date(stat.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        fullDate: stat.date,
        pl: cumulativePnL,
      }
    })

    // Add starting point at $0 before first trading day
    const firstDate = new Date(sortedStats[0].date)
    const dayBefore = new Date(firstDate)
    dayBefore.setDate(dayBefore.getDate() - 1)

    return [
      {
        date: dayBefore.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        fullDate: dayBefore.toISOString(),
        pl: 0,
      },
      ...dataPoints,
    ]
  }, [dailyStats])

  if (chartData.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <p className="text-muted-foreground text-sm">No P/L data available</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="plGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
        <XAxis
          dataKey="date"
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          tickFormatter={(value) => `$${value}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            boxShadow: 'var(--shadow-soft)',
          }}
          formatter={(value: number) => [`$${value.toFixed(2)}`, 'P/L']}
        />
        <Area
          type="monotone"
          dataKey="pl"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          fill="url(#plGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
