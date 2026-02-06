from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import date, datetime
from enum import Enum


class Gender(str, Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"
    OTHER = "OTHER"


class MaritalStatus(str, Enum):
    SINGLE = "SINGLE"
    MARRIED = "MARRIED"
    DIVORCED = "DIVORCED"
    WIDOWED = "WIDOWED"


class EmploymentType(str, Enum):
    FULL_TIME = "FULL_TIME"
    PART_TIME = "PART_TIME"
    CONTRACT = "CONTRACT"
    INTERN = "INTERN"
    CONSULTANT = "CONSULTANT"


class EmploymentStatus(str, Enum):
    ACTIVE = "ACTIVE"
    ON_NOTICE = "ON_NOTICE"
    RESIGNED = "RESIGNED"
    TERMINATED = "TERMINATED"
    RETIRED = "RETIRED"
    ABSCONDED = "ABSCONDED"


class AddressSchema(BaseModel):
    line1: str
    line2: Optional[str] = None
    city: str
    state: str
    country: str
    postal_code: str


class BankDetailsSchema(BaseModel):
    account_number: str
    ifsc_code: str
    bank_name: str
    branch_name: Optional[str] = None


class EmergencyContactSchema(BaseModel):
    name: str
    relationship: str
    phone: str
    alternate_phone: Optional[str] = None


# Employee Create
class EmployeeCreate(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    middle_name: Optional[str] = None
    email: EmailStr
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[Gender] = None
    marital_status: Optional[MaritalStatus] = None
    date_of_joining: date
    department_id: Optional[str] = None
    designation_id: Optional[str] = None
    reporting_manager_id: Optional[str] = None
    role_id: str
    employment_type: EmploymentType = EmploymentType.FULL_TIME
    work_location: Optional[str] = None
    current_address: Optional[AddressSchema] = None
    permanent_address: Optional[AddressSchema] = None
    emergency_contact: Optional[EmergencyContactSchema] = None
    bank_details: Optional[BankDetailsSchema] = None
    pan_number: Optional[str] = None
    aadhaar_number: Optional[str] = None


class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    middle_name: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[Gender] = None
    marital_status: Optional[MaritalStatus] = None
    department_id: Optional[str] = None
    designation_id: Optional[str] = None
    reporting_manager_id: Optional[str] = None
    employment_type: Optional[EmploymentType] = None
    employment_status: Optional[EmploymentStatus] = None
    work_location: Optional[str] = None
    current_address: Optional[AddressSchema] = None
    permanent_address: Optional[AddressSchema] = None
    emergency_contact: Optional[EmergencyContactSchema] = None
    bank_details: Optional[BankDetailsSchema] = None
    pan_number: Optional[str] = None
    aadhaar_number: Optional[str] = None


class EmployeeBasicResponse(BaseModel):
    id: str
    employee_id: str
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    photo: Optional[str] = None
    department_name: Optional[str] = None
    designation_name: Optional[str] = None

    class Config:
        from_attributes = True


class EmployeeListResponse(BaseModel):
    id: str
    employee_id: str
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    photo: Optional[str] = None
    department_name: Optional[str] = None
    designation_name: Optional[str] = None
    date_of_joining: date
    employment_status: EmploymentStatus
    employment_type: EmploymentType
    reporting_manager_name: Optional[str] = None

    class Config:
        from_attributes = True


class EmployeeDetailResponse(BaseModel):
    id: str
    employee_id: str
    first_name: str
    last_name: str
    middle_name: Optional[str] = None
    email: str
    phone: Optional[str] = None
    photo: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[Gender] = None
    marital_status: Optional[MaritalStatus] = None
    blood_group: Optional[str] = None
    nationality: Optional[str] = None
    
    # Employment
    date_of_joining: date
    date_of_leaving: Optional[date] = None
    probation_end_date: Optional[date] = None
    confirmation_date: Optional[date] = None
    employment_type: EmploymentType
    employment_status: EmploymentStatus
    work_location: Optional[str] = None
    notice_period_days: Optional[int] = None
    
    # Organization
    company_id: str
    company_name: Optional[str] = None
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    designation_id: Optional[str] = None
    designation_name: Optional[str] = None
    role_id: str
    role_name: Optional[str] = None
    reporting_manager_id: Optional[str] = None
    reporting_manager_name: Optional[str] = None
    
    # Contact
    personal_email: Optional[str] = None
    work_email: Optional[str] = None
    alternate_phone: Optional[str] = None
    current_address: Optional[dict] = None
    permanent_address: Optional[dict] = None
    emergency_contact: Optional[dict] = None
    
    # Bank & Statutory
    bank_details: Optional[dict] = None
    pan_number: Optional[str] = None
    aadhaar_number: Optional[str] = None
    pf_number: Optional[str] = None
    esi_number: Optional[str] = None
    uan_number: Optional[str] = None
    
    # Custom
    custom_fields: Optional[dict] = None
    
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Department & Designation
class DepartmentCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    code: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[str] = None
    head_id: Optional[str] = None


class DepartmentResponse(BaseModel):
    id: str
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[str] = None
    head_id: Optional[str] = None
    is_active: bool
    employee_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class DesignationCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    code: Optional[str] = None
    level: Optional[int] = 1
    description: Optional[str] = None
    department_id: Optional[str] = None


class DesignationResponse(BaseModel):
    id: str
    name: str
    code: Optional[str] = None
    level: Optional[str] = None
    description: Optional[str] = None
    department_id: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
