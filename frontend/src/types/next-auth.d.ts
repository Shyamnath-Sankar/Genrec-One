import { DefaultSession, DefaultUser } from 'next-auth'
import { JWT, DefaultJWT } from 'next-auth/jwt'

interface EmployeeRole {
  id: string
  name: string
  permissions: {
    permission: {
      id: string
      module: string
      slug: string
      name: string
    }
    canCreate: boolean
    canRead: boolean
    canUpdate: boolean
    canDelete: boolean
  }[]
}

interface EmployeeData {
  id: string
  employeeId: string
  firstName: string
  lastName: string
  photo: string | null
  companyId: string
  departmentId: string | null
  designationId: string | null
  reportingManagerId: string | null
  role: EmployeeRole
  company: {
    id: string
    name: string
    logo: string | null
  }
  department: {
    id: string
    name: string
  } | null
  designation: {
    id: string
    name: string
  } | null
}

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      mustChangePassword: boolean
      employee: EmployeeData | null
    } & DefaultSession['user']
  }

  interface User extends DefaultUser {
    id: string
    email: string
    mustChangePassword: boolean
    employee: EmployeeData | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string
    email: string
    mustChangePassword: boolean
    employee: EmployeeData | null
  }
}
