from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime, time
from enum import Enum


class AttendanceStatus(str, Enum):
    PRESENT = "PRESENT"
    ABSENT = "ABSENT"
    HALF_DAY = "HALF_DAY"
    ON_LEAVE = "ON_LEAVE"
    HOLIDAY = "HOLIDAY"
    WEEK_OFF = "WEEK_OFF"
    WFH = "WFH"
    ON_DUTY = "ON_DUTY"
    LATE = "LATE"


class AttendanceSource(str, Enum):
    WEB = "WEB"
    MOBILE = "MOBILE"
    BIOMETRIC = "BIOMETRIC"
    MANUAL = "MANUAL"
    REGULARIZATION = "REGULARIZATION"


class CheckInRequest(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    selfie_base64: Optional[str] = None
    device_info: Optional[str] = None
    source: AttendanceSource = AttendanceSource.WEB


class CheckOutRequest(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    remarks: Optional[str] = None


class AttendanceRegularizationRequest(BaseModel):
    date: date
    check_in_time: datetime
    check_out_time: datetime
    reason: str = Field(..., min_length=1, max_length=500)


class AttendanceResponse(BaseModel):
    id: str
    employee_id: str
    date: date
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    total_hours: Optional[float] = None
    status: AttendanceStatus
    source: AttendanceSource
    is_regularized: bool = False
    remarks: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AttendanceListResponse(BaseModel):
    id: str
    employee_id: str
    employee_name: str
    date: date
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    total_hours: Optional[float] = None
    status: AttendanceStatus
    source: AttendanceSource

    class Config:
        from_attributes = True


class AttendanceSummary(BaseModel):
    total_days: int
    present_days: int
    absent_days: int
    half_days: int
    leave_days: int
    holidays: int
    week_offs: int
    wfh_days: int
    late_days: int
    average_hours: float


# Leave Schemas
class AccrualType(str, Enum):
    YEARLY = "YEARLY"
    MONTHLY = "MONTHLY"
    QUARTERLY = "QUARTERLY"
    NONE = "NONE"


class HalfDayType(str, Enum):
    FIRST_HALF = "FIRST_HALF"
    SECOND_HALF = "SECOND_HALF"


class ApprovalStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"


class LeaveTypeCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    code: str = Field(..., min_length=1, max_length=20)
    description: Optional[str] = None
    color: Optional[str] = None
    annual_quota: float = Field(..., ge=0)
    accrual_type: AccrualType = AccrualType.YEARLY
    carry_forward_limit: Optional[float] = None
    encashment_allowed: bool = False
    is_paid_leave: bool = True
    requires_document: bool = False
    min_days: float = 0.5
    max_days: Optional[float] = None
    advance_notice_days: int = 0


class LeaveTypeResponse(BaseModel):
    id: str
    name: str
    code: str
    description: Optional[str] = None
    color: Optional[str] = None
    annual_quota: float
    accrual_type: AccrualType
    carry_forward_limit: Optional[float] = None
    encashment_allowed: bool
    is_paid_leave: bool
    requires_document: bool
    is_active: bool

    class Config:
        from_attributes = True


class LeaveApplicationCreate(BaseModel):
    leave_type_id: str
    from_date: date
    to_date: date
    is_half_day: bool = False
    half_day_type: Optional[HalfDayType] = None
    reason: str = Field(..., min_length=1, max_length=500)


class LeaveApplicationResponse(BaseModel):
    id: str
    employee_id: str
    employee_name: Optional[str] = None
    leave_type_id: str
    leave_type_name: str
    from_date: date
    to_date: date
    total_days: float
    is_half_day: bool
    half_day_type: Optional[HalfDayType] = None
    reason: str
    document_path: Optional[str] = None
    status: ApprovalStatus
    approver_id: Optional[str] = None
    approver_name: Optional[str] = None
    approver_remarks: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class LeaveBalanceResponse(BaseModel):
    leave_type_id: str
    leave_type_name: str
    leave_type_code: str
    color: Optional[str] = None
    year: int
    opening_balance: float
    accrued: float
    utilized: float
    encashed: float
    lapsed: float
    adjustment: float
    current_balance: float

    class Config:
        from_attributes = True


class HolidayCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    date: date
    type: str = "NATIONAL"
    is_optional: bool = False
    description: Optional[str] = None


class HolidayUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    date: Optional[date] = None
    type: Optional[str] = None
    is_optional: Optional[bool] = None
    description: Optional[str] = None


class HolidayResponse(BaseModel):
    id: str
    name: str
    date: date
    type: str
    is_optional: bool
    description: Optional[str] = None

    class Config:
        from_attributes = True
