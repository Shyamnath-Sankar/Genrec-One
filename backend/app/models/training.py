from sqlalchemy import Column, String, Boolean, Date, DateTime, Numeric, Integer, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from app.models.base import Base, TimestampMixin
import uuid
import enum


def generate_uuid():
    return str(uuid.uuid4())


class TrainingType(str, enum.Enum):
    TECHNICAL = "TECHNICAL"
    SOFT_SKILLS = "SOFT_SKILLS"
    COMPLIANCE = "COMPLIANCE"
    ONBOARDING = "ONBOARDING"
    LEADERSHIP = "LEADERSHIP"
    OTHER = "OTHER"


class TrainingStatus(str, enum.Enum):
    ENROLLED = "ENROLLED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class Training(Base, TimestampMixin):
    __tablename__ = "trainings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    type = Column(Enum(TrainingType), nullable=False)
    duration = Column(Integer, nullable=False)  # hours
    is_external = Column(Boolean, default=False)
    provider = Column(String(200), nullable=True)
    cost = Column(Numeric(10, 2), nullable=True)
    is_active = Column(Boolean, default=True)

    # Relationships
    enrollments = relationship("EmployeeTraining", back_populates="training")


class EmployeeTraining(Base):
    __tablename__ = "employee_trainings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    training_id = Column(String(36), ForeignKey("trainings.id"), nullable=False)
    employee_id = Column(String(36), ForeignKey("employees.id"), nullable=False)
    enrolled_at = Column(DateTime, nullable=False)
    start_date = Column(Date, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    score = Column(Integer, nullable=True)
    certificate_path = Column(String(500), nullable=True)
    status = Column(Enum(TrainingStatus), default=TrainingStatus.ENROLLED)

    # Relationships
    training = relationship("Training", back_populates="enrollments")
    employee = relationship("Employee", back_populates="trainings")
