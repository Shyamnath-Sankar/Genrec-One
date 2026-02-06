from sqlalchemy import Column, String, Boolean, Date, DateTime, Numeric, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from app.models.base import Base, TimestampMixin
from app.models.attendance import ApprovalStatus
import uuid


def generate_uuid():
    return str(uuid.uuid4())


class Timesheet(Base, TimestampMixin):
    __tablename__ = "timesheets"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    employee_id = Column(String(36), ForeignKey("employees.id"), nullable=False, index=True)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False, index=True)
    task_id = Column(String(36), ForeignKey("tasks.id"), nullable=True)
    date = Column(Date, nullable=False)
    hours = Column(Numeric(4, 2), nullable=False)
    is_billable = Column(Boolean, default=True)
    description = Column(Text, nullable=True)
    status = Column(Enum(ApprovalStatus), default=ApprovalStatus.PENDING)
    approver_id = Column(String(36), nullable=True)
    approved_at = Column(DateTime, nullable=True)

    # Relationships
    employee = relationship("Employee", back_populates="timesheets")
    project = relationship("Project", back_populates="timesheets")
    task = relationship("Task", back_populates="timesheets")
