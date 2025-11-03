'use client'

import { useState } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Card } from '@/components/ui/card'
import { Database } from '@/lib/database.types'

type DailyStat = Database['public']['Tables']['daily_stats']['Row']

interface TradingCalendarProps {
  dailyStats: DailyStat[]
}

export function TradingCalendar({ dailyStats }: TradingCalendarProps) {
  const [date, setDate] = useState<Date | undefined>(new Date())

  // Convert daily stats to trading days with P&L
  const tradingDays = dailyStats
    .filter((stat) => stat.realized_pnl !== 0) // Only show days with realized P&L
    .map((stat) => ({
      date: new Date(stat.date),
      pl: stat.realized_pnl,
    }))

  const profitableDays = tradingDays.filter((d) => d.pl > 0)
  const lossDays = tradingDays.filter((d) => d.pl < 0)

  return (
    <Card className="p-6 bg-card/80 backdrop-blur-sm border-border/50 shadow-[var(--shadow-soft)]">
      <h2 className="text-xl font-semibold mb-4 text-foreground">Performance Calendar</h2>

      {tradingDays.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground text-sm">No trading data available</p>
        </div>
      ) : (
        <div className="space-y-4">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="rounded-lg border-0 pointer-events-auto"
            modifiers={{
              profitable: profitableDays.map((d) => d.date),
              loss: lossDays.map((d) => d.date),
            }}
            modifiersClassNames={{
              profitable: 'bg-success/10 text-success font-semibold hover:bg-success/20',
              loss: 'bg-destructive/10 text-destructive font-semibold hover:bg-destructive/20',
            }}
          />

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-success/20 border-2 border-success" />
                <span className="text-muted-foreground">Profitable days</span>
              </div>
              <span className="font-medium text-foreground">{profitableDays.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-destructive/20 border-2 border-destructive" />
                <span className="text-muted-foreground">Loss days</span>
              </div>
              <span className="font-medium text-foreground">{lossDays.length}</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
