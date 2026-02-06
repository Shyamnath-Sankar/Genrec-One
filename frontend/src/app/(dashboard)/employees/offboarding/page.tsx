'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UserMinus } from 'lucide-react'

export default function OffboardingPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Offboarding</h1>
          <p className="text-muted-foreground">Manage employee exits</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserMinus className="h-5 w-5" />
              Employee Offboarding
            </CardTitle>
            <CardDescription>Track and manage employee exit processes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <UserMinus className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Offboarding Dashboard</p>
              <p className="text-sm text-muted-foreground">Exit interviews, asset returns, and clearance</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
