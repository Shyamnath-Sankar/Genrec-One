'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FolderKanban } from 'lucide-react'

export default function ProjectsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">Manage projects for timesheet tracking</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5" />
              Project Management
            </CardTitle>
            <CardDescription>Create and manage projects for time tracking</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Projects</p>
              <p className="text-sm text-muted-foreground">Define projects, tasks, and assign team members</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
