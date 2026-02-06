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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Clock, CheckCircle, XCircle, Calendar, Timer, AlertCircle } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, isToday } from 'date-fns'
import { toast } from 'sonner'

type AttendanceData = {
  date: string
  status: string
  checkInTime: string | null
  checkOutTime: string | null
  totalHours: number | null
}

type AttendanceHistory = {
  id: string
  date: string
  status: string
  checkInTime: string | null
  checkOutTime: string | null
  totalHours: number | null
}

export default function AttendancePage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated } = useAuth()
  const [todayAttendance, setTodayAttendance] = useState<AttendanceData | null>(null)
  const [history, setHistory] = useState<AttendanceHistory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCheckingIn, setIsCheckingIn] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)

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
      const [todayData, historyData] = await Promise.all([
        apiClient.get<AttendanceData>('/attendance/today'),
        apiClient.get<AttendanceHistory[]>('/attendance/history'),
      ])
      setTodayAttendance(todayData)
      setHistory(Array.isArray(historyData) ? historyData : [])
    } catch (error) {
      console.error('Failed to fetch attendance:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCheckIn = async () => {
    setIsCheckingIn(true)

    try {
      // Get current position
      let latitude: number | undefined
      let longitude: number | undefined
      
      if (navigator.geolocation) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject)
        }).catch(() => null)

        if (position) {
          latitude = position.coords.latitude
          longitude = position.coords.longitude
        }
      }

      await apiClient.post('/attendance/check-in', {
        latitude,
        longitude,
        source: 'WEB',
      })

      toast.success('Checked in successfully!')
      fetchData()
    } catch (error) {
      toast.error('Check-in failed. Please try again.')
      console.error('Check-in failed:', error)
    } finally {
      setIsCheckingIn(false)
    }
  }

  const handleCheckOut = async () => {
    setIsCheckingOut(true)

    try {
      await apiClient.post('/attendance/check-out', {})
      toast.success('Checked out successfully!')
      fetchData()
    } catch (error) {
      toast.error('Check-out failed. Please try again.')
      console.error('Check-out failed:', error)
    } finally {
      setIsCheckingOut(false)
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

  const canCheckIn = !todayAttendance?.checkInTime
  const canCheckOut = todayAttendance?.checkInTime && !todayAttendance?.checkOutTime

  // Calculate summary
  const presentDays = history.filter((h) => h.status === 'PRESENT').length
  const absentDays = history.filter((h) => h.status === 'ABSENT').length
  const avgHours = history.length > 0
    ? history.reduce((sum, h) => sum + (h.totalHours || 0), 0) / history.filter((h) => h.totalHours).length
    : 0

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
          <p className="text-muted-foreground">Mark your daily attendance and view history</p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Present Days</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{presentDays}</div>
              <p className="text-xs text-muted-foreground">this month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Absent Days</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{absentDays}</div>
              <p className="text-xs text-muted-foreground">this month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Hours</CardTitle>
              <Timer className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgHours.toFixed(1)}h</div>
              <p className="text-xs text-muted-foreground">per day</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Late Arrivals</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {history.filter((h) => h.status === 'LATE').length}
              </div>
              <p className="text-xs text-muted-foreground">this month</p>
            </CardContent>
          </Card>
        </div>

        {/* Today's Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Today - {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-12 w-48" />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  {getStatusBadge(todayAttendance?.status || 'NOT_MARKED')}
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Check In</p>
                    <p className="text-xl font-semibold">
                      {todayAttendance?.checkInTime
                        ? format(new Date(todayAttendance.checkInTime), 'hh:mm a')
                        : '--:--'}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Check Out</p>
                    <p className="text-xl font-semibold">
                      {todayAttendance?.checkOutTime
                        ? format(new Date(todayAttendance.checkOutTime), 'hh:mm a')
                        : '--:--'}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Total Hours</p>
                    <p className="text-xl font-semibold">
                      {todayAttendance?.totalHours
                        ? `${todayAttendance.totalHours.toFixed(2)} hrs`
                        : '--:--'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  {canCheckIn && (
                    <Button
                      size="lg"
                      onClick={handleCheckIn}
                      disabled={isCheckingIn}
                      className="gap-2"
                    >
                      <CheckCircle className="h-5 w-5" />
                      {isCheckingIn ? 'Checking In...' : 'Check In'}
                    </Button>
                  )}
                  {canCheckOut && (
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={handleCheckOut}
                      disabled={isCheckingOut}
                      className="gap-2"
                    >
                      <XCircle className="h-5 w-5" />
                      {isCheckingOut ? 'Checking Out...' : 'Check Out'}
                    </Button>
                  )}
                  {!canCheckIn && !canCheckOut && (
                    <p className="text-muted-foreground">
                      You have completed your attendance for today.
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Attendance History
            </CardTitle>
            <CardDescription>Your attendance records for this month</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No records found</p>
                <p className="text-sm text-muted-foreground">
                  Your attendance history will appear here
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead className="text-right">Total Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.slice(0, 15).map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {format(new Date(record.date), 'EEE, dd MMM yyyy')}
                      </TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell>
                        {record.checkInTime
                          ? format(new Date(record.checkInTime), 'hh:mm a')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {record.checkOutTime
                          ? format(new Date(record.checkOutTime), 'hh:mm a')
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {record.totalHours ? `${record.totalHours.toFixed(2)}h` : '-'}
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
