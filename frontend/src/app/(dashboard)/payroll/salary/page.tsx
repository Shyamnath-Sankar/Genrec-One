'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign } from 'lucide-react'

export default function SalaryStructurePage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Salary Structure</h1>
          <p className="text-muted-foreground">Configure salary components and structures</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Salary Components
            </CardTitle>
            <CardDescription>Define earnings, deductions, and tax components</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Salary Configuration</p>
              <p className="text-sm text-muted-foreground">Manage salary structures, grades, and components</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
