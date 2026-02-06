'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { apiClient } from '@/lib/api/client'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Users,
  UserCheck,
  UserX,
  Calendar,
  Clock,
  TrendingUp,
  AlertCircle,
  FileText,
} from 'lucide-react'

type DashboardStats = {
  total_employees: number
  present_today: number
  on_leave: number
  absent: number
  new_joinees_this_month: number
}

export default function DashboardPage() {
  const router = useRouter()
  const { employee, isLoading: authLoading, isAuthenticated } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
      return
    }

    if (isAuthenticated) {
      const fetchStats = async () => {
        try {
          const result = await apiClient.get<{ data: DashboardStats }>('/reports/dashboard')
          setStats((result as { data: DashboardStats }).data)
        } catch (error) {
          console.error('Failed to fetch stats:', error)
        } finally {
          setIsLoading(false)
        }
      }

      fetchStats()
    }
  }, [authLoading, isAuthenticated, router])

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const statCards = [
    {
      title: 'Total Employees',
      value: stats?.total_employees || 0,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Present Today',
      value: stats?.present_today || 0,
      icon: UserCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'On Leave',
      value: stats?.on_leave || 0,
      icon: Calendar,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      title: 'Absent',
      value: stats?.absent || 0,
      icon: UserX,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
  ]

  const quickActions = [
    { label: 'Mark Attendance', href: '/attendance', icon: Clock },
    { label: 'Apply Leave', href: '/leaves/apply', icon: Calendar },
    { label: 'View Payslip', href: '/payroll', icon: FileText },
    { label: 'Submit Expense', href: '/expenses/submit', icon: TrendingUp },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {employee?.firstName || 'User'}!
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s what&apos;s happening in your organization today.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`rounded-full p-2 ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{stat.value}</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  className="h-auto flex-col gap-2 py-4"
                  onClick={() => router.push(action.href)}
                >
                  <action.icon className="h-6 w-6" />
                  <span>{action.label}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity & Announcements */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-sm">
                  <div className="rounded-full bg-green-100 p-2">
                    <Clock className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">Checked in at 9:15 AM</p>
                    <p className="text-muted-foreground">Today</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="rounded-full bg-blue-100 p-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Leave approved for Feb 10-12</p>
                    <p className="text-muted-foreground">Yesterday</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="rounded-full bg-purple-100 p-2">
                    <FileText className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium">Payslip available for January</p>
                    <p className="text-muted-foreground">2 days ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Announcements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-4 text-sm">
                  <div className="rounded-full bg-yellow-100 p-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-medium">Holiday Notice</p>
                    <p className="text-muted-foreground">
                      Office will be closed on February 26 for Republic Day.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4 text-sm">
                  <div className="rounded-full bg-blue-100 p-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Quarterly Review</p>
                    <p className="text-muted-foreground">
                      Performance reviews for Q4 are now open.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
