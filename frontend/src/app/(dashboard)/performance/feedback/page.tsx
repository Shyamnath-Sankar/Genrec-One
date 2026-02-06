'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare } from 'lucide-react'

export default function FeedbackPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Feedback</h1>
          <p className="text-muted-foreground">Give and receive feedback</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              360 Feedback
            </CardTitle>
            <CardDescription>Continuous feedback and recognition</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Feedback Portal</p>
              <p className="text-sm text-muted-foreground">Share and receive constructive feedback</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
