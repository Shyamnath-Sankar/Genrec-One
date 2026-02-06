"""
Analytics API Routes
Advanced dashboards, workforce analytics, predictive insights
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, extract
from sqlalchemy.orm import selectinload
from typing import Optional, List
from datetime import datetime, date, timedelta
from pydantic import BaseModel
from decimal import Decimal
import uuid
import io
import csv

from app.core.database import get_db
from app.core.security import get_current_employee
from app.models.employee import Employee, EmploymentStatus
from app.models.attendance import Attendance, AttendanceStatus
from app.models.leave import LeaveApplication, LeaveBalance, Holiday
from app.models.payroll import PayrollRun, PayrollDetail, SalaryDetail
from app.models.performance import AppraisalCycle, Appraisal, Goal
from app.models.recruitment import Job, Candidate, Interview
from app.models.analytics import (
    HeadcountSnapshot, AttritionAnalysis, EmployeeRiskScore,
    PerformanceDistribution, NineBoxAnalysis, BradfordScore,
    AttendanceAnalytics, PayrollAnalytics, RecruitmentAnalytics
)
from app.schemas.auth import DataResponse

router = APIRouter(prefix="/analytics", tags=["Analytics"])


# ==================== WORKFORCE ANALYTICS ====================

@router.get("/workforce/headcount", response_model=DataResponse)
async def get_headcount_analytics(
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get current headcount breakdown"""
    company_id = current_employee.company_id
    
    # Total employees
    total = await db.execute(
        select(func.count()).select_from(Employee).where(
            Employee.company_id == company_id,
            Employee.employment_status == EmploymentStatus.ACTIVE
        )
    )
    total_count = total.scalar() or 0
    
    # By gender
    gender_result = await db.execute(
        select(Employee.gender, func.count()).where(
            Employee.company_id == company_id,
            Employee.employment_status == EmploymentStatus.ACTIVE
        ).group_by(Employee.gender)
    )
    gender_breakdown = {str(row[0].value) if row[0] else "not_specified": row[1] for row in gender_result.all()}
    
    # By employment type
    type_result = await db.execute(
        select(Employee.employment_type, func.count()).where(
            Employee.company_id == company_id,
            Employee.employment_status == EmploymentStatus.ACTIVE
        ).group_by(Employee.employment_type)
    )
    type_breakdown = {str(row[0].value) if row[0] else "not_specified": row[1] for row in type_result.all()}
    
    # By department
    dept_result = await db.execute(
        select(Employee.department_id, func.count()).where(
            Employee.company_id == company_id,
            Employee.employment_status == EmploymentStatus.ACTIVE
        ).group_by(Employee.department_id)
    )
    dept_breakdown = {str(row[0]) if row[0] else "unassigned": row[1] for row in dept_result.all()}
    
    # On probation
    probation = await db.execute(
        select(func.count()).select_from(Employee).where(
            Employee.company_id == company_id,
            Employee.employment_status == EmploymentStatus.ACTIVE,
            Employee.probation_end_date > date.today()
        )
    )
    on_probation = probation.scalar() or 0
    
    # On notice
    notice = await db.execute(
        select(func.count()).select_from(Employee).where(
            Employee.company_id == company_id,
            Employee.employment_status == EmploymentStatus.ON_NOTICE
        )
    )
    on_notice = notice.scalar() or 0
    
    # New joiners this month
    first_of_month = date.today().replace(day=1)
    new_joiners = await db.execute(
        select(func.count()).select_from(Employee).where(
            Employee.company_id == company_id,
            Employee.date_of_joining >= first_of_month
        )
    )
    new_count = new_joiners.scalar() or 0
    
    # Exits this month
    exits = await db.execute(
        select(func.count()).select_from(Employee).where(
            Employee.company_id == company_id,
            Employee.date_of_leaving >= first_of_month,
            Employee.date_of_leaving <= date.today()
        )
    )
    exit_count = exits.scalar() or 0
    
    return DataResponse(data={
        "total_employees": total_count,
        "on_probation": on_probation,
        "on_notice": on_notice,
        "new_joiners_this_month": new_count,
        "exits_this_month": exit_count,
        "by_gender": gender_breakdown,
        "by_employment_type": type_breakdown,
        "by_department": dept_breakdown,
    })


@router.get("/workforce/trends", response_model=DataResponse)
async def get_headcount_trends(
    months: int = Query(12, ge=1, le=24),
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get headcount trends over time"""
    company_id = current_employee.company_id
    end_date = date.today()
    start_date = end_date - timedelta(days=months * 30)
    
    # Get snapshots
    result = await db.execute(
        select(HeadcountSnapshot).where(
            HeadcountSnapshot.company_id == company_id,
            HeadcountSnapshot.snapshot_date >= start_date
        ).order_by(HeadcountSnapshot.snapshot_date)
    )
    snapshots = result.scalars().all()
    
    data = [
        {
            "date": s.snapshot_date.isoformat(),
            "total": s.total_employees,
            "active": s.active_employees,
            "new_joiners": s.new_joiners,
            "exits": s.exits,
        }
        for s in snapshots
    ]
    
    return DataResponse(data=data)


@router.get("/workforce/attrition", response_model=DataResponse)
async def get_attrition_analytics(
    year: int = Query(default=None),
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get attrition analytics"""
    company_id = current_employee.company_id
    target_year = year or date.today().year
    
    # Calculate attrition rate
    start_of_year = date(target_year, 1, 1)
    end_of_year = date(target_year, 12, 31)
    today = date.today()
    end_date = min(end_of_year, today)
    
    # Average headcount
    avg_headcount_result = await db.execute(
        select(func.avg(HeadcountSnapshot.active_employees)).where(
            HeadcountSnapshot.company_id == company_id,
            HeadcountSnapshot.snapshot_date >= start_of_year,
            HeadcountSnapshot.snapshot_date <= end_date
        )
    )
    avg_headcount = avg_headcount_result.scalar() or 1
    
    # Total exits
    exits_result = await db.execute(
        select(func.count()).select_from(Employee).where(
            Employee.company_id == company_id,
            Employee.date_of_leaving >= start_of_year,
            Employee.date_of_leaving <= end_date
        )
    )
    total_exits = exits_result.scalar() or 0
    
    attrition_rate = (total_exits / avg_headcount) * 100 if avg_headcount else 0
    
    # Monthly breakdown
    monthly_exits = []
    for month in range(1, 13):
        month_start = date(target_year, month, 1)
        if month == 12:
            month_end = date(target_year + 1, 1, 1) - timedelta(days=1)
        else:
            month_end = date(target_year, month + 1, 1) - timedelta(days=1)
        
        if month_start > today:
            break
        
        result = await db.execute(
            select(func.count()).select_from(Employee).where(
                Employee.company_id == company_id,
                Employee.date_of_leaving >= month_start,
                Employee.date_of_leaving <= min(month_end, today)
            )
        )
        monthly_exits.append({
            "month": month,
            "exits": result.scalar() or 0,
        })
    
    return DataResponse(data={
        "year": target_year,
        "attrition_rate": round(attrition_rate, 2),
        "total_exits": total_exits,
        "average_headcount": round(float(avg_headcount), 0),
        "monthly_breakdown": monthly_exits,
    })


# ==================== ATTENDANCE ANALYTICS ====================

@router.get("/attendance/summary", response_model=DataResponse)
async def get_attendance_summary(
    month: int = Query(default=None, ge=1, le=12),
    year: int = Query(default=None),
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get attendance summary for a month"""
    company_id = current_employee.company_id
    target_month = month or date.today().month
    target_year = year or date.today().year
    
    # Get all attendance records for the month
    start_date = date(target_year, target_month, 1)
    if target_month == 12:
        end_date = date(target_year + 1, 1, 1) - timedelta(days=1)
    else:
        end_date = date(target_year, target_month + 1, 1) - timedelta(days=1)
    
    # Total present days
    present_result = await db.execute(
        select(func.count()).select_from(Attendance).join(Employee).where(
            Employee.company_id == company_id,
            Attendance.date >= start_date,
            Attendance.date <= end_date,
            Attendance.status == AttendanceStatus.PRESENT
        )
    )
    total_present = present_result.scalar() or 0
    
    # Late arrivals
    late_result = await db.execute(
        select(func.count()).select_from(Attendance).join(Employee).where(
            Employee.company_id == company_id,
            Attendance.date >= start_date,
            Attendance.date <= end_date,
            Attendance.status == AttendanceStatus.LATE
        )
    )
    total_late = late_result.scalar() or 0
    
    # Absent
    absent_result = await db.execute(
        select(func.count()).select_from(Attendance).join(Employee).where(
            Employee.company_id == company_id,
            Attendance.date >= start_date,
            Attendance.date <= end_date,
            Attendance.status == AttendanceStatus.ABSENT
        )
    )
    total_absent = absent_result.scalar() or 0
    
    # Average working hours
    avg_hours_result = await db.execute(
        select(func.avg(Attendance.total_hours)).join(Employee).where(
            Employee.company_id == company_id,
            Attendance.date >= start_date,
            Attendance.date <= end_date,
            Attendance.total_hours.isnot(None)
        )
    )
    avg_hours = avg_hours_result.scalar() or 0
    
    return DataResponse(data={
        "month": target_month,
        "year": target_year,
        "total_present_days": total_present,
        "total_late_arrivals": total_late,
        "total_absent_days": total_absent,
        "average_working_hours": round(float(avg_hours), 2) if avg_hours else 0,
        "attendance_rate": round((total_present / (total_present + total_absent)) * 100, 2) if (total_present + total_absent) > 0 else 0,
    })


@router.get("/attendance/bradford-scores", response_model=DataResponse)
async def get_bradford_scores(
    year: int = Query(default=None),
    threshold: int = Query(default=200),
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get Bradford Factor scores for employees
    
    Bradford Factor = S x S x D
    S = number of separate absence instances
    D = total number of days absent
    
    Higher scores indicate more disruptive absence patterns.
    Typical thresholds: 0-50 (low), 51-124 (medium), 125-399 (high), 400+ (critical)
    """
    company_id = current_employee.company_id
    target_year = year or date.today().year
    start_date = date(target_year, 1, 1)
    end_date = date(target_year, 12, 31)
    today = date.today()
    end_date = min(end_date, today)
    
    # Get all employees
    emp_result = await db.execute(
        select(Employee).where(
            Employee.company_id == company_id,
            Employee.employment_status == EmploymentStatus.ACTIVE
        )
    )
    employees = emp_result.scalars().all()
    
    scores = []
    for emp in employees:
        # Get absence records (approved leave + absent attendance)
        # Count separate instances (consecutive days count as one instance)
        attendance_result = await db.execute(
            select(Attendance.date).where(
                Attendance.employee_id == emp.id,
                Attendance.date >= start_date,
                Attendance.date <= end_date,
                Attendance.status == AttendanceStatus.ABSENT
            ).order_by(Attendance.date)
        )
        absent_dates = [row[0] for row in attendance_result.all()]
        
        # Count instances (breaks in consecutive dates = new instance)
        instances = 0
        total_days = len(absent_dates)
        if absent_dates:
            instances = 1
            for i in range(1, len(absent_dates)):
                if (absent_dates[i] - absent_dates[i-1]).days > 1:
                    instances += 1
        
        # Bradford Score = S² x D
        bradford = (instances * instances) * total_days
        
        if bradford > 0:
            risk_level = "low"
            if bradford > 400:
                risk_level = "critical"
            elif bradford > 125:
                risk_level = "high"
            elif bradford > 50:
                risk_level = "medium"
            
            scores.append({
                "employee_id": emp.id,
                "employee_name": f"{emp.first_name} {emp.last_name}",
                "department": emp.department.name if emp.department else None,
                "absence_instances": instances,
                "total_days_absent": total_days,
                "bradford_score": bradford,
                "risk_level": risk_level,
            })
    
    # Sort by score descending
    scores.sort(key=lambda x: x["bradford_score"], reverse=True)
    
    # Summary
    high_risk = len([s for s in scores if s["bradford_score"] >= threshold])
    
    return DataResponse(data={
        "year": target_year,
        "threshold": threshold,
        "high_risk_count": high_risk,
        "scores": scores,
    })


# ==================== LEAVE ANALYTICS ====================

@router.get("/leave/sandwich-detection", response_model=DataResponse)
async def detect_sandwich_leaves(
    month: int = Query(default=None, ge=1, le=12),
    year: int = Query(default=None),
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Detect potential sandwich leaves (leaves taken around weekends/holidays)
    
    Sandwich leave: When an employee takes leave on Friday and Monday, 
    making the weekend count as leave days in some policies.
    """
    company_id = current_employee.company_id
    target_month = month or date.today().month
    target_year = year or date.today().year
    
    start_date = date(target_year, target_month, 1)
    if target_month == 12:
        end_date = date(target_year + 1, 1, 1) - timedelta(days=1)
    else:
        end_date = date(target_year, target_month + 1, 1) - timedelta(days=1)
    
    # Get holidays in the period
    holiday_result = await db.execute(
        select(Holiday.date).where(
            Holiday.date >= start_date,
            Holiday.date <= end_date
        )
    )
    holidays = set(row[0] for row in holiday_result.all())
    
    # Get approved leaves
    leave_result = await db.execute(
        select(LeaveApplication).join(Employee).where(
            Employee.company_id == company_id,
            LeaveApplication.from_date <= end_date,
            LeaveApplication.to_date >= start_date,
            LeaveApplication.status == "approved"
        ).options(selectinload(LeaveApplication.employee))
    )
    leaves = leave_result.scalars().all()
    
    sandwich_leaves = []
    
    for leave in leaves:
        from_date = max(leave.from_date, start_date)
        to_date = min(leave.to_date, end_date)
        
        # Check if leave spans around a weekend
        day_before = from_date - timedelta(days=1)
        day_after = to_date + timedelta(days=1)
        
        is_sandwich = False
        sandwich_type = None
        
        # Friday-Monday sandwich (leave on Friday, weekend, leave on Monday)
        if from_date.weekday() == 4 and to_date.weekday() == 0:  # Friday to Monday
            is_sandwich = True
            sandwich_type = "weekend_sandwich"
        
        # Thursday-Monday (long weekend sandwich)
        if from_date.weekday() == 3 and to_date.weekday() == 0:
            is_sandwich = True
            sandwich_type = "extended_weekend_sandwich"
        
        # Leave around holiday
        if day_before in holidays or day_after in holidays:
            is_sandwich = True
            sandwich_type = "holiday_sandwich"
        
        if is_sandwich:
            sandwich_leaves.append({
                "leave_id": leave.id,
                "employee_id": leave.employee_id,
                "employee_name": f"{leave.employee.first_name} {leave.employee.last_name}",
                "from_date": leave.from_date.isoformat(),
                "to_date": leave.to_date.isoformat(),
                "total_days": float(leave.total_days),
                "sandwich_type": sandwich_type,
            })
    
    return DataResponse(data={
        "month": target_month,
        "year": target_year,
        "sandwich_leaves_count": len(sandwich_leaves),
        "sandwich_leaves": sandwich_leaves,
    })


# ==================== PERFORMANCE ANALYTICS ====================

@router.get("/performance/distribution", response_model=DataResponse)
async def get_performance_distribution(
    cycle_id: str,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get performance rating distribution (for bell curve analysis)"""
    company_id = current_employee.company_id
    
    # Get appraisals for the cycle
    result = await db.execute(
        select(Appraisal.final_rating, func.count()).join(Employee).where(
            Employee.company_id == company_id,
            Appraisal.cycle_id == cycle_id,
            Appraisal.final_rating.isnot(None)
        ).group_by(Appraisal.final_rating)
    )
    distribution = {str(row[0]): row[1] for row in result.all()}
    
    # Calculate statistics
    ratings_result = await db.execute(
        select(Appraisal.final_rating).join(Employee).where(
            Employee.company_id == company_id,
            Appraisal.cycle_id == cycle_id,
            Appraisal.final_rating.isnot(None)
        )
    )
    ratings = [float(row[0]) for row in ratings_result.all()]
    
    if ratings:
        mean = sum(ratings) / len(ratings)
        variance = sum((x - mean) ** 2 for x in ratings) / len(ratings)
        std_dev = variance ** 0.5
    else:
        mean = 0
        std_dev = 0
    
    # Expected bell curve distribution (example: 5-point scale)
    expected = {
        "1": 5,   # 5% - Needs Improvement
        "2": 15,  # 15% - Below Expectations
        "3": 50,  # 50% - Meets Expectations
        "4": 25,  # 25% - Exceeds Expectations
        "5": 5,   # 5% - Outstanding
    }
    
    return DataResponse(data={
        "cycle_id": cycle_id,
        "total_rated": len(ratings),
        "distribution": distribution,
        "mean": round(mean, 2),
        "std_deviation": round(std_dev, 2),
        "expected_distribution": expected,
    })


@router.get("/performance/nine-box", response_model=DataResponse)
async def get_nine_box_matrix(
    cycle_id: str,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get 9-box matrix data
    
    9-Box plots employees on a 3x3 grid:
    - X-axis: Performance (Low, Medium, High)
    - Y-axis: Potential (Low, Medium, High)
    
    Boxes:
    7: High Potential, Low Performance (Enigma)
    8: High Potential, Medium Performance (Growth Employee)
    9: High Potential, High Performance (Star)
    4: Medium Potential, Low Performance (Underperformer)
    5: Medium Potential, Medium Performance (Core Player)
    6: Medium Potential, High Performance (High Performer)
    1: Low Potential, Low Performance (Talent Risk)
    2: Low Potential, Medium Performance (Average Performer)
    3: Low Potential, High Performance (Solid Performer)
    """
    company_id = current_employee.company_id
    
    # Get appraisals with ratings
    result = await db.execute(
        select(Appraisal).join(Employee).where(
            Employee.company_id == company_id,
            Appraisal.cycle_id == cycle_id,
            Appraisal.final_rating.isnot(None)
        ).options(selectinload(Appraisal.employee))
    )
    appraisals = result.scalars().all()
    
    # Categorize into boxes
    # Assuming 5-point scale: 1-2 = Low, 3 = Medium, 4-5 = High
    def get_level(rating):
        if rating is None:
            return "medium"
        if rating <= 2:
            return "low"
        elif rating <= 3.5:
            return "medium"
        else:
            return "high"
    
    boxes = {str(i): [] for i in range(1, 10)}
    box_mapping = {
        ("low", "low"): "1",
        ("medium", "low"): "2",
        ("high", "low"): "3",
        ("low", "medium"): "4",
        ("medium", "medium"): "5",
        ("high", "medium"): "6",
        ("low", "high"): "7",
        ("medium", "high"): "8",
        ("high", "high"): "9",
    }
    
    for appraisal in appraisals:
        performance = get_level(appraisal.final_rating)
        # For potential, we'd ideally have a separate potential assessment
        # Using manager_rating as a proxy for potential here
        potential = get_level(appraisal.manager_rating)
        
        box = box_mapping.get((performance, potential), "5")
        boxes[box].append({
            "employee_id": appraisal.employee_id,
            "performance_rating": float(appraisal.final_rating) if appraisal.final_rating else None,
            "potential_rating": float(appraisal.manager_rating) if appraisal.manager_rating else None,
        })
    
    box_counts = {k: len(v) for k, v in boxes.items()}
    
    return DataResponse(data={
        "cycle_id": cycle_id,
        "total_employees": len(appraisals),
        "box_counts": box_counts,
        "box_details": boxes,
        "box_labels": {
            "1": "Talent Risk",
            "2": "Average Performer",
            "3": "Solid Performer",
            "4": "Underperformer",
            "5": "Core Player",
            "6": "High Performer",
            "7": "Enigma",
            "8": "Growth Employee",
            "9": "Star",
        },
    })


# ==================== PAYROLL ANALYTICS ====================

@router.get("/payroll/summary", response_model=DataResponse)
async def get_payroll_summary(
    year: int = Query(default=None),
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get payroll summary for the year"""
    company_id = current_employee.company_id
    target_year = year or date.today().year
    
    # Get payroll runs for the year
    result = await db.execute(
        select(PayrollRun).where(
            PayrollRun.year == target_year
        ).options(selectinload(PayrollRun.details))
    )
    runs = result.scalars().all()
    
    monthly_data = []
    total_gross = Decimal(0)
    total_net = Decimal(0)
    
    for run in runs:
        month_gross = run.total_gross or Decimal(0)
        month_net = run.total_net or Decimal(0)
        total_gross += month_gross
        total_net += month_net
        
        monthly_data.append({
            "month": run.month,
            "status": run.status.value if run.status else None,
            "employee_count": run.employee_count or 0,
            "total_gross": float(month_gross),
            "total_net": float(month_net),
            "total_deductions": float(run.total_deductions or 0),
        })
    
    # Sort by month
    monthly_data.sort(key=lambda x: x["month"])
    
    return DataResponse(data={
        "year": target_year,
        "total_gross": float(total_gross),
        "total_net": float(total_net),
        "monthly_breakdown": monthly_data,
    })


@router.get("/payroll/export-bank-file", response_model=None)
async def export_bank_file(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(...),
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Export bank transfer file for payroll (CSV format)"""
    company_id = current_employee.company_id
    
    # Get payroll details
    result = await db.execute(
        select(PayrollDetail).join(PayrollRun).join(Employee).where(
            PayrollRun.month == month,
            PayrollRun.year == year,
            Employee.company_id == company_id
        ).options(selectinload(PayrollDetail.employee))
    )
    details = result.scalars().all()
    
    if not details:
        raise HTTPException(status_code=404, detail="No payroll data found for the specified period")
    
    # Create CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "Employee ID",
        "Employee Name",
        "Bank Account Number",
        "IFSC Code",
        "Net Salary",
        "Payment Mode"
    ])
    
    # Data
    for detail in details:
        emp = detail.employee
        writer.writerow([
            emp.employee_id,
            f"{emp.first_name} {emp.last_name}",
            detail.bank_account_no or "",
            detail.ifsc_code or "",
            float(detail.net_salary or 0),
            "NEFT"
        ])
    
    output.seek(0)
    
    filename = f"bank_transfer_{year}_{month:02d}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ==================== RECRUITMENT ANALYTICS ====================

@router.get("/recruitment/funnel", response_model=DataResponse)
async def get_recruitment_funnel(
    job_id: Optional[str] = None,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get recruitment funnel metrics"""
    company_id = current_employee.company_id
    
    query = select(Candidate).join(Job).where(Job.company_id == company_id)
    
    if job_id:
        query = query.where(Candidate.job_id == job_id)
    
    result = await db.execute(query)
    candidates = result.scalars().all()
    
    # Count by stage
    stages = {
        "applied": 0,
        "screening": 0,
        "interview": 0,
        "offer": 0,
        "hired": 0,
        "rejected": 0,
        "withdrawn": 0,
    }
    
    for c in candidates:
        stage = c.stage.value.lower() if c.stage else "applied"
        if stage in stages:
            stages[stage] += 1
        else:
            stages["applied"] += 1
    
    total = len(candidates)
    
    # Conversion rates
    conversion_rates = {}
    if total > 0:
        conversion_rates["applied_to_screening"] = round((stages.get("screening", 0) / total) * 100, 2)
    if stages.get("screening", 0) > 0:
        conversion_rates["screening_to_interview"] = round((stages.get("interview", 0) / stages["screening"]) * 100, 2)
    if stages.get("interview", 0) > 0:
        conversion_rates["interview_to_offer"] = round((stages.get("offer", 0) / stages["interview"]) * 100, 2)
    if stages.get("offer", 0) > 0:
        conversion_rates["offer_to_hired"] = round((stages.get("hired", 0) / stages["offer"]) * 100, 2)
    
    return DataResponse(data={
        "total_candidates": total,
        "funnel": stages,
        "conversion_rates": conversion_rates,
    })


# ==================== DASHBOARD KPIs ====================

@router.get("/dashboard/kpis", response_model=DataResponse)
async def get_dashboard_kpis(
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get key performance indicators for dashboard"""
    company_id = current_employee.company_id
    today = date.today()
    
    # Headcount
    headcount_result = await db.execute(
        select(func.count()).select_from(Employee).where(
            Employee.company_id == company_id,
            Employee.employment_status == EmploymentStatus.ACTIVE
        )
    )
    headcount = headcount_result.scalar() or 0
    
    # Today's attendance
    attendance_result = await db.execute(
        select(func.count()).select_from(Attendance).join(Employee).where(
            Employee.company_id == company_id,
            Attendance.date == today,
            Attendance.status.in_([AttendanceStatus.PRESENT, AttendanceStatus.LATE])
        )
    )
    present_today = attendance_result.scalar() or 0
    
    # Pending leaves
    pending_leaves_result = await db.execute(
        select(func.count()).select_from(LeaveApplication).join(Employee).where(
            Employee.company_id == company_id,
            LeaveApplication.status == "pending"
        )
    )
    pending_leaves = pending_leaves_result.scalar() or 0
    
    # Open positions
    open_positions_result = await db.execute(
        select(func.count()).select_from(Job).where(
            Job.company_id == company_id,
            Job.status == "published"
        )
    )
    open_positions = open_positions_result.scalar() or 0
    
    # New joiners this month
    first_of_month = today.replace(day=1)
    new_joiners_result = await db.execute(
        select(func.count()).select_from(Employee).where(
            Employee.company_id == company_id,
            Employee.date_of_joining >= first_of_month
        )
    )
    new_joiners = new_joiners_result.scalar() or 0
    
    # On notice
    notice_result = await db.execute(
        select(func.count()).select_from(Employee).where(
            Employee.company_id == company_id,
            Employee.employment_status == EmploymentStatus.ON_NOTICE
        )
    )
    on_notice = notice_result.scalar() or 0
    
    return DataResponse(data={
        "headcount": headcount,
        "present_today": present_today,
        "attendance_rate": round((present_today / headcount) * 100, 1) if headcount > 0 else 0,
        "pending_leaves": pending_leaves,
        "open_positions": open_positions,
        "new_joiners_this_month": new_joiners,
        "on_notice": on_notice,
    })
