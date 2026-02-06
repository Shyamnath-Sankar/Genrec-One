'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UserPlus } from 'lucide-react'

export default function OnboardingPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Onboarding</h1>
          <p className="text-muted-foreground">Manage new employee onboarding</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Employee Onboarding
            </CardTitle>
            <CardDescription>Track and manage new hire onboarding processes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Onboarding Dashboard</p>
              <p className="text-sm text-muted-foreground">New employee onboarding tasks and checklists</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
