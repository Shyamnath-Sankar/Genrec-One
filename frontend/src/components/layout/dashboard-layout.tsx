'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  Building2,
  Sun,
  Moon,
  Heart,
  TrendingUp,
  CheckSquare,
  Timer,
} from 'lucide-react'
import { PERMISSIONS, Permission } from '@/lib/constants'
import { useTheme } from 'next-themes'

type NavItem = {
  title: string
  href: string
  icon: React.ElementType
  permission?: Permission
  children?: { title: string; href: string; permission?: Permission }[]
}

const navigation: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    title: 'Approvals',
    href: '/approvals',
    icon: CheckSquare,
    children: [
      { title: 'Pending', href: '/approvals' },
      { title: 'My Requests', href: '/approvals?tab=my-requests' },
      { title: 'History', href: '/approvals?tab=history' },
    ]
  },
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
  { 
    title: 'Reports', 
    href: '/reports', 
    icon: BarChart3,
    permission: PERMISSIONS.REPORTS_VIEW,
    children: [
      { title: 'Attendance', href: '/reports/attendance' },
      { title: 'Leave', href: '/reports/leave' },
      { title: 'Payroll', href: '/reports/payroll' },
      { title: 'Headcount', href: '/reports/headcount' },
    ]
  },
  {
    title: 'Analytics',
    href: '/analytics',
    icon: TrendingUp,
    children: [
      { title: 'Workforce', href: '/analytics' },
      { title: 'Attendance', href: '/analytics?tab=attendance' },
      { title: 'Attrition', href: '/analytics?tab=attrition' },
      { title: 'Performance', href: '/analytics?tab=performance' },
    ]
  },
  {
    title: 'Engagement',
    href: '/engagement',
    icon: Heart,
    children: [
      { title: 'Social Feed', href: '/engagement' },
      { title: 'Recognitions', href: '/engagement?tab=recognitions' },
      { title: 'Surveys', href: '/engagement?tab=surveys' },
    ]
  },
  {
    title: 'Shifts',
    href: '/shifts',
    icon: Timer,
    children: [
      { title: 'My Shift', href: '/shifts' },
      { title: 'All Shifts', href: '/shifts?tab=all-shifts' },
      { title: 'Roster', href: '/shifts?tab=roster' },
    ]
  },
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

function NavItemComponent({ item, isCollapsed }: { item: NavItem; isCollapsed: boolean }) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const { hasPermission } = useAuth()

  // Check if user has permission for this item
  if (item.permission && !hasPermission(item.permission)) {
    return null
  }

  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
  const Icon = item.icon

  if (item.children && !isCollapsed) {
    const visibleChildren = item.children.filter(
      (child) => !child.permission || hasPermission(child.permission)
    )

    if (visibleChildren.length === 0) return null

    return (
      <div className="space-y-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            isActive
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          <span className="flex items-center gap-3">
            <Icon className="h-4 w-4" />
            {item.title}
          </span>
          <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
        </button>
        {isOpen && (
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
      <Icon className="h-4 w-4" />
      {!isCollapsed && item.title}
    </Link>
  )
}

export function Sidebar({ className }: { className?: string }) {
  const { employee } = useAuth()

  return (
    <div className={cn('flex h-full flex-col border-r bg-card', className)}>
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <Building2 className="h-6 w-6 text-primary" />
          <span>HRMS</span>
        </Link>
      </div>
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navigation.map((item) => (
            <NavItemComponent key={item.href} item={item} isCollapsed={false} />
          ))}
        </nav>
      </ScrollArea>
      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
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
              {employee?.role.name || 'Role'}
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

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-card px-4 lg:px-6">
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

      <div className="flex-1" />

      <Button variant="ghost" size="icon" onClick={toggleTheme} className="mr-2">
        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </Button>

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
              <p className="text-xs text-muted-foreground">{employee?.role.name}</p>
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
    </header>
  )
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 lg:block">
        <Sidebar />
      </aside>
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
