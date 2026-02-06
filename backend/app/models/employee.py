from sqlalchemy import Column, String, Boolean, Date, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.models.types import JSONB
from app.models.base import Base, TimestampMixin
import uuid
import enum


def generate_uuid():
    return str(uuid.uuid4())


class Gender(str, enum.Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"
    OTHER = "OTHER"


class MaritalStatus(str, enum.Enum):
    SINGLE = "SINGLE"
    MARRIED = "MARRIED"
    DIVORCED = "DIVORCED"
    WIDOWED = "WIDOWED"


class EmploymentType(str, enum.Enum):
    FULL_TIME = "FULL_TIME"
    PART_TIME = "PART_TIME"
    CONTRACT = "CONTRACT"
    INTERN = "INTERN"
    CONSULTANT = "CONSULTANT"


class EmploymentStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    ON_NOTICE = "ON_NOTICE"
    RESIGNED = "RESIGNED"
    TERMINATED = "TERMINATED"
    RETIRED = "RETIRED"
    ABSCONDED = "ABSCONDED"


class Employee(Base, TimestampMixin):
    __tablename__ = "employees"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    employee_id = Column(String(50), unique=True, nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    company_id = Column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    role_id = Column(String(36), ForeignKey("roles.id"), nullable=False)
    department_id = Column(String(36), ForeignKey("departments.id"), nullable=True, index=True)
    designation_id = Column(String(36), ForeignKey("designations.id"), nullable=True)
    reporting_manager_id = Column(String(36), ForeignKey("employees.id"), nullable=True, index=True)

    # Personal Details
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    middle_name = Column(String(100), nullable=True)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(Enum(Gender), nullable=True)
    marital_status = Column(Enum(MaritalStatus), nullable=True)
    blood_group = Column(String(10), nullable=True)
    nationality = Column(String(50), nullable=True)
    photo = Column(String(500), nullable=True)

    # Contact Information
    personal_email = Column(String(255), nullable=True)
    work_email = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    alternate_phone = Column(String(20), nullable=True)
    current_address = Column(JSONB, nullable=True)
    permanent_address = Column(JSONB, nullable=True)
    emergency_contact = Column(JSONB, nullable=True)

    # Employment Details
    date_of_joining = Column(Date, nullable=False)
    date_of_leaving = Column(Date, nullable=True)
    probation_end_date = Column(Date, nullable=True)
    confirmation_date = Column(Date, nullable=True)
    employment_type = Column(Enum(EmploymentType), default=EmploymentType.FULL_TIME)
    employment_status = Column(Enum(EmploymentStatus), default=EmploymentStatus.ACTIVE)
    work_location = Column(String(100), nullable=True)
    notice_period_days = Column(String(10), default="30")

    # Bank & Statutory
    bank_details = Column(JSONB, nullable=True)
    pan_number = Column(String(20), nullable=True)
    aadhaar_number = Column(String(20), nullable=True)
    pf_number = Column(String(50), nullable=True)
    esi_number = Column(String(50), nullable=True)
    uan_number = Column(String(50), nullable=True)

    # Custom Fields
    custom_fields = Column(JSONB, nullable=True)

    # Relationships
    user = relationship("User", back_populates="employee")
    company = relationship("Company", back_populates="employees")
    role = relationship("Role", back_populates="employees")
    department = relationship("Department", back_populates="employees")
    designation = relationship("Designation", back_populates="employees")
    reporting_manager = relationship("Employee", remote_side=[id], backref="subordinates")

    # Related records
    attendance_records = relationship("Attendance", back_populates="employee")
    leave_applications = relationship("LeaveApplication", back_populates="employee")
    leave_balances = relationship("LeaveBalance", back_populates="employee")
    timesheets = relationship("Timesheet", back_populates="employee")
    salary_details = relationship("SalaryDetail", back_populates="employee")
    payroll_records = relationship("PayrollDetail", back_populates="employee")
    documents = relationship("Document", back_populates="employee")
    expenses = relationship("Expense", back_populates="employee")
    goals = relationship("Goal", back_populates="employee")
    travel_requests = relationship("TravelRequest", back_populates="employee")
    shift_assignments = relationship("ShiftAssignment", back_populates="employee")
    overtime_records = relationship("Overtime", back_populates="employee")
    trainings = relationship("EmployeeTraining", back_populates="employee")
