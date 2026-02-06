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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Building2, Plus, MoreHorizontal, Users, Edit, Trash2, Eye } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

type Employee = {
  id: string
  firstName: string
  lastName: string
}

type Department = {
  id: string
  name: string
  code: string
  description: string | null
  headId: string | null
  head?: Employee | null
  parentId: string | null
  parent?: Department | null
  isActive: boolean
  employeeCount: number
}

export default function DepartmentsPage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated, isSuperAdmin } = useAuth()
  const [departments, setDepartments] = useState<Department[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    headId: '',
    parentId: '',
  })

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
      return
    }

    if (isAuthenticated) {
      fetchDepartments()
      fetchEmployees()
    }
  }, [authLoading, isAuthenticated, router])

  const fetchDepartments = async () => {
    try {
      setIsLoading(true)
      const data = await apiClient.get<Department[]>('/employees/departments/list')
      setDepartments(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch departments:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchEmployees = async () => {
    try {
      const data = await apiClient.get<{ items: Employee[] }>('/employees?limit=500')
      setEmployees(Array.isArray(data.items) ? data.items : [])
    } catch (error) {
      console.error('Failed to fetch employees:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      headId: '',
      parentId: '',
    })
  }

  const handleCreate = async () => {
    if (!formData.name || !formData.code) {
      toast.error('Please fill in required fields')
      return
    }

    setIsSubmitting(true)
    try {
      await apiClient.post('/employees/departments', {
        name: formData.name,
        code: formData.code,
        description: formData.description || null,
        head_id: formData.headId || null,
        parent_id: formData.parentId || null,
        is_active: true,
      })
      toast.success('Department created successfully')
      setCreateDialogOpen(false)
      resetForm()
      fetchDepartments()
    } catch (error: any) {
      toast.error(error.message || 'Failed to create department')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedDepartment || !formData.name || !formData.code) {
      toast.error('Please fill in required fields')
      return
    }

    setIsSubmitting(true)
    try {
      await apiClient.put(`/employees/departments/${selectedDepartment.id}`, {
        name: formData.name,
        code: formData.code,
        description: formData.description || null,
        head_id: formData.headId || null,
        parent_id: formData.parentId || null,
      })
      toast.success('Department updated successfully')
      setEditDialogOpen(false)
      setSelectedDepartment(null)
      resetForm()
      fetchDepartments()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update department')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedDepartment) return

    setIsSubmitting(true)
    try {
      await apiClient.delete(`/employees/departments/${selectedDepartment.id}`)
      toast.success('Department deleted successfully')
      setDeleteDialogOpen(false)
      setSelectedDepartment(null)
      fetchDepartments()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete department')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditDialog = (dept: Department) => {
    setSelectedDepartment(dept)
    setFormData({
      name: dept.name,
      code: dept.code,
      description: dept.description || '',
      headId: dept.headId || '',
      parentId: dept.parentId || '',
    })
    setEditDialogOpen(true)
  }

  const openViewDialog = (dept: Department) => {
    setSelectedDepartment(dept)
    setViewDialogOpen(true)
  }

  const openDeleteDialog = (dept: Department) => {
    setSelectedDepartment(dept)
    setDeleteDialogOpen(true)
  }

  const handleViewEmployees = (dept: Department) => {
    router.push(`/employees?department=${dept.id}`)
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

  const totalEmployees = departments.reduce((sum, d) => sum + (d.employeeCount || 0), 0)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Departments</h1>
            <p className="text-muted-foreground">Manage organizational structure</p>
          </div>
          {isSuperAdmin && (
            <Button onClick={() => { resetForm(); setCreateDialogOpen(true) }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Department
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Departments</CardTitle>
              <Building2 className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{departments.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalEmployees}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <Building2 className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {departments.filter((d) => d.isActive).length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Departments</CardTitle>
            <CardDescription>Organization hierarchy and structure</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : departments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No departments found</p>
                <p className="text-sm text-muted-foreground">
                  Create departments to organize your workforce
                </p>
                {isSuperAdmin && (
                  <Button className="mt-4" onClick={() => { resetForm(); setCreateDialogOpen(true) }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Department
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Head</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.map((dept) => (
                    <TableRow key={dept.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                            <Building2 className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{dept.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {dept.description || 'No description'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{dept.code}</Badge>
                      </TableCell>
                      <TableCell>
                        {dept.head ? `${dept.head.firstName} ${dept.head.lastName}` : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {dept.employeeCount || 0}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            dept.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }
                        >
                          {dept.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewEmployees(dept)}>
                              <Users className="mr-2 h-4 w-4" />
                              View Employees
                            </DropdownMenuItem>
                            {isSuperAdmin && (
                              <>
                                <DropdownMenuItem onClick={() => openEditDialog(dept)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => openDeleteDialog(dept)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
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

      {/* Create Department Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Department</DialogTitle>
            <DialogDescription>
              Create a new department in your organization
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Department Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Engineering"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="code">Department Code *</Label>
              <Input
                id="code"
                placeholder="e.g., ENG"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of this department"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="headId">Department Head</Label>
              <Select
                value={formData.headId || "none"}
                onValueChange={(value) => setFormData({ ...formData, headId: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department head" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="parentId">Parent Department</Label>
              <Select
                value={formData.parentId || "none"}
                onValueChange={(value) => setFormData({ ...formData, parentId: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Top Level)</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Department'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Department Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription>
              Update department details
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Department Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-code">Department Code *</Label>
              <Input
                id="edit-code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-headId">Department Head</Label>
              <Select
                value={formData.headId || "none"}
                onValueChange={(value) => setFormData({ ...formData, headId: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department head" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-parentId">Parent Department</Label>
              <Select
                value={formData.parentId || "none"}
                onValueChange={(value) => setFormData({ ...formData, parentId: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Top Level)</SelectItem>
                  {departments.filter(d => d.id !== selectedDepartment?.id).map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Department</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedDepartment?.name}"?
              {selectedDepartment?.employeeCount && selectedDepartment.employeeCount > 0 && (
                <span className="block mt-2 text-red-600">
                  Warning: This department has {selectedDepartment.employeeCount} employees assigned.
                </span>
              )}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  )
}
