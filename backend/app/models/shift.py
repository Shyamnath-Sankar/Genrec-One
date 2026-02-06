from sqlalchemy import Column, String, Boolean, Date, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base, TimestampMixin
import uuid


def generate_uuid():
    return str(uuid.uuid4())


class Shift(Base, TimestampMixin):
    __tablename__ = "shifts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    start_time = Column(String(5), nullable=False)  # HH:mm
    end_time = Column(String(5), nullable=False)
    grace_minutes = Column(Integer, default=15)
    half_day_hours = Column(String(10), nullable=True)
    full_day_hours = Column(String(10), nullable=True)
    break_duration = Column(Integer, default=60)  # minutes
    is_night_shift = Column(Boolean, default=False)
    is_flexible = Column(Boolean, default=False)
    timezone = Column(String(50), default="Asia/Kolkata")
    is_active = Column(Boolean, default=True)

    # Relationships
    assignments = relationship("ShiftAssignment", back_populates="shift")
    patterns = relationship("ShiftPattern", back_populates="shift")


class ShiftAssignment(Base):
    __tablename__ = "shift_assignments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    employee_id = Column(String(36), ForeignKey("employees.id"), nullable=False, index=True)
    shift_id = Column(String(36), ForeignKey("shifts.id"), nullable=False)
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date, nullable=True)
    is_default = Column(Boolean, default=True)
    created_at = Column(Date, nullable=False)

    # Relationships
    employee = relationship("Employee", back_populates="shift_assignments")
    shift = relationship("Shift", back_populates="assignments")


class ShiftPattern(Base):
    __tablename__ = "shift_patterns"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    shift_id = Column(String(36), ForeignKey("shifts.id"), nullable=False)
    day_of_week = Column(Integer, nullable=False)  # 0-6 (Sunday-Saturday)
    is_workday = Column(Boolean, default=True)
    created_at = Column(Date, nullable=False)

    # Relationships
    shift = relationship("Shift", back_populates="patterns")
