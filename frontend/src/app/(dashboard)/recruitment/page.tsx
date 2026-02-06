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
import { Briefcase, Users, Calendar, MapPin, Plus, Eye } from 'lucide-react'
import { format } from 'date-fns'

type Job = {
  id: string
  title: string
  department: string
  location: string
  employmentType: string
  status: string
  postedDate: string
  closingDate: string
  applicationsCount: number
}

type Candidate = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  jobId: string
  job: { title: string }
  stage: string
  source: string
  appliedDate: string
}

export default function RecruitmentPage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated, hasPermission } = useAuth()
  const [jobs, setJobs] = useState<Job[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
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
      const [jobsResult, candidatesResult] = await Promise.all([
        apiClient.getPaginated<Job>('/recruitment/jobs'),
        apiClient.getPaginated<Candidate>('/recruitment/candidates'),
      ])
      setJobs(Array.isArray(jobsResult.data) ? jobsResult.data : [])
      setCandidates(Array.isArray(candidatesResult.data) ? candidatesResult.data : [])
    } catch (error) {
      console.error('Failed to fetch recruitment data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge className="bg-green-100 text-green-800">Open</Badge>
      case 'CLOSED':
        return <Badge className="bg-gray-100 text-gray-800">Closed</Badge>
      case 'ON_HOLD':
        return <Badge className="bg-yellow-100 text-yellow-800">On Hold</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getStageBadge = (stage: string) => {
    const colors: Record<string, string> = {
      NEW: 'bg-blue-100 text-blue-800',
      SCREENING: 'bg-purple-100 text-purple-800',
      INTERVIEW: 'bg-yellow-100 text-yellow-800',
      EVALUATION: 'bg-orange-100 text-orange-800',
      OFFER: 'bg-green-100 text-green-800',
      HIRED: 'bg-emerald-100 text-emerald-800',
      REJECTED: 'bg-red-100 text-red-800',
    }
    return <Badge className={colors[stage] || 'bg-gray-100 text-gray-800'}>{stage}</Badge>
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

  const openJobs = jobs.filter((j) => j.status === 'OPEN').length
  const totalCandidates = candidates.length
  const interviewsPending = candidates.filter((c) => c.stage === 'INTERVIEW').length

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Recruitment</h1>
            <p className="text-muted-foreground">Manage job openings and candidates</p>
          </div>
          {hasPermission('recruitment.manage_jobs', 'create') && (
            <Button onClick={() => router.push('/recruitment/jobs/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Post Job
            </Button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
              <Briefcase className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{openJobs}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCandidates}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Interviews Scheduled</CardTitle>
              <Calendar className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{interviewsPending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Offers Extended</CardTitle>
              <MapPin className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {candidates.filter((c) => c.stage === 'OFFER').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="jobs">
          <TabsList>
            <TabsTrigger value="jobs">Jobs ({jobs.length})</TabsTrigger>
            <TabsTrigger value="candidates">Candidates ({candidates.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="jobs" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Job Openings</CardTitle>
                <CardDescription>Active and closed positions</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : jobs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">No jobs posted</p>
                    <p className="text-sm text-muted-foreground">
                      Create your first job posting to start recruiting
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Position</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Applications</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobs.map((job) => (
                        <TableRow key={job.id}>
                          <TableCell className="font-medium">{job.title}</TableCell>
                          <TableCell>{job.department}</TableCell>
                          <TableCell>{job.location}</TableCell>
                          <TableCell>{job.employmentType}</TableCell>
                          <TableCell>{job.applicationsCount}</TableCell>
                          <TableCell>{getStatusBadge(job.status)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="candidates" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Candidates</CardTitle>
                <CardDescription>Track applicant pipeline</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : candidates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">No candidates yet</p>
                    <p className="text-sm text-muted-foreground">
                      Candidates will appear here once they apply
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Applied</TableHead>
                        <TableHead>Stage</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {candidates.map((candidate) => (
                        <TableRow key={candidate.id}>
                          <TableCell className="font-medium">
                            {candidate.firstName} {candidate.lastName}
                          </TableCell>
                          <TableCell>{candidate.job?.title || 'N/A'}</TableCell>
                          <TableCell>{candidate.email}</TableCell>
                          <TableCell>{candidate.source}</TableCell>
                          <TableCell>
                            {format(new Date(candidate.appliedDate), 'dd MMM yyyy')}
                          </TableCell>
                          <TableCell>{getStageBadge(candidate.stage)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
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
