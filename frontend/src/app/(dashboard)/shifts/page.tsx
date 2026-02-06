'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { apiClient } from '@/lib/api/client'
import {
  Clock,
  Sun,
  Moon,
  Calendar,
  Users,
  Settings,
  Plus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

type Shift = {
  id: string
  name: string
  code: string
  startTime: string
  endTime: string
  graceMinutes: number
  halfDayHours: number
  fullDayHours: number
  breakDuration: number
  isNightShift: boolean
  isFlexible: boolean
  isActive: boolean
}

type ShiftAssignment = {
  id: string
  employeeId: string
  employeeName: string
  shiftId: string
  shiftName: string
  effectiveFrom: string
  effectiveTo: string | null
  isDefault: boolean
}

type MyShift = {
  assignmentId: string
  shift: {
    id: string
    name: string
    code: string
    startTime: string
    endTime: string
    isNightShift: boolean
    isFlexible: boolean
  }
  effectiveFrom: string
  effectiveTo: string | null
}

export default function ShiftsPage() {
  const [activeTab, setActiveTab] = useState('my-shift')
  const [shifts, setShifts] = useState<Shift[]>([])
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([])
  const [myShift, setMyShift] = useState<MyShift | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showNewShift, setShowNewShift] = useState(false)
  const [currentWeek, setCurrentWeek] = useState(new Date())

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [shiftsRes, myShiftRes] = await Promise.all([
        apiClient.get<{ data: Shift[] }>('/shifts'),
        apiClient.get<{ data: MyShift }>('/shifts/my-shift'),
      ])
      setShifts((shiftsRes as { data: Shift[] }).data || [])
      setMyShift((myShiftRes as { data: MyShift }).data || null)
    } catch (error) {
      console.error('Failed to fetch shifts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getWeekDates = () => {
    const dates = []
    const startOfWeek = new Date(currentWeek)
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1) // Monday

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(date.getDate() + i)
      dates.push(date)
    }
    return dates
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeek)
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
    setCurrentWeek(newDate)
  }

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '-'
    const [hours, minutes] = timeStr.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Shift Management</h1>
            <p className="text-muted-foreground">Manage shifts, assignments, and rosters</p>
          </div>
          <Button onClick={() => setShowNewShift(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Shift
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="my-shift">My Shift</TabsTrigger>
            <TabsTrigger value="all-shifts">All Shifts</TabsTrigger>
            <TabsTrigger value="roster">Roster</TabsTrigger>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
          </TabsList>

          <TabsContent value="my-shift" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Your Current Shift
                </CardTitle>
              </CardHeader>
              <CardContent>
                {myShift?.shift ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className={`p-4 rounded-lg ${myShift.shift.isNightShift ? 'bg-indigo-100' : 'bg-yellow-100'}`}>
                        {myShift.shift.isNightShift ? (
                          <Moon className="h-8 w-8 text-indigo-600" />
                        ) : (
                          <Sun className="h-8 w-8 text-yellow-600" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{myShift.shift.name}</h3>
                        <p className="text-muted-foreground">Code: {myShift.shift.code}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Start Time</p>
                        <p className="text-lg font-medium">{formatTime(myShift.shift.startTime)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">End Time</p>
                        <p className="text-lg font-medium">{formatTime(myShift.shift.endTime)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Effective From</p>
                        <p className="text-lg font-medium">
                          {new Date(myShift.effectiveFrom).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Type</p>
                        <div className="flex gap-2">
                          {myShift.shift.isNightShift && <Badge>Night Shift</Badge>}
                          {myShift.shift.isFlexible && <Badge variant="outline">Flexible</Badge>}
                          {!myShift.shift.isNightShift && !myShift.shift.isFlexible && (
                            <Badge variant="secondary">Regular</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No shift assigned</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Weekly View */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>This Week</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2">
                  {getWeekDates().map((date) => {
                    const isToday = date.toDateString() === new Date().toDateString()
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6
                    return (
                      <div
                        key={date.toISOString()}
                        className={`p-3 rounded-lg text-center ${
                          isToday ? 'bg-primary text-primary-foreground' :
                          isWeekend ? 'bg-gray-100' : 'bg-gray-50'
                        }`}
                      >
                        <p className="text-xs">{date.toLocaleDateString('en-US', { weekday: 'short' })}</p>
                        <p className="text-lg font-bold">{date.getDate()}</p>
                        <p className="text-xs mt-1">
                          {isWeekend ? 'Off' : myShift?.shift?.code || '-'}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all-shifts" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {shifts.map((shift) => (
                <Card key={shift.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{shift.name}</span>
                      {shift.isNightShift ? (
                        <Moon className="h-5 w-5 text-indigo-500" />
                      ) : (
                        <Sun className="h-5 w-5 text-yellow-500" />
                      )}
                    </CardTitle>
                    <CardDescription>Code: {shift.code}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Timing</span>
                        <span className="font-medium">
                          {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Working Hours</span>
                        <span className="font-medium">{shift.fullDayHours}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Grace Period</span>
                        <span className="font-medium">{shift.graceMinutes} min</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Break</span>
                        <span className="font-medium">{shift.breakDuration} min</span>
                      </div>
                      <div className="flex gap-2 mt-4">
                        {shift.isFlexible && <Badge variant="outline">Flexible</Badge>}
                        {shift.isNightShift && <Badge>Night Shift</Badge>}
                        {!shift.isActive && <Badge variant="destructive">Inactive</Badge>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {shifts.length === 0 && (
                <Card className="col-span-full">
                  <CardContent className="py-8 text-center">
                    <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No shifts configured yet.</p>
                    <Button className="mt-4" onClick={() => setShowNewShift(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Shift
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="roster" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Weekly Roster
                </CardTitle>
                <CardDescription>
                  View and manage shift assignments for the week
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Select a date range and department to view the roster
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assignments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Shift Assignments
                </CardTitle>
                <CardDescription>
                  Manage employee shift assignments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    View and manage shift assignments for employees
                  </p>
                  <Button className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Assign Shift
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
