'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/hooks/use-auth'
import { apiClient } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  LayoutDashboard,
  Users,
  Clock,
  Calendar,
  DollarSign,
  FileText,
  Briefcase,
  Target,
  Receipt,
  Package,
  HelpCircle,
  Plane,
  BarChart3,
  Settings,
  Menu,
  ChevronDown,
  LogOut,
  User,
  Sun,
  Moon,
  Heart,
  TrendingUp,
  CheckSquare,
  Timer,
  LogIn,
  LogOutIcon,
  Loader2,
  Building2,
} from 'lucide-react'
import { PERMISSIONS, Permission } from '@/lib/constants'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ChatWidget } from '@/components/chat'

type NavItem = {
  title: string
  href: string
  icon: React.ElementType
  permission?: Permission
  children?: { title: string; href: string; permission?: Permission }[]
}

// Clean navigation - no duplicate tab items, just direct links to pages
const navigation: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Approvals', href: '/approvals', icon: CheckSquare },
  { 
    title: 'Employees', 
    href: '/employees', 
    icon: Users,
    permission: PERMISSIONS.EMPLOYEES_VIEW,
    children: [
      { title: 'All Employees', href: '/employees' },
      { title: 'Departments', href: '/employees/departments', permission: PERMISSIONS.DEPARTMENTS_VIEW },
      { title: 'Designations', href: '/employees/designations' },
      { title: 'Onboarding', href: '/employees/onboarding' },
      { title: 'Offboarding', href: '/employees/offboarding' },
    ]
  },
  { 
    title: 'Attendance', 
    href: '/attendance', 
    icon: Clock,
    children: [
      { title: 'My Attendance', href: '/attendance' },
      { title: 'Team Attendance', href: '/attendance/team', permission: PERMISSIONS.ATTENDANCE_VIEW_TEAM },
      { title: 'Regularization', href: '/attendance/regularization' },
      { title: 'Overtime', href: '/attendance/overtime' },
    ]
  },
  { 
    title: 'Leaves', 
    href: '/leaves', 
    icon: Calendar,
    children: [
      { title: 'My Leaves', href: '/leaves' },
      { title: 'Apply Leave', href: '/leaves/apply' },
      { title: 'Team Leaves', href: '/leaves/team', permission: PERMISSIONS.LEAVES_VIEW_TEAM },
      { title: 'Leave Types', href: '/leaves/types', permission: PERMISSIONS.LEAVES_MANAGE_TYPES },
      { title: 'Holidays', href: '/leaves/holidays' },
    ]
  },
  { 
    title: 'Payroll', 
    href: '/payroll', 
    icon: DollarSign,
    permission: PERMISSIONS.PAYROLL_VIEW_OWN,
    children: [
      { title: 'My Payslips', href: '/payroll' },
      { title: 'Salary Structure', href: '/payroll/salary', permission: PERMISSIONS.PAYROLL_CONFIGURE },
      { title: 'Run Payroll', href: '/payroll/run', permission: PERMISSIONS.PAYROLL_PROCESS },
      { title: 'Loans', href: '/payroll/loans' },
    ]
  },
  { 
    title: 'Timesheets', 
    href: '/timesheets', 
    icon: FileText,
    children: [
      { title: 'My Timesheets', href: '/timesheets' },
      { title: 'Projects', href: '/timesheets/projects' },
      { title: 'Approvals', href: '/timesheets/approvals', permission: PERMISSIONS.TIMESHEETS_APPROVE },
    ]
  },
  { 
    title: 'Recruitment', 
    href: '/recruitment', 
    icon: Briefcase,
    permission: PERMISSIONS.RECRUITMENT_VIEW,
    children: [
      { title: 'Jobs', href: '/recruitment' },
      { title: 'Candidates', href: '/recruitment/candidates' },
      { title: 'Interviews', href: '/recruitment/interviews' },
      { title: 'Offers', href: '/recruitment/offers', permission: PERMISSIONS.RECRUITMENT_OFFER },
    ]
  },
  { 
    title: 'Performance', 
    href: '/performance', 
    icon: Target,
    children: [
      { title: 'My Goals', href: '/performance' },
      { title: 'Appraisals', href: '/performance/appraisals' },
      { title: 'Feedback', href: '/performance/feedback' },
      { title: 'Cycles', href: '/performance/cycles', permission: PERMISSIONS.PERFORMANCE_CALIBRATE },
    ]
  },
  { 
    title: 'Expenses', 
    href: '/expenses', 
    icon: Receipt,
    children: [
      { title: 'My Expenses', href: '/expenses' },
      { title: 'Submit Claim', href: '/expenses/submit' },
      { title: 'Approvals', href: '/expenses/approvals', permission: PERMISSIONS.EXPENSES_APPROVE },
    ]
  },
  { 
    title: 'Assets', 
    href: '/assets', 
    icon: Package,
    permission: PERMISSIONS.ASSETS_VIEW,
    children: [
      { title: 'All Assets', href: '/assets' },
      { title: 'My Assets', href: '/assets/my' },
      { title: 'Categories', href: '/assets/categories', permission: PERMISSIONS.ASSETS_MANAGE },
    ]
  },
  { 
    title: 'Helpdesk', 
    href: '/tickets', 
    icon: HelpCircle,
    children: [
      { title: 'My Tickets', href: '/tickets' },
      { title: 'Create Ticket', href: '/tickets/create' },
      { title: 'All Tickets', href: '/tickets/all', permission: PERMISSIONS.HELPDESK_VIEW_ALL },
      { title: 'Knowledge Base', href: '/tickets/kb' },
    ]
  },
  { 
    title: 'Travel', 
    href: '/travel', 
    icon: Plane,
    children: [
      { title: 'My Requests', href: '/travel' },
      { title: 'New Request', href: '/travel/new' },
      { title: 'Approvals', href: '/travel/approvals', permission: PERMISSIONS.TRAVEL_APPROVE },
    ]
  },
  { 
    title: 'Documents', 
    href: '/documents', 
    icon: FileText,
    children: [
      { title: 'My Documents', href: '/documents' },
      { title: 'Company Documents', href: '/documents/company' },
      { title: 'Templates', href: '/documents/templates', permission: PERMISSIONS.DOCUMENTS_MANAGE },
    ]
  },
  { title: 'Reports', href: '/reports', icon: BarChart3, permission: PERMISSIONS.REPORTS_VIEW },
  { title: 'Analytics', href: '/analytics', icon: TrendingUp },
  { title: 'Engagement', href: '/engagement', icon: Heart },
  { title: 'Shifts', href: '/shifts', icon: Timer },
  { 
    title: 'Settings', 
    href: '/settings', 
    icon: Settings,
    permission: PERMISSIONS.SETTINGS_VIEW,
    children: [
      { title: 'Company', href: '/settings', permission: PERMISSIONS.SETTINGS_COMPANY },
      { title: 'Users', href: '/settings/users', permission: PERMISSIONS.USERS_MANAGE },
      { title: 'Roles', href: '/settings/roles', permission: PERMISSIONS.ROLES_MANAGE },
      { title: 'Policies', href: '/settings/policies', permission: PERMISSIONS.SETTINGS_POLICIES },
      { title: 'Workflows', href: '/settings/workflows', permission: PERMISSIONS.SETTINGS_WORKFLOWS },
    ]
  },
]

function NavItemComponent({ 
  item, 
  expandedItems,
  onToggle 
}: { 
  item: NavItem
  expandedItems: Set<string>
  onToggle: (href: string) => void
}) {
  const pathname = usePathname()
  const { hasPermission } = useAuth()

  if (item.permission && !hasPermission(item.permission)) {
    return null
  }

  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
  const isExpanded = expandedItems.has(item.href)
  const Icon = item.icon

  if (item.children) {
    const visibleChildren = item.children.filter(
      (child) => !child.permission || hasPermission(child.permission)
    )

    if (visibleChildren.length === 0) return null

    return (
      <div className="space-y-1">
        <button
          onClick={() => onToggle(item.href)}
          className={cn(
            'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            isActive
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          <span className="flex items-center gap-3">
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{item.title}</span>
          </span>
          <ChevronDown className={cn('h-4 w-4 flex-shrink-0 transition-transform', isExpanded && 'rotate-180')} />
        </button>
        {isExpanded && (
          <div className="ml-6 space-y-1 border-l pl-3">
            {visibleChildren.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  'block rounded-lg px-3 py-2 text-sm transition-colors',
                  pathname === child.href
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                {child.title}
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span className="truncate">{item.title}</span>
    </Link>
  )
}

export function Sidebar({ className }: { className?: string }) {
  const { employee } = useAuth()
  const pathname = usePathname()
  const [companyName, setCompanyName] = useState<string>('Company')
  
  const [expandedItems, setExpandedItems] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    navigation.forEach((item) => {
      if (item.children && (pathname === item.href || pathname.startsWith(item.href + '/'))) {
        initial.add(item.href)
      }
    })
    return initial
  })

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const data = await apiClient.get<{ name: string }>('/settings/company')
        if (data?.name) {
          setCompanyName(data.name)
        }
      } catch (error) {
        // Silently fail
      }
    }
    fetchCompany()
  }, [])

  const handleToggle = (href: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(href)) {
        next.delete(href)
      } else {
        next.add(href)
      }
      return next
    })
  }

  return (
    <div className={cn('flex h-full flex-col border-r bg-card', className)}>
      {/* Company Name Header */}
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-4 w-4" />
          </div>
          <span className="font-semibold truncate">{companyName}</span>
        </Link>
      </div>
      
      {/* Scrollable Navigation */}
      <div className="flex-1 overflow-y-auto">
        <nav className="space-y-1 p-3">
          {navigation.map((item) => (
            <NavItemComponent 
              key={item.href} 
              item={item} 
              expandedItems={expandedItems}
              onToggle={handleToggle}
            />
          ))}
        </nav>
      </div>
      
      {/* User Info Footer */}
      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 flex-shrink-0">
            <AvatarImage src={employee?.photo || undefined} />
            <AvatarFallback>
              {employee ? `${employee.firstName[0]}${employee.lastName[0]}` : 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium">
              {employee ? `${employee.firstName} ${employee.lastName}` : 'User'}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {employee?.role?.name || 'Role'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Header() {
  const { employee, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const [isCheckedIn, setIsCheckedIn] = useState(false)
  const [checkInTime, setCheckInTime] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const fetchAttendanceStatus = async () => {
      try {
        const data = await apiClient.get<{ 
          isCheckedIn: boolean
          checkInTime: string | null 
        }>('/attendance/status')
        setIsCheckedIn(data.isCheckedIn)
        setCheckInTime(data.checkInTime)
      } catch (error) {
        // Silently fail
      }
    }
    fetchAttendanceStatus()
  }, [])

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const handleCheckIn = async () => {
    setIsLoading(true)
    try {
      await apiClient.post('/attendance/check-in', {})
      setIsCheckedIn(true)
      setCheckInTime(new Date().toISOString())
      toast.success('Checked in successfully!')
    } catch (error) {
      toast.error('Failed to check in')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCheckOut = async () => {
    setIsLoading(true)
    try {
      await apiClient.post('/attendance/check-out', {})
      setIsCheckedIn(false)
      toast.success('Checked out successfully!')
    } catch (error) {
      toast.error('Failed to check out')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-card px-4 lg:px-6">
      {/* Mobile Menu */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* Left - Date/Time (hidden on mobile) */}
      <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>{format(currentTime, 'EEE, MMM d')}</span>
        <span className="font-medium text-foreground">{format(currentTime, 'h:mm a')}</span>
      </div>

      {/* Center - Genrec One Branding */}
      <div className="flex-1 flex justify-center">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
            G1
          </div>
          <span className="font-bold text-lg hidden sm:inline">Genrec One</span>
        </Link>
      </div>

      {/* Right - Actions */}
      <div className="flex items-center gap-2">
        {/* Check In / Check Out Button */}
        {isCheckedIn ? (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="hidden sm:flex items-center gap-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="hidden md:inline">In since</span> {checkInTime ? format(new Date(checkInTime), 'h:mm a') : '--:--'}
            </Badge>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCheckOut}
              disabled={isLoading}
              className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <LogOutIcon className="mr-1 h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Check Out</span>
                </>
              )}
            </Button>
          </div>
        ) : (
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleCheckIn}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <LogIn className="mr-1 h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Check In</span>
              </>
            )}
          </Button>
        )}

        {/* Theme Toggle */}
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarImage src={employee?.photo || undefined} />
                <AvatarFallback>
                  {employee ? `${employee.firstName[0]}${employee.lastName[0]}` : 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">
                  {employee ? `${employee.firstName} ${employee.lastName}` : 'User'}
                </p>
                <p className="text-xs text-muted-foreground">{employee?.role?.name}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <User className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Fixed Sidebar */}
      <aside className="hidden w-64 lg:block fixed inset-y-0 left-0 z-40 overflow-hidden">
        <Sidebar className="h-screen" />
      </aside>
      {/* Main content */}
      <div className="flex flex-1 flex-col lg:ml-64">
        <Header />
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
      {/* AI Chat Widget */}
      <ChatWidget />
    </div>
  )
}
