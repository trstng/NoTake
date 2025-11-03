import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function MarketsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch trades grouped by market
  const { data: trades } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', user?.id)

  // Group by market ticker
  const marketMap = new Map<string, any[]>()
  trades?.forEach((trade) => {
    const existing = marketMap.get(trade.market_ticker) || []
    marketMap.set(trade.market_ticker, [...existing, trade])
  })

  const markets = Array.from(marketMap.entries()).map(([ticker, trades]) => ({
    ticker,
    tradeCount: trades.length,
    yesCount: trades.filter(t => t.direction === 'Yes').length,
    noCount: trades.filter(t => t.direction === 'No').length,
    totalVolume: trades.reduce((sum, t) => sum + (t.amount_contracts * t.price_cents / 100), 0),
    avgPrice: trades.reduce((sum, t) => sum + t.price_cents, 0) / trades.length,
  }))

  // Sort by trade count
  markets.sort((a, b) => b.tradeCount - a.tradeCount)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Markets
        </h1>
        <p className="text-muted-foreground mt-1">
          Performance breakdown by market
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardDescription>Unique Markets</CardDescription>
            <CardTitle className="text-2xl">{markets.length}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardDescription>Total Trades</CardDescription>
            <CardTitle className="text-2xl">{trades?.length || 0}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardDescription>Avg Trades/Market</CardDescription>
            <CardTitle className="text-2xl">
              {markets.length > 0 ? Math.round((trades?.length || 0) / markets.length) : 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Markets List */}
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle>Market Breakdown</CardTitle>
          <CardDescription>
            Your trading activity across all markets
          </CardDescription>
        </CardHeader>
        <CardContent>
          {markets.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-primary/20 rounded-lg">
              <p className="text-muted-foreground">No markets yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Import trades to see your market breakdown
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto scrollbar-thin">
              {markets.map((market) => (
                <div
                  key={market.ticker}
                  className="p-4 border border-border rounded-lg hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-foreground">
                        {market.ticker}
                      </p>
                      <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                        <span>{market.tradeCount} trades</span>
                        <span className="text-success">
                          {market.yesCount} Yes
                        </span>
                        <span className="text-destructive">
                          {market.noCount} No
                        </span>
                      </div>
                    </div>

                    <div className="text-right ml-4">
                      <p className="text-sm text-muted-foreground">
                        Volume: ${market.totalVolume.toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Avg Price: {market.avgPrice.toFixed(0)}¢
                      </p>
                    </div>
                  </div>

                  {/* Progress bar showing Yes/No ratio */}
                  <div className="mt-3 h-2 bg-surface rounded-full overflow-hidden flex">
                    <div
                      className="bg-success"
                      style={{
                        width: `${(market.yesCount / market.tradeCount) * 100}%`,
                      }}
                    />
                    <div
                      className="bg-destructive"
                      style={{
                        width: `${(market.noCount / market.tradeCount) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
