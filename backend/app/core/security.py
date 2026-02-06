from datetime import datetime, timedelta
from typing import Optional, Any
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.models.employee import Employee

security = HTTPBearer()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials
    payload = decode_token(token)
    
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )
    
    user_id: str = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    
    result = await db.execute(
        select(User)
        .options(
            selectinload(User.employee).selectinload(Employee.role),
            selectinload(User.employee).selectinload(Employee.company),
            selectinload(User.employee).selectinload(Employee.department),
            selectinload(User.employee).selectinload(Employee.designation),
        )
        .where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is disabled",
        )
    
    return user


async def get_current_employee(
    current_user: User = Depends(get_current_user),
) -> Employee:
    if not current_user.employee:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employee profile not found",
        )
    return current_user.employee


def check_permission(employee: Employee, permission_slug: str, action: str = "read") -> bool:
    """Check if employee has specific permission"""
    if not employee or not employee.role:
        return False
    
    for role_perm in employee.role.permissions:
        if role_perm.permission.slug == permission_slug:
            if action == "create":
                return role_perm.can_create
            elif action == "read":
                return role_perm.can_read
            elif action == "update":
                return role_perm.can_update
            elif action == "delete":
                return role_perm.can_delete
    return False


def require_permission(permission_slug: str, action: str = "read"):
    """Decorator to require specific permission"""
    async def permission_checker(
        current_employee: Employee = Depends(get_current_employee),
    ) -> Employee:
        if not check_permission(current_employee, permission_slug, action):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission denied",
            )
        return current_employee
    return permission_checker


def is_super_admin(employee: Employee) -> bool:
    """Check if employee is super admin"""
    return employee.role.name == "Super Admin" if employee.role else False
