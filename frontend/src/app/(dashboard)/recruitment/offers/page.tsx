'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText } from 'lucide-react'

export default function OffersPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Offers</h1>
          <p className="text-muted-foreground">Manage job offers</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Offer Management
            </CardTitle>
            <CardDescription>Create and track offer letters</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Offer Letters</p>
              <p className="text-sm text-muted-foreground">Generate offers and track acceptance status</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
