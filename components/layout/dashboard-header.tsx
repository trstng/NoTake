'use client'

import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { CSVImportDialog } from '@/components/import/csv-import-dialog'
import { SettlementImportDialog } from '@/components/import/settlement-import-dialog'
import { ThemeToggle } from '@/components/theme-toggle'

interface DashboardHeaderProps {
  user: User
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back,</p>
          <p className="font-semibold">{user.email}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <CSVImportDialog />
        <SettlementImportDialog />
        <ThemeToggle />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          {loggingOut ? 'Logging out...' : 'Logout'}
        </Button>
      </div>
    </header>
  )
}
