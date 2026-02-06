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
import { ArrowLeft, Send, Receipt, Upload, Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'

type ExpenseCategory = {
  id: string
  name: string
  code: string
  maxAmount: number | null
}

type ExpenseItem = {
  description: string
  amount: number
  categoryId: string
  receiptFile: File | null
}

const EXPENSE_CATEGORIES = [
  { id: '1', name: 'Travel', code: 'TRAVEL', maxAmount: 50000 },
  { id: '2', name: 'Meals & Entertainment', code: 'MEALS', maxAmount: 5000 },
  { id: '3', name: 'Office Supplies', code: 'OFFICE', maxAmount: 10000 },
  { id: '4', name: 'Communication', code: 'COMM', maxAmount: 3000 },
  { id: '5', name: 'Software & Subscriptions', code: 'SOFTWARE', maxAmount: 20000 },
  { id: '6', name: 'Training & Education', code: 'TRAINING', maxAmount: 50000 },
  { id: '7', name: 'Equipment', code: 'EQUIPMENT', maxAmount: 100000 },
  { id: '8', name: 'Other', code: 'OTHER', maxAmount: null },
]

export default function SubmitExpensePage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated } = useAuth()
  const [categories, setCategories] = useState<ExpenseCategory[]>(EXPENSE_CATEGORIES)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    expenseDate: new Date().toISOString().split('T')[0],
  })

  const [items, setItems] = useState<ExpenseItem[]>([
    { description: '', amount: 0, categoryId: '', receiptFile: null }
  ])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
      return
    }

    if (isAuthenticated) {
      fetchCategories()
    }
  }, [authLoading, isAuthenticated, router])

  const fetchCategories = async () => {
    try {
      setIsLoading(true)
      const data = await apiClient.get<ExpenseCategory[]>('/expenses/categories')
      if (Array.isArray(data) && data.length > 0) {
        setCategories(data)
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const addItem = () => {
    setItems([...items, { description: '', amount: 0, categoryId: '', receiptFile: null }])
  }

  const removeItem = (index: number) => {
    if (items.length <= 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof ExpenseItem, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title || !formData.expenseDate) {
      toast.error('Please fill in all required fields')
      return
    }

    const validItems = items.filter(item => item.description && item.amount > 0 && item.categoryId)
    if (validItems.length === 0) {
      toast.error('Please add at least one expense item')
      return
    }

    try {
      setIsSubmitting(true)
      await apiClient.post('/expenses', {
        title: formData.title,
        description: formData.description,
        expense_date: formData.expenseDate,
        total_amount: totalAmount,
        items: validItems.map(item => ({
          description: item.description,
          amount: item.amount,
          category_id: item.categoryId,
        })),
      })
      toast.success('Expense claim submitted successfully')
      router.push('/expenses')
    } catch (error: any) {
      console.error('Failed to submit expense:', error)
      toast.error(error.message || 'Failed to submit expense')
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Submit Expense</h1>
            <p className="text-muted-foreground">Create a new expense claim for reimbursement</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Expense Details</CardTitle>
                  <CardDescription>
                    Provide information about your expense claim
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="title">Expense Title *</Label>
                      <Input
                        id="title"
                        placeholder="e.g., Client Meeting Expenses"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expenseDate">Expense Date *</Label>
                      <Input
                        id="expenseDate"
                        type="date"
                        value={formData.expenseDate}
                        onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Brief description of the expense claim..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Expense Items</CardTitle>
                      <CardDescription>
                        Add individual expense items with receipts
                      </CardDescription>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addItem}>
                      <Plus className="mr-1 h-4 w-4" />
                      Add Item
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {items.map((item, index) => (
                    <div key={index} className="p-4 border rounded-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Item {index + 1}</span>
                        {items.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-600"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Category *</Label>
                          <Select
                            value={item.categoryId}
                            onValueChange={(value) => updateItem(index, 'categoryId', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Amount *</Label>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={item.amount || ''}
                            onChange={(e) => updateItem(index, 'amount', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Description *</Label>
                        <Input
                          placeholder="What was this expense for?"
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Receipt (Optional)</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => updateItem(index, 'receiptFile', e.target.files?.[0] || null)}
                            className="flex-1"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Supported formats: JPG, PNG, PDF (max 5MB)
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Summary Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {items.filter(i => i.amount > 0).map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-muted-foreground truncate max-w-[150px]">
                          {item.description || `Item ${index + 1}`}
                        </span>
                        <span className="font-medium">
                          {new Intl.NumberFormat('en-IN', { 
                            style: 'currency', 
                            currency: 'INR' 
                          }).format(item.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between">
                      <span className="font-medium">Total Amount</span>
                      <span className="text-xl font-bold">
                        {new Intl.NumberFormat('en-IN', { 
                          style: 'currency', 
                          currency: 'INR' 
                        }).format(totalAmount)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 space-y-4">
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    <Send className="mr-2 h-4 w-4" />
                    {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full"
                    onClick={() => router.back()}
                  >
                    Cancel
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Expense Policy</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>- Submit expenses within 30 days</li>
                    <li>- Attach receipts for amounts over ₹500</li>
                    <li>- Pre-approval required for amounts over ₹10,000</li>
                    <li>- Processing time: 5-7 business days</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
