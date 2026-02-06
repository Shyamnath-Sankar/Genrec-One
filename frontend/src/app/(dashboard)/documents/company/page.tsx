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
  Search,
  FileText,
  FolderOpen,
  Download,
  Eye,
  ChevronRight,
  File,
  FileSpreadsheet,
  FileImage,
  FileType2,
} from 'lucide-react'
import { format } from 'date-fns'

type DocumentFolder = {
  id: string
  name: string
  description: string
  documentCount: number
}

type Document = {
  id: string
  name: string
  description: string
  fileType: string
  fileSize: number
  folderId: string
  folder: DocumentFolder
  uploadedBy: string
  createdAt: string
  updatedAt: string
}

export default function CompanyDocumentsPage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated } = useAuth()
  const [folders, setFolders] = useState<DocumentFolder[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)

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
      const [foldersData, documentsData] = await Promise.all([
        apiClient.get<DocumentFolder[]>('/documents/folders'),
        apiClient.get<Document[]>('/documents/company'),
      ])
      setFolders(Array.isArray(foldersData) ? foldersData : [])
      setDocuments(Array.isArray(documentsData) ? documentsData : [])
    } catch (error) {
      console.error('Failed to fetch documents:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return <FileType2 className="h-5 w-5 text-red-500" />
    if (fileType.includes('sheet') || fileType.includes('excel'))
      return <FileSpreadsheet className="h-5 w-5 text-green-500" />
    if (fileType.includes('image')) return <FileImage className="h-5 w-5 text-blue-500" />
    return <File className="h-5 w-5 text-gray-500" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFolder = !selectedFolder || doc.folderId === selectedFolder
    return matchesSearch && matchesFolder
  })

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
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Company Documents</h1>
          <p className="text-muted-foreground">
            Access company policies, handbooks, and shared resources
          </p>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : (
          <>
            {/* Folders */}
            {!searchQuery && !selectedFolder && (
              <div className="grid gap-4 md:grid-cols-3">
                {folders.length === 0 ? (
                  <Card className="md:col-span-3">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-lg font-medium">No folders yet</p>
                      <p className="text-sm text-muted-foreground">
                        Document folders will appear here
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  folders.map((folder) => (
                    <Card
                      key={folder.id}
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => setSelectedFolder(folder.id)}
                    >
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FolderOpen className="h-5 w-5 text-yellow-500" />
                          {folder.name}
                        </CardTitle>
                        <CardDescription className="flex items-center justify-between">
                          <span>{folder.description}</span>
                          <Badge variant="secondary">{folder.documentCount} files</Badge>
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* Breadcrumb */}
            {selectedFolder && (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelectedFolder(null)}>
                  All Folders
                </Button>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {folders.find((f) => f.id === selectedFolder)?.name}
                </span>
              </div>
            )}

            {/* Documents List */}
            {(searchQuery || selectedFolder) && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {searchQuery ? `Search Results (${filteredDocuments.length})` : 'Documents'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredDocuments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-lg font-medium">No documents found</p>
                      <p className="text-sm text-muted-foreground">
                        {searchQuery
                          ? 'Try a different search term'
                          : 'No documents in this folder yet'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredDocuments.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          {getFileIcon(doc.fileType)}
                          <div className="flex-1">
                            <h3 className="font-medium">{doc.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {doc.description || 'No description'}
                            </p>
                            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                              <span>{formatFileSize(doc.fileSize)}</span>
                              <span>Uploaded {format(new Date(doc.createdAt), 'dd MMM yyyy')}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Recent Documents when no search/folder */}
            {!searchQuery && !selectedFolder && documents.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recently Added</CardTitle>
                  <CardDescription>Latest documents uploaded to the company library</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {documents
                      .sort(
                        (a, b) =>
                          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                      )
                      .slice(0, 5)
                      .map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          {getFileIcon(doc.fileType)}
                          <div className="flex-1">
                            <h3 className="font-medium">{doc.name}</h3>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>{doc.folder?.name}</span>
                              <span>{formatFileSize(doc.fileSize)}</span>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
