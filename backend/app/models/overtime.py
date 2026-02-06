from sqlalchemy import Column, String, Date, DateTime, Numeric, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.models.base import Base, TimestampMixin
from app.models.attendance import ApprovalStatus
from sqlalchemy import Enum
import uuid


def generate_uuid():
    return str(uuid.uuid4())


class Overtime(Base, TimestampMixin):
    __tablename__ = "overtime"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    employee_id = Column(String(36), ForeignKey("employees.id"), nullable=False)
    date = Column(Date, nullable=False)
    hours = Column(Numeric(4, 2), nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(Enum(ApprovalStatus), default=ApprovalStatus.PENDING)
    approver_id = Column(String(36), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    rate = Column(Numeric(5, 2), nullable=True)  # Multiplier
    amount = Column(Numeric(10, 2), nullable=True)

    # Relationships
    employee = relationship("Employee", back_populates="overtime_records")
