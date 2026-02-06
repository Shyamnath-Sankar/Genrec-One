from sqlalchemy import Column, String, DateTime, Integer, ForeignKey, Text, Enum
from app.models.types import JSONB
from app.models.base import Base, TimestampMixin
from app.models.attendance import ApprovalStatus
import uuid


def generate_uuid():
    return str(uuid.uuid4())


class Approval(Base):
    __tablename__ = "approvals"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    requester_id = Column(String(36), ForeignKey("employees.id"), nullable=False)
    approver_id = Column(String(36), ForeignKey("employees.id"), nullable=False, index=True)
    module = Column(String(50), nullable=False)  # leave, expense, timesheet, etc.
    entity_type = Column(String(100), nullable=False)
    entity_id = Column(String(36), nullable=False, index=True)
    level = Column(Integer, default=1)
    status = Column(Enum(ApprovalStatus), default=ApprovalStatus.PENDING)
    remarks = Column(Text, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False)


class ApprovalWorkflow(Base, TimestampMixin):
    __tablename__ = "approval_workflows"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    module = Column(String(50), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    levels = Column(JSONB, nullable=False)  # Array of approval level configurations
    is_active = Column(String(10), default="True")
