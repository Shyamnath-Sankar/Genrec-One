'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useAuth } from '@/lib/hooks/use-auth'
import { apiClient } from '@/lib/api/client'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  Building2,
  Users,
  Shield,
  Bell,
  Palette,
  Globe,
  Mail,
  Save,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react'
import { toast } from 'sonner'

type CompanySettings = {
  name: string
  address: string
  phone: string
  email: string
  website: string
  logo: string | null
  timezone: string
  dateFormat: string
  currency: string
}

export default function SettingsPage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { isLoading: authLoading, isAuthenticated, hasPermission, isSuperAdmin } = useAuth()
  const [settings, setSettings] = useState<CompanySettings>({
    name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    logo: null,
    timezone: 'UTC',
    dateFormat: 'DD/MM/YYYY',
    currency: 'USD',
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
      return
    }

    if (isAuthenticated) {
      fetchSettings()
    }
  }, [authLoading, isAuthenticated, router])

  const fetchSettings = async () => {
    try {
      setIsLoading(true)
      const data = await apiClient.get<CompanySettings>('/settings/company')
      if (data) {
        setSettings(data)
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      await apiClient.put('/settings/company', settings)
      toast.success('Settings saved successfully')
    } catch (error) {
      toast.error('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    )
  }

  if (!hasPermission('settings.view') && !isSuperAdmin) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold">Access Restricted</h2>
          <p className="text-muted-foreground">
            You don't have permission to access settings
          </p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your organization settings</p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="company">
          <TabsList>
            <TabsTrigger value="company">Company</TabsTrigger>
            {hasPermission('users.manage') && <TabsTrigger value="users">Users</TabsTrigger>}
            {hasPermission('roles.manage') && <TabsTrigger value="roles">Roles</TabsTrigger>}
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
          </TabsList>

          <TabsContent value="company" className="mt-6">
            <div className="grid gap-6">
              {/* Company Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Company Information
                  </CardTitle>
                  <CardDescription>
                    Basic information about your organization
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="name">Company Name</Label>
                          <Input
                            id="name"
                            value={settings.name}
                            onChange={(e) =>
                              setSettings({ ...settings, name: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={settings.email}
                            onChange={(e) =>
                              setSettings({ ...settings, email: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone</Label>
                          <Input
                            id="phone"
                            value={settings.phone}
                            onChange={(e) =>
                              setSettings({ ...settings, phone: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="website">Website</Label>
                          <Input
                            id="website"
                            value={settings.website}
                            onChange={(e) =>
                              setSettings({ ...settings, website: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Input
                          id="address"
                          value={settings.address}
                          onChange={(e) =>
                            setSettings({ ...settings, address: e.target.value })
                          }
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Localization */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Localization
                  </CardTitle>
                  <CardDescription>
                    Regional and format settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <Input
                        id="timezone"
                        value={settings.timezone}
                        onChange={(e) =>
                          setSettings({ ...settings, timezone: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dateFormat">Date Format</Label>
                      <Input
                        id="dateFormat"
                        value={settings.dateFormat}
                        onChange={(e) =>
                          setSettings({ ...settings, dateFormat: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Input
                        id="currency"
                        value={settings.currency}
                        onChange={(e) =>
                          setSettings({ ...settings, currency: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Save Button */}
              {hasPermission('settings.company', 'update') && (
                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={isSaving}>
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Management
                </CardTitle>
                <CardDescription>
                  Manage user accounts and access
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">User Management</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Manage system users, reset passwords, and control access
                  </p>
                  <Button onClick={() => router.push('/settings/users')}>
                    Manage Users
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Roles & Permissions
                </CardTitle>
                <CardDescription>
                  Configure roles and their permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">Role Management</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create and configure roles with specific permissions
                  </p>
                  <Button onClick={() => router.push('/settings/roles')}>
                    Manage Roles
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Configure email and in-app notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Receive email notifications for important events
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Leave Approvals</p>
                    <p className="text-sm text-muted-foreground">
                      Get notified when leaves need approval
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Expense Approvals</p>
                    <p className="text-sm text-muted-foreground">
                      Get notified when expenses need approval
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">System Announcements</p>
                    <p className="text-sm text-muted-foreground">
                      Receive company-wide announcements
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Appearance
                </CardTitle>
                <CardDescription>
                  Customize the look and feel of the application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className="font-medium mb-4">Theme</p>
                  <div className="grid grid-cols-3 gap-4">
                    <button
                      onClick={() => setTheme('light')}
                      className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors ${
                        theme === 'light'
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-muted-foreground/50'
                      }`}
                    >
                      <Sun className="h-6 w-6" />
                      <span className="text-sm font-medium">Light</span>
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors ${
                        theme === 'dark'
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-muted-foreground/50'
                      }`}
                    >
                      <Moon className="h-6 w-6" />
                      <span className="text-sm font-medium">Dark</span>
                    </button>
                    <button
                      onClick={() => setTheme('system')}
                      className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors ${
                        theme === 'system'
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-muted-foreground/50'
                      }`}
                    >
                      <Monitor className="h-6 w-6" />
                      <span className="text-sm font-medium">System</span>
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Choose your preferred theme or use system settings
                  </p>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Compact Mode</p>
                    <p className="text-sm text-muted-foreground">
                      Reduce spacing for more content on screen
                    </p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
