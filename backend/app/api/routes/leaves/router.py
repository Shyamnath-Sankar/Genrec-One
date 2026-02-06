from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from typing import Optional
from datetime import datetime, date
from decimal import Decimal
import uuid

from app.core.database import get_db
from app.core.security import get_current_employee
from app.models.employee import Employee
from app.models.leave import LeaveType, LeaveApplication, LeaveBalance, Holiday
from app.models.attendance import ApprovalStatus
from app.schemas.attendance import (
    LeaveTypeCreate,
    LeaveTypeResponse,
    LeaveApplicationCreate,
    LeaveApplicationResponse,
    LeaveBalanceResponse,
    HolidayCreate,
    HolidayResponse,
)
from app.schemas.auth import DataResponse, PaginatedResponse

router = APIRouter(prefix="/leaves", tags=["Leaves"])


@router.get("/types", response_model=DataResponse)
async def get_leave_types(
    db: AsyncSession = Depends(get_db),
):
    """Get all leave types"""
    result = await db.execute(
        select(LeaveType)
        .where(LeaveType.is_active == True)
        .order_by(LeaveType.name)
    )
    leave_types = result.scalars().all()

    data = [
        {
            "id": lt.id,
            "name": lt.name,
            "code": lt.code,
            "description": lt.description,
            "color": lt.color,
            "annual_quota": float(lt.annual_quota),
            "accrual_type": lt.accrual_type.value,
            "carry_forward_limit": float(lt.carry_forward_limit) if lt.carry_forward_limit else None,
            "encashment_allowed": lt.encashment_allowed,
            "is_paid_leave": lt.is_paid_leave,
            "requires_document": lt.requires_document,
            "min_days": float(lt.min_days),
            "max_days": float(lt.max_days) if lt.max_days else None,
            "advance_notice_days": lt.advance_notice_days,
        }
        for lt in leave_types
    ]

    return DataResponse(data=data)


@router.post("/types", response_model=DataResponse)
async def create_leave_type(
    data: LeaveTypeCreate,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Create a new leave type"""
    leave_type = LeaveType(
        id=str(uuid.uuid4()),
        name=data.name,
        code=data.code,
        description=data.description,
        color=data.color,
        annual_quota=Decimal(str(data.annual_quota)),
        accrual_type=data.accrual_type,
        carry_forward_limit=Decimal(str(data.carry_forward_limit)) if data.carry_forward_limit else None,
        encashment_allowed=data.encashment_allowed,
        is_paid_leave=data.is_paid_leave,
        requires_document=data.requires_document,
        min_days=Decimal(str(data.min_days)),
        max_days=Decimal(str(data.max_days)) if data.max_days else None,
        advance_notice_days=data.advance_notice_days,
    )
    db.add(leave_type)
    await db.commit()

    return DataResponse(
        message="Leave type created successfully",
        data={"id": leave_type.id},
    )


@router.get("/balance", response_model=DataResponse)
async def get_leave_balance(
    year: int = Query(default=None),
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get leave balance for current employee"""
    if not year:
        year = date.today().year

    result = await db.execute(
        select(LeaveBalance)
        .options(selectinload(LeaveBalance.leave_type))
        .where(LeaveBalance.employee_id == current_employee.id)
        .where(LeaveBalance.year == year)
    )
    balances = result.scalars().all()

    data = [
        {
            "leave_type_id": b.leave_type_id,
            "leave_type_name": b.leave_type.name,
            "leave_type_code": b.leave_type.code,
            "color": b.leave_type.color,
            "year": b.year,
            "opening_balance": float(b.opening_balance),
            "accrued": float(b.accrued),
            "utilized": float(b.utilized),
            "encashed": float(b.encashed),
            "lapsed": float(b.lapsed),
            "adjustment": float(b.adjustment),
            "current_balance": float(b.current_balance),
        }
        for b in balances
    ]

    return DataResponse(data=data)


@router.post("/apply", response_model=DataResponse)
async def apply_leave(
    data: LeaveApplicationCreate,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Apply for leave"""
    # Get leave type
    lt_result = await db.execute(
        select(LeaveType).where(LeaveType.id == data.leave_type_id)
    )
    leave_type = lt_result.scalar_one_or_none()
    if not leave_type:
        raise HTTPException(status_code=404, detail="Leave type not found")

    # Calculate total days
    if data.is_half_day:
        total_days = 0.5
    else:
        delta = data.to_date - data.from_date
        total_days = delta.days + 1

    # Check balance
    year = data.from_date.year
    balance_result = await db.execute(
        select(LeaveBalance)
        .where(LeaveBalance.employee_id == current_employee.id)
        .where(LeaveBalance.leave_type_id == data.leave_type_id)
        .where(LeaveBalance.year == year)
    )
    balance = balance_result.scalar_one_or_none()

    if balance and float(balance.current_balance) < total_days:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient leave balance. Available: {balance.current_balance}",
        )

    # Create application
    application = LeaveApplication(
        id=str(uuid.uuid4()),
        employee_id=current_employee.id,
        leave_type_id=data.leave_type_id,
        from_date=data.from_date,
        to_date=data.to_date,
        total_days=Decimal(str(total_days)),
        is_half_day=data.is_half_day,
        half_day_type=data.half_day_type,
        reason=data.reason,
        status=ApprovalStatus.PENDING,
    )
    db.add(application)
    await db.commit()

    return DataResponse(
        message="Leave application submitted",
        data={"id": application.id, "total_days": total_days},
    )


@router.get("/applications", response_model=PaginatedResponse)
async def get_leave_applications(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    status: Optional[str] = None,
    year: Optional[int] = None,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get leave applications"""
    query = (
        select(LeaveApplication)
        .options(selectinload(LeaveApplication.leave_type))
        .where(LeaveApplication.employee_id == current_employee.id)
    )

    if status:
        query = query.where(LeaveApplication.status == status)
    
    if year:
        query = query.where(func.extract('year', LeaveApplication.from_date) == year)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Paginate
    query = query.order_by(LeaveApplication.created_at.desc())
    query = query.offset((page - 1) * limit).limit(limit)

    result = await db.execute(query)
    applications = result.scalars().all()

    data = [
        {
            "id": app.id,
            "leave_type_id": app.leave_type_id,
            "leave_type_name": app.leave_type.name,
            "from_date": app.from_date.isoformat(),
            "to_date": app.to_date.isoformat(),
            "total_days": float(app.total_days),
            "is_half_day": app.is_half_day,
            "half_day_type": app.half_day_type.value if app.half_day_type else None,
            "reason": app.reason,
            "status": app.status.value,
            "approver_remarks": app.approver_remarks,
            "approved_at": app.approved_at.isoformat() if app.approved_at else None,
            "created_at": app.created_at.isoformat(),
        }
        for app in applications
    ]

    return PaginatedResponse(
        data=data,
        total=total,
        page=page,
        limit=limit,
        total_pages=(total + limit - 1) // limit,
    )


@router.post("/applications/{application_id}/cancel", response_model=DataResponse)
async def cancel_leave_application(
    application_id: str,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Cancel a leave application"""
    result = await db.execute(
        select(LeaveApplication)
        .where(LeaveApplication.id == application_id)
        .where(LeaveApplication.employee_id == current_employee.id)
    )
    application = result.scalar_one_or_none()

    if not application:
        raise HTTPException(status_code=404, detail="Leave application not found")

    if application.status == ApprovalStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Application already cancelled")

    if application.from_date <= date.today():
        raise HTTPException(status_code=400, detail="Cannot cancel past or ongoing leave")

    application.status = ApprovalStatus.CANCELLED
    application.cancelled_at = datetime.utcnow()
    await db.commit()

    return DataResponse(message="Leave application cancelled")


@router.get("/holidays", response_model=DataResponse)
async def get_holidays(
    year: int = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    """Get holidays list"""
    if not year:
        year = date.today().year

    result = await db.execute(
        select(Holiday)
        .where(func.extract('year', Holiday.date) == year)
        .order_by(Holiday.date)
    )
    holidays = result.scalars().all()

    data = [
        {
            "id": h.id,
            "name": h.name,
            "date": h.date.isoformat(),
            "type": h.type.value,
            "is_optional": h.is_optional,
            "description": h.description,
        }
        for h in holidays
    ]

    return DataResponse(data=data)


@router.post("/holidays", response_model=DataResponse)
async def create_holiday(
    data: HolidayCreate,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Create a holiday"""
    holiday = Holiday(
        id=str(uuid.uuid4()),
        name=data.name,
        date=data.date,
        type=data.type,
        is_optional=data.is_optional,
        description=data.description,
        created_at=datetime.utcnow(),
    )
    db.add(holiday)
    await db.commit()

    return DataResponse(
        message="Holiday created successfully",
        data={"id": holiday.id},
    )
