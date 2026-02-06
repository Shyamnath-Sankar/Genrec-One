from sqlalchemy import Column, String, Boolean, Date, Numeric, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from app.models.base import Base, TimestampMixin
import uuid
import enum


def generate_uuid():
    return str(uuid.uuid4())


class ProjectStatus(str, enum.Enum):
    PLANNED = "PLANNED"
    ACTIVE = "ACTIVE"
    ON_HOLD = "ON_HOLD"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class Project(Base, TimestampMixin):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id"), nullable=False)
    name = Column(String(200), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    client_name = Column(String(200), nullable=True)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    budget_hours = Column(Numeric(10, 2), nullable=True)
    budget_amount = Column(Numeric(15, 2), nullable=True)
    hourly_rate = Column(Numeric(10, 2), nullable=True)
    status = Column(Enum(ProjectStatus), default=ProjectStatus.ACTIVE)
    manager_id = Column(String(36), nullable=True)
    is_active = Column(Boolean, default=True)

    # Relationships
    company = relationship("Company", back_populates="projects")
    tasks = relationship("Task", back_populates="project")
    timesheets = relationship("Timesheet", back_populates="project")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    is_billable = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(Date, nullable=False)

    # Relationships
    project = relationship("Project", back_populates="tasks")
    timesheets = relationship("Timesheet", back_populates="task")
