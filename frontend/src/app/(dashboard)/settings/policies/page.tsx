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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { FileText, Plus, MoreHorizontal, Calendar, Clock, Users } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type Policy = {
  id: string
  name: string
  type: string
  description: string | null
  isActive: boolean
  effectiveFrom: string | null
  createdAt: string
}

export default function PoliciesPage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated, isSuperAdmin } = useAuth()
  const [policies, setPolicies] = useState<Policy[]>([])
  const [isLoading, setIsLoading] = useState(true)

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

  const policyTypes = [
    { value: 'all', label: 'All Policies' },
    { value: 'leave', label: 'Leave' },
    { value: 'attendance', label: 'Attendance' },
    { value: 'expense', label: 'Expense' },
    { value: 'travel', label: 'Travel' },
    { value: 'general', label: 'General' },
  ]

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      leave: 'bg-blue-100 text-blue-800',
      attendance: 'bg-green-100 text-green-800',
      expense: 'bg-yellow-100 text-yellow-800',
      travel: 'bg-purple-100 text-purple-800',
      general: 'bg-gray-100 text-gray-800',
    }
    return (
      <Badge className={colors[type.toLowerCase()] || colors.general}>
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
            <Button>
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
                {policies.filter((p) => p.type.toLowerCase() === 'leave').length}
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
                {policies.filter((p) => p.type.toLowerCase() === 'attendance').length}
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
                            <DropdownMenuItem>View Details</DropdownMenuItem>
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                            <DropdownMenuItem>
                              {policy.isActive ? 'Deactivate' : 'Activate'}
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
