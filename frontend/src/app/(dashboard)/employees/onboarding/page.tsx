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
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserPlus, Plus, MoreHorizontal, CheckCircle, Clock, AlertCircle, User } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { format } from 'date-fns'

type Employee = {
  id: string
  firstName: string
  lastName: string
  email: string
  employeeId?: string
  dateOfJoining?: string  // Backend returns date_of_joining -> dateOfJoining
  departmentName?: string
  designationName?: string
  department?: { name: string }
  designation?: { name: string }
}

type OnboardingTask = {
  id: string
  name: string
  description: string | null
  isCompleted: boolean
  completedAt: string | null
  dueDate: string | null
}

type OnboardingRecord = {
  id: string
  employee: Employee
  status: 'pending' | 'in_progress' | 'completed'
  startDate: string
  completedDate: string | null
  progress: number
  tasks: OnboardingTask[]
}

const DEFAULT_TASKS = [
  { name: 'Complete HR documentation', description: 'Fill out all required HR forms and documents' },
  { name: 'IT setup', description: 'Receive laptop, setup email and access credentials' },
  { name: 'Team introduction', description: 'Meet team members and key stakeholders' },
  { name: 'Review company policies', description: 'Read and acknowledge company policies' },
  { name: 'Complete mandatory training', description: 'Complete required training modules' },
  { name: 'Setup workspace', description: 'Configure desk, chair, and workstation' },
  { name: 'First week check-in', description: 'Meeting with manager to discuss expectations' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated, isSuperAdmin } = useAuth()
  const [records, setRecords] = useState<OnboardingRecord[]>([])
  const [newEmployees, setNewEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<OnboardingRecord | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
      return
    }

    if (isAuthenticated) {
      // Fetch both data sources with proper synchronization
      fetchAllData()
    }
  }, [authLoading, isAuthenticated, router])

  const fetchAllData = async () => {
    setIsLoading(true)
    try {
      // Use Promise.allSettled to fetch both in parallel but wait for both
      await Promise.allSettled([
        fetchOnboardingRecords(),
        fetchNewEmployees(),
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const fetchOnboardingRecords = async () => {
    try {
      const data = await apiClient.get<OnboardingRecord[]>('/employees/onboarding')
      setRecords(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch onboarding records:', error)
      // Use mock data for demo
      setRecords([])
    }
  }

  const fetchNewEmployees = async () => {
    try {
      // Get all employees for onboarding selection
      const response = await apiClient.get<Employee[] | { data: Employee[] }>('/employees?limit=100')
      const employees = Array.isArray(response) ? response : (response as any)?.data || []
      
      console.log('Fetched employees for onboarding:', employees)
      
      // Show ALL employees in the dropdown - don't filter by join date
      // Any employee can have onboarding started/restarted
      setNewEmployees(employees)
    } catch (error) {
      console.error('Failed to fetch employees:', error)
      setNewEmployees([])
    }
  }

  const handleStartOnboarding = async () => {
    if (!selectedEmployeeId) {
      toast.error('Please select an employee')
      return
    }

    setIsSubmitting(true)
    try {
      await apiClient.post('/employees/onboarding', {
        employee_id: selectedEmployeeId,
        tasks: DEFAULT_TASKS.map((task, idx) => ({
          name: task.name,
          description: task.description,
          order: idx + 1,
        })),
      })
      toast.success('Onboarding process started')
      setCreateDialogOpen(false)
      setSelectedEmployeeId('')
      fetchOnboardingRecords()
    } catch (error: any) {
      toast.error(error.message || 'Failed to start onboarding')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleTask = async (recordId: string, taskId: string, completed: boolean) => {
    try {
      await apiClient.put(`/employees/onboarding/${recordId}/tasks/${taskId}`, {
        is_completed: completed,
      })
      
      // Update local state
      setRecords(prev => prev.map(record => {
        if (record.id === recordId) {
          const tasks = record.tasks.map(task => 
            task.id === taskId ? { ...task, isCompleted: completed } : task
          )
          const completedCount = tasks.filter(t => t.isCompleted).length
          return {
            ...record,
            tasks,
            progress: Math.round((completedCount / tasks.length) * 100),
            status: completedCount === tasks.length ? 'completed' : 'in_progress',
          }
        }
        return record
      }))
      
      // Also update selected record if viewing
      if (selectedRecord?.id === recordId) {
        setSelectedRecord(prev => {
          if (!prev) return prev
          const tasks = prev.tasks.map(task => 
            task.id === taskId ? { ...task, isCompleted: completed } : task
          )
          const completedCount = tasks.filter(t => t.isCompleted).length
          return {
            ...prev,
            tasks,
            progress: Math.round((completedCount / tasks.length) * 100),
          }
        })
      }
      
      toast.success(completed ? 'Task completed' : 'Task marked incomplete')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update task')
    }
  }

  const openViewDialog = (record: OnboardingRecord) => {
    setSelectedRecord(record)
    setViewDialogOpen(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="mr-1 h-3 w-3" />Completed</Badge>
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="mr-1 h-3 w-3" />In Progress</Badge>
      default:
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertCircle className="mr-1 h-3 w-3" />Pending</Badge>
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

  const pendingCount = records.filter(r => r.status === 'pending').length
  const inProgressCount = records.filter(r => r.status === 'in_progress').length
  const completedCount = records.filter(r => r.status === 'completed').length

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Onboarding</h1>
            <p className="text-muted-foreground">Manage new employee onboarding</p>
          </div>
          {isSuperAdmin && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Start Onboarding
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <UserPlus className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{records.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inProgressCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedCount}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Onboarding Records</CardTitle>
            <CardDescription>Track and manage new hire onboarding processes</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : records.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No onboarding records</p>
                <p className="text-sm text-muted-foreground">
                  Start onboarding for new employees
                </p>
                {isSuperAdmin && (
                  <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Start First Onboarding
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {record.employee.firstName} {record.employee.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {record.employee.designation?.name || 'No designation'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{record.employee.department?.name || '-'}</TableCell>
                      <TableCell>
                        {format(new Date(record.startDate), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="w-32">
                          <div className="flex items-center gap-2">
                            <Progress value={record.progress} className="h-2" />
                            <span className="text-xs text-muted-foreground">{record.progress}%</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openViewDialog(record)}>
                              View Tasks
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/employees/${record.employee.id}`)}>
                              View Employee
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Start Onboarding Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Onboarding</DialogTitle>
            <DialogDescription>
              Select an employee to begin their onboarding process
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="employee">Select Employee *</Label>
              <Select
                value={selectedEmployeeId}
                onValueChange={setSelectedEmployeeId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  {newEmployees.length === 0 ? (
                    <SelectItem value="no-employees" disabled>No employees found</SelectItem>
                  ) : (
                    newEmployees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName}{emp.employeeId ? ` (${emp.employeeId})` : ''}{emp.email ? ` - ${emp.email}` : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Default Tasks</Label>
              <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                {DEFAULT_TASKS.map((task, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 border rounded text-sm">
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    {task.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleStartOnboarding} 
              disabled={isSubmitting || !selectedEmployeeId || newEmployees.length === 0}
            >
              {isSubmitting ? 'Starting...' : 'Start Onboarding'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Tasks Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedRecord?.employee.firstName} {selectedRecord?.employee.lastName}'s Onboarding
            </DialogTitle>
            <DialogDescription>
              Track and update onboarding tasks
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-4 mb-4">
              <Progress value={selectedRecord?.progress || 0} className="flex-1" />
              <span className="text-sm font-medium">{selectedRecord?.progress}% Complete</span>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {selectedRecord?.tasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-start gap-3 p-3 border rounded-lg ${
                    task.isCompleted ? 'bg-green-50 border-green-200' : ''
                  }`}
                >
                  <Checkbox
                    checked={task.isCompleted}
                    onCheckedChange={(checked) => 
                      handleToggleTask(selectedRecord.id, task.id, checked as boolean)
                    }
                  />
                  <div className="flex-1">
                    <p className={`font-medium ${task.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                      {task.name}
                    </p>
                    {task.description && (
                      <p className="text-sm text-muted-foreground">{task.description}</p>
                    )}
                    {task.completedAt && (
                      <p className="text-xs text-green-600 mt-1">
                        Completed {format(new Date(task.completedAt), 'dd MMM yyyy')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
