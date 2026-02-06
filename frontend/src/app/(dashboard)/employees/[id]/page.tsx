'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/use-auth'
import { apiClient } from '@/lib/api/client'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Building2,
  Users,
  Edit,
  UserCog,
  FileText,
  Clock,
  DollarSign,
  Target,
  Package,
} from 'lucide-react'

type EmployeeDetail = {
  id: string
  employeeId: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  photo: string | null
  dateOfBirth: string | null
  gender: string | null
  maritalStatus: string | null
  bloodGroup: string | null
  address: string | null
  city: string | null
  state: string | null
  country: string | null
  postalCode: string | null
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  emergencyContactRelation: string | null
  departmentId: string | null
  departmentName: string | null
  designationId: string | null
  designationName: string | null
  reportingManagerId: string | null
  reportingManagerName: string | null
  dateOfJoining: string
  confirmationDate: string | null
  probationEndDate: string | null
  lastWorkingDate: string | null
  employmentStatus: string
  employmentType: string
  workLocation: string | null
  shiftId: string | null
  bankName: string | null
  bankAccountNumber: string | null
  bankIfscCode: string | null
  panNumber: string | null
  aadharNumber: string | null
  createdAt: string
  updatedAt: string
}

type LeaveBalance = {
  leaveType: string
  balance: number
  used: number
  total: number
}

type RecentAttendance = {
  date: string
  checkIn: string | null
  checkOut: string | null
  workingHours: number
  status: string
}

export default function EmployeeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated, hasPermission } = useAuth()
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null)
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([])
  const [recentAttendance, setRecentAttendance] = useState<RecentAttendance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const employeeId = params.id as string

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
      return
    }

    if (isAuthenticated && employeeId) {
      fetchEmployee()
    }
  }, [authLoading, isAuthenticated, router, employeeId])

  const fetchEmployee = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const data = await apiClient.get<EmployeeDetail>(`/employees/${employeeId}`)
      setEmployee(data)

      // Fetch additional data in parallel
      const [leavesData, attendanceData] = await Promise.all([
        apiClient.get<LeaveBalance[]>(`/employees/${employeeId}/leave-balances`).catch(() => []),
        apiClient.get<RecentAttendance[]>(`/employees/${employeeId}/recent-attendance?limit=10`).catch(() => []),
      ])

      setLeaveBalances(Array.isArray(leavesData) ? leavesData : [])
      setRecentAttendance(Array.isArray(attendanceData) ? attendanceData : [])
    } catch (err) {
      console.error('Failed to fetch employee:', err)
      setError('Employee not found or you do not have permission to view this profile.')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>
      case 'ON_NOTICE':
        return <Badge className="bg-yellow-100 text-yellow-800">On Notice</Badge>
      case 'RESIGNED':
        return <Badge className="bg-red-100 text-red-800">Resigned</Badge>
      case 'TERMINATED':
        return <Badge className="bg-red-100 text-red-800">Terminated</Badge>
      case 'RETIRED':
        return <Badge className="bg-gray-100 text-gray-800">Retired</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <Skeleton className="h-64 md:col-span-1" />
            <Skeleton className="h-64 md:col-span-2" />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !employee) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Button variant="ghost" asChild>
            <Link href="/employees">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Employees
            </Link>
          </Button>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Employee Not Found</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/employees">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <Avatar className="h-16 w-16">
              <AvatarImage src={employee.photo || undefined} />
              <AvatarFallback className="text-lg">
                {employee.firstName[0]}
                {employee.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">
                  {employee.firstName} {employee.lastName}
                </h1>
                {getStatusBadge(employee.employmentStatus)}
              </div>
              <p className="text-muted-foreground">
                {employee.employeeId} | {employee.designationName || 'No Designation'}
              </p>
            </div>
          </div>
          {hasPermission('employees.edit', 'update') && (
            <Button asChild>
              <Link href={`/employees/${employee.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Employee
              </Link>
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="personal">Personal Info</TabsTrigger>
            <TabsTrigger value="employment">Employment</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              {/* Contact Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{employee.email}</span>
                  </div>
                  {employee.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{employee.phone}</span>
                    </div>
                  )}
                  {(employee.city || employee.state) && (
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {[employee.city, employee.state, employee.country].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Employment Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Employment Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{employee.departmentName || 'No Department'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{employee.designationName || 'No Designation'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Joined {formatDate(employee.dateOfJoining)}</span>
                  </div>
                  {employee.reportingManagerName && (
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Reports to {employee.reportingManagerName}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Employment Type</span>
                    <Badge variant="outline" className="capitalize">
                      {employee.employmentType.toLowerCase().replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Work Location</span>
                    <span className="text-sm">{employee.workLocation || 'Office'}</span>
                  </div>
                  {employee.confirmationDate && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Confirmed On</span>
                      <span className="text-sm">{formatDate(employee.confirmationDate)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Leave Balances */}
            {leaveBalances.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Leave Balances</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                    {leaveBalances.map((leave) => (
                      <div key={leave.leaveType} className="rounded-lg border p-4">
                        <p className="text-sm font-medium">{leave.leaveType}</p>
                        <p className="text-2xl font-bold">{leave.balance}</p>
                        <p className="text-xs text-muted-foreground">
                          {leave.used} used of {leave.total}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Personal Info Tab */}
          <TabsContent value="personal" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Basic personal details of the employee</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                    <p className="mt-1">{employee.firstName} {employee.lastName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
                    <p className="mt-1">{formatDate(employee.dateOfBirth)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Gender</p>
                    <p className="mt-1 capitalize">{employee.gender?.toLowerCase() || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Marital Status</p>
                    <p className="mt-1 capitalize">{employee.maritalStatus?.toLowerCase() || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Blood Group</p>
                    <p className="mt-1">{employee.bloodGroup || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="mt-1">{employee.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Phone</p>
                    <p className="mt-1">{employee.phone || '-'}</p>
                  </div>
                </div>

                <Separator className="my-6" />

                <h3 className="text-lg font-semibold mb-4">Address</h3>
                <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
                  <div className="sm:col-span-2 md:col-span-3">
                    <p className="text-sm font-medium text-muted-foreground">Street Address</p>
                    <p className="mt-1">{employee.address || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">City</p>
                    <p className="mt-1">{employee.city || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">State</p>
                    <p className="mt-1">{employee.state || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Country</p>
                    <p className="mt-1">{employee.country || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Postal Code</p>
                    <p className="mt-1">{employee.postalCode || '-'}</p>
                  </div>
                </div>

                <Separator className="my-6" />

                <h3 className="text-lg font-semibold mb-4">Emergency Contact</h3>
                <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Contact Name</p>
                    <p className="mt-1">{employee.emergencyContactName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Relationship</p>
                    <p className="mt-1">{employee.emergencyContactRelation || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Phone</p>
                    <p className="mt-1">{employee.emergencyContactPhone || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Employment Tab */}
          <TabsContent value="employment" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Employment Information</CardTitle>
                <CardDescription>Job details and organizational information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Employee ID</p>
                    <p className="mt-1">{employee.employeeId}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Department</p>
                    <p className="mt-1">{employee.departmentName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Designation</p>
                    <p className="mt-1">{employee.designationName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Employment Type</p>
                    <p className="mt-1 capitalize">{employee.employmentType.toLowerCase().replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Employment Status</p>
                    <p className="mt-1">{getStatusBadge(employee.employmentStatus)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Reporting Manager</p>
                    <p className="mt-1">{employee.reportingManagerName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Date of Joining</p>
                    <p className="mt-1">{formatDate(employee.dateOfJoining)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Probation End Date</p>
                    <p className="mt-1">{formatDate(employee.probationEndDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Confirmation Date</p>
                    <p className="mt-1">{formatDate(employee.confirmationDate)}</p>
                  </div>
                  {employee.lastWorkingDate && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Last Working Date</p>
                      <p className="mt-1">{formatDate(employee.lastWorkingDate)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Work Location</p>
                    <p className="mt-1">{employee.workLocation || 'Office'}</p>
                  </div>
                </div>

                {hasPermission('payroll.view', 'view') && (
                  <>
                    <Separator className="my-6" />

                    <h3 className="text-lg font-semibold mb-4">Bank Details</h3>
                    <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Bank Name</p>
                        <p className="mt-1">{employee.bankName || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Account Number</p>
                        <p className="mt-1">{employee.bankAccountNumber ? '****' + employee.bankAccountNumber.slice(-4) : '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">IFSC Code</p>
                        <p className="mt-1">{employee.bankIfscCode || '-'}</p>
                      </div>
                    </div>

                    <Separator className="my-6" />

                    <h3 className="text-lg font-semibold mb-4">Statutory Information</h3>
                    <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">PAN Number</p>
                        <p className="mt-1">{employee.panNumber || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Aadhar Number</p>
                        <p className="mt-1">{employee.aadharNumber ? '****' + employee.aadharNumber.slice(-4) : '-'}</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Employee Documents</CardTitle>
                <CardDescription>Documents uploaded by or for this employee</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No Documents</p>
                  <p className="text-sm text-muted-foreground">
                    Documents will appear here when uploaded
                  </p>
                  {hasPermission('documents.upload', 'create') && (
                    <Button className="mt-4" variant="outline">
                      Upload Document
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Attendance</CardTitle>
                <CardDescription>Last 10 attendance records</CardDescription>
              </CardHeader>
              <CardContent>
                {recentAttendance.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">No Attendance Records</p>
                    <p className="text-sm text-muted-foreground">
                      Attendance records will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentAttendance.map((record, index) => (
                      <div key={index} className="flex items-center justify-between border-b pb-4 last:border-0">
                        <div>
                          <p className="font-medium">{formatDate(record.date)}</p>
                          <p className="text-sm text-muted-foreground">
                            {record.checkIn || '-'} - {record.checkOut || '-'}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={record.status === 'PRESENT' ? 'default' : 'secondary'}>
                            {record.status}
                          </Badge>
                          <p className="text-sm text-muted-foreground mt-1">
                            {record.workingHours.toFixed(1)} hrs
                          </p>
                        </div>
                      </div>
                    ))}
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
