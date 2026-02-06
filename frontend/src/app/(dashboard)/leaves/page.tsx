'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/use-auth'
import { apiClient } from '@/lib/api/client'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Calendar, Plus, Clock, CheckCircle, XCircle, CalendarDays } from 'lucide-react'
import { format } from 'date-fns'

type LeaveBalance = {
  leaveTypeId: string
  leaveTypeName: string
  leaveTypeCode: string
  color: string | null
  currentBalance: number
  utilized: number
  openingBalance: number
  accrued: number
}

type LeaveApplication = {
  id: string
  leaveTypeName: string
  fromDate: string
  toDate: string
  totalDays: number
  reason: string
  status: string
  createdAt: string
}

export default function LeavesPage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated } = useAuth()
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [applications, setApplications] = useState<LeaveApplication[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
      return
    }

    if (isAuthenticated) {
      fetchData()
    }
  }, [authLoading, isAuthenticated, router])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const [balanceData, appResult] = await Promise.all([
        apiClient.get<LeaveBalance[]>('/leaves/balance'),
        apiClient.getPaginated<LeaveApplication>('/leaves/applications'),
      ])
      setBalances(Array.isArray(balanceData) ? balanceData : [])
      setApplications(appResult.data || [])
    } catch (error) {
      console.error('Failed to fetch leave data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>
      case 'CANCELLED':
        return <Badge className="bg-gray-100 text-gray-800">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Calculate totals
  const totalBalance = balances.reduce((sum, b) => sum + b.currentBalance, 0)
  const totalUsed = balances.reduce((sum, b) => sum + b.utilized, 0)
  const pendingApps = applications.filter((a) => a.status === 'PENDING').length

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Leaves</h1>
            <p className="text-muted-foreground">Manage your leave applications and balance</p>
          </div>
          <Button asChild>
            <Link href="/leaves/apply">
              <Plus className="mr-2 h-4 w-4" />
              Apply Leave
            </Link>
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalBalance} days</div>
              <p className="text-xs text-muted-foreground">across all types</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Used This Year</CardTitle>
              <CalendarDays className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsed} days</div>
              <p className="text-xs text-muted-foreground">utilized</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingApps}</div>
              <p className="text-xs text-muted-foreground">awaiting approval</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
              <CheckCircle className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{applications.length}</div>
              <p className="text-xs text-muted-foreground">this year</p>
            </CardContent>
          </Card>
        </div>

        {/* Leave Balances */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Leave Balance by Type</h2>
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : balances.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No leave balances found
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {balances.map((balance) => {
                const total = balance.openingBalance + balance.accrued
                const used = balance.utilized
                const percent = total > 0 ? (used / total) * 100 : 0

                return (
                  <Card key={balance.leaveTypeId}>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: balance.color || '#6366f1' }}
                        />
                        {balance.leaveTypeName}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Balance</span>
                          <span className="font-medium">
                            {balance.currentBalance} / {total} days
                          </span>
                        </div>
                        <Progress value={100 - percent} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Used: {used} days</span>
                          <span>Available: {balance.currentBalance} days</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Leave Applications */}
        <Card>
          <CardHeader>
            <CardTitle>Leave Applications</CardTitle>
            <CardDescription>Your recent leave requests</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : applications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No applications yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Apply for leave when you need time off
                </p>
                <Button asChild>
                  <Link href="/leaves/apply">Apply Now</Link>
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Applied On</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell className="font-medium">{app.leaveTypeName}</TableCell>
                      <TableCell>{format(new Date(app.fromDate), 'dd MMM yyyy')}</TableCell>
                      <TableCell>{format(new Date(app.toDate), 'dd MMM yyyy')}</TableCell>
                      <TableCell>{app.totalDays}</TableCell>
                      <TableCell className="max-w-xs truncate">{app.reason}</TableCell>
                      <TableCell>{getStatusBadge(app.status)}</TableCell>
                      <TableCell>
                        {format(new Date(app.createdAt), 'dd MMM yyyy')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
