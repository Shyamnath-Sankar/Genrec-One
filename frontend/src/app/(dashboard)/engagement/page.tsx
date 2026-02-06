'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { apiClient } from '@/lib/api/client'
import { toast } from 'sonner'
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
  Plus,
  ClipboardList,
  Loader2,
  BarChart3,
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

type Survey = {
  id: string
  title: string
  description: string
  status: string
  responseCount: number
  totalQuestions: number
  dueDate: string | null
  createdAt: string
}

type Celebration = {
  birthdays: Array<{ id: string; name: string; photo: string | null; department: string | null }>
  workAnniversaries: Array<{ id: string; name: string; photo: string | null; department: string | null; years: number }>
}

type Employee = {
  id: string
  firstName: string
  lastName: string
  photo: string | null
}

type RecognitionBadge = {
  id: string
  name: string
  icon: string
  color: string
}

export default function EngagementPage() {
  const [activeTab, setActiveTab] = useState('feed')
  const [posts, setPosts] = useState<Post[]>([])
  const [recognitions, setRecognitions] = useState<Recognition[]>([])
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [celebrations, setCelebrations] = useState<Celebration | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [badges, setBadges] = useState<RecognitionBadge[]>([])
  const [newPost, setNewPost] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  
  // Dialog states
  const [isRecognitionDialogOpen, setIsRecognitionDialogOpen] = useState(false)
  const [isSurveyDialogOpen, setIsSurveyDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Recognition form
  const [recognitionForm, setRecognitionForm] = useState({
    receiverId: '',
    badgeId: '',
    message: '',
  })

  // Survey form
  const [surveyForm, setSurveyForm] = useState({
    title: '',
    description: '',
    dueDate: '',
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const [feedRes, recognitionsRes, surveysRes, celebrationsRes, employeesRes, badgesRes] = await Promise.all([
        apiClient.get<Post[]>('/engagement/feed').catch(() => []),
        apiClient.get<Recognition[]>('/engagement/recognitions').catch(() => []),
        apiClient.get<Survey[]>('/engagement/surveys').catch(() => []),
        apiClient.get<Celebration>('/engagement/celebrations/today').catch(() => null),
        apiClient.get<Employee[]>('/employees/list').catch(() => []),
        apiClient.get<RecognitionBadge[]>('/engagement/badges').catch(() => []),
      ])
      setPosts(Array.isArray(feedRes) ? feedRes : [])
      setRecognitions(Array.isArray(recognitionsRes) ? recognitionsRes : [])
      setSurveys(Array.isArray(surveysRes) ? surveysRes : [])
      setCelebrations(celebrationsRes)
      setEmployees(Array.isArray(employeesRes) ? employeesRes : [])
      setBadges(Array.isArray(badgesRes) ? badgesRes : [])
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
      toast.success('Post shared successfully!')
      fetchData()
    } catch (error) {
      toast.error('Failed to create post')
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

  const handleGiveRecognition = async () => {
    if (!recognitionForm.receiverId || !recognitionForm.message) {
      toast.error('Please select an employee and write a message')
      return
    }

    setIsSubmitting(true)
    try {
      await apiClient.post('/engagement/recognitions', recognitionForm)
      toast.success('Recognition sent successfully!')
      setIsRecognitionDialogOpen(false)
      setRecognitionForm({ receiverId: '', badgeId: '', message: '' })
      fetchData()
    } catch (error) {
      toast.error('Failed to send recognition')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateSurvey = async () => {
    if (!surveyForm.title) {
      toast.error('Please enter a survey title')
      return
    }

    setIsSubmitting(true)
    try {
      await apiClient.post('/engagement/surveys', surveyForm)
      toast.success('Survey created successfully!')
      setIsSurveyDialogOpen(false)
      setSurveyForm({ title: '', description: '', dueDate: '' })
      fetchData()
    } catch (error) {
      toast.error('Failed to create survey')
    } finally {
      setIsSubmitting(false)
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

  const getSurveyStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>
      case 'DRAFT':
        return <Badge className="bg-gray-100 text-gray-800">Draft</Badge>
      case 'CLOSED':
        return <Badge className="bg-red-100 text-red-800">Closed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-6 md:grid-cols-3">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
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
            <h1 className="text-3xl font-bold tracking-tight">Employee Engagement</h1>
            <p className="text-muted-foreground">Connect, recognize, and celebrate with your team</p>
          </div>
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
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Active surveys</span>
                  <span className="font-medium">{surveys.filter(s => s.status === 'ACTIVE').length}</span>
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
              <Dialog open={isRecognitionDialogOpen} onOpenChange={setIsRecognitionDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <Award className="h-4 w-4 mr-2" />
                    Give Recognition
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Give Recognition</DialogTitle>
                    <DialogDescription>Appreciate a colleague for their great work</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Select Employee *</Label>
                      <Select
                        value={recognitionForm.receiverId}
                        onValueChange={(value) => setRecognitionForm({...recognitionForm, receiverId: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose an employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.firstName} {emp.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Badge (Optional)</Label>
                      <Select
                        value={recognitionForm.badgeId || "none"}
                        onValueChange={(value) => setRecognitionForm({...recognitionForm, badgeId: value === "none" ? "" : value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a badge" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No badge</SelectItem>
                          {badges.map((badge) => (
                            <SelectItem key={badge.id} value={badge.id}>
                              <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full" style={{backgroundColor: badge.color}} />
                                {badge.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Message *</Label>
                      <Textarea
                        placeholder="Write a message of appreciation..."
                        value={recognitionForm.message}
                        onChange={(e) => setRecognitionForm({...recognitionForm, message: e.target.value})}
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsRecognitionDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleGiveRecognition} disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Send Recognition
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={isSurveyDialogOpen} onOpenChange={setIsSurveyDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <ClipboardList className="h-4 w-4 mr-2" />
                    Create Survey
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Survey</DialogTitle>
                    <DialogDescription>Create a new employee survey or pulse check</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Survey Title *</Label>
                      <Input
                        placeholder="e.g., Monthly Pulse Check"
                        value={surveyForm.title}
                        onChange={(e) => setSurveyForm({...surveyForm, title: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        placeholder="What is this survey about?"
                        value={surveyForm.description}
                        onChange={(e) => setSurveyForm({...surveyForm, description: e.target.value})}
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Due Date (Optional)</Label>
                      <Input
                        type="date"
                        value={surveyForm.dueDate}
                        onChange={(e) => setSurveyForm({...surveyForm, dueDate: e.target.value})}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsSurveyDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateSurvey} disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Survey
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
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

            {posts.length === 0 && (
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

            {recognitions.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center">
                  <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No recognitions yet</p>
                  <p className="text-sm text-muted-foreground mb-4">Start appreciating your colleagues!</p>
                  <Button onClick={() => setIsRecognitionDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Give Recognition
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="surveys" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setIsSurveyDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Survey
              </Button>
            </div>

            {surveys.map((survey) => (
              <Card key={survey.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{survey.title}</h3>
                        {getSurveyStatusBadge(survey.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{survey.description}</p>
                      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                        <span>{survey.totalQuestions} questions</span>
                        <span>{survey.responseCount} responses</span>
                        {survey.dueDate && <span>Due: {new Date(survey.dueDate).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <BarChart3 className="mr-2 h-4 w-4" />
                      View Results
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {surveys.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center">
                  <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No surveys yet</p>
                  <p className="text-sm text-muted-foreground mb-4">Create surveys to gather employee feedback</p>
                  <Button onClick={() => setIsSurveyDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Survey
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
