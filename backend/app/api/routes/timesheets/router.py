from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal
import uuid

from app.core.database import get_db
from app.core.security import get_current_employee
from app.models.employee import Employee
from app.models.project import Project, Task, ProjectStatus
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


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    code: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None
    client_name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget_hours: Optional[float] = None
    budget_amount: Optional[float] = None
    hourly_rate: Optional[float] = None
    manager_id: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    client_name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget_hours: Optional[float] = None
    budget_amount: Optional[float] = None
    hourly_rate: Optional[float] = None
    status: Optional[str] = None
    manager_id: Optional[str] = None


class TaskCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    is_billable: bool = True


class ProjectMemberAdd(BaseModel):
    employee_ids: List[str]


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


# ============================================
# PROJECT MANAGEMENT ENDPOINTS
# ============================================

@router.post("/projects", response_model=DataResponse)
async def create_project(
    data: ProjectCreate,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Create a new project"""
    # Check if code already exists
    existing = await db.execute(
        select(Project).where(Project.code == data.code)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Project code already exists")
    
    project = Project(
        id=str(uuid.uuid4()),
        company_id=current_employee.company_id,
        name=data.name,
        code=data.code,
        description=data.description,
        client_name=data.client_name,
        start_date=data.start_date,
        end_date=data.end_date,
        budget_hours=Decimal(str(data.budget_hours)) if data.budget_hours else None,
        budget_amount=Decimal(str(data.budget_amount)) if data.budget_amount else None,
        hourly_rate=Decimal(str(data.hourly_rate)) if data.hourly_rate else None,
        manager_id=data.manager_id,
        status=ProjectStatus.ACTIVE,
        is_active=True,
    )
    db.add(project)
    await db.commit()
    
    return DataResponse(
        message="Project created successfully",
        data={"id": project.id, "code": project.code},
    )


@router.get("/projects/{project_id}", response_model=DataResponse)
async def get_project(
    project_id: str,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get project details"""
    result = await db.execute(
        select(Project)
        .options(selectinload(Project.tasks))
        .where(Project.id == project_id)
        .where(Project.company_id == current_employee.company_id)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return DataResponse(data={
        "id": project.id,
        "name": project.name,
        "code": project.code,
        "description": project.description,
        "client_name": project.client_name,
        "start_date": project.start_date.isoformat() if project.start_date else None,
        "end_date": project.end_date.isoformat() if project.end_date else None,
        "budget_hours": float(project.budget_hours) if project.budget_hours else None,
        "budget_amount": float(project.budget_amount) if project.budget_amount else None,
        "hourly_rate": float(project.hourly_rate) if project.hourly_rate else None,
        "status": project.status.value,
        "manager_id": project.manager_id,
        "is_active": project.is_active,
        "tasks": [
            {"id": t.id, "name": t.name, "is_billable": t.is_billable, "is_active": t.is_active}
            for t in project.tasks
        ],
    })


@router.put("/projects/{project_id}", response_model=DataResponse)
async def update_project(
    project_id: str,
    data: ProjectUpdate,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Update a project"""
    result = await db.execute(
        select(Project)
        .where(Project.id == project_id)
        .where(Project.company_id == current_employee.company_id)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if data.name is not None:
        project.name = data.name
    if data.description is not None:
        project.description = data.description
    if data.client_name is not None:
        project.client_name = data.client_name
    if data.start_date is not None:
        project.start_date = data.start_date
    if data.end_date is not None:
        project.end_date = data.end_date
    if data.budget_hours is not None:
        project.budget_hours = Decimal(str(data.budget_hours))
    if data.budget_amount is not None:
        project.budget_amount = Decimal(str(data.budget_amount))
    if data.hourly_rate is not None:
        project.hourly_rate = Decimal(str(data.hourly_rate))
    if data.status is not None:
        project.status = ProjectStatus(data.status)
    if data.manager_id is not None:
        project.manager_id = data.manager_id
    
    await db.commit()
    
    return DataResponse(message="Project updated successfully")


@router.delete("/projects/{project_id}", response_model=DataResponse)
async def delete_project(
    project_id: str,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Soft delete a project (mark as inactive)"""
    result = await db.execute(
        select(Project)
        .where(Project.id == project_id)
        .where(Project.company_id == current_employee.company_id)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project.is_active = False
    project.status = ProjectStatus.CANCELLED
    await db.commit()
    
    return DataResponse(message="Project deleted successfully")


# ============================================
# TASK MANAGEMENT ENDPOINTS
# ============================================

@router.post("/projects/{project_id}/tasks", response_model=DataResponse)
async def create_task(
    project_id: str,
    data: TaskCreate,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Create a task for a project"""
    result = await db.execute(
        select(Project)
        .where(Project.id == project_id)
        .where(Project.company_id == current_employee.company_id)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    task = Task(
        id=str(uuid.uuid4()),
        project_id=project_id,
        name=data.name,
        description=data.description,
        is_billable=data.is_billable,
        is_active=True,
        created_at=date.today(),
    )
    db.add(task)
    await db.commit()
    
    return DataResponse(
        message="Task created successfully",
        data={"id": task.id},
    )


@router.delete("/projects/{project_id}/tasks/{task_id}", response_model=DataResponse)
async def delete_task(
    project_id: str,
    task_id: str,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Soft delete a task"""
    result = await db.execute(
        select(Task)
        .where(Task.id == task_id)
        .where(Task.project_id == project_id)
    )
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task.is_active = False
    await db.commit()
    
    return DataResponse(message="Task deleted successfully")
