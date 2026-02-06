"""
Seed script to create initial data for testing
"""
import asyncio
from datetime import datetime
from passlib.context import CryptContext
from app.core.database import AsyncSessionLocal, create_tables
from app.models import User, Role, Permission, RolePermission, Company, Employee

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def seed_database():
    """Create initial seed data"""
    
    # Create tables first
    await create_tables()
    
    async with AsyncSessionLocal() as session:
        # Check if data already exists
        from sqlalchemy import select
        result = await session.execute(select(User).limit(1))
        if result.scalar():
            print("Database already has data. Skipping seed.")
            return
        
        print("Seeding database...")
        
        # 1. Create permissions
        permissions_data = [
            ("dashboard", "dashboard.view", "View Dashboard"),
            ("employees", "employees.view", "View Employees"),
            ("employees", "employees.create", "Create Employees"),
            ("employees", "employees.edit", "Edit Employees"),
            ("employees", "employees.delete", "Delete Employees"),
            ("attendance", "attendance.view", "View Attendance"),
            ("attendance", "attendance.manage", "Manage Attendance"),
            ("leave", "leave.view", "View Leave"),
            ("leave", "leave.apply", "Apply Leave"),
            ("leave", "leave.approve", "Approve Leave"),
            ("payroll", "payroll.view", "View Payroll"),
            ("payroll", "payroll.manage", "Manage Payroll"),
            ("settings", "settings.view", "View Settings"),
            ("settings", "settings.manage", "Manage Settings"),
        ]
        
        permissions = {}
        for module, slug, name in permissions_data:
            perm = Permission(module=module, slug=slug, name=name)
            session.add(perm)
            permissions[slug] = perm
        
        await session.flush()
        
        # 2. Create Super Admin role
        super_admin_role = Role(
            name="Super Admin",
            description="Full system access",
            is_system_role=True,
        )
        session.add(super_admin_role)
        await session.flush()
        
        # Assign all permissions to Super Admin
        for perm in permissions.values():
            role_perm = RolePermission(
                role_id=super_admin_role.id,
                permission_id=perm.id,
                can_create=True,
                can_read=True,
                can_update=True,
                can_delete=True,
            )
            session.add(role_perm)
        
        # 3. Create Employee role
        employee_role = Role(
            name="Employee",
            description="Standard employee access",
            is_system_role=True,
        )
        session.add(employee_role)
        await session.flush()
        
        # 4. Create a company
        company = Company(
            name="HRMS Demo Company",
            industry="Technology",
        )
        session.add(company)
        await session.flush()
        
        # 5. Create admin user
        admin_user = User(
            email="admin@hrms.com",
            password_hash=pwd_context.hash("admin123"),
            is_active=True,
            must_change_password=False,
        )
        session.add(admin_user)
        await session.flush()
        
        # 6. Create admin employee profile
        admin_employee = Employee(
            employee_id="EMP001",
            user_id=admin_user.id,
            company_id=company.id,
            role_id=super_admin_role.id,
            first_name="System",
            last_name="Admin",
            work_email="admin@hrms.com",
            date_of_joining=datetime.now().date(),
        )
        session.add(admin_employee)
        
        await session.commit()
        
        print("✓ Database seeded successfully!")
        print("\n  Test credentials:")
        print("  Email: admin@hrms.com")
        print("  Password: admin123")


if __name__ == "__main__":
    asyncio.run(seed_database())
