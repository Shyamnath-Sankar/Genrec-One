'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users } from 'lucide-react'

export default function CandidatesPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Candidates</h1>
          <p className="text-muted-foreground">Manage job applicants</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Candidate Pipeline
            </CardTitle>
            <CardDescription>Track candidates through the hiring process</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">All Candidates</p>
              <p className="text-sm text-muted-foreground">View and manage applicants across all job openings</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
