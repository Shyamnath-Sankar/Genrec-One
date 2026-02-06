from sqlalchemy import Column, String, Boolean, Date, DateTime, Numeric, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from app.models.types import JSONB
from app.models.base import Base, TimestampMixin
from app.models.attendance import ApprovalStatus
import uuid
import enum


def generate_uuid():
    return str(uuid.uuid4())


class TravelMode(str, enum.Enum):
    AIR = "AIR"
    TRAIN = "TRAIN"
    BUS = "BUS"
    CAR = "CAR"
    SELF_ARRANGED = "SELF_ARRANGED"


class TravelRequest(Base, TimestampMixin):
    __tablename__ = "travel_requests"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    employee_id = Column(String(36), ForeignKey("employees.id"), nullable=False)
    purpose = Column(Text, nullable=False)
    destination = Column(String(200), nullable=False)
    departure_date = Column(Date, nullable=False)
    return_date = Column(Date, nullable=False)
    travel_mode = Column(Enum(TravelMode), nullable=False)
    accommodation_required = Column(Boolean, default=False)
    estimated_budget = Column(Numeric(12, 2), nullable=True)
    advance_required = Column(Numeric(10, 2), nullable=True)
    itinerary = Column(JSONB, nullable=True)
    status = Column(Enum(ApprovalStatus), default=ApprovalStatus.PENDING)
    approver_id = Column(String(36), nullable=True)
    approver_remarks = Column(Text, nullable=True)
    approved_at = Column(DateTime, nullable=True)

    # Relationships
    employee = relationship("Employee", back_populates="travel_requests")
