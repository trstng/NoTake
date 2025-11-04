import { Card, CardHeader, CardDescription, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { SortablePositionsTable } from '@/components/dashboard/sortable-positions-table'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function TradesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch all closed positions for the user
  const { data: positions, count } = await supabase
    .from('positions')
    .select('*', { count: 'exact' })
    .eq('user_id', user?.id)
    .eq('status', 'closed')
    .order('exit_time', { ascending: false })

  // Calculate stats
  const totalPnL = positions?.reduce((sum, pos) => sum + (pos.pnl || 0), 0) || 0
  const winningTrades = positions?.filter((pos) => (pos.pnl || 0) > 0).length || 0
  const winRate = count && count > 0 ? ((winningTrades / count) * 100).toFixed(1) : '0.0'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Closed Positions</h1>
        <p className="text-muted-foreground mt-1">
          Complete history of your closed trading positions
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardDescription>Total Closed Positions</CardDescription>
            <CardTitle className="text-2xl">{count || 0}</CardTitle>
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
            <CardDescription>Win Rate</CardDescription>
            <CardTitle className="text-2xl text-primary">{winRate}%</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Sortable Positions Table */}
      <SortablePositionsTable positions={positions || []} />
    </div>
  )
}
