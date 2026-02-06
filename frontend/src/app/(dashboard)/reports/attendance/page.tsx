'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { apiClient } from '@/lib/api/client'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft,
  Download,
  Filter,
  Clock,
  TrendingUp,
  Users,
  Calendar,
  BarChart3,
} from 'lucide-react'
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns'

type Department = {
  id: string
  name: string
}

type AttendanceReportData = {
  employeeId: string
  employeeName: string
  department: string
  totalWorkingDays: number
  presentDays: number
  absentDays: number
  lateDays: number
  averageHours: number
  attendancePercentage: number
}

type AttendanceSummary = {
  totalEmployees: number
  averageAttendance: number
  totalLateArrivals: number
  totalAbsences: number
}

export default function AttendanceReportPage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated } = useAuth()
  const [departments, setDepartments] = useState<Department[]>([])
  const [reportData, setReportData] = useState<AttendanceReportData[]>([])
  const [summary, setSummary] = useState<AttendanceSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)

  const [filters, setFilters] = useState({
    departmentId: 'all',
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  })

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
      return
    }

    if (isAuthenticated) {
      fetchInitialData()
    }
  }, [authLoading, isAuthenticated, router])

  const fetchInitialData = async () => {
    try {
      setIsLoading(true)
      const depts = await apiClient.get<Department[]>('/departments/list')
      setDepartments(Array.isArray(depts) ? depts : [])
      await generateReport()
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateReport = async () => {
    try {
      setIsGenerating(true)
      const params = new URLSearchParams({
        startDate: filters.startDate,
        endDate: filters.endDate,
        ...(filters.departmentId !== 'all' && { departmentId: filters.departmentId }),
      })
      
      const [data, summaryData] = await Promise.all([
        apiClient.get<AttendanceReportData[]>(`/reports/attendance?${params}`),
        apiClient.get<AttendanceSummary>(`/reports/attendance/summary?${params}`),
      ])
      
      setReportData(Array.isArray(data) ? data : [])
      setSummary(summaryData)
    } catch (error) {
      console.error('Failed to generate report:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      // In a real app, this would trigger a file download
      const params = new URLSearchParams({
        startDate: filters.startDate,
        endDate: filters.endDate,
        format,
        ...(filters.departmentId !== 'all' && { departmentId: filters.departmentId }),
      })
      window.open(`/api/reports/attendance/export?${params}`, '_blank')
    } catch (error) {
      console.error('Failed to export:', error)
    }
  }

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/reports')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">Attendance Report</h1>
            <p className="text-muted-foreground">
              Analyze attendance patterns and trends across the organization
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleExport('csv')}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={() => handleExport('pdf')}>
              <Download className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Report Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={filters.departmentId}
                  onValueChange={(value) => setFilters({ ...filters, departmentId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={generateReport} disabled={isGenerating} className="w-full">
                  {isGenerating ? 'Generating...' : 'Generate Report'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        {summary && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalEmployees}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Attendance</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.averageAttendance.toFixed(1)}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Late Arrivals</CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalLateArrivals}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Absences</CardTitle>
                <Calendar className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalAbsences}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Report Table */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Details</CardTitle>
            <CardDescription>
              Individual attendance records for the selected period
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading || isGenerating ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : reportData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No data available</p>
                <p className="text-sm text-muted-foreground">
                  Adjust filters and generate the report
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-center">Working Days</TableHead>
                    <TableHead className="text-center">Present</TableHead>
                    <TableHead className="text-center">Absent</TableHead>
                    <TableHead className="text-center">Late</TableHead>
                    <TableHead className="text-center">Avg Hours</TableHead>
                    <TableHead className="text-center">Attendance %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((row) => (
                    <TableRow key={row.employeeId}>
                      <TableCell className="font-medium">{row.employeeName}</TableCell>
                      <TableCell>{row.department}</TableCell>
                      <TableCell className="text-center">{row.totalWorkingDays}</TableCell>
                      <TableCell className="text-center text-green-600">{row.presentDays}</TableCell>
                      <TableCell className="text-center text-red-600">{row.absentDays}</TableCell>
                      <TableCell className="text-center text-yellow-600">{row.lateDays}</TableCell>
                      <TableCell className="text-center">{row.averageHours.toFixed(1)}h</TableCell>
                      <TableCell className="text-center">
                        <span
                          className={
                            row.attendancePercentage >= 90
                              ? 'text-green-600'
                              : row.attendancePercentage >= 75
                              ? 'text-yellow-600'
                              : 'text-red-600'
                          }
                        >
                          {row.attendancePercentage.toFixed(1)}%
                        </span>
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
