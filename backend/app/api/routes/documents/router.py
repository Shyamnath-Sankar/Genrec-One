from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional, List
from datetime import datetime
import uuid
import os
import aiofiles

from app.core.database import get_db
from app.core.security import get_current_employee
from app.core.config import settings
from app.models.employee import Employee
from app.models.document import Document, DocumentCategory
from app.schemas.auth import DataResponse, PaginatedResponse

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.get("", response_model=PaginatedResponse)
async def get_my_documents(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    category: Optional[str] = None,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get my documents"""
    query = (
        select(Document)
        .where(Document.employee_id == current_employee.id)
    )

    if category:
        query = query.where(Document.category == category)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(Document.created_at.desc())
    query = query.offset((page - 1) * limit).limit(limit)

    result = await db.execute(query)
    documents = result.scalars().all()

    data = [
        {
            "id": d.id,
            "name": d.name,
            "description": d.description,
            "category": d.category.value,
            "file_type": d.file_type,
            "file_size": d.file_size,
            "version": d.version,
            "expiry_date": d.expiry_date.isoformat() if d.expiry_date else None,
            "is_acknowledged": d.is_acknowledged,
            "tags": d.tags,
            "created_at": d.created_at.isoformat(),
        }
        for d in documents
    ]

    return PaginatedResponse(
        data=data,
        total=total,
        page=page,
        limit=limit,
        total_pages=(total + limit - 1) // limit,
    )


@router.post("/upload", response_model=DataResponse)
async def upload_document(
    file: UploadFile = File(...),
    category: str = "PERSONAL",
    description: Optional[str] = None,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Upload a document"""
    # Validate file extension
    ext = file.filename.split(".")[-1].lower() if file.filename else ""
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed: {', '.join(settings.ALLOWED_EXTENSIONS)}",
        )

    # Check file size
    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max size: {settings.MAX_UPLOAD_SIZE / (1024*1024)}MB",
        )

    # Create upload directory
    upload_dir = os.path.join(settings.UPLOAD_DIR, "documents", current_employee.id)
    os.makedirs(upload_dir, exist_ok=True)

    # Save file
    file_id = str(uuid.uuid4())
    file_path = os.path.join(upload_dir, f"{file_id}.{ext}")
    
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    # Create document record
    document = Document(
        id=file_id,
        employee_id=current_employee.id,
        category=category,
        name=file.filename,
        description=description,
        file_path=file_path,
        file_type=ext,
        file_size=len(content),
        version=1,
    )
    db.add(document)
    await db.commit()

    return DataResponse(
        message="Document uploaded",
        data={"id": document.id, "name": document.name},
    )


@router.get("/company", response_model=DataResponse)
async def get_company_documents(
    category: Optional[str] = None,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get company-wide documents"""
    query = (
        select(Document)
        .where(Document.company_id == current_employee.company_id)
        .where(Document.employee_id == None)
    )

    if category:
        query = query.where(Document.category == category)

    query = query.order_by(Document.created_at.desc())

    result = await db.execute(query)
    documents = result.scalars().all()

    data = [
        {
            "id": d.id,
            "name": d.name,
            "description": d.description,
            "category": d.category.value,
            "file_type": d.file_type,
            "is_template": d.is_template,
            "is_acknowledged": d.is_acknowledged,
            "tags": d.tags,
            "created_at": d.created_at.isoformat(),
        }
        for d in documents
    ]

    return DataResponse(data=data)


@router.post("/{document_id}/acknowledge", response_model=DataResponse)
async def acknowledge_document(
    document_id: str,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Acknowledge a document"""
    result = await db.execute(
        select(Document).where(Document.id == document_id)
    )
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    document.is_acknowledged = True
    document.acknowledged_at = datetime.utcnow()
    await db.commit()

    return DataResponse(message="Document acknowledged")


@router.delete("/{document_id}", response_model=DataResponse)
async def delete_document(
    document_id: str,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Delete a document"""
    result = await db.execute(
        select(Document)
        .where(Document.id == document_id)
        .where(Document.employee_id == current_employee.id)
    )
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete file
    if os.path.exists(document.file_path):
        os.remove(document.file_path)

    await db.delete(document)
    await db.commit()

    return DataResponse(message="Document deleted")
