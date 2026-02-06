'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { apiClient } from '@/lib/api/client'
import {
  Users,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Activity,
  AlertTriangle,
  UserMinus,
  Calendar,
  Clock,
  DollarSign,
  Briefcase,
} from 'lucide-react'

type HeadcountData = {
  totalEmployees: number
  onProbation: number
  onNotice: number
  newJoinersThisMonth: number
  exitsThisMonth: number
  byGender: Record<string, number>
  byEmploymentType: Record<string, number>
  byDepartment: Record<string, number>
}

type AttritionData = {
  year: number
  attritionRate: number
  totalExits: number
  averageHeadcount: number
  monthlyBreakdown: Array<{ month: number; exits: number }>
}

type BradfordData = {
  year: number
  threshold: number
  highRiskCount: number
  scores: Array<{
    employeeId: string
    employeeName: string
    department: string | null
    absenceInstances: number
    totalDaysAbsent: number
    bradfordScore: number
    riskLevel: string
  }>
}

type KPIs = {
  headcount: number
  presentToday: number
  attendanceRate: number
  pendingLeaves: number
  openPositions: number
  newJoinersThisMonth: number
  onNotice: number
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState('workforce')
  const [headcount, setHeadcount] = useState<HeadcountData | null>(null)
  const [attrition, setAttrition] = useState<AttritionData | null>(null)
  const [bradford, setBradford] = useState<BradfordData | null>(null)
  const [kpis, setKPIs] = useState<KPIs | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [headcountRes, attritionRes, bradfordRes, kpisRes] = await Promise.all([
        apiClient.get<HeadcountData>('/analytics/workforce/headcount'),
        apiClient.get<AttritionData>('/analytics/workforce/attrition'),
        apiClient.get<BradfordData>('/analytics/attendance/bradford-scores'),
        apiClient.get<KPIs>('/analytics/dashboard/kpis'),
      ])
      setHeadcount(headcountRes as HeadcountData)
      setAttrition(attritionRes as AttritionData)
      setBradford(bradfordRes as BradfordData)
      setKPIs(kpisRes as KPIs)
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      default: return 'bg-green-500'
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics & Insights</h1>
          <p className="text-muted-foreground">Data-driven workforce intelligence</p>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Headcount</p>
                  <p className="text-3xl font-bold">{kpis?.headcount || 0}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Attendance Rate</p>
                  <p className="text-3xl font-bold">{kpis?.attendanceRate || 0}%</p>
                </div>
                <Activity className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Open Positions</p>
                  <p className="text-3xl font-bold">{kpis?.openPositions || 0}</p>
                </div>
                <Briefcase className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Attrition Rate</p>
                  <p className="text-3xl font-bold">{attrition?.attritionRate || 0}%</p>
                </div>
                <UserMinus className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="workforce">Workforce</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="attrition">Attrition</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="workforce" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Headcount Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Headcount by Gender
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {headcount?.byGender && Object.entries(headcount.byGender).map(([gender, count]) => (
                      <div key={gender} className="flex items-center justify-between">
                        <span className="capitalize">{gender}</span>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={(count / (headcount?.totalEmployees || 1)) * 100} 
                            className="w-32"
                          />
                          <span className="w-12 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Employment Type */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    By Employment Type
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {headcount?.byEmploymentType && Object.entries(headcount.byEmploymentType).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="capitalize">{type.replace('_', ' ')}</span>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={(count / (headcount?.totalEmployees || 1)) * 100} 
                            className="w-32"
                          />
                          <span className="w-12 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Movement Summary</CardTitle>
                  <CardDescription>This month's workforce changes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">New Joiners</p>
                      <p className="text-2xl font-bold text-green-600">
                        +{headcount?.newJoinersThisMonth || 0}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Exits</p>
                      <p className="text-2xl font-bold text-red-600">
                        -{headcount?.exitsThisMonth || 0}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">On Probation</p>
                      <p className="text-2xl font-bold">{headcount?.onProbation || 0}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">On Notice</p>
                      <p className="text-2xl font-bold text-orange-600">{headcount?.onNotice || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="attendance" className="space-y-4">
            {/* Bradford Scores */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Bradford Factor Scores
                </CardTitle>
                <CardDescription>
                  Employees with high Bradford scores indicating disruptive absence patterns.
                  Formula: S² × D (S = instances, D = days)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {bradford?.scores && bradford.scores.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm text-muted-foreground border-b pb-2">
                      <span>Employee</span>
                      <span>Instances</span>
                      <span>Days</span>
                      <span>Score</span>
                      <span>Risk</span>
                    </div>
                    {bradford.scores.slice(0, 10).map((score) => (
                      <div key={score.employeeId} className="flex items-center justify-between">
                        <span className="font-medium">{score.employeeName}</span>
                        <span>{score.absenceInstances}</span>
                        <span>{score.totalDaysAbsent}</span>
                        <span className="font-bold">{score.bradfordScore}</span>
                        <Badge className={getRiskColor(score.riskLevel)}>
                          {score.riskLevel}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No high-risk Bradford scores found
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attrition" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-red-500" />
                    Attrition Overview
                  </CardTitle>
                  <CardDescription>{attrition?.year} Statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Annual Attrition Rate</span>
                      <span className="text-2xl font-bold">{attrition?.attritionRate || 0}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Total Exits</span>
                      <span className="text-xl font-bold">{attrition?.totalExits || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Avg Headcount</span>
                      <span className="text-xl font-bold">{attrition?.averageHeadcount || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Monthly Exits</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {attrition?.monthlyBreakdown?.map((item) => (
                      <div key={item.month} className="flex items-center justify-between">
                        <span>{new Date(2024, item.month - 1).toLocaleString('default', { month: 'short' })}</span>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={(item.exits / (attrition?.totalExits || 1)) * 100} 
                            className="w-32"
                          />
                          <span className="w-8 text-right">{item.exits}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>9-Box Matrix</CardTitle>
                <CardDescription>
                  Plot employees based on performance and potential ratings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 h-64">
                  {/* High Potential Row */}
                  <div className="bg-yellow-100 border rounded p-2 flex flex-col items-center justify-center">
                    <span className="text-xs font-medium">Enigma</span>
                    <span className="text-lg font-bold">-</span>
                  </div>
                  <div className="bg-green-100 border rounded p-2 flex flex-col items-center justify-center">
                    <span className="text-xs font-medium">Growth</span>
                    <span className="text-lg font-bold">-</span>
                  </div>
                  <div className="bg-green-300 border rounded p-2 flex flex-col items-center justify-center">
                    <span className="text-xs font-medium">Star</span>
                    <span className="text-lg font-bold">-</span>
                  </div>
                  {/* Medium Potential Row */}
                  <div className="bg-red-100 border rounded p-2 flex flex-col items-center justify-center">
                    <span className="text-xs font-medium">Underperformer</span>
                    <span className="text-lg font-bold">-</span>
                  </div>
                  <div className="bg-blue-100 border rounded p-2 flex flex-col items-center justify-center">
                    <span className="text-xs font-medium">Core Player</span>
                    <span className="text-lg font-bold">-</span>
                  </div>
                  <div className="bg-green-200 border rounded p-2 flex flex-col items-center justify-center">
                    <span className="text-xs font-medium">High Performer</span>
                    <span className="text-lg font-bold">-</span>
                  </div>
                  {/* Low Potential Row */}
                  <div className="bg-red-200 border rounded p-2 flex flex-col items-center justify-center">
                    <span className="text-xs font-medium">Talent Risk</span>
                    <span className="text-lg font-bold">-</span>
                  </div>
                  <div className="bg-yellow-50 border rounded p-2 flex flex-col items-center justify-center">
                    <span className="text-xs font-medium">Average</span>
                    <span className="text-lg font-bold">-</span>
                  </div>
                  <div className="bg-blue-50 border rounded p-2 flex flex-col items-center justify-center">
                    <span className="text-xs font-medium">Solid</span>
                    <span className="text-lg font-bold">-</span>
                  </div>
                </div>
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  Select an appraisal cycle to view 9-box analysis
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
