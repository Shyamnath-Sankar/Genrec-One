'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock } from 'lucide-react'

export default function OvertimePage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overtime</h1>
          <p className="text-muted-foreground">Track and manage overtime hours</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Overtime Management
            </CardTitle>
            <CardDescription>View and submit overtime requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Overtime Tracking</p>
              <p className="text-sm text-muted-foreground">Log extra hours and overtime requests</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
