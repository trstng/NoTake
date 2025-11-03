import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function TradesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch all trades for the user
  const { data: trades, count } = await supabase
    .from('trades')
    .select('*', { count: 'exact' })
    .eq('user_id', user?.id)
    .order('timestamp', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          All Trades
        </h1>
        <p className="text-muted-foreground mt-1">
          Complete history of your trading activity
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardDescription>Total Trades</CardDescription>
            <CardTitle className="text-2xl">{count || 0}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardDescription>Yes Positions</CardDescription>
            <CardTitle className="text-2xl text-success">
              {trades?.filter(t => t.direction === 'Yes').length || 0}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardDescription>No Positions</CardDescription>
            <CardTitle className="text-2xl text-destructive">
              {trades?.filter(t => t.direction === 'No').length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Trades Table */}
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle>Trade History</CardTitle>
          <CardDescription>
            {count || 0} total trade{count !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!trades || trades.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-primary/20 rounded-lg">
              <p className="text-muted-foreground">No trades yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Import your first trades to get started
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto scrollbar-thin">
              {trades.map((trade) => (
                <div
                  key={trade.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-primary/5 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-foreground">
                      {trade.market_ticker}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(trade.timestamp).toLocaleDateString()} •{' '}
                      {new Date(trade.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 ml-4">
                    <div className="text-right">
                      <p
                        className={`font-medium ${
                          trade.direction === 'Yes'
                            ? 'text-success'
                            : 'text-destructive'
                        }`}
                      >
                        {trade.direction.toUpperCase()}
                      </p>
                      <p className="text-sm text-muted-foreground font-mono">
                        {trade.amount_contracts} @ {trade.price_cents}¢
                      </p>
                    </div>

                    {trade.order_type && (
                      <div>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            trade.order_type === 'Maker'
                              ? 'bg-primary/10 text-primary'
                              : 'bg-accent/10 text-accent'
                          }`}
                        >
                          {trade.order_type}
                        </span>
                      </div>
                    )}

                    <div className="text-right min-w-[80px]">
                      <p className="text-sm text-muted-foreground">
                        Fee: ${trade.fee_dollars.toFixed(2)}
                      </p>
                    </div>
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
