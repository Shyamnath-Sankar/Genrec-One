"""
Extended Seed script to create data for new features
Run after seed.py
"""
import asyncio
from datetime import datetime, date, timedelta
from app.core.database import AsyncSessionLocal
from sqlalchemy import select
from app.models import Company, Employee
from app.models.engagement import Badge, BadgeCategory, CompanyValue
from app.models.shift import Shift
from app.models.workflow import WorkflowDefinition, WorkflowStep, WorkflowType, ApproverType


async def seed_extended_data():
    """Create extended seed data for new features"""
    
    async with AsyncSessionLocal() as session:
        # Get the company
        result = await session.execute(select(Company).limit(1))
        company = result.scalar_one_or_none()
        
        if not company:
            print("No company found. Please run seed.py first.")
            return
        
        # Get the admin employee
        result = await session.execute(select(Employee).limit(1))
        admin = result.scalar_one_or_none()
        
        if not admin:
            print("No employee found. Please run seed.py first.")
            return
        
        print("Seeding extended data...")
        
        # 1. Create Recognition Badges
        badges_data = [
            ("Star Performer", "For outstanding performance", "star", "#FFD700", BadgeCategory.PERFORMANCE, 100),
            ("Team Player", "Excellent collaboration skills", "users", "#4169E1", BadgeCategory.TEAMWORK, 75),
            ("Innovator", "Creative problem solving", "lightbulb", "#32CD32", BadgeCategory.INNOVATION, 100),
            ("Leader", "Exceptional leadership", "crown", "#8B008B", BadgeCategory.LEADERSHIP, 100),
            ("Customer Champion", "Outstanding customer service", "heart", "#FF6347", BadgeCategory.CUSTOMER_SERVICE, 75),
            ("Quick Learner", "Fast adaptation to new skills", "book-open", "#00CED1", BadgeCategory.LEARNING, 50),
            ("1 Year Service", "One year anniversary", "award", "#C0C0C0", BadgeCategory.TENURE, 50),
            ("5 Year Service", "Five years of dedication", "award", "#FFD700", BadgeCategory.TENURE, 200),
            ("10 Year Service", "A decade of excellence", "award", "#E5E4E2", BadgeCategory.TENURE, 500),
            ("Above & Beyond", "Going the extra mile", "rocket", "#FF4500", BadgeCategory.SPECIAL, 150),
        ]
        
        # Check if badges already exist
        existing_badges = await session.execute(select(Badge).limit(1))
        if not existing_badges.scalar_one_or_none():
            for name, desc, icon, color, category, points in badges_data:
                badge = Badge(
                    company_id=company.id,
                    name=name,
                    description=desc,
                    icon=icon,
                    color=color,
                    category=category,
                    points=points,
                    is_active=True,
                )
                session.add(badge)
            print("  [OK] Created recognition badges")
        else:
            print("  - Badges already exist, skipping")
        
        # 2. Create Company Values
        values_data = [
            ("Innovation", "We embrace creativity and continuous improvement", "lightbulb", "#3B82F6"),
            ("Integrity", "We act with honesty and transparency", "shield", "#10B981"),
            ("Collaboration", "We work together to achieve more", "users", "#8B5CF6"),
            ("Excellence", "We strive for the highest quality", "star", "#F59E0B"),
            ("Customer Focus", "Our customers are at the heart of everything", "heart", "#EF4444"),
        ]
        
        existing_values = await session.execute(select(CompanyValue).limit(1))
        if not existing_values.scalar_one_or_none():
            for i, (name, desc, icon, color) in enumerate(values_data):
                value = CompanyValue(
                    company_id=company.id,
                    name=name,
                    description=desc,
                    icon=icon,
                    color=color,
                    order=i,
                    is_active=True,
                )
                session.add(value)
            print("  [OK] Created company values")
        else:
            print("  - Company values already exist, skipping")
        
        # 3. Create Shifts
        shifts_data = [
            ("General Shift", "GEN", "09:00", "18:00", 15, 4.0, 8.0, 60, False, False),
            ("Morning Shift", "MOR", "06:00", "14:00", 15, 4.0, 8.0, 30, False, False),
            ("Evening Shift", "EVE", "14:00", "22:00", 15, 4.0, 8.0, 30, False, False),
            ("Night Shift", "NGT", "22:00", "06:00", 15, 4.0, 8.0, 30, True, False),
            ("Flexible", "FLX", "09:00", "18:00", 60, 4.0, 8.0, 60, False, True),
        ]
        
        existing_shifts = await session.execute(select(Shift).limit(1))
        if not existing_shifts.scalar_one_or_none():
            for name, code, start, end, grace, half_day, full_day, break_dur, is_night, is_flex in shifts_data:
                shift = Shift(
                    name=name,
                    code=code,
                    start_time=start,  # Already a string "HH:mm"
                    end_time=end,      # Already a string "HH:mm"
                    grace_minutes=grace,
                    half_day_hours=str(half_day),  # Convert to string
                    full_day_hours=str(full_day),  # Convert to string
                    break_duration=break_dur,
                    is_night_shift=is_night,
                    is_flexible=is_flex,
                    is_active=True,
                )
                session.add(shift)
            print("  [OK] Created shifts")
        else:
            print("  - Shifts already exist, skipping")
        
        # 4. Create Workflow Definitions
        existing_workflows = await session.execute(select(WorkflowDefinition).limit(1))
        if not existing_workflows.scalar_one_or_none():
            # Leave Workflow
            leave_workflow = WorkflowDefinition(
                company_id=company.id,
                name="Leave Approval",
                description="Standard leave approval workflow",
                workflow_type=WorkflowType.LEAVE,
                is_active=True,
                priority=10,
            )
            session.add(leave_workflow)
            await session.flush()
            
            leave_step1 = WorkflowStep(
                workflow_id=leave_workflow.id,
                step_order=1,
                name="Reporting Manager Approval",
                approver_type=ApproverType.REPORTING_MANAGER,
                is_mandatory=True,
                can_skip_if_same_approver=True,
            )
            session.add(leave_step1)
            
            leave_step2 = WorkflowStep(
                workflow_id=leave_workflow.id,
                step_order=2,
                name="HR Approval",
                approver_type=ApproverType.HR,
                is_mandatory=False,
                conditions={"leave_days_greater_than": 5},
            )
            session.add(leave_step2)
            
            # Expense Workflow
            expense_workflow = WorkflowDefinition(
                company_id=company.id,
                name="Expense Approval",
                description="Standard expense approval workflow",
                workflow_type=WorkflowType.EXPENSE,
                is_active=True,
                priority=10,
            )
            session.add(expense_workflow)
            await session.flush()
            
            expense_step1 = WorkflowStep(
                workflow_id=expense_workflow.id,
                step_order=1,
                name="Manager Approval",
                approver_type=ApproverType.REPORTING_MANAGER,
                is_mandatory=True,
            )
            session.add(expense_step1)
            
            expense_step2 = WorkflowStep(
                workflow_id=expense_workflow.id,
                step_order=2,
                name="Finance Approval",
                approver_type=ApproverType.FINANCE,
                is_mandatory=True,
                conditions={"amount_greater_than": 10000},
            )
            session.add(expense_step2)
            
            # Travel Workflow
            travel_workflow = WorkflowDefinition(
                company_id=company.id,
                name="Travel Request Approval",
                description="Travel request approval workflow",
                workflow_type=WorkflowType.TRAVEL,
                is_active=True,
                priority=10,
            )
            session.add(travel_workflow)
            await session.flush()
            
            travel_step1 = WorkflowStep(
                workflow_id=travel_workflow.id,
                step_order=1,
                name="Manager Approval",
                approver_type=ApproverType.REPORTING_MANAGER,
                is_mandatory=True,
            )
            session.add(travel_step1)
            
            travel_step2 = WorkflowStep(
                workflow_id=travel_workflow.id,
                step_order=2,
                name="Department Head Approval",
                approver_type=ApproverType.DEPARTMENT_HEAD,
                is_mandatory=True,
            )
            session.add(travel_step2)
            
            print("  [OK] Created workflow definitions")
        else:
            print("  - Workflows already exist, skipping")
        
        await session.commit()
        
        print("\n[OK] Extended data seeding completed!")
        print("\nNew features available:")
        print("  - 10 Recognition Badges")
        print("  - 5 Company Values")
        print("  - 5 Shifts (General, Morning, Evening, Night, Flexible)")
        print("  - 3 Approval Workflows (Leave, Expense, Travel)")


if __name__ == "__main__":
    asyncio.run(seed_extended_data())
