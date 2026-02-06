'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ClipboardList } from 'lucide-react'

export default function AppraisalsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Appraisals</h1>
          <p className="text-muted-foreground">Performance reviews and evaluations</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Performance Appraisals
            </CardTitle>
            <CardDescription>View and complete performance reviews</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Appraisal Reviews</p>
              <p className="text-sm text-muted-foreground">Annual reviews and performance evaluations</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
