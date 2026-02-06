'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users } from 'lucide-react'

export default function TeamLeavesPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team Leaves</h1>
          <p className="text-muted-foreground">View team leave requests and calendar</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Leave Overview
            </CardTitle>
            <CardDescription>Monitor leave requests from your team</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Team Leave Calendar</p>
              <p className="text-sm text-muted-foreground">View and approve team leave requests</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
