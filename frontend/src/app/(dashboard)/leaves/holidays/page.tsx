'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CalendarDays } from 'lucide-react'

export default function HolidaysPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Holidays</h1>
          <p className="text-muted-foreground">Company holiday calendar</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Holiday Calendar
            </CardTitle>
            <CardDescription>View and manage company holidays</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CalendarDays className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Holiday List</p>
              <p className="text-sm text-muted-foreground">Public holidays and company-specific holidays</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
