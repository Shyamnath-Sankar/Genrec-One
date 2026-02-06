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
import { Search, BookOpen, FileText, ChevronRight, FolderOpen } from 'lucide-react'

type KBCategory = {
  id: string
  name: string
  description: string
  articleCount: number
}

type KBArticle = {
  id: string
  title: string
  summary: string
  categoryId: string
  category: KBCategory
  views: number
  createdAt: string
  updatedAt: string
}

export default function KnowledgeBasePage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated } = useAuth()
  const [categories, setCategories] = useState<KBCategory[]>([])
  const [articles, setArticles] = useState<KBArticle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

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
      const [categoriesData, articlesData] = await Promise.all([
        apiClient.get<KBCategory[]>('/kb/categories'),
        apiClient.get<KBArticle[]>('/kb/articles'),
      ])
      setCategories(Array.isArray(categoriesData) ? categoriesData : [])
      setArticles(Array.isArray(articlesData) ? articlesData : [])
    } catch (error) {
      console.error('Failed to fetch knowledge base data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredArticles = articles.filter((article) => {
    const matchesSearch =
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.summary.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !selectedCategory || article.categoryId === selectedCategory
    return matchesSearch && matchesCategory
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
          <h1 className="text-2xl font-bold tracking-tight">Knowledge Base</h1>
          <p className="text-muted-foreground">
            Find answers to common questions and helpful resources
          </p>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search articles..."
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
            {/* Categories */}
            {!searchQuery && !selectedCategory && (
              <div className="grid gap-4 md:grid-cols-3">
                {categories.length === 0 ? (
                  <Card className="md:col-span-3">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-lg font-medium">No categories yet</p>
                      <p className="text-sm text-muted-foreground">
                        Knowledge base categories will appear here
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  categories.map((category) => (
                    <Card
                      key={category.id}
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => setSelectedCategory(category.id)}
                    >
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>{category.name}</span>
                          <Badge variant="secondary">{category.articleCount} articles</Badge>
                        </CardTitle>
                        <CardDescription>{category.description}</CardDescription>
                      </CardHeader>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* Selected Category Header */}
            {selectedCategory && (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelectedCategory(null)}>
                  All Categories
                </Button>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {categories.find((c) => c.id === selectedCategory)?.name}
                </span>
              </div>
            )}

            {/* Articles */}
            {(searchQuery || selectedCategory) && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {searchQuery ? `Search Results (${filteredArticles.length})` : 'Articles'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredArticles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-lg font-medium">No articles found</p>
                      <p className="text-sm text-muted-foreground">
                        {searchQuery
                          ? 'Try a different search term'
                          : 'No articles in this category yet'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredArticles.map((article) => (
                        <div
                          key={article.id}
                          className="flex items-start gap-4 p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => router.push(`/tickets/kb/${article.id}`)}
                        >
                          <BookOpen className="h-5 w-5 text-primary mt-0.5" />
                          <div className="flex-1">
                            <h3 className="font-medium">{article.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {article.summary}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span>{article.category?.name}</span>
                              <span>{article.views} views</span>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Popular Articles when no search/category */}
            {!searchQuery && !selectedCategory && articles.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Popular Articles</CardTitle>
                  <CardDescription>Frequently viewed help articles</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {articles
                      .sort((a, b) => b.views - a.views)
                      .slice(0, 5)
                      .map((article) => (
                        <div
                          key={article.id}
                          className="flex items-start gap-4 p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => router.push(`/tickets/kb/${article.id}`)}
                        >
                          <BookOpen className="h-5 w-5 text-primary mt-0.5" />
                          <div className="flex-1">
                            <h3 className="font-medium">{article.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {article.summary}
                            </p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
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
