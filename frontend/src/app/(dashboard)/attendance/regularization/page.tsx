'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ClipboardEdit } from 'lucide-react'

export default function RegularizationPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Regularization</h1>
          <p className="text-muted-foreground">Request attendance corrections</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardEdit className="h-5 w-5" />
              Attendance Regularization
            </CardTitle>
            <CardDescription>Submit requests to correct attendance entries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ClipboardEdit className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Regularization Requests</p>
              <p className="text-sm text-muted-foreground">Submit and track attendance correction requests</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
