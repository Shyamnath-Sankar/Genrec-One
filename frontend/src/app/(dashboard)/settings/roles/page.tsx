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
import { ScrollArea } from '@/components/ui/scroll-area'
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
import { Shield, Plus, MoreHorizontal, Users, Edit, Trash2, Eye } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

type Permission = {
  id: string
  module: string
  slug: string
  name: string
}

type RolePermission = {
  permission: Permission
  canCreate: boolean
  canRead: boolean
  canUpdate: boolean
  canDelete: boolean
}

type Role = {
  id: string
  name: string
  description: string | null
  isSystemRole: boolean
  employeeCount: number
  permissions?: RolePermission[]
  createdAt: string
}

// Permission modules for the UI
const PERMISSION_MODULES = [
  { module: 'employees', label: 'Employees' },
  { module: 'attendance', label: 'Attendance' },
  { module: 'leaves', label: 'Leaves' },
  { module: 'payroll', label: 'Payroll' },
  { module: 'recruitment', label: 'Recruitment' },
  { module: 'performance', label: 'Performance' },
  { module: 'expenses', label: 'Expenses' },
  { module: 'timesheets', label: 'Timesheets' },
  { module: 'documents', label: 'Documents' },
  { module: 'reports', label: 'Reports' },
  { module: 'settings', label: 'Settings' },
]

export default function RolesPage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated, isSuperAdmin } = useAuth()
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })
  
  // Permission checkboxes state: { [permissionId]: { create, read, update, delete } }
  const [permissionState, setPermissionState] = useState<Record<string, { create: boolean, read: boolean, update: boolean, delete: boolean }>>({})

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
      return
    }

    if (isAuthenticated) {
      fetchRoles()
      fetchPermissions()
    }
  }, [authLoading, isAuthenticated, router])

  const fetchRoles = async () => {
    try {
      setIsLoading(true)
      const data = await apiClient.get<Role[]>('/settings/roles')
      setRoles(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch roles:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPermissions = async () => {
    try {
      const data = await apiClient.get<Permission[]>('/settings/permissions')
      setPermissions(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch permissions:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
    })
    // Initialize all permissions to false
    const initialState: Record<string, { create: boolean, read: boolean, update: boolean, delete: boolean }> = {}
    permissions.forEach(p => {
      initialState[p.id] = { create: false, read: false, update: false, delete: false }
    })
    setPermissionState(initialState)
  }

  const handleCreate = async () => {
    if (!formData.name) {
      toast.error('Please enter a role name')
      return
    }

    setIsSubmitting(true)
    try {
      // Format permissions for API
      const rolePermissions = Object.entries(permissionState)
        .filter(([_, perms]) => perms.create || perms.read || perms.update || perms.delete)
        .map(([permissionId, perms]) => ({
          permission_id: permissionId,
          can_create: perms.create,
          can_read: perms.read,
          can_update: perms.update,
          can_delete: perms.delete,
        }))

      await apiClient.post('/settings/roles', {
        name: formData.name,
        description: formData.description || null,
        permissions: rolePermissions,
      })
      toast.success('Role created successfully')
      setCreateDialogOpen(false)
      resetForm()
      fetchRoles()
    } catch (error: any) {
      toast.error(error.message || 'Failed to create role')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedRole || !formData.name) {
      toast.error('Please enter a role name')
      return
    }

    setIsSubmitting(true)
    try {
      const rolePermissions = Object.entries(permissionState)
        .filter(([_, perms]) => perms.create || perms.read || perms.update || perms.delete)
        .map(([permissionId, perms]) => ({
          permission_id: permissionId,
          can_create: perms.create,
          can_read: perms.read,
          can_update: perms.update,
          can_delete: perms.delete,
        }))

      await apiClient.put(`/settings/roles/${selectedRole.id}`, {
        name: formData.name,
        description: formData.description || null,
        permissions: rolePermissions,
      })
      toast.success('Role updated successfully')
      setEditDialogOpen(false)
      setSelectedRole(null)
      resetForm()
      fetchRoles()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update role')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedRole) return

    setIsSubmitting(true)
    try {
      await apiClient.delete(`/settings/roles/${selectedRole.id}`)
      toast.success('Role deleted successfully')
      setDeleteDialogOpen(false)
      setSelectedRole(null)
      fetchRoles()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete role')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditDialog = async (role: Role) => {
    setSelectedRole(role)
    setFormData({
      name: role.name,
      description: role.description || '',
    })
    
    // Fetch role details with permissions
    try {
      const roleDetails = await apiClient.get<Role>(`/settings/roles/${role.id}`)
      
      // Initialize permission state from role
      const permState: Record<string, { create: boolean, read: boolean, update: boolean, delete: boolean }> = {}
      permissions.forEach(p => {
        permState[p.id] = { create: false, read: false, update: false, delete: false }
      })
      
      if (roleDetails.permissions) {
        roleDetails.permissions.forEach(rp => {
          permState[rp.permission.id] = {
            create: rp.canCreate,
            read: rp.canRead,
            update: rp.canUpdate,
            delete: rp.canDelete,
          }
        })
      }
      
      setPermissionState(permState)
    } catch (error) {
      console.error('Failed to fetch role details:', error)
    }
    
    setEditDialogOpen(true)
  }

  const openViewDialog = async (role: Role) => {
    try {
      const roleDetails = await apiClient.get<Role>(`/settings/roles/${role.id}`)
      setSelectedRole(roleDetails)
    } catch (error) {
      setSelectedRole(role)
    }
    setViewDialogOpen(true)
  }

  const openDeleteDialog = (role: Role) => {
    setSelectedRole(role)
    setDeleteDialogOpen(true)
  }

  const togglePermission = (permissionId: string, action: 'create' | 'read' | 'update' | 'delete') => {
    setPermissionState(prev => ({
      ...prev,
      [permissionId]: {
        ...prev[permissionId],
        [action]: !prev[permissionId]?.[action],
      }
    }))
  }

  const toggleAllForPermission = (permissionId: string, checked: boolean) => {
    setPermissionState(prev => ({
      ...prev,
      [permissionId]: {
        create: checked,
        read: checked,
        update: checked,
        delete: checked,
      }
    }))
  }

  // Group permissions by module
  const groupedPermissions = permissions.reduce((acc, perm) => {
    const module = perm.module || 'other'
    if (!acc[module]) acc[module] = []
    acc[module].push(perm)
    return acc
  }, {} as Record<string, Permission[]>)

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
            <h1 className="text-2xl font-bold tracking-tight">Roles</h1>
            <p className="text-muted-foreground">Manage roles and permissions</p>
          </div>
          {isSuperAdmin && (
            <Button onClick={() => { resetForm(); setCreateDialogOpen(true) }}>
              <Plus className="mr-2 h-4 w-4" />
              Create Role
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
              <Shield className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{roles.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">System Roles</CardTitle>
              <Shield className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {roles.filter((r) => r.isSystemRole).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Custom Roles</CardTitle>
              <Shield className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {roles.filter((r) => !r.isSystemRole).length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Roles</CardTitle>
            <CardDescription>Define access levels for your organization</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : roles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No roles found</p>
                <p className="text-sm text-muted-foreground">Create roles to manage access</p>
                {isSuperAdmin && (
                  <Button className="mt-4" onClick={() => { resetForm(); setCreateDialogOpen(true) }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Role
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                            <Shield className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium">{role.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {role.description || 'No description'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {role.employeeCount || 0}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={role.isSystemRole ? 'default' : 'outline'}
                        >
                          {role.isSystemRole ? 'System' : 'Custom'}
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
                            <DropdownMenuItem onClick={() => openViewDialog(role)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Permissions
                            </DropdownMenuItem>
                            {isSuperAdmin && !role.isSystemRole && (
                              <>
                                <DropdownMenuItem onClick={() => openEditDialog(role)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => openDeleteDialog(role)}
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

      {/* Create Role Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
            <DialogDescription>
              Define a new role with specific permissions
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Role Name *</Label>
              <Input
                id="name"
                placeholder="e.g., HR Manager"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
              <Label>Permissions</Label>
              <ScrollArea className="h-[300px] border rounded-md p-4">
                <div className="space-y-4">
                  {Object.entries(groupedPermissions).map(([module, perms]) => (
                    <div key={module} className="space-y-2">
                      <h4 className="font-medium capitalize">{module}</h4>
                      {perms.map(perm => (
                        <div key={perm.id} className="flex items-center gap-4 pl-4 py-1">
                          <span className="w-40 text-sm">{perm.name}</span>
                          <label className="flex items-center gap-1 text-xs">
                            <Checkbox
                              checked={permissionState[perm.id]?.read || false}
                              onCheckedChange={() => togglePermission(perm.id, 'read')}
                            />
                            Read
                          </label>
                          <label className="flex items-center gap-1 text-xs">
                            <Checkbox
                              checked={permissionState[perm.id]?.create || false}
                              onCheckedChange={() => togglePermission(perm.id, 'create')}
                            />
                            Create
                          </label>
                          <label className="flex items-center gap-1 text-xs">
                            <Checkbox
                              checked={permissionState[perm.id]?.update || false}
                              onCheckedChange={() => togglePermission(perm.id, 'update')}
                            />
                            Update
                          </label>
                          <label className="flex items-center gap-1 text-xs">
                            <Checkbox
                              checked={permissionState[perm.id]?.delete || false}
                              onCheckedChange={() => togglePermission(perm.id, 'delete')}
                            />
                            Delete
                          </label>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-6"
                            onClick={() => toggleAllForPermission(perm.id, !permissionState[perm.id]?.read)}
                          >
                            Toggle All
                          </Button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Update role details and permissions
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Role Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
              <Label>Permissions</Label>
              <ScrollArea className="h-[300px] border rounded-md p-4">
                <div className="space-y-4">
                  {Object.entries(groupedPermissions).map(([module, perms]) => (
                    <div key={module} className="space-y-2">
                      <h4 className="font-medium capitalize">{module}</h4>
                      {perms.map(perm => (
                        <div key={perm.id} className="flex items-center gap-4 pl-4 py-1">
                          <span className="w-40 text-sm">{perm.name}</span>
                          <label className="flex items-center gap-1 text-xs">
                            <Checkbox
                              checked={permissionState[perm.id]?.read || false}
                              onCheckedChange={() => togglePermission(perm.id, 'read')}
                            />
                            Read
                          </label>
                          <label className="flex items-center gap-1 text-xs">
                            <Checkbox
                              checked={permissionState[perm.id]?.create || false}
                              onCheckedChange={() => togglePermission(perm.id, 'create')}
                            />
                            Create
                          </label>
                          <label className="flex items-center gap-1 text-xs">
                            <Checkbox
                              checked={permissionState[perm.id]?.update || false}
                              onCheckedChange={() => togglePermission(perm.id, 'update')}
                            />
                            Update
                          </label>
                          <label className="flex items-center gap-1 text-xs">
                            <Checkbox
                              checked={permissionState[perm.id]?.delete || false}
                              onCheckedChange={() => togglePermission(perm.id, 'delete')}
                            />
                            Delete
                          </label>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </ScrollArea>
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

      {/* View Permissions Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedRole?.name}</DialogTitle>
            <DialogDescription>
              <Badge variant={selectedRole?.isSystemRole ? 'default' : 'outline'}>
                {selectedRole?.isSystemRole ? 'System Role' : 'Custom Role'}
              </Badge>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-muted-foreground">Description</Label>
              <p className="mt-1">{selectedRole?.description || 'No description provided'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Users with this role</Label>
              <p className="mt-1">{selectedRole?.employeeCount || 0} users</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Permissions</Label>
              <ScrollArea className="h-[300px] mt-2 border rounded-md p-4">
                {selectedRole?.permissions && selectedRole.permissions.length > 0 ? (
                  <div className="space-y-2">
                    {selectedRole.permissions.map((rp, idx) => (
                      <div key={idx} className="flex items-center gap-2 py-1">
                        <span className="font-medium w-40">{rp.permission.name}</span>
                        {rp.canRead && <Badge variant="secondary" className="text-xs">Read</Badge>}
                        {rp.canCreate && <Badge variant="secondary" className="text-xs">Create</Badge>}
                        {rp.canUpdate && <Badge variant="secondary" className="text-xs">Update</Badge>}
                        {rp.canDelete && <Badge variant="secondary" className="text-xs">Delete</Badge>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No specific permissions assigned</p>
                )}
              </ScrollArea>
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
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedRole?.name}"? 
              {selectedRole?.employeeCount && selectedRole.employeeCount > 0 && (
                <span className="block mt-2 text-red-600">
                  Warning: {selectedRole.employeeCount} users are assigned to this role.
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
