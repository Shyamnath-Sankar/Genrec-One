'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckSquare } from 'lucide-react'

export default function ExpenseApprovalsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expense Approvals</h1>
          <p className="text-muted-foreground">Review expense claims</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              Pending Approvals
            </CardTitle>
            <CardDescription>Approve or reject expense claims</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Review Claims</p>
              <p className="text-sm text-muted-foreground">Process pending expense reimbursements</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
