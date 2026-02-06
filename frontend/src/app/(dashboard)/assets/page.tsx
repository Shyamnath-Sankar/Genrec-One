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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Package, Laptop, Monitor, Smartphone, Plus, Eye, Wrench } from 'lucide-react'
import { format } from 'date-fns'

type AssetCategory = {
  id: string
  name: string
  code: string
}

type Asset = {
  id: string
  name: string
  assetTag: string
  serialNumber: string
  categoryId: string
  category: AssetCategory
  status: string
  purchaseDate: string
  purchaseCost: number
  assignedToId: string | null
  assignedTo: { firstName: string; lastName: string } | null
}

type AssetAssignment = {
  id: string
  assetId: string
  asset: Asset
  assignedDate: string
  returnedDate: string | null
  status: string
}

export default function AssetsPage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated, hasPermission } = useAuth()
  const [assets, setAssets] = useState<Asset[]>([])
  const [myAssets, setMyAssets] = useState<AssetAssignment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
      return
    }

    if (isAuthenticated) {
      fetchData()
    }
  }, [authLoading, isAuthenticated, router])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const [assetsResult, myAssetsData] = await Promise.all([
        hasPermission('assets.view') ? apiClient.getPaginated<Asset>('/assets') : Promise.resolve({ data: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } }),
        apiClient.get<AssetAssignment[]>('/assets/my-assets'),
      ])
      setAssets(Array.isArray(assetsResult.data) ? assetsResult.data : [])
      setMyAssets(Array.isArray(myAssetsData) ? myAssetsData : [])
    } catch (error) {
      console.error('Failed to fetch assets data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return <Badge className="bg-green-100 text-green-800">Available</Badge>
      case 'ASSIGNED':
        return <Badge className="bg-blue-100 text-blue-800">Assigned</Badge>
      case 'UNDER_MAINTENANCE':
        return <Badge className="bg-yellow-100 text-yellow-800">Maintenance</Badge>
      case 'RETIRED':
        return <Badge className="bg-gray-100 text-gray-800">Retired</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName.toLowerCase()) {
      case 'laptop':
        return Laptop
      case 'monitor':
        return Monitor
      case 'mobile':
        return Smartphone
      default:
        return Package
    }
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

  const availableAssets = assets.filter((a) => a.status === 'AVAILABLE').length
  const assignedAssets = assets.filter((a) => a.status === 'ASSIGNED').length
  const totalValue = assets.reduce((sum, a) => sum + a.purchaseCost, 0)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Assets</h1>
            <p className="text-muted-foreground">Manage company assets and equipment</p>
          </div>
          {hasPermission('assets.manage', 'create') && (
            <Button onClick={() => router.push('/assets/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Add Asset
            </Button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
              <Package className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assets.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available</CardTitle>
              <Package className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{availableAssets}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assigned</CardTitle>
              <Laptop className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assignedAssets}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <Package className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="my">
          <TabsList>
            <TabsTrigger value="my">My Assets ({myAssets.length})</TabsTrigger>
            {hasPermission('assets.view') && (
              <TabsTrigger value="all">All Assets ({assets.length})</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="my" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Assigned to Me</CardTitle>
                <CardDescription>Assets currently in your possession</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : myAssets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Package className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">No assets assigned</p>
                    <p className="text-sm text-muted-foreground">
                      Assets assigned to you will appear here
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {myAssets.map((assignment) => {
                      const Icon = getCategoryIcon(assignment.asset?.category?.name || '')
                      return (
                        <Card key={assignment.id}>
                          <CardContent className="flex items-center gap-4 pt-6">
                            <div className="rounded-full bg-blue-100 p-3">
                              <Icon className="h-6 w-6 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium">{assignment.asset?.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {assignment.asset?.assetTag}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Assigned: {format(new Date(assignment.assignedDate), 'dd MMM yyyy')}
                              </p>
                            </div>
                            <Badge className="bg-blue-100 text-blue-800">Active</Badge>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {hasPermission('assets.view') && (
            <TabsContent value="all" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>All Assets</CardTitle>
                  <CardDescription>Company-wide asset inventory</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : assets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Package className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-lg font-medium">No assets found</p>
                      <p className="text-sm text-muted-foreground">
                        Add your first asset to start tracking
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Asset</TableHead>
                          <TableHead>Tag</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Assigned To</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assets.map((asset) => (
                          <TableRow key={asset.id}>
                            <TableCell className="font-medium">{asset.name}</TableCell>
                            <TableCell>{asset.assetTag}</TableCell>
                            <TableCell>{asset.category?.name || 'N/A'}</TableCell>
                            <TableCell>
                              {asset.assignedTo
                                ? `${asset.assignedTo.firstName} ${asset.assignedTo.lastName}`
                                : '-'}
                            </TableCell>
                            <TableCell>{getStatusBadge(asset.status)}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Wrench className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
