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
import { Briefcase, Plus, MoreHorizontal, Users, Edit, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

type Department = {
  id: string
  name: string
}

type Designation = {
  id: string
  name: string
  code: string
  description: string | null
  level: number
  departmentId: string | null
  department?: Department | null
  isActive: boolean
  employeeCount: number
}

const LEVELS = [
  { value: 1, label: 'Entry Level' },
  { value: 2, label: 'Junior' },
  { value: 3, label: 'Mid-Level' },
  { value: 4, label: 'Senior' },
  { value: 5, label: 'Lead' },
  { value: 6, label: 'Manager' },
  { value: 7, label: 'Senior Manager' },
  { value: 8, label: 'Director' },
  { value: 9, label: 'VP' },
  { value: 10, label: 'C-Level' },
]

export default function DesignationsPage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated, isSuperAdmin } = useAuth()
  const [designations, setDesignations] = useState<Designation[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedDesignation, setSelectedDesignation] = useState<Designation | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    level: 3,
    departmentId: '',
  })

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
      return
    }

    if (isAuthenticated) {
      fetchDesignations()
      fetchDepartments()
    }
  }, [authLoading, isAuthenticated, router])

  const fetchDesignations = async () => {
    try {
      setIsLoading(true)
      const data = await apiClient.get<Designation[]>('/employees/designations/list')
      setDesignations(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch designations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchDepartments = async () => {
    try {
      const data = await apiClient.get<Department[]>('/employees/departments/list')
      setDepartments(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch departments:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      level: 3,
      departmentId: '',
    })
  }

  const handleCreate = async () => {
    if (!formData.name || !formData.code) {
      toast.error('Please fill in required fields')
      return
    }

    setIsSubmitting(true)
    try {
      await apiClient.post('/employees/designations', {
        name: formData.name,
        code: formData.code,
        description: formData.description || null,
        level: formData.level,
        department_id: formData.departmentId || null,
        is_active: true,
      })
      toast.success('Designation created successfully')
      setCreateDialogOpen(false)
      resetForm()
      fetchDesignations()
    } catch (error: any) {
      toast.error(error.message || 'Failed to create designation')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedDesignation || !formData.name || !formData.code) {
      toast.error('Please fill in required fields')
      return
    }

    setIsSubmitting(true)
    try {
      await apiClient.put(`/employees/designations/${selectedDesignation.id}`, {
        name: formData.name,
        code: formData.code,
        description: formData.description || null,
        level: formData.level,
        department_id: formData.departmentId || null,
      })
      toast.success('Designation updated successfully')
      setEditDialogOpen(false)
      setSelectedDesignation(null)
      resetForm()
      fetchDesignations()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update designation')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedDesignation) return

    setIsSubmitting(true)
    try {
      await apiClient.delete(`/employees/designations/${selectedDesignation.id}`)
      toast.success('Designation deleted successfully')
      setDeleteDialogOpen(false)
      setSelectedDesignation(null)
      fetchDesignations()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete designation')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditDialog = (designation: Designation) => {
    setSelectedDesignation(designation)
    setFormData({
      name: designation.name,
      code: designation.code,
      description: designation.description || '',
      level: designation.level,
      departmentId: designation.departmentId || '',
    })
    setEditDialogOpen(true)
  }

  const openDeleteDialog = (designation: Designation) => {
    setSelectedDesignation(designation)
    setDeleteDialogOpen(true)
  }

  const getLevelLabel = (level: number) => {
    return LEVELS.find(l => l.value === level)?.label || `Level ${level}`
  }

  const getLevelBadgeColor = (level: number) => {
    if (level <= 2) return 'bg-gray-100 text-gray-800'
    if (level <= 4) return 'bg-blue-100 text-blue-800'
    if (level <= 6) return 'bg-green-100 text-green-800'
    if (level <= 8) return 'bg-purple-100 text-purple-800'
    return 'bg-yellow-100 text-yellow-800'
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

  const totalEmployees = designations.reduce((sum, d) => sum + (d.employeeCount || 0), 0)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Designations</h1>
            <p className="text-muted-foreground">Manage job titles and levels</p>
          </div>
          {isSuperAdmin && (
            <Button onClick={() => { resetForm(); setCreateDialogOpen(true) }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Designation
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Designations</CardTitle>
              <Briefcase className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{designations.length}</div>
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
              <Briefcase className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {designations.filter((d) => d.isActive).length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Designations</CardTitle>
            <CardDescription>Job titles and organizational hierarchy levels</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : designations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No designations found</p>
                <p className="text-sm text-muted-foreground">
                  Create designations to define job titles
                </p>
                {isSuperAdmin && (
                  <Button className="mt-4" onClick={() => { resetForm(); setCreateDialogOpen(true) }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Designation
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Designation</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {designations.map((designation) => (
                    <TableRow key={designation.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                            <Briefcase className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{designation.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {designation.description || 'No description'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{designation.code}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getLevelBadgeColor(designation.level)}>
                          {getLevelLabel(designation.level)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {designation.department?.name || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {designation.employeeCount || 0}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            designation.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }
                        >
                          {designation.isActive ? 'Active' : 'Inactive'}
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
                            {isSuperAdmin && (
                              <>
                                <DropdownMenuItem onClick={() => openEditDialog(designation)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => openDeleteDialog(designation)}
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

      {/* Create Designation Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Designation</DialogTitle>
            <DialogDescription>
              Create a new job title/designation
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Designation Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Senior Software Engineer"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="code">Designation Code *</Label>
              <Input
                id="code"
                placeholder="e.g., SSE"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of this role"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="level">Level</Label>
              <Select
                value={formData.level.toString()}
                onValueChange={(value) => setFormData({ ...formData, level: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value.toString()}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="departmentId">Department (Optional)</Label>
              <Select
                value={formData.departmentId || "all"}
                onValueChange={(value) => setFormData({ ...formData, departmentId: value === "all" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Designation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Designation Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Designation</DialogTitle>
            <DialogDescription>
              Update designation details
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Designation Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-code">Designation Code *</Label>
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
              <Label htmlFor="edit-level">Level</Label>
              <Select
                value={formData.level.toString()}
                onValueChange={(value) => setFormData({ ...formData, level: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value.toString()}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-departmentId">Department (Optional)</Label>
              <Select
                value={formData.departmentId || "all"}
                onValueChange={(value) => setFormData({ ...formData, departmentId: value === "all" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
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
            <AlertDialogTitle>Delete Designation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedDesignation?.name}"?
              {selectedDesignation?.employeeCount && selectedDesignation.employeeCount > 0 && (
                <span className="block mt-2 text-red-600">
                  Warning: {selectedDesignation.employeeCount} employees have this designation.
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
