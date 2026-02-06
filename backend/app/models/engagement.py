"""
Employee Engagement Models
Includes surveys, recognition, social feed, and engagement analytics
"""
from sqlalchemy import Column, String, DateTime, Integer, ForeignKey, Text, Enum, Boolean, Float
from sqlalchemy.orm import relationship
from app.models.types import JSONB, ARRAY
from app.models.base import Base, TimestampMixin
from datetime import datetime
import uuid
import enum


def generate_uuid():
    return str(uuid.uuid4())


# ==================== SURVEYS ====================

class SurveyType(str, enum.Enum):
    ENPS = "enps"  # Employee Net Promoter Score
    ENGAGEMENT = "engagement"
    PULSE = "pulse"
    ONBOARDING = "onboarding"
    EXIT = "exit"
    FEEDBACK_360 = "feedback_360"
    CUSTOM = "custom"


class QuestionType(str, enum.Enum):
    RATING = "rating"  # 1-5 or 1-10 scale
    NPS = "nps"  # 0-10 NPS scale
    TEXT = "text"
    SINGLE_CHOICE = "single_choice"
    MULTIPLE_CHOICE = "multiple_choice"
    YES_NO = "yes_no"
    DATE = "date"
    MATRIX = "matrix"  # Multiple questions with same options


class SurveyStatus(str, enum.Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    ACTIVE = "active"
    CLOSED = "closed"
    ARCHIVED = "archived"


class Survey(Base, TimestampMixin):
    """Survey definitions"""
    __tablename__ = "surveys"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    created_by_id = Column(String(36), ForeignKey("employees.id"), nullable=False)
    
    title = Column(String(300), nullable=False)
    description = Column(Text, nullable=True)
    survey_type = Column(Enum(SurveyType), nullable=False)
    status = Column(Enum(SurveyStatus), default=SurveyStatus.DRAFT)
    
    # Scheduling
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    
    # Settings
    is_anonymous = Column(Boolean, default=True)
    allow_multiple_responses = Column(Boolean, default=False)
    show_progress = Column(Boolean, default=True)
    randomize_questions = Column(Boolean, default=False)
    
    # Targeting (which employees should take this survey)
    target_all = Column(Boolean, default=True)
    target_departments = Column(ARRAY(String), nullable=True)
    target_designations = Column(ARRAY(String), nullable=True)
    target_employees = Column(ARRAY(String), nullable=True)
    
    # Reminders
    reminder_frequency_days = Column(Integer, nullable=True)
    last_reminder_sent = Column(DateTime, nullable=True)
    
    # Relationships
    questions = relationship("SurveyQuestion", back_populates="survey", cascade="all, delete-orphan", order_by="SurveyQuestion.order")
    responses = relationship("SurveyResponse", back_populates="survey")


class SurveyQuestion(Base, TimestampMixin):
    """Questions within a survey"""
    __tablename__ = "survey_questions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    survey_id = Column(String(36), ForeignKey("surveys.id", ondelete="CASCADE"), nullable=False)
    
    order = Column(Integer, nullable=False)
    question_text = Column(Text, nullable=False)
    question_type = Column(Enum(QuestionType), nullable=False)
    
    # For choice-based questions
    options = Column(JSONB, nullable=True)  # Array of {value, label}
    
    # Settings
    is_required = Column(Boolean, default=True)
    min_value = Column(Integer, nullable=True)  # For rating questions
    max_value = Column(Integer, nullable=True)
    placeholder = Column(String(200), nullable=True)
    
    # Conditional logic
    show_if = Column(JSONB, nullable=True)  # {question_id, operator, value}
    
    # For matrix questions
    matrix_rows = Column(JSONB, nullable=True)  # Array of row labels
    
    # Relationships
    survey = relationship("Survey", back_populates="questions")


class SurveyResponse(Base, TimestampMixin):
    """Survey response submissions"""
    __tablename__ = "survey_responses"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    survey_id = Column(String(36), ForeignKey("surveys.id", ondelete="CASCADE"), nullable=False)
    employee_id = Column(String(36), ForeignKey("employees.id"), nullable=True)  # Null if anonymous
    
    # Response status
    is_complete = Column(Boolean, default=False)
    submitted_at = Column(DateTime, nullable=True)
    time_spent_seconds = Column(Integer, nullable=True)
    
    # Relationships
    survey = relationship("Survey", back_populates="responses")
    answers = relationship("SurveyAnswer", back_populates="response", cascade="all, delete-orphan")


class SurveyAnswer(Base):
    """Individual question answers"""
    __tablename__ = "survey_answers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    response_id = Column(String(36), ForeignKey("survey_responses.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(String(36), ForeignKey("survey_questions.id"), nullable=False)
    
    # Answer values (use appropriate field based on question type)
    text_answer = Column(Text, nullable=True)
    number_answer = Column(Float, nullable=True)
    choice_answer = Column(String(200), nullable=True)  # Single choice
    choices_answer = Column(ARRAY(String), nullable=True)  # Multiple choice
    matrix_answer = Column(JSONB, nullable=True)  # {row: value}
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    response = relationship("SurveyResponse", back_populates="answers")


# ==================== RECOGNITION & REWARDS ====================

class BadgeCategory(str, enum.Enum):
    PERFORMANCE = "performance"
    TEAMWORK = "teamwork"
    INNOVATION = "innovation"
    LEADERSHIP = "leadership"
    CUSTOMER_SERVICE = "customer_service"
    LEARNING = "learning"
    TENURE = "tenure"
    SPECIAL = "special"


class Badge(Base, TimestampMixin):
    """Recognition badges/awards that can be given"""
    __tablename__ = "badges"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(100), nullable=True)  # Icon identifier or URL
    color = Column(String(20), nullable=True)
    category = Column(Enum(BadgeCategory), nullable=False)
    
    # Points associated with this badge
    points = Column(Integer, default=0)
    
    # Who can give this badge
    restricted_to_roles = Column(ARRAY(String), nullable=True)  # Null = anyone can give
    
    # Auto-award settings
    is_auto_awarded = Column(Boolean, default=False)
    auto_award_criteria = Column(JSONB, nullable=True)  # Conditions for auto-award
    
    is_active = Column(Boolean, default=True)


class Recognition(Base, TimestampMixin):
    """Recognition given from one employee to another"""
    __tablename__ = "recognitions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    
    giver_id = Column(String(36), ForeignKey("employees.id"), nullable=False)
    receiver_id = Column(String(36), ForeignKey("employees.id"), nullable=False, index=True)
    badge_id = Column(String(36), ForeignKey("badges.id"), nullable=True)
    
    message = Column(Text, nullable=False)
    
    # Company values this recognition aligns with
    values = Column(ARRAY(String), nullable=True)
    
    # Visibility
    is_public = Column(Boolean, default=True)
    
    # Likes and engagement
    like_count = Column(Integer, default=0)
    
    # Relationships
    giver = relationship("Employee", foreign_keys=[giver_id])
    receiver = relationship("Employee", foreign_keys=[receiver_id])
    badge = relationship("Badge")
    likes = relationship("RecognitionLike", back_populates="recognition", cascade="all, delete-orphan")


class RecognitionLike(Base):
    """Likes on recognitions"""
    __tablename__ = "recognition_likes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    recognition_id = Column(String(36), ForeignKey("recognitions.id", ondelete="CASCADE"), nullable=False)
    employee_id = Column(String(36), ForeignKey("employees.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    recognition = relationship("Recognition", back_populates="likes")


# ==================== SOCIAL FEED ====================

class PostType(str, enum.Enum):
    UPDATE = "update"
    ANNOUNCEMENT = "announcement"
    POLL = "poll"
    EVENT = "event"
    RECOGNITION = "recognition"  # Auto-created from recognitions
    BIRTHDAY = "birthday"  # Auto-created
    WORK_ANNIVERSARY = "work_anniversary"  # Auto-created
    NEW_JOINER = "new_joiner"  # Auto-created


class Post(Base, TimestampMixin):
    """Social feed posts"""
    __tablename__ = "posts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    author_id = Column(String(36), ForeignKey("employees.id"), nullable=False)
    
    post_type = Column(Enum(PostType), default=PostType.UPDATE)
    content = Column(Text, nullable=False)
    
    # Media attachments
    attachments = Column(JSONB, nullable=True)  # Array of {type, url, name}
    
    # For poll type
    poll_options = Column(JSONB, nullable=True)  # Array of {id, text, votes}
    poll_end_date = Column(DateTime, nullable=True)
    poll_allow_multiple = Column(Boolean, default=False)
    
    # For event type
    event_date = Column(DateTime, nullable=True)
    event_location = Column(String(300), nullable=True)
    
    # Visibility
    is_pinned = Column(Boolean, default=False)
    visible_to_all = Column(Boolean, default=True)
    visible_to_departments = Column(ARRAY(String), nullable=True)
    
    # Engagement metrics
    like_count = Column(Integer, default=0)
    comment_count = Column(Integer, default=0)
    
    # Relationships
    author = relationship("Employee", foreign_keys=[author_id])
    comments = relationship("PostComment", back_populates="post", cascade="all, delete-orphan")
    likes = relationship("PostLike", back_populates="post", cascade="all, delete-orphan")


class PostComment(Base, TimestampMixin):
    """Comments on posts"""
    __tablename__ = "post_comments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    post_id = Column(String(36), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    author_id = Column(String(36), ForeignKey("employees.id"), nullable=False)
    parent_id = Column(String(36), ForeignKey("post_comments.id"), nullable=True)  # For replies
    
    content = Column(Text, nullable=False)
    
    # Relationships
    post = relationship("Post", back_populates="comments")
    author = relationship("Employee", foreign_keys=[author_id])
    replies = relationship("PostComment", back_populates="parent", cascade="all, delete-orphan")
    parent = relationship("PostComment", remote_side=[id], back_populates="replies")


class PostLike(Base):
    """Likes on posts"""
    __tablename__ = "post_likes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    post_id = Column(String(36), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    employee_id = Column(String(36), ForeignKey("employees.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    post = relationship("Post", back_populates="likes")


class PollVote(Base):
    """Votes on poll posts"""
    __tablename__ = "poll_votes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    post_id = Column(String(36), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    employee_id = Column(String(36), ForeignKey("employees.id"), nullable=False)
    option_ids = Column(ARRAY(String), nullable=False)  # Allow multiple if poll allows
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


# ==================== COMPANY VALUES ====================

class CompanyValue(Base, TimestampMixin):
    """Company core values for recognition alignment"""
    __tablename__ = "company_values"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(100), nullable=True)
    color = Column(String(20), nullable=True)
    order = Column(Integer, default=0)
    
    is_active = Column(Boolean, default=True)


# ==================== CELEBRATIONS ====================

class Celebration(Base, TimestampMixin):
    """Track celebrations (birthdays, anniversaries, etc.)"""
    __tablename__ = "celebrations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    employee_id = Column(String(36), ForeignKey("employees.id"), nullable=False)
    
    celebration_type = Column(String(50), nullable=False)  # birthday, work_anniversary
    celebration_date = Column(DateTime, nullable=False, index=True)
    
    # Auto-generated post ID if created
    post_id = Column(String(36), ForeignKey("posts.id"), nullable=True)
    
    # For work anniversaries
    years = Column(Integer, nullable=True)
    
    # Wishes received
    wish_count = Column(Integer, default=0)


class CelebrationWish(Base):
    """Wishes on celebrations"""
    __tablename__ = "celebration_wishes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    celebration_id = Column(String(36), ForeignKey("celebrations.id", ondelete="CASCADE"), nullable=False)
    employee_id = Column(String(36), ForeignKey("employees.id"), nullable=False)
    message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
