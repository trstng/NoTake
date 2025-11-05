'use client'

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import { TrendingUp, TrendingDown, DollarSign, Target, Activity } from "lucide-react"

type TimePeriod = "weekly" | "monthly" | "yearly"
type MarketCategory = "all" | "sports" | "entertainment" | "pop-culture" | "politics"

// Mock data for market P/L breakdown
const marketPLData = [
  { name: "Sports", value: 45000, percentage: 35 },
  { name: "Entertainment", value: 32000, percentage: 25 },
  { name: "Pop Culture", value: 25500, percentage: 20 },
  { name: "Politics", value: 19000, percentage: 15 },
  { name: "Other", value: 6500, percentage: 5 },
]

// Mock data for biggest winners
const biggestWinners = [
  { ticker: "NFL-CHIEFS", profit: 12500, market: "Sports" },
  { ticker: "OSCAR-NOLAN", profit: 8900, market: "Entertainment" },
  { ticker: "NBA-CURRY", profit: 7600, market: "Sports" },
  { ticker: "MUSIC-SWIFT", profit: 6400, market: "Pop Culture" },
  { ticker: "POL-BIDEN", profit: 5200, market: "Politics" },
]

// Mock data for biggest losers
const biggestLosers = [
  { ticker: "NFL-JETS", loss: -4200, market: "Sports" },
  { ticker: "MOVIE-FLASH", loss: -3800, market: "Entertainment" },
  { ticker: "NBA-NETS", loss: -3100, market: "Sports" },
  { ticker: "CELEB-KANYE", loss: -2900, market: "Pop Culture" },
  { ticker: "POL-DESANTIS", loss: -2400, market: "Politics" },
]

// Mock data for trade volume by market
const tradeVolumeData = [
  { market: "Sports", trades: 145 },
  { market: "Entertainment", trades: 98 },
  { market: "Pop Culture", trades: 76 },
  { market: "Politics", trades: 62 },
  { market: "Other", trades: 19 },
]

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"]

export default function ReportsPage() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("monthly")
  const [marketFilter, setMarketFilter] = useState<MarketCategory>("all")

  const stats = [
    {
      title: "Total P/L",
      value: "$128,000",
      change: "+12.5%",
      icon: DollarSign,
      trend: "up" as const,
    },
    {
      title: "Win Rate",
      value: "68.5%",
      change: "+3.2%",
      icon: Target,
      trend: "up" as const,
    },
    {
      title: "Total Trades",
      value: "400",
      change: "-5.1%",
      icon: Activity,
      trend: "down" as const,
    },
    {
      title: "Avg Trade Size",
      value: "$320",
      change: "+8.3%",
      icon: TrendingUp,
      trend: "up" as const,
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Trade Analytics</h1>
          <p className="text-muted-foreground mt-2">Deep dive into your prediction market performance</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Tabs value={timePeriod} onValueChange={(value) => setTimePeriod(value as TimePeriod)} className="w-full sm:w-auto">
            <TabsList>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly">Yearly</TabsTrigger>
            </TabsList>
          </Tabs>

          <Select value={marketFilter} onValueChange={(value) => setMarketFilter(value as MarketCategory)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by market" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Markets</SelectItem>
              <SelectItem value="sports">Sports</SelectItem>
              <SelectItem value="entertainment">Entertainment</SelectItem>
              <SelectItem value="pop-culture">Pop Culture</SelectItem>
              <SelectItem value="politics">Politics</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <p className={`text-xs flex items-center gap-1 mt-1 ${stat.trend === 'up' ? 'text-success' : 'text-destructive'}`}>
                {stat.trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {stat.change} from last period
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* P/L by Market Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>P/L Distribution by Market</CardTitle>
            <CardDescription>Profit breakdown across different market categories</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={marketPLData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {marketPLData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Trade Volume by Market */}
        <Card>
          <CardHeader>
            <CardTitle>Trade Volume by Market</CardTitle>
            <CardDescription>Number of trades executed per market category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={tradeVolumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="market" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)"
                  }}
                />
                <Bar dataKey="trades" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Winners and Losers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Biggest Winners */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-success" />
              Top 5 Winning Positions
            </CardTitle>
            <CardDescription>Highest profit generating tickers</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={biggestWinners} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                <YAxis dataKey="ticker" type="category" stroke="hsl(var(--muted-foreground))" width={100} />
                <Tooltip
                  formatter={(value: number) => `$${value.toLocaleString()}`}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)"
                  }}
                />
                <Bar dataKey="profit" fill="hsl(var(--success))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Biggest Losers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-destructive" />
              Top 5 Losing Positions
            </CardTitle>
            <CardDescription>Highest loss generating tickers</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={biggestLosers} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                <YAxis dataKey="ticker" type="category" stroke="hsl(var(--muted-foreground))" width={100} />
                <Tooltip
                  formatter={(value: number) => `$${Math.abs(value).toLocaleString()}`}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)"
                  }}
                />
                <Bar dataKey="loss" fill="hsl(var(--destructive))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Key Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Key Insights</CardTitle>
          <CardDescription>Data-backed conclusions from your trading patterns</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-l-4 border-success pl-4">
            <h3 className="font-semibold text-foreground">Strong Sports Performance</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Sports markets account for 35% of total profits with a 72% win rate, making it your most profitable category.
            </p>
          </div>
          <div className="border-l-4 border-chart-2 pl-4">
            <h3 className="font-semibold text-foreground">Entertainment Opportunities</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Entertainment markets show consistent returns with lower volatility, suggesting steady opportunity identification.
            </p>
          </div>
          <div className="border-l-4 border-destructive pl-4">
            <h3 className="font-semibold text-foreground">Risk Management Alert</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Your largest losses occur in Sports markets despite high profitability. Consider tighter position sizing on uncertain outcomes.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
