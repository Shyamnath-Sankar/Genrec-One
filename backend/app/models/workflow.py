"""
Workflow Automation Engine Models
Supports multi-level approvals, conditional workflows, and automation rules
"""
from sqlalchemy import Column, String, DateTime, Integer, ForeignKey, Text, Enum, Boolean, Float
from sqlalchemy.orm import relationship
from app.models.types import JSONB, ARRAY
from app.models.base import Base, TimestampMixin
from app.models.attendance import ApprovalStatus
from datetime import datetime
import uuid
import enum


def generate_uuid():
    return str(uuid.uuid4())


class WorkflowType(str, enum.Enum):
    LEAVE = "leave"
    EXPENSE = "expense"
    TRAVEL = "travel"
    TIMESHEET = "timesheet"
    ATTENDANCE_REGULARIZATION = "attendance_regularization"
    OVERTIME = "overtime"
    ASSET_REQUEST = "asset_request"
    LOAN = "loan"
    RESIGNATION = "resignation"
    SALARY_REVISION = "salary_revision"
    JOB_REQUISITION = "job_requisition"
    CUSTOM = "custom"


class ApproverType(str, enum.Enum):
    REPORTING_MANAGER = "reporting_manager"
    DEPARTMENT_HEAD = "department_head"
    HR = "hr"
    FINANCE = "finance"
    SPECIFIC_ROLE = "specific_role"
    SPECIFIC_EMPLOYEE = "specific_employee"
    SKIP_LEVEL_MANAGER = "skip_level_manager"


class ConditionOperator(str, enum.Enum):
    EQUALS = "equals"
    NOT_EQUALS = "not_equals"
    GREATER_THAN = "greater_than"
    LESS_THAN = "less_than"
    GREATER_THAN_OR_EQUALS = "greater_than_or_equals"
    LESS_THAN_OR_EQUALS = "less_than_or_equals"
    IN = "in"
    NOT_IN = "not_in"
    CONTAINS = "contains"
    BETWEEN = "between"


class WorkflowDefinition(Base, TimestampMixin):
    """Master workflow configuration"""
    __tablename__ = "workflow_definitions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    workflow_type = Column(Enum(WorkflowType), nullable=False)
    is_active = Column(Boolean, default=True)
    priority = Column(Integer, default=0)  # Higher priority workflows are evaluated first
    
    # Conditions for when this workflow applies (JSON array of conditions)
    # Example: [{"field": "amount", "operator": "greater_than", "value": 10000}]
    conditions = Column(JSONB, nullable=True)
    
    # Relationships
    steps = relationship("WorkflowStep", back_populates="workflow", cascade="all, delete-orphan", order_by="WorkflowStep.step_order")


class WorkflowStep(Base, TimestampMixin):
    """Individual steps in a workflow"""
    __tablename__ = "workflow_steps"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    workflow_id = Column(String(36), ForeignKey("workflow_definitions.id", ondelete="CASCADE"), nullable=False)
    step_order = Column(Integer, nullable=False)
    name = Column(String(200), nullable=False)
    
    # Who should approve at this step
    approver_type = Column(Enum(ApproverType), nullable=False)
    specific_role_id = Column(String(36), ForeignKey("roles.id"), nullable=True)
    specific_employee_id = Column(String(36), ForeignKey("employees.id"), nullable=True)
    
    # Step behavior
    is_mandatory = Column(Boolean, default=True)
    can_skip_if_same_approver = Column(Boolean, default=True)  # Skip if same as previous step
    auto_approve_after_hours = Column(Integer, nullable=True)  # Auto-approve if no action after X hours
    
    # Escalation settings
    escalate_after_hours = Column(Integer, nullable=True)
    escalate_to_type = Column(Enum(ApproverType), nullable=True)
    escalate_to_role_id = Column(String(36), nullable=True)
    
    # Conditions for this step (can skip step if conditions not met)
    conditions = Column(JSONB, nullable=True)
    
    # Relationships
    workflow = relationship("WorkflowDefinition", back_populates="steps")


class ApprovalRequest(Base, TimestampMixin):
    """Tracks approval requests through the workflow"""
    __tablename__ = "approval_requests"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    workflow_id = Column(String(36), ForeignKey("workflow_definitions.id"), nullable=True)
    
    # What is being approved
    module = Column(String(50), nullable=False, index=True)  # leave, expense, etc.
    entity_type = Column(String(100), nullable=False)  # LeaveApplication, Expense, etc.
    entity_id = Column(String(36), nullable=False, index=True)
    
    # Who requested
    requester_id = Column(String(36), ForeignKey("employees.id"), nullable=False)
    company_id = Column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    
    # Current state
    current_step = Column(Integer, default=1)
    total_steps = Column(Integer, default=1)
    status = Column(Enum(ApprovalStatus), default=ApprovalStatus.PENDING, index=True)
    
    # Summary data for quick reference
    summary = Column(JSONB, nullable=True)  # Store key info like amount, dates, etc.
    
    # Final outcome
    final_approver_id = Column(String(36), ForeignKey("employees.id"), nullable=True)
    final_remarks = Column(Text, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Relationships
    approvals = relationship("ApprovalAction", back_populates="request", cascade="all, delete-orphan")
    requester = relationship("Employee", foreign_keys=[requester_id])


class ApprovalAction(Base):
    """Individual approval actions at each step"""
    __tablename__ = "approval_actions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    request_id = Column(String(36), ForeignKey("approval_requests.id", ondelete="CASCADE"), nullable=False)
    step_number = Column(Integer, nullable=False)
    
    # Approver info
    approver_id = Column(String(36), ForeignKey("employees.id"), nullable=False)
    delegated_from_id = Column(String(36), ForeignKey("employees.id"), nullable=True)  # If delegated
    
    # Action taken
    status = Column(Enum(ApprovalStatus), default=ApprovalStatus.PENDING)
    remarks = Column(Text, nullable=True)
    action_at = Column(DateTime, nullable=True)
    
    # Auto-approval/escalation tracking
    is_auto_approved = Column(Boolean, default=False)
    is_escalated = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    request = relationship("ApprovalRequest", back_populates="approvals")
    approver = relationship("Employee", foreign_keys=[approver_id])


class ApprovalDelegation(Base, TimestampMixin):
    """Allows employees to delegate their approval authority"""
    __tablename__ = "approval_delegations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    delegator_id = Column(String(36), ForeignKey("employees.id"), nullable=False)
    delegate_id = Column(String(36), ForeignKey("employees.id"), nullable=False)
    
    # Scope of delegation
    workflow_types = Column(ARRAY(String), nullable=True)  # Null = all types
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    reason = Column(Text, nullable=True)
    
    is_active = Column(Boolean, default=True)


class ApprovalReminder(Base):
    """Tracks reminders sent for pending approvals"""
    __tablename__ = "approval_reminders"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    action_id = Column(String(36), ForeignKey("approval_actions.id", ondelete="CASCADE"), nullable=False)
    reminder_number = Column(Integer, default=1)
    sent_at = Column(DateTime, default=datetime.utcnow, nullable=False)
