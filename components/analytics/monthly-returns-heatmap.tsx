'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface MonthlyReturnsHeatmapProps {
  monthlyReturns: Map<string, number>
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function MonthlyReturnsHeatmap({ monthlyReturns }: MonthlyReturnsHeatmapProps) {
  const { heatmapData, years, minReturn, maxReturn } = useMemo(() => {
    const data = new Map<number, Map<number, number>>()
    let min = 0
    let max = 0

    // Organize by year and month
    for (const [monthKey, pnl] of monthlyReturns.entries()) {
      const [yearStr, monthStr] = monthKey.split('-')
      const year = parseInt(yearStr)
      const month = parseInt(monthStr) - 1 // 0-indexed

      if (!data.has(year)) {
        data.set(year, new Map())
      }
      data.get(year)!.set(month, pnl)

      min = Math.min(min, pnl)
      max = Math.max(max, pnl)
    }

    const yearsList = Array.from(data.keys()).sort((a, b) => b - a)

    return {
      heatmapData: data,
      years: yearsList,
      minReturn: min,
      maxReturn: max,
    }
  }, [monthlyReturns])

  const getColorIntensity = (value: number): string => {
    if (value === 0) return 'bg-muted'

    const absMax = Math.max(Math.abs(minReturn), Math.abs(maxReturn))
    if (absMax === 0) return 'bg-muted'

    if (value > 0) {
      const intensity = Math.min(1, value / absMax)
      // Green intensity based on profit
      if (intensity > 0.7) return 'bg-success/60'
      if (intensity > 0.4) return 'bg-success/40'
      if (intensity > 0.2) return 'bg-success/20'
      return 'bg-success/10'
    } else {
      const intensity = Math.min(1, Math.abs(value) / absMax)
      // Red intensity based on loss
      if (intensity > 0.7) return 'bg-destructive/60'
      if (intensity > 0.4) return 'bg-destructive/40'
      if (intensity > 0.2) return 'bg-destructive/20'
      return 'bg-destructive/10'
    }
  }

  if (years.length === 0) {
    return (
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle>Monthly Returns</CardTitle>
          <CardDescription>Heatmap of monthly P&L</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center border-2 border-dashed border-primary/20 rounded-lg">
            <p className="text-muted-foreground">No monthly returns data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle>Monthly Returns</CardTitle>
        <CardDescription>Heatmap showing P&L by month</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left p-2 font-medium w-16">Year</th>
                {MONTHS.map((month) => (
                  <th key={month} className="text-center p-1 font-medium w-12">
                    {month}
                  </th>
                ))}
                <th className="text-right p-2 font-medium w-20">Total</th>
              </tr>
            </thead>
            <tbody>
              {years.map((year) => {
                const yearData = heatmapData.get(year)!
                const yearTotal = Array.from(yearData.values()).reduce((sum, val) => sum + val, 0)

                return (
                  <tr key={year} className="border-t border-border">
                    <td className="p-2 font-medium">{year}</td>
                    {MONTHS.map((_, monthIdx) => {
                      const value = yearData.get(monthIdx)
                      if (value === undefined) {
                        return (
                          <td key={monthIdx} className="p-1">
                            <div className="h-8 bg-surface/30 rounded flex items-center justify-center">
                              <span className="text-[10px] text-muted-foreground/50">-</span>
                            </div>
                          </td>
                        )
                      }

                      return (
                        <td key={monthIdx} className="p-1">
                          <div
                            className={`h-8 rounded flex items-center justify-center transition-all hover:scale-105 cursor-pointer ${getColorIntensity(value)}`}
                            title={`${MONTHS[monthIdx]} ${year}: ${value >= 0 ? '+' : ''}$${value.toFixed(2)}`}
                          >
                            <span
                              className={`text-[10px] font-medium ${
                                Math.abs(value) > 0 ? 'text-foreground' : 'text-muted-foreground'
                              }`}
                            >
                              {value >= 0 ? '+' : ''}
                              {Math.abs(value) >= 1000
                                ? `${(value / 1000).toFixed(1)}k`
                                : value.toFixed(0)}
                            </span>
                          </div>
                        </td>
                      )
                    })}
                    <td className="p-2 text-right">
                      <span
                        className={`font-medium ${
                          yearTotal >= 0 ? 'text-success' : 'text-destructive'
                        }`}
                      >
                        {yearTotal >= 0 ? '+' : ''}${yearTotal.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-destructive/60 rounded"></div>
            <span>Loss</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-muted rounded"></div>
            <span>Break Even</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-success/60 rounded"></div>
            <span>Profit</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
