'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { apiClient } from '@/lib/api/client'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Users, Calendar, CheckCircle, XCircle, Clock, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addDays, subDays } from 'date-fns'
import { toast } from 'sonner'

type TeamMember = {
  employeeId: string
  employeeName: string
  employeeCode: string
  department: string | null
  designation: string | null
  date: string
  status: string
  checkInTime: string | null
  checkOutTime: string | null
  totalHours: number | null
}

type TeamSummary = {
  employeeId: string
  employeeName: string
  employeeCode: string
  presentDays: number
  absentDays: number
  leaveDays: number
  lateDays: number
  avgHours: number
  totalWorkingDays: number
}

export default function TeamAttendancePage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated } = useAuth()
  const [teamAttendance, setTeamAttendance] = useState<TeamMember[]>([])
  const [teamSummary, setTeamSummary] = useState<TeamSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily')
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
      return
    }

    if (isAuthenticated) {
      if (viewMode === 'daily') {
        fetchDailyAttendance()
      } else {
        fetchMonthlySummary()
      }
    }
  }, [authLoading, isAuthenticated, router, selectedDate, viewMode, selectedMonth, selectedYear])

  const fetchDailyAttendance = async () => {
    try {
      setIsLoading(true)
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const data = await apiClient.get<TeamMember[]>(`/attendance/team?target_date=${dateStr}`)
      setTeamAttendance(Array.isArray(data) ? data : [])
    } catch (error) {
      toast.error('Failed to fetch team attendance')
      console.error('Failed to fetch team attendance:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMonthlySummary = async () => {
    try {
      setIsLoading(true)
      const data = await apiClient.get<TeamSummary[]>(
        `/attendance/team/summary?month=${selectedMonth}&year=${selectedYear}`
      )
      setTeamSummary(Array.isArray(data) ? data : [])
    } catch (error) {
      toast.error('Failed to fetch team summary')
      console.error('Failed to fetch team summary:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return <Badge className="bg-green-100 text-green-800">Present</Badge>
      case 'ABSENT':
        return <Badge className="bg-red-100 text-red-800">Absent</Badge>
      case 'HALF_DAY':
        return <Badge className="bg-yellow-100 text-yellow-800">Half Day</Badge>
      case 'ON_LEAVE':
        return <Badge className="bg-blue-100 text-blue-800">On Leave</Badge>
      case 'HOLIDAY':
        return <Badge className="bg-purple-100 text-purple-800">Holiday</Badge>
      case 'WEEK_OFF':
        return <Badge className="bg-gray-100 text-gray-800">Week Off</Badge>
      case 'LATE':
        return <Badge className="bg-orange-100 text-orange-800">Late</Badge>
      case 'NOT_MARKED':
        return <Badge variant="secondary">Not Marked</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const goToPreviousDay = () => setSelectedDate(subDays(selectedDate, 1))
  const goToNextDay = () => setSelectedDate(addDays(selectedDate, 1))
  const goToToday = () => setSelectedDate(new Date())

  // Summary stats for daily view
  const presentCount = teamAttendance.filter(m => m.status === 'PRESENT').length
  const absentCount = teamAttendance.filter(m => m.status === 'ABSENT' || m.status === 'NOT_MARKED').length
  const onLeaveCount = teamAttendance.filter(m => m.status === 'ON_LEAVE').length
  const lateCount = teamAttendance.filter(m => m.status === 'LATE').length

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ]

  const years = [
    new Date().getFullYear() - 1,
    new Date().getFullYear(),
    new Date().getFullYear() + 1,
  ]

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Team Attendance</h1>
            <p className="text-muted-foreground">View attendance records for your team members</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 border rounded-lg p-1">
              <Button
                variant={viewMode === 'daily' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('daily')}
              >
                Daily
              </Button>
              <Button
                variant={viewMode === 'monthly' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('monthly')}
              >
                Monthly
              </Button>
            </div>
          </div>
        </div>

        {viewMode === 'daily' ? (
          <>
            {/* Date Navigation */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={goToPreviousDay}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <Input
                        type="date"
                        value={format(selectedDate, 'yyyy-MM-dd')}
                        onChange={(e) => setSelectedDate(new Date(e.target.value))}
                        className="w-auto"
                      />
                    </div>
                    <Button variant="outline" size="icon" onClick={goToNextDay}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button variant="outline" onClick={goToToday}>
                    Today
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Present</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{presentCount}</div>
                  <p className="text-xs text-muted-foreground">of {teamAttendance.length} team members</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Absent/Not Marked</CardTitle>
                  <XCircle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{absentCount}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">On Leave</CardTitle>
                  <Calendar className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{onLeaveCount}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Late</CardTitle>
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{lateCount}</div>
                </CardContent>
              </Card>
            </div>

            {/* Team Attendance Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Attendance - {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </CardTitle>
                <CardDescription>View daily attendance status for your team</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16" />
                    ))}
                  </div>
                ) : teamAttendance.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">No Team Members</p>
                    <p className="text-sm text-muted-foreground">
                      You don&apos;t have any team members reporting to you
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Check In</TableHead>
                        <TableHead>Check Out</TableHead>
                        <TableHead className="text-right">Hours</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teamAttendance.map((member) => (
                        <TableRow key={member.employeeId}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{member.employeeName}</p>
                              <p className="text-sm text-muted-foreground">{member.employeeCode}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p>{member.department || '-'}</p>
                              <p className="text-sm text-muted-foreground">{member.designation || '-'}</p>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(member.status)}</TableCell>
                          <TableCell>
                            {member.checkInTime
                              ? format(new Date(member.checkInTime), 'hh:mm a')
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {member.checkOutTime
                              ? format(new Date(member.checkOutTime), 'hh:mm a')
                              : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {member.totalHours ? `${member.totalHours.toFixed(2)}h` : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {/* Month/Year Selection */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Select
                    value={selectedMonth.toString()}
                    onValueChange={(v) => setSelectedMonth(parseInt(v))}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((m) => (
                        <SelectItem key={m.value} value={m.value.toString()}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={selectedYear.toString()}
                    onValueChange={(v) => setSelectedYear(parseInt(v))}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((y) => (
                        <SelectItem key={y} value={y.toString()}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Summary Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Monthly Summary - {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
                </CardTitle>
                <CardDescription>View monthly attendance statistics for your team</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16" />
                    ))}
                  </div>
                ) : teamSummary.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">No Team Members</p>
                    <p className="text-sm text-muted-foreground">
                      You don&apos;t have any team members reporting to you
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead className="text-center">Present</TableHead>
                        <TableHead className="text-center">Absent</TableHead>
                        <TableHead className="text-center">Leave</TableHead>
                        <TableHead className="text-center">Late</TableHead>
                        <TableHead className="text-center">Avg Hours</TableHead>
                        <TableHead className="text-center">Attendance %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teamSummary.map((member) => {
                        const attendancePercent = member.totalWorkingDays > 0
                          ? ((member.presentDays / member.totalWorkingDays) * 100).toFixed(1)
                          : 0
                        return (
                          <TableRow key={member.employeeId}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{member.employeeName}</p>
                                <p className="text-sm text-muted-foreground">{member.employeeCode}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-green-100 text-green-800">{member.presentDays}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-red-100 text-red-800">{member.absentDays}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-blue-100 text-blue-800">{member.leaveDays}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-orange-100 text-orange-800">{member.lateDays}</Badge>
                            </TableCell>
                            <TableCell className="text-center">{member.avgHours}h</TableCell>
                            <TableCell className="text-center">
                              <Badge
                                className={
                                  parseFloat(attendancePercent as string) >= 90
                                    ? 'bg-green-100 text-green-800'
                                    : parseFloat(attendancePercent as string) >= 75
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }
                              >
                                {attendancePercent}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
