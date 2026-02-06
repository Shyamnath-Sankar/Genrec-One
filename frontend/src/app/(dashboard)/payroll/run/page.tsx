'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Play } from 'lucide-react'

export default function RunPayrollPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Run Payroll</h1>
          <p className="text-muted-foreground">Process monthly payroll</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Payroll Processing
            </CardTitle>
            <CardDescription>Generate and process payroll for employees</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Play className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Payroll Run</p>
              <p className="text-sm text-muted-foreground">Calculate salaries, generate payslips, and process payments</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
