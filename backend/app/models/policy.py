from sqlalchemy import Column, String, Boolean, Date, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from app.models.types import JSONB, ARRAY
from app.models.base import Base, TimestampMixin
from app.models.ticket import Priority
import uuid
import enum


def generate_uuid():
    return str(uuid.uuid4())


class PolicyType(str, enum.Enum):
    LEAVE = "LEAVE"
    ATTENDANCE = "ATTENDANCE"
    PAYROLL = "PAYROLL"
    EXPENSE = "EXPENSE"
    TRAVEL = "TRAVEL"
    GENERAL = "GENERAL"


class Policy(Base, TimestampMixin):
    __tablename__ = "policies"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id"), nullable=False)
    type = Column(Enum(PolicyType), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    content = Column(JSONB, nullable=False)
    version = Column(String(10), default="1")
    is_active = Column(Boolean, default=True)
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date, nullable=True)

    # Relationships
    company = relationship("Company", back_populates="policies")
    acknowledgements = relationship("PolicyAcknowledgement", back_populates="policy")


class PolicyAcknowledgement(Base):
    __tablename__ = "policy_acknowledgements"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    policy_id = Column(String(36), ForeignKey("policies.id"), nullable=False)
    employee_id = Column(String(36), ForeignKey("employees.id"), nullable=False)
    acknowledged_at = Column(DateTime, nullable=False)
    ip_address = Column(String(45), nullable=True)

    # Relationships
    policy = relationship("Policy", back_populates="acknowledgements")


class Announcement(Base, TimestampMixin):
    __tablename__ = "announcements"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id"), nullable=False)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    priority = Column(Enum(Priority), default=Priority.MEDIUM)
    target_roles = Column(ARRAY(String), nullable=True)  # Empty means all
    published_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    is_pinned = Column(Boolean, default=False)
    created_by_id = Column(String(36), nullable=False)

    # Relationships
    company = relationship("Company", back_populates="announcements")
