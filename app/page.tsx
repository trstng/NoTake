import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, BarChart3, DollarSign, Zap } from 'lucide-react'

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <div className="flex justify-center mb-6">
              <Image
                src="/logo.png"
                alt="NoTake Logo"
                width={250}
                height={250}
                priority
                className="w-auto h-auto max-w-md"
              />
            </div>
            <p className="text-2xl text-foreground">
              Prediction Market Analytics Dashboard
            </p>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Track and analyze your trades from Kalshi, Polymarket, and more.
              Real-time P&L, equity curves, and deep analytics for serious traders.
            </p>
          </div>

          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/auth/signup">
              <Button size="lg" className="text-lg">
                Get Started
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button size="lg" variant="outline" className="text-lg">
                Sign In
              </Button>
            </Link>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-16">
            <Card className="border-primary/30">
              <CardContent className="pt-6 text-center">
                <TrendingUp className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Equity Curves</h3>
                <p className="text-sm text-muted-foreground">
                  Visualize your P&L over time
                </p>
              </CardContent>
            </Card>

            <Card className="border-primary/30">
              <CardContent className="pt-6 text-center">
                <BarChart3 className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Deep Analytics</h3>
                <p className="text-sm text-muted-foreground">
                  Per-market, tag, and strategy analysis
                </p>
              </CardContent>
            </Card>

            <Card className="border-primary/30">
              <CardContent className="pt-6 text-center">
                <DollarSign className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">P&L Tracking</h3>
                <p className="text-sm text-muted-foreground">
                  Realized and unrealized profits
                </p>
              </CardContent>
            </Card>

            <Card className="border-primary/30">
              <CardContent className="pt-6 text-center">
                <Zap className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Real-time Updates</h3>
                <p className="text-sm text-muted-foreground">
                  Live trade tracking and notifications
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12 p-6 bg-surface border border-primary/30 rounded-lg text-left max-w-2xl mx-auto">
            <h3 className="text-sm font-semibold text-primary mb-2">
              PLATFORM SUPPORT
            </h3>
            <p className="text-sm text-muted-foreground">
              Compatible with Kalshi, Polymarket, and any prediction market platform.
              Import your trades via CSV or connect via API.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
