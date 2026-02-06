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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { GitBranch, Plus, MoreHorizontal, Play, Pause, Settings } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type Workflow = {
  id: string
  name: string
  type: string
  description: string | null
  isActive: boolean
  steps: number
  createdAt: string
}

export default function WorkflowsPage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated, isSuperAdmin } = useAuth()
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [isLoading, setIsLoading] = useState(true)

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

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      leave: 'bg-blue-100 text-blue-800',
      expense: 'bg-green-100 text-green-800',
      travel: 'bg-purple-100 text-purple-800',
      timesheet: 'bg-yellow-100 text-yellow-800',
      onboarding: 'bg-orange-100 text-orange-800',
      offboarding: 'bg-red-100 text-red-800',
    }
    return (
      <Badge className={colors[type.toLowerCase()] || 'bg-gray-100 text-gray-800'}>
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
            <h1 className="text-2xl font-bold tracking-tight">Workflows</h1>
            <p className="text-muted-foreground">
              Configure approval workflows and automation
            </p>
          </div>
          {isSuperAdmin && (
            <Button>
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
                      workflows.reduce((sum, w) => sum + w.steps, 0) / workflows.length
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
                      <TableCell>{workflow.steps} steps</TableCell>
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
                            <DropdownMenuItem>View Steps</DropdownMenuItem>
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                            <DropdownMenuItem>
                              {workflow.isActive ? 'Deactivate' : 'Activate'}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              Delete
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
    </DashboardLayout>
  )
}
