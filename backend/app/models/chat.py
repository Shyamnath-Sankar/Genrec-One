"""
Chat models for AI chatbot functionality.
Stores chat sessions and messages for context and history.
"""
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Integer, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
import enum
import uuid

from app.models.base import Base, TimestampMixin
from app.models.types import JSONB


def generate_uuid():
    return str(uuid.uuid4())


class MessageRole(str, enum.Enum):
    """Role of the message sender"""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"
    TOOL = "tool"


class MessageStatus(str, enum.Enum):
    """Status of message processing"""
    PENDING = "pending"
    STREAMING = "streaming"
    COMPLETED = "completed"
    FAILED = "failed"


class ChatSession(Base, TimestampMixin):
    """
    Represents a chat session/conversation.
    Each session contains multiple messages and is owned by an employee.
    """
    __tablename__ = "chat_sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    employee_id = Column(String(36), ForeignKey("employees.id"), nullable=False, index=True)
    title = Column(String(200), nullable=True)  # Auto-generated from first message
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Metadata for context
    context = Column(JSONB, nullable=True)  # Store user context, permissions, etc.
    
    # Session stats
    message_count = Column(Integer, default=0, nullable=False)
    last_message_at = Column(DateTime, nullable=True)
    
    # Relationships
    employee = relationship("Employee", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", order_by="ChatMessage.created_at")

    def __repr__(self):
        return f"<ChatSession {self.id[:8]}... employee={self.employee_id[:8]}...>"


class ChatMessage(Base, TimestampMixin):
    """
    Represents a single message in a chat session.
    Stores both user messages and AI responses.
    """
    __tablename__ = "chat_messages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Message content
    role = Column(Enum(MessageRole), nullable=False)
    content = Column(Text, nullable=True)  # Can be null for tool calls
    
    # For tool calls and results
    tool_calls = Column(JSONB, nullable=True)  # [{id, name, arguments}]
    tool_call_id = Column(String(100), nullable=True)  # For tool response messages
    
    # Processing status
    status = Column(Enum(MessageStatus), default=MessageStatus.COMPLETED, nullable=False)
    error_message = Column(Text, nullable=True)
    
    # Token usage tracking
    prompt_tokens = Column(Integer, nullable=True)
    completion_tokens = Column(Integer, nullable=True)
    total_tokens = Column(Integer, nullable=True)
    
    # Metadata
    model = Column(String(100), nullable=True)  # Model used for generation
    extra_data = Column(JSONB, nullable=True)  # Additional metadata (renamed from 'metadata' - reserved)
    
    # Relationships
    session = relationship("ChatSession", back_populates="messages")

    def __repr__(self):
        return f"<ChatMessage {self.id[:8]}... role={self.role.value}>"


class ChatToolExecution(Base, TimestampMixin):
    """
    Audit log for tool executions by the AI.
    Tracks all actions taken by the chatbot for safety and debugging.
    """
    __tablename__ = "chat_tool_executions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    message_id = Column(String(36), ForeignKey("chat_messages.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(String(36), ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    employee_id = Column(String(36), ForeignKey("employees.id"), nullable=False, index=True)
    
    # Tool execution details
    tool_name = Column(String(100), nullable=False, index=True)
    tool_call_id = Column(String(100), nullable=False)
    arguments = Column(JSONB, nullable=False)  # Input arguments
    result = Column(JSONB, nullable=True)  # Tool result
    
    # Execution status
    success = Column(Boolean, nullable=True)  # null = pending, True = success, False = failed
    error = Column(Text, nullable=True)
    
    # Safety tracking
    required_confirmation = Column(Boolean, default=False, nullable=False)
    confirmed_at = Column(DateTime, nullable=True)
    confirmed_by_id = Column(String(36), ForeignKey("employees.id"), nullable=True)
    rejected_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    
    # Timing
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    execution_time_ms = Column(Integer, nullable=True)

    # Relationships
    message = relationship("ChatMessage")
    session = relationship("ChatSession")
    employee = relationship("Employee", foreign_keys=[employee_id])
    confirmed_by = relationship("Employee", foreign_keys=[confirmed_by_id])

    def __repr__(self):
        return f"<ChatToolExecution {self.tool_name} success={self.success}>"
