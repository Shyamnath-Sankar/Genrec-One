from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from typing import Optional, List
from datetime import datetime
import uuid

from app.core.database import get_db
from app.core.security import get_current_employee, get_password_hash, is_super_admin
from app.models.user import User
from app.models.employee import Employee
from app.models.company import Department, Designation
from app.models.role import Role
from app.schemas.employee import (
    EmployeeCreate,
    EmployeeUpdate,
    EmployeeListResponse,
    EmployeeDetailResponse,
    DepartmentCreate,
    DepartmentResponse,
    DesignationCreate,
    DesignationResponse,
)
from app.schemas.auth import DataResponse, PaginatedResponse

router = APIRouter(prefix="/employees", tags=["Employees"])


@router.get("/without-user", response_model=DataResponse)
async def get_employees_without_user(
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get employees that don't have a user account yet"""
    result = await db.execute(
        select(Employee)
        .where(Employee.company_id == current_employee.company_id)
        .where(Employee.user_id == None)
        .order_by(Employee.first_name)
    )
    employees = result.scalars().all()

    data = [
        {
            "id": e.id,
            "firstName": e.first_name,
            "lastName": e.last_name,
            "email": e.work_email or f"{e.first_name.lower()}.{e.last_name.lower()}@company.com",
            "hasUser": False,
        }
        for e in employees
    ]

    return DataResponse(data=data)


@router.get("", response_model=PaginatedResponse)
async def list_employees(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    department_id: Optional[str] = None,
    status: Optional[str] = None,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """List all employees with pagination and filters"""
    query = (
        select(Employee)
        .options(
            selectinload(Employee.department),
            selectinload(Employee.designation),
            selectinload(Employee.reporting_manager),
            selectinload(Employee.user),
        )
        .where(Employee.company_id == current_employee.company_id)
    )

    # Apply filters
    if search:
        search_filter = or_(
            Employee.first_name.ilike(f"%{search}%"),
            Employee.last_name.ilike(f"%{search}%"),
            Employee.employee_id.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)

    if department_id:
        query = query.where(Employee.department_id == department_id)

    if status:
        query = query.where(Employee.employment_status == status)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Apply pagination
    query = query.offset((page - 1) * limit).limit(limit)
    query = query.order_by(Employee.first_name)

    result = await db.execute(query)
    employees = result.scalars().all()

    # Transform to response
    data = []
    for emp in employees:
        data.append({
            "id": emp.id,
            "employee_id": emp.employee_id,
            "first_name": emp.first_name,
            "last_name": emp.last_name,
            "email": emp.user.email if emp.user else None,
            "phone": emp.phone,
            "photo": emp.photo,
            "department_name": emp.department.name if emp.department else None,
            "designation_name": emp.designation.name if emp.designation else None,
            "date_of_joining": emp.date_of_joining,
            "employment_status": emp.employment_status.value if emp.employment_status else None,
            "employment_type": emp.employment_type.value if emp.employment_type else None,
            "reporting_manager_name": f"{emp.reporting_manager.first_name} {emp.reporting_manager.last_name}" if emp.reporting_manager else None,
        })

    return PaginatedResponse(
        data=data,
        total=total,
        page=page,
        limit=limit,
        total_pages=(total + limit - 1) // limit,
    )


@router.get("/{employee_id}", response_model=DataResponse)
async def get_employee(
    employee_id: str,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get employee details by ID"""
    result = await db.execute(
        select(Employee)
        .options(
            selectinload(Employee.department),
            selectinload(Employee.designation),
            selectinload(Employee.role),
            selectinload(Employee.company),
            selectinload(Employee.reporting_manager),
            selectinload(Employee.user),
        )
        .where(Employee.id == employee_id)
        .where(Employee.company_id == current_employee.company_id)
    )
    employee = result.scalar_one_or_none()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    data = {
        "id": employee.id,
        "employee_id": employee.employee_id,
        "first_name": employee.first_name,
        "last_name": employee.last_name,
        "middle_name": employee.middle_name,
        "email": employee.user.email if employee.user else None,
        "phone": employee.phone,
        "photo": employee.photo,
        "date_of_birth": employee.date_of_birth,
        "gender": employee.gender.value if employee.gender else None,
        "marital_status": employee.marital_status.value if employee.marital_status else None,
        "blood_group": employee.blood_group,
        "nationality": employee.nationality,
        "date_of_joining": employee.date_of_joining,
        "date_of_leaving": employee.date_of_leaving,
        "probation_end_date": employee.probation_end_date,
        "confirmation_date": employee.confirmation_date,
        "employment_type": employee.employment_type.value if employee.employment_type else None,
        "employment_status": employee.employment_status.value if employee.employment_status else None,
        "work_location": employee.work_location,
        "notice_period_days": employee.notice_period_days,
        "company_id": employee.company_id,
        "company_name": employee.company.name if employee.company else None,
        "department_id": employee.department_id,
        "department_name": employee.department.name if employee.department else None,
        "designation_id": employee.designation_id,
        "designation_name": employee.designation.name if employee.designation else None,
        "role_id": employee.role_id,
        "role_name": employee.role.name if employee.role else None,
        "reporting_manager_id": employee.reporting_manager_id,
        "reporting_manager_name": f"{employee.reporting_manager.first_name} {employee.reporting_manager.last_name}" if employee.reporting_manager else None,
        "personal_email": employee.personal_email,
        "work_email": employee.work_email,
        "alternate_phone": employee.alternate_phone,
        "current_address": employee.current_address,
        "permanent_address": employee.permanent_address,
        "emergency_contact": employee.emergency_contact,
        "bank_details": employee.bank_details,
        "pan_number": employee.pan_number,
        "aadhaar_number": employee.aadhaar_number,
        "pf_number": employee.pf_number,
        "esi_number": employee.esi_number,
        "uan_number": employee.uan_number,
        "custom_fields": employee.custom_fields,
        "created_at": employee.created_at,
        "updated_at": employee.updated_at,
    }

    return DataResponse(data=data)


@router.post("", response_model=DataResponse)
async def create_employee(
    data: EmployeeCreate,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Create a new employee"""
    # Check if email already exists
    existing = await db.execute(
        select(User).where(User.email == data.email)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Generate employee ID
    last_emp = await db.execute(
        select(Employee)
        .where(Employee.company_id == current_employee.company_id)
        .order_by(Employee.created_at.desc())
        .limit(1)
    )
    last_employee = last_emp.scalar_one_or_none()
    
    emp_num = 1
    if last_employee and last_employee.employee_id:
        try:
            emp_num = int(last_employee.employee_id.replace("EMP", "")) + 1
        except ValueError:
            pass
    employee_id = f"EMP{str(emp_num).zfill(5)}"

    # Create user
    user = User(
        id=str(uuid.uuid4()),
        email=data.email,
        password_hash=get_password_hash("Welcome@123"),  # Default password
        is_active=True,
        must_change_password=True,
    )
    db.add(user)
    await db.flush()

    # Create employee
    employee = Employee(
        id=str(uuid.uuid4()),
        employee_id=employee_id,
        user_id=user.id,
        company_id=current_employee.company_id,
        role_id=data.role_id,
        department_id=data.department_id,
        designation_id=data.designation_id,
        reporting_manager_id=data.reporting_manager_id,
        first_name=data.first_name,
        last_name=data.last_name,
        middle_name=data.middle_name,
        date_of_birth=data.date_of_birth,
        gender=data.gender,
        marital_status=data.marital_status,
        phone=data.phone,
        date_of_joining=data.date_of_joining,
        employment_type=data.employment_type,
        work_location=data.work_location,
        current_address=data.current_address.model_dump() if data.current_address else None,
        permanent_address=data.permanent_address.model_dump() if data.permanent_address else None,
        emergency_contact=data.emergency_contact.model_dump() if data.emergency_contact else None,
        bank_details=data.bank_details.model_dump() if data.bank_details else None,
        pan_number=data.pan_number,
        aadhaar_number=data.aadhaar_number,
    )
    db.add(employee)
    await db.commit()

    return DataResponse(
        message="Employee created successfully",
        data={"id": employee.id, "employee_id": employee_id},
    )


@router.put("/{employee_id}", response_model=DataResponse)
async def update_employee(
    employee_id: str,
    data: EmployeeUpdate,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Update employee details"""
    result = await db.execute(
        select(Employee)
        .where(Employee.id == employee_id)
        .where(Employee.company_id == current_employee.company_id)
    )
    employee = result.scalar_one_or_none()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(employee, field):
            if field in ["current_address", "permanent_address", "emergency_contact", "bank_details"]:
                setattr(employee, field, value.model_dump() if value else None)
            else:
                setattr(employee, field, value)

    await db.commit()

    return DataResponse(message="Employee updated successfully")


# Department routes
@router.get("/departments", response_model=DataResponse)
async def get_departments(
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """List all departments (simple endpoint)"""
    result = await db.execute(
        select(Department)
        .where(Department.company_id == current_employee.company_id)
        .where(Department.is_active == True)
        .order_by(Department.name)
    )
    departments = result.scalars().all()

    data = [
        {
            "id": dept.id,
            "name": dept.name,
            "code": dept.code,
            "description": dept.description,
        }
        for dept in departments
    ]

    return DataResponse(data=data)


@router.get("/departments/list", response_model=DataResponse)
async def list_departments(
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """List all departments"""
    result = await db.execute(
        select(Department)
        .where(Department.company_id == current_employee.company_id)
        .where(Department.is_active == True)
        .order_by(Department.name)
    )
    departments = result.scalars().all()

    # Get employee counts
    data = []
    for dept in departments:
        count_result = await db.execute(
            select(func.count())
            .select_from(Employee)
            .where(Employee.department_id == dept.id)
        )
        count = count_result.scalar() or 0
        
        data.append({
            "id": dept.id,
            "name": dept.name,
            "code": dept.code,
            "description": dept.description,
            "parent_id": dept.parent_id,
            "head_id": dept.head_id,
            "is_active": dept.is_active,
            "employee_count": count,
            "created_at": dept.created_at,
        })

    return DataResponse(data=data)


@router.post("/departments", response_model=DataResponse)
async def create_department(
    data: DepartmentCreate,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Create a new department"""
    department = Department(
        id=str(uuid.uuid4()),
        company_id=current_employee.company_id,
        name=data.name,
        code=data.code,
        description=data.description,
        parent_id=data.parent_id,
        head_id=data.head_id,
    )
    db.add(department)
    await db.commit()

    return DataResponse(
        message="Department created successfully",
        data={"id": department.id},
    )


# Designation routes
@router.get("/designations", response_model=DataResponse)
async def get_designations(
    department_id: Optional[str] = None,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """List all designations (simple endpoint)"""
    query = select(Designation).where(Designation.is_active == True)
    
    if department_id:
        query = query.where(Designation.department_id == department_id)
    
    query = query.order_by(Designation.level, Designation.name)
    
    result = await db.execute(query)
    designations = result.scalars().all()

    data = [
        {
            "id": d.id,
            "name": d.name,
            "code": d.code,
            "level": d.level,
        }
        for d in designations
    ]

    return DataResponse(data=data)


@router.get("/designations/list", response_model=DataResponse)
async def list_designations(
    department_id: Optional[str] = None,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """List all designations"""
    query = select(Designation).where(Designation.is_active == True)
    
    if department_id:
        query = query.where(Designation.department_id == department_id)
    
    query = query.order_by(Designation.level, Designation.name)
    
    result = await db.execute(query)
    designations = result.scalars().all()

    data = [
        {
            "id": d.id,
            "name": d.name,
            "code": d.code,
            "level": d.level,
            "description": d.description,
            "department_id": d.department_id,
            "is_active": d.is_active,
            "created_at": d.created_at,
        }
        for d in designations
    ]

    return DataResponse(data=data)


@router.post("/designations", response_model=DataResponse)
async def create_designation(
    data: DesignationCreate,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Create a new designation"""
    designation = Designation(
        id=str(uuid.uuid4()),
        name=data.name,
        code=data.code,
        level=str(data.level) if data.level else "1",
        description=data.description,
        department_id=data.department_id,
    )
    db.add(designation)
    await db.commit()

    return DataResponse(
        message="Designation created successfully",
        data={"id": designation.id},
    )
