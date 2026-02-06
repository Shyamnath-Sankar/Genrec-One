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
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Target, Plus, TrendingUp, CheckCircle, Clock, Star } from 'lucide-react'
import { format } from 'date-fns'

type Goal = {
  id: string
  title: string
  description: string
  targetDate: string
  progress: number
  status: string
  priority: string
  createdAt: string
}

type Appraisal = {
  id: string
  cycleId: string
  cycle: { name: string; year: number }
  overallRating: number | null
  status: string
  selfReviewSubmitted: boolean
  managerReviewSubmitted: boolean
}

export default function PerformancePage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated } = useAuth()
  const [goals, setGoals] = useState<Goal[]>([])
  const [appraisals, setAppraisals] = useState<Appraisal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Form state
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    targetDate: '',
    priority: 'MEDIUM',
  })

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
      const [goalsData, appraisalsData] = await Promise.all([
        apiClient.get<Goal[]>('/performance/goals'),
        apiClient.get<Appraisal[]>('/performance/appraisals'),
      ])
      setGoals(Array.isArray(goalsData) ? goalsData : [])
      setAppraisals(Array.isArray(appraisalsData) ? appraisalsData : [])
    } catch (error) {
      console.error('Failed to fetch performance data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      await apiClient.post('/performance/goals', newGoal)
      setIsDialogOpen(false)
      setNewGoal({ title: '', description: '', targetDate: '', priority: 'MEDIUM' })
      fetchData()
    } catch (error) {
      console.error('Failed to create goal:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>
      case 'IN_PROGRESS':
        return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>
      case 'NOT_STARTED':
        return <Badge className="bg-gray-100 text-gray-800">Not Started</Badge>
      case 'OVERDUE':
        return <Badge className="bg-red-100 text-red-800">Overdue</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return <Badge className="bg-red-100 text-red-800">High</Badge>
      case 'MEDIUM':
        return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>
      case 'LOW':
        return <Badge className="bg-green-100 text-green-800">Low</Badge>
      default:
        return <Badge variant="outline">{priority}</Badge>
    }
  }

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const completedGoals = goals.filter((g) => g.status === 'COMPLETED').length
  const inProgressGoals = goals.filter((g) => g.status === 'IN_PROGRESS').length
  const avgProgress = goals.length > 0
    ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length)
    : 0

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Performance</h1>
            <p className="text-muted-foreground">Track your goals and performance reviews</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Goal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Goal</DialogTitle>
                <DialogDescription>Set a new performance goal to track</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Goal Title</Label>
                  <Input
                    placeholder="e.g., Complete project X"
                    value={newGoal.title}
                    onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Describe your goal..."
                    value={newGoal.description}
                    onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Target Date</Label>
                  <Input
                    type="date"
                    value={newGoal.targetDate}
                    onChange={(e) => setNewGoal({ ...newGoal, targetDate: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>Create Goal</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Goals</CardTitle>
              <Target className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{goals.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inProgressGoals}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedGoals}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgProgress}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Goals List */}
        <Card>
          <CardHeader>
            <CardTitle>My Goals</CardTitle>
            <CardDescription>Track your progress on set goals</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : goals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Target className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No goals set</p>
                <p className="text-sm text-muted-foreground">
                  Create your first goal to start tracking progress
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {goals.map((goal) => (
                  <Card key={goal.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold">{goal.title}</h3>
                          <p className="text-sm text-muted-foreground">{goal.description}</p>
                        </div>
                        <div className="flex gap-2">
                          {getPriorityBadge(goal.priority)}
                          {getStatusBadge(goal.status)}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{goal.progress}%</span>
                        </div>
                        <Progress value={goal.progress} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Target: {format(new Date(goal.targetDate), 'dd MMM yyyy')}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Appraisals */}
        {appraisals.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Performance Reviews</CardTitle>
              <CardDescription>Your appraisal history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {appraisals.map((appraisal) => (
                  <div
                    key={appraisal.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <h4 className="font-medium">
                        {appraisal.cycle?.name} {appraisal.cycle?.year}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Status: {appraisal.status}
                      </p>
                    </div>
                    {appraisal.overallRating && (
                      <div className="flex items-center gap-1">
                        <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                        <span className="font-semibold">{appraisal.overallRating}/5</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
