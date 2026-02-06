from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional
from datetime import datetime, date
from decimal import Decimal
import uuid

from app.core.database import get_db
from app.core.security import get_current_employee
from app.models.employee import Employee
from app.models.expense import ExpenseCategory, Expense
from app.models.attendance import ApprovalStatus
from app.schemas.auth import DataResponse, PaginatedResponse
from pydantic import BaseModel, Field


class ExpenseCreate(BaseModel):
    category_id: str
    date: date
    amount: float = Field(..., gt=0)
    currency: str = "INR"
    description: str = Field(..., min_length=1)


router = APIRouter(prefix="/expenses", tags=["Expenses"])


@router.get("/categories", response_model=DataResponse)
async def get_expense_categories(
    db: AsyncSession = Depends(get_db),
):
    """Get expense categories"""
    result = await db.execute(
        select(ExpenseCategory)
        .where(ExpenseCategory.is_active == True)
        .order_by(ExpenseCategory.name)
    )
    categories = result.scalars().all()

    data = [
        {
            "id": c.id,
            "name": c.name,
            "code": c.code,
            "description": c.description,
            "max_amount": float(c.max_amount) if c.max_amount else None,
        }
        for c in categories
    ]

    return DataResponse(data=data)


@router.post("", response_model=DataResponse)
async def submit_expense(
    data: ExpenseCreate,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Submit an expense claim"""
    expense = Expense(
        id=str(uuid.uuid4()),
        employee_id=current_employee.id,
        category_id=data.category_id,
        date=data.date,
        amount=Decimal(str(data.amount)),
        currency=data.currency,
        description=data.description,
        status=ApprovalStatus.PENDING,
    )
    db.add(expense)
    await db.commit()

    return DataResponse(
        message="Expense claim submitted",
        data={"id": expense.id},
    )


@router.get("", response_model=PaginatedResponse)
async def get_my_expenses(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    status: Optional[str] = None,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get my expense claims"""
    query = (
        select(Expense)
        .options(selectinload(Expense.category))
        .where(Expense.employee_id == current_employee.id)
    )

    if status:
        query = query.where(Expense.status == status)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(Expense.created_at.desc())
    query = query.offset((page - 1) * limit).limit(limit)

    result = await db.execute(query)
    expenses = result.scalars().all()

    data = [
        {
            "id": e.id,
            "category_id": e.category_id,
            "category_name": e.category.name if e.category else None,
            "date": e.date.isoformat(),
            "amount": float(e.amount),
            "currency": e.currency,
            "description": e.description,
            "receipt_path": e.receipt_path,
            "status": e.status.value,
            "approver_remarks": e.approver_remarks,
            "approved_at": e.approved_at.isoformat() if e.approved_at else None,
            "is_reimbursed": e.is_reimbursed,
            "created_at": e.created_at.isoformat(),
        }
        for e in expenses
    ]

    return PaginatedResponse(
        data=data,
        total=total,
        page=page,
        limit=limit,
        total_pages=(total + limit - 1) // limit,
    )


@router.get("/summary", response_model=DataResponse)
async def get_expense_summary(
    year: int = Query(default=None),
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get expense summary"""
    if not year:
        year = date.today().year

    result = await db.execute(
        select(Expense)
        .where(Expense.employee_id == current_employee.id)
        .where(func.extract('year', Expense.date) == year)
    )
    expenses = result.scalars().all()

    total = sum(float(e.amount) for e in expenses)
    approved = sum(float(e.amount) for e in expenses if e.status == ApprovalStatus.APPROVED)
    pending = sum(float(e.amount) for e in expenses if e.status == ApprovalStatus.PENDING)
    rejected = sum(float(e.amount) for e in expenses if e.status == ApprovalStatus.REJECTED)
    reimbursed = sum(float(e.amount) for e in expenses if e.is_reimbursed)

    return DataResponse(data={
        "year": year,
        "total": round(total, 2),
        "approved": round(approved, 2),
        "pending": round(pending, 2),
        "rejected": round(rejected, 2),
        "reimbursed": round(reimbursed, 2),
        "count": len(expenses),
    })
