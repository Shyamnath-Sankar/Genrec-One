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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Clock, Plus, Calendar, Timer, CheckCircle } from 'lucide-react'
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns'

type Project = {
  id: string
  name: string
  code: string
  status: string
}

type TimesheetEntry = {
  id: string
  projectId: string
  project: Project
  taskDescription: string
  date: string
  hours: number
  status: string
  createdAt: string
}

export default function TimesheetsPage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated } = useAuth()
  const [entries, setEntries] = useState<TimesheetEntry[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())

  // Form state
  const [newEntry, setNewEntry] = useState({
    projectId: '',
    taskDescription: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    hours: 8,
  })

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
      const [entriesData, projectsData] = await Promise.all([
        apiClient.get<TimesheetEntry[]>('/timesheets/entries'),
        apiClient.get<Project[]>('/timesheets/projects'),
      ])
      setEntries(Array.isArray(entriesData) ? entriesData : [])
      setProjects(Array.isArray(projectsData) ? projectsData : [])
    } catch (error) {
      console.error('Failed to fetch timesheet data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      await apiClient.post('/timesheets/entries', newEntry)
      setIsDialogOpen(false)
      setNewEntry({
        projectId: '',
        taskDescription: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        hours: 8,
      })
      fetchData()
    } catch (error) {
      console.error('Failed to create entry:', error)
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
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Calculate weekly summary
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const totalHoursThisWeek = entries
    .filter((e) => {
      const date = new Date(e.date)
      return date >= weekStart && date <= weekEnd
    })
    .reduce((sum, e) => sum + e.hours, 0)

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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Timesheets</h1>
            <p className="text-muted-foreground">Track your working hours and project time</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Log Time
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log Time Entry</DialogTitle>
                <DialogDescription>Add a new timesheet entry for your work</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Select
                    value={newEntry.projectId}
                    onValueChange={(value) => setNewEntry({ ...newEntry, projectId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name} ({project.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={newEntry.date}
                    onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hours</Label>
                  <Input
                    type="number"
                    min="0.5"
                    max="24"
                    step="0.5"
                    value={newEntry.hours}
                    onChange={(e) => setNewEntry({ ...newEntry, hours: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Task Description</Label>
                  <Textarea
                    placeholder="What did you work on?"
                    value={newEntry.taskDescription}
                    onChange={(e) => setNewEntry({ ...newEntry, taskDescription: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>Save Entry</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalHoursThisWeek}h</div>
              <p className="text-xs text-muted-foreground">of 40h target</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today</CardTitle>
              <Calendar className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {entries
                  .filter((e) => e.date === format(new Date(), 'yyyy-MM-dd'))
                  .reduce((sum, e) => sum + e.hours, 0)}h
              </div>
              <p className="text-xs text-muted-foreground">logged today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Timer className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {entries.filter((e) => e.status === 'PENDING').length}
              </div>
              <p className="text-xs text-muted-foreground">entries awaiting approval</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {entries.filter((e) => e.status === 'APPROVED').length}
              </div>
              <p className="text-xs text-muted-foreground">this month</p>
            </CardContent>
          </Card>
        </div>

        {/* Timesheet Entries */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Entries</CardTitle>
            <CardDescription>Your time log entries</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No entries yet</p>
                <p className="text-sm text-muted-foreground">
                  Start logging your time to track your work
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        {format(new Date(entry.date), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className="font-medium">
                        {entry.project?.name || 'N/A'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {entry.taskDescription}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {entry.hours}h
                      </TableCell>
                      <TableCell>{getStatusBadge(entry.status)}</TableCell>
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
