from sqlalchemy import Column, String, Boolean, Date, DateTime, Numeric, ForeignKey, Enum, Text, Integer
from sqlalchemy.orm import relationship
from app.models.base import Base, TimestampMixin
from app.models.attendance import ApprovalStatus
import uuid
import enum


def generate_uuid():
    return str(uuid.uuid4())


class AccrualType(str, enum.Enum):
    YEARLY = "YEARLY"
    MONTHLY = "MONTHLY"
    QUARTERLY = "QUARTERLY"
    NONE = "NONE"


class HalfDayType(str, enum.Enum):
    FIRST_HALF = "FIRST_HALF"
    SECOND_HALF = "SECOND_HALF"


class HolidayType(str, enum.Enum):
    NATIONAL = "NATIONAL"
    REGIONAL = "REGIONAL"
    COMPANY = "COMPANY"
    OPTIONAL = "OPTIONAL"


class LeaveType(Base, TimestampMixin):
    __tablename__ = "leave_types"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String(20), nullable=True)
    annual_quota = Column(Numeric(4, 1), nullable=False)
    accrual_type = Column(Enum(AccrualType), default=AccrualType.YEARLY)
    accrual_frequency = Column(Integer, nullable=True)
    carry_forward_limit = Column(Numeric(4, 1), nullable=True)
    encashment_allowed = Column(Boolean, default=False)
    is_paid_leave = Column(Boolean, default=True)
    requires_document = Column(Boolean, default=False)
    min_days = Column(Numeric(3, 1), default=0.5)
    max_days = Column(Numeric(4, 1), nullable=True)
    advance_notice_days = Column(Integer, default=0)
    applicable_gender = Column(String(10), nullable=True)
    is_active = Column(Boolean, default=True)

    # Relationships
    applications = relationship("LeaveApplication", back_populates="leave_type")
    balances = relationship("LeaveBalance", back_populates="leave_type")


class LeaveApplication(Base, TimestampMixin):
    __tablename__ = "leave_applications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    employee_id = Column(String(36), ForeignKey("employees.id"), nullable=False, index=True)
    leave_type_id = Column(String(36), ForeignKey("leave_types.id"), nullable=False)
    from_date = Column(Date, nullable=False)
    to_date = Column(Date, nullable=False)
    total_days = Column(Numeric(4, 1), nullable=False)
    is_half_day = Column(Boolean, default=False)
    half_day_type = Column(Enum(HalfDayType), nullable=True)
    reason = Column(Text, nullable=False)
    document_path = Column(String(500), nullable=True)
    status = Column(Enum(ApprovalStatus), default=ApprovalStatus.PENDING, index=True)
    approver_id = Column(String(36), nullable=True)
    approver_remarks = Column(Text, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    cancel_reason = Column(Text, nullable=True)

    # Relationships
    employee = relationship("Employee", back_populates="leave_applications")
    leave_type = relationship("LeaveType", back_populates="applications")


class LeaveBalance(Base):
    __tablename__ = "leave_balances"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    employee_id = Column(String(36), ForeignKey("employees.id"), nullable=False)
    leave_type_id = Column(String(36), ForeignKey("leave_types.id"), nullable=False)
    year = Column(Integer, nullable=False)
    opening_balance = Column(Numeric(4, 1), default=0)
    accrued = Column(Numeric(4, 1), default=0)
    utilized = Column(Numeric(4, 1), default=0)
    encashed = Column(Numeric(4, 1), default=0)
    lapsed = Column(Numeric(4, 1), default=0)
    adjustment = Column(Numeric(4, 1), default=0)
    current_balance = Column(Numeric(4, 1), default=0)
    updated_at = Column(DateTime, nullable=False)

    # Relationships
    employee = relationship("Employee", back_populates="leave_balances")
    leave_type = relationship("LeaveType", back_populates="balances")


class Holiday(Base):
    __tablename__ = "holidays"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    date = Column(Date, unique=True, nullable=False)
    type = Column(Enum(HolidayType), default=HolidayType.NATIONAL)
    is_optional = Column(Boolean, default=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False)
