from sqlalchemy import Column, String, Boolean, Date, DateTime, Integer, ForeignKey, Text, Enum
from app.models.types import ARRAY
from app.models.base import Base, TimestampMixin
from sqlalchemy.orm import relationship
import uuid
import enum


def generate_uuid():
    return str(uuid.uuid4())


class DocumentCategory(str, enum.Enum):
    PERSONAL = "PERSONAL"
    EMPLOYMENT = "EMPLOYMENT"
    POLICY = "POLICY"
    TEMPLATE = "TEMPLATE"
    TAX = "TAX"
    CERTIFICATE = "CERTIFICATE"
    CONTRACT = "CONTRACT"
    OTHER = "OTHER"


class Document(Base, TimestampMixin):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id"), nullable=True)
    employee_id = Column(String(36), ForeignKey("employees.id"), nullable=True, index=True)
    category = Column(Enum(DocumentCategory), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=False)
    file_size = Column(Integer, nullable=False)
    version = Column(Integer, default=1)
    parent_id = Column(String(36), nullable=True)  # For versioning
    is_template = Column(Boolean, default=False)
    expiry_date = Column(Date, nullable=True)
    is_acknowledged = Column(Boolean, default=False)
    acknowledged_at = Column(DateTime, nullable=True)
    tags = Column(ARRAY(String), nullable=True)

    # Relationships
    employee = relationship("Employee", back_populates="documents")
