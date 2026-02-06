'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RefreshCw } from 'lucide-react'

export default function CyclesPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Performance Cycles</h1>
          <p className="text-muted-foreground">Manage review cycles and calibration</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Review Cycles
            </CardTitle>
            <CardDescription>Configure and run performance review cycles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <RefreshCw className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Cycle Management</p>
              <p className="text-sm text-muted-foreground">Set up quarterly or annual review cycles</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
