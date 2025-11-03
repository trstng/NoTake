'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  LineChart,
  List,
  Settings,
  TrendingUp,
} from 'lucide-react'

const navigation = [
  {
    name: 'Overview',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Trades',
    href: '/dashboard/trades',
    icon: List,
  },
  {
    name: 'Analytics',
    href: '/dashboard/analytics',
    icon: LineChart,
  },
  {
    name: 'Markets',
    href: '/dashboard/markets',
    icon: TrendingUp,
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
]

export function DashboardNav() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-surface border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Link href="/dashboard" className="block">
          <h1 className="text-2xl font-bold text-gradient-neon">
            NoTake
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Prediction Analytics
          </p>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-neon-primary/10 text-neon-primary border border-neon-primary/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-neon-primary/5'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="text-xs text-muted-foreground">
          <p className="font-mono">v0.1.0</p>
        </div>
      </div>
    </aside>
  )
}
