'use client'

import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Database } from '@/lib/database.types'

type Position = Database['public']['Tables']['positions']['Row']

interface ClosedPositionsTableProps {
  positions: Position[]
}

export function ClosedPositionsTable({ positions }: ClosedPositionsTableProps) {
  return (
    <Card className="p-6 bg-card/80 backdrop-blur-sm border-border/50 shadow-[var(--shadow-soft)]">
      <h2 className="text-xl font-semibold mb-4 text-foreground">Recent Closed Positions</h2>

      {positions.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center">
          <p className="text-muted-foreground text-sm">No closed positions yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead className="text-muted-foreground">Date</TableHead>
                <TableHead className="text-muted-foreground">Market</TableHead>
                <TableHead className="text-muted-foreground">Side</TableHead>
                <TableHead className="text-muted-foreground text-right">Entry</TableHead>
                <TableHead className="text-muted-foreground text-right">Exit</TableHead>
                <TableHead className="text-muted-foreground text-right">Size</TableHead>
                <TableHead className="text-muted-foreground text-right">P/L</TableHead>
                <TableHead className="text-muted-foreground text-right">ROI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.map((position) => {
                const roi =
                  position.entry_price && position.size
                    ? ((position.pnl || 0) / (position.size * position.entry_price)) * 100
                    : 0

                const exitDate = position.exit_time
                  ? new Date(position.exit_time).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : '-'

                return (
                  <TableRow
                    key={position.id}
                    className="border-border/50 hover:bg-accent/5 transition-colors"
                  >
                    <TableCell className="text-foreground font-medium">{exitDate}</TableCell>
                    <TableCell className="text-foreground">{position.market_ticker}</TableCell>
                    <TableCell>
                      <Badge
                        variant={position.direction === 'Yes' ? 'default' : 'secondary'}
                        className="rounded-full"
                      >
                        {position.direction}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {position.entry_price?.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {position.exit_price?.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {position.size}
                    </TableCell>
                    <TableCell
                      className={`text-right font-semibold ${
                        (position.pnl || 0) >= 0 ? 'text-success' : 'text-destructive'
                      }`}
                    >
                      ${(position.pnl || 0) >= 0 ? '+' : ''}
                      {(position.pnl || 0).toFixed(2)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-semibold ${
                        roi >= 0 ? 'text-success' : 'text-destructive'
                      }`}
                    >
                      {roi >= 0 ? '+' : ''}
                      {roi.toFixed(2)}%
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  )
}
