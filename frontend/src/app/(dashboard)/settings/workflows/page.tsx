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
import { GitBranch, Plus, MoreHorizontal, Play, Pause, Settings, Edit, Trash2, Eye, Power } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

type WorkflowStep = {
  id: string
  stepOrder: number
  name: string
  approverType: string
  approverId: string | null
}

type Workflow = {
  id: string
  name: string
  type: string
  description: string | null
  isActive: boolean
  steps: number | WorkflowStep[]
  createdAt: string
}

const WORKFLOW_TYPES = [
  { value: 'leave', label: 'Leave Approval' },
  { value: 'expense', label: 'Expense Approval' },
  { value: 'travel', label: 'Travel Request' },
  { value: 'timesheet', label: 'Timesheet Approval' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'offboarding', label: 'Offboarding' },
  { value: 'recruitment', label: 'Recruitment' },
]

const APPROVER_TYPES = [
  { value: 'reporting_manager', label: 'Reporting Manager' },
  { value: 'department_head', label: 'Department Head' },
  { value: 'hr', label: 'HR Team' },
  { value: 'finance', label: 'Finance Team' },
  { value: 'admin', label: 'Admin' },
  { value: 'specific_user', label: 'Specific User' },
]

export default function WorkflowsPage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated, isSuperAdmin } = useAuth()
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    description: '',
    steps: [{ name: 'Step 1', approverType: 'reporting_manager' }] as { name: string, approverType: string }[],
  })

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
      return
    }

    if (isAuthenticated) {
      fetchWorkflows()
    }
  }, [authLoading, isAuthenticated, router])

  const fetchWorkflows = async () => {
    try {
      setIsLoading(true)
      const data = await apiClient.get<Workflow[]>('/workflows/definitions')
      setWorkflows(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch workflows:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      type: '',
      description: '',
      steps: [{ name: 'Step 1', approverType: 'reporting_manager' }],
    })
  }

  const handleCreate = async () => {
    if (!formData.name || !formData.type) {
      toast.error('Please fill in required fields')
      return
    }

    setIsSubmitting(true)
    try {
      await apiClient.post('/workflows/definitions', {
        name: formData.name,
        type: formData.type,
        description: formData.description || null,
        is_active: true,
        steps: formData.steps.map((step, idx) => ({
          step_order: idx + 1,
          name: step.name,
          approver_type: step.approverType,
        })),
      })
      toast.success('Workflow created successfully')
      setCreateDialogOpen(false)
      resetForm()
      fetchWorkflows()
    } catch (error: any) {
      toast.error(error.message || 'Failed to create workflow')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedWorkflow || !formData.name || !formData.type) {
      toast.error('Please fill in required fields')
      return
    }

    setIsSubmitting(true)
    try {
      await apiClient.put(`/workflows/definitions/${selectedWorkflow.id}`, {
        name: formData.name,
        type: formData.type,
        description: formData.description || null,
        steps: formData.steps.map((step, idx) => ({
          step_order: idx + 1,
          name: step.name,
          approver_type: step.approverType,
        })),
      })
      toast.success('Workflow updated successfully')
      setEditDialogOpen(false)
      setSelectedWorkflow(null)
      resetForm()
      fetchWorkflows()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update workflow')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleActive = async (workflow: Workflow) => {
    try {
      await apiClient.put(`/workflows/definitions/${workflow.id}`, {
        is_active: !workflow.isActive,
      })
      toast.success(`Workflow ${workflow.isActive ? 'deactivated' : 'activated'} successfully`)
      fetchWorkflows()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update workflow')
    }
  }

  const handleDelete = async () => {
    if (!selectedWorkflow) return

    setIsSubmitting(true)
    try {
      await apiClient.delete(`/workflows/definitions/${selectedWorkflow.id}`)
      toast.success('Workflow deleted successfully')
      setDeleteDialogOpen(false)
      setSelectedWorkflow(null)
      fetchWorkflows()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete workflow')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditDialog = async (workflow: Workflow) => {
    setSelectedWorkflow(workflow)
    
    // Fetch full workflow details with steps
    try {
      const details = await apiClient.get<Workflow>(`/workflows/definitions/${workflow.id}`)
      const steps = Array.isArray(details.steps) 
        ? details.steps.map(s => ({ name: s.name, approverType: s.approverType }))
        : [{ name: 'Step 1', approverType: 'reporting_manager' }]
      
      setFormData({
        name: details.name,
        type: details.type,
        description: details.description || '',
        steps,
      })
    } catch (error) {
      setFormData({
        name: workflow.name,
        type: workflow.type,
        description: workflow.description || '',
        steps: [{ name: 'Step 1', approverType: 'reporting_manager' }],
      })
    }
    
    setEditDialogOpen(true)
  }

  const openViewDialog = async (workflow: Workflow) => {
    try {
      const details = await apiClient.get<Workflow>(`/workflows/definitions/${workflow.id}`)
      setSelectedWorkflow(details)
    } catch (error) {
      setSelectedWorkflow(workflow)
    }
    setViewDialogOpen(true)
  }

  const openDeleteDialog = (workflow: Workflow) => {
    setSelectedWorkflow(workflow)
    setDeleteDialogOpen(true)
  }

  const addStep = () => {
    setFormData({
      ...formData,
      steps: [...formData.steps, { name: `Step ${formData.steps.length + 1}`, approverType: 'reporting_manager' }],
    })
  }

  const removeStep = (index: number) => {
    if (formData.steps.length <= 1) return
    setFormData({
      ...formData,
      steps: formData.steps.filter((_, i) => i !== index),
    })
  }

  const updateStep = (index: number, field: 'name' | 'approverType', value: string) => {
    const newSteps = [...formData.steps]
    newSteps[index] = { ...newSteps[index], [field]: value }
    setFormData({ ...formData, steps: newSteps })
  }

  const getTypeBadge = (type: string | undefined | null) => {
    if (!type) {
      return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>
    }
    const colors: Record<string, string> = {
      leave: 'bg-blue-100 text-blue-800',
      expense: 'bg-green-100 text-green-800',
      travel: 'bg-purple-100 text-purple-800',
      timesheet: 'bg-yellow-100 text-yellow-800',
      onboarding: 'bg-orange-100 text-orange-800',
      offboarding: 'bg-red-100 text-red-800',
      recruitment: 'bg-cyan-100 text-cyan-800',
    }
    return (
      <Badge className={colors[type.toLowerCase()] || 'bg-gray-100 text-gray-800'}>
        {type}
      </Badge>
    )
  }

  const getStepCount = (workflow: Workflow) => {
    if (typeof workflow.steps === 'number') return workflow.steps
    if (Array.isArray(workflow.steps)) return workflow.steps.length
    return 0
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
            <h1 className="text-2xl font-bold tracking-tight">Workflows</h1>
            <p className="text-muted-foreground">
              Configure approval workflows and automation
            </p>
          </div>
          {isSuperAdmin && (
            <Button onClick={() => { resetForm(); setCreateDialogOpen(true) }}>
              <Plus className="mr-2 h-4 w-4" />
              Create Workflow
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Workflows</CardTitle>
              <GitBranch className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{workflows.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <Play className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {workflows.filter((w) => w.isActive).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Inactive</CardTitle>
              <Pause className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {workflows.filter((w) => !w.isActive).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg. Steps</CardTitle>
              <Settings className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {workflows.length > 0
                  ? Math.round(
                      workflows.reduce((sum, w) => sum + getStepCount(w), 0) / workflows.length
                    )
                  : 0}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Workflows</CardTitle>
            <CardDescription>
              Define multi-step approval processes for various requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : workflows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <GitBranch className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No workflows configured</p>
                <p className="text-sm text-muted-foreground">
                  Create workflows to automate approval processes
                </p>
                {isSuperAdmin && (
                  <Button className="mt-4" onClick={() => { resetForm(); setCreateDialogOpen(true) }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Workflow
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Workflow Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Steps</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workflows.map((workflow) => (
                    <TableRow key={workflow.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                            <GitBranch className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{workflow.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {workflow.description || 'No description'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getTypeBadge(workflow.type)}</TableCell>
                      <TableCell>{getStepCount(workflow)} steps</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            workflow.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }
                        >
                          {workflow.isActive ? 'Active' : 'Inactive'}
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
                            <DropdownMenuItem onClick={() => openViewDialog(workflow)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Steps
                            </DropdownMenuItem>
                            {isSuperAdmin && (
                              <>
                                <DropdownMenuItem onClick={() => openEditDialog(workflow)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleActive(workflow)}>
                                  <Power className="mr-2 h-4 w-4" />
                                  {workflow.isActive ? 'Deactivate' : 'Activate'}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => openDeleteDialog(workflow)}
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

      {/* Create Workflow Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Workflow</DialogTitle>
            <DialogDescription>
              Define an approval workflow with multiple steps
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid gap-2">
              <Label htmlFor="name">Workflow Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Leave Approval Workflow"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Workflow Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select workflow type" />
                </SelectTrigger>
                <SelectContent>
                  {WORKFLOW_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of this workflow"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Approval Steps</Label>
                <Button type="button" variant="outline" size="sm" onClick={addStep}>
                  <Plus className="mr-1 h-3 w-3" />
                  Add Step
                </Button>
              </div>
              {formData.steps.map((step, index) => (
                <div key={index} className="flex gap-2 items-end p-3 border rounded-lg">
                  <div className="flex-1">
                    <Label className="text-xs">Step Name</Label>
                    <Input
                      placeholder="Step name"
                      value={step.name}
                      onChange={(e) => updateStep(index, 'name', e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">Approver</Label>
                    <Select
                      value={step.approverType}
                      onValueChange={(value) => updateStep(index, 'approverType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {APPROVER_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.steps.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-red-600"
                      onClick={() => removeStep(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Workflow'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Workflow Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Workflow</DialogTitle>
            <DialogDescription>
              Update workflow details and steps
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Workflow Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-type">Workflow Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select workflow type" />
                </SelectTrigger>
                <SelectContent>
                  {WORKFLOW_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Approval Steps</Label>
                <Button type="button" variant="outline" size="sm" onClick={addStep}>
                  <Plus className="mr-1 h-3 w-3" />
                  Add Step
                </Button>
              </div>
              {formData.steps.map((step, index) => (
                <div key={index} className="flex gap-2 items-end p-3 border rounded-lg">
                  <div className="flex-1">
                    <Label className="text-xs">Step Name</Label>
                    <Input
                      placeholder="Step name"
                      value={step.name}
                      onChange={(e) => updateStep(index, 'name', e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">Approver</Label>
                    <Select
                      value={step.approverType}
                      onValueChange={(value) => updateStep(index, 'approverType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {APPROVER_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.steps.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-red-600"
                      onClick={() => removeStep(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
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

      {/* View Workflow Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedWorkflow?.name}</DialogTitle>
            <DialogDescription>
              {selectedWorkflow?.type && getTypeBadge(selectedWorkflow.type)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-muted-foreground">Description</Label>
              <p className="mt-1">{selectedWorkflow?.description || 'No description provided'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Status</Label>
              <p className="mt-1">
                <Badge className={selectedWorkflow?.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                  {selectedWorkflow?.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Approval Steps</Label>
              <div className="mt-2 space-y-2">
                {Array.isArray(selectedWorkflow?.steps) && selectedWorkflow.steps.length > 0 ? (
                  selectedWorkflow.steps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-medium">{step.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {APPROVER_TYPES.find(t => t.value === step.approverType)?.label || step.approverType}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {typeof selectedWorkflow?.steps === 'number' 
                      ? `${selectedWorkflow.steps} approval steps`
                      : 'No steps configured'}
                  </p>
                )}
              </div>
            </div>
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
            <AlertDialogTitle>Delete Workflow</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedWorkflow?.name}"? This action cannot be undone.
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
