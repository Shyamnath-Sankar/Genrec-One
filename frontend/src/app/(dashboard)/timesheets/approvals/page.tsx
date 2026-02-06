'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckSquare } from 'lucide-react'

export default function TimesheetApprovalsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Timesheet Approvals</h1>
          <p className="text-muted-foreground">Review and approve timesheets</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              Pending Approvals
            </CardTitle>
            <CardDescription>Approve or reject timesheet submissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Timesheet Approvals</p>
              <p className="text-sm text-muted-foreground">Review team timesheets and billable hours</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
