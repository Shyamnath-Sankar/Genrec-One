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
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plane, Plus, MapPin, Calendar, DollarSign, Eye } from 'lucide-react'
import { format } from 'date-fns'

type TravelRequest = {
  id: string
  purpose: string
  destination: string
  departureDate: string
  returnDate: string
  estimatedCost: number
  currency: string
  status: string
  createdAt: string
}

export default function TravelPage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated } = useAuth()
  const [requests, setRequests] = useState<TravelRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Form state
  const [newRequest, setNewRequest] = useState({
    purpose: '',
    destination: '',
    departureDate: '',
    returnDate: '',
    estimatedCost: 0,
    currency: 'USD',
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
      const data = await apiClient.get<TravelRequest[]>('/travel')
      setRequests(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch travel data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      await apiClient.post('/travel', newRequest)
      setIsDialogOpen(false)
      setNewRequest({
        purpose: '',
        destination: '',
        departureDate: '',
        returnDate: '',
        estimatedCost: 0,
        currency: 'USD',
      })
      fetchData()
    } catch (error) {
      console.error('Failed to create travel request:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>
      case 'COMPLETED':
        return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>
      case 'CANCELLED':
        return <Badge className="bg-gray-100 text-gray-800">Cancelled</Badge>
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

  const pendingRequests = requests.filter((r) => r.status === 'PENDING').length
  const approvedRequests = requests.filter((r) => r.status === 'APPROVED').length
  const totalCost = requests.reduce((sum, r) => sum + r.estimatedCost, 0)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Travel Requests</h1>
            <p className="text-muted-foreground">Submit and track travel requests</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Travel Request</DialogTitle>
                <DialogDescription>Submit a travel request for approval</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Destination</Label>
                  <Input
                    placeholder="City, Country"
                    value={newRequest.destination}
                    onChange={(e) => setNewRequest({ ...newRequest, destination: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Departure Date</Label>
                    <Input
                      type="date"
                      value={newRequest.departureDate}
                      onChange={(e) =>
                        setNewRequest({ ...newRequest, departureDate: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Return Date</Label>
                    <Input
                      type="date"
                      value={newRequest.returnDate}
                      onChange={(e) =>
                        setNewRequest({ ...newRequest, returnDate: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Estimated Cost</Label>
                  <Input
                    type="number"
                    min="0"
                    value={newRequest.estimatedCost}
                    onChange={(e) =>
                      setNewRequest({ ...newRequest, estimatedCost: parseFloat(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Purpose</Label>
                  <Textarea
                    placeholder="Describe the purpose of this trip..."
                    value={newRequest.purpose}
                    onChange={(e) => setNewRequest({ ...newRequest, purpose: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>Submit Request</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <Plane className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{requests.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Calendar className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingRequests}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <MapPin className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{approvedRequests}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
              <DollarSign className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalCost.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        {/* Requests Table */}
        <Card>
          <CardHeader>
            <CardTitle>My Travel Requests</CardTitle>
            <CardDescription>Your submitted travel requests</CardDescription>
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
                <p className="text-lg font-medium">No travel requests</p>
                <p className="text-sm text-muted-foreground">
                  Submit a travel request to get started
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Destination</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead className="text-right">Est. Cost</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">{request.destination}</TableCell>
                      <TableCell className="max-w-xs truncate">{request.purpose}</TableCell>
                      <TableCell>
                        {format(new Date(request.departureDate), 'dd MMM')} -{' '}
                        {format(new Date(request.returnDate), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        ${request.estimatedCost.toLocaleString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
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
      </div>
    </DashboardLayout>
  )
}
