from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional
from datetime import datetime, date, timedelta
import uuid

from app.core.database import get_db
from app.core.security import get_current_employee
from app.models.employee import Employee
from app.models.ticket import TicketCategory, Ticket, TicketComment, KnowledgeBase, TicketStatus, Priority
from app.schemas.auth import DataResponse, PaginatedResponse
from pydantic import BaseModel, Field


class TicketCreate(BaseModel):
    category_id: str
    subject: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1)
    priority: str = "MEDIUM"


class TicketCommentCreate(BaseModel):
    content: str = Field(..., min_length=1)
    is_internal: bool = False


router = APIRouter(prefix="/tickets", tags=["Helpdesk"])


@router.get("/categories", response_model=DataResponse)
async def get_ticket_categories(
    db: AsyncSession = Depends(get_db),
):
    """Get ticket categories"""
    result = await db.execute(
        select(TicketCategory)
        .where(TicketCategory.is_active == True)
        .order_by(TicketCategory.name)
    )
    categories = result.scalars().all()

    data = [
        {
            "id": c.id,
            "name": c.name,
            "code": c.code,
            "description": c.description,
            "sla_hours": c.sla_hours,
        }
        for c in categories
    ]

    return DataResponse(data=data)


@router.post("", response_model=DataResponse)
async def create_ticket(
    data: TicketCreate,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Create a support ticket"""
    # Generate ticket number
    count_result = await db.execute(select(func.count()).select_from(Ticket))
    count = count_result.scalar() or 0
    ticket_number = f"TKT{str(count + 1).zfill(6)}"

    # Get category for SLA
    cat_result = await db.execute(
        select(TicketCategory).where(TicketCategory.id == data.category_id)
    )
    category = cat_result.scalar_one_or_none()
    sla_hours = category.sla_hours if category else 48
    sla_deadline = datetime.utcnow() + timedelta(hours=sla_hours)

    ticket = Ticket(
        id=str(uuid.uuid4()),
        ticket_number=ticket_number,
        category_id=data.category_id,
        created_by_id=current_employee.id,
        subject=data.subject,
        description=data.description,
        priority=data.priority,
        status=TicketStatus.OPEN,
        sla_deadline=sla_deadline,
    )
    db.add(ticket)
    await db.commit()

    return DataResponse(
        message="Ticket created",
        data={"id": ticket.id, "ticket_number": ticket_number},
    )


@router.get("", response_model=PaginatedResponse)
async def get_my_tickets(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    status: Optional[str] = None,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get my tickets"""
    query = (
        select(Ticket)
        .options(selectinload(Ticket.category))
        .where(Ticket.created_by_id == current_employee.id)
    )

    if status:
        query = query.where(Ticket.status == status)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(Ticket.created_at.desc())
    query = query.offset((page - 1) * limit).limit(limit)

    result = await db.execute(query)
    tickets = result.scalars().all()

    data = [
        {
            "id": t.id,
            "ticket_number": t.ticket_number,
            "category_name": t.category.name if t.category else None,
            "subject": t.subject,
            "priority": t.priority.value,
            "status": t.status.value,
            "sla_deadline": t.sla_deadline.isoformat() if t.sla_deadline else None,
            "resolved_at": t.resolved_at.isoformat() if t.resolved_at else None,
            "created_at": t.created_at.isoformat(),
        }
        for t in tickets
    ]

    return PaginatedResponse(
        data=data,
        total=total,
        page=page,
        limit=limit,
        total_pages=(total + limit - 1) // limit,
    )


@router.get("/{ticket_id}", response_model=DataResponse)
async def get_ticket_detail(
    ticket_id: str,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get ticket details"""
    result = await db.execute(
        select(Ticket)
        .options(
            selectinload(Ticket.category),
            selectinload(Ticket.comments)
        )
        .where(Ticket.id == ticket_id)
    )
    ticket = result.scalar_one_or_none()

    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    comments = [
        {
            "id": c.id,
            "user_id": c.user_id,
            "content": c.content,
            "is_internal": c.is_internal,
            "created_at": c.created_at.isoformat(),
        }
        for c in ticket.comments
        if not c.is_internal or ticket.assignee_id == current_employee.id
    ]

    return DataResponse(data={
        "id": ticket.id,
        "ticket_number": ticket.ticket_number,
        "category_name": ticket.category.name if ticket.category else None,
        "subject": ticket.subject,
        "description": ticket.description,
        "priority": ticket.priority.value,
        "status": ticket.status.value,
        "assignee_id": ticket.assignee_id,
        "sla_deadline": ticket.sla_deadline.isoformat() if ticket.sla_deadline else None,
        "resolved_at": ticket.resolved_at.isoformat() if ticket.resolved_at else None,
        "satisfaction": ticket.satisfaction,
        "created_at": ticket.created_at.isoformat(),
        "comments": comments,
    })


@router.post("/{ticket_id}/comments", response_model=DataResponse)
async def add_comment(
    ticket_id: str,
    data: TicketCommentCreate,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Add comment to ticket"""
    comment = TicketComment(
        id=str(uuid.uuid4()),
        ticket_id=ticket_id,
        user_id=current_employee.id,
        content=data.content,
        is_internal=data.is_internal,
        created_at=datetime.utcnow(),
    )
    db.add(comment)
    await db.commit()

    return DataResponse(message="Comment added")


@router.get("/kb/articles", response_model=DataResponse)
async def get_knowledge_base(
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Get knowledge base articles"""
    query = select(KnowledgeBase).where(KnowledgeBase.is_published == True)

    if category:
        query = query.where(KnowledgeBase.category == category)
    if search:
        query = query.where(KnowledgeBase.title.ilike(f"%{search}%"))

    query = query.order_by(KnowledgeBase.view_count.desc())

    result = await db.execute(query)
    articles = result.scalars().all()

    data = [
        {
            "id": a.id,
            "title": a.title,
            "category": a.category,
            "tags": a.tags,
            "view_count": a.view_count,
        }
        for a in articles
    ]

    return DataResponse(data=data)
