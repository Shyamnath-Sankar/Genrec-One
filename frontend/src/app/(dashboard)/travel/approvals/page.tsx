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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Plane, Check, X, Eye, MapPin, Calendar, DollarSign } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

type Employee = {
  id: string
  firstName: string
  lastName: string
  department?: { name: string }
}

type TravelRequest = {
  id: string
  requestNumber: string
  employee: Employee
  purpose: string
  travelType: string
  fromLocation: string
  toLocation: string
  departureDate: string
  returnDate: string | null
  totalEstimatedCost: number
  status: string
  createdAt: string
}

export default function TravelApprovalsPage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated, hasPermission } = useAuth()
  const [requests, setRequests] = useState<TravelRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<TravelRequest | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null)
  const [comments, setComments] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
      return
    }

    if (isAuthenticated) {
      fetchPendingRequests()
    }
  }, [authLoading, isAuthenticated, router])

  const fetchPendingRequests = async () => {
    try {
      setIsLoading(true)
      const data = await apiClient.get<TravelRequest[]>('/travel/pending-approvals')
      setRequests(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch travel requests:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return

    try {
      setIsProcessing(true)
      await apiClient.post(`/travel/${selectedRequest.id}/${actionType}`, { comments })
      toast.success(`Travel request ${actionType === 'approve' ? 'approved' : 'rejected'} successfully`)
      setSelectedRequest(null)
      setActionType(null)
      setComments('')
      fetchPendingRequests()
    } catch (error) {
      console.error(`Failed to ${actionType} request:`, error)
      toast.error(`Failed to ${actionType} request`)
    } finally {
      setIsProcessing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case 'APPROVED':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>
      case 'COMPLETED':
        return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
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
          <h1 className="text-2xl font-bold tracking-tight">Travel Approvals</h1>
          <p className="text-muted-foreground">Review and approve travel requests from your team</p>
        </div>

        {/* Pending Requests */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Requests ({requests.length})</CardTitle>
            <CardDescription>Travel requests awaiting your approval</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Plane className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No pending requests</p>
                <p className="text-sm text-muted-foreground">
                  Travel requests will appear here when submitted
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request #</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Est. Cost</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-mono text-sm">{request.requestNumber}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {request.employee.firstName} {request.employee.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {request.employee.department?.name}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{request.purpose}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <span>{request.fromLocation}</span>
                          <span className="text-muted-foreground">-</span>
                          <span>{request.toLocation}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{format(new Date(request.departureDate), 'dd MMM')}</p>
                          {request.returnDate && (
                            <p className="text-muted-foreground">
                              - {format(new Date(request.returnDate), 'dd MMM')}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        ${request.totalEstimatedCost.toFixed(2)}
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/travel/${request.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-green-600 hover:text-green-700"
                            onClick={() => {
                              setSelectedRequest(request)
                              setActionType('approve')
                            }}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => {
                              setSelectedRequest(request)
                              setActionType('reject')
                            }}
                          >
                            <X className="h-4 w-4" />
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

        {/* Approval Dialog */}
        <Dialog
          open={!!selectedRequest && !!actionType}
          onOpenChange={() => {
            setSelectedRequest(null)
            setActionType(null)
            setComments('')
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === 'approve' ? 'Approve' : 'Reject'} Travel Request
              </DialogTitle>
              <DialogDescription>
                {actionType === 'approve'
                  ? 'Confirm approval of this travel request'
                  : 'Provide a reason for rejecting this request'}
              </DialogDescription>
            </DialogHeader>

            {selectedRequest && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Employee</p>
                    <p className="font-medium">
                      {selectedRequest.employee.firstName} {selectedRequest.employee.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Purpose</p>
                    <p className="font-medium">{selectedRequest.purpose}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Route</p>
                    <p className="font-medium">
                      {selectedRequest.fromLocation} - {selectedRequest.toLocation}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Estimated Cost</p>
                    <p className="font-medium">${selectedRequest.totalEstimatedCost.toFixed(2)}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="comments">
                    Comments {actionType === 'reject' && '*'}
                  </Label>
                  <Textarea
                    id="comments"
                    placeholder={
                      actionType === 'approve'
                        ? 'Optional comments...'
                        : 'Please provide a reason for rejection...'
                    }
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedRequest(null)
                  setActionType(null)
                  setComments('')
                }}
              >
                Cancel
              </Button>
              <Button
                variant={actionType === 'approve' ? 'default' : 'destructive'}
                onClick={handleAction}
                disabled={isProcessing || (actionType === 'reject' && !comments)}
              >
                {isProcessing
                  ? 'Processing...'
                  : actionType === 'approve'
                  ? 'Approve Request'
                  : 'Reject Request'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
