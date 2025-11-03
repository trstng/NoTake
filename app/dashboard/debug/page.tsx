'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { debugPnLCalculations } from '@/app/actions/debug'
import { recalculateAll } from '@/app/actions/recalculate'

export default function DebugPage() {
  const [loading, setLoading] = useState(false)
  const [recalculating, setRecalculating] = useState(false)
  const [data, setData] = useState<any>(null)
  const [recalcMessage, setRecalcMessage] = useState<string>('')

  const handleDebug = async () => {
    setLoading(true)
    const result = await debugPnLCalculations()
    if (result.success) {
      setData(result.data)
    }
    setLoading(false)
  }

  const handleRecalculate = async () => {
    setRecalculating(true)
    setRecalcMessage('')
    const result = await recalculateAll()
    if (result.success) {
      setRecalcMessage(result.message || 'Recalculated successfully')
      // Auto-refresh debug data
      setTimeout(() => handleDebug(), 500)
    } else {
      setRecalcMessage(`Error: ${'error' in result ? result.error : 'Unknown error'}`)
    }
    setRecalculating(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">P&L Debug</h1>
        <p className="text-muted-foreground mt-1">
          Investigate discrepancies in P&L calculations
        </p>
      </div>

      <div className="flex gap-4">
        <Button onClick={handleDebug} disabled={loading}>
          {loading ? 'Running...' : 'Run Debug Analysis'}
        </Button>
        <Button
          onClick={handleRecalculate}
          disabled={recalculating}
          variant="destructive"
        >
          {recalculating ? 'Recalculating...' : 'Recalculate All (Fresh Start)'}
        </Button>
      </div>

      {recalcMessage && (
        <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
          <p className="text-sm text-primary">{recalcMessage}</p>
        </div>
      )}

      {data && (
        <div className="space-y-4">
          {/* Summary */}
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground">Positions Table:</p>
                  <p className="text-xl font-bold text-success">
                    ${data.positions.totalPnL.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ({data.positions.count} positions)
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Daily Stats Total:</p>
                  <p className="text-xl font-bold">
                    ${data.dailyStats.totalRealizedPnL.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ({data.dailyStats.count} days)
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-muted-foreground">Equity Curve:</p>
                <p className="text-sm">
                  First: ${data.dailyStats.firstEquity.toFixed(2)} → Final: $
                  {data.dailyStats.finalEquity.toFixed(2)}
                </p>
                <p className="text-xl font-bold">
                  Change: ${data.dailyStats.equityChange.toFixed(2)}
                </p>
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-muted-foreground font-bold">Discrepancies:</p>
                <p
                  className={
                    data.discrepancy.positionsVsStats === 0
                      ? 'text-success'
                      : 'text-destructive'
                  }
                >
                  Positions vs Stats:{' '}
                  {data.discrepancy.positionsVsStats >= 0 ? '+' : ''}$
                  {data.discrepancy.positionsVsStats.toFixed(2)}
                </p>
                <p
                  className={
                    data.discrepancy.positionsVsEquityChange === 0
                      ? 'text-success'
                      : 'text-destructive'
                  }
                >
                  Positions vs Equity Change:{' '}
                  {data.discrepancy.positionsVsEquityChange >= 0 ? '+' : ''}$
                  {data.discrepancy.positionsVsEquityChange.toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Sample Positions */}
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle>Sample Positions (First 5)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-2">Market</th>
                      <th className="text-left p-2">Dir</th>
                      <th className="text-right p-2">Entry</th>
                      <th className="text-right p-2">Exit</th>
                      <th className="text-right p-2">Size</th>
                      <th className="text-right p-2">P&L</th>
                      <th className="text-right p-2">Fees</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.positions.sample.map((p: any, i: number) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="p-2 max-w-[200px] truncate">{p.market}</td>
                        <td className="p-2">{p.direction}</td>
                        <td className="p-2 text-right">{p.entry_price}¢</td>
                        <td className="p-2 text-right">{p.exit_price}¢</td>
                        <td className="p-2 text-right">{p.size}</td>
                        <td
                          className={`p-2 text-right ${
                            p.pnl >= 0 ? 'text-success' : 'text-destructive'
                          }`}
                        >
                          ${p.pnl?.toFixed(2)}
                        </td>
                        <td className="p-2 text-right">${p.fees?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Sample Daily Stats */}
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle>Sample Daily Stats (First 5)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-2">Date</th>
                      <th className="text-right p-2">Trades</th>
                      <th className="text-right p-2">Realized P&L</th>
                      <th className="text-right p-2">Equity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.dailyStats.sample.map((s: any, i: number) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="p-2">{s.date}</td>
                        <td className="p-2 text-right">{s.trade_count}</td>
                        <td
                          className={`p-2 text-right ${
                            s.realized_pnl >= 0 ? 'text-success' : 'text-destructive'
                          }`}
                        >
                          ${s.realized_pnl?.toFixed(2)}
                        </td>
                        <td className="p-2 text-right">${s.equity?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
