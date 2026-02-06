'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users } from 'lucide-react'

export default function TeamAttendancePage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team Attendance</h1>
          <p className="text-muted-foreground">View team attendance records</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Attendance Overview
            </CardTitle>
            <CardDescription>Monitor your team&apos;s attendance patterns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Team Attendance</p>
              <p className="text-sm text-muted-foreground">View and manage attendance for your team members</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
