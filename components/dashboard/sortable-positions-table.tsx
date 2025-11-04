'use client'

import { useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  ColumnDef,
  SortingState,
  flexRender,
} from '@tanstack/react-table'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Database } from '@/lib/database.types'

type Position = Database['public']['Tables']['positions']['Row']

interface SortablePositionsTableProps {
  positions: Position[]
}

export function SortablePositionsTable({ positions }: SortablePositionsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    {
      id: 'exit_time',
      desc: true, // Most recent first
    },
  ])

  const columns = useMemo<ColumnDef<Position>[]>(
    () => [
      {
        accessorKey: 'exit_time',
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
          const exitDate = row.original.exit_time
            ? new Date(row.original.exit_time).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
            : '-'
          return <div className="font-medium">{exitDate}</div>
        },
      },
      {
        accessorKey: 'market_ticker',
        header: 'Market',
        cell: ({ row }) => <div>{row.original.market_ticker}</div>,
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
        accessorKey: 'entry_price',
        header: ({ column }) => {
          return (
            <button
              className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              Entry
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
          <div className="text-right text-muted-foreground">
            {row.original.entry_price?.toFixed(2)}
          </div>
        ),
      },
      {
        accessorKey: 'exit_price',
        header: ({ column }) => {
          return (
            <button
              className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              Exit
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
          <div className="text-right text-muted-foreground">
            {row.original.exit_price?.toFixed(2)}
          </div>
        ),
      },
      {
        accessorKey: 'size',
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
        cell: ({ row }) => <div className="text-right text-muted-foreground">{row.original.size}</div>,
      },
      {
        accessorKey: 'pnl',
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
          const pnl = row.original.pnl || 0
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
        id: 'roi',
        accessorFn: (row) => {
          if (row.entry_price && row.size) {
            return ((row.pnl || 0) / (row.size * row.entry_price)) * 100
          }
          return 0
        },
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
          const roi =
            row.original.entry_price && row.original.size
              ? ((row.original.pnl || 0) / (row.original.size * row.original.entry_price)) * 100
              : 0
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
    ],
    []
  )

  const table = useReactTable({
    data: positions,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <Card className="p-6 bg-card/80 backdrop-blur-sm border-border/50 shadow-[var(--shadow-soft)]">
      <h2 className="text-xl font-semibold mb-4 text-foreground">Closed Positions</h2>

      {positions.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center">
          <p className="text-muted-foreground text-sm">No closed positions yet</p>
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
                  className="border-border/50 hover:bg-accent/5 transition-colors"
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
