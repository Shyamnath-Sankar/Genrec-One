from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from datetime import datetime, date
from decimal import Decimal
import uuid

from app.core.database import get_db
from app.core.security import get_current_employee
from app.models.employee import Employee
from app.models.travel import TravelRequest, TravelMode
from app.models.attendance import ApprovalStatus
from app.schemas.auth import DataResponse, PaginatedResponse
from pydantic import BaseModel, Field


class TravelRequestCreate(BaseModel):
    purpose: str = Field(..., min_length=1)
    destination: str = Field(..., min_length=1)
    departure_date: date
    return_date: date
    travel_mode: str
    accommodation_required: bool = False
    estimated_budget: Optional[float] = None
    advance_required: Optional[float] = None
    itinerary: Optional[dict] = None


router = APIRouter(prefix="/travel", tags=["Travel"])


@router.post("", response_model=DataResponse)
async def create_travel_request(
    data: TravelRequestCreate,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Create a travel request"""
    if data.departure_date > data.return_date:
        raise HTTPException(
            status_code=400,
            detail="Return date must be after departure date",
        )

    request = TravelRequest(
        id=str(uuid.uuid4()),
        employee_id=current_employee.id,
        purpose=data.purpose,
        destination=data.destination,
        departure_date=data.departure_date,
        return_date=data.return_date,
        travel_mode=data.travel_mode,
        accommodation_required=data.accommodation_required,
        estimated_budget=Decimal(str(data.estimated_budget)) if data.estimated_budget else None,
        advance_required=Decimal(str(data.advance_required)) if data.advance_required else None,
        itinerary=data.itinerary,
        status=ApprovalStatus.PENDING,
    )
    db.add(request)
    await db.commit()

    return DataResponse(
        message="Travel request submitted",
        data={"id": request.id},
    )


@router.get("", response_model=PaginatedResponse)
async def get_my_travel_requests(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    status: Optional[str] = None,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get my travel requests"""
    query = (
        select(TravelRequest)
        .where(TravelRequest.employee_id == current_employee.id)
    )

    if status:
        query = query.where(TravelRequest.status == status)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(TravelRequest.created_at.desc())
    query = query.offset((page - 1) * limit).limit(limit)

    result = await db.execute(query)
    requests = result.scalars().all()

    data = [
        {
            "id": r.id,
            "purpose": r.purpose,
            "destination": r.destination,
            "departure_date": r.departure_date.isoformat(),
            "return_date": r.return_date.isoformat(),
            "travel_mode": r.travel_mode.value,
            "accommodation_required": r.accommodation_required,
            "estimated_budget": float(r.estimated_budget) if r.estimated_budget else None,
            "advance_required": float(r.advance_required) if r.advance_required else None,
            "status": r.status.value,
            "approved_at": r.approved_at.isoformat() if r.approved_at else None,
            "created_at": r.created_at.isoformat(),
        }
        for r in requests
    ]

    return PaginatedResponse(
        data=data,
        total=total,
        page=page,
        limit=limit,
        total_pages=(total + limit - 1) // limit,
    )


@router.get("/{request_id}", response_model=DataResponse)
async def get_travel_request_detail(
    request_id: str,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get travel request details"""
    result = await db.execute(
        select(TravelRequest).where(TravelRequest.id == request_id)
    )
    request = result.scalar_one_or_none()

    if not request:
        raise HTTPException(status_code=404, detail="Travel request not found")

    return DataResponse(data={
        "id": request.id,
        "purpose": request.purpose,
        "destination": request.destination,
        "departure_date": request.departure_date.isoformat(),
        "return_date": request.return_date.isoformat(),
        "travel_mode": request.travel_mode.value,
        "accommodation_required": request.accommodation_required,
        "estimated_budget": float(request.estimated_budget) if request.estimated_budget else None,
        "advance_required": float(request.advance_required) if request.advance_required else None,
        "itinerary": request.itinerary,
        "status": request.status.value,
        "approver_id": request.approver_id,
        "approver_remarks": request.approver_remarks,
        "approved_at": request.approved_at.isoformat() if request.approved_at else None,
        "created_at": request.created_at.isoformat(),
    })


@router.post("/{request_id}/cancel", response_model=DataResponse)
async def cancel_travel_request(
    request_id: str,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Cancel a travel request"""
    result = await db.execute(
        select(TravelRequest)
        .where(TravelRequest.id == request_id)
        .where(TravelRequest.employee_id == current_employee.id)
    )
    request = result.scalar_one_or_none()

    if not request:
        raise HTTPException(status_code=404, detail="Travel request not found")

    if request.status != ApprovalStatus.PENDING:
        raise HTTPException(status_code=400, detail="Cannot cancel this request")

    request.status = ApprovalStatus.CANCELLED
    await db.commit()

    return DataResponse(message="Travel request cancelled")
