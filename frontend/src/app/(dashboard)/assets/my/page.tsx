'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Package } from 'lucide-react'

export default function MyAssetsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Assets</h1>
          <p className="text-muted-foreground">Assets assigned to you</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Assigned Assets
            </CardTitle>
            <CardDescription>Equipment and assets in your custody</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Your Assets</p>
              <p className="text-sm text-muted-foreground">View laptops, phones, and other assigned equipment</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
