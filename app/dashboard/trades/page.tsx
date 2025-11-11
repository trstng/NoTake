import { Card, CardHeader, CardDescription, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { getGroupedPositions } from '@/app/actions/positions'
import { GroupedTradesTable } from '@/components/dashboard/grouped-trades-table'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function TradesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <div>Please log in to view your trades.</div>
  }

  // Fetch grouped positions (trades grouped by market + direction)
  const groupedTrades = await getGroupedPositions(user.id)

  // Fetch open positions for debugging
  const { data: openPositions } = await supabase
    .from('positions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'open')
    .order('entry_time', { ascending: false })

  // Calculate stats
  const totalMarkets = groupedTrades.length
  const totalPnL = groupedTrades.reduce((sum, trade) => sum + trade.total_pnl, 0)
  const winningTrades = groupedTrades.filter((trade) => trade.total_pnl > 0).length
  const winRate = totalMarkets > 0 ? ((winningTrades / totalMarkets) * 100).toFixed(1) : '0.0'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Trades</h1>
        <p className="text-muted-foreground mt-1">
          Your trading history grouped by market
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardDescription>Total Markets Traded</CardDescription>
            <CardTitle className="text-2xl">{totalMarkets}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardDescription>Total P/L</CardDescription>
            <CardTitle
              className={`text-2xl ${totalPnL >= 0 ? 'text-success' : 'text-destructive'}`}
            >
              ${totalPnL >= 0 ? '+' : ''}
              {totalPnL.toFixed(2)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardDescription>Win Rate (per market)</CardDescription>
            <CardTitle className="text-2xl text-primary">{winRate}%</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Open Positions Alert */}
      {openPositions && openPositions.length > 0 && (
        <Card className="border-orange-500/50 bg-orange-500/5">
          <CardHeader>
            <CardTitle className="text-orange-600">
              Open Positions ({openPositions.length})
            </CardTitle>
            <CardDescription>
              These positions have not been closed by settlements yet
            </CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {openPositions.map((pos) => (
                <div
                  key={pos.id}
                  className="flex justify-between items-center p-3 bg-background rounded-lg border border-border"
                >
                  <div>
                    <div className="font-medium text-sm">{pos.market_ticker}</div>
                    <div className="text-xs text-muted-foreground">
                      {pos.direction} · {pos.size} contracts @ {pos.entry_price}¢
                      {' · '}
                      {new Date(pos.entry_time).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {pos.layers ? `${(pos.layers as any[]).length} layer(s)` : 'No layers'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Grouped Trades Table */}
      <GroupedTradesTable trades={groupedTrades} />
    </div>
  )
}
