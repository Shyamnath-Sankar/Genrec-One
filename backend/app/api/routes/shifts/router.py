"""
Shift & Roster Management API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from typing import Optional, List
from datetime import datetime, date, timedelta
from pydantic import BaseModel
import uuid

from app.core.database import get_db
from app.core.security import get_current_employee
from app.models.employee import Employee
from app.models.shift import Shift, ShiftAssignment, ShiftPattern
from app.models.attendance import ApprovalStatus
from app.schemas.auth import DataResponse, PaginatedResponse

router = APIRouter(prefix="/shifts", tags=["Shifts"])


# ==================== SCHEMAS ====================

class ShiftCreate(BaseModel):
    name: str
    code: str
    start_time: str  # HH:MM format
    end_time: str
    grace_minutes: int = 15
    half_day_hours: float = 4.0
    full_day_hours: float = 8.0
    break_duration: int = 60
    is_night_shift: bool = False
    is_flexible: bool = False
    timezone: str = "UTC"


class ShiftAssignmentCreate(BaseModel):
    employee_id: str
    shift_id: str
    effective_from: date
    effective_to: Optional[date] = None
    is_default: bool = True


class ShiftChangeRequest(BaseModel):
    requested_shift_id: str
    effective_date: date
    reason: str


class RosterEntry(BaseModel):
    employee_id: str
    shift_id: str
    date: date


class BulkRosterCreate(BaseModel):
    entries: List[RosterEntry]


# ==================== SHIFTS ====================

@router.get("/", response_model=DataResponse)
async def get_shifts(
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get all shifts"""
    result = await db.execute(
        select(Shift).where(
            Shift.is_active == True
        ).order_by(Shift.name)
    )
    shifts = result.scalars().all()
    
    data = [
        {
            "id": s.id,
            "name": s.name,
            "code": s.code,
            "start_time": s.start_time,  # Already a string "HH:MM"
            "end_time": s.end_time,      # Already a string "HH:MM"
            "grace_minutes": s.grace_minutes,
            "half_day_hours": float(s.half_day_hours) if s.half_day_hours else None,
            "full_day_hours": float(s.full_day_hours) if s.full_day_hours else None,
            "break_duration": s.break_duration,
            "is_night_shift": s.is_night_shift,
            "is_flexible": s.is_flexible,
            "timezone": s.timezone,
            "is_active": s.is_active,
        }
        for s in shifts
    ]
    
    return DataResponse(data=data)


@router.post("/", response_model=DataResponse)
async def create_shift(
    data: ShiftCreate,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Create a new shift"""
    shift = Shift(
        id=str(uuid.uuid4()),
        name=data.name,
        code=data.code,
        start_time=data.start_time,  # Store as string "HH:MM"
        end_time=data.end_time,      # Store as string "HH:MM"
        grace_minutes=data.grace_minutes,
        half_day_hours=str(data.half_day_hours),
        full_day_hours=str(data.full_day_hours),
        break_duration=data.break_duration,
        is_night_shift=data.is_night_shift,
        is_flexible=data.is_flexible,
        timezone=data.timezone,
        is_active=True,
    )
    db.add(shift)
    await db.commit()
    
    return DataResponse(
        message="Shift created successfully",
        data={"id": shift.id}
    )


@router.put("/{shift_id}", response_model=DataResponse)
async def update_shift(
    shift_id: str,
    data: ShiftCreate,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Update a shift"""
    result = await db.execute(
        select(Shift).where(Shift.id == shift_id)
    )
    shift = result.scalar_one_or_none()
    
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    shift.name = data.name
    shift.code = data.code
    shift.start_time = data.start_time  # Store as string "HH:MM"
    shift.end_time = data.end_time      # Store as string "HH:MM"
    shift.grace_minutes = data.grace_minutes
    shift.half_day_hours = str(data.half_day_hours)
    shift.full_day_hours = str(data.full_day_hours)
    shift.break_duration = data.break_duration
    shift.is_night_shift = data.is_night_shift
    shift.is_flexible = data.is_flexible
    shift.timezone = data.timezone
    
    await db.commit()
    
    return DataResponse(message="Shift updated successfully")


@router.delete("/{shift_id}", response_model=DataResponse)
async def delete_shift(
    shift_id: str,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Soft delete a shift"""
    result = await db.execute(
        select(Shift).where(Shift.id == shift_id)
    )
    shift = result.scalar_one_or_none()
    
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    shift.is_active = False
    await db.commit()
    
    return DataResponse(message="Shift deleted successfully")


# ==================== SHIFT ASSIGNMENTS ====================

@router.get("/assignments", response_model=DataResponse)
async def get_shift_assignments(
    employee_id: Optional[str] = None,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get shift assignments"""
    query = select(ShiftAssignment).options(
        selectinload(ShiftAssignment.shift),
        selectinload(ShiftAssignment.employee)
    )
    
    if employee_id:
        query = query.where(ShiftAssignment.employee_id == employee_id)
    else:
        query = query.join(Employee).where(
            Employee.company_id == current_employee.company_id
        )
    
    query = query.order_by(ShiftAssignment.effective_from.desc())
    
    result = await db.execute(query)
    assignments = result.scalars().all()
    
    data = [
        {
            "id": a.id,
            "employee_id": a.employee_id,
            "employee_name": f"{a.employee.first_name} {a.employee.last_name}" if a.employee else None,
            "shift_id": a.shift_id,
            "shift_name": a.shift.name if a.shift else None,
            "effective_from": a.effective_from.isoformat() if a.effective_from else None,
            "effective_to": a.effective_to.isoformat() if a.effective_to else None,
            "is_default": a.is_default,
        }
        for a in assignments
    ]
    
    return DataResponse(data=data)


@router.post("/assignments", response_model=DataResponse)
async def create_shift_assignment(
    data: ShiftAssignmentCreate,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Assign a shift to an employee"""
    # If this is default, unset other defaults
    if data.is_default:
        existing = await db.execute(
            select(ShiftAssignment).where(
                ShiftAssignment.employee_id == data.employee_id,
                ShiftAssignment.is_default == True
            )
        )
        for assignment in existing.scalars().all():
            assignment.is_default = False
    
    assignment = ShiftAssignment(
        id=str(uuid.uuid4()),
        employee_id=data.employee_id,
        shift_id=data.shift_id,
        effective_from=data.effective_from,
        effective_to=data.effective_to,
        is_default=data.is_default,
    )
    db.add(assignment)
    await db.commit()
    
    return DataResponse(
        message="Shift assigned successfully",
        data={"id": assignment.id}
    )


@router.get("/my-shift", response_model=DataResponse)
async def get_my_current_shift(
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get current employee's active shift"""
    today = date.today()
    
    result = await db.execute(
        select(ShiftAssignment).where(
            ShiftAssignment.employee_id == current_employee.id,
            ShiftAssignment.effective_from <= today,
            or_(
                ShiftAssignment.effective_to.is_(None),
                ShiftAssignment.effective_to >= today
            )
        ).options(selectinload(ShiftAssignment.shift))
        .order_by(ShiftAssignment.is_default.desc(), ShiftAssignment.effective_from.desc())
    )
    assignment = result.scalars().first()
    
    if not assignment:
        return DataResponse(data=None, message="No shift assigned")
    
    shift = assignment.shift
    
    return DataResponse(data={
        "assignment_id": assignment.id,
        "shift": {
            "id": shift.id,
            "name": shift.name,
            "code": shift.code,
            "start_time": shift.start_time,  # Already a string "HH:MM"
            "end_time": shift.end_time,      # Already a string "HH:MM"
            "is_night_shift": shift.is_night_shift,
            "is_flexible": shift.is_flexible,
        },
        "effective_from": assignment.effective_from.isoformat() if assignment.effective_from else None,
        "effective_to": assignment.effective_to.isoformat() if assignment.effective_to else None,
    })


# ==================== ROSTER MANAGEMENT ====================

@router.get("/roster", response_model=DataResponse)
async def get_roster(
    start_date: date = Query(...),
    end_date: date = Query(...),
    department_id: Optional[str] = None,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get shift roster for a date range"""
    company_id = current_employee.company_id
    
    # Get all employees
    emp_query = select(Employee).where(
        Employee.company_id == company_id,
        Employee.employment_status == "active"
    )
    if department_id:
        emp_query = emp_query.where(Employee.department_id == department_id)
    
    emp_result = await db.execute(emp_query)
    employees = emp_result.scalars().all()
    
    # Build roster
    roster = []
    
    for emp in employees:
        # Get shift assignments for this period
        assign_result = await db.execute(
            select(ShiftAssignment).where(
                ShiftAssignment.employee_id == emp.id,
                ShiftAssignment.effective_from <= end_date,
                or_(
                    ShiftAssignment.effective_to.is_(None),
                    ShiftAssignment.effective_to >= start_date
                )
            ).options(selectinload(ShiftAssignment.shift))
        )
        assignments = assign_result.scalars().all()
        
        # Build daily schedule
        daily_shifts = {}
        current = start_date
        while current <= end_date:
            # Find applicable assignment for this date
            applicable = None
            for a in assignments:
                if a.effective_from <= current:
                    if a.effective_to is None or a.effective_to >= current:
                        if applicable is None or a.effective_from > applicable.effective_from:
                            applicable = a
            
            if applicable:
                daily_shifts[current.isoformat()] = {
                    "shift_id": applicable.shift_id,
                    "shift_name": applicable.shift.name if applicable.shift else None,
                    "shift_code": applicable.shift.code if applicable.shift else None,
                }
            else:
                daily_shifts[current.isoformat()] = None
            
            current += timedelta(days=1)
        
        roster.append({
            "employee_id": emp.id,
            "employee_name": f"{emp.first_name} {emp.last_name}",
            "department": emp.department.name if emp.department else None,
            "daily_shifts": daily_shifts,
        })
    
    return DataResponse(data={
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "roster": roster,
    })


@router.post("/roster/bulk", response_model=DataResponse)
async def create_bulk_roster(
    data: BulkRosterCreate,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Create bulk roster entries"""
    created_count = 0
    
    for entry in data.entries:
        # Check if assignment already exists for this date
        existing = await db.execute(
            select(ShiftAssignment).where(
                ShiftAssignment.employee_id == entry.employee_id,
                ShiftAssignment.effective_from == entry.date,
                ShiftAssignment.effective_to == entry.date
            )
        )
        
        if existing.scalar_one_or_none():
            # Update existing
            existing_assignment = existing.scalar_one_or_none()
            if existing_assignment:
                existing_assignment.shift_id = entry.shift_id
        else:
            # Create new single-day assignment
            assignment = ShiftAssignment(
                id=str(uuid.uuid4()),
                employee_id=entry.employee_id,
                shift_id=entry.shift_id,
                effective_from=entry.date,
                effective_to=entry.date,
                is_default=False,
            )
            db.add(assignment)
            created_count += 1
    
    await db.commit()
    
    return DataResponse(
        message=f"Roster updated successfully. {created_count} new entries created.",
        data={"created": created_count}
    )


# ==================== SHIFT PATTERNS ====================

@router.get("/patterns", response_model=DataResponse)
async def get_shift_patterns(
    shift_id: str,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get shift patterns (weekly schedule)"""
    result = await db.execute(
        select(ShiftPattern).where(
            ShiftPattern.shift_id == shift_id
        ).order_by(ShiftPattern.day_of_week)
    )
    patterns = result.scalars().all()
    
    data = [
        {
            "id": p.id,
            "day_of_week": p.day_of_week,  # 0=Monday, 6=Sunday
            "is_workday": p.is_workday,
        }
        for p in patterns
    ]
    
    return DataResponse(data=data)


@router.post("/patterns", response_model=DataResponse)
async def create_shift_pattern(
    shift_id: str,
    day_of_week: int = Query(..., ge=0, le=6),
    is_workday: bool = True,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Create or update a shift pattern"""
    # Check if pattern exists
    existing = await db.execute(
        select(ShiftPattern).where(
            ShiftPattern.shift_id == shift_id,
            ShiftPattern.day_of_week == day_of_week
        )
    )
    pattern = existing.scalar_one_or_none()
    
    if pattern:
        pattern.is_workday = is_workday
    else:
        pattern = ShiftPattern(
            id=str(uuid.uuid4()),
            shift_id=shift_id,
            name=f"Day {day_of_week}",
            day_of_week=day_of_week,
            is_workday=is_workday,
        )
        db.add(pattern)
    
    await db.commit()
    
    return DataResponse(message="Shift pattern saved successfully")


# ==================== SHIFT CHANGE REQUESTS ====================

# Note: For shift change requests, we can use the workflow/approval system
# Here we provide helper endpoints

@router.get("/change-requests", response_model=DataResponse)
async def get_shift_change_requests(
    status: Optional[str] = None,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get shift change requests for reporting managers"""
    # This would integrate with the workflow system
    # For now, return a placeholder
    return DataResponse(
        data=[],
        message="Use /workflows/pending?module=shift_change for pending requests"
    )
