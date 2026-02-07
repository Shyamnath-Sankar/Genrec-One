from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, case
from sqlalchemy.orm import selectinload
from typing import Optional
from datetime import date, datetime, timedelta
from calendar import monthrange

from app.core.database import get_db
from app.core.security import get_current_employee
from app.models.employee import Employee, EmploymentStatus
from app.models.attendance import Attendance, AttendanceStatus
from app.models.leave import LeaveApplication, LeaveBalance, LeaveType, Holiday
from app.models.payroll import PayrollRun, PayrollDetail
from app.schemas.auth import DataResponse

router = APIRouter(prefix="/reports", tags=["Reports"])


def calculate_working_days(year: int, month: int, holidays: list[date]) -> int:
    """Calculate working days in a month (excluding weekends and holidays)"""
    _, last_day = monthrange(year, month)
    working_days = 0
    holiday_dates = set(holidays)
    
    for day in range(1, last_day + 1):
        d = date(year, month, day)
        # Exclude Saturdays (5) and Sundays (6)
        if d.weekday() < 5 and d not in holiday_dates:
            working_days += 1
    
    return working_days


@router.get("/attendance", response_model=DataResponse)
async def attendance_report(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020),
    department_id: Optional[str] = None,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get attendance report - optimized with single query"""
    start_date = date(year, month, 1)
    _, last_day = monthrange(year, month)
    end_date = date(year, month, last_day)

    # Get holidays for the month
    holiday_result = await db.execute(
        select(Holiday.date)
        .where(Holiday.date >= start_date)
        .where(Holiday.date <= end_date)
    )
    holidays = [h for h in holiday_result.scalars().all()]
    working_days = calculate_working_days(year, month, holidays)

    # Build employee query with filter
    emp_filter = [
        Employee.company_id == current_employee.company_id,
        Employee.employment_status == EmploymentStatus.ACTIVE
    ]
    if department_id:
        emp_filter.append(Employee.department_id == department_id)

    # Single optimized query using subquery for attendance aggregation
    attendance_subquery = (
        select(
            Attendance.employee_id,
            func.sum(case((Attendance.status == AttendanceStatus.PRESENT, 1), else_=0)).label('present'),
            func.sum(case((Attendance.status == AttendanceStatus.ABSENT, 1), else_=0)).label('absent'),
            func.sum(case((Attendance.status == AttendanceStatus.HALF_DAY, 1), else_=0)).label('half_days'),
            func.sum(case((Attendance.status == AttendanceStatus.ON_LEAVE, 1), else_=0)).label('leaves'),
            func.sum(case((Attendance.status == AttendanceStatus.WFH, 1), else_=0)).label('wfh'),
            func.sum(case((Attendance.status == AttendanceStatus.LATE, 1), else_=0)).label('late'),
            func.avg(Attendance.total_hours).label('avg_hours'),
        )
        .where(Attendance.date >= start_date)
        .where(Attendance.date <= end_date)
        .group_by(Attendance.employee_id)
        .subquery()
    )

    # Join employees with attendance aggregation
    query = (
        select(
            Employee.employee_id,
            Employee.first_name,
            Employee.last_name,
            Employee.department,
            attendance_subquery.c.present,
            attendance_subquery.c.absent,
            attendance_subquery.c.half_days,
            attendance_subquery.c.leaves,
            attendance_subquery.c.wfh,
            attendance_subquery.c.late,
            attendance_subquery.c.avg_hours,
        )
        .outerjoin(attendance_subquery, Employee.id == attendance_subquery.c.employee_id)
        .options(selectinload(Employee.department))
        .where(and_(*emp_filter))
        .order_by(Employee.first_name)
    )

    result = await db.execute(query)
    rows = result.all()

    report_data = []
    for row in rows:
        report_data.append({
            "employee_id": row.employee_id,
            "employee_name": f"{row.first_name} {row.last_name}",
            "department": row.department.name if row.department else None,
            "present": int(row.present or 0),
            "absent": int(row.absent or 0),
            "half_days": int(row.half_days or 0),
            "leaves": int(row.leaves or 0),
            "wfh": int(row.wfh or 0),
            "late": int(row.late or 0),
            "average_hours": round(float(row.avg_hours or 0), 2),
        })

    return DataResponse(data={
        "month": month,
        "year": year,
        "total_working_days": working_days,
        "total_calendar_days": last_day,
        "holidays_count": len(holidays),
        "employees": report_data,
    })


@router.get("/leave", response_model=DataResponse)
async def leave_report(
    year: int = Query(..., ge=2020),
    department_id: Optional[str] = None,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get leave report with usage details"""
    # Build employee filter
    emp_filter = [
        Employee.company_id == current_employee.company_id,
        Employee.employment_status == EmploymentStatus.ACTIVE
    ]
    if department_id:
        emp_filter.append(Employee.department_id == department_id)

    # Get employees with leave balances eagerly loaded
    emp_query = (
        select(Employee)
        .options(
            selectinload(Employee.department),
            selectinload(Employee.leave_balances).selectinload(LeaveBalance.leave_type),
        )
        .where(and_(*emp_filter))
        .order_by(Employee.first_name)
    )

    emp_result = await db.execute(emp_query)
    employees = emp_result.scalars().all()

    # Get leave applications for the year (for usage breakdown)
    start_of_year = date(year, 1, 1)
    end_of_year = date(year, 12, 31)
    
    leave_app_result = await db.execute(
        select(
            LeaveApplication.employee_id,
            LeaveApplication.leave_type_id,
            func.sum(LeaveApplication.total_days).label('total_used')
        )
        .where(LeaveApplication.from_date >= start_of_year)
        .where(LeaveApplication.to_date <= end_of_year)
        .where(LeaveApplication.status == "APPROVED")
        .group_by(LeaveApplication.employee_id, LeaveApplication.leave_type_id)
    )
    leave_usage = {}
    for row in leave_app_result.all():
        key = (row.employee_id, row.leave_type_id)
        leave_usage[key] = float(row.total_used or 0)

    report_data = []
    for emp in employees:
        balances = [b for b in emp.leave_balances if b.year == year]
        
        balance_data = []
        for b in balances:
            usage_key = (emp.id, b.leave_type_id)
            balance_data.append({
                "leave_type": b.leave_type.name if b.leave_type else None,
                "leave_type_code": b.leave_type.code if b.leave_type else None,
                "opening": float(b.opening_balance),
                "accrued": float(b.accrued),
                "utilized": float(b.utilized),
                "used_this_year": leave_usage.get(usage_key, 0),
                "encashed": float(b.encashed) if hasattr(b, 'encashed') else 0,
                "lapsed": float(b.lapsed) if hasattr(b, 'lapsed') else 0,
                "balance": float(b.current_balance),
            })

        report_data.append({
            "employee_id": emp.employee_id,
            "employee_name": f"{emp.first_name} {emp.last_name}",
            "department": emp.department.name if emp.department else None,
            "balances": balance_data,
        })

    return DataResponse(data={
        "year": year,
        "employees": report_data,
    })


@router.get("/payroll", response_model=DataResponse)
async def payroll_report(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020),
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get payroll report - filtered by company"""
    # Try to filter by company_id first
    result = await db.execute(
        select(PayrollRun)
        .options(
            selectinload(PayrollRun.details)
            .selectinload(PayrollDetail.employee)
            .selectinload(Employee.department)
        )
        .where(PayrollRun.month == month)
        .where(PayrollRun.year == year)
    )
    payroll_runs = result.scalars().all()
    
    # Find the payroll run for the current company
    payroll_run = None
    for pr in payroll_runs:
        # Check if company_id exists and matches, or filter by employee company
        if hasattr(pr, 'company_id') and pr.company_id:
            if pr.company_id == current_employee.company_id:
                payroll_run = pr
                break
        else:
            # Fallback: check if any employee belongs to current company
            for d in pr.details:
                if d.employee.company_id == current_employee.company_id:
                    payroll_run = pr
                    break
            if payroll_run:
                break

    if not payroll_run:
        return DataResponse(data=None)

    # Filter details to only include employees from the same company
    details = [
        {
            "employee_id": d.employee.employee_id,
            "employee_name": f"{d.employee.first_name} {d.employee.last_name}",
            "department": d.employee.department.name if d.employee.department else None,
            "working_days": d.working_days,
            "present_days": float(d.present_days),
            "lop_days": float(d.lop_days),
            "gross_salary": float(d.gross_salary),
            "total_deductions": float(d.total_deductions),
            "net_salary": float(d.net_salary),
        }
        for d in payroll_run.details
        if d.employee.company_id == current_employee.company_id
    ]

    return DataResponse(data={
        "month": month,
        "year": year,
        "status": payroll_run.status.value,
        "total_gross": float(payroll_run.total_gross),
        "total_deductions": float(payroll_run.total_deductions),
        "total_net": float(payroll_run.total_net),
        "employee_count": len(details),
        "details": details,
    })


@router.get("/headcount", response_model=DataResponse)
async def headcount_report(
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get headcount report"""
    # Total by status
    status_result = await db.execute(
        select(Employee.employment_status, func.count(Employee.id))
        .where(Employee.company_id == current_employee.company_id)
        .group_by(Employee.employment_status)
    )
    by_status = dict(status_result.all())

    # Total by department
    dept_result = await db.execute(
        select(Employee)
        .options(selectinload(Employee.department))
        .where(Employee.company_id == current_employee.company_id)
        .where(Employee.employment_status == EmploymentStatus.ACTIVE)
    )
    employees = dept_result.scalars().all()

    by_department = {}
    for emp in employees:
        dept_name = emp.department.name if emp.department else "Unassigned"
        by_department[dept_name] = by_department.get(dept_name, 0) + 1

    # By employment type
    type_result = await db.execute(
        select(Employee.employment_type, func.count(Employee.id))
        .where(Employee.company_id == current_employee.company_id)
        .where(Employee.employment_status == EmploymentStatus.ACTIVE)
        .group_by(Employee.employment_type)
    )
    by_type = {str(k.value): v for k, v in type_result.all()}

    # By gender
    gender_result = await db.execute(
        select(Employee.gender, func.count(Employee.id))
        .where(Employee.company_id == current_employee.company_id)
        .where(Employee.employment_status == EmploymentStatus.ACTIVE)
        .group_by(Employee.gender)
    )
    by_gender = {str(k.value) if k else "Not Specified": v for k, v in gender_result.all()}

    total_active = sum(1 for emp in employees)

    return DataResponse(data={
        "total_active": total_active,
        "by_status": {str(k.value): v for k, v in by_status.items()},
        "by_department": by_department,
        "by_employment_type": by_type,
        "by_gender": by_gender,
    })


@router.get("/dashboard", response_model=DataResponse)
async def dashboard_stats(
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get dashboard statistics"""
    today = date.today()

    # Total employees
    total_result = await db.execute(
        select(func.count())
        .select_from(Employee)
        .where(Employee.company_id == current_employee.company_id)
        .where(Employee.employment_status == EmploymentStatus.ACTIVE)
    )
    total_employees = total_result.scalar() or 0

    # Present today (including PRESENT, WFH, LATE, ON_DUTY)
    present_result = await db.execute(
        select(func.count())
        .select_from(Attendance)
        .join(Employee)
        .where(Employee.company_id == current_employee.company_id)
        .where(Attendance.date == today)
        .where(Attendance.status.in_([
            AttendanceStatus.PRESENT, 
            AttendanceStatus.WFH,
            AttendanceStatus.LATE,
            AttendanceStatus.ON_DUTY,
        ]))
    )
    present_today = present_result.scalar() or 0

    # On leave today
    leave_result = await db.execute(
        select(func.count())
        .select_from(LeaveApplication)
        .join(Employee)
        .where(Employee.company_id == current_employee.company_id)
        .where(LeaveApplication.from_date <= today)
        .where(LeaveApplication.to_date >= today)
        .where(LeaveApplication.status == "APPROVED")
    )
    on_leave = leave_result.scalar() or 0

    # Check if today is a holiday or weekend
    is_weekend = today.weekday() >= 5
    holiday_result = await db.execute(
        select(func.count())
        .select_from(Holiday)
        .where(Holiday.date == today)
    )
    is_holiday = (holiday_result.scalar() or 0) > 0

    # New joinees this month
    month_start = date(today.year, today.month, 1)
    new_joinees_result = await db.execute(
        select(func.count())
        .select_from(Employee)
        .where(Employee.company_id == current_employee.company_id)
        .where(Employee.date_of_joining >= month_start)
    )
    new_joinees = new_joinees_result.scalar() or 0

    # Calculate absent - ensure it's never negative
    # Only count absents if it's a working day
    if is_weekend or is_holiday:
        absent = 0
    else:
        absent = max(0, total_employees - present_today - on_leave)

    return DataResponse(data={
        "total_employees": total_employees,
        "present_today": present_today,
        "on_leave": on_leave,
        "absent": absent,
        "new_joinees_this_month": new_joinees,
        "is_weekend": is_weekend,
        "is_holiday": is_holiday,
    })
