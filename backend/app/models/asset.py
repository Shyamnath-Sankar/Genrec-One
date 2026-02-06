from sqlalchemy import Column, String, Boolean, Date, DateTime, Numeric, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from app.models.base import Base, TimestampMixin
import uuid
import enum


def generate_uuid():
    return str(uuid.uuid4())


class AssetStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    ASSIGNED = "ASSIGNED"
    IN_MAINTENANCE = "IN_MAINTENANCE"
    RETIRED = "RETIRED"
    LOST = "LOST"


class AssetCategory(Base):
    __tablename__ = "asset_categories"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    depreciation = Column(Numeric(5, 2), nullable=True)  # Annual depreciation %
    created_at = Column(DateTime, nullable=False)

    # Relationships
    assets = relationship("Asset", back_populates="category")


class Asset(Base, TimestampMixin):
    __tablename__ = "assets"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id"), nullable=False)
    category_id = Column(String(36), ForeignKey("asset_categories.id"), nullable=False)
    name = Column(String(200), nullable=False)
    asset_tag = Column(String(50), unique=True, nullable=False)
    serial_number = Column(String(100), nullable=True)
    make = Column(String(100), nullable=True)
    model = Column(String(100), nullable=True)
    purchase_date = Column(Date, nullable=True)
    purchase_price = Column(Numeric(12, 2), nullable=True)
    current_value = Column(Numeric(12, 2), nullable=True)
    warranty_end_date = Column(Date, nullable=True)
    location = Column(String(200), nullable=True)
    status = Column(Enum(AssetStatus), default=AssetStatus.AVAILABLE)
    notes = Column(Text, nullable=True)

    # Relationships
    company = relationship("Company", back_populates="assets")
    category = relationship("AssetCategory", back_populates="assets")
    assignments = relationship("AssetAssignment", back_populates="asset")
    maintenance_logs = relationship("AssetMaintenance", back_populates="asset")


class AssetAssignment(Base):
    __tablename__ = "asset_assignments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    asset_id = Column(String(36), ForeignKey("assets.id"), nullable=False, index=True)
    employee_id = Column(String(36), ForeignKey("employees.id"), nullable=False, index=True)
    assigned_date = Column(Date, nullable=False)
    return_date = Column(Date, nullable=True)
    condition = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False)

    # Relationships
    asset = relationship("Asset", back_populates="assignments")
    employee = relationship("Employee")


class AssetMaintenance(Base):
    __tablename__ = "asset_maintenance"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    asset_id = Column(String(36), ForeignKey("assets.id"), nullable=False)
    maintenance_date = Column(Date, nullable=False)
    type = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    cost = Column(Numeric(10, 2), nullable=True)
    vendor_name = Column(String(200), nullable=True)
    next_scheduled = Column(Date, nullable=True)
    created_at = Column(DateTime, nullable=False)

    # Relationships
    asset = relationship("Asset", back_populates="maintenance_logs")
