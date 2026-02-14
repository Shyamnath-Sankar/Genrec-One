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
import { Switch } from '@/components/ui/switch'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { CalendarDays, Plus, MoreHorizontal, Edit, Trash2, Calendar } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { format, parseISO, isAfter, isBefore, startOfYear, endOfYear } from 'date-fns'

type Holiday = {
  id: string
  name: string
  date: string
  description: string | null
  isOptional: boolean
  isRecurring: boolean
  createdAt: string
}

export default function HolidaysPage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated, isSuperAdmin } = useAuth()
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    description: '',
    isOptional: false,
    isRecurring: true,
  })

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
      return
    }

    if (isAuthenticated) {
      fetchHolidays()
    }
  }, [authLoading, isAuthenticated, router, selectedYear])

  const fetchHolidays = async () => {
    try {
      setIsLoading(true)
      const data = await apiClient.get<Holiday[]>(`/leaves/holidays?year=${selectedYear}`)
      setHolidays(Array.isArray(data) ? data : [])
    } catch (error) {
      toast.error('Failed to load holidays')
      console.error('Failed to fetch holidays:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      date: '',
      description: '',
      isOptional: false,
      isRecurring: true,
    })
  }

  const handleCreate = async () => {
    if (!formData.name || !formData.date) {
      toast.error('Please fill in required fields')
      return
    }

    setIsSubmitting(true)
    try {
      await apiClient.post('/leaves/holidays', {
        name: formData.name,
        date: formData.date,
        description: formData.description || null,
        is_optional: formData.isOptional,
        is_recurring: formData.isRecurring,
      })
      toast.success('Holiday added successfully')
      setCreateDialogOpen(false)
      resetForm()
      fetchHolidays()
    } catch (error: any) {
      toast.error(error.message || 'Failed to add holiday')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedHoliday || !formData.name || !formData.date) {
      toast.error('Please fill in required fields')
      return
    }

    setIsSubmitting(true)
    try {
      await apiClient.put(`/leaves/holidays/${selectedHoliday.id}`, {
        name: formData.name,
        date: formData.date,
        description: formData.description || null,
        is_optional: formData.isOptional,
        is_recurring: formData.isRecurring,
      })
      toast.success('Holiday updated successfully')
      setEditDialogOpen(false)
      setSelectedHoliday(null)
      resetForm()
      fetchHolidays()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update holiday')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedHoliday) return

    setIsSubmitting(true)
    try {
      await apiClient.delete(`/leaves/holidays/${selectedHoliday.id}`)
      toast.success('Holiday deleted successfully')
      setDeleteDialogOpen(false)
      setSelectedHoliday(null)
      fetchHolidays()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete holiday')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditDialog = (holiday: Holiday) => {
    setSelectedHoliday(holiday)
    setFormData({
      name: holiday.name,
      date: holiday.date.split('T')[0],
      description: holiday.description || '',
      isOptional: holiday.isOptional,
      isRecurring: holiday.isRecurring,
    })
    setEditDialogOpen(true)
  }

  const openDeleteDialog = (holiday: Holiday) => {
    setSelectedHoliday(holiday)
    setDeleteDialogOpen(true)
  }

  const getDayOfWeek = (dateStr: string) => {
    return format(parseISO(dateStr), 'EEEE')
  }

  const isUpcoming = (dateStr: string) => {
    const today = new Date()
    const holidayDate = parseISO(dateStr)
    return isAfter(holidayDate, today)
  }

  const isPast = (dateStr: string) => {
    const today = new Date()
    const holidayDate = parseISO(dateStr)
    return isBefore(holidayDate, today)
  }

  const years = [
    new Date().getFullYear() - 1,
    new Date().getFullYear(),
    new Date().getFullYear() + 1,
  ]

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

  const sortedHolidays = [...holidays].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  const upcomingHolidays = sortedHolidays.filter(h => isUpcoming(h.date))
  const mandatoryCount = holidays.filter(h => !h.isOptional).length
  const optionalCount = holidays.filter(h => h.isOptional).length

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Holidays</h1>
            <p className="text-muted-foreground">Company holiday calendar for {selectedYear}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 border rounded-lg p-1">
              {years.map((year) => (
                <Button
                  key={year}
                  variant={selectedYear === year ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedYear(year)}
                >
                  {year}
                </Button>
              ))}
            </div>
            {isSuperAdmin && (
              <Button onClick={() => { resetForm(); setCreateDialogOpen(true) }}>
                <Plus className="mr-2 h-4 w-4" />
                Add Holiday
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Holidays</CardTitle>
              <CalendarDays className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{holidays.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Mandatory</CardTitle>
              <Calendar className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mandatoryCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Optional</CardTitle>
              <Calendar className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{optionalCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              <Calendar className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingHolidays.length}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Holiday Calendar</CardTitle>
            <CardDescription>
              View and manage company holidays for {selectedYear}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : holidays.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarDays className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No holidays for {selectedYear}</p>
                <p className="text-sm text-muted-foreground">
                  Add holidays to the calendar
                </p>
                {isSuperAdmin && (
                  <Button className="mt-4" onClick={() => { resetForm(); setCreateDialogOpen(true) }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Holiday
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Holiday</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedHolidays.map((holiday) => (
                    <TableRow 
                      key={holiday.id}
                      className={isPast(holiday.date) ? 'opacity-60' : ''}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{holiday.name}</p>
                          {holiday.description && (
                            <p className="text-sm text-muted-foreground">{holiday.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(parseISO(holiday.date), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>
                        {getDayOfWeek(holiday.date)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            holiday.isOptional
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }
                        >
                          {holiday.isOptional ? 'Optional' : 'Mandatory'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {isPast(holiday.date) ? (
                          <Badge variant="outline" className="text-muted-foreground">Past</Badge>
                        ) : (
                          <Badge className="bg-blue-100 text-blue-800">Upcoming</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isSuperAdmin && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(holiday)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => openDeleteDialog(holiday)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Holiday Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Holiday</DialogTitle>
            <DialogDescription>
              Add a holiday to the company calendar
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Holiday Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Christmas Day"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description (optional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Optional Holiday</Label>
                <p className="text-sm text-muted-foreground">
                  Employees can choose to work on this day
                </p>
              </div>
              <Switch
                checked={formData.isOptional}
                onCheckedChange={(checked) => setFormData({ ...formData, isOptional: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Recurring Yearly</Label>
                <p className="text-sm text-muted-foreground">
                  Repeat this holiday every year
                </p>
              </div>
              <Switch
                checked={formData.isRecurring}
                onCheckedChange={(checked) => setFormData({ ...formData, isRecurring: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Holiday'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Holiday Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Holiday</DialogTitle>
            <DialogDescription>
              Update holiday details
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Holiday Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-date">Date *</Label>
              <Input
                id="edit-date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Optional Holiday</Label>
                <p className="text-sm text-muted-foreground">
                  Employees can choose to work on this day
                </p>
              </div>
              <Switch
                checked={formData.isOptional}
                onCheckedChange={(checked) => setFormData({ ...formData, isOptional: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Recurring Yearly</Label>
                <p className="text-sm text-muted-foreground">
                  Repeat this holiday every year
                </p>
              </div>
              <Switch
                checked={formData.isRecurring}
                onCheckedChange={(checked) => setFormData({ ...formData, isRecurring: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Holiday</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedHoliday?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  )
}
