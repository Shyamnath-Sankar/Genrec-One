'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FolderOpen } from 'lucide-react'

export default function AssetCategoriesPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Asset Categories</h1>
          <p className="text-muted-foreground">Manage asset classifications</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Categories
            </CardTitle>
            <CardDescription>Define asset types and depreciation rules</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Asset Categories</p>
              <p className="text-sm text-muted-foreground">Laptops, furniture, vehicles, and more</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
