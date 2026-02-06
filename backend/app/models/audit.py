"""
Audit and Activity Logging Models
Comprehensive logging for compliance and security
"""
from sqlalchemy import Column, String, DateTime, Integer, ForeignKey, Text, Enum, Boolean
from sqlalchemy.orm import relationship
from app.models.types import JSONB
from app.models.base import Base
from datetime import datetime
import uuid
import enum


def generate_uuid():
    return str(uuid.uuid4())


class AuditAction(str, enum.Enum):
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    LOGIN = "login"
    LOGOUT = "logout"
    APPROVE = "approve"
    REJECT = "reject"
    SUBMIT = "submit"
    CANCEL = "cancel"
    EXPORT = "export"
    IMPORT = "import"
    UPLOAD = "upload"
    DOWNLOAD = "download"


class ActivityLog(Base):
    """Detailed activity/audit log for all actions"""
    __tablename__ = "activity_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id"), nullable=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    employee_id = Column(String(36), ForeignKey("employees.id"), nullable=True)
    
    # Action details
    action = Column(Enum(AuditAction), nullable=False, index=True)
    module = Column(String(50), nullable=False, index=True)  # employees, leave, payroll, etc.
    entity_type = Column(String(100), nullable=True)  # Model name
    entity_id = Column(String(36), nullable=True, index=True)
    
    # Description
    description = Column(Text, nullable=True)
    
    # Changes (for update actions)
    old_values = Column(JSONB, nullable=True)
    new_values = Column(JSONB, nullable=True)
    changed_fields = Column(JSONB, nullable=True)  # List of changed field names
    
    # Request context
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(Text, nullable=True)
    request_method = Column(String(10), nullable=True)
    request_path = Column(String(500), nullable=True)
    
    # Status
    is_success = Column(Boolean, default=True)
    error_message = Column(Text, nullable=True)
    
    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class DataExportLog(Base):
    """Track all data exports for compliance"""
    __tablename__ = "data_export_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    
    # Export details
    export_type = Column(String(100), nullable=False)  # report_name or export_type
    format = Column(String(20), nullable=False)  # csv, xlsx, pdf
    
    # Filters/parameters used
    parameters = Column(JSONB, nullable=True)
    
    # Record count
    record_count = Column(Integer, nullable=True)
    
    # File info
    file_name = Column(String(300), nullable=True)
    file_size = Column(Integer, nullable=True)
    
    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class LoginHistory(Base):
    """Track login attempts and sessions"""
    __tablename__ = "login_history"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    email = Column(String(255), nullable=False)  # Store even for failed attempts
    
    # Status
    is_success = Column(Boolean, default=False)
    failure_reason = Column(String(100), nullable=True)  # invalid_password, account_locked, etc.
    
    # Context
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(Text, nullable=True)
    device_type = Column(String(50), nullable=True)  # desktop, mobile, tablet
    browser = Column(String(100), nullable=True)
    os = Column(String(100), nullable=True)
    location = Column(String(200), nullable=True)  # Geo-location if available
    
    # Session info
    session_id = Column(String(36), nullable=True)
    
    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class PermissionChangeLog(Base):
    """Track all permission/role changes"""
    __tablename__ = "permission_change_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    changed_by_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    
    # What changed
    change_type = Column(String(50), nullable=False)  # role_created, permission_updated, role_assigned
    
    # Target
    target_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    target_role_id = Column(String(36), ForeignKey("roles.id"), nullable=True)
    
    # Change details
    old_values = Column(JSONB, nullable=True)
    new_values = Column(JSONB, nullable=True)
    
    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
