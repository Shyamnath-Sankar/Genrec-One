from sqlalchemy import Column, String, Boolean, Date, DateTime, Numeric, Integer, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from app.models.base import Base, TimestampMixin
import uuid
import enum


def generate_uuid():
    return str(uuid.uuid4())


class SalaryComponentType(str, enum.Enum):
    EARNING = "EARNING"
    DEDUCTION = "DEDUCTION"
    EMPLOYER_CONTRIBUTION = "EMPLOYER_CONTRIBUTION"


class CalculationType(str, enum.Enum):
    FIXED = "FIXED"
    PERCENTAGE_OF_BASIC = "PERCENTAGE_OF_BASIC"
    PERCENTAGE_OF_GROSS = "PERCENTAGE_OF_GROSS"
    PERCENTAGE_OF_CTC = "PERCENTAGE_OF_CTC"
    CUSTOM = "CUSTOM"


class PayrollStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    CALCULATED = "CALCULATED"
    REVIEWED = "REVIEWED"
    LOCKED = "LOCKED"
    PAID = "PAID"


class LoanStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class SalaryComponent(Base, TimestampMixin):
    __tablename__ = "salary_components"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    type = Column(Enum(SalaryComponentType), nullable=False)
    calculation = Column(Enum(CalculationType), default=CalculationType.FIXED)
    base_component = Column(String(50), nullable=True)
    percentage = Column(Numeric(5, 2), nullable=True)
    is_taxable = Column(Boolean, default=True)
    is_statutory = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    order = Column(Integer, default=0)

    # Relationships
    salary_details = relationship("SalaryDetailComponent", back_populates="component")
    payroll_details = relationship("PayrollComponent", back_populates="component")


class SalaryDetail(Base, TimestampMixin):
    __tablename__ = "salary_details"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    employee_id = Column(String(36), ForeignKey("employees.id"), nullable=False, index=True)
    ctc = Column(Numeric(12, 2), nullable=False)
    gross_salary = Column(Numeric(12, 2), nullable=False)
    net_salary = Column(Numeric(12, 2), nullable=False)
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date, nullable=True)
    is_current = Column(Boolean, default=True)

    # Relationships
    employee = relationship("Employee", back_populates="salary_details")
    components = relationship("SalaryDetailComponent", back_populates="salary_detail", cascade="all, delete-orphan")


class SalaryDetailComponent(Base):
    __tablename__ = "salary_detail_components"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    salary_detail_id = Column(String(36), ForeignKey("salary_details.id", ondelete="CASCADE"), nullable=False)
    component_id = Column(String(36), ForeignKey("salary_components.id"), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)

    # Relationships
    salary_detail = relationship("SalaryDetail", back_populates="components")
    component = relationship("SalaryComponent", back_populates="salary_details")


class PayrollRun(Base, TimestampMixin):
    __tablename__ = "payroll_runs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    status = Column(Enum(PayrollStatus), default=PayrollStatus.DRAFT)
    total_gross = Column(Numeric(15, 2), nullable=False)
    total_deductions = Column(Numeric(15, 2), nullable=False)
    total_net = Column(Numeric(15, 2), nullable=False)
    employee_count = Column(Integer, default=0)
    processed_by_id = Column(String(36), nullable=True)
    processed_at = Column(DateTime, nullable=True)
    locked_by_id = Column(String(36), nullable=True)
    locked_at = Column(DateTime, nullable=True)
    paid_at = Column(DateTime, nullable=True)

    # Relationships
    details = relationship("PayrollDetail", back_populates="payroll_run", cascade="all, delete-orphan")


class PayrollDetail(Base):
    __tablename__ = "payroll_details"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    payroll_run_id = Column(String(36), ForeignKey("payroll_runs.id"), nullable=False)
    employee_id = Column(String(36), ForeignKey("employees.id"), nullable=False)
    working_days = Column(Integer, nullable=False)
    present_days = Column(Numeric(4, 1), nullable=False)
    lop_days = Column(Numeric(4, 1), default=0)
    gross_salary = Column(Numeric(12, 2), nullable=False)
    total_earnings = Column(Numeric(12, 2), nullable=False)
    total_deductions = Column(Numeric(12, 2), nullable=False)
    net_salary = Column(Numeric(12, 2), nullable=False)
    reimbursements = Column(Numeric(10, 2), default=0)
    overtime_amount = Column(Numeric(10, 2), default=0)
    arrears = Column(Numeric(10, 2), default=0)
    loan_deduction = Column(Numeric(10, 2), default=0)
    payslip_path = Column(String(500), nullable=True)
    bank_account_no = Column(String(50), nullable=True)
    ifsc_code = Column(String(20), nullable=True)
    created_at = Column(DateTime, nullable=False)

    # Relationships
    payroll_run = relationship("PayrollRun", back_populates="details")
    employee = relationship("Employee", back_populates="payroll_records")
    components = relationship("PayrollComponent", back_populates="payroll_detail", cascade="all, delete-orphan")


class PayrollComponent(Base):
    __tablename__ = "payroll_components"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    payroll_detail_id = Column(String(36), ForeignKey("payroll_details.id", ondelete="CASCADE"), nullable=False)
    component_id = Column(String(36), ForeignKey("salary_components.id"), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)

    # Relationships
    payroll_detail = relationship("PayrollDetail", back_populates="components")
    component = relationship("SalaryComponent", back_populates="payroll_details")


class Loan(Base, TimestampMixin):
    __tablename__ = "loans"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    employee_id = Column(String(36), ForeignKey("employees.id"), nullable=False)
    loan_type = Column(String(50), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    interest_rate = Column(Numeric(5, 2), default=0)
    tenure = Column(Integer, nullable=False)  # months
    emi_amount = Column(Numeric(10, 2), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    remaining_amount = Column(Numeric(12, 2), nullable=False)
    status = Column(Enum(LoanStatus), default=LoanStatus.ACTIVE)
    approved_by_id = Column(String(36), nullable=True)
    approved_at = Column(DateTime, nullable=True)

    # Relationships
    repayments = relationship("LoanRepayment", back_populates="loan")


class LoanRepayment(Base):
    __tablename__ = "loan_repayments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    loan_id = Column(String(36), ForeignKey("loans.id"), nullable=False)
    payroll_month = Column(Integer, nullable=False)
    payroll_year = Column(Integer, nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    principal = Column(Numeric(10, 2), nullable=False)
    interest = Column(Numeric(10, 2), nullable=False)
    is_paid = Column(Boolean, default=False)
    created_at = Column(DateTime, nullable=False)

    # Relationships
    loan = relationship("Loan", back_populates="repayments")
