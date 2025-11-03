'use client'

import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Activity, DollarSign } from "lucide-react";
import { PLCurveChart } from "@/components/demo/PLCurveChart";
import { CalendarView } from "@/components/demo/CalendarView";
import { RecentTrades } from "@/components/demo/RecentTrades";
import { AnalyticsGrid } from "@/components/demo/AnalyticsGrid";

export default function TraderPage() {
  // Mock data for demonstration
  const stats = {
    totalPL: 2847.50,
    winRate: 64.5,
    totalTrades: 156,
    avgWin: 127.30,
    avgLoss: -89.45,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Trading Analytics</h1>
          <p className="text-muted-foreground">Track your prediction market performance</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-6 bg-card/80 backdrop-blur-sm border-border/50 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-medium)] transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Total P/L</span>
              <DollarSign className="w-4 h-4 text-primary" />
            </div>
            <p className={`text-3xl font-bold ${stats.totalPL >= 0 ? 'text-success' : 'text-destructive'}`}>
              ${stats.totalPL >= 0 ? '+' : ''}{stats.totalPL.toFixed(2)}
            </p>
            <div className="flex items-center mt-2 text-xs text-muted-foreground">
              {stats.totalPL >= 0 ? (
                <TrendingUp className="w-3 h-3 mr-1 text-success" />
              ) : (
                <TrendingDown className="w-3 h-3 mr-1 text-destructive" />
              )}
              <span>Last 30 days</span>
            </div>
          </Card>

          <Card className="p-6 bg-card/80 backdrop-blur-sm border-border/50 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-medium)] transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Win Rate</span>
              <Activity className="w-4 h-4 text-primary" />
            </div>
            <p className="text-3xl font-bold text-foreground">{stats.winRate}%</p>
            <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${stats.winRate}%` }}
              />
            </div>
          </Card>

          <Card className="p-6 bg-card/80 backdrop-blur-sm border-border/50 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-medium)] transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Avg Win</span>
              <TrendingUp className="w-4 h-4 text-success" />
            </div>
            <p className="text-3xl font-bold text-success">
              +${stats.avgWin.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">Per winning trade</p>
          </Card>

          <Card className="p-6 bg-card/80 backdrop-blur-sm border-border/50 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-medium)] transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Avg Loss</span>
              <TrendingDown className="w-4 h-4 text-destructive" />
            </div>
            <p className="text-3xl font-bold text-destructive">
              ${stats.avgLoss.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">Per losing trade</p>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* P/L Curve */}
          <Card className="lg:col-span-2 p-6 bg-card/80 backdrop-blur-sm border-border/50 shadow-[var(--shadow-soft)]">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Profit/Loss Curve</h2>
            <PLCurveChart />
          </Card>

          {/* Calendar */}
          <Card className="p-6 bg-card/80 backdrop-blur-sm border-border/50 shadow-[var(--shadow-soft)]">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Performance Calendar</h2>
            <CalendarView />
          </Card>
        </div>

        {/* Analytics Grid */}
        <AnalyticsGrid />

        {/* Recent Trades */}
        <Card className="p-6 bg-card/80 backdrop-blur-sm border-border/50 shadow-[var(--shadow-soft)] mt-6">
          <h2 className="text-xl font-semibold mb-4 text-foreground">Recent Trades</h2>
          <RecentTrades />
        </Card>
      </div>
    </div>
  );
}
