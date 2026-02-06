from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
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
from app.models.recruitment import (
    Job, Candidate, Interview, CandidateEvaluation, OfferLetter,
    JobStatus, CandidateStage, InterviewType, InterviewStatus
)
from app.schemas.auth import DataResponse, PaginatedResponse
from pydantic import BaseModel, Field, EmailStr


class JobCreate(BaseModel):
    title: str = Field(..., min_length=1)
    department_id: Optional[str] = None
    hiring_manager_id: Optional[str] = None
    positions: int = 1
    location: Optional[str] = None
    work_type: str = "ON_SITE"
    employment_type: str = "FULL_TIME"
    experience_min: Optional[int] = None
    experience_max: Optional[int] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    skills: List[str] = []
    description: str
    requirements: Optional[str] = None
    benefits: Optional[str] = None


class CandidateCreate(BaseModel):
    job_id: str
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    current_company: Optional[str] = None
    current_title: Optional[str] = None
    experience: Optional[int] = None
    notice_period: Optional[int] = None
    expected_salary: Optional[float] = None
    skills: List[str] = []
    source: Optional[str] = None


class InterviewSchedule(BaseModel):
    candidate_id: str
    round: int
    type: str
    scheduled_at: datetime
    duration: int = 60
    location: Optional[str] = None
    meeting_link: Optional[str] = None
    interviewer_ids: List[str] = []


router = APIRouter(prefix="/recruitment", tags=["Recruitment"])


@router.get("/jobs", response_model=PaginatedResponse)
async def list_jobs(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    status: Optional[str] = None,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """List all jobs"""
    query = (
        select(Job)
        .where(Job.company_id == current_employee.company_id)
    )

    if status:
        query = query.where(Job.status == status)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(Job.created_at.desc())
    query = query.offset((page - 1) * limit).limit(limit)

    result = await db.execute(query)
    jobs = result.scalars().all()

    data = [
        {
            "id": j.id,
            "title": j.title,
            "department_id": j.department_id,
            "positions": j.positions,
            "location": j.location,
            "work_type": j.work_type.value,
            "employment_type": j.employment_type.value,
            "status": j.status.value,
            "skills": j.skills or [],
            "published_at": j.published_at.isoformat() if j.published_at else None,
            "created_at": j.created_at.isoformat(),
        }
        for j in jobs
    ]

    return PaginatedResponse(
        data=data,
        total=total,
        page=page,
        limit=limit,
        total_pages=(total + limit - 1) // limit,
    )


@router.post("/jobs", response_model=DataResponse)
async def create_job(
    data: JobCreate,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Create a new job posting"""
    job = Job(
        id=str(uuid.uuid4()),
        company_id=current_employee.company_id,
        title=data.title,
        department_id=data.department_id,
        hiring_manager_id=data.hiring_manager_id,
        positions=data.positions,
        location=data.location,
        work_type=data.work_type,
        employment_type=data.employment_type,
        experience_min=data.experience_min,
        experience_max=data.experience_max,
        salary_min=Decimal(str(data.salary_min)) if data.salary_min else None,
        salary_max=Decimal(str(data.salary_max)) if data.salary_max else None,
        skills=data.skills,
        description=data.description,
        requirements=data.requirements,
        benefits=data.benefits,
        status=JobStatus.DRAFT,
    )
    db.add(job)
    await db.commit()

    return DataResponse(
        message="Job created successfully",
        data={"id": job.id},
    )


@router.post("/jobs/{job_id}/publish", response_model=DataResponse)
async def publish_job(
    job_id: str,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Publish a job"""
    result = await db.execute(
        select(Job)
        .where(Job.id == job_id)
        .where(Job.company_id == current_employee.company_id)
    )
    job = result.scalar_one_or_none()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job.status = JobStatus.OPEN
    job.published_at = datetime.utcnow()
    await db.commit()

    return DataResponse(message="Job published successfully")


@router.get("/candidates", response_model=PaginatedResponse)
async def list_candidates(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    job_id: Optional[str] = None,
    stage: Optional[str] = None,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """List candidates"""
    query = (
        select(Candidate)
        .options(selectinload(Candidate.job))
    )

    if job_id:
        query = query.where(Candidate.job_id == job_id)
    if stage:
        query = query.where(Candidate.stage == stage)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(Candidate.applied_at.desc())
    query = query.offset((page - 1) * limit).limit(limit)

    result = await db.execute(query)
    candidates = result.scalars().all()

    data = [
        {
            "id": c.id,
            "job_id": c.job_id,
            "job_title": c.job.title if c.job else None,
            "first_name": c.first_name,
            "last_name": c.last_name,
            "email": c.email,
            "phone": c.phone,
            "current_company": c.current_company,
            "experience": c.experience,
            "stage": c.stage.value,
            "match_score": c.match_score,
            "rating": float(c.rating) if c.rating else None,
            "applied_at": c.applied_at.isoformat(),
        }
        for c in candidates
    ]

    return PaginatedResponse(
        data=data,
        total=total,
        page=page,
        limit=limit,
        total_pages=(total + limit - 1) // limit,
    )


@router.post("/candidates", response_model=DataResponse)
async def create_candidate(
    data: CandidateCreate,
    db: AsyncSession = Depends(get_db),
):
    """Add a new candidate"""
    candidate = Candidate(
        id=str(uuid.uuid4()),
        job_id=data.job_id,
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        phone=data.phone,
        current_company=data.current_company,
        current_title=data.current_title,
        experience=data.experience,
        notice_period=data.notice_period,
        expected_salary=Decimal(str(data.expected_salary)) if data.expected_salary else None,
        skills=data.skills,
        source=data.source,
        stage=CandidateStage.NEW,
        applied_at=datetime.utcnow(),
    )
    db.add(candidate)
    await db.commit()

    return DataResponse(
        message="Candidate added",
        data={"id": candidate.id},
    )


@router.put("/candidates/{candidate_id}/stage", response_model=DataResponse)
async def update_candidate_stage(
    candidate_id: str,
    stage: str,
    db: AsyncSession = Depends(get_db),
):
    """Update candidate stage"""
    result = await db.execute(
        select(Candidate).where(Candidate.id == candidate_id)
    )
    candidate = result.scalar_one_or_none()

    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    candidate.stage = stage
    await db.commit()

    return DataResponse(message="Stage updated")


@router.post("/interviews", response_model=DataResponse)
async def schedule_interview(
    data: InterviewSchedule,
    db: AsyncSession = Depends(get_db),
):
    """Schedule an interview"""
    interview = Interview(
        id=str(uuid.uuid4()),
        candidate_id=data.candidate_id,
        round=data.round,
        type=data.type,
        scheduled_at=data.scheduled_at,
        duration=data.duration,
        location=data.location,
        meeting_link=data.meeting_link,
        interviewer_ids=data.interviewer_ids,
        status=InterviewStatus.SCHEDULED,
    )
    db.add(interview)

    # Update candidate stage
    result = await db.execute(
        select(Candidate).where(Candidate.id == data.candidate_id)
    )
    candidate = result.scalar_one_or_none()
    if candidate:
        candidate.stage = CandidateStage.INTERVIEW

    await db.commit()

    return DataResponse(
        message="Interview scheduled",
        data={"id": interview.id},
    )


@router.get("/interviews", response_model=DataResponse)
async def list_interviews(
    candidate_id: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
):
    """List interviews"""
    query = select(Interview).options(selectinload(Interview.candidate))

    if candidate_id:
        query = query.where(Interview.candidate_id == candidate_id)
    if date_from:
        query = query.where(func.date(Interview.scheduled_at) >= date_from)
    if date_to:
        query = query.where(func.date(Interview.scheduled_at) <= date_to)

    query = query.order_by(Interview.scheduled_at)

    result = await db.execute(query)
    interviews = result.scalars().all()

    data = [
        {
            "id": i.id,
            "candidate_id": i.candidate_id,
            "candidate_name": f"{i.candidate.first_name} {i.candidate.last_name}" if i.candidate else None,
            "round": i.round,
            "type": i.type.value,
            "scheduled_at": i.scheduled_at.isoformat(),
            "duration": i.duration,
            "location": i.location,
            "meeting_link": i.meeting_link,
            "status": i.status.value,
        }
        for i in interviews
    ]

    return DataResponse(data=data)
