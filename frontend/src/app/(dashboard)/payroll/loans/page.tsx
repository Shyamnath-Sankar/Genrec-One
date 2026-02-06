'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Wallet } from 'lucide-react'

export default function LoansPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Loans</h1>
          <p className="text-muted-foreground">Manage employee loans and advances</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Loan Management
            </CardTitle>
            <CardDescription>Track loans, advances, and repayments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Employee Loans</p>
              <p className="text-sm text-muted-foreground">Apply for loans and track repayment schedules</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
