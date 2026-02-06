from sqlalchemy import Column, String, Boolean, DateTime, Integer, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from app.models.types import ARRAY
from app.models.base import Base, TimestampMixin
import uuid
import enum


def generate_uuid():
    return str(uuid.uuid4())


class Priority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"


class TicketStatus(str, enum.Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    WAITING_ON_USER = "WAITING_ON_USER"
    WAITING_ON_THIRD_PARTY = "WAITING_ON_THIRD_PARTY"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"
    REOPENED = "REOPENED"


class TicketCategory(Base):
    __tablename__ = "ticket_categories"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    sla_hours = Column(Integer, default=48)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, nullable=False)

    # Relationships
    tickets = relationship("Ticket", back_populates="category")


class Ticket(Base, TimestampMixin):
    __tablename__ = "tickets"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    ticket_number = Column(String(20), unique=True, nullable=False)
    category_id = Column(String(36), ForeignKey("ticket_categories.id"), nullable=False)
    created_by_id = Column(String(36), ForeignKey("employees.id"), nullable=False)
    assignee_id = Column(String(36), ForeignKey("employees.id"), nullable=True)
    subject = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(Enum(Priority), default=Priority.MEDIUM)
    status = Column(Enum(TicketStatus), default=TicketStatus.OPEN, index=True)
    attachments = Column(ARRAY(String), nullable=True)
    sla_deadline = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)
    satisfaction = Column(Integer, nullable=True)  # 1-5

    # Relationships
    category = relationship("TicketCategory", back_populates="tickets")
    comments = relationship("TicketComment", back_populates="ticket")


class TicketComment(Base):
    __tablename__ = "ticket_comments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    ticket_id = Column(String(36), ForeignKey("tickets.id"), nullable=False)
    user_id = Column(String(36), nullable=False)
    content = Column(Text, nullable=False)
    is_internal = Column(Boolean, default=False)
    attachments = Column(ARRAY(String), nullable=True)
    created_at = Column(DateTime, nullable=False)

    # Relationships
    ticket = relationship("Ticket", back_populates="comments")


class KnowledgeBase(Base, TimestampMixin):
    __tablename__ = "knowledge_base"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String(100), nullable=False)
    tags = Column(ARRAY(String), nullable=True)
    is_published = Column(Boolean, default=False)
    view_count = Column(Integer, default=0)
    created_by_id = Column(String(36), nullable=False)
