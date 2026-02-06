from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal
from enum import Enum


class SalaryComponentType(str, Enum):
    EARNING = "EARNING"
    DEDUCTION = "DEDUCTION"
    EMPLOYER_CONTRIBUTION = "EMPLOYER_CONTRIBUTION"


class CalculationType(str, Enum):
    FIXED = "FIXED"
    PERCENTAGE_OF_BASIC = "PERCENTAGE_OF_BASIC"
    PERCENTAGE_OF_GROSS = "PERCENTAGE_OF_GROSS"
    PERCENTAGE_OF_CTC = "PERCENTAGE_OF_CTC"
    CUSTOM = "CUSTOM"


class PayrollStatus(str, Enum):
    DRAFT = "DRAFT"
    CALCULATED = "CALCULATED"
    REVIEWED = "REVIEWED"
    LOCKED = "LOCKED"
    PAID = "PAID"


# Salary Component
class SalaryComponentCreate(BaseModel):
    name: str = Field(..., min_length=1)
    code: str = Field(..., min_length=1)
    type: SalaryComponentType
    calculation: CalculationType = CalculationType.FIXED
    base_component: Optional[str] = None
    percentage: Optional[float] = None
    is_taxable: bool = True
    is_statutory: bool = False
    order: int = 0


class SalaryComponentResponse(BaseModel):
    id: str
    name: str
    code: str
    type: SalaryComponentType
    calculation: CalculationType
    base_component: Optional[str] = None
    percentage: Optional[float] = None
    is_taxable: bool
    is_statutory: bool
    is_active: bool
    order: int

    class Config:
        from_attributes = True


# Salary Detail
class SalaryComponentAmount(BaseModel):
    component_id: str
    amount: float


class SalaryDetailCreate(BaseModel):
    employee_id: str
    ctc: float = Field(..., gt=0)
    effective_from: date
    components: List[SalaryComponentAmount]


class SalaryDetailResponse(BaseModel):
    id: str
    employee_id: str
    employee_name: Optional[str] = None
    ctc: float
    gross_salary: float
    net_salary: float
    effective_from: date
    effective_to: Optional[date] = None
    is_current: bool
    components: List[dict] = []

    class Config:
        from_attributes = True


# Payroll Run
class PayrollRunCreate(BaseModel):
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2020)


class PayrollRunResponse(BaseModel):
    id: str
    month: int
    year: int
    status: PayrollStatus
    total_gross: float
    total_deductions: float
    total_net: float
    employee_count: int
    processed_by_id: Optional[str] = None
    processed_at: Optional[datetime] = None
    locked_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PayrollDetailResponse(BaseModel):
    id: str
    employee_id: str
    employee_name: str
    employee_code: str
    working_days: int
    present_days: float
    lop_days: float
    gross_salary: float
    total_earnings: float
    total_deductions: float
    net_salary: float
    reimbursements: float
    overtime_amount: float
    arrears: float
    loan_deduction: float
    bank_account_no: Optional[str] = None
    payslip_path: Optional[str] = None
    earnings: List[dict] = []
    deductions: List[dict] = []

    class Config:
        from_attributes = True


# Loan
class LoanCreate(BaseModel):
    employee_id: str
    loan_type: str
    amount: float = Field(..., gt=0)
    interest_rate: float = Field(default=0, ge=0)
    tenure: int = Field(..., gt=0)  # months
    start_date: date


class LoanResponse(BaseModel):
    id: str
    employee_id: str
    employee_name: Optional[str] = None
    loan_type: str
    amount: float
    interest_rate: float
    tenure: int
    emi_amount: float
    start_date: date
    end_date: date
    remaining_amount: float
    status: str
    approved_by_id: Optional[str] = None
    approved_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Payslip
class PayslipComponent(BaseModel):
    name: str
    code: str
    amount: float


class PayslipData(BaseModel):
    month: int
    year: int
    employee_name: str
    employee_id: str
    department: Optional[str] = None
    designation: Optional[str] = None
    date_of_joining: Optional[date] = None
    pan_number: Optional[str] = None
    bank_account: Optional[str] = None
    working_days: int
    present_days: float
    lop_days: float
    earnings: List[PayslipComponent]
    deductions: List[PayslipComponent]
    total_earnings: float
    total_deductions: float
    net_salary: float
    amount_in_words: Optional[str] = None
