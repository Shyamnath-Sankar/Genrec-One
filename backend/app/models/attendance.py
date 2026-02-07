from sqlalchemy import Column, String, Boolean, Date, DateTime, Numeric, ForeignKey, Enum, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from app.models.base import Base, TimestampMixin
import uuid
import enum


def generate_uuid():
    return str(uuid.uuid4())


class AttendanceStatus(str, enum.Enum):
    PRESENT = "PRESENT"
    ABSENT = "ABSENT"
    HALF_DAY = "HALF_DAY"
    ON_LEAVE = "ON_LEAVE"
    HOLIDAY = "HOLIDAY"
    WEEK_OFF = "WEEK_OFF"
    WFH = "WFH"
    ON_DUTY = "ON_DUTY"
    LATE = "LATE"


class AttendanceSource(str, enum.Enum):
    WEB = "WEB"
    MOBILE = "MOBILE"
    BIOMETRIC = "BIOMETRIC"
    MANUAL = "MANUAL"
    REGULARIZATION = "REGULARIZATION"


class Attendance(Base, TimestampMixin):
    __tablename__ = "attendance"
    __table_args__ = (
        UniqueConstraint('employee_id', 'date', name='uq_attendance_employee_date'),
    )

    id = Column(String(36), primary_key=True, default=generate_uuid)
    employee_id = Column(String(36), ForeignKey("employees.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    check_in_time = Column(DateTime, nullable=True)
    check_out_time = Column(DateTime, nullable=True)
    total_hours = Column(Numeric(4, 2), nullable=True)
    status = Column(Enum(AttendanceStatus), default=AttendanceStatus.PRESENT)
    source = Column(Enum(AttendanceSource), default=AttendanceSource.WEB)
    ip_address = Column(String(45), nullable=True)
    latitude = Column(Numeric(10, 8), nullable=True)
    longitude = Column(Numeric(11, 8), nullable=True)
    selfie_path = Column(String(500), nullable=True)
    device_info = Column(String(500), nullable=True)
    remarks = Column(Text, nullable=True)
    is_regularized = Column(Boolean, default=False)
    regularized_by_id = Column(String(36), nullable=True)
    regularized_at = Column(DateTime, nullable=True)

    # Relationships
    employee = relationship("Employee", back_populates="attendance_records")


class ApprovalStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"


class AttendanceRegularization(Base, TimestampMixin):
    __tablename__ = "attendance_regularizations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    employee_id = Column(String(36), ForeignKey("employees.id"), nullable=False)
    date = Column(Date, nullable=False)
    check_in_time = Column(DateTime, nullable=False)
    check_out_time = Column(DateTime, nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(Enum(ApprovalStatus), default=ApprovalStatus.PENDING)
    approved_by_id = Column(String(36), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    approver_remarks = Column(Text, nullable=True)
