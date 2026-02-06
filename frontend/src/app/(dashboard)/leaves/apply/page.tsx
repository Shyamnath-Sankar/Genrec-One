'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/use-auth'
import { apiClient } from '@/lib/api/client'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar, ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { differenceInDays, parseISO, isWeekend, eachDayOfInterval, format } from 'date-fns'

type LeaveType = {
  id: string
  name: string
  code: string
  color: string | null
  isPaid: boolean
  requiresApproval: boolean
}

type LeaveBalance = {
  leaveTypeId: string
  currentBalance: number
}

export default function ApplyLeavePage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated } = useAuth()
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    leaveTypeId: '',
    fromDate: '',
    toDate: '',
    reason: '',
    isHalfDay: false,
    halfDayType: 'FIRST_HALF',
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
      const [typesData, balanceData] = await Promise.all([
        apiClient.get<LeaveType[]>('/leaves/types'),
        apiClient.get<LeaveBalance[]>('/leaves/balance'),
      ])
      setLeaveTypes(Array.isArray(typesData) ? typesData : [])
      setBalances(Array.isArray(balanceData) ? balanceData : [])
    } catch (error) {
      console.error('Failed to fetch leave data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateDays = () => {
    if (!formData.fromDate || !formData.toDate) return 0
    
    try {
      const from = parseISO(formData.fromDate)
      const to = parseISO(formData.toDate)
      
      if (from > to) return 0
      
      // Count working days (excluding weekends)
      const days = eachDayOfInterval({ start: from, end: to })
      const workingDays = days.filter(day => !isWeekend(day)).length
      
      return formData.isHalfDay ? 0.5 : workingDays
    } catch {
      return 0
    }
  }

  const getBalance = () => {
    const balance = balances.find((b) => b.leaveTypeId === formData.leaveTypeId)
    return balance?.currentBalance || 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.leaveTypeId || !formData.fromDate || !formData.toDate || !formData.reason) {
      toast.error('Please fill all required fields')
      return
    }

    const days = calculateDays()
    if (days <= 0) {
      toast.error('Invalid date range')
      return
    }

    if (days > getBalance()) {
      toast.error('Insufficient leave balance')
      return
    }

    setIsSubmitting(true)
    try {
      await apiClient.post('/leaves/applications', {
        leaveTypeId: formData.leaveTypeId,
        fromDate: formData.fromDate,
        toDate: formData.toDate,
        reason: formData.reason,
        isHalfDay: formData.isHalfDay,
        halfDayType: formData.isHalfDay ? formData.halfDayType : null,
      })
      
      toast.success('Leave application submitted successfully')
      router.push('/leaves')
    } catch (error) {
      toast.error('Failed to submit leave application')
      console.error('Failed to submit:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    )
  }

  const selectedType = leaveTypes.find((t) => t.id === formData.leaveTypeId)
  const totalDays = calculateDays()

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/leaves">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Apply for Leave</h1>
            <p className="text-muted-foreground">Submit a new leave request</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Leave Details
              </CardTitle>
              <CardDescription>Fill in the details for your leave request</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Leave Type */}
              <div className="space-y-2">
                <Label htmlFor="leaveType">Leave Type *</Label>
                <Select
                  value={formData.leaveTypeId}
                  onValueChange={(value) => setFormData({ ...formData, leaveTypeId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveTypes.map((type) => {
                      const balance = balances.find((b) => b.leaveTypeId === type.id)
                      return (
                        <SelectItem key={type.id} value={type.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: type.color || '#6366f1' }}
                            />
                            {type.name}
                            <span className="text-muted-foreground">
                              ({balance?.currentBalance || 0} days available)
                            </span>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                {selectedType && (
                  <p className="text-sm text-muted-foreground">
                    Available balance: <strong>{getBalance()} days</strong>
                    {selectedType.isPaid ? ' (Paid leave)' : ' (Unpaid leave)'}
                  </p>
                )}
              </div>

              {/* Date Range */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fromDate">From Date *</Label>
                  <Input
                    id="fromDate"
                    type="date"
                    value={formData.fromDate}
                    onChange={(e) => setFormData({ ...formData, fromDate: e.target.value })}
                    min={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="toDate">To Date *</Label>
                  <Input
                    id="toDate"
                    type="date"
                    value={formData.toDate}
                    onChange={(e) => setFormData({ ...formData, toDate: e.target.value })}
                    min={formData.fromDate || format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
              </div>

              {/* Half Day Option */}
              {formData.fromDate === formData.toDate && formData.fromDate && (
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isHalfDay}
                      onChange={(e) => setFormData({ ...formData, isHalfDay: e.target.checked })}
                      className="rounded"
                    />
                    <span>Half day leave</span>
                  </label>
                  {formData.isHalfDay && (
                    <Select
                      value={formData.halfDayType}
                      onValueChange={(value) => setFormData({ ...formData, halfDayType: value })}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FIRST_HALF">First Half</SelectItem>
                        <SelectItem value="SECOND_HALF">Second Half</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {/* Total Days */}
              {totalDays > 0 && (
                <div className="rounded-lg bg-muted p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total leave days:</span>
                    <span className="text-xl font-bold">{totalDays} day{totalDays !== 1 ? 's' : ''}</span>
                  </div>
                  {totalDays > getBalance() && (
                    <p className="text-sm text-destructive mt-2">
                      Insufficient balance! You only have {getBalance()} days available.
                    </p>
                  )}
                </div>
              )}

              {/* Reason */}
              <div className="space-y-2">
                <Label htmlFor="reason">Reason *</Label>
                <Textarea
                  id="reason"
                  placeholder="Please provide a reason for your leave request..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={4}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-4 pt-4">
                <Button type="button" variant="outline" asChild>
                  <Link href="/leaves">Cancel</Link>
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || totalDays <= 0 || totalDays > getBalance()}
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </DashboardLayout>
  )
}
