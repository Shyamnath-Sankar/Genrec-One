'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus } from 'lucide-react'

export default function SubmitExpensePage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Submit Expense</h1>
          <p className="text-muted-foreground">Create a new expense claim</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              New Expense Claim
            </CardTitle>
            <CardDescription>Submit expenses for reimbursement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Plus className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Submit Claim</p>
              <p className="text-sm text-muted-foreground">Upload receipts and submit for approval</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
