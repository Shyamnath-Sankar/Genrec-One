from sqlalchemy import Column, String, Boolean, Date, DateTime, Numeric, Integer, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from app.models.types import JSONB
from app.models.base import Base, TimestampMixin
import uuid
import enum


def generate_uuid():
    return str(uuid.uuid4())


class CycleStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    IN_REVIEW = "IN_REVIEW"
    CALIBRATION = "CALIBRATION"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class GoalCategory(str, enum.Enum):
    INDIVIDUAL = "INDIVIDUAL"
    TEAM = "TEAM"
    DEPARTMENT = "DEPARTMENT"
    COMPANY = "COMPANY"


class GoalStatus(str, enum.Enum):
    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    EXCEEDED = "EXCEEDED"
    NOT_MET = "NOT_MET"
    CANCELLED = "CANCELLED"


class AppraisalStatus(str, enum.Enum):
    PENDING = "PENDING"
    SELF_REVIEW = "SELF_REVIEW"
    MANAGER_REVIEW = "MANAGER_REVIEW"
    CALIBRATION = "CALIBRATION"
    COMPLETED = "COMPLETED"


class FeedbackType(str, enum.Enum):
    PEER = "PEER"
    UPWARD = "UPWARD"
    DOWNWARD = "DOWNWARD"
    SELF = "SELF"
    CONTINUOUS = "CONTINUOUS"


class AppraisalCycle(Base, TimestampMixin):
    __tablename__ = "appraisal_cycles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    self_review_start = Column(Date, nullable=False)
    self_review_end = Column(Date, nullable=False)
    manager_review_start = Column(Date, nullable=False)
    manager_review_end = Column(Date, nullable=False)
    calibration_start = Column(Date, nullable=True)
    calibration_end = Column(Date, nullable=True)
    is_360_enabled = Column(Boolean, default=False)
    rating_scale = Column(Integer, default=5)
    status = Column(Enum(CycleStatus), default=CycleStatus.DRAFT)

    # Relationships
    appraisals = relationship("Appraisal", back_populates="cycle")
    goals = relationship("Goal", back_populates="cycle")


class Goal(Base, TimestampMixin):
    __tablename__ = "goals"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    cycle_id = Column(String(36), ForeignKey("appraisal_cycles.id"), nullable=True, index=True)
    employee_id = Column(String(36), ForeignKey("employees.id"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(Enum(GoalCategory), default=GoalCategory.INDIVIDUAL)
    weightage = Column(Numeric(5, 2), default=0)
    target_value = Column(Numeric(10, 2), nullable=True)
    achieved_value = Column(Numeric(10, 2), nullable=True)
    unit = Column(String(50), nullable=True)
    start_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    status = Column(Enum(GoalStatus), default=GoalStatus.NOT_STARTED)
    progress = Column(Integer, default=0)  # percentage
    self_rating = Column(Integer, nullable=True)
    manager_rating = Column(Integer, nullable=True)
    comments = Column(Text, nullable=True)

    # Relationships
    cycle = relationship("AppraisalCycle", back_populates="goals")
    employee = relationship("Employee", back_populates="goals")


class Appraisal(Base, TimestampMixin):
    __tablename__ = "appraisals"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    cycle_id = Column(String(36), ForeignKey("appraisal_cycles.id"), nullable=False)
    employee_id = Column(String(36), ForeignKey("employees.id"), nullable=False)
    appraiser_id = Column(String(36), ForeignKey("employees.id"), nullable=True)
    self_review_data = Column(JSONB, nullable=True)
    self_review_submitted_at = Column(DateTime, nullable=True)
    manager_review_data = Column(JSONB, nullable=True)
    manager_review_submitted_at = Column(DateTime, nullable=True)
    self_rating = Column(Numeric(3, 2), nullable=True)
    manager_rating = Column(Numeric(3, 2), nullable=True)
    final_rating = Column(Numeric(3, 2), nullable=True)
    calibrated_rating = Column(Numeric(3, 2), nullable=True)
    overall_comments = Column(Text, nullable=True)
    development_plan = Column(Text, nullable=True)
    promotion_recommendation = Column(Boolean, default=False)
    status = Column(Enum(AppraisalStatus), default=AppraisalStatus.PENDING)

    # Relationships
    cycle = relationship("AppraisalCycle", back_populates="appraisals")


class Feedback(Base):
    __tablename__ = "feedbacks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    giver_id = Column(String(36), ForeignKey("employees.id"), nullable=False)
    receiver_id = Column(String(36), ForeignKey("employees.id"), nullable=False)
    cycle_id = Column(String(36), nullable=True)
    type = Column(Enum(FeedbackType), nullable=False)
    is_anonymous = Column(Boolean, default=False)
    ratings = Column(JSONB, nullable=True)
    comments = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False)
