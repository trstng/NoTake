import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 max-w-2xl">
        {/* Profile Settings */}
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">User ID</p>
              <p className="text-xs text-muted-foreground">
                {user?.id}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Account Created</p>
              <p className="font-medium">
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString()
                  : 'Unknown'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Preferences - Coming Soon */}
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>Coming soon</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="py-8 text-center border-2 border-dashed border-primary/20 rounded-lg">
              <p className="text-muted-foreground mb-4">🚧 Under Construction</p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• Theme customization</p>
                <p>• Default currency display</p>
                <p>• Time zone settings</p>
                <p>• Notification preferences</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Management - Coming Soon */}
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
            <CardDescription>Coming soon</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="py-8 text-center border-2 border-dashed border-primary/20 rounded-lg">
              <p className="text-muted-foreground mb-4">🚧 Under Construction</p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• Export all data</p>
                <p>• Delete all trades</p>
                <p>• Account deletion</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Keys - Coming Soon */}
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle>API Integration</CardTitle>
            <CardDescription>Coming soon</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="py-8 text-center border-2 border-dashed border-primary/20 rounded-lg">
              <p className="text-muted-foreground mb-4">🚧 Under Construction</p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• Connect Kalshi API</p>
                <p>• Connect Polymarket API</p>
                <p>• Auto-sync trades</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
