from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional
from datetime import datetime, date
from decimal import Decimal
import uuid

from app.core.database import get_db
from app.core.security import get_current_employee
from app.models.employee import Employee
from app.models.payroll import (
    SalaryComponent, SalaryDetail, SalaryDetailComponent,
    PayrollRun, PayrollDetail, PayrollComponent, Loan,
    SalaryComponentType, CalculationType, PayrollStatus
)
from app.schemas.payroll import (
    SalaryComponentCreate, SalaryComponentResponse,
    SalaryDetailCreate, SalaryDetailResponse,
    PayrollRunCreate, PayrollRunResponse, PayrollDetailResponse,
    LoanCreate, LoanResponse, PayslipData,
)
from app.schemas.auth import DataResponse, PaginatedResponse

router = APIRouter(prefix="/payroll", tags=["Payroll"])


@router.get("/components", response_model=DataResponse)
async def get_salary_components(
    db: AsyncSession = Depends(get_db),
):
    """Get all salary components"""
    result = await db.execute(
        select(SalaryComponent)
        .where(SalaryComponent.is_active == True)
        .order_by(SalaryComponent.order, SalaryComponent.name)
    )
    components = result.scalars().all()

    data = [
        {
            "id": c.id,
            "name": c.name,
            "code": c.code,
            "type": c.type.value,
            "calculation": c.calculation.value,
            "base_component": c.base_component,
            "percentage": float(c.percentage) if c.percentage else None,
            "is_taxable": c.is_taxable,
            "is_statutory": c.is_statutory,
            "is_active": c.is_active,
            "order": c.order,
        }
        for c in components
    ]

    return DataResponse(data=data)


@router.post("/components", response_model=DataResponse)
async def create_salary_component(
    data: SalaryComponentCreate,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Create a salary component"""
    component = SalaryComponent(
        id=str(uuid.uuid4()),
        name=data.name,
        code=data.code,
        type=data.type,
        calculation=data.calculation,
        base_component=data.base_component,
        percentage=Decimal(str(data.percentage)) if data.percentage else None,
        is_taxable=data.is_taxable,
        is_statutory=data.is_statutory,
        order=data.order,
    )
    db.add(component)
    await db.commit()

    return DataResponse(
        message="Salary component created",
        data={"id": component.id},
    )


@router.get("/my-salary", response_model=DataResponse)
async def get_my_salary(
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get current employee's salary details"""
    result = await db.execute(
        select(SalaryDetail)
        .options(selectinload(SalaryDetail.components).selectinload(SalaryDetailComponent.component))
        .where(SalaryDetail.employee_id == current_employee.id)
        .where(SalaryDetail.is_current == True)
    )
    salary = result.scalar_one_or_none()

    if not salary:
        return DataResponse(data=None)

    components = [
        {
            "id": c.id,
            "component_id": c.component_id,
            "name": c.component.name,
            "code": c.component.code,
            "type": c.component.type.value,
            "amount": float(c.amount),
        }
        for c in salary.components
    ]

    return DataResponse(data={
        "id": salary.id,
        "ctc": float(salary.ctc),
        "gross_salary": float(salary.gross_salary),
        "net_salary": float(salary.net_salary),
        "effective_from": salary.effective_from.isoformat(),
        "effective_to": salary.effective_to.isoformat() if salary.effective_to else None,
        "components": components,
    })


@router.get("/payslips", response_model=DataResponse)
async def get_my_payslips(
    year: int = Query(default=None),
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get employee's payslips"""
    if not year:
        year = date.today().year

    result = await db.execute(
        select(PayrollDetail)
        .join(PayrollRun)
        .where(PayrollDetail.employee_id == current_employee.id)
        .where(PayrollRun.year == year)
        .where(PayrollRun.status.in_([PayrollStatus.LOCKED, PayrollStatus.PAID]))
        .order_by(PayrollRun.month.desc())
    )
    payslips = result.scalars().all()

    data = [
        {
            "id": p.id,
            "month": p.payroll_run.month,
            "year": p.payroll_run.year,
            "gross_salary": float(p.gross_salary),
            "total_deductions": float(p.total_deductions),
            "net_salary": float(p.net_salary),
            "payslip_path": p.payslip_path,
            "status": p.payroll_run.status.value,
        }
        for p in payslips
    ]

    return DataResponse(data=data)


@router.get("/runs", response_model=PaginatedResponse)
async def get_payroll_runs(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    year: Optional[int] = None,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get payroll runs (admin only)"""
    query = select(PayrollRun)
    
    if year:
        query = query.where(PayrollRun.year == year)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(PayrollRun.year.desc(), PayrollRun.month.desc())
    query = query.offset((page - 1) * limit).limit(limit)

    result = await db.execute(query)
    runs = result.scalars().all()

    data = [
        {
            "id": r.id,
            "month": r.month,
            "year": r.year,
            "status": r.status.value,
            "total_gross": float(r.total_gross),
            "total_deductions": float(r.total_deductions),
            "total_net": float(r.total_net),
            "employee_count": r.employee_count,
            "processed_at": r.processed_at.isoformat() if r.processed_at else None,
            "locked_at": r.locked_at.isoformat() if r.locked_at else None,
            "paid_at": r.paid_at.isoformat() if r.paid_at else None,
        }
        for r in runs
    ]

    return PaginatedResponse(
        data=data,
        total=total,
        page=page,
        limit=limit,
        total_pages=(total + limit - 1) // limit,
    )


@router.post("/runs", response_model=DataResponse)
async def create_payroll_run(
    data: PayrollRunCreate,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Create a new payroll run"""
    # Check if already exists
    existing = await db.execute(
        select(PayrollRun)
        .where(PayrollRun.month == data.month)
        .where(PayrollRun.year == data.year)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail=f"Payroll for {data.month}/{data.year} already exists",
        )

    payroll_run = PayrollRun(
        id=str(uuid.uuid4()),
        month=data.month,
        year=data.year,
        status=PayrollStatus.DRAFT,
        total_gross=Decimal("0"),
        total_deductions=Decimal("0"),
        total_net=Decimal("0"),
        employee_count=0,
    )
    db.add(payroll_run)
    await db.commit()

    return DataResponse(
        message="Payroll run created",
        data={"id": payroll_run.id},
    )


@router.post("/runs/{run_id}/calculate", response_model=DataResponse)
async def calculate_payroll(
    run_id: str,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Calculate payroll for all employees"""
    result = await db.execute(
        select(PayrollRun).where(PayrollRun.id == run_id)
    )
    payroll_run = result.scalar_one_or_none()

    if not payroll_run:
        raise HTTPException(status_code=404, detail="Payroll run not found")

    if payroll_run.status not in [PayrollStatus.DRAFT, PayrollStatus.CALCULATED]:
        raise HTTPException(status_code=400, detail="Cannot recalculate locked payroll")

    # Get all active employees with salary details
    emp_result = await db.execute(
        select(Employee)
        .options(selectinload(Employee.salary_details).selectinload(SalaryDetail.components))
        .where(Employee.company_id == current_employee.company_id)
        .where(Employee.employment_status == "ACTIVE")
    )
    employees = emp_result.scalars().all()

    total_gross = Decimal("0")
    total_deductions = Decimal("0")
    total_net = Decimal("0")
    processed_count = 0

    for emp in employees:
        current_salary = next(
            (s for s in emp.salary_details if s.is_current),
            None
        )
        if not current_salary:
            continue

        # Simple calculation - in production would be more complex
        gross = current_salary.gross_salary
        deductions = current_salary.ctc - current_salary.net_salary
        net = current_salary.net_salary

        # Create or update payroll detail
        detail_result = await db.execute(
            select(PayrollDetail)
            .where(PayrollDetail.payroll_run_id == run_id)
            .where(PayrollDetail.employee_id == emp.id)
        )
        detail = detail_result.scalar_one_or_none()

        if detail:
            detail.gross_salary = gross
            detail.total_earnings = gross
            detail.total_deductions = deductions
            detail.net_salary = net
        else:
            detail = PayrollDetail(
                id=str(uuid.uuid4()),
                payroll_run_id=run_id,
                employee_id=emp.id,
                working_days=22,
                present_days=Decimal("22"),
                lop_days=Decimal("0"),
                gross_salary=gross,
                total_earnings=gross,
                total_deductions=deductions,
                net_salary=net,
                bank_account_no=emp.bank_details.get("account_number") if emp.bank_details else None,
                ifsc_code=emp.bank_details.get("ifsc_code") if emp.bank_details else None,
                created_at=datetime.utcnow(),
            )
            db.add(detail)

        total_gross += gross
        total_deductions += deductions
        total_net += net
        processed_count += 1

    payroll_run.total_gross = total_gross
    payroll_run.total_deductions = total_deductions
    payroll_run.total_net = total_net
    payroll_run.employee_count = processed_count
    payroll_run.status = PayrollStatus.CALCULATED
    payroll_run.processed_by_id = current_employee.id
    payroll_run.processed_at = datetime.utcnow()

    await db.commit()

    return DataResponse(
        message=f"Payroll calculated for {processed_count} employees",
        data={
            "employee_count": processed_count,
            "total_gross": float(total_gross),
            "total_net": float(total_net),
        },
    )


@router.get("/loans", response_model=DataResponse)
async def get_my_loans(
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get current employee's loans"""
    result = await db.execute(
        select(Loan)
        .where(Loan.employee_id == current_employee.id)
        .order_by(Loan.created_at.desc())
    )
    loans = result.scalars().all()

    data = [
        {
            "id": l.id,
            "loan_type": l.loan_type,
            "amount": float(l.amount),
            "interest_rate": float(l.interest_rate),
            "tenure": l.tenure,
            "emi_amount": float(l.emi_amount),
            "start_date": l.start_date.isoformat(),
            "end_date": l.end_date.isoformat(),
            "remaining_amount": float(l.remaining_amount),
            "status": l.status.value,
        }
        for l in loans
    ]

    return DataResponse(data=data)
