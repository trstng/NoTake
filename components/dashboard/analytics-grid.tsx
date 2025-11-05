'use client'

import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Database } from '@/lib/database.types';
import { PerformanceMetrics, DrawdownMetrics } from '@/lib/analytics/performance';

type Position = Database['public']['Tables']['positions']['Row']

interface AnalyticsGridProps {
  positions: Position[]
  performance: PerformanceMetrics
  drawdown: DrawdownMetrics
  avgHoldTime: {
    hours: number
    days: number
    formatted: string
  }
}

export const AnalyticsGrid = ({ positions, performance, drawdown, avgHoldTime }: AnalyticsGridProps) => {
  // Calculate win/loss counts from positions
  const winners = positions.filter((p) => (p.pnl || 0) > 0)
  const losers = positions.filter((p) => (p.pnl || 0) <= 0)

  const winLossData = [
    { type: 'Wins', value: winners.length, fill: 'hsl(var(--success))' },
    { type: 'Losses', value: losers.length, fill: 'hsl(var(--destructive))' },
  ];

  // Mock MFE/MAE data (placeholder until we have historical price data)
  const mfeData = [
    { range: '0-5%', count: 12 },
    { range: '5-10%', count: 24 },
    { range: '10-15%', count: 18 },
    { range: '15-20%', count: 8 },
    { range: '20%+', count: 4 },
  ];

  const maeData = [
    { range: '0-5%', count: 15 },
    { range: '5-10%', count: 22 },
    { range: '10-15%', count: 14 },
    { range: '15-20%', count: 6 },
    { range: '20%+', count: 3 },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* MFE Distribution */}
      <Card className="p-6 bg-card/80 backdrop-blur-sm border-border/50 shadow-[var(--shadow-soft)]">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Maximum Favorable Excursion</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={mfeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
            <XAxis
              dataKey="range"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: 'var(--shadow-soft)',
              }}
            />
            <Bar dataKey="count" fill="hsl(var(--success))" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-sm text-muted-foreground mt-2">
          Shows the best price movement before exit
        </p>
      </Card>

      {/* MAE Distribution */}
      <Card className="p-6 bg-card/80 backdrop-blur-sm border-border/50 shadow-[var(--shadow-soft)]">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Maximum Adverse Excursion</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={maeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
            <XAxis
              dataKey="range"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: 'var(--shadow-soft)',
              }}
            />
            <Bar dataKey="count" fill="hsl(var(--destructive))" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-sm text-muted-foreground mt-2">
          Shows the worst price movement before exit
        </p>
      </Card>

      {/* Win/Loss Distribution */}
      <Card className="p-6 bg-card/80 backdrop-blur-sm border-border/50 shadow-[var(--shadow-soft)]">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Win/Loss Distribution</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={winLossData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
            <XAxis
              type="number"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="type"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: 'var(--shadow-soft)',
              }}
            />
            <Bar dataKey="value" radius={[0, 8, 8, 0]}>
              {winLossData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <p className="text-2xl font-bold text-success">{winners.length}</p>
            <p className="text-sm text-muted-foreground">Winning trades</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-destructive">{losers.length}</p>
            <p className="text-sm text-muted-foreground">Losing trades</p>
          </div>
        </div>
      </Card>

      {/* Key Metrics */}
      <Card className="p-6 bg-card/80 backdrop-blur-sm border-border/50 shadow-[var(--shadow-soft)]">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Additional Metrics</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-border/50">
            <span className="text-sm text-muted-foreground">Profit Factor</span>
            <span className="text-lg font-semibold text-foreground">
              {performance.profitFactor === Infinity ? '∞' : performance.profitFactor.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center pb-3 border-b border-border/50">
            <span className="text-sm text-muted-foreground">Max Drawdown</span>
            <span className="text-lg font-semibold text-destructive">
              {drawdown.maxDrawdownPercent > 0 ? '-' : ''}{drawdown.maxDrawdownPercent.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between items-center pb-3 border-b border-border/50">
            <span className="text-sm text-muted-foreground">Avg Hold Time</span>
            <span className="text-lg font-semibold text-foreground">{avgHoldTime.formatted}</span>
          </div>
          <div className="flex justify-between items-center pb-3 border-b border-border/50">
            <span className="text-sm text-muted-foreground">Best Trade</span>
            <span className="text-lg font-semibold text-success">
              +${performance.largestWin.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Worst Trade</span>
            <span className="text-lg font-semibold text-destructive">
              ${performance.largestLoss.toFixed(2)}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};
