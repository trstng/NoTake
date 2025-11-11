'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  ColumnDef,
  SortingState,
  flexRender,
} from '@tanstack/react-table'
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

type GroupedTrade = {
  market_ticker: string
  market_name: string | null
  direction: 'Yes' | 'No'
  position_count: number
  total_pnl: number
  total_size: number
  total_fees: number
  first_entry_time: number
  last_exit_time: number
  avg_entry_price: number
  avg_exit_price: number
  roi: number
}

interface GroupedTradesTableProps {
  trades: GroupedTrade[]
}

export function GroupedTradesTable({ trades }: GroupedTradesTableProps) {
  const router = useRouter()
  const [sorting, setSorting] = useState<SortingState>([
    {
      id: 'last_exit_time',
      desc: true, // Most recent first
    },
  ])

  const columns = useMemo<ColumnDef<GroupedTrade>[]>(
    () => [
      {
        accessorKey: 'last_exit_time',
        header: ({ column }) => {
          return (
            <button
              className="flex items-center gap-1 hover:text-foreground transition-colors"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              Date
              {column.getIsSorted() === 'asc' ? (
                <ArrowUp className="h-4 w-4" />
              ) : column.getIsSorted() === 'desc' ? (
                <ArrowDown className="h-4 w-4" />
              ) : (
                <ArrowUpDown className="h-4 w-4" />
              )}
            </button>
          )
        },
        cell: ({ row }) => {
          const exitDate = new Date(row.original.last_exit_time).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
          return <div className="font-medium">{exitDate}</div>
        },
      },
      {
        accessorKey: 'market_ticker',
        header: 'Market',
        cell: ({ row }) => (
          <div className="whitespace-normal break-words">
            {row.original.market_name || row.original.market_ticker}
          </div>
        ),
      },
      {
        accessorKey: 'direction',
        header: 'Side',
        cell: ({ row }) => (
          <Badge
            variant={row.original.direction === 'Yes' ? 'default' : 'secondary'}
            className="rounded-full"
          >
            {row.original.direction}
          </Badge>
        ),
      },
      {
        accessorKey: 'position_count',
        header: ({ column }) => {
          return (
            <button
              className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              Positions
              {column.getIsSorted() === 'asc' ? (
                <ArrowUp className="h-4 w-4" />
              ) : column.getIsSorted() === 'desc' ? (
                <ArrowDown className="h-4 w-4" />
              ) : (
                <ArrowUpDown className="h-4 w-4" />
              )}
            </button>
          )
        },
        cell: ({ row }) => (
          <div className="text-right text-muted-foreground">{row.original.position_count}</div>
        ),
      },
      {
        accessorKey: 'total_size',
        header: ({ column }) => {
          return (
            <button
              className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              Size
              {column.getIsSorted() === 'asc' ? (
                <ArrowUp className="h-4 w-4" />
              ) : column.getIsSorted() === 'desc' ? (
                <ArrowDown className="h-4 w-4" />
              ) : (
                <ArrowUpDown className="h-4 w-4" />
              )}
            </button>
          )
        },
        cell: ({ row }) => <div className="text-right text-muted-foreground">{row.original.total_size}</div>,
      },
      {
        accessorKey: 'total_pnl',
        header: ({ column }) => {
          return (
            <button
              className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              P/L
              {column.getIsSorted() === 'asc' ? (
                <ArrowUp className="h-4 w-4" />
              ) : column.getIsSorted() === 'desc' ? (
                <ArrowDown className="h-4 w-4" />
              ) : (
                <ArrowUpDown className="h-4 w-4" />
              )}
            </button>
          )
        },
        cell: ({ row }) => {
          const pnl = row.original.total_pnl
          return (
            <div
              className={`text-right font-semibold ${
                pnl >= 0 ? 'text-success' : 'text-destructive'
              }`}
            >
              ${pnl >= 0 ? '+' : ''}
              {pnl.toFixed(2)}
            </div>
          )
        },
      },
      {
        accessorKey: 'roi',
        header: ({ column }) => {
          return (
            <button
              className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              ROI
              {column.getIsSorted() === 'asc' ? (
                <ArrowUp className="h-4 w-4" />
              ) : column.getIsSorted() === 'desc' ? (
                <ArrowDown className="h-4 w-4" />
              ) : (
                <ArrowUpDown className="h-4 w-4" />
              )}
            </button>
          )
        },
        cell: ({ row }) => {
          const roi = row.original.roi
          return (
            <div
              className={`text-right font-semibold ${
                roi >= 0 ? 'text-success' : 'text-destructive'
              }`}
            >
              {roi >= 0 ? '+' : ''}
              {roi.toFixed(2)}%
            </div>
          )
        },
      },
      {
        id: 'actions',
        header: '',
        cell: () => (
          <div className="flex justify-end">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        ),
      },
    ],
    []
  )

  const table = useReactTable({
    data: trades,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const handleRowClick = (trade: GroupedTrade) => {
    // Navigate to detail page with market ticker and direction
    const params = new URLSearchParams({
      ticker: trade.market_ticker,
      direction: trade.direction,
    })
    router.push(`/dashboard/trades/detail?${params.toString()}`)
  }

  return (
    <Card className="p-6 bg-card/80 backdrop-blur-sm border-border/50 shadow-[var(--shadow-soft)]">
      <h2 className="text-xl font-semibold mb-4 text-foreground">All Trades</h2>

      {trades.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center">
          <p className="text-muted-foreground text-sm">No trades yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-border/50">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="text-muted-foreground">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="border-border/50 hover:bg-accent/10 transition-colors cursor-pointer"
                  onClick={() => handleRowClick(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="text-foreground">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  )
}
