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
from app.models.asset import AssetCategory, Asset, AssetAssignment, AssetMaintenance, AssetStatus
from app.schemas.auth import DataResponse, PaginatedResponse
from pydantic import BaseModel, Field


class AssetCreate(BaseModel):
    category_id: str
    name: str = Field(..., min_length=1)
    asset_tag: str = Field(..., min_length=1)
    serial_number: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    purchase_date: Optional[date] = None
    purchase_price: Optional[float] = None
    warranty_end_date: Optional[date] = None
    location: Optional[str] = None
    notes: Optional[str] = None


class AssetCategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    code: str = Field(..., min_length=1, max_length=20)
    description: Optional[str] = None
    depreciation: Optional[float] = None


class AssetAssign(BaseModel):
    employee_id: str
    assigned_date: date
    condition: Optional[str] = None
    notes: Optional[str] = None


router = APIRouter(prefix="/assets", tags=["Assets"])


@router.post("/categories", response_model=DataResponse)
async def create_asset_category(
    data: AssetCategoryCreate,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Create an asset category"""
    # Check if code exists
    existing = await db.execute(
        select(AssetCategory).where(AssetCategory.code == data.code)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Category code already exists")
    
    category = AssetCategory(
        id=str(uuid.uuid4()),
        name=data.name,
        code=data.code,
        description=data.description,
        depreciation=Decimal(str(data.depreciation)) if data.depreciation else None,
        created_at=datetime.utcnow(),
    )
    db.add(category)
    await db.commit()
    
    return DataResponse(
        message="Category created successfully",
        data={"id": category.id, "code": category.code},
    )


@router.get("/categories", response_model=DataResponse)
async def get_asset_categories(
    db: AsyncSession = Depends(get_db),
):
    """Get asset categories"""
    result = await db.execute(
        select(AssetCategory).order_by(AssetCategory.name)
    )
    categories = result.scalars().all()

    data = [
        {
            "id": c.id,
            "name": c.name,
            "code": c.code,
            "description": c.description,
            "depreciation": float(c.depreciation) if c.depreciation else None,
        }
        for c in categories
    ]

    return DataResponse(data=data)


@router.get("", response_model=PaginatedResponse)
async def list_assets(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    category_id: Optional[str] = None,
    status: Optional[str] = None,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """List all assets"""
    query = (
        select(Asset)
        .options(selectinload(Asset.category))
        .where(Asset.company_id == current_employee.company_id)
    )

    if category_id:
        query = query.where(Asset.category_id == category_id)
    if status:
        query = query.where(Asset.status == status)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(Asset.name)
    query = query.offset((page - 1) * limit).limit(limit)

    result = await db.execute(query)
    assets = result.scalars().all()

    data = [
        {
            "id": a.id,
            "name": a.name,
            "asset_tag": a.asset_tag,
            "serial_number": a.serial_number,
            "category_id": a.category_id,
            "category_name": a.category.name if a.category else None,
            "make": a.make,
            "model": a.model,
            "status": a.status.value,
            "location": a.location,
            "purchase_price": float(a.purchase_price) if a.purchase_price else None,
            "current_value": float(a.current_value) if a.current_value else None,
        }
        for a in assets
    ]

    return PaginatedResponse(
        data=data,
        total=total,
        page=page,
        limit=limit,
        total_pages=(total + limit - 1) // limit,
    )


@router.post("", response_model=DataResponse)
async def create_asset(
    data: AssetCreate,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Create a new asset"""
    asset = Asset(
        id=str(uuid.uuid4()),
        company_id=current_employee.company_id,
        category_id=data.category_id,
        name=data.name,
        asset_tag=data.asset_tag,
        serial_number=data.serial_number,
        make=data.make,
        model=data.model,
        purchase_date=data.purchase_date,
        purchase_price=Decimal(str(data.purchase_price)) if data.purchase_price else None,
        current_value=Decimal(str(data.purchase_price)) if data.purchase_price else None,
        warranty_end_date=data.warranty_end_date,
        location=data.location,
        notes=data.notes,
        status=AssetStatus.AVAILABLE,
    )
    db.add(asset)
    await db.commit()

    return DataResponse(
        message="Asset created",
        data={"id": asset.id},
    )


@router.post("/{asset_id}/assign", response_model=DataResponse)
async def assign_asset(
    asset_id: str,
    data: AssetAssign,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Assign asset to employee"""
    result = await db.execute(
        select(Asset)
        .where(Asset.id == asset_id)
        .where(Asset.company_id == current_employee.company_id)
    )
    asset = result.scalar_one_or_none()

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    if asset.status == AssetStatus.ASSIGNED:
        raise HTTPException(status_code=400, detail="Asset already assigned")

    assignment = AssetAssignment(
        id=str(uuid.uuid4()),
        asset_id=asset_id,
        employee_id=data.employee_id,
        assigned_date=data.assigned_date,
        condition=data.condition,
        notes=data.notes,
        created_at=datetime.utcnow(),
    )
    db.add(assignment)

    asset.status = AssetStatus.ASSIGNED
    await db.commit()

    return DataResponse(message="Asset assigned")


@router.get("/my-assets", response_model=DataResponse)
async def get_my_assets(
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get assets assigned to current employee"""
    result = await db.execute(
        select(AssetAssignment)
        .options(selectinload(AssetAssignment.asset).selectinload(Asset.category))
        .where(AssetAssignment.employee_id == current_employee.id)
        .where(AssetAssignment.return_date == None)
    )
    assignments = result.scalars().all()

    data = [
        {
            "id": a.id,
            "asset_id": a.asset_id,
            "asset_name": a.asset.name if a.asset else None,
            "asset_tag": a.asset.asset_tag if a.asset else None,
            "category": a.asset.category.name if a.asset and a.asset.category else None,
            "assigned_date": a.assigned_date.isoformat(),
            "condition": a.condition,
        }
        for a in assignments
    ]

    return DataResponse(data=data)
