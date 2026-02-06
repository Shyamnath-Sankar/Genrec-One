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
  Download,
  Eye,
  Copy,
  Files,
  File,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

type DocumentTemplate = {
  id: string
  name: string
  description: string
  category: string
  fileType: string
  version: string
  downloads: number
  createdAt: string
  updatedAt: string
}

export default function DocumentTemplatesPage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated } = useAuth()
  const [templates, setTemplates] = useState<DocumentTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
      return
    }

    if (isAuthenticated) {
      fetchTemplates()
    }
  }, [authLoading, isAuthenticated, router])

  const fetchTemplates = async () => {
    try {
      setIsLoading(true)
      const data = await apiClient.get<DocumentTemplate[]>('/documents/templates')
      setTemplates(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch templates:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = async (template: DocumentTemplate) => {
    try {
      // In a real app, this would trigger a file download
      toast.success(`Downloading ${template.name}...`)
    } catch (error) {
      toast.error('Failed to download template')
    }
  }

  const handleCopy = async (template: DocumentTemplate) => {
    try {
      // In a real app, this would create a copy in user's documents
      toast.success(`Template copied to your documents`)
    } catch (error) {
      toast.error('Failed to copy template')
    }
  }

  const categories = [...new Set(templates.map((t) => t.category))]

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      HR: 'bg-blue-100 text-blue-800',
      Finance: 'bg-green-100 text-green-800',
      Legal: 'bg-purple-100 text-purple-800',
      Operations: 'bg-orange-100 text-orange-800',
      IT: 'bg-cyan-100 text-cyan-800',
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
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
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Document Templates</h1>
          <p className="text-muted-foreground">
            Standard templates for common business documents
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={categoryFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCategoryFilter('all')}
                >
                  All
                </Button>
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={categoryFilter === category ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCategoryFilter(category)}
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Templates Grid */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Files className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No templates found</p>
              <p className="text-sm text-muted-foreground">
                {searchQuery || categoryFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Document templates will appear here'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-lg">
                        <File className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getCategoryColor(template.category)}>
                            {template.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">v{template.version}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <CardDescription className="mt-2">{template.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-end">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                    <span>Updated {format(new Date(template.updatedAt), 'dd MMM yyyy')}</span>
                    <span>{template.downloads} downloads</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleDownload(template)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(template)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
