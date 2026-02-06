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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Receipt, Plus, DollarSign, Clock, CheckCircle, XCircle } from 'lucide-react'
import { format } from 'date-fns'

type ExpenseCategory = {
  id: string
  name: string
  code: string
  maxAmount: number | null
}

type Expense = {
  id: string
  categoryId: string
  category: ExpenseCategory
  description: string
  amount: number
  currency: string
  expenseDate: string
  status: string
  receiptUrl: string | null
  createdAt: string
}

export default function ExpensesPage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated } = useAuth()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Form state
  const [newExpense, setNewExpense] = useState({
    categoryId: '',
    description: '',
    amount: 0,
    currency: 'USD',
    expenseDate: format(new Date(), 'yyyy-MM-dd'),
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
      const [expensesData, categoriesData] = await Promise.all([
        apiClient.get<Expense[]>('/expenses'),
        apiClient.get<ExpenseCategory[]>('/expenses/categories'),
      ])
      setExpenses(Array.isArray(expensesData) ? expensesData : [])
      setCategories(Array.isArray(categoriesData) ? categoriesData : [])
    } catch (error) {
      console.error('Failed to fetch expenses data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      await apiClient.post('/expenses', newExpense)
      setIsDialogOpen(false)
      setNewExpense({
        categoryId: '',
        description: '',
        amount: 0,
        currency: 'USD',
        expenseDate: format(new Date(), 'yyyy-MM-dd'),
      })
      fetchData()
    } catch (error) {
      console.error('Failed to create expense:', error)
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
      case 'REIMBURSED':
        return <Badge className="bg-blue-100 text-blue-800">Reimbursed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Calculate totals
  const totalPending = expenses
    .filter((e) => e.status === 'PENDING')
    .reduce((sum, e) => sum + e.amount, 0)
  const totalApproved = expenses
    .filter((e) => e.status === 'APPROVED')
    .reduce((sum, e) => sum + e.amount, 0)
  const totalReimbursed = expenses
    .filter((e) => e.status === 'REIMBURSED')
    .reduce((sum, e) => sum + e.amount, 0)

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
            <p className="text-muted-foreground">Submit and track expense claims</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Submit Expense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Submit Expense Claim</DialogTitle>
                <DialogDescription>Add a new expense for reimbursement</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={newExpense.categoryId}
                    onValueChange={(value) => setNewExpense({ ...newExpense, categoryId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                          {category.maxAmount && ` (max $${category.maxAmount})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newExpense.amount}
                      onChange={(e) =>
                        setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select
                      value={newExpense.currency}
                      onValueChange={(value) => setNewExpense({ ...newExpense, currency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="INR">INR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={newExpense.expenseDate}
                    onChange={(e) => setNewExpense({ ...newExpense, expenseDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Describe the expense"
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>Submit</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Claims</CardTitle>
              <Receipt className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{expenses.length}</div>
              <p className="text-xs text-muted-foreground">all time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalPending.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">awaiting approval</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalApproved.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">ready for reimbursement</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reimbursed</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalReimbursed.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">received</p>
            </CardContent>
          </Card>
        </div>

        {/* Expenses Table */}
        <Card>
          <CardHeader>
            <CardTitle>Expense Claims</CardTitle>
            <CardDescription>Your submitted expense claims</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : expenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No expenses yet</p>
                <p className="text-sm text-muted-foreground">
                  Submit your first expense claim to get started
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>
                        {format(new Date(expense.expenseDate), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className="font-medium">
                        {expense.category?.name || 'N/A'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {expense.description}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {expense.currency} {expense.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(expense.status)}</TableCell>
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
