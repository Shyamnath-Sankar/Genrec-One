from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from typing import Optional
from datetime import datetime, date, timedelta
from decimal import Decimal
import uuid

from app.core.database import get_db
from app.core.security import get_current_employee
from app.models.employee import Employee
from app.models.attendance import Attendance, AttendanceStatus, AttendanceSource, AttendanceRegularization
from app.models.leave import LeaveApplication, LeaveType, LeaveBalance, Holiday
from app.schemas.attendance import (
    CheckInRequest,
    CheckOutRequest,
    AttendanceRegularizationRequest,
    AttendanceResponse,
    AttendanceSummary,
    LeaveTypeCreate,
    LeaveTypeResponse,
    LeaveApplicationCreate,
    LeaveApplicationResponse,
    LeaveBalanceResponse,
    HolidayCreate,
    HolidayResponse,
    ApprovalStatus,
)
from app.schemas.auth import DataResponse, PaginatedResponse

router = APIRouter(prefix="/attendance", tags=["Attendance"])


@router.post("/check-in", response_model=DataResponse)
async def check_in(
    data: CheckInRequest,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Mark attendance check-in"""
    today = date.today()
    
    # Check if already checked in today
    existing = await db.execute(
        select(Attendance)
        .where(Attendance.employee_id == current_employee.id)
        .where(Attendance.date == today)
    )
    attendance = existing.scalar_one_or_none()

    if attendance and attendance.check_in_time:
        raise HTTPException(
            status_code=400,
            detail="Already checked in today",
        )

    now = datetime.now()

    if attendance:
        # Update existing record
        attendance.check_in_time = now
        attendance.source = data.source
        attendance.ip_address = None  # Will be set from request
        attendance.latitude = Decimal(str(data.latitude)) if data.latitude else None
        attendance.longitude = Decimal(str(data.longitude)) if data.longitude else None
        attendance.device_info = data.device_info
        attendance.status = AttendanceStatus.PRESENT
    else:
        # Create new attendance record
        attendance = Attendance(
            id=str(uuid.uuid4()),
            employee_id=current_employee.id,
            date=today,
            check_in_time=now,
            status=AttendanceStatus.PRESENT,
            source=data.source,
            latitude=Decimal(str(data.latitude)) if data.latitude else None,
            longitude=Decimal(str(data.longitude)) if data.longitude else None,
            device_info=data.device_info,
        )
        db.add(attendance)

    await db.commit()

    return DataResponse(
        message=f"Checked in at {now.strftime('%I:%M %p')}",
        data={
            "check_in_time": now.isoformat(),
            "date": today.isoformat(),
        },
    )


@router.post("/check-out", response_model=DataResponse)
async def check_out(
    data: CheckOutRequest,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Mark attendance check-out"""
    today = date.today()
    
    # Get today's attendance
    result = await db.execute(
        select(Attendance)
        .where(Attendance.employee_id == current_employee.id)
        .where(Attendance.date == today)
    )
    attendance = result.scalar_one_or_none()

    if not attendance or not attendance.check_in_time:
        raise HTTPException(
            status_code=400,
            detail="Please check in first",
        )

    if attendance.check_out_time:
        raise HTTPException(
            status_code=400,
            detail="Already checked out today",
        )

    now = datetime.now()
    attendance.check_out_time = now
    attendance.remarks = data.remarks

    # Calculate total hours
    if attendance.check_in_time:
        delta = now - attendance.check_in_time
        total_hours = delta.total_seconds() / 3600
        attendance.total_hours = Decimal(str(round(total_hours, 2)))

        # Determine status based on hours
        if total_hours < 4:
            attendance.status = AttendanceStatus.HALF_DAY

    await db.commit()

    return DataResponse(
        message=f"Checked out at {now.strftime('%I:%M %p')}",
        data={
            "check_out_time": now.isoformat(),
            "total_hours": float(attendance.total_hours) if attendance.total_hours else 0,
        },
    )


@router.get("/today", response_model=DataResponse)
async def get_today_attendance(
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get today's attendance status"""
    today = date.today()
    
    result = await db.execute(
        select(Attendance)
        .where(Attendance.employee_id == current_employee.id)
        .where(Attendance.date == today)
    )
    attendance = result.scalar_one_or_none()

    if not attendance:
        return DataResponse(data={
            "date": today.isoformat(),
            "status": "NOT_MARKED",
            "check_in_time": None,
            "check_out_time": None,
            "total_hours": None,
        })

    return DataResponse(data={
        "id": attendance.id,
        "date": attendance.date.isoformat(),
        "status": attendance.status.value,
        "check_in_time": attendance.check_in_time.isoformat() if attendance.check_in_time else None,
        "check_out_time": attendance.check_out_time.isoformat() if attendance.check_out_time else None,
        "total_hours": float(attendance.total_hours) if attendance.total_hours else None,
        "source": attendance.source.value,
    })


@router.get("/history", response_model=PaginatedResponse)
async def get_attendance_history(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get attendance history"""
    query = (
        select(Attendance)
        .where(Attendance.employee_id == current_employee.id)
    )

    if start_date:
        query = query.where(Attendance.date >= start_date)
    if end_date:
        query = query.where(Attendance.date <= end_date)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Apply pagination
    query = query.order_by(Attendance.date.desc())
    query = query.offset((page - 1) * limit).limit(limit)

    result = await db.execute(query)
    records = result.scalars().all()

    data = [
        {
            "id": r.id,
            "date": r.date.isoformat(),
            "check_in_time": r.check_in_time.isoformat() if r.check_in_time else None,
            "check_out_time": r.check_out_time.isoformat() if r.check_out_time else None,
            "total_hours": float(r.total_hours) if r.total_hours else None,
            "status": r.status.value,
            "source": r.source.value,
            "is_regularized": r.is_regularized,
            "remarks": r.remarks,
        }
        for r in records
    ]

    return PaginatedResponse(
        data=data,
        total=total,
        page=page,
        limit=limit,
        total_pages=(total + limit - 1) // limit,
    )


@router.get("/summary", response_model=DataResponse)
async def get_attendance_summary(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020),
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get attendance summary for a month"""
    from calendar import monthrange
    
    start_date = date(year, month, 1)
    _, last_day = monthrange(year, month)
    end_date = date(year, month, last_day)

    result = await db.execute(
        select(Attendance)
        .where(Attendance.employee_id == current_employee.id)
        .where(Attendance.date >= start_date)
        .where(Attendance.date <= end_date)
    )
    records = result.scalars().all()

    # Calculate summary
    total_days = last_day
    present_days = sum(1 for r in records if r.status == AttendanceStatus.PRESENT)
    absent_days = sum(1 for r in records if r.status == AttendanceStatus.ABSENT)
    half_days = sum(1 for r in records if r.status == AttendanceStatus.HALF_DAY)
    leave_days = sum(1 for r in records if r.status == AttendanceStatus.ON_LEAVE)
    holidays = sum(1 for r in records if r.status == AttendanceStatus.HOLIDAY)
    week_offs = sum(1 for r in records if r.status == AttendanceStatus.WEEK_OFF)
    wfh_days = sum(1 for r in records if r.status == AttendanceStatus.WFH)
    late_days = sum(1 for r in records if r.status == AttendanceStatus.LATE)

    # Average hours
    hours_records = [float(r.total_hours) for r in records if r.total_hours]
    average_hours = sum(hours_records) / len(hours_records) if hours_records else 0

    return DataResponse(data={
        "month": month,
        "year": year,
        "total_days": total_days,
        "present_days": present_days,
        "absent_days": absent_days,
        "half_days": half_days,
        "leave_days": leave_days,
        "holidays": holidays,
        "week_offs": week_offs,
        "wfh_days": wfh_days,
        "late_days": late_days,
        "average_hours": round(average_hours, 2),
    })


@router.post("/regularization", response_model=DataResponse)
async def request_regularization(
    data: AttendanceRegularizationRequest,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Request attendance regularization"""
    regularization = AttendanceRegularization(
        id=str(uuid.uuid4()),
        employee_id=current_employee.id,
        date=data.date,
        check_in_time=data.check_in_time,
        check_out_time=data.check_out_time,
        reason=data.reason,
        status=ApprovalStatus.PENDING,
    )
    db.add(regularization)
    await db.commit()

    return DataResponse(
        message="Regularization request submitted",
        data={"id": regularization.id},
    )
