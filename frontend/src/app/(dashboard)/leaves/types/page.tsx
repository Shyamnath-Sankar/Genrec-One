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
import { Switch } from '@/components/ui/switch'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Calendar, Plus, MoreHorizontal, Edit, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

type LeaveType = {
  id: string
  name: string
  code: string
  description: string | null
  defaultDays: number
  maxCarryForward: number
  isPaid: boolean
  isActive: boolean
  requiresApproval: boolean
  allowHalfDay: boolean
  color: string | null
  createdAt: string
}

const COLORS = [
  { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { value: 'green', label: 'Green', class: 'bg-green-500' },
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
  { value: 'red', label: 'Red', class: 'bg-red-500' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { value: 'cyan', label: 'Cyan', class: 'bg-cyan-500' },
]

export default function LeaveTypesPage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated, isSuperAdmin } = useAuth()
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<LeaveType | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    defaultDays: 12,
    maxCarryForward: 0,
    isPaid: true,
    requiresApproval: true,
    allowHalfDay: true,
    color: 'blue',
  })

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
      return
    }

    if (isAuthenticated) {
      fetchLeaveTypes()
    }
  }, [authLoading, isAuthenticated, router])

  const fetchLeaveTypes = async () => {
    try {
      setIsLoading(true)
      const data = await apiClient.get<LeaveType[]>('/leaves/types')
      setLeaveTypes(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch leave types:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      defaultDays: 12,
      maxCarryForward: 0,
      isPaid: true,
      requiresApproval: true,
      allowHalfDay: true,
      color: 'blue',
    })
  }

  const handleCreate = async () => {
    if (!formData.name || !formData.code) {
      toast.error('Please fill in required fields')
      return
    }

    setIsSubmitting(true)
    try {
      await apiClient.post('/leaves/types', {
        name: formData.name,
        code: formData.code,
        description: formData.description || null,
        default_days: formData.defaultDays,
        max_carry_forward: formData.maxCarryForward,
        is_paid: formData.isPaid,
        requires_approval: formData.requiresApproval,
        allow_half_day: formData.allowHalfDay,
        color: formData.color,
        is_active: true,
      })
      toast.success('Leave type created successfully')
      setCreateDialogOpen(false)
      resetForm()
      fetchLeaveTypes()
    } catch (error: any) {
      toast.error(error.message || 'Failed to create leave type')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedType || !formData.name || !formData.code) {
      toast.error('Please fill in required fields')
      return
    }

    setIsSubmitting(true)
    try {
      await apiClient.put(`/leaves/types/${selectedType.id}`, {
        name: formData.name,
        code: formData.code,
        description: formData.description || null,
        default_days: formData.defaultDays,
        max_carry_forward: formData.maxCarryForward,
        is_paid: formData.isPaid,
        requires_approval: formData.requiresApproval,
        allow_half_day: formData.allowHalfDay,
        color: formData.color,
      })
      toast.success('Leave type updated successfully')
      setEditDialogOpen(false)
      setSelectedType(null)
      resetForm()
      fetchLeaveTypes()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update leave type')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedType) return

    setIsSubmitting(true)
    try {
      await apiClient.delete(`/leaves/types/${selectedType.id}`)
      toast.success('Leave type deleted successfully')
      setDeleteDialogOpen(false)
      setSelectedType(null)
      fetchLeaveTypes()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete leave type')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditDialog = (leaveType: LeaveType) => {
    setSelectedType(leaveType)
    setFormData({
      name: leaveType.name,
      code: leaveType.code,
      description: leaveType.description || '',
      defaultDays: leaveType.defaultDays,
      maxCarryForward: leaveType.maxCarryForward,
      isPaid: leaveType.isPaid,
      requiresApproval: leaveType.requiresApproval,
      allowHalfDay: leaveType.allowHalfDay,
      color: leaveType.color || 'blue',
    })
    setEditDialogOpen(true)
  }

  const openDeleteDialog = (leaveType: LeaveType) => {
    setSelectedType(leaveType)
    setDeleteDialogOpen(true)
  }

  const getColorClass = (color: string | null) => {
    return COLORS.find(c => c.value === color)?.class || 'bg-gray-500'
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

  const totalDays = leaveTypes.reduce((sum, lt) => sum + lt.defaultDays, 0)
  const paidTypes = leaveTypes.filter(lt => lt.isPaid).length

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Leave Types</h1>
            <p className="text-muted-foreground">Configure leave categories and policies</p>
          </div>
          {isSuperAdmin && (
            <Button onClick={() => { resetForm(); setCreateDialogOpen(true) }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Leave Type
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Types</CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{leaveTypes.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Paid Leave Types</CardTitle>
              <Calendar className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{paidTypes}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Annual Days</CardTitle>
              <Calendar className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalDays}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Leave Type Configuration</CardTitle>
            <CardDescription>
              Manage leave types, quotas, and accrual rules
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : leaveTypes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No leave types configured</p>
                <p className="text-sm text-muted-foreground">
                  Create leave types to manage employee time off
                </p>
                {isSuperAdmin && (
                  <Button className="mt-4" onClick={() => { resetForm(); setCreateDialogOpen(true) }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Leave Type
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Leave Type</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Annual Days</TableHead>
                    <TableHead>Carry Forward</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveTypes.map((leaveType) => (
                    <TableRow key={leaveType.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`h-3 w-3 rounded-full ${getColorClass(leaveType.color)}`} />
                          <div>
                            <p className="font-medium">{leaveType.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {leaveType.description || 'No description'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{leaveType.code}</Badge>
                      </TableCell>
                      <TableCell>{leaveType.defaultDays} days</TableCell>
                      <TableCell>{leaveType.maxCarryForward} days</TableCell>
                      <TableCell>
                        <Badge className={leaveType.isPaid ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {leaveType.isPaid ? 'Paid' : 'Unpaid'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={leaveType.isActive ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}>
                          {leaveType.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {isSuperAdmin && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(leaveType)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => openDeleteDialog(leaveType)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Leave Type Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Leave Type</DialogTitle>
            <DialogDescription>
              Create a new leave type for your organization
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Leave Type Name *</Label>
                <Input
                  placeholder="e.g., Annual Leave"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Code *</Label>
                <Input
                  placeholder="e.g., AL"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Brief description of this leave type"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Annual Entitlement (days)</Label>
                <Input
                  type="number"
                  value={formData.defaultDays}
                  onChange={(e) => setFormData({ ...formData, defaultDays: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Carry Forward (days)</Label>
                <Input
                  type="number"
                  value={formData.maxCarryForward}
                  onChange={(e) => setFormData({ ...formData, maxCarryForward: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={`h-8 w-8 rounded-full ${color.class} ${
                      formData.color === color.value ? 'ring-2 ring-offset-2 ring-primary' : ''
                    }`}
                    onClick={() => setFormData({ ...formData, color: color.value })}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Paid Leave</Label>
                  <p className="text-sm text-muted-foreground">Employee receives salary during leave</p>
                </div>
                <Switch
                  checked={formData.isPaid}
                  onCheckedChange={(checked) => setFormData({ ...formData, isPaid: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Requires Approval</Label>
                  <p className="text-sm text-muted-foreground">Leave must be approved by manager</p>
                </div>
                <Switch
                  checked={formData.requiresApproval}
                  onCheckedChange={(checked) => setFormData({ ...formData, requiresApproval: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Allow Half-Day</Label>
                  <p className="text-sm text-muted-foreground">Employees can take half-day leaves</p>
                </div>
                <Switch
                  checked={formData.allowHalfDay}
                  onCheckedChange={(checked) => setFormData({ ...formData, allowHalfDay: checked })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Leave Type'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Leave Type Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Leave Type</DialogTitle>
            <DialogDescription>
              Update leave type configuration
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Leave Type Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Code *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Annual Entitlement (days)</Label>
                <Input
                  type="number"
                  value={formData.defaultDays}
                  onChange={(e) => setFormData({ ...formData, defaultDays: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Carry Forward (days)</Label>
                <Input
                  type="number"
                  value={formData.maxCarryForward}
                  onChange={(e) => setFormData({ ...formData, maxCarryForward: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={`h-8 w-8 rounded-full ${color.class} ${
                      formData.color === color.value ? 'ring-2 ring-offset-2 ring-primary' : ''
                    }`}
                    onClick={() => setFormData({ ...formData, color: color.value })}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Paid Leave</Label>
                  <p className="text-sm text-muted-foreground">Employee receives salary during leave</p>
                </div>
                <Switch
                  checked={formData.isPaid}
                  onCheckedChange={(checked) => setFormData({ ...formData, isPaid: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Requires Approval</Label>
                  <p className="text-sm text-muted-foreground">Leave must be approved by manager</p>
                </div>
                <Switch
                  checked={formData.requiresApproval}
                  onCheckedChange={(checked) => setFormData({ ...formData, requiresApproval: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Allow Half-Day</Label>
                  <p className="text-sm text-muted-foreground">Employees can take half-day leaves</p>
                </div>
                <Switch
                  checked={formData.allowHalfDay}
                  onCheckedChange={(checked) => setFormData({ ...formData, allowHalfDay: checked })}
                />
              </div>
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
            <AlertDialogTitle>Delete Leave Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedType?.name}"? This action cannot be undone.
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
