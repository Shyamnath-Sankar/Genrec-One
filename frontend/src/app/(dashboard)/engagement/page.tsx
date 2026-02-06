'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { apiClient } from '@/lib/api/client'
import {
  Heart,
  MessageCircle,
  Award,
  Gift,
  Users,
  TrendingUp,
  Star,
  Send,
  ThumbsUp,
  Cake,
  Calendar,
} from 'lucide-react'

type Post = {
  id: string
  author: { id: string; name: string; photo: string | null }
  postType: string
  content: string
  likeCount: number
  commentCount: number
  createdAt: string
  comments: Array<{
    id: string
    author: { id: string; name: string }
    content: string
    createdAt: string
  }>
}

type Recognition = {
  id: string
  giver: { id: string; name: string; photo: string | null }
  receiver: { id: string; name: string; photo: string | null }
  badge: { id: string; name: string; icon: string; color: string } | null
  message: string
  likeCount: number
  createdAt: string
}

type Celebration = {
  birthdays: Array<{ id: string; name: string; photo: string | null; department: string | null }>
  workAnniversaries: Array<{ id: string; name: string; photo: string | null; department: string | null; years: number }>
}

export default function EngagementPage() {
  const [activeTab, setActiveTab] = useState('feed')
  const [posts, setPosts] = useState<Post[]>([])
  const [recognitions, setRecognitions] = useState<Recognition[]>([])
  const [celebrations, setCelebrations] = useState<Celebration | null>(null)
  const [newPost, setNewPost] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [feedRes, recognitionsRes, celebrationsRes] = await Promise.all([
        apiClient.get<{ data: Post[] }>('/engagement/feed'),
        apiClient.get<{ data: Recognition[] }>('/engagement/recognitions'),
        apiClient.get<{ data: Celebration }>('/engagement/celebrations/today'),
      ])
      setPosts((feedRes as { data: Post[] }).data || [])
      setRecognitions((recognitionsRes as { data: Recognition[] }).data || [])
      setCelebrations((celebrationsRes as { data: Celebration }).data || null)
    } catch (error) {
      console.error('Failed to fetch engagement data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreatePost = async () => {
    if (!newPost.trim()) return
    try {
      await apiClient.post('/engagement/posts', { content: newPost, postType: 'update' })
      setNewPost('')
      fetchData()
    } catch (error) {
      console.error('Failed to create post:', error)
    }
  }

  const handleLikePost = async (postId: string) => {
    try {
      await apiClient.post(`/engagement/posts/${postId}/like`, {})
      fetchData()
    } catch (error) {
      console.error('Failed to like post:', error)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employee Engagement</h1>
          <p className="text-muted-foreground">Connect, recognize, and celebrate with your team</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Celebrations Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Cake className="h-5 w-5 text-pink-500" />
                Today's Celebrations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {celebrations?.birthdays && celebrations.birthdays.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Birthdays</p>
                  {celebrations.birthdays.map((person) => (
                    <div key={person.id} className="flex items-center gap-2 py-1">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={person.photo || undefined} />
                        <AvatarFallback>{person.name[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{person.name}</span>
                    </div>
                  ))}
                </div>
              )}
              {celebrations?.workAnniversaries && celebrations.workAnniversaries.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Work Anniversaries</p>
                  {celebrations.workAnniversaries.map((person) => (
                    <div key={person.id} className="flex items-center gap-2 py-1">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={person.photo || undefined} />
                        <AvatarFallback>{person.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="text-sm">{person.name}</span>
                        <Badge variant="secondary" className="ml-2">{person.years} years</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {(!celebrations?.birthdays?.length && !celebrations?.workAnniversaries?.length) && (
                <p className="text-sm text-muted-foreground">No celebrations today</p>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Engagement Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Posts this week</span>
                  <span className="font-medium">{posts.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Recognitions given</span>
                  <span className="font-medium">{recognitions.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <Award className="h-4 w-4 mr-2" />
                Give Recognition
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Gift className="h-4 w-4 mr-2" />
                Send Wishes
              </Button>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="feed">Social Feed</TabsTrigger>
            <TabsTrigger value="recognitions">Recognitions</TabsTrigger>
            <TabsTrigger value="surveys">Surveys</TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="space-y-4">
            {/* Create Post */}
            <Card>
              <CardContent className="pt-4">
                <Textarea
                  placeholder="What's on your mind? Share an update with your team..."
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  rows={3}
                />
                <div className="flex justify-end mt-3">
                  <Button onClick={handleCreatePost} disabled={!newPost.trim()}>
                    <Send className="h-4 w-4 mr-2" />
                    Post
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Posts */}
            {posts.map((post) => (
              <Card key={post.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <Avatar>
                      <AvatarImage src={post.author.photo || undefined} />
                      <AvatarFallback>{post.author.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{post.author.name}</span>
                        <span className="text-sm text-muted-foreground">{formatDate(post.createdAt)}</span>
                      </div>
                      <p className="mt-2">{post.content}</p>
                      <div className="flex items-center gap-4 mt-3">
                        <Button variant="ghost" size="sm" onClick={() => handleLikePost(post.id)}>
                          <ThumbsUp className="h-4 w-4 mr-1" />
                          {post.likeCount}
                        </Button>
                        <Button variant="ghost" size="sm">
                          <MessageCircle className="h-4 w-4 mr-1" />
                          {post.commentCount}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {posts.length === 0 && !isLoading && (
              <Card>
                <CardContent className="py-8 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No posts yet. Be the first to share an update!</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="recognitions" className="space-y-4">
            {recognitions.map((recognition) => (
              <Card key={recognition.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <Avatar>
                      <AvatarImage src={recognition.giver.photo || undefined} />
                      <AvatarFallback>{recognition.giver.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{recognition.giver.name}</span>
                        <span className="text-muted-foreground">recognized</span>
                        <span className="font-medium">{recognition.receiver.name}</span>
                        {recognition.badge && (
                          <Badge style={{ backgroundColor: recognition.badge.color }} className="text-white">
                            {recognition.badge.name}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-2">{recognition.message}</p>
                      <div className="flex items-center gap-4 mt-3">
                        <Button variant="ghost" size="sm">
                          <Heart className="h-4 w-4 mr-1" />
                          {recognition.likeCount}
                        </Button>
                        <span className="text-sm text-muted-foreground">{formatDate(recognition.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {recognitions.length === 0 && !isLoading && (
              <Card>
                <CardContent className="py-8 text-center">
                  <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No recognitions yet. Start appreciating your colleagues!</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="surveys" className="space-y-4">
            <Card>
              <CardContent className="py-8 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No pending surveys at the moment.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
