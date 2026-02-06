'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { apiClient } from '@/lib/api/client'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft,
  Download,
  Filter,
  DollarSign,
  TrendingUp,
  Users,
  Wallet,
  BarChart3,
} from 'lucide-react'

type Department = {
  id: string
  name: string
}

type PayrollReportData = {
  employeeId: string
  employeeName: string
  department: string
  basicSalary: number
  allowances: number
  deductions: number
  netSalary: number
  taxAmount: number
}

type PayrollSummary = {
  totalEmployees: number
  totalGrossPay: number
  totalDeductions: number
  totalNetPay: number
  totalTax: number
}

export default function PayrollReportPage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated } = useAuth()
  const [departments, setDepartments] = useState<Department[]>([])
  const [reportData, setReportData] = useState<PayrollReportData[]>([])
  const [summary, setSummary] = useState<PayrollSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)

  const [filters, setFilters] = useState({
    departmentId: 'all',
    month: (new Date().getMonth() + 1).toString().padStart(2, '0'),
    year: new Date().getFullYear().toString(),
  })

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
      return
    }

    if (isAuthenticated) {
      fetchInitialData()
    }
  }, [authLoading, isAuthenticated, router])

  const fetchInitialData = async () => {
    try {
      setIsLoading(true)
      const depts = await apiClient.get<Department[]>('/departments/list')
      setDepartments(Array.isArray(depts) ? depts : [])
      await generateReport()
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateReport = async () => {
    try {
      setIsGenerating(true)
      const params = new URLSearchParams({
        month: filters.month,
        year: filters.year,
        ...(filters.departmentId !== 'all' && { departmentId: filters.departmentId }),
      })

      const [data, summaryData] = await Promise.all([
        apiClient.get<PayrollReportData[]>(`/reports/payroll?${params}`),
        apiClient.get<PayrollSummary>(`/reports/payroll/summary?${params}`),
      ])

      setReportData(Array.isArray(data) ? data : [])
      setSummary(summaryData)
    } catch (error) {
      console.error('Failed to generate report:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      const params = new URLSearchParams({
        month: filters.month,
        year: filters.year,
        format,
        ...(filters.departmentId !== 'all' && { departmentId: filters.departmentId }),
      })
      window.open(`/api/reports/payroll/export?${params}`, '_blank')
    } catch (error) {
      console.error('Failed to export:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ]

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString())

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
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/reports')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">Payroll Report</h1>
            <p className="text-muted-foreground">
              Monthly payroll breakdown and analysis
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleExport('csv')}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={() => handleExport('pdf')}>
              <Download className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Report Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Month</Label>
                <Select
                  value={filters.month}
                  onValueChange={(value) => setFilters({ ...filters, month: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Select
                  value={filters.year}
                  onValueChange={(value) => setFilters({ ...filters, year: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={filters.departmentId}
                  onValueChange={(value) => setFilters({ ...filters, departmentId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={generateReport} disabled={isGenerating} className="w-full">
                  {isGenerating ? 'Generating...' : 'Generate Report'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        {summary && (
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Employees</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalEmployees}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gross Pay</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.totalGrossPay)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Deductions</CardTitle>
                <TrendingUp className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.totalDeductions)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tax</CardTitle>
                <Wallet className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.totalTax)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Pay</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.totalNetPay)}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Report Table */}
        <Card>
          <CardHeader>
            <CardTitle>Payroll Details</CardTitle>
            <CardDescription>
              Individual salary breakdown for the selected period
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading || isGenerating ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : reportData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No data available</p>
                <p className="text-sm text-muted-foreground">
                  Adjust filters and generate the report
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Basic Salary</TableHead>
                    <TableHead className="text-right">Allowances</TableHead>
                    <TableHead className="text-right">Deductions</TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                    <TableHead className="text-right">Net Salary</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((row) => (
                    <TableRow key={row.employeeId}>
                      <TableCell className="font-medium">{row.employeeName}</TableCell>
                      <TableCell>{row.department}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.basicSalary)}</TableCell>
                      <TableCell className="text-right text-green-600">
                        +{formatCurrency(row.allowances)}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        -{formatCurrency(row.deductions)}
                      </TableCell>
                      <TableCell className="text-right text-yellow-600">
                        -{formatCurrency(row.taxAmount)}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(row.netSalary)}
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
