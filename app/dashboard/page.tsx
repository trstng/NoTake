import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch user's trade stats
  const { data: trades } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', user?.id)
    .order('timestamp', { ascending: false })
    .limit(10)

  const tradeCount = trades?.length || 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gradient-neon">
          Dashboard Overview
        </h1>
        <p className="text-muted-foreground mt-1">
          Track your prediction market performance
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-neon-primary/30">
          <CardHeader className="pb-2">
            <CardDescription>Total P&L</CardDescription>
            <CardTitle className="text-2xl text-neon-profit">
              {formatCurrency(0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              All-time performance
            </p>
          </CardContent>
        </Card>

        <Card className="border-neon-primary/30">
          <CardHeader className="pb-2">
            <CardDescription>Win Rate</CardDescription>
            <CardTitle className="text-2xl">0%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              0 / {tradeCount} trades
            </p>
          </CardContent>
        </Card>

        <Card className="border-neon-primary/30">
          <CardHeader className="pb-2">
            <CardDescription>Total Trades</CardDescription>
            <CardTitle className="text-2xl">{tradeCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Across all markets
            </p>
          </CardContent>
        </Card>

        <Card className="border-neon-primary/30">
          <CardHeader className="pb-2">
            <CardDescription>Active Positions</CardDescription>
            <CardTitle className="text-2xl">0</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Open contracts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Placeholder for Equity Curve */}
      <Card className="border-neon-primary/30">
        <CardHeader>
          <CardTitle>Equity Curve</CardTitle>
          <CardDescription>Your P&L over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center border-2 border-dashed border-neon-primary/20 rounded-lg">
            <div className="text-center">
              <p className="text-muted-foreground mb-2">No trade data yet</p>
              <p className="text-sm text-muted-foreground">
                Import your first trades to see your equity curve
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Trades */}
      <Card className="border-neon-primary/30">
        <CardHeader>
          <CardTitle>Recent Trades</CardTitle>
          <CardDescription>Your latest trading activity</CardDescription>
        </CardHeader>
        <CardContent>
          {tradeCount === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-neon-primary/20 rounded-lg">
              <p className="text-muted-foreground">No trades yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Click &quot;Import Trades&quot; to get started
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {trades?.map((trade) => (
                <div
                  key={trade.id}
                  className="flex items-center justify-between p-3 border border-border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{trade.market_ticker}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(trade.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {trade.side === 'buy' ? 'BUY' : 'SELL'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {trade.size} @ ${trade.price}
                    </p>
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
