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
from app.models.performance import AppraisalCycle, Goal, Appraisal, Feedback, GoalStatus, GoalCategory
from app.schemas.auth import DataResponse, PaginatedResponse
from pydantic import BaseModel, Field


class GoalCreate(BaseModel):
    title: str = Field(..., min_length=1)
    description: Optional[str] = None
    category: str = "INDIVIDUAL"
    weightage: float = 0
    target_value: Optional[float] = None
    unit: Optional[str] = None
    start_date: date
    due_date: date
    cycle_id: Optional[str] = None


class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    progress: Optional[int] = None
    achieved_value: Optional[float] = None
    status: Optional[str] = None
    self_rating: Optional[int] = None
    comments: Optional[str] = None


class FeedbackCreate(BaseModel):
    receiver_id: str
    type: str = "CONTINUOUS"
    is_anonymous: bool = False
    ratings: Optional[dict] = None
    comments: str


router = APIRouter(prefix="/performance", tags=["Performance"])


@router.get("/goals", response_model=DataResponse)
async def get_my_goals(
    year: Optional[int] = None,
    status: Optional[str] = None,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get employee's goals"""
    query = (
        select(Goal)
        .where(Goal.employee_id == current_employee.id)
    )

    if year:
        query = query.where(func.extract('year', Goal.start_date) == year)
    if status:
        query = query.where(Goal.status == status)

    query = query.order_by(Goal.due_date)

    result = await db.execute(query)
    goals = result.scalars().all()

    data = [
        {
            "id": g.id,
            "title": g.title,
            "description": g.description,
            "category": g.category.value,
            "weightage": float(g.weightage),
            "target_value": float(g.target_value) if g.target_value else None,
            "achieved_value": float(g.achieved_value) if g.achieved_value else None,
            "unit": g.unit,
            "start_date": g.start_date.isoformat(),
            "due_date": g.due_date.isoformat(),
            "status": g.status.value,
            "progress": g.progress,
            "self_rating": g.self_rating,
            "manager_rating": g.manager_rating,
        }
        for g in goals
    ]

    return DataResponse(data=data)


@router.post("/goals", response_model=DataResponse)
async def create_goal(
    data: GoalCreate,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Create a new goal"""
    goal = Goal(
        id=str(uuid.uuid4()),
        employee_id=current_employee.id,
        cycle_id=data.cycle_id,
        title=data.title,
        description=data.description,
        category=data.category,
        weightage=Decimal(str(data.weightage)),
        target_value=Decimal(str(data.target_value)) if data.target_value else None,
        unit=data.unit,
        start_date=data.start_date,
        due_date=data.due_date,
        status=GoalStatus.NOT_STARTED,
        progress=0,
    )
    db.add(goal)
    await db.commit()

    return DataResponse(
        message="Goal created",
        data={"id": goal.id},
    )


@router.put("/goals/{goal_id}", response_model=DataResponse)
async def update_goal(
    goal_id: str,
    data: GoalUpdate,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Update a goal"""
    result = await db.execute(
        select(Goal)
        .where(Goal.id == goal_id)
        .where(Goal.employee_id == current_employee.id)
    )
    goal = result.scalar_one_or_none()

    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "achieved_value" and value is not None:
            setattr(goal, field, Decimal(str(value)))
        elif hasattr(goal, field):
            setattr(goal, field, value)

    await db.commit()

    return DataResponse(message="Goal updated")


@router.get("/cycles", response_model=DataResponse)
async def get_appraisal_cycles(
    db: AsyncSession = Depends(get_db),
):
    """Get appraisal cycles"""
    result = await db.execute(
        select(AppraisalCycle)
        .order_by(AppraisalCycle.start_date.desc())
    )
    cycles = result.scalars().all()

    data = [
        {
            "id": c.id,
            "name": c.name,
            "description": c.description,
            "start_date": c.start_date.isoformat(),
            "end_date": c.end_date.isoformat(),
            "self_review_start": c.self_review_start.isoformat(),
            "self_review_end": c.self_review_end.isoformat(),
            "manager_review_start": c.manager_review_start.isoformat(),
            "manager_review_end": c.manager_review_end.isoformat(),
            "is_360_enabled": c.is_360_enabled,
            "rating_scale": c.rating_scale,
            "status": c.status.value,
        }
        for c in cycles
    ]

    return DataResponse(data=data)


@router.get("/appraisals", response_model=DataResponse)
async def get_my_appraisals(
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get employee's appraisals"""
    result = await db.execute(
        select(Appraisal)
        .options(selectinload(Appraisal.cycle))
        .where(Appraisal.employee_id == current_employee.id)
        .order_by(Appraisal.created_at.desc())
    )
    appraisals = result.scalars().all()

    data = [
        {
            "id": a.id,
            "cycle_id": a.cycle_id,
            "cycle_name": a.cycle.name if a.cycle else None,
            "self_rating": float(a.self_rating) if a.self_rating else None,
            "manager_rating": float(a.manager_rating) if a.manager_rating else None,
            "final_rating": float(a.final_rating) if a.final_rating else None,
            "status": a.status.value,
            "self_review_submitted_at": a.self_review_submitted_at.isoformat() if a.self_review_submitted_at else None,
            "manager_review_submitted_at": a.manager_review_submitted_at.isoformat() if a.manager_review_submitted_at else None,
        }
        for a in appraisals
    ]

    return DataResponse(data=data)


@router.post("/feedback", response_model=DataResponse)
async def give_feedback(
    data: FeedbackCreate,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Give feedback to another employee"""
    feedback = Feedback(
        id=str(uuid.uuid4()),
        giver_id=current_employee.id,
        receiver_id=data.receiver_id,
        type=data.type,
        is_anonymous=data.is_anonymous,
        ratings=data.ratings,
        comments=data.comments,
        created_at=datetime.utcnow(),
    )
    db.add(feedback)
    await db.commit()

    return DataResponse(
        message="Feedback submitted",
        data={"id": feedback.id},
    )


@router.get("/feedback/received", response_model=DataResponse)
async def get_received_feedback(
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get feedback received"""
    result = await db.execute(
        select(Feedback)
        .where(Feedback.receiver_id == current_employee.id)
        .order_by(Feedback.created_at.desc())
    )
    feedbacks = result.scalars().all()

    data = [
        {
            "id": f.id,
            "giver_id": None if f.is_anonymous else f.giver_id,
            "type": f.type.value,
            "is_anonymous": f.is_anonymous,
            "ratings": f.ratings,
            "comments": f.comments,
            "created_at": f.created_at.isoformat(),
        }
        for f in feedbacks
    ]

    return DataResponse(data=data)
