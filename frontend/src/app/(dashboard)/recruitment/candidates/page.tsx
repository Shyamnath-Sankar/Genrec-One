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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Users, Plus, MoreHorizontal, Search, Mail, Phone, MapPin, Calendar, Eye, Edit, Trash2, UserPlus } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { format } from 'date-fns'

type Job = {
  id: string
  title: string
  department: string
}

type Candidate = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  location: string | null
  jobId: string
  job?: Job
  stage: 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected'
  source: string | null
  resumeUrl: string | null
  experience: number | null
  currentSalary: number | null
  expectedSalary: number | null
  noticePeriod: string | null
  skills: string[]
  notes: string | null
  appliedAt: string
  createdAt: string
}

const STAGES = [
  { value: 'applied', label: 'Applied', color: 'bg-gray-100 text-gray-800' },
  { value: 'screening', label: 'Screening', color: 'bg-blue-100 text-blue-800' },
  { value: 'interview', label: 'Interview', color: 'bg-purple-100 text-purple-800' },
  { value: 'offer', label: 'Offer', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'hired', label: 'Hired', color: 'bg-green-100 text-green-800' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-800' },
]

const SOURCES = [
  'LinkedIn',
  'Indeed',
  'Company Website',
  'Referral',
  'Job Fair',
  'Recruitment Agency',
  'Other',
]

export default function CandidatesPage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated, isSuperAdmin } = useAuth()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [stageFilter, setStageFilter] = useState('all')
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    jobId: '',
    source: '',
    experience: '',
    expectedSalary: '',
    noticePeriod: '',
    skills: '',
    notes: '',
  })

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
      return
    }

    if (isAuthenticated) {
      fetchCandidates()
      fetchJobs()
    }
  }, [authLoading, isAuthenticated, router])

  const fetchCandidates = async () => {
    try {
      setIsLoading(true)
      const data = await apiClient.get<Candidate[]>('/recruitment/candidates')
      setCandidates(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch candidates:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchJobs = async () => {
    try {
      const data = await apiClient.get<Job[]>('/recruitment/jobs?status=open')
      setJobs(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch jobs:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      location: '',
      jobId: '',
      source: '',
      experience: '',
      expectedSalary: '',
      noticePeriod: '',
      skills: '',
      notes: '',
    })
  }

  const handleCreate = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.jobId) {
      toast.error('Please fill in required fields')
      return
    }

    setIsSubmitting(true)
    try {
      await apiClient.post('/recruitment/candidates', {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone || null,
        location: formData.location || null,
        job_id: formData.jobId,
        source: formData.source || null,
        experience: formData.experience ? parseInt(formData.experience) : null,
        expected_salary: formData.expectedSalary ? parseInt(formData.expectedSalary) : null,
        notice_period: formData.noticePeriod || null,
        skills: formData.skills ? formData.skills.split(',').map(s => s.trim()) : [],
        notes: formData.notes || null,
        stage: 'applied',
      })
      toast.success('Candidate added successfully')
      setCreateDialogOpen(false)
      resetForm()
      fetchCandidates()
    } catch (error: any) {
      toast.error(error.message || 'Failed to add candidate')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStageChange = async (candidateId: string, newStage: string) => {
    try {
      await apiClient.put(`/recruitment/candidates/${candidateId}`, {
        stage: newStage,
      })
      toast.success('Candidate stage updated')
      fetchCandidates()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update stage')
    }
  }

  const openViewDialog = (candidate: Candidate) => {
    setSelectedCandidate(candidate)
    setViewDialogOpen(true)
  }

  const getStageBadge = (stage: string) => {
    const stageConfig = STAGES.find(s => s.value === stage)
    return (
      <Badge className={stageConfig?.color || 'bg-gray-100 text-gray-800'}>
        {stageConfig?.label || stage}
      </Badge>
    )
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  const filteredCandidates = candidates.filter(candidate => {
    const matchesSearch = 
      `${candidate.firstName} ${candidate.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.job?.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStage = stageFilter === 'all' || candidate.stage === stageFilter
    return matchesSearch && matchesStage
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

  const stageCounts = STAGES.reduce((acc, stage) => {
    acc[stage.value] = candidates.filter(c => c.stage === stage.value).length
    return acc
  }, {} as Record<string, number>)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Candidates</h1>
            <p className="text-muted-foreground">Manage job applicants and track their progress</p>
          </div>
          {isSuperAdmin && (
            <Button onClick={() => { resetForm(); setCreateDialogOpen(true) }}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Candidate
            </Button>
          )}
        </div>

        {/* Stage Overview */}
        <div className="grid gap-4 md:grid-cols-6">
          {STAGES.map((stage) => (
            <Card 
              key={stage.value}
              className={`cursor-pointer transition-colors ${stageFilter === stage.value ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setStageFilter(stageFilter === stage.value ? 'all' : stage.value)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{stage.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stageCounts[stage.value] || 0}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search candidates..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {STAGES.map((stage) => (
                    <SelectItem key={stage.value} value={stage.value}>
                      {stage.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Candidates Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Candidates</CardTitle>
            <CardDescription>
              {filteredCandidates.length} candidates found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No candidates found</p>
                <p className="text-sm text-muted-foreground">
                  {searchQuery || stageFilter !== 'all' 
                    ? 'Try adjusting your filters'
                    : 'Add candidates to track their application progress'}
                </p>
                {isSuperAdmin && !searchQuery && stageFilter === 'all' && (
                  <Button className="mt-4" onClick={() => { resetForm(); setCreateDialogOpen(true) }}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add First Candidate
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Job Position</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCandidates.map((candidate) => (
                    <TableRow key={candidate.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {getInitials(candidate.firstName, candidate.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {candidate.firstName} {candidate.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">{candidate.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {candidate.job?.title || '-'}
                      </TableCell>
                      <TableCell>
                        {format(new Date(candidate.appliedAt || candidate.createdAt), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={candidate.stage}
                          onValueChange={(value) => handleStageChange(candidate.id, value)}
                        >
                          <SelectTrigger className="w-[130px]">
                            {getStageBadge(candidate.stage)}
                          </SelectTrigger>
                          <SelectContent>
                            {STAGES.map((stage) => (
                              <SelectItem key={stage.value} value={stage.value}>
                                {stage.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {candidate.source || '-'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openViewDialog(candidate)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/recruitment/interviews?candidate=${candidate.id}`)}>
                              <Calendar className="mr-2 h-4 w-4" />
                              Schedule Interview
                            </DropdownMenuItem>
                            {candidate.email && (
                              <DropdownMenuItem onClick={() => window.location.href = `mailto:${candidate.email}`}>
                                <Mail className="mr-2 h-4 w-4" />
                                Send Email
                              </DropdownMenuItem>
                            )}
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

      {/* Add Candidate Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Candidate</DialogTitle>
            <DialogDescription>
              Add a candidate to the recruitment pipeline
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Job Position *</Label>
                <Select
                  value={formData.jobId}
                  onValueChange={(value) => setFormData({ ...formData, jobId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select job" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Source</Label>
                <Select
                  value={formData.source}
                  onValueChange={(value) => setFormData({ ...formData, source: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="How did they apply?" />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCES.map((source) => (
                      <SelectItem key={source} value={source}>
                        {source}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Experience (years)</Label>
                <Input
                  type="number"
                  placeholder="5"
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Expected Salary</Label>
                <Input
                  type="number"
                  placeholder="1200000"
                  value={formData.expectedSalary}
                  onChange={(e) => setFormData({ ...formData, expectedSalary: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Notice Period</Label>
                <Input
                  placeholder="30 days"
                  value={formData.noticePeriod}
                  onChange={(e) => setFormData({ ...formData, noticePeriod: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                placeholder="Mumbai, India"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Skills</Label>
              <Input
                placeholder="React, Node.js, TypeScript (comma separated)"
                value={formData.skills}
                onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional notes about the candidate..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Candidate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Candidate Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedCandidate?.firstName} {selectedCandidate?.lastName}
            </DialogTitle>
            <DialogDescription>
              Applied for {selectedCandidate?.job?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-xl">
                  {selectedCandidate && getInitials(selectedCandidate.firstName, selectedCandidate.lastName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-lg">
                  {selectedCandidate?.firstName} {selectedCandidate?.lastName}
                </p>
                {getStageBadge(selectedCandidate?.stage || 'applied')}
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {selectedCandidate?.email}
              </div>
              {selectedCandidate?.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {selectedCandidate.phone}
                </div>
              )}
              {selectedCandidate?.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  {selectedCandidate.location}
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Applied {selectedCandidate?.appliedAt && format(new Date(selectedCandidate.appliedAt), 'dd MMM yyyy')}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <p className="text-sm text-muted-foreground">Experience</p>
                <p className="font-medium">{selectedCandidate?.experience ? `${selectedCandidate.experience} years` : '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expected Salary</p>
                <p className="font-medium">
                  {selectedCandidate?.expectedSalary 
                    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(selectedCandidate.expectedSalary)
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Notice Period</p>
                <p className="font-medium">{selectedCandidate?.noticePeriod || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Source</p>
                <p className="font-medium">{selectedCandidate?.source || '-'}</p>
              </div>
            </div>

            {selectedCandidate?.skills && selectedCandidate.skills.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Skills</p>
                <div className="flex flex-wrap gap-1">
                  {selectedCandidate.skills.map((skill, idx) => (
                    <Badge key={idx} variant="secondary">{skill}</Badge>
                  ))}
                </div>
              </div>
            )}

            {selectedCandidate?.notes && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Notes</p>
                <p className="text-sm">{selectedCandidate.notes}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => router.push(`/recruitment/interviews?candidate=${selectedCandidate?.id}`)}>
              Schedule Interview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
