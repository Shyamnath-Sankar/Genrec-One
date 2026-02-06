"""
Database Seeder - Seeds initial data for the HRMS system
Run with: python -m app.seed
"""
import asyncio
from datetime import datetime, date
from decimal import Decimal
import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.core.security import get_password_hash
from app.models.user import User
from app.models.role import Role, Permission, RolePermission
from app.models.company import Company, Department, Designation
from app.models.employee import Employee, EmploymentType, EmploymentStatus
from app.models.leave import LeaveType, AccrualType
from app.models.shift import Shift
from app.models.payroll import SalaryComponent, SalaryComponentType, CalculationType
from app.models.expense import ExpenseCategory
from app.models.asset import AssetCategory
from app.models.ticket import TicketCategory


# Permission definitions - (module, slug, name)
PERMISSIONS = [
    # Dashboard
    ("dashboard", "dashboard.view", "View Dashboard"),
    # Employees
    ("employees", "employees.view", "View Employees"),
    ("employees", "employees.create", "Create Employees"),
    ("employees", "employees.edit", "Edit Employees"),
    ("employees", "employees.delete", "Delete Employees"),
    ("employees", "employees.export", "Export Employees"),
    # Departments
    ("departments", "departments.view", "View Departments"),
    ("departments", "departments.create", "Create Departments"),
    ("departments", "departments.edit", "Edit Departments"),
    ("departments", "departments.delete", "Delete Departments"),
    # Attendance
    ("attendance", "attendance.view_own", "View Own Attendance"),
    ("attendance", "attendance.view_team", "View Team Attendance"),
    ("attendance", "attendance.view_all", "View All Attendance"),
    ("attendance", "attendance.mark", "Mark Attendance"),
    ("attendance", "attendance.regularize", "Request Regularization"),
    ("attendance", "attendance.approve", "Approve Attendance"),
    # Leaves
    ("leaves", "leaves.view_own", "View Own Leaves"),
    ("leaves", "leaves.view_team", "View Team Leaves"),
    ("leaves", "leaves.view_all", "View All Leaves"),
    ("leaves", "leaves.apply", "Apply Leave"),
    ("leaves", "leaves.approve", "Approve Leaves"),
    ("leaves", "leaves.manage_types", "Manage Leave Types"),
    ("leaves", "leaves.adjust_balance", "Adjust Leave Balance"),
    # Payroll
    ("payroll", "payroll.view_own", "View Own Payroll"),
    ("payroll", "payroll.view_all", "View All Payroll"),
    ("payroll", "payroll.process", "Process Payroll"),
    ("payroll", "payroll.configure", "Configure Payroll"),
    # Timesheets
    ("timesheets", "timesheets.view_own", "View Own Timesheets"),
    ("timesheets", "timesheets.view_team", "View Team Timesheets"),
    ("timesheets", "timesheets.view_all", "View All Timesheets"),
    ("timesheets", "timesheets.submit", "Submit Timesheets"),
    ("timesheets", "timesheets.approve", "Approve Timesheets"),
    # Expenses
    ("expenses", "expenses.view_own", "View Own Expenses"),
    ("expenses", "expenses.view_team", "View Team Expenses"),
    ("expenses", "expenses.view_all", "View All Expenses"),
    ("expenses", "expenses.submit", "Submit Expenses"),
    ("expenses", "expenses.approve", "Approve Expenses"),
    # Recruitment
    ("recruitment", "recruitment.view", "View Recruitment"),
    ("recruitment", "recruitment.manage_jobs", "Manage Jobs"),
    ("recruitment", "recruitment.manage_candidates", "Manage Candidates"),
    ("recruitment", "recruitment.interview", "Conduct Interviews"),
    ("recruitment", "recruitment.offer", "Make Offers"),
    # Performance
    ("performance", "performance.view_own", "View Own Performance"),
    ("performance", "performance.view_team", "View Team Performance"),
    ("performance", "performance.view_all", "View All Performance"),
    ("performance", "performance.manage_goals", "Manage Goals"),
    ("performance", "performance.conduct_review", "Conduct Reviews"),
    ("performance", "performance.calibrate", "Calibrate Ratings"),
    # Assets
    ("assets", "assets.view", "View Assets"),
    ("assets", "assets.manage", "Manage Assets"),
    ("assets", "assets.assign", "Assign Assets"),
    # Helpdesk
    ("helpdesk", "helpdesk.view_own", "View Own Tickets"),
    ("helpdesk", "helpdesk.view_all", "View All Tickets"),
    ("helpdesk", "helpdesk.create", "Create Tickets"),
    ("helpdesk", "helpdesk.resolve", "Resolve Tickets"),
    # Travel
    ("travel", "travel.view_own", "View Own Travel"),
    ("travel", "travel.view_team", "View Team Travel"),
    ("travel", "travel.view_all", "View All Travel"),
    ("travel", "travel.request", "Request Travel"),
    ("travel", "travel.approve", "Approve Travel"),
    # Documents
    ("documents", "documents.view_own", "View Own Documents"),
    ("documents", "documents.view_all", "View All Documents"),
    ("documents", "documents.upload", "Upload Documents"),
    ("documents", "documents.manage", "Manage Documents"),
    # Reports
    ("reports", "reports.view", "View Reports"),
    ("reports", "reports.export", "Export Reports"),
    ("reports", "reports.custom", "Create Custom Reports"),
    # Settings
    ("settings", "settings.view", "View Settings"),
    ("settings", "settings.company", "Manage Company Settings"),
    ("settings", "settings.policies", "Manage Policies"),
    ("settings", "settings.workflows", "Manage Workflows"),
    # Users & Roles
    ("users", "users.view", "View Users"),
    ("users", "users.manage", "Manage Users"),
    ("roles", "roles.view", "View Roles"),
    ("roles", "roles.manage", "Manage Roles"),
]

# Role permission mappings
ROLE_PERMISSIONS = {
    "Super Admin": "ALL",  # All permissions with full CRUD
    
    "HR Admin": [
        # Dashboard
        ("dashboard.view", True, True, True, False),
        # Employees - Full management
        ("employees.view", True, True, True, True),
        ("employees.create", True, True, True, True),
        ("employees.edit", True, True, True, True),
        ("employees.delete", True, True, True, True),
        ("employees.export", True, True, True, False),
        # Departments
        ("departments.view", True, True, True, True),
        ("departments.create", True, True, True, True),
        ("departments.edit", True, True, True, True),
        ("departments.delete", True, True, True, True),
        # Attendance - Full access
        ("attendance.view_own", True, True, True, False),
        ("attendance.view_team", True, True, True, False),
        ("attendance.view_all", True, True, True, True),
        ("attendance.mark", True, True, True, False),
        ("attendance.regularize", True, True, True, False),
        ("attendance.approve", True, True, True, True),
        # Leaves - Full management
        ("leaves.view_own", True, True, True, False),
        ("leaves.view_team", True, True, True, False),
        ("leaves.view_all", True, True, True, True),
        ("leaves.apply", True, True, True, False),
        ("leaves.approve", True, True, True, True),
        ("leaves.manage_types", True, True, True, True),
        ("leaves.adjust_balance", True, True, True, True),
        # Payroll - View and configure
        ("payroll.view_own", True, True, True, False),
        ("payroll.view_all", True, True, True, False),
        ("payroll.process", True, True, True, False),
        ("payroll.configure", True, True, True, True),
        # Recruitment - Full access
        ("recruitment.view", True, True, True, True),
        ("recruitment.manage_jobs", True, True, True, True),
        ("recruitment.manage_candidates", True, True, True, True),
        ("recruitment.interview", True, True, True, False),
        ("recruitment.offer", True, True, True, True),
        # Performance - Full access
        ("performance.view_own", True, True, True, False),
        ("performance.view_team", True, True, True, False),
        ("performance.view_all", True, True, True, True),
        ("performance.manage_goals", True, True, True, True),
        ("performance.conduct_review", True, True, True, True),
        ("performance.calibrate", True, True, True, True),
        # Assets
        ("assets.view", True, True, True, True),
        ("assets.manage", True, True, True, True),
        ("assets.assign", True, True, True, True),
        # Reports
        ("reports.view", True, True, True, False),
        ("reports.export", True, True, True, False),
        ("reports.custom", True, True, True, True),
        # Settings
        ("settings.view", True, True, True, False),
        ("settings.company", True, True, True, True),
        ("settings.policies", True, True, True, True),
        ("settings.workflows", True, True, True, True),
        # Users (view only, not manage)
        ("users.view", False, True, False, False),
        ("roles.view", False, True, False, False),
    ],
    
    "Manager": [
        # Dashboard
        ("dashboard.view", False, True, False, False),
        # Employees - View team only
        ("employees.view", False, True, False, False),
        # Attendance - Team management
        ("attendance.view_own", False, True, True, False),
        ("attendance.view_team", False, True, True, False),
        ("attendance.mark", True, True, False, False),
        ("attendance.regularize", True, True, True, False),
        ("attendance.approve", False, True, True, False),  # Can approve team
        # Leaves - Team management
        ("leaves.view_own", False, True, True, False),
        ("leaves.view_team", False, True, True, False),
        ("leaves.apply", True, True, True, True),
        ("leaves.approve", False, True, True, False),  # Can approve team
        # Payroll - Own only
        ("payroll.view_own", False, True, False, False),
        # Timesheets - Team management
        ("timesheets.view_own", False, True, True, False),
        ("timesheets.view_team", False, True, True, False),
        ("timesheets.submit", True, True, True, False),
        ("timesheets.approve", False, True, True, False),
        # Expenses - Team management
        ("expenses.view_own", False, True, True, False),
        ("expenses.view_team", False, True, True, False),
        ("expenses.submit", True, True, True, True),
        ("expenses.approve", False, True, True, False),
        # Performance - Team management
        ("performance.view_own", False, True, True, False),
        ("performance.view_team", False, True, True, False),
        ("performance.manage_goals", True, True, True, True),
        ("performance.conduct_review", False, True, True, False),
        # Helpdesk
        ("helpdesk.view_own", False, True, True, False),
        ("helpdesk.create", True, True, True, False),
        # Travel - Team management
        ("travel.view_own", False, True, True, False),
        ("travel.view_team", False, True, True, False),
        ("travel.request", True, True, True, True),
        ("travel.approve", False, True, True, False),
        # Documents
        ("documents.view_own", False, True, True, False),
        ("documents.upload", True, True, True, False),
        # Reports - Basic access
        ("reports.view", False, True, False, False),
    ],
    
    "Employee": [
        # Dashboard
        ("dashboard.view", False, True, False, False),
        # Attendance - Own only
        ("attendance.view_own", False, True, False, False),
        ("attendance.mark", True, True, False, False),
        ("attendance.regularize", True, True, False, False),
        # Leaves - Own only
        ("leaves.view_own", False, True, False, False),
        ("leaves.apply", True, True, True, True),
        # Payroll - Own only
        ("payroll.view_own", False, True, False, False),
        # Timesheets - Own only
        ("timesheets.view_own", False, True, True, False),
        ("timesheets.submit", True, True, True, False),
        # Expenses - Own only
        ("expenses.view_own", False, True, False, False),
        ("expenses.submit", True, True, True, True),
        # Performance - Own only
        ("performance.view_own", False, True, True, False),
        ("performance.manage_goals", True, True, True, False),
        # Helpdesk - Own only
        ("helpdesk.view_own", False, True, False, False),
        ("helpdesk.create", True, True, True, False),
        # Travel - Own only
        ("travel.view_own", False, True, False, False),
        ("travel.request", True, True, True, True),
        # Documents - Own only
        ("documents.view_own", False, True, True, False),
        ("documents.upload", True, True, True, False),
    ],
}


async def seed_database():
    async with AsyncSessionLocal() as db:
        print("Starting database seed...")

        # Check if data already exists
        result = await db.execute(select(Permission))
        existing_perms = result.scalars().all()
        if existing_perms:
            print("Database already seeded. Skipping...")
            return

        # Create permissions
        print("Creating permissions...")
        permission_map = {}
        for module, slug, name in PERMISSIONS:
            perm = Permission(
                id=str(uuid.uuid4()),
                module=module,
                slug=slug,
                name=name,
            )
            db.add(perm)
            permission_map[slug] = perm
        await db.flush()

        # Create roles
        print("Creating roles...")
        roles = {}
        
        for role_name, perms in ROLE_PERMISSIONS.items():
            is_system = role_name in ["Super Admin", "HR Admin", "Manager", "Employee"]
            role = Role(
                id=str(uuid.uuid4()),
                name=role_name,
                description=f"{role_name} role with predefined permissions",
                is_system_role=is_system,
            )
            db.add(role)
            await db.flush()
            roles[role_name] = role
            
            if perms == "ALL":
                # Super Admin gets all permissions
                for perm in permission_map.values():
                    rp = RolePermission(
                        id=str(uuid.uuid4()),
                        role_id=role.id,
                        permission_id=perm.id,
                        can_create=True,
                        can_read=True,
                        can_update=True,
                        can_delete=True,
                    )
                    db.add(rp)
            else:
                # Other roles get specific permissions
                for perm_data in perms:
                    slug, can_create, can_read, can_update, can_delete = perm_data
                    if slug in permission_map:
                        rp = RolePermission(
                            id=str(uuid.uuid4()),
                            role_id=role.id,
                            permission_id=permission_map[slug].id,
                            can_create=can_create,
                            can_read=can_read,
                            can_update=can_update,
                            can_delete=can_delete,
                        )
                        db.add(rp)

        # Create company
        print("Creating company...")
        company = Company(
            id=str(uuid.uuid4()),
            name="Acme Corporation",
            industry="Technology",
            address="123 Business Park, Tech City",
        )
        db.add(company)
        await db.flush()

        # Create departments
        print("Creating departments...")
        departments = [
            ("Engineering", "ENG"),
            ("Human Resources", "HR"),
            ("Finance", "FIN"),
            ("Sales", "SALES"),
            ("Marketing", "MKT"),
            ("Operations", "OPS"),
        ]
        dept_map = {}
        for name, code in departments:
            dept = Department(
                id=str(uuid.uuid4()),
                company_id=company.id,
                name=name,
                code=code,
            )
            db.add(dept)
            dept_map[code] = dept
        await db.flush()

        # Create designations
        print("Creating designations...")
        designations = [
            ("CEO", 1), ("CTO", 2), ("CFO", 2), ("VP", 3),
            ("Director", 4), ("Senior Manager", 5), ("Manager", 6),
            ("Team Lead", 7), ("Senior Engineer", 8), ("Engineer", 9),
            ("Associate", 10), ("Intern", 11),
        ]
        desig_map = {}
        for name, level in designations:
            desig = Designation(
                id=str(uuid.uuid4()),
                name=name,
                level=str(level),
            )
            db.add(desig)
            desig_map[name] = desig
        await db.flush()

        # Create users with different roles
        print("Creating users...")
        
        # Super Admin
        admin_user = User(
            id=str(uuid.uuid4()),
            email="admin@hrms.com",
            password_hash=get_password_hash("Admin@123"),
            is_active=True,
            must_change_password=False,
        )
        db.add(admin_user)
        await db.flush()

        admin_employee = Employee(
            id=str(uuid.uuid4()),
            employee_id="EMP00001",
            user_id=admin_user.id,
            company_id=company.id,
            role_id=roles["Super Admin"].id,
            department_id=dept_map["HR"].id,
            designation_id=desig_map["CEO"].id,
            first_name="System",
            last_name="Administrator",
            date_of_joining=date.today(),
            employment_type=EmploymentType.FULL_TIME,
            employment_status=EmploymentStatus.ACTIVE,
        )
        db.add(admin_employee)

        # HR Admin
        hr_user = User(
            id=str(uuid.uuid4()),
            email="hr@hrms.com",
            password_hash=get_password_hash("Hr@12345"),
            is_active=True,
            must_change_password=False,
        )
        db.add(hr_user)
        await db.flush()

        hr_employee = Employee(
            id=str(uuid.uuid4()),
            employee_id="EMP00002",
            user_id=hr_user.id,
            company_id=company.id,
            role_id=roles["HR Admin"].id,
            department_id=dept_map["HR"].id,
            designation_id=desig_map["Manager"].id,
            first_name="HR",
            last_name="Manager",
            date_of_joining=date.today(),
            employment_type=EmploymentType.FULL_TIME,
            employment_status=EmploymentStatus.ACTIVE,
        )
        db.add(hr_employee)

        # Manager
        manager_user = User(
            id=str(uuid.uuid4()),
            email="manager@hrms.com",
            password_hash=get_password_hash("Manager@123"),
            is_active=True,
            must_change_password=False,
        )
        db.add(manager_user)
        await db.flush()

        manager_employee = Employee(
            id=str(uuid.uuid4()),
            employee_id="EMP00003",
            user_id=manager_user.id,
            company_id=company.id,
            role_id=roles["Manager"].id,
            department_id=dept_map["ENG"].id,
            designation_id=desig_map["Manager"].id,
            first_name="John",
            last_name="Manager",
            date_of_joining=date.today(),
            employment_type=EmploymentType.FULL_TIME,
            employment_status=EmploymentStatus.ACTIVE,
        )
        db.add(manager_employee)

        # Regular Employee
        emp_user = User(
            id=str(uuid.uuid4()),
            email="employee@hrms.com",
            password_hash=get_password_hash("Employee@123"),
            is_active=True,
            must_change_password=False,
        )
        db.add(emp_user)
        await db.flush()

        regular_employee = Employee(
            id=str(uuid.uuid4()),
            employee_id="EMP00004",
            user_id=emp_user.id,
            company_id=company.id,
            role_id=roles["Employee"].id,
            department_id=dept_map["ENG"].id,
            designation_id=desig_map["Engineer"].id,
            first_name="Jane",
            last_name="Employee",
            reporting_manager_id=manager_employee.id,  # Reports to manager
            date_of_joining=date.today(),
            employment_type=EmploymentType.FULL_TIME,
            employment_status=EmploymentStatus.ACTIVE,
        )
        db.add(regular_employee)

        # Create leave types
        print("Creating leave types...")
        leave_types = [
            ("Casual Leave", "CL", 12, "#3B82F6", True),
            ("Sick Leave", "SL", 10, "#EF4444", True),
            ("Earned Leave", "EL", 15, "#10B981", True),
            ("Compensatory Off", "CO", 0, "#8B5CF6", True),
            ("Maternity Leave", "ML", 180, "#EC4899", True),
            ("Paternity Leave", "PL", 15, "#06B6D4", True),
            ("Leave Without Pay", "LWP", 0, "#6B7280", False),
        ]
        for name, code, quota, color, is_paid in leave_types:
            lt = LeaveType(
                id=str(uuid.uuid4()),
                name=name,
                code=code,
                annual_quota=Decimal(str(quota)),
                color=color,
                is_paid_leave=is_paid,
                accrual_type=AccrualType.YEARLY,
            )
            db.add(lt)

        # Create shifts
        print("Creating shifts...")
        shifts = [
            ("General Shift", "GEN", "09:00", "18:00"),
            ("Morning Shift", "MOR", "06:00", "14:00"),
            ("Evening Shift", "EVE", "14:00", "22:00"),
            ("Night Shift", "NGT", "22:00", "06:00"),
            ("Flexible", "FLEX", "09:00", "18:00"),
        ]
        for name, code, start, end in shifts:
            shift = Shift(
                id=str(uuid.uuid4()),
                name=name,
                code=code,
                start_time=start,
                end_time=end,
                half_day_hours="4",
                full_day_hours="8",
            )
            db.add(shift)

        # Create salary components
        print("Creating salary components...")
        components = [
            ("Basic Salary", "BASIC", SalaryComponentType.EARNING, 0),
            ("House Rent Allowance", "HRA", SalaryComponentType.EARNING, 1),
            ("Special Allowance", "SA", SalaryComponentType.EARNING, 2),
            ("Conveyance Allowance", "CA", SalaryComponentType.EARNING, 3),
            ("Medical Allowance", "MA", SalaryComponentType.EARNING, 4),
            ("Provident Fund", "PF", SalaryComponentType.DEDUCTION, 10),
            ("Professional Tax", "PT", SalaryComponentType.DEDUCTION, 11),
            ("Income Tax", "TDS", SalaryComponentType.DEDUCTION, 12),
            ("ESI", "ESI", SalaryComponentType.DEDUCTION, 13),
        ]
        for name, code, comp_type, order in components:
            comp = SalaryComponent(
                id=str(uuid.uuid4()),
                name=name,
                code=code,
                type=comp_type,
                calculation=CalculationType.FIXED,
                order=order,
            )
            db.add(comp)

        # Create expense categories
        print("Creating expense categories...")
        expense_cats = [
            ("Travel", "TRAVEL", 10000),
            ("Food & Meals", "FOOD", 500),
            ("Accommodation", "ACCOM", 5000),
            ("Communication", "COMM", 200),
            ("Office Supplies", "OFFICE", 1000),
            ("Client Entertainment", "CLIENT", 2000),
            ("Training", "TRAIN", 5000),
            ("Other", "OTHER", None),
        ]
        for name, code, max_amt in expense_cats:
            cat = ExpenseCategory(
                id=str(uuid.uuid4()),
                name=name,
                code=code,
                max_amount=Decimal(str(max_amt)) if max_amt else None,
                created_at=datetime.utcnow(),
            )
            db.add(cat)

        # Create asset categories
        print("Creating asset categories...")
        asset_cats = [
            ("Laptop", "LAPTOP", 33.33),      # ~3 year life
            ("Desktop", "DESKTOP", 20.00),    # 5 year life
            ("Mobile Phone", "PHONE", 50.00), # 2 year life
            ("Monitor", "MONITOR", 20.00),    # 5 year life
            ("Keyboard & Mouse", "KBMOUSE", 50.00),  # 2 year life
            ("Headset", "HEADSET", 50.00),    # 2 year life
            ("Furniture", "FURN", 10.00),     # 10 year life
            ("Vehicle", "VEHICLE", 20.00),    # 5 year life
        ]
        for name, code, depreciation_pct in asset_cats:
            cat = AssetCategory(
                id=str(uuid.uuid4()),
                name=name,
                code=code,
                depreciation=Decimal(str(depreciation_pct)),
                created_at=datetime.utcnow(),
            )
            db.add(cat)

        # Create ticket categories
        print("Creating ticket categories...")
        ticket_cats = [
            ("IT Support", "IT", 24),
            ("HR Support", "HR", 48),
            ("Admin Support", "ADMIN", 48),
            ("Facilities", "FAC", 72),
            ("Finance", "FIN", 48),
            ("Payroll Query", "PAYROLL", 48),
        ]
        for name, code, sla in ticket_cats:
            cat = TicketCategory(
                id=str(uuid.uuid4()),
                name=name,
                code=code,
                sla_hours=sla,
                created_at=datetime.utcnow(),
            )
            db.add(cat)

        await db.commit()
        print("\n" + "="*50)
        print("Database seeded successfully!")
        print("="*50)
        print("\nDefault user credentials:")
        print("-"*50)
        print("Super Admin:")
        print("  Email: admin@hrms.com")
        print("  Password: Admin@123")
        print("\nHR Admin:")
        print("  Email: hr@hrms.com")
        print("  Password: Hr@12345")
        print("\nManager:")
        print("  Email: manager@hrms.com")
        print("  Password: Manager@123")
        print("\nEmployee:")
        print("  Email: employee@hrms.com")
        print("  Password: Employee@123")
        print("-"*50)


if __name__ == "__main__":
    asyncio.run(seed_database())
