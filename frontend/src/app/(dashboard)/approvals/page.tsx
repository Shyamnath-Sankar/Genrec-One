'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { apiClient } from '@/lib/api/client'
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ChevronRight,
  FileText,
  Calendar,
  DollarSign,
  Plane,
  RefreshCw,
} from 'lucide-react'

type PendingApproval = {
  id: string
  requestId: string
  stepNumber: number
  module: string
  entityType: string
  entityId: string
  summary: Record<string, unknown>
  currentStep: number
  totalSteps: number
  createdAt: string
}

type MyRequest = {
  id: string
  module: string
  entityType: string
  entityId: string
  summary: Record<string, unknown>
  currentStep: number
  totalSteps: number
  status: string
  approvals: Array<{
    stepNumber: number
    status: string
    remarks: string | null
    actionAt: string | null
  }>
  createdAt: string
  completedAt: string | null
}

export default function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState('pending')
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([])
  const [myRequests, setMyRequests] = useState<MyRequest[]>([])
  const [selectedApproval, setSelectedApproval] = useState<string | null>(null)
  const [remarks, setRemarks] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [pendingRes, requestsRes] = await Promise.all([
        apiClient.get<{ data: PendingApproval[] }>('/workflows/pending'),
        apiClient.get<{ data: MyRequest[] }>('/workflows/my-requests'),
      ])
      setPendingApprovals((pendingRes as { data: PendingApproval[] }).data || [])
      setMyRequests((requestsRes as { data: MyRequest[] }).data || [])
    } catch (error) {
      console.error('Failed to fetch approvals:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async (actionId: string) => {
    try {
      await apiClient.post(`/workflows/approve/${actionId}`, {
        status: 'approved',
        remarks,
      })
      setRemarks('')
      setSelectedApproval(null)
      fetchData()
    } catch (error) {
      console.error('Failed to approve:', error)
    }
  }

  const handleReject = async (actionId: string) => {
    if (!remarks.trim()) {
      alert('Please provide remarks for rejection')
      return
    }
    try {
      await apiClient.post(`/workflows/approve/${actionId}`, {
        status: 'rejected',
        remarks,
      })
      setRemarks('')
      setSelectedApproval(null)
      fetchData()
    } catch (error) {
      console.error('Failed to reject:', error)
    }
  }

  const getModuleIcon = (module: string) => {
    switch (module) {
      case 'leave': return <Calendar className="h-5 w-5 text-blue-500" />
      case 'expense': return <DollarSign className="h-5 w-5 text-green-500" />
      case 'travel': return <Plane className="h-5 w-5 text-purple-500" />
      default: return <FileText className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>
      case 'rejected':
        return <Badge className="bg-red-500">Rejected</Badge>
      case 'pending':
        return <Badge className="bg-yellow-500">Pending</Badge>
      case 'cancelled':
        return <Badge variant="secondary">Cancelled</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Approvals</h1>
            <p className="text-muted-foreground">Manage pending approvals and track your requests</p>
          </div>
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Approvals</p>
                  <p className="text-3xl font-bold">{pendingApprovals.length}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">My Pending</p>
                  <p className="text-3xl font-bold">
                    {myRequests.filter(r => r.status === 'pending').length}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Approved (30d)</p>
                  <p className="text-3xl font-bold">
                    {myRequests.filter(r => r.status === 'approved').length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Rejected (30d)</p>
                  <p className="text-3xl font-bold">
                    {myRequests.filter(r => r.status === 'rejected').length}
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pending">
              Pending Approvals
              {pendingApprovals.length > 0 && (
                <Badge className="ml-2 bg-yellow-500">{pendingApprovals.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="my-requests">My Requests</TabsTrigger>
            <TabsTrigger value="history">Approval History</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingApprovals.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <p className="text-muted-foreground">All caught up! No pending approvals.</p>
                </CardContent>
              </Card>
            ) : (
              pendingApprovals.map((approval) => (
                <Card key={approval.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getModuleIcon(approval.module)}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium capitalize">{approval.module} Request</span>
                            <Badge variant="outline">
                              Step {approval.currentStep} of {approval.totalSteps}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {approval.summary && typeof approval.summary === 'object' 
                              ? JSON.stringify(approval.summary).slice(0, 100) 
                              : 'View details'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Submitted {formatDate(approval.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedApproval === approval.id ? (
                          <div className="space-y-2">
                            <Textarea
                              placeholder="Add remarks (required for rejection)"
                              value={remarks}
                              onChange={(e) => setRemarks(e.target.value)}
                              rows={2}
                              className="w-64"
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleApprove(approval.id)}>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleReject(approval.id)}>
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setSelectedApproval(null)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button size="sm" onClick={() => setSelectedApproval(approval.id)}>
                            Take Action
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="my-requests" className="space-y-4">
            {myRequests.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No requests submitted yet.</p>
                </CardContent>
              </Card>
            ) : (
              myRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getModuleIcon(request.module)}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium capitalize">{request.module} Request</span>
                            {getStatusBadge(request.status)}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {request.summary && typeof request.summary === 'object' 
                              ? JSON.stringify(request.summary).slice(0, 100) 
                              : 'View details'}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Submitted {formatDate(request.createdAt)}</span>
                            {request.completedAt && (
                              <span>Completed {formatDate(request.completedAt)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">
                          Step {request.currentStep} of {request.totalSteps}
                        </p>
                        <div className="flex gap-1 mt-2">
                          {request.approvals.map((approval, idx) => (
                            <div
                              key={idx}
                              className={`h-2 w-8 rounded ${
                                approval.status === 'approved' ? 'bg-green-500' :
                                approval.status === 'rejected' ? 'bg-red-500' :
                                'bg-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardContent className="py-8 text-center">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">View your approval history here.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
