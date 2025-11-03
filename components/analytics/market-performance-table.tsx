'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MarketPerformance } from '@/lib/analytics/performance'

interface MarketPerformanceTableProps {
  markets: MarketPerformance[]
}

export function MarketPerformanceTable({ markets }: MarketPerformanceTableProps) {
  if (markets.length === 0) {
    return (
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle>Market Performance</CardTitle>
          <CardDescription>Performance breakdown by market</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 border-2 border-dashed border-primary/20 rounded-lg">
            <p className="text-muted-foreground">No market data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle>Market Performance</CardTitle>
        <CardDescription>
          Performance breakdown across {markets.length} market{markets.length !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-2 font-medium">Market</th>
                <th className="text-center p-2 font-medium">Trades</th>
                <th className="text-center p-2 font-medium">Win Rate</th>
                <th className="text-right p-2 font-medium">Total P&L</th>
                <th className="text-right p-2 font-medium">Avg P&L</th>
                <th className="text-right p-2 font-medium">Best</th>
                <th className="text-right p-2 font-medium">Worst</th>
              </tr>
            </thead>
            <tbody>
              {markets.map((market, idx) => (
                <tr key={idx} className="border-b border-border/50 hover:bg-primary/5 transition-colors">
                  <td className="p-2 max-w-[300px] truncate" title={market.market_ticker}>
                    {market.market_ticker}
                  </td>
                  <td className="p-2 text-center text-xs">
                    {market.totalTrades}
                  </td>
                  <td className="p-2 text-center">
                    <span
                      className={`font-medium ${
                        market.winRate >= 50 ? 'text-success' : 'text-destructive'
                      }`}
                    >
                      {market.winRate.toFixed(1)}%
                    </span>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {market.winCount}W / {market.lossCount}L
                    </div>
                  </td>
                  <td className="p-2 text-right">
                    <span
                      className={`font-medium ${
                        market.totalPnL >= 0 ? 'text-success' : 'text-destructive'
                      }`}
                    >
                      {market.totalPnL >= 0 ? '+' : ''}${market.totalPnL.toFixed(2)}
                    </span>
                  </td>
                  <td className="p-2 text-right text-xs">
                    {market.avgPnL >= 0 ? '+' : ''}${market.avgPnL.toFixed(2)}
                  </td>
                  <td className="p-2 text-right text-xs text-success">
                    +${market.largestWin.toFixed(2)}
                  </td>
                  <td className="p-2 text-right text-xs text-destructive">
                    ${market.largestLoss.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
