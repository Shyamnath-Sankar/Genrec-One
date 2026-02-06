'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from 'lucide-react'

export default function LeaveTypesPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leave Types</h1>
          <p className="text-muted-foreground">Configure leave categories and policies</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Leave Type Configuration
            </CardTitle>
            <CardDescription>Manage leave types, quotas, and accrual rules</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Leave Types</p>
              <p className="text-sm text-muted-foreground">Configure annual leave, sick leave, and custom types</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
