from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from typing import Optional
from datetime import date, datetime
from calendar import monthrange

from app.core.database import get_db
from app.core.security import get_current_employee
from app.models.employee import Employee, EmploymentStatus
from app.models.attendance import Attendance, AttendanceStatus
from app.models.leave import LeaveApplication
from app.models.payroll import PayrollRun, PayrollDetail
from app.schemas.auth import DataResponse

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/attendance", response_model=DataResponse)
async def attendance_report(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020),
    department_id: Optional[str] = None,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get attendance report"""
    start_date = date(year, month, 1)
    _, last_day = monthrange(year, month)
    end_date = date(year, month, last_day)

    # Get employees
    emp_query = (
        select(Employee)
        .options(selectinload(Employee.department))
        .where(Employee.company_id == current_employee.company_id)
        .where(Employee.employment_status == EmploymentStatus.ACTIVE)
    )
    if department_id:
        emp_query = emp_query.where(Employee.department_id == department_id)

    emp_result = await db.execute(emp_query)
    employees = emp_result.scalars().all()

    report_data = []
    for emp in employees:
        # Get attendance records
        att_result = await db.execute(
            select(Attendance)
            .where(Attendance.employee_id == emp.id)
            .where(Attendance.date >= start_date)
            .where(Attendance.date <= end_date)
        )
        records = att_result.scalars().all()

        present = sum(1 for r in records if r.status == AttendanceStatus.PRESENT)
        absent = sum(1 for r in records if r.status == AttendanceStatus.ABSENT)
        half_days = sum(1 for r in records if r.status == AttendanceStatus.HALF_DAY)
        leaves = sum(1 for r in records if r.status == AttendanceStatus.ON_LEAVE)
        wfh = sum(1 for r in records if r.status == AttendanceStatus.WFH)
        late = sum(1 for r in records if r.status == AttendanceStatus.LATE)

        hours_list = [float(r.total_hours) for r in records if r.total_hours]
        avg_hours = sum(hours_list) / len(hours_list) if hours_list else 0

        report_data.append({
            "employee_id": emp.employee_id,
            "employee_name": f"{emp.first_name} {emp.last_name}",
            "department": emp.department.name if emp.department else None,
            "present": present,
            "absent": absent,
            "half_days": half_days,
            "leaves": leaves,
            "wfh": wfh,
            "late": late,
            "average_hours": round(avg_hours, 2),
        })

    return DataResponse(data={
        "month": month,
        "year": year,
        "total_working_days": last_day,
        "employees": report_data,
    })


@router.get("/leave", response_model=DataResponse)
async def leave_report(
    year: int = Query(..., ge=2020),
    department_id: Optional[str] = None,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get leave report"""
    # Get employees with leave balances
    emp_query = (
        select(Employee)
        .options(
            selectinload(Employee.department),
            selectinload(Employee.leave_balances),
        )
        .where(Employee.company_id == current_employee.company_id)
        .where(Employee.employment_status == EmploymentStatus.ACTIVE)
    )
    if department_id:
        emp_query = emp_query.where(Employee.department_id == department_id)

    emp_result = await db.execute(emp_query)
    employees = emp_result.scalars().all()

    report_data = []
    for emp in employees:
        balances = [b for b in emp.leave_balances if b.year == year]
        
        balance_data = []
        for b in balances:
            balance_data.append({
                "leave_type": b.leave_type.name if b.leave_type else None,
                "opening": float(b.opening_balance),
                "accrued": float(b.accrued),
                "utilized": float(b.utilized),
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
    """Get payroll report"""
    result = await db.execute(
        select(PayrollRun)
        .options(selectinload(PayrollRun.details).selectinload(PayrollDetail.employee))
        .where(PayrollRun.month == month)
        .where(PayrollRun.year == year)
    )
    payroll_run = result.scalar_one_or_none()

    if not payroll_run:
        return DataResponse(data=None)

    details = [
        {
            "employee_id": d.employee.employee_id,
            "employee_name": f"{d.employee.first_name} {d.employee.last_name}",
            "working_days": d.working_days,
            "present_days": float(d.present_days),
            "lop_days": float(d.lop_days),
            "gross_salary": float(d.gross_salary),
            "total_deductions": float(d.total_deductions),
            "net_salary": float(d.net_salary),
        }
        for d in payroll_run.details
    ]

    return DataResponse(data={
        "month": month,
        "year": year,
        "status": payroll_run.status.value,
        "total_gross": float(payroll_run.total_gross),
        "total_deductions": float(payroll_run.total_deductions),
        "total_net": float(payroll_run.total_net),
        "employee_count": payroll_run.employee_count,
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

    # Present today
    present_result = await db.execute(
        select(func.count())
        .select_from(Attendance)
        .join(Employee)
        .where(Employee.company_id == current_employee.company_id)
        .where(Attendance.date == today)
        .where(Attendance.status.in_([AttendanceStatus.PRESENT, AttendanceStatus.WFH]))
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

    # New joinees this month
    month_start = date(today.year, today.month, 1)
    new_joinees_result = await db.execute(
        select(func.count())
        .select_from(Employee)
        .where(Employee.company_id == current_employee.company_id)
        .where(Employee.date_of_joining >= month_start)
    )
    new_joinees = new_joinees_result.scalar() or 0

    return DataResponse(data={
        "total_employees": total_employees,
        "present_today": present_today,
        "on_leave": on_leave,
        "absent": total_employees - present_today - on_leave,
        "new_joinees_this_month": new_joinees,
    })
