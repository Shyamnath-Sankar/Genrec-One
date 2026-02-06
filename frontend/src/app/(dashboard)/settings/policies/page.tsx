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
import { FileText, Plus, MoreHorizontal, Calendar, Clock, Edit, Trash2, Eye, Power } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

type Policy = {
  id: string
  name: string
  type: string
  description: string | null
  content: string | null
  isActive: boolean
  effectiveFrom: string | null
  createdAt: string
}

const POLICY_TYPES = [
  { value: 'leave', label: 'Leave Policy' },
  { value: 'attendance', label: 'Attendance Policy' },
  { value: 'expense', label: 'Expense Policy' },
  { value: 'travel', label: 'Travel Policy' },
  { value: 'general', label: 'General Policy' },
  { value: 'conduct', label: 'Code of Conduct' },
  { value: 'safety', label: 'Health & Safety' },
  { value: 'it', label: 'IT Policy' },
]

export default function PoliciesPage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated, isSuperAdmin } = useAuth()
  const [policies, setPolicies] = useState<Policy[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    description: '',
    content: '',
    effectiveFrom: '',
  })

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
      return
    }

    if (isAuthenticated) {
      fetchPolicies()
    }
  }, [authLoading, isAuthenticated, router])

  const fetchPolicies = async () => {
    try {
      setIsLoading(true)
      const data = await apiClient.get<Policy[]>('/settings/policies')
      setPolicies(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch policies:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      type: '',
      description: '',
      content: '',
      effectiveFrom: '',
    })
  }

  const handleCreate = async () => {
    if (!formData.name || !formData.type) {
      toast.error('Please fill in required fields')
      return
    }

    setIsSubmitting(true)
    try {
      await apiClient.post('/settings/policies', {
        name: formData.name,
        type: formData.type,
        description: formData.description || null,
        content: formData.content || null,
        effective_from: formData.effectiveFrom || null,
        is_active: true,
      })
      toast.success('Policy created successfully')
      setCreateDialogOpen(false)
      resetForm()
      fetchPolicies()
    } catch (error: any) {
      toast.error(error.message || 'Failed to create policy')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedPolicy || !formData.name || !formData.type) {
      toast.error('Please fill in required fields')
      return
    }

    setIsSubmitting(true)
    try {
      await apiClient.put(`/settings/policies/${selectedPolicy.id}`, {
        name: formData.name,
        type: formData.type,
        description: formData.description || null,
        content: formData.content || null,
        effective_from: formData.effectiveFrom || null,
      })
      toast.success('Policy updated successfully')
      setEditDialogOpen(false)
      setSelectedPolicy(null)
      resetForm()
      fetchPolicies()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update policy')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleActive = async (policy: Policy) => {
    try {
      await apiClient.put(`/settings/policies/${policy.id}`, {
        is_active: !policy.isActive,
      })
      toast.success(`Policy ${policy.isActive ? 'deactivated' : 'activated'} successfully`)
      fetchPolicies()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update policy')
    }
  }

  const handleDelete = async () => {
    if (!selectedPolicy) return

    setIsSubmitting(true)
    try {
      await apiClient.delete(`/settings/policies/${selectedPolicy.id}`)
      toast.success('Policy deleted successfully')
      setDeleteDialogOpen(false)
      setSelectedPolicy(null)
      fetchPolicies()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete policy')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditDialog = (policy: Policy) => {
    setSelectedPolicy(policy)
    setFormData({
      name: policy.name,
      type: policy.type,
      description: policy.description || '',
      content: policy.content || '',
      effectiveFrom: policy.effectiveFrom ? policy.effectiveFrom.split('T')[0] : '',
    })
    setEditDialogOpen(true)
  }

  const openViewDialog = (policy: Policy) => {
    setSelectedPolicy(policy)
    setViewDialogOpen(true)
  }

  const openDeleteDialog = (policy: Policy) => {
    setSelectedPolicy(policy)
    setDeleteDialogOpen(true)
  }

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      leave: 'bg-blue-100 text-blue-800',
      attendance: 'bg-green-100 text-green-800',
      expense: 'bg-yellow-100 text-yellow-800',
      travel: 'bg-purple-100 text-purple-800',
      general: 'bg-gray-100 text-gray-800',
      conduct: 'bg-pink-100 text-pink-800',
      safety: 'bg-red-100 text-red-800',
      it: 'bg-cyan-100 text-cyan-800',
    }
    return (
      <Badge className={colors[type?.toLowerCase()] || colors.general}>
        {type}
      </Badge>
    )
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Policies</h1>
            <p className="text-muted-foreground">
              Configure company policies and rules
            </p>
          </div>
          {isSuperAdmin && (
            <Button onClick={() => { resetForm(); setCreateDialogOpen(true) }}>
              <Plus className="mr-2 h-4 w-4" />
              Create Policy
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Policies</CardTitle>
              <FileText className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{policies.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <FileText className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {policies.filter((p) => p.isActive).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Leave Policies</CardTitle>
              <Calendar className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {policies.filter((p) => p.type?.toLowerCase() === 'leave').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Attendance</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {policies.filter((p) => p.type?.toLowerCase() === 'attendance').length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Policies</CardTitle>
            <CardDescription>
              Manage organizational policies and compliance
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : policies.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No policies found</p>
                <p className="text-sm text-muted-foreground">
                  Create policies to define organizational rules
                </p>
                {isSuperAdmin && (
                  <Button className="mt-4" onClick={() => { resetForm(); setCreateDialogOpen(true) }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Policy
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Policy Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Effective From</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policies.map((policy) => (
                    <TableRow key={policy.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{policy.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {policy.description || 'No description'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{getTypeBadge(policy.type)}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            policy.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }
                        >
                          {policy.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {policy.effectiveFrom
                          ? new Date(policy.effectiveFrom).toLocaleDateString()
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openViewDialog(policy)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {isSuperAdmin && (
                              <>
                                <DropdownMenuItem onClick={() => openEditDialog(policy)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleActive(policy)}>
                                  <Power className="mr-2 h-4 w-4" />
                                  {policy.isActive ? 'Deactivate' : 'Activate'}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => openDeleteDialog(policy)}
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

      {/* Create Policy Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Policy</DialogTitle>
            <DialogDescription>
              Define a new organizational policy
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Policy Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Annual Leave Policy"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Policy Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select policy type" />
                </SelectTrigger>
                <SelectContent>
                  {POLICY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Brief description of this policy"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="effectiveFrom">Effective From</Label>
              <Input
                id="effectiveFrom"
                type="date"
                value={formData.effectiveFrom}
                onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="content">Policy Content</Label>
              <Textarea
                id="content"
                placeholder="Full policy text..."
                rows={6}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Policy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Policy Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Policy</DialogTitle>
            <DialogDescription>
              Update policy details
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Policy Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-type">Policy Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select policy type" />
                </SelectTrigger>
                <SelectContent>
                  {POLICY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-effectiveFrom">Effective From</Label>
              <Input
                id="edit-effectiveFrom"
                type="date"
                value={formData.effectiveFrom}
                onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-content">Policy Content</Label>
              <Textarea
                id="edit-content"
                rows={6}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              />
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

      {/* View Policy Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedPolicy?.name}</DialogTitle>
            <DialogDescription>
              {selectedPolicy?.type && getTypeBadge(selectedPolicy.type)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-muted-foreground">Description</Label>
              <p className="mt-1">{selectedPolicy?.description || 'No description provided'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <p className="mt-1">
                  <Badge className={selectedPolicy?.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                    {selectedPolicy?.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Effective From</Label>
                <p className="mt-1">
                  {selectedPolicy?.effectiveFrom
                    ? new Date(selectedPolicy.effectiveFrom).toLocaleDateString()
                    : 'Not specified'}
                </p>
              </div>
            </div>
            {selectedPolicy?.content && (
              <div>
                <Label className="text-muted-foreground">Policy Content</Label>
                <div className="mt-2 p-4 bg-muted rounded-lg whitespace-pre-wrap text-sm">
                  {selectedPolicy.content}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Policy</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedPolicy?.name}"? This action cannot be undone.
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
