from sqlalchemy import Column, String, Boolean, Date, DateTime, Numeric, Integer, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from app.models.base import Base, TimestampMixin
from app.models.attendance import ApprovalStatus
import uuid


def generate_uuid():
    return str(uuid.uuid4())


class ExpenseCategory(Base):
    __tablename__ = "expense_categories"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    max_amount = Column(Numeric(10, 2), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, nullable=False)

    # Relationships
    expenses = relationship("Expense", back_populates="category")


class Expense(Base, TimestampMixin):
    __tablename__ = "expenses"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    employee_id = Column(String(36), ForeignKey("employees.id"), nullable=False, index=True)
    category_id = Column(String(36), ForeignKey("expense_categories.id"), nullable=False)
    date = Column(Date, nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(10), default="INR")
    description = Column(Text, nullable=False)
    receipt_path = Column(String(500), nullable=True)
    status = Column(Enum(ApprovalStatus), default=ApprovalStatus.PENDING, index=True)
    approver_id = Column(String(36), nullable=True)
    approver_remarks = Column(Text, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    is_reimbursed = Column(Boolean, default=False)
    reimbursed_at = Column(DateTime, nullable=True)
    payroll_month = Column(Integer, nullable=True)
    payroll_year = Column(Integer, nullable=True)

    # Relationships
    employee = relationship("Employee", back_populates="expenses")
    category = relationship("ExpenseCategory", back_populates="expenses")
