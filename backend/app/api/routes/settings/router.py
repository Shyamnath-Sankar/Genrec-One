from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional, List
from datetime import datetime
import uuid

from app.core.database import get_db
from app.core.security import get_current_employee, get_password_hash, is_super_admin
from app.models.user import User
from app.models.employee import Employee
from app.models.role import Role, Permission, RolePermission
from app.models.company import Company
from app.models.policy import Policy, Announcement
from app.schemas.auth import DataResponse, PaginatedResponse
from pydantic import BaseModel, Field, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    employeeId: Optional[str] = None
    roleId: Optional[str] = None


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    logo: Optional[str] = None
    address: Optional[str] = None
    industry: Optional[str] = None


class RoleCreate(BaseModel):
    name: str = Field(..., min_length=1)
    description: Optional[str] = None


class RolePermissionUpdate(BaseModel):
    permission_id: str
    can_create: bool = False
    can_read: bool = False
    can_update: bool = False
    can_delete: bool = False


class AnnouncementCreate(BaseModel):
    title: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1)
    priority: str = "MEDIUM"
    target_roles: List[str] = []
    is_pinned: bool = False


router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get("/company", response_model=DataResponse)
async def get_company_settings(
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get company settings"""
    result = await db.execute(
        select(Company).where(Company.id == current_employee.company_id)
    )
    company = result.scalar_one_or_none()

    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    return DataResponse(data={
        "id": company.id,
        "name": company.name,
        "logo": company.logo,
        "address": company.address,
        "industry": company.industry,
        "registration_no": company.registration_no,
        "tax_id": company.tax_id,
        "settings": company.settings,
    })


@router.put("/company", response_model=DataResponse)
async def update_company_settings(
    data: CompanyUpdate,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Update company settings"""
    result = await db.execute(
        select(Company).where(Company.id == current_employee.company_id)
    )
    company = result.scalar_one_or_none()

    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(company, field):
            setattr(company, field, value)

    await db.commit()

    return DataResponse(message="Company settings updated")


@router.get("/roles", response_model=DataResponse)
async def get_roles(
    db: AsyncSession = Depends(get_db),
):
    """Get all roles"""
    result = await db.execute(
        select(Role)
        .options(selectinload(Role.permissions).selectinload(RolePermission.permission))
        .order_by(Role.name)
    )
    roles = result.scalars().all()

    data = [
        {
            "id": r.id,
            "name": r.name,
            "description": r.description,
            "is_system_role": r.is_system_role,
            "permissions": [
                {
                    "permission_id": p.permission_id,
                    "slug": p.permission.slug,
                    "name": p.permission.name,
                    "module": p.permission.module,
                    "can_create": p.can_create,
                    "can_read": p.can_read,
                    "can_update": p.can_update,
                    "can_delete": p.can_delete,
                }
                for p in r.permissions
            ],
        }
        for r in roles
    ]

    return DataResponse(data=data)


@router.post("/roles", response_model=DataResponse)
async def create_role(
    data: RoleCreate,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Create a new role"""
    role = Role(
        id=str(uuid.uuid4()),
        name=data.name,
        description=data.description,
        is_system_role=False,
    )
    db.add(role)
    await db.commit()

    return DataResponse(
        message="Role created",
        data={"id": role.id},
    )


@router.put("/roles/{role_id}/permissions", response_model=DataResponse)
async def update_role_permissions(
    role_id: str,
    permissions: List[RolePermissionUpdate],
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Update role permissions"""
    result = await db.execute(
        select(Role).where(Role.id == role_id)
    )
    role = result.scalar_one_or_none()

    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    if role.is_system_role and not is_super_admin(current_employee):
        raise HTTPException(status_code=403, detail="Cannot modify system role")

    # Delete existing permissions
    await db.execute(
        select(RolePermission)
        .where(RolePermission.role_id == role_id)
    )

    # Add new permissions
    for perm in permissions:
        role_perm = RolePermission(
            id=str(uuid.uuid4()),
            role_id=role_id,
            permission_id=perm.permission_id,
            can_create=perm.can_create,
            can_read=perm.can_read,
            can_update=perm.can_update,
            can_delete=perm.can_delete,
        )
        db.add(role_perm)

    await db.commit()

    return DataResponse(message="Permissions updated")


@router.get("/permissions", response_model=DataResponse)
async def get_permissions(
    db: AsyncSession = Depends(get_db),
):
    """Get all available permissions"""
    result = await db.execute(
        select(Permission).order_by(Permission.module, Permission.name)
    )
    permissions = result.scalars().all()

    # Group by module
    grouped = {}
    for p in permissions:
        if p.module not in grouped:
            grouped[p.module] = []
        grouped[p.module].append({
            "id": p.id,
            "slug": p.slug,
            "name": p.name,
            "description": p.description,
        })

    return DataResponse(data=grouped)


@router.get("/users", response_model=PaginatedResponse)
async def list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """List all users"""
    query = (
        select(User)
        .options(selectinload(User.employee).selectinload(Employee.role))
    )

    if search:
        query = query.where(User.email.ilike(f"%{search}%"))

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(User.email)
    query = query.offset((page - 1) * limit).limit(limit)

    result = await db.execute(query)
    users = result.scalars().all()

    data = [
        {
            "id": u.id,
            "email": u.email,
            "is_active": u.is_active,
            "last_login": u.last_login.isoformat() if u.last_login else None,
            "employee_name": f"{u.employee.first_name} {u.employee.last_name}" if u.employee else None,
            "role": u.employee.role.name if u.employee and u.employee.role else None,
        }
        for u in users
    ]

    return PaginatedResponse(
        data=data,
        total=total,
        page=page,
        limit=limit,
        total_pages=(total + limit - 1) // limit,
    )


@router.put("/users/{user_id}/toggle-active", response_model=DataResponse)
async def toggle_user_active(
    user_id: str,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Toggle user active status"""
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = not user.is_active
    await db.commit()

    return DataResponse(
        message=f"User {'activated' if user.is_active else 'deactivated'}",
        data={"is_active": user.is_active},
    )


@router.post("/users/{user_id}/reset-password", response_model=DataResponse)
async def reset_user_password(
    user_id: str,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Reset user password"""
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = get_password_hash("Welcome@123")
    user.must_change_password = True
    await db.commit()

    return DataResponse(message="Password reset to default. User must change on next login.")


@router.post("/users", response_model=DataResponse)
async def create_user(
    data: UserCreate,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Create a new user"""
    # Check if email already exists
    existing = await db.execute(
        select(User).where(User.email == data.email)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already exists")

    # Create user
    user = User(
        id=str(uuid.uuid4()),
        email=data.email,
        password_hash=get_password_hash(data.password),
        is_active=True,
        must_change_password=True,
    )
    db.add(user)

    # Link to employee if provided
    if data.employeeId:
        emp_result = await db.execute(
            select(Employee).where(Employee.id == data.employeeId)
        )
        employee = emp_result.scalar_one_or_none()
        if employee:
            employee.user_id = user.id
            if data.roleId:
                employee.role_id = data.roleId

    await db.commit()

    return DataResponse(
        message="User created successfully",
        data={"id": user.id},
    )


@router.get("/policies", response_model=DataResponse)
async def get_policies(
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get all policies for the company"""
    result = await db.execute(
        select(Policy)
        .where(Policy.company_id == current_employee.company_id)
        .order_by(Policy.type, Policy.name)
    )
    policies = result.scalars().all()

    data = [
        {
            "id": p.id,
            "name": p.name,
            "type": p.type.value if p.type else "GENERAL",
            "description": p.description,
            "isActive": p.is_active,
            "effectiveFrom": p.effective_from.isoformat() if p.effective_from else None,
            "createdAt": p.created_at.isoformat() if p.created_at else None,
        }
        for p in policies
    ]

    return DataResponse(data=data)


@router.get("/announcements", response_model=DataResponse)
async def get_announcements(
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get active announcements"""
    now = datetime.utcnow()
    result = await db.execute(
        select(Announcement)
        .where(Announcement.company_id == current_employee.company_id)
        .where(Announcement.published_at != None)
        .where(Announcement.published_at <= now)
        .order_by(Announcement.is_pinned.desc(), Announcement.published_at.desc())
    )
    announcements = result.scalars().all()

    data = [
        {
            "id": a.id,
            "title": a.title,
            "content": a.content,
            "priority": a.priority.value,
            "is_pinned": a.is_pinned,
            "published_at": a.published_at.isoformat() if a.published_at else None,
        }
        for a in announcements
        if not a.target_roles or current_employee.role.name in a.target_roles
    ]

    return DataResponse(data=data)


@router.post("/announcements", response_model=DataResponse)
async def create_announcement(
    data: AnnouncementCreate,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Create an announcement"""
    announcement = Announcement(
        id=str(uuid.uuid4()),
        company_id=current_employee.company_id,
        title=data.title,
        content=data.content,
        priority=data.priority,
        target_roles=data.target_roles,
        is_pinned=data.is_pinned,
        created_by_id=current_employee.id,
        published_at=datetime.utcnow(),
    )
    db.add(announcement)
    await db.commit()

    return DataResponse(
        message="Announcement created",
        data={"id": announcement.id},
    )
