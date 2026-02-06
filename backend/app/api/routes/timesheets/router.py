from fastapi import APIRouter, Depends, HTTPException, Query
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
from app.models.project import Project, Task
from app.models.timesheet import Timesheet
from app.models.attendance import ApprovalStatus
from app.schemas.auth import DataResponse, PaginatedResponse
from pydantic import BaseModel, Field


class TimesheetEntryCreate(BaseModel):
    project_id: str
    task_id: Optional[str] = None
    date: date
    hours: float = Field(..., gt=0, le=24)
    is_billable: bool = True
    description: Optional[str] = None


router = APIRouter(prefix="/timesheets", tags=["Timesheets"])


@router.get("/projects", response_model=DataResponse)
async def get_projects(
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get all active projects"""
    result = await db.execute(
        select(Project)
        .options(selectinload(Project.tasks))
        .where(Project.company_id == current_employee.company_id)
        .where(Project.is_active == True)
        .order_by(Project.name)
    )
    projects = result.scalars().all()

    data = [
        {
            "id": p.id,
            "name": p.name,
            "code": p.code,
            "client_name": p.client_name,
            "status": p.status.value,
            "tasks": [
                {"id": t.id, "name": t.name, "is_billable": t.is_billable}
                for t in p.tasks if t.is_active
            ],
        }
        for p in projects
    ]

    return DataResponse(data=data)


@router.post("/entries", response_model=DataResponse)
async def create_timesheet_entry(
    data: TimesheetEntryCreate,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Create a timesheet entry"""
    entry = Timesheet(
        id=str(uuid.uuid4()),
        employee_id=current_employee.id,
        project_id=data.project_id,
        task_id=data.task_id,
        date=data.date,
        hours=Decimal(str(data.hours)),
        is_billable=data.is_billable,
        description=data.description,
        status=ApprovalStatus.PENDING,
    )
    db.add(entry)
    await db.commit()

    return DataResponse(
        message="Timesheet entry created",
        data={"id": entry.id},
    )


@router.get("/entries", response_model=PaginatedResponse)
async def get_timesheet_entries(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    project_id: Optional[str] = None,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get timesheet entries"""
    query = (
        select(Timesheet)
        .options(selectinload(Timesheet.project), selectinload(Timesheet.task))
        .where(Timesheet.employee_id == current_employee.id)
    )

    if start_date:
        query = query.where(Timesheet.date >= start_date)
    if end_date:
        query = query.where(Timesheet.date <= end_date)
    if project_id:
        query = query.where(Timesheet.project_id == project_id)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(Timesheet.date.desc())
    query = query.offset((page - 1) * limit).limit(limit)

    result = await db.execute(query)
    entries = result.scalars().all()

    data = [
        {
            "id": e.id,
            "project_id": e.project_id,
            "project_name": e.project.name if e.project else None,
            "task_id": e.task_id,
            "task_name": e.task.name if e.task else None,
            "date": e.date.isoformat(),
            "hours": float(e.hours),
            "is_billable": e.is_billable,
            "description": e.description,
            "status": e.status.value,
        }
        for e in entries
    ]

    return PaginatedResponse(
        data=data,
        total=total,
        page=page,
        limit=limit,
        total_pages=(total + limit - 1) // limit,
    )


@router.get("/summary", response_model=DataResponse)
async def get_timesheet_summary(
    start_date: date,
    end_date: date,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get timesheet summary for date range"""
    result = await db.execute(
        select(Timesheet)
        .options(selectinload(Timesheet.project))
        .where(Timesheet.employee_id == current_employee.id)
        .where(Timesheet.date >= start_date)
        .where(Timesheet.date <= end_date)
    )
    entries = result.scalars().all()

    total_hours = sum(float(e.hours) for e in entries)
    billable_hours = sum(float(e.hours) for e in entries if e.is_billable)
    non_billable_hours = total_hours - billable_hours

    # Group by project
    project_summary = {}
    for e in entries:
        proj_name = e.project.name if e.project else "Unknown"
        if proj_name not in project_summary:
            project_summary[proj_name] = 0
        project_summary[proj_name] += float(e.hours)

    return DataResponse(data={
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "total_hours": round(total_hours, 2),
        "billable_hours": round(billable_hours, 2),
        "non_billable_hours": round(non_billable_hours, 2),
        "by_project": project_summary,
    })
