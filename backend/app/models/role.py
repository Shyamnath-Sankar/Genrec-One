from sqlalchemy import Column, String, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base, TimestampMixin
import uuid


def generate_uuid():
    return str(uuid.uuid4())


class Role(Base, TimestampMixin):
    __tablename__ = "roles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    is_system_role = Column(Boolean, default=False)

    # Relationships
    permissions = relationship("RolePermission", back_populates="role", cascade="all, delete-orphan")
    employees = relationship("Employee", back_populates="role")


class Permission(Base):
    __tablename__ = "permissions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    module = Column(String(100), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)

    # Relationships
    role_permissions = relationship("RolePermission", back_populates="permission")


class RolePermission(Base):
    __tablename__ = "role_permissions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    role_id = Column(String(36), ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    permission_id = Column(String(36), ForeignKey("permissions.id", ondelete="CASCADE"), nullable=False)
    can_create = Column(Boolean, default=False)
    can_read = Column(Boolean, default=False)
    can_update = Column(Boolean, default=False)
    can_delete = Column(Boolean, default=False)

    # Relationships
    role = relationship("Role", back_populates="permissions")
    permission = relationship("Permission", back_populates="role_permissions")
