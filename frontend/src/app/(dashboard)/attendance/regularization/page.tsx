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
import { ClipboardEdit, Plus, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { format, subDays, parseISO } from 'date-fns'
import { toast } from 'sonner'

type RegularizationRequest = {
  id: string
  date: string
  checkInTime: string | null
  checkOutTime: string | null
  reason: string
  status: string
  approverRemarks: string | null
  createdAt: string | null
}

export default function RegularizationPage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated } = useAuth()
  const [requests, setRequests] = useState<RegularizationRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    date: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
    checkInTime: '09:00',
    checkOutTime: '18:00',
    reason: '',
  })

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
      return
    }

    if (isAuthenticated) {
      fetchRequests()
    }
  }, [authLoading, isAuthenticated, router])

  const fetchRequests = async () => {
    try {
      setIsLoading(true)
      const data = await apiClient.get<RegularizationRequest[]>('/attendance/regularization/list')
      setRequests(Array.isArray(data) ? data : [])
    } catch (error) {
      toast.error('Failed to fetch regularization requests')
      console.error('Failed to fetch regularization requests:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      date: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
      checkInTime: '09:00',
      checkOutTime: '18:00',
      reason: '',
    })
  }

  const handleSubmit = async () => {
    if (!formData.date || !formData.checkInTime || !formData.checkOutTime || !formData.reason) {
      toast.error('Please fill in all required fields')
      return
    }

    // Validate date is not in future
    if (new Date(formData.date) > new Date()) {
      toast.error('Cannot request regularization for future dates')
      return
    }

    // Validate check-out is after check-in
    if (formData.checkOutTime <= formData.checkInTime) {
      toast.error('Check-out time must be after check-in time')
      return
    }

    setIsSubmitting(true)
    try {
      // Combine date and time for the API
      const checkInDateTime = `${formData.date}T${formData.checkInTime}:00`
      const checkOutDateTime = `${formData.date}T${formData.checkOutTime}:00`

      await apiClient.post('/attendance/regularization', {
        date: formData.date,
        check_in_time: checkInDateTime,
        check_out_time: checkOutDateTime,
        reason: formData.reason,
      })
      toast.success('Regularization request submitted successfully')
      setDialogOpen(false)
      resetForm()
      fetchRequests()
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit request')
    } finally {
      setIsSubmitting(false)
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
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Calculate stats
  const pendingCount = requests.filter(r => r.status === 'PENDING').length
  const approvedCount = requests.filter(r => r.status === 'APPROVED').length
  const rejectedCount = requests.filter(r => r.status === 'REJECTED').length

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Regularization</h1>
            <p className="text-muted-foreground">Request attendance corrections for missed check-ins/check-outs</p>
          </div>
          <Button onClick={() => { resetForm(); setDialogOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <ClipboardEdit className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{requests.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{approvedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rejectedCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Requests Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardEdit className="h-5 w-5" />
              Regularization Requests
            </CardTitle>
            <CardDescription>View and track your attendance correction requests</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ClipboardEdit className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No Regularization Requests</p>
                <p className="text-sm text-muted-foreground">
                  Submit a request to correct your attendance entries
                </p>
                <Button className="mt-4" onClick={() => { resetForm(); setDialogOpen(true) }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Submit Request
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Remarks</TableHead>
                    <TableHead>Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        {format(parseISO(request.date), 'EEE, dd MMM yyyy')}
                      </TableCell>
                      <TableCell>
                        {request.checkInTime
                          ? format(parseISO(request.checkInTime), 'hh:mm a')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {request.checkOutTime
                          ? format(parseISO(request.checkOutTime), 'hh:mm a')
                          : '-'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{request.reason}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {request.approverRemarks || '-'}
                      </TableCell>
                      <TableCell>
                        {request.createdAt
                          ? format(parseISO(request.createdAt), 'dd MMM yyyy')
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* New Request Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Attendance Regularization</DialogTitle>
            <DialogDescription>
              Submit a request to correct your attendance for a past date
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                max={format(new Date(), 'yyyy-MM-dd')}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="checkIn">Check In Time *</Label>
                <Input
                  id="checkIn"
                  type="time"
                  value={formData.checkInTime}
                  onChange={(e) => setFormData({ ...formData, checkInTime: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="checkOut">Check Out Time *</Label>
                <Input
                  id="checkOut"
                  type="time"
                  value={formData.checkOutTime}
                  onChange={(e) => setFormData({ ...formData, checkOutTime: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reason">Reason *</Label>
              <Textarea
                id="reason"
                placeholder="Explain why you need this attendance correction..."
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={3}
              />
            </div>
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Note:</p>
                  <p>This request will be sent to your reporting manager for approval.</p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
