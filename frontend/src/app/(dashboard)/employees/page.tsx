'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/use-auth'
import { apiClient } from '@/lib/api/client'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import { Plus, Search, Users, UserCheck, UserX, Building2, Eye } from 'lucide-react'
import { toast } from 'sonner'

type Employee = {
  id: string
  employeeId: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  photo: string | null
  departmentName: string | null
  designationName: string | null
  dateOfJoining: string
  employmentStatus: string
  employmentType: string
}

type Department = {
  id: string
  name: string
}

export default function EmployeesPage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated, hasPermission } = useAuth()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [total, setTotal] = useState(0)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
      return
    }

    if (isAuthenticated) {
      fetchData()
    }
  }, [authLoading, isAuthenticated, router, search, selectedDepartment, selectedStatus])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      
      // Build query params
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (selectedDepartment !== 'all') params.append('department_id', selectedDepartment)
      if (selectedStatus !== 'all') params.append('status', selectedStatus)
      
      const [empResult, deptData] = await Promise.all([
        apiClient.getPaginated<Employee>(`/employees?${params.toString()}`),
        apiClient.get<Department[]>('/employees/departments'),
      ])
      
      setEmployees(empResult.data || [])
      setTotal(empResult.pagination.total || 0)
      setDepartments(Array.isArray(deptData) ? deptData : [])
    } catch (error) {
      toast.error('Failed to load employee data')
      console.error('Failed to fetch employees:', error)
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

  // Calculate stats
  const activeEmployees = employees.filter((e) => e.employmentStatus === 'ACTIVE').length
  const inactiveEmployees = employees.filter((e) => e.employmentStatus !== 'ACTIVE').length

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Employees</h1>
            <p className="text-muted-foreground">
              Manage your organization&apos;s workforce
            </p>
          </div>
          {hasPermission('employees.create', 'create') && (
            <Button asChild>
              <Link href="/employees/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Employee
              </Link>
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeEmployees}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Inactive</CardTitle>
              <UserX className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inactiveEmployees}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Departments</CardTitle>
              <Building2 className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{departments.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Department" />
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
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="ON_NOTICE">On Notice</SelectItem>
              <SelectItem value="RESIGNED">Resigned</SelectItem>
              <SelectItem value="TERMINATED">Terminated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Employee Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : employees.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No employees found</p>
                <p className="text-sm text-muted-foreground">
                  {search ? 'Try adjusting your search criteria' : 'Add your first employee to get started'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={emp.photo || undefined} />
                            <AvatarFallback>
                              {emp.firstName[0]}
                              {emp.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {emp.firstName} {emp.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {emp.employeeId} &bull; {emp.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{emp.departmentName || '-'}</TableCell>
                      <TableCell>{emp.designationName || '-'}</TableCell>
                      <TableCell>
                        <span className="capitalize">
                          {emp.employmentType.toLowerCase().replace('_', ' ')}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(emp.employmentStatus)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/employees/${emp.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
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
