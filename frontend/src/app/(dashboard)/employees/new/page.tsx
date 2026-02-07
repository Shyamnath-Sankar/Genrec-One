'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/use-auth'
import { apiClient } from '@/lib/api/client'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

type Department = {
  id: string
  name: string
}

type Designation = {
  id: string
  name: string
}

type Role = {
  id: string
  name: string
}

type Manager = {
  id: string
  firstName: string
  lastName: string
  employeeId: string
}

type FormData = {
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  gender: string
  maritalStatus: string
  addressLine1: string
  addressCity: string
  addressState: string
  addressCountry: string
  addressPostalCode: string
  emergencyContactName: string
  emergencyContactPhone: string
  emergencyContactRelation: string
  departmentId: string
  designationId: string
  reportingManagerId: string
  roleId: string
  dateOfJoining: string
  employmentType: string
  workLocation: string
  bankName: string
  bankAccountNumber: string
  bankIfscCode: string
  panNumber: string
  aadhaarNumber: string
}

const initialFormData: FormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  gender: '',
  maritalStatus: '',
  addressLine1: '',
  addressCity: '',
  addressState: '',
  addressCountry: '',
  addressPostalCode: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelation: '',
  departmentId: '',
  designationId: '',
  reportingManagerId: '',
  roleId: '',
  dateOfJoining: '',
  employmentType: 'FULL_TIME',
  workLocation: '',
  bankName: '',
  bankAccountNumber: '',
  bankIfscCode: '',
  panNumber: '',
  aadhaarNumber: '',
}

export default function NewEmployeePage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated, hasPermission } = useAuth()
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [departments, setDepartments] = useState<Department[]>([])
  const [designations, setDesignations] = useState<Designation[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [managers, setManagers] = useState<Manager[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
      return
    }

    if (!authLoading && isAuthenticated && !hasPermission('employees.create', 'create')) {
      router.push('/employees')
      toast.error('You do not have permission to create employees')
      return
    }

    if (isAuthenticated) {
      fetchDropdownData()
    }
  }, [authLoading, isAuthenticated, router, hasPermission])

  const fetchDropdownData = async () => {
    try {
      setIsLoading(true)
      
      // Fetch all data with individual error handling
      let depts: Department[] = []
      let desigs: Designation[] = []
      let rolesList: Role[] = []
      let mgrsList: Manager[] = []

      // Fetch roles first - required for form
      try {
        const rolesRes = await apiClient.get<Role[] | { data: Role[] }>('/settings/roles')
        rolesList = Array.isArray(rolesRes) ? rolesRes : (rolesRes as any)?.data || []
      } catch (e) {
        console.error('Failed to fetch roles:', e)
      }

      // Fetch other data in parallel - optional
      const [deptsResult, desigsResult, mgrsResult] = await Promise.allSettled([
        apiClient.get<Department[] | { data: Department[] }>('/employees/departments'),
        apiClient.get<Designation[] | { data: Designation[] }>('/employees/designations'),
        apiClient.get<{ items: Manager[] } | Manager[]>('/employees?limit=100'),
      ])

      if (deptsResult.status === 'fulfilled') {
        const deptsRes = deptsResult.value
        depts = Array.isArray(deptsRes) ? deptsRes : (deptsRes as any)?.data || []
      }

      if (desigsResult.status === 'fulfilled') {
        const desigsRes = desigsResult.value
        desigs = Array.isArray(desigsRes) ? desigsRes : (desigsRes as any)?.data || []
      }

      if (mgrsResult.status === 'fulfilled') {
        const mgrsRes = mgrsResult.value
        mgrsList = Array.isArray(mgrsRes) ? mgrsRes : (mgrsRes as any)?.items || (mgrsRes as any)?.data || []
      }

      setDepartments(depts)
      setDesignations(desigs)
      setRoles(rolesList)
      setManagers(mgrsList)
      
      // Set default role if available (first non-admin role or first role)
      if (rolesList.length > 0) {
        const defaultRole = rolesList.find((r: Role) => r.name.toLowerCase() !== 'super admin') || rolesList[0]
        if (defaultRole) {
          setFormData(prev => ({ ...prev, roleId: defaultRole.id }))
        }
      } else {
        // Only show error if roles failed to load (it's required)
        toast.error('Failed to load roles. Please refresh the page.')
      }
    } catch (error) {
      console.error('Failed to fetch dropdown data:', error)
      toast.error('Failed to load form data. Please refresh.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {}

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required'
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required'
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }
    if (!formData.dateOfJoining) {
      newErrors.dateOfJoining = 'Date of joining is required'
    }
    if (!formData.roleId) {
      newErrors.roleId = 'Role is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error('Please fix the errors in the form')
      return
    }

    setIsSubmitting(true)

    try {
      // Build payload matching backend EmployeeCreate schema
      const payload: Record<string, unknown> = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        dateOfJoining: formData.dateOfJoining,
        roleId: formData.roleId,
        employmentType: formData.employmentType || 'FULL_TIME',
      }

      // Optional fields - only include if they have values
      if (formData.phone) payload.phone = formData.phone
      if (formData.dateOfBirth) payload.dateOfBirth = formData.dateOfBirth
      if (formData.gender) payload.gender = formData.gender
      if (formData.maritalStatus) payload.maritalStatus = formData.maritalStatus
      if (formData.departmentId) payload.departmentId = formData.departmentId
      if (formData.designationId) payload.designationId = formData.designationId
      if (formData.reportingManagerId) payload.reportingManagerId = formData.reportingManagerId
      if (formData.workLocation) payload.workLocation = formData.workLocation
      if (formData.panNumber) payload.panNumber = formData.panNumber
      if (formData.aadhaarNumber) payload.aadhaarNumber = formData.aadhaarNumber

      // Build address object if any address field is filled
      if (formData.addressLine1 || formData.addressCity) {
        payload.currentAddress = {
          line1: formData.addressLine1 || '',
          city: formData.addressCity || '',
          state: formData.addressState || '',
          country: formData.addressCountry || 'India',
          postalCode: formData.addressPostalCode || '',
        }
      }

      // Build emergency contact if name is provided
      if (formData.emergencyContactName) {
        payload.emergencyContact = {
          name: formData.emergencyContactName,
          relationship: formData.emergencyContactRelation || 'Other',
          phone: formData.emergencyContactPhone || '',
        }
      }

      // Build bank details if account number is provided
      if (formData.bankAccountNumber) {
        payload.bankDetails = {
          accountNumber: formData.bankAccountNumber,
          ifscCode: formData.bankIfscCode || '',
          bankName: formData.bankName || '',
        }
      }

      await apiClient.post('/employees', payload)
      toast.success('Employee created successfully')
      router.push('/employees')
    } catch (error: any) {
      console.error('Failed to create employee:', error)
      toast.error(error.message || 'Failed to create employee')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" type="button" asChild>
              <Link href="/employees">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Add New Employee</h1>
              <p className="text-muted-foreground">Create a new employee profile</p>
            </div>
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Employee
          </Button>
        </div>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Basic personal details of the employee</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                placeholder="John"
              />
              {errors.firstName && <p className="text-sm text-red-500">{errors.firstName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                placeholder="Doe"
              />
              {errors.lastName && <p className="text-sm text-red-500">{errors.lastName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="john.doe@company.com"
              />
              {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+1 234 567 8900"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => handleChange('dateOfBirth', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select value={formData.gender} onValueChange={(v) => handleChange('gender', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maritalStatus">Marital Status</Label>
              <Select value={formData.maritalStatus} onValueChange={(v) => handleChange('maritalStatus', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SINGLE">Single</SelectItem>
                  <SelectItem value="MARRIED">Married</SelectItem>
                  <SelectItem value="DIVORCED">Divorced</SelectItem>
                  <SelectItem value="WIDOWED">Widowed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle>Address</CardTitle>
            <CardDescription>Residential address details</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
            <div className="space-y-2 sm:col-span-2 md:col-span-3">
              <Label htmlFor="addressLine1">Street Address</Label>
              <Textarea
                id="addressLine1"
                value={formData.addressLine1}
                onChange={(e) => handleChange('addressLine1', e.target.value)}
                placeholder="123 Main Street, Apt 4B"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="addressCity">City</Label>
              <Input
                id="addressCity"
                value={formData.addressCity}
                onChange={(e) => handleChange('addressCity', e.target.value)}
                placeholder="New York"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="addressState">State</Label>
              <Input
                id="addressState"
                value={formData.addressState}
                onChange={(e) => handleChange('addressState', e.target.value)}
                placeholder="NY"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="addressCountry">Country</Label>
              <Input
                id="addressCountry"
                value={formData.addressCountry}
                onChange={(e) => handleChange('addressCountry', e.target.value)}
                placeholder="USA"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="addressPostalCode">Postal Code</Label>
              <Input
                id="addressPostalCode"
                value={formData.addressPostalCode}
                onChange={(e) => handleChange('addressPostalCode', e.target.value)}
                placeholder="10001"
              />
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card>
          <CardHeader>
            <CardTitle>Emergency Contact</CardTitle>
            <CardDescription>Person to contact in case of emergency</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="emergencyContactName">Contact Name</Label>
              <Input
                id="emergencyContactName"
                value={formData.emergencyContactName}
                onChange={(e) => handleChange('emergencyContactName', e.target.value)}
                placeholder="Jane Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergencyContactRelation">Relationship</Label>
              <Input
                id="emergencyContactRelation"
                value={formData.emergencyContactRelation}
                onChange={(e) => handleChange('emergencyContactRelation', e.target.value)}
                placeholder="Spouse"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergencyContactPhone">Phone</Label>
              <Input
                id="emergencyContactPhone"
                value={formData.emergencyContactPhone}
                onChange={(e) => handleChange('emergencyContactPhone', e.target.value)}
                placeholder="+1 234 567 8900"
              />
            </div>
          </CardContent>
        </Card>

        {/* Employment Details */}
        <Card>
          <CardHeader>
            <CardTitle>Employment Details</CardTitle>
            <CardDescription>Job and organizational information</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="dateOfJoining">Date of Joining *</Label>
              <Input
                id="dateOfJoining"
                type="date"
                value={formData.dateOfJoining}
                onChange={(e) => handleChange('dateOfJoining', e.target.value)}
              />
              {errors.dateOfJoining && <p className="text-sm text-red-500">{errors.dateOfJoining}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="roleId">Role *</Label>
              <Select value={formData.roleId} onValueChange={(v) => handleChange('roleId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.roleId && <p className="text-sm text-red-500">{errors.roleId}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="departmentId">Department</Label>
              <Select value={formData.departmentId || "none"} onValueChange={(v) => handleChange('departmentId', v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="designationId">Designation</Label>
              <Select value={formData.designationId || "none"} onValueChange={(v) => handleChange('designationId', v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select designation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {designations.map((desig) => (
                    <SelectItem key={desig.id} value={desig.id}>
                      {desig.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reportingManagerId">Reporting Manager</Label>
              <Select value={formData.reportingManagerId || "none"} onValueChange={(v) => handleChange('reportingManagerId', v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {managers.map((mgr) => (
                    <SelectItem key={mgr.id} value={mgr.id}>
                      {mgr.firstName} {mgr.lastName} ({mgr.employeeId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="employmentType">Employment Type</Label>
              <Select value={formData.employmentType} onValueChange={(v) => handleChange('employmentType', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FULL_TIME">Full Time</SelectItem>
                  <SelectItem value="PART_TIME">Part Time</SelectItem>
                  <SelectItem value="CONTRACT">Contract</SelectItem>
                  <SelectItem value="INTERN">Intern</SelectItem>
                  <SelectItem value="CONSULTANT">Consultant</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="workLocation">Work Location</Label>
              <Input
                id="workLocation"
                value={formData.workLocation}
                onChange={(e) => handleChange('workLocation', e.target.value)}
                placeholder="e.g., Head Office, Remote"
              />
            </div>
          </CardContent>
        </Card>

        {/* Bank Details */}
        <Card>
          <CardHeader>
            <CardTitle>Bank Details</CardTitle>
            <CardDescription>Salary account information</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                value={formData.bankName}
                onChange={(e) => handleChange('bankName', e.target.value)}
                placeholder="Bank of America"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankAccountNumber">Account Number</Label>
              <Input
                id="bankAccountNumber"
                value={formData.bankAccountNumber}
                onChange={(e) => handleChange('bankAccountNumber', e.target.value)}
                placeholder="1234567890"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankIfscCode">IFSC / Routing Code</Label>
              <Input
                id="bankIfscCode"
                value={formData.bankIfscCode}
                onChange={(e) => handleChange('bankIfscCode', e.target.value)}
                placeholder="BOFA0001234"
              />
            </div>
          </CardContent>
        </Card>

        {/* Statutory Details */}
        <Card>
          <CardHeader>
            <CardTitle>Statutory Details</CardTitle>
            <CardDescription>Tax and identification numbers</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="panNumber">PAN / Tax ID</Label>
              <Input
                id="panNumber"
                value={formData.panNumber}
                onChange={(e) => handleChange('panNumber', e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="aadhaarNumber">National ID</Label>
              <Input
                id="aadhaarNumber"
                value={formData.aadhaarNumber}
                onChange={(e) => handleChange('aadhaarNumber', e.target.value)}
                placeholder="1234 5678 9012"
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/employees">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Employee
          </Button>
        </div>
      </form>
    </DashboardLayout>
  )
}
