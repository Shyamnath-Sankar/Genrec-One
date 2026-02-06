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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileText, Upload, Download, Folder, File, Search, Eye } from 'lucide-react'
import { format } from 'date-fns'

type Document = {
  id: string
  name: string
  fileName: string
  fileType: string
  fileSize: number
  category: string
  isPublic: boolean
  uploadedById: string
  uploadedBy: { firstName: string; lastName: string }
  createdAt: string
}

export default function DocumentsPage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated, hasPermission } = useAuth()
  const [myDocuments, setMyDocuments] = useState<Document[]>([])
  const [companyDocuments, setCompanyDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

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
      const [myDocsData, companyDocsData] = await Promise.all([
        apiClient.get<Document[]>('/documents/my'),
        apiClient.get<Document[]>('/documents/company'),
      ])
      setMyDocuments(Array.isArray(myDocsData) ? myDocsData : [])
      setCompanyDocuments(Array.isArray(companyDocsData) ? companyDocsData : [])
    } catch (error) {
      console.error('Failed to fetch documents:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (fileType: string) => {
    return <File className="h-4 w-4" />
  }

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      PERSONAL: 'bg-blue-100 text-blue-800',
      POLICY: 'bg-purple-100 text-purple-800',
      TRAINING: 'bg-green-100 text-green-800',
      TEMPLATE: 'bg-yellow-100 text-yellow-800',
      COMPLIANCE: 'bg-red-100 text-red-800',
    }
    return <Badge className={colors[category] || 'bg-gray-100 text-gray-800'}>{category}</Badge>
  }

  const filteredMyDocs = myDocuments.filter((doc) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredCompanyDocs = companyDocuments.filter((doc) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
            <p className="text-muted-foreground">Access and manage your documents</p>
          </div>
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Upload Document
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Documents</CardTitle>
              <FileText className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{myDocuments.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Company Documents</CardTitle>
              <Folder className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{companyDocuments.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Policies</CardTitle>
              <File className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {companyDocuments.filter((d) => d.category === 'POLICY').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Templates</CardTitle>
              <File className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {companyDocuments.filter((d) => d.category === 'TEMPLATE').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="my">
          <TabsList>
            <TabsTrigger value="my">My Documents ({filteredMyDocs.length})</TabsTrigger>
            <TabsTrigger value="company">
              Company Documents ({filteredCompanyDocs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Personal Documents</CardTitle>
                <CardDescription>Your uploaded documents and files</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filteredMyDocs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">No documents found</p>
                    <p className="text-sm text-muted-foreground">
                      Upload documents to keep them organized
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Uploaded</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMyDocs.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell className="flex items-center gap-2">
                            {getFileIcon(doc.fileType)}
                            <span className="font-medium">{doc.name}</span>
                          </TableCell>
                          <TableCell>{getCategoryBadge(doc.category)}</TableCell>
                          <TableCell>{formatFileSize(doc.fileSize)}</TableCell>
                          <TableCell>
                            {format(new Date(doc.createdAt), 'dd MMM yyyy')}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Download className="h-4 w-4" />
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

          <TabsContent value="company" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Company Documents</CardTitle>
                <CardDescription>Shared company policies and resources</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filteredCompanyDocs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Folder className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">No company documents</p>
                    <p className="text-sm text-muted-foreground">
                      Company documents will appear here
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Uploaded By</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCompanyDocs.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell className="flex items-center gap-2">
                            {getFileIcon(doc.fileType)}
                            <span className="font-medium">{doc.name}</span>
                          </TableCell>
                          <TableCell>{getCategoryBadge(doc.category)}</TableCell>
                          <TableCell>{formatFileSize(doc.fileSize)}</TableCell>
                          <TableCell>
                            {doc.uploadedBy
                              ? `${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName}`
                              : 'System'}
                          </TableCell>
                          <TableCell>
                            {format(new Date(doc.createdAt), 'dd MMM yyyy')}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Download className="h-4 w-4" />
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
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
