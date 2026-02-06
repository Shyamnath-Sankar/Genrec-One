from sqlalchemy import Column, String, Boolean, Date, DateTime, Numeric, Integer, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from app.models.types import ARRAY
from app.models.base import Base, TimestampMixin
from app.models.employee import EmploymentType
import uuid
import enum


def generate_uuid():
    return str(uuid.uuid4())


class WorkType(str, enum.Enum):
    ON_SITE = "ON_SITE"
    REMOTE = "REMOTE"
    HYBRID = "HYBRID"


class JobStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    OPEN = "OPEN"
    ON_HOLD = "ON_HOLD"
    CLOSED = "CLOSED"
    CANCELLED = "CANCELLED"


class CandidateStage(str, enum.Enum):
    NEW = "NEW"
    SCREENING = "SCREENING"
    INTERVIEW = "INTERVIEW"
    EVALUATION = "EVALUATION"
    OFFER = "OFFER"
    HIRED = "HIRED"
    REJECTED = "REJECTED"
    WITHDRAWN = "WITHDRAWN"


class InterviewType(str, enum.Enum):
    PHONE_SCREEN = "PHONE_SCREEN"
    TECHNICAL = "TECHNICAL"
    HR = "HR"
    MANAGERIAL = "MANAGERIAL"
    CULTURAL_FIT = "CULTURAL_FIT"
    FINAL = "FINAL"


class InterviewStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    NO_SHOW = "NO_SHOW"
    RESCHEDULED = "RESCHEDULED"


class Recommendation(str, enum.Enum):
    STRONG_HIRE = "STRONG_HIRE"
    HIRE = "HIRE"
    NO_DECISION = "NO_DECISION"
    NO_HIRE = "NO_HIRE"
    STRONG_NO_HIRE = "STRONG_NO_HIRE"


class OfferStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SENT = "SENT"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"
    WITHDRAWN = "WITHDRAWN"


class Job(Base, TimestampMixin):
    __tablename__ = "jobs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id"), nullable=False)
    title = Column(String(200), nullable=False)
    department_id = Column(String(36), nullable=True)
    hiring_manager_id = Column(String(36), nullable=True)
    positions = Column(Integer, default=1)
    location = Column(String(200), nullable=True)
    work_type = Column(Enum(WorkType), default=WorkType.ON_SITE)
    employment_type = Column(Enum(EmploymentType), nullable=False)
    experience_min = Column(Integer, nullable=True)
    experience_max = Column(Integer, nullable=True)
    salary_min = Column(Numeric(12, 2), nullable=True)
    salary_max = Column(Numeric(12, 2), nullable=True)
    currency = Column(String(10), default="INR")
    skills = Column(ARRAY(String), nullable=True)
    description = Column(Text, nullable=False)
    requirements = Column(Text, nullable=True)
    benefits = Column(Text, nullable=True)
    status = Column(Enum(JobStatus), default=JobStatus.DRAFT, index=True)
    published_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)

    # Relationships
    company = relationship("Company", back_populates="jobs")
    candidates = relationship("Candidate", back_populates="job")


class Candidate(Base, TimestampMixin):
    __tablename__ = "candidates"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    job_id = Column(String(36), ForeignKey("jobs.id"), nullable=False, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    resume_path = Column(String(500), nullable=True)
    linkedin_url = Column(String(500), nullable=True)
    current_company = Column(String(200), nullable=True)
    current_title = Column(String(200), nullable=True)
    experience = Column(Integer, nullable=True)  # years
    notice_period = Column(Integer, nullable=True)  # days
    expected_salary = Column(Numeric(12, 2), nullable=True)
    skills = Column(ARRAY(String), nullable=True)
    stage = Column(Enum(CandidateStage), default=CandidateStage.NEW, index=True)
    source = Column(String(100), nullable=True)
    match_score = Column(Integer, nullable=True)
    rating = Column(Numeric(3, 2), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    converted_to_employee_id = Column(String(36), nullable=True)
    applied_at = Column(DateTime, nullable=False)

    # Relationships
    job = relationship("Job", back_populates="candidates")
    interviews = relationship("Interview", back_populates="candidate")
    evaluations = relationship("CandidateEvaluation", back_populates="candidate")


class Interview(Base, TimestampMixin):
    __tablename__ = "interviews"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    candidate_id = Column(String(36), ForeignKey("candidates.id"), nullable=False)
    round = Column(Integer, nullable=False)
    type = Column(Enum(InterviewType), nullable=False)
    scheduled_at = Column(DateTime, nullable=False)
    duration = Column(Integer, nullable=False)  # minutes
    location = Column(String(200), nullable=True)
    meeting_link = Column(String(500), nullable=True)
    interviewer_ids = Column(ARRAY(String), nullable=True)
    status = Column(Enum(InterviewStatus), default=InterviewStatus.SCHEDULED)

    # Relationships
    candidate = relationship("Candidate", back_populates="interviews")


class CandidateEvaluation(Base):
    __tablename__ = "candidate_evaluations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    candidate_id = Column(String(36), ForeignKey("candidates.id"), nullable=False)
    evaluator_id = Column(String(36), nullable=False)
    round = Column(Integer, nullable=False)
    technical_skills = Column(Integer, nullable=True)  # 1-5
    communication = Column(Integer, nullable=True)
    problem_solving = Column(Integer, nullable=True)
    culture_fit = Column(Integer, nullable=True)
    overall_rating = Column(Numeric(3, 2), nullable=False)
    recommendation = Column(Enum(Recommendation), nullable=False)
    strengths = Column(Text, nullable=True)
    weaknesses = Column(Text, nullable=True)
    comments = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False)

    # Relationships
    candidate = relationship("Candidate", back_populates="evaluations")


class OfferLetter(Base, TimestampMixin):
    __tablename__ = "offer_letters"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    candidate_id = Column(String(36), nullable=False)
    designation = Column(String(100), nullable=False)
    department = Column(String(100), nullable=False)
    ctc = Column(Numeric(12, 2), nullable=False)
    joining_date = Column(Date, nullable=False)
    expiry_date = Column(Date, nullable=False)
    notice_period = Column(Integer, nullable=False)
    probation_days = Column(Integer, default=180)
    terms = Column(Text, nullable=True)
    document_path = Column(String(500), nullable=True)
    status = Column(Enum(OfferStatus), default=OfferStatus.DRAFT)
    sent_at = Column(DateTime, nullable=True)
    accepted_at = Column(DateTime, nullable=True)
    rejected_at = Column(DateTime, nullable=True)
