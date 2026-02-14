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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Download, FileText, DollarSign, TrendingUp, TrendingDown } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

type Payslip = {
  id: string
  month: number
  year: number
  grossSalary: number
  totalDeductions: number
  netSalary: number
  status: string
  paidOn: string | null
  createdAt: string
}

export default function PayrollPage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated } = useAuth()
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
      return
    }

    if (isAuthenticated) {
      fetchPayslips()
    }
  }, [authLoading, isAuthenticated, router, selectedYear])

  const fetchPayslips = async () => {
    try {
      setIsLoading(true)
      const result = await apiClient.get<Payslip[]>(`/payroll/payslips?year=${selectedYear}`)
      setPayslips(Array.isArray(result) ? result : [])
    } catch (error) {
      toast.error('Failed to load payroll data')
      console.error('Failed to fetch payslips:', error)
      setPayslips([])
    } finally {
      setIsLoading(false)
    }
  }

  const getMonthName = (month: number) => {
    return new Date(2024, month - 1).toLocaleString('default', { month: 'long' })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case 'PROCESSING':
        return <Badge className="bg-blue-100 text-blue-800">Processing</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  // Calculate totals
  const totalEarnings = payslips.reduce((sum, p) => sum + p.grossSalary, 0)
  const totalDeductions = payslips.reduce((sum, p) => sum + p.totalDeductions, 0)
  const totalNet = payslips.reduce((sum, p) => sum + p.netSalary, 0)

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
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
            <h1 className="text-2xl font-bold tracking-tight">My Payslips</h1>
            <p className="text-muted-foreground">View and download your salary slips</p>
          </div>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${totalEarnings.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">For {selectedYear}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Deductions</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                ${totalDeductions.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">For {selectedYear}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Pay (YTD)</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                ${totalNet.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">For {selectedYear}</p>
            </CardContent>
          </Card>
        </div>

        {/* Payslips Table */}
        <Card>
          <CardHeader>
            <CardTitle>Payslips</CardTitle>
            <CardDescription>Monthly salary statements for {selectedYear}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : payslips.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No payslips found</p>
                <p className="text-sm text-muted-foreground">
                  Payslips for {selectedYear} will appear here once processed
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Gross Salary</TableHead>
                    <TableHead className="text-right">Deductions</TableHead>
                    <TableHead className="text-right">Net Salary</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Paid On</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payslips.map((payslip) => (
                    <TableRow key={payslip.id}>
                      <TableCell className="font-medium">
                        {getMonthName(payslip.month)} {payslip.year}
                      </TableCell>
                      <TableCell className="text-right">
                        ${payslip.grossSalary.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        -${payslip.totalDeductions.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${payslip.netSalary.toLocaleString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(payslip.status)}</TableCell>
                      <TableCell>
                        {payslip.paidOn
                          ? format(new Date(payslip.paidOn), 'dd MMM yyyy')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
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
