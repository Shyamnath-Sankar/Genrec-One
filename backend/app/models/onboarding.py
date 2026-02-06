from sqlalchemy import Column, String, Boolean, Date, DateTime, Integer, ForeignKey, Text
from app.models.types import JSONB
from app.models.base import Base, TimestampMixin
import uuid


def generate_uuid():
    return str(uuid.uuid4())


class OnboardingChecklist(Base):
    __tablename__ = "onboarding_checklists"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    task_order = Column(Integer, nullable=False)
    assigned_to = Column(String(100), nullable=False)  # Role or specific team
    due_days = Column(Integer, nullable=False)  # Days from joining to complete
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, nullable=False)


class OnboardingTask(Base):
    __tablename__ = "onboarding_tasks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    checklist_id = Column(String(36), ForeignKey("onboarding_checklists.id"), nullable=False)
    employee_id = Column(String(36), ForeignKey("employees.id"), nullable=False)
    is_completed = Column(Boolean, default=False)
    completed_by_id = Column(String(36), nullable=True)
    completed_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    due_date = Column(Date, nullable=False)
    created_at = Column(DateTime, nullable=False)


class OffboardingChecklist(Base):
    __tablename__ = "offboarding_checklists"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    task_order = Column(Integer, nullable=False)
    assigned_to = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, nullable=False)


class OffboardingTask(Base):
    __tablename__ = "offboarding_tasks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    checklist_id = Column(String(36), ForeignKey("offboarding_checklists.id"), nullable=False)
    employee_id = Column(String(36), ForeignKey("employees.id"), nullable=False)
    is_completed = Column(Boolean, default=False)
    completed_by_id = Column(String(36), nullable=True)
    completed_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False)


class ExitInterview(Base):
    __tablename__ = "exit_interviews"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    employee_id = Column(String(36), ForeignKey("employees.id"), nullable=False)
    conducted_by_id = Column(String(36), nullable=False)
    conducted_at = Column(DateTime, nullable=False)
    reason_for_leaving = Column(Text, nullable=False)
    feedback = Column(JSONB, nullable=False)  # Structured feedback
    would_recommend = Column(Boolean, nullable=True)
    would_rejoin = Column(Boolean, nullable=True)
    suggestions = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False)
