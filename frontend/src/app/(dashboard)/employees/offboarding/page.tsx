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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { UserMinus, Plus, MoreHorizontal, AlertCircle, Clock, CheckCircle, User } from 'lucide-react'
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
  dateOfJoining?: string
  departmentName?: string
  designationName?: string
  employmentStatus?: string
}

type OffboardingRecord = {
  id: string
  employee: Employee
  status: 'pending' | 'in_progress' | 'completed'
  initiatedDate: string
  lastWorkingDate: string | null
  reason: string
  exitType: 'resignation' | 'termination' | 'retirement' | 'other'
}

const EXIT_REASONS = [
  'Better opportunity',
  'Personal reasons',
  'Relocation',
  'Career change',
  'Health issues',
  'Retirement',
  'End of contract',
  'Performance issues',
  'Other',
]

export default function OffboardingPage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated, isSuperAdmin } = useAuth()
  const [records, setRecords] = useState<OffboardingRecord[]>([])
  const [activeEmployees, setActiveEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [exitType, setExitType] = useState<string>('resignation')
  const [reason, setReason] = useState('')
  const [lastWorkingDate, setLastWorkingDate] = useState('')

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
      return
    }

    if (isAuthenticated) {
      fetchAllData()
    }
  }, [authLoading, isAuthenticated, router])

  const fetchAllData = async () => {
    setIsLoading(true)
    try {
      await Promise.allSettled([
        fetchOffboardingRecords(),
        fetchActiveEmployees(),
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const fetchOffboardingRecords = async () => {
    try {
      // For now, get employees with non-ACTIVE status as "offboarding"
      const response = await apiClient.get<Employee[] | { data: Employee[] }>('/employees?limit=100')
      const employees = Array.isArray(response) ? response : (response as any)?.data || []
      
      // Filter for employees who are on notice, resigned, or terminated
      const offboarding = employees.filter((emp: Employee) => 
        ['ON_NOTICE', 'RESIGNED', 'TERMINATED', 'RETIRED'].includes(emp.employmentStatus || '')
      )
      
      // Transform to offboarding records format
      const records: OffboardingRecord[] = offboarding.map((emp: Employee) => ({
        id: emp.id,
        employee: emp,
        status: emp.employmentStatus === 'ON_NOTICE' ? 'in_progress' : 'completed',
        initiatedDate: new Date().toISOString(),
        lastWorkingDate: null,
        reason: 'Not specified',
        exitType: emp.employmentStatus === 'RETIRED' ? 'retirement' : 
                  emp.employmentStatus === 'TERMINATED' ? 'termination' : 'resignation',
      }))
      
      setRecords(records)
    } catch (error) {
      console.error('Failed to fetch offboarding records:', error)
      setRecords([])
    }
  }

  const fetchActiveEmployees = async () => {
    try {
      const response = await apiClient.get<Employee[] | { data: Employee[] }>('/employees?limit=100')
      const employees = Array.isArray(response) ? response : (response as any)?.data || []
      
      console.log('Fetched employees for offboarding:', employees)
      
      // Filter for active employees only
      const active = employees.filter((emp: Employee) => 
        emp.employmentStatus === 'ACTIVE' || !emp.employmentStatus
      )
      
      setActiveEmployees(active)
    } catch (error) {
      console.error('Failed to fetch employees:', error)
      setActiveEmployees([])
    }
  }

  const handleStartOffboarding = async () => {
    if (!selectedEmployeeId) {
      toast.error('Please select an employee')
      return
    }

    if (!lastWorkingDate) {
      toast.error('Please set the last working date')
      return
    }

    setIsSubmitting(true)
    try {
      // Update employee status to ON_NOTICE
      await apiClient.put(`/employees/${selectedEmployeeId}`, {
        employmentStatus: 'ON_NOTICE',
        dateOfLeaving: lastWorkingDate,
      })
      
      toast.success('Offboarding process started')
      setCreateDialogOpen(false)
      resetForm()
      fetchAllData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to start offboarding')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setSelectedEmployeeId('')
    setExitType('resignation')
    setReason('')
    setLastWorkingDate('')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-gray-100 text-gray-800"><CheckCircle className="mr-1 h-3 w-3" />Completed</Badge>
      case 'in_progress':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="mr-1 h-3 w-3" />In Progress</Badge>
      default:
        return <Badge className="bg-blue-100 text-blue-800"><AlertCircle className="mr-1 h-3 w-3" />Pending</Badge>
    }
  }

  const getExitTypeBadge = (type: string) => {
    switch (type) {
      case 'resignation':
        return <Badge variant="outline">Resignation</Badge>
      case 'termination':
        return <Badge className="bg-red-100 text-red-800">Termination</Badge>
      case 'retirement':
        return <Badge className="bg-purple-100 text-purple-800">Retirement</Badge>
      default:
        return <Badge variant="outline">Other</Badge>
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

  const inProgressCount = records.filter(r => r.status === 'in_progress').length
  const completedCount = records.filter(r => r.status === 'completed').length

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Offboarding</h1>
            <p className="text-muted-foreground">Manage employee exits</p>
          </div>
          {isSuperAdmin && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Start Offboarding
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <UserMinus className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{records.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inProgressCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedCount}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Offboarding Records</CardTitle>
            <CardDescription>Track and manage employee exit processes</CardDescription>
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
                <UserMinus className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No offboarding records</p>
                <p className="text-sm text-muted-foreground">
                  Start offboarding when an employee is leaving
                </p>
                {isSuperAdmin && (
                  <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Start First Offboarding
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Exit Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100">
                            <User className="h-4 w-4 text-red-600" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {record.employee.firstName} {record.employee.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {record.employee.designationName || 'No designation'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{record.employee.departmentName || '-'}</TableCell>
                      <TableCell>{getExitTypeBadge(record.exitType)}</TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
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

      {/* Start Offboarding Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Offboarding</DialogTitle>
            <DialogDescription>
              Select an employee to begin their exit process
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
                  {activeEmployees.length === 0 ? (
                    <SelectItem value="no-employees" disabled>No active employees found</SelectItem>
                  ) : (
                    activeEmployees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName}{emp.employeeId ? ` (${emp.employeeId})` : ''}{emp.email ? ` - ${emp.email}` : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="exitType">Exit Type *</Label>
              <Select value={exitType} onValueChange={setExitType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select exit type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="resignation">Resignation</SelectItem>
                  <SelectItem value="termination">Termination</SelectItem>
                  <SelectItem value="retirement">Retirement</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="lastWorkingDate">Last Working Date *</Label>
              <Input
                id="lastWorkingDate"
                type="date"
                value={lastWorkingDate}
                onChange={(e) => setLastWorkingDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason for leaving..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleStartOffboarding} 
              disabled={isSubmitting || !selectedEmployeeId || !lastWorkingDate || activeEmployees.length === 0}
            >
              {isSubmitting ? 'Starting...' : 'Start Offboarding'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
