from sqlalchemy import Column, String, Boolean, Date, DateTime, ForeignKey, Text, Enum
from app.models.types import JSONB
from app.models.base import Base, TimestampMixin
import uuid
import enum


def generate_uuid():
    return str(uuid.uuid4())


class ComplianceStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    OVERDUE = "OVERDUE"


class StatutoryConfig(Base, TimestampMixin):
    __tablename__ = "statutory_configs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(200), nullable=False)
    category = Column(String(50), nullable=False)  # PF, ESI, PT, TDS
    config = Column(JSONB, nullable=False)  # Rate, limits, etc.
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date, nullable=True)
    is_active = Column(Boolean, default=True)


class ComplianceChecklist(Base):
    __tablename__ = "compliance_checklists"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(200), nullable=False)
    category = Column(String(100), nullable=False)
    frequency = Column(String(50), nullable=False)  # Monthly, Quarterly, Yearly
    due_day = Column(String(10), nullable=False)  # Day of month/quarter
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, nullable=False)


class ComplianceRecord(Base, TimestampMixin):
    __tablename__ = "compliance_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    checklist_id = Column(String(36), ForeignKey("compliance_checklists.id"), nullable=False)
    period = Column(String(20), nullable=False)  # e.g., "2026-01" or "2026-Q1"
    status = Column(Enum(ComplianceStatus), default=ComplianceStatus.PENDING)
    completed_by_id = Column(String(36), nullable=True)
    completed_at = Column(DateTime, nullable=True)
    document_path = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)
