// Common Types
export type ApiResponse<T = unknown> = {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export type PaginatedResponse<T> = {
  success: boolean
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export type SelectOption = {
  value: string
  label: string
}

// Permission Types
export type PermissionAction = 'create' | 'read' | 'update' | 'delete'

export type ModulePermission = {
  module: string
  canCreate: boolean
  canRead: boolean
  canUpdate: boolean
  canDelete: boolean
}

// Dashboard Types
export type DashboardStats = {
  totalEmployees: number
  presentToday: number
  onLeave: number
  pendingApprovals: number
  upcomingBirthdays: number
  newJoinees: number
}

// Employee Types
export type EmployeeStatus = 'ACTIVE' | 'ON_NOTICE' | 'RESIGNED' | 'TERMINATED' | 'RETIRED' | 'ABSCONDED'

export type EmployeeListItem = {
  id: string
  employeeId: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  photo: string | null
  department: string | null
  designation: string | null
  dateOfJoining: string
  employmentStatus: EmployeeStatus
  reportingManager: string | null
}

// Attendance Types
export type AttendanceRecord = {
  id: string
  date: string
  checkInTime: string | null
  checkOutTime: string | null
  totalHours: number | null
  status: string
  source: string
}

// Leave Types
export type LeaveBalance = {
  leaveType: string
  code: string
  total: number
  used: number
  balance: number
  color: string | null
}

export type LeaveRequest = {
  id: string
  leaveType: string
  fromDate: string
  toDate: string
  totalDays: number
  reason: string
  status: string
  appliedOn: string
  approverName: string | null
}

// Approval Types
export type ApprovalItem = {
  id: string
  type: 'leave' | 'attendance' | 'expense' | 'timesheet' | 'travel'
  entityId: string
  requester: {
    id: string
    name: string
    photo: string | null
    department: string | null
  }
  details: Record<string, unknown>
  status: string
  createdAt: string
}

// Payroll Types
export type PayslipData = {
  month: number
  year: number
  employee: {
    name: string
    employeeId: string
    department: string
    designation: string
    bankAccount: string
    pan: string
  }
  earnings: { name: string; amount: number }[]
  deductions: { name: string; amount: number }[]
  totalEarnings: number
  totalDeductions: number
  netSalary: number
  workingDays: number
  presentDays: number
  lopDays: number
}

// Report Types
export type ReportFilter = {
  startDate?: string
  endDate?: string
  departmentId?: string
  employeeId?: string
  status?: string
}

export type ChartData = {
  name: string
  value: number
  color?: string
}
