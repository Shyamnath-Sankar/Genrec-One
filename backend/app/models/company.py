from sqlalchemy import Column, String, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.models.types import JSONB
from app.models.base import Base, TimestampMixin
import uuid


def generate_uuid():
    return str(uuid.uuid4())


class Company(Base, TimestampMixin):
    __tablename__ = "companies"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    logo = Column(String(500), nullable=True)
    address = Column(Text, nullable=True)
    industry = Column(String(100), nullable=True)
    registration_no = Column(String(100), nullable=True)
    tax_id = Column(String(100), nullable=True)
    parent_company_id = Column(String(36), ForeignKey("companies.id"), nullable=True)
    settings = Column(JSONB, nullable=True)

    # Relationships
    parent_company = relationship("Company", remote_side=[id], backref="subsidiaries")
    departments = relationship("Department", back_populates="company")
    employees = relationship("Employee", back_populates="company")
    policies = relationship("Policy", back_populates="company")
    jobs = relationship("Job", back_populates="company")
    projects = relationship("Project", back_populates="company")
    assets = relationship("Asset", back_populates="company")
    announcements = relationship("Announcement", back_populates="company")


class Department(Base, TimestampMixin):
    __tablename__ = "departments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id"), nullable=False)
    name = Column(String(100), nullable=False)
    code = Column(String(20), nullable=True)
    description = Column(Text, nullable=True)
    parent_id = Column(String(36), ForeignKey("departments.id"), nullable=True)
    head_id = Column(String(36), nullable=True)  # Employee ID
    is_active = Column(Boolean, default=True)

    # Relationships
    company = relationship("Company", back_populates="departments")
    parent = relationship("Department", remote_side=[id], backref="children")
    employees = relationship("Employee", back_populates="department")
    designations = relationship("Designation", back_populates="department")


class Designation(Base, TimestampMixin):
    __tablename__ = "designations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    department_id = Column(String(36), ForeignKey("departments.id"), nullable=True)
    name = Column(String(100), nullable=False)
    code = Column(String(20), nullable=True)
    level = Column(String(10), default="1")
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)

    # Relationships
    department = relationship("Department", back_populates="designations")
    employees = relationship("Employee", back_populates="designation")
