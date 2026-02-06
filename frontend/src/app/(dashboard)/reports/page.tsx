'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { apiClient } from '@/lib/api/client'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BarChart3,
  Download,
  Users,
  Clock,
  Calendar,
  DollarSign,
  TrendingUp,
  PieChart,
} from 'lucide-react'

type ReportData = {
  attendanceReport?: {
    presentDays: number
    absentDays: number
    lateDays: number
    averageHours: number
  }
  leaveReport?: {
    totalLeaves: number
    approved: number
    pending: number
    rejected: number
    byType: { type: string; count: number }[]
  }
  payrollReport?: {
    totalGross: number
    totalDeductions: number
    totalNet: number
    headcount: number
  }
  headcountReport?: {
    total: number
    byDepartment: { department: string; count: number }[]
    byStatus: { status: string; count: number }[]
    newJoinees: number
    attrition: number
  }
}

export default function ReportsPage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated, hasPermission } = useAuth()
  const [reportData, setReportData] = useState<ReportData>({})
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
      return
    }

    if (isAuthenticated && hasPermission('reports.view')) {
      fetchReports()
    } else {
      setIsLoading(false)
    }
  }, [authLoading, isAuthenticated, router, selectedMonth, selectedYear])

  const fetchReports = async () => {
    try {
      setIsLoading(true)
      const [attendance, leave, payroll, headcount] = await Promise.all([
        apiClient.get(`/reports/attendance?month=${selectedMonth}&year=${selectedYear}`),
        apiClient.get(`/reports/leave?month=${selectedMonth}&year=${selectedYear}`),
        apiClient.get(`/reports/payroll?month=${selectedMonth}&year=${selectedYear}`),
        apiClient.get('/reports/headcount'),
      ])
      setReportData({
        attendanceReport: attendance as ReportData['attendanceReport'],
        leaveReport: leave as ReportData['leaveReport'],
        payrollReport: payroll as ReportData['payrollReport'],
        headcountReport: headcount as ReportData['headcountReport'],
      })
    } catch (error) {
      console.error('Failed to fetch reports:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!hasPermission('reports.view')) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold">Access Restricted</h2>
          <p className="text-muted-foreground">
            You don't have permission to view reports
          </p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
            <p className="text-muted-foreground">Analytics and insights across modules</p>
          </div>
          <div className="flex gap-4">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((month, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="leave">Leave</TabsTrigger>
            <TabsTrigger value="payroll">Payroll</TabsTrigger>
            <TabsTrigger value="headcount">Headcount</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            {/* Overview Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                  <Users className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {reportData.headcountReport?.total || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Active workforce</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Attendance</CardTitle>
                  <Clock className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {reportData.attendanceReport?.averageHours || 0}h
                  </div>
                  <p className="text-xs text-muted-foreground">Daily average</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Leaves This Month</CardTitle>
                  <Calendar className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {reportData.leaveReport?.totalLeaves || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Total applications</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Payroll Cost</CardTitle>
                  <DollarSign className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${((reportData.payrollReport?.totalNet || 0) / 1000).toFixed(0)}K
                  </div>
                  <p className="text-xs text-muted-foreground">Net salary</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Placeholder */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Attendance Trend</CardTitle>
                  <CardDescription>Monthly attendance statistics</CardDescription>
                </CardHeader>
                <CardContent className="h-64 flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-2" />
                    <p>Chart visualization would go here</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Department Distribution</CardTitle>
                  <CardDescription>Headcount by department</CardDescription>
                </CardHeader>
                <CardContent className="h-64 flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <PieChart className="h-12 w-12 mx-auto mb-2" />
                    <p>Chart visualization would go here</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="attendance" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Report</CardTitle>
                <CardDescription>
                  {months[parseInt(selectedMonth)]} {selectedYear}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-64" />
                ) : (
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-3xl font-bold text-green-600">
                        {reportData.attendanceReport?.presentDays || 0}
                      </div>
                      <p className="text-sm text-muted-foreground">Present Days</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-3xl font-bold text-red-600">
                        {reportData.attendanceReport?.absentDays || 0}
                      </div>
                      <p className="text-sm text-muted-foreground">Absent Days</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-3xl font-bold text-yellow-600">
                        {reportData.attendanceReport?.lateDays || 0}
                      </div>
                      <p className="text-sm text-muted-foreground">Late Days</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-3xl font-bold text-blue-600">
                        {reportData.attendanceReport?.averageHours || 0}h
                      </div>
                      <p className="text-sm text-muted-foreground">Avg Hours/Day</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leave" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Leave Report</CardTitle>
                <CardDescription>
                  {months[parseInt(selectedMonth)]} {selectedYear}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-64" />
                ) : (
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-3xl font-bold text-blue-600">
                        {reportData.leaveReport?.totalLeaves || 0}
                      </div>
                      <p className="text-sm text-muted-foreground">Total Requests</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-3xl font-bold text-green-600">
                        {reportData.leaveReport?.approved || 0}
                      </div>
                      <p className="text-sm text-muted-foreground">Approved</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-3xl font-bold text-yellow-600">
                        {reportData.leaveReport?.pending || 0}
                      </div>
                      <p className="text-sm text-muted-foreground">Pending</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-3xl font-bold text-red-600">
                        {reportData.leaveReport?.rejected || 0}
                      </div>
                      <p className="text-sm text-muted-foreground">Rejected</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payroll" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Payroll Report</CardTitle>
                <CardDescription>
                  {months[parseInt(selectedMonth)]} {selectedYear}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-64" />
                ) : (
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-3xl font-bold text-green-600">
                        ${(reportData.payrollReport?.totalGross || 0).toLocaleString()}
                      </div>
                      <p className="text-sm text-muted-foreground">Gross Salary</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-3xl font-bold text-red-600">
                        ${(reportData.payrollReport?.totalDeductions || 0).toLocaleString()}
                      </div>
                      <p className="text-sm text-muted-foreground">Deductions</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-3xl font-bold text-blue-600">
                        ${(reportData.payrollReport?.totalNet || 0).toLocaleString()}
                      </div>
                      <p className="text-sm text-muted-foreground">Net Salary</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-3xl font-bold text-purple-600">
                        {reportData.payrollReport?.headcount || 0}
                      </div>
                      <p className="text-sm text-muted-foreground">Employees Paid</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="headcount" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Headcount Report</CardTitle>
                <CardDescription>Current workforce analytics</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-64" />
                ) : (
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-3xl font-bold text-blue-600">
                        {reportData.headcountReport?.total || 0}
                      </div>
                      <p className="text-sm text-muted-foreground">Total Employees</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-3xl font-bold text-green-600">
                        {reportData.headcountReport?.newJoinees || 0}
                      </div>
                      <p className="text-sm text-muted-foreground">New Joinees (MTD)</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-3xl font-bold text-red-600">
                        {reportData.headcountReport?.attrition || 0}
                      </div>
                      <p className="text-sm text-muted-foreground">Attrition (MTD)</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-3xl font-bold text-purple-600">
                        {reportData.headcountReport?.byDepartment?.length || 0}
                      </div>
                      <p className="text-sm text-muted-foreground">Departments</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
