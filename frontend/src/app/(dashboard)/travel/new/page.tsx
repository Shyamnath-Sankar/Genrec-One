'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { ArrowLeft, Plane, Calendar, MapPin, DollarSign, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

type TravelType = 'DOMESTIC' | 'INTERNATIONAL'

type TravelExpense = {
  type: string
  description: string
  estimatedAmount: number
}

export default function NewTravelRequestPage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    purpose: '',
    travelType: 'DOMESTIC' as TravelType,
    fromLocation: '',
    toLocation: '',
    departureDate: '',
    returnDate: '',
    notes: '',
  })

  const [expenses, setExpenses] = useState<TravelExpense[]>([
    { type: 'FLIGHT', description: '', estimatedAmount: 0 },
  ])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
      return
    }
  }, [authLoading, isAuthenticated, router])

  const addExpense = () => {
    setExpenses([...expenses, { type: 'OTHER', description: '', estimatedAmount: 0 }])
  }

  const removeExpense = (index: number) => {
    setExpenses(expenses.filter((_, i) => i !== index))
  }

  const updateExpense = (index: number, field: keyof TravelExpense, value: string | number) => {
    const updated = [...expenses]
    updated[index] = { ...updated[index], [field]: value }
    setExpenses(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.purpose || !formData.fromLocation || !formData.toLocation || !formData.departureDate) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      setIsSubmitting(true)
      await apiClient.post('/travel', {
        ...formData,
        expenses,
        totalEstimatedCost: expenses.reduce((sum, e) => sum + e.estimatedAmount, 0),
      })
      toast.success('Travel request submitted successfully')
      router.push('/travel')
    } catch (error) {
      console.error('Failed to submit travel request:', error)
      toast.error('Failed to submit travel request')
    } finally {
      setIsSubmitting(false)
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

  const totalEstimated = expenses.reduce((sum, e) => sum + (e.estimatedAmount || 0), 0)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">New Travel Request</h1>
            <p className="text-muted-foreground">Submit a request for business travel</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Trip Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plane className="h-5 w-5" />
                Trip Details
              </CardTitle>
              <CardDescription>Basic information about your travel</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose of Travel *</Label>
                <Input
                  id="purpose"
                  placeholder="e.g., Client meeting, Conference attendance"
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Travel Type *</Label>
                  <Select
                    value={formData.travelType}
                    onValueChange={(value: TravelType) =>
                      setFormData({ ...formData, travelType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DOMESTIC">Domestic</SelectItem>
                      <SelectItem value="INTERNATIONAL">International</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fromLocation">From Location *</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="fromLocation"
                      className="pl-10"
                      placeholder="Departure city"
                      value={formData.fromLocation}
                      onChange={(e) => setFormData({ ...formData, fromLocation: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="toLocation">To Location *</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="toLocation"
                      className="pl-10"
                      placeholder="Destination city"
                      value={formData.toLocation}
                      onChange={(e) => setFormData({ ...formData, toLocation: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="departureDate">Departure Date *</Label>
                  <Input
                    id="departureDate"
                    type="date"
                    value={formData.departureDate}
                    onChange={(e) => setFormData({ ...formData, departureDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="returnDate">Return Date</Label>
                  <Input
                    id="returnDate"
                    type="date"
                    value={formData.returnDate}
                    onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional information about the trip..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Estimated Expenses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Estimated Expenses
                </span>
                <Button type="button" variant="outline" size="sm" onClick={addExpense}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Expense
                </Button>
              </CardTitle>
              <CardDescription>List your expected travel expenses</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {expenses.map((expense, index) => (
                <div key={index} className="flex items-end gap-4 p-4 border rounded-lg">
                  <div className="flex-1 space-y-2">
                    <Label>Expense Type</Label>
                    <Select
                      value={expense.type}
                      onValueChange={(value) => updateExpense(index, 'type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FLIGHT">Flight</SelectItem>
                        <SelectItem value="HOTEL">Hotel</SelectItem>
                        <SelectItem value="TRANSPORT">Local Transport</SelectItem>
                        <SelectItem value="MEALS">Meals</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label>Description</Label>
                    <Input
                      placeholder="Description"
                      value={expense.description}
                      onChange={(e) => updateExpense(index, 'description', e.target.value)}
                    />
                  </div>
                  <div className="w-32 space-y-2">
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={expense.estimatedAmount || ''}
                      onChange={(e) =>
                        updateExpense(index, 'estimatedAmount', parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                  {expenses.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeExpense(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}

              <div className="flex justify-end pt-4 border-t">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Estimated Cost</p>
                  <p className="text-2xl font-bold">${totalEstimated.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <Button type="submit" disabled={isSubmitting}>
              <Plane className="mr-2 h-4 w-4" />
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
