from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
)
from app.core.config import settings
from app.models.user import User, AuditLog
from app.models.employee import Employee
from app.models.role import Role
from app.models.company import Company
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    ChangePasswordRequest,
    RefreshTokenRequest,
    DataResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=LoginResponse)
async def login(
    request: Request,
    data: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate user and return tokens"""
    # Find user by email
    result = await db.execute(
        select(User)
        .options(
            selectinload(User.employee).selectinload(Employee.role),
            selectinload(User.employee).selectinload(Employee.company),
            selectinload(User.employee).selectinload(Employee.department),
            selectinload(User.employee).selectinload(Employee.designation),
        )
        .where(User.email == data.email)
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is disabled",
        )

    # Update last login
    user.last_login = datetime.utcnow()
    
    # Create audit log
    audit_log = AuditLog(
        user_id=user.id,
        action="LOGIN",
        module="auth",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        created_at=datetime.utcnow(),
    )
    db.add(audit_log)
    await db.commit()

    # Create tokens
    token_data = {"sub": user.id, "email": user.email}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    # Build user response
    user_data = {
        "id": user.id,
        "email": user.email,
        "must_change_password": user.must_change_password,
    }

    if user.employee:
        emp = user.employee
        user_data["employee"] = {
            "id": emp.id,
            "employee_id": emp.employee_id,
            "first_name": emp.first_name,
            "last_name": emp.last_name,
            "photo": emp.photo,
            "role": {"id": emp.role.id, "name": emp.role.name} if emp.role else None,
            "company": {"id": emp.company.id, "name": emp.company.name} if emp.company else None,
            "department": {"id": emp.department.id, "name": emp.department.name} if emp.department else None,
            "designation": {"id": emp.designation.id, "name": emp.designation.name} if emp.designation else None,
        }

    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=user_data,
    )


@router.post("/refresh", response_model=LoginResponse)
async def refresh_token(
    data: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    """Refresh access token using refresh token"""
    payload = decode_token(data.refresh_token)
    
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    user_id = payload.get("sub")
    
    result = await db.execute(
        select(User)
        .options(selectinload(User.employee).selectinload(Employee.role))
        .where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    # Create new tokens
    token_data = {"sub": user.id, "email": user.email}
    access_token = create_access_token(token_data)
    new_refresh_token = create_refresh_token(token_data)

    user_data = {
        "id": user.id,
        "email": user.email,
        "must_change_password": user.must_change_password,
    }

    return LoginResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=user_data,
    )


@router.post("/change-password", response_model=DataResponse)
async def change_password(
    request: Request,
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change user password"""
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    # Update password
    current_user.password_hash = get_password_hash(data.new_password)
    current_user.must_change_password = False

    # Audit log
    audit_log = AuditLog(
        user_id=current_user.id,
        action="PASSWORD_CHANGED",
        module="auth",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        created_at=datetime.utcnow(),
    )
    db.add(audit_log)
    await db.commit()

    return DataResponse(message="Password changed successfully")


@router.get("/me", response_model=DataResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
):
    """Get current user information"""
    user_data = {
        "id": current_user.id,
        "email": current_user.email,
        "must_change_password": current_user.must_change_password,
        "last_login": current_user.last_login.isoformat() if current_user.last_login else None,
    }

    if current_user.employee:
        emp = current_user.employee
        user_data["employee"] = {
            "id": emp.id,
            "employee_id": emp.employee_id,
            "first_name": emp.first_name,
            "last_name": emp.last_name,
            "photo": emp.photo,
            "role": {"id": emp.role.id, "name": emp.role.name} if emp.role else None,
            "company": {"id": emp.company.id, "name": emp.company.name} if emp.company else None,
            "department": {"id": emp.department.id, "name": emp.department.name} if emp.department else None,
            "designation": {"id": emp.designation.id, "name": emp.designation.name} if emp.designation else None,
        }

    return DataResponse(data=user_data)
