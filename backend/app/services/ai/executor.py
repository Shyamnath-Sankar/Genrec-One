"""
Tool Executor for AI Chatbot.
Executes tool calls with proper authentication and safety measures.
"""
import json
from datetime import datetime, date, timedelta
from typing import Dict, Any, Optional, Tuple, List
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
import uuid

from app.models.employee import Employee
from app.models.leave import LeaveApplication, LeaveBalance, LeaveType, Holiday
from app.models.attendance import Attendance, AttendanceStatus
from app.models.ticket import Ticket, TicketComment, TicketCategory
from app.models.payroll import PayrollDetail, PayrollComponent, SalaryDetail, SalaryDetailComponent
from app.models.policy import Announcement
from app.models.chat import ChatToolExecution
from app.services.ai.tools import get_tool_by_name, RiskLevel


class ToolExecutionError(Exception):
    """Custom exception for tool execution errors"""
    def __init__(self, message: str, code: str = "EXECUTION_ERROR"):
        self.message = message
        self.code = code
        super().__init__(message)


class ToolExecutor:
    """
    Executes tool calls on behalf of the AI.
    All operations are performed with the employee's permissions.
    """
    
    def __init__(self, db: AsyncSession, employee: Employee):
        self.db = db
        self.employee = employee
    
    async def execute(
        self,
        tool_name: str,
        arguments: Dict[str, Any],
        tool_call_id: str,
        session_id: str,
        message_id: str,
    ) -> Tuple[bool, Any, Optional[ChatToolExecution]]:
        """
        Execute a tool call.
        
        Returns:
            (success, result, tool_execution_record)
        """
        tool_def = get_tool_by_name(tool_name)
        if not tool_def:
            return False, {"error": f"Unknown tool: {tool_name}"}, None
        
        # Create execution record for audit
        execution = ChatToolExecution(
            id=str(uuid.uuid4()),
            message_id=message_id,
            session_id=session_id,
            employee_id=self.employee.id,
            tool_name=tool_name,
            tool_call_id=tool_call_id,
            arguments=arguments,
            required_confirmation=tool_def.requires_confirmation,
            started_at=datetime.utcnow(),
        )
        self.db.add(execution)
        
        try:
            # Get the executor method
            method = getattr(self, f"_execute_{tool_name}", None)
            if not method:
                raise ToolExecutionError(f"No implementation for tool: {tool_name}", "NOT_IMPLEMENTED")
            
            # Execute the tool
            start_time = datetime.utcnow()
            result = await method(**arguments)
            end_time = datetime.utcnow()
            
            # Update execution record
            execution.success = True
            execution.result = result
            execution.completed_at = end_time
            execution.execution_time_ms = int((end_time - start_time).total_seconds() * 1000)
            
            await self.db.flush()
            
            return True, result, execution
            
        except ToolExecutionError as e:
            execution.success = False
            execution.error = e.message
            execution.completed_at = datetime.utcnow()
            await self.db.flush()
            return False, {"error": e.message, "code": e.code}, execution
            
        except Exception as e:
            execution.success = False
            execution.error = str(e)
            execution.completed_at = datetime.utcnow()
            await self.db.flush()
            return False, {"error": str(e), "code": "INTERNAL_ERROR"}, execution
    
    # ============================================
    # LEAVE MANAGEMENT IMPLEMENTATIONS
    # ============================================
    
    async def _execute_get_leave_balance(self) -> Dict[str, Any]:
        """Get leave balance for current employee"""
        query = (
            select(LeaveBalance, LeaveType)
            .join(LeaveType, LeaveBalance.leave_type_id == LeaveType.id)
            .where(LeaveBalance.employee_id == self.employee.id)
            .where(LeaveBalance.year == datetime.now().year)
        )
        
        result = await self.db.execute(query)
        balances = result.all()
        
        if not balances:
            return {
                "message": "No leave balance found for current year",
                "balances": [],
            }
        
        balance_list = []
        for balance, leave_type in balances:
            balance_list.append({
                "type": leave_type.name,
                "code": leave_type.code,
                "total": balance.total_days,
                "used": balance.used_days,
                "pending": balance.pending_days,
                "available": balance.total_days - balance.used_days - balance.pending_days,
                "carry_forward": balance.carry_forward_days or 0,
            })
        
        return {
            "year": datetime.now().year,
            "balances": balance_list,
        }
    
    async def _execute_apply_leave(
        self,
        leave_type: str,
        start_date: str,
        end_date: str,
        reason: str,
        is_half_day: bool = False,
        half_day_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Apply for leave"""
        # Find the leave type
        type_query = select(LeaveType).where(
            or_(
                LeaveType.code == leave_type.upper(),
                func.upper(LeaveType.name) == leave_type.upper()
            )
        ).where(LeaveType.company_id == self.employee.company_id)
        
        result = await self.db.execute(type_query)
        lt = result.scalar_one_or_none()
        
        if not lt:
            raise ToolExecutionError(f"Leave type '{leave_type}' not found", "INVALID_LEAVE_TYPE")
        
        # Parse dates
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d").date()
            end = datetime.strptime(end_date, "%Y-%m-%d").date()
        except ValueError:
            raise ToolExecutionError("Invalid date format. Use YYYY-MM-DD", "INVALID_DATE")
        
        if start > end:
            raise ToolExecutionError("Start date must be before or equal to end date", "INVALID_DATE_RANGE")
        
        # Calculate days
        if is_half_day:
            if start != end:
                raise ToolExecutionError("Half day leave can only be for a single day", "INVALID_HALF_DAY")
            days = 0.5
        else:
            days = (end - start).days + 1
        
        # Check balance
        balance_query = (
            select(LeaveBalance)
            .where(LeaveBalance.employee_id == self.employee.id)
            .where(LeaveBalance.leave_type_id == lt.id)
            .where(LeaveBalance.year == start.year)
        )
        result = await self.db.execute(balance_query)
        balance = result.scalar_one_or_none()
        
        if not balance:
            raise ToolExecutionError(f"No leave balance found for {lt.name}", "NO_BALANCE")
        
        available = balance.total_days - balance.used_days - balance.pending_days
        if days > available:
            raise ToolExecutionError(
                f"Insufficient balance. Requested: {days} days, Available: {available} days",
                "INSUFFICIENT_BALANCE"
            )
        
        # Create leave application
        leave = LeaveApplication(
            id=str(uuid.uuid4()),
            employee_id=self.employee.id,
            leave_type_id=lt.id,
            start_date=start,
            end_date=end,
            days=days,
            is_half_day=is_half_day,
            half_day_type=half_day_type,
            reason=reason,
            status="PENDING",
            applied_on=datetime.utcnow(),
        )
        self.db.add(leave)
        
        # Update pending days in balance
        balance.pending_days += days
        
        await self.db.flush()
        
        return {
            "success": True,
            "message": f"Leave application submitted successfully",
            "details": {
                "id": leave.id,
                "type": lt.name,
                "from": start_date,
                "to": end_date,
                "days": days,
                "status": "PENDING",
            }
        }
    
    async def _execute_get_my_leave_applications(
        self,
        status: Optional[str] = None,
        limit: int = 10,
    ) -> Dict[str, Any]:
        """Get employee's leave applications"""
        query = (
            select(LeaveApplication)
            .options(selectinload(LeaveApplication.leave_type))
            .where(LeaveApplication.employee_id == self.employee.id)
            .order_by(LeaveApplication.created_at.desc())
            .limit(limit)
        )
        
        if status:
            query = query.where(LeaveApplication.status == status.upper())
        
        result = await self.db.execute(query)
        applications = result.scalars().all()
        
        return {
            "total": len(applications),
            "applications": [
                {
                    "id": app.id,
                    "type": app.leave_type.name if app.leave_type else "Unknown",
                    "from": app.start_date.isoformat() if app.start_date else None,
                    "to": app.end_date.isoformat() if app.end_date else None,
                    "days": app.days,
                    "status": app.status,
                    "reason": app.reason,
                    "applied_on": app.applied_on.isoformat() if app.applied_on else None,
                }
                for app in applications
            ],
        }
    
    async def _execute_cancel_leave(
        self,
        leave_id: str,
        reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Cancel a leave application"""
        query = (
            select(LeaveApplication)
            .options(selectinload(LeaveApplication.leave_type))
            .where(LeaveApplication.id == leave_id)
            .where(LeaveApplication.employee_id == self.employee.id)
        )
        
        result = await self.db.execute(query)
        leave = result.scalar_one_or_none()
        
        if not leave:
            raise ToolExecutionError("Leave application not found", "NOT_FOUND")
        
        if leave.status == "CANCELLED":
            raise ToolExecutionError("Leave is already cancelled", "ALREADY_CANCELLED")
        
        if leave.status == "REJECTED":
            raise ToolExecutionError("Cannot cancel a rejected leave", "CANNOT_CANCEL")
        
        # Update balance
        balance_query = (
            select(LeaveBalance)
            .where(LeaveBalance.employee_id == self.employee.id)
            .where(LeaveBalance.leave_type_id == leave.leave_type_id)
            .where(LeaveBalance.year == leave.start_date.year)
        )
        result = await self.db.execute(balance_query)
        balance = result.scalar_one_or_none()
        
        if balance:
            if leave.status == "PENDING":
                balance.pending_days = max(0, balance.pending_days - leave.days)
            elif leave.status == "APPROVED":
                balance.used_days = max(0, balance.used_days - leave.days)
        
        leave.status = "CANCELLED"
        leave.cancellation_reason = reason
        
        await self.db.flush()
        
        return {
            "success": True,
            "message": "Leave cancelled successfully",
            "leave_id": leave_id,
        }
    
    async def _execute_get_upcoming_holidays(self, limit: int = 10) -> Dict[str, Any]:
        """Get upcoming holidays"""
        today = date.today()
        
        query = (
            select(Holiday)
            .where(Holiday.company_id == self.employee.company_id)
            .where(Holiday.date >= today)
            .order_by(Holiday.date)
            .limit(limit)
        )
        
        result = await self.db.execute(query)
        holidays = result.scalars().all()
        
        return {
            "holidays": [
                {
                    "name": h.name,
                    "date": h.date.isoformat(),
                    "day": h.date.strftime("%A"),
                    "is_optional": h.is_optional,
                }
                for h in holidays
            ],
        }
    
    # ============================================
    # ATTENDANCE IMPLEMENTATIONS
    # ============================================
    
    async def _execute_get_attendance_status(self) -> Dict[str, Any]:
        """Get today's attendance status"""
        today = date.today()
        
        query = (
            select(Attendance)
            .where(Attendance.employee_id == self.employee.id)
            .where(Attendance.date == today)
        )
        
        result = await self.db.execute(query)
        attendance = result.scalar_one_or_none()
        
        if not attendance:
            return {
                "date": today.isoformat(),
                "status": "NOT_MARKED",
                "message": "You haven't checked in today",
            }
        
        status_info = {
            "date": today.isoformat(),
            "status": attendance.status.value if attendance.status else "UNKNOWN",
            "check_in": attendance.check_in.strftime("%I:%M %p") if attendance.check_in else None,
            "check_out": attendance.check_out.strftime("%I:%M %p") if attendance.check_out else None,
        }
        
        if attendance.check_in and not attendance.check_out:
            status_info["message"] = f"Checked in at {status_info['check_in']}. Don't forget to check out!"
        elif attendance.check_in and attendance.check_out:
            status_info["message"] = f"Checked in at {status_info['check_in']} and out at {status_info['check_out']}"
        
        return status_info
    
    async def _execute_check_in(self, notes: Optional[str] = None) -> Dict[str, Any]:
        """Mark check-in"""
        today = date.today()
        now = datetime.now()
        
        # Check if already checked in
        query = (
            select(Attendance)
            .where(Attendance.employee_id == self.employee.id)
            .where(Attendance.date == today)
        )
        
        result = await self.db.execute(query)
        attendance = result.scalar_one_or_none()
        
        if attendance and attendance.check_in:
            return {
                "success": False,
                "message": f"You already checked in today at {attendance.check_in.strftime('%I:%M %p')}",
            }
        
        if attendance:
            attendance.check_in = now
            attendance.status = AttendanceStatus.PRESENT
            if notes:
                attendance.notes = notes
        else:
            attendance = Attendance(
                id=str(uuid.uuid4()),
                employee_id=self.employee.id,
                date=today,
                check_in=now,
                status=AttendanceStatus.PRESENT,
                notes=notes,
            )
            self.db.add(attendance)
        
        await self.db.flush()
        
        return {
            "success": True,
            "message": f"Checked in successfully at {now.strftime('%I:%M %p')}",
            "time": now.strftime("%I:%M %p"),
        }
    
    async def _execute_check_out(self, notes: Optional[str] = None) -> Dict[str, Any]:
        """Mark check-out"""
        today = date.today()
        now = datetime.now()
        
        query = (
            select(Attendance)
            .where(Attendance.employee_id == self.employee.id)
            .where(Attendance.date == today)
        )
        
        result = await self.db.execute(query)
        attendance = result.scalar_one_or_none()
        
        if not attendance or not attendance.check_in:
            return {
                "success": False,
                "message": "You haven't checked in today. Please check in first.",
            }
        
        if attendance.check_out:
            return {
                "success": False,
                "message": f"You already checked out today at {attendance.check_out.strftime('%I:%M %p')}",
            }
        
        attendance.check_out = now
        if notes:
            attendance.notes = (attendance.notes or "") + f"\n{notes}"
        
        # Calculate working hours
        if attendance.check_in:
            diff = now - attendance.check_in
            hours = diff.seconds // 3600
            minutes = (diff.seconds % 3600) // 60
            attendance.working_hours = round(diff.seconds / 3600, 2)
        
        await self.db.flush()
        
        return {
            "success": True,
            "message": f"Checked out successfully at {now.strftime('%I:%M %p')}",
            "time": now.strftime("%I:%M %p"),
            "working_hours": f"{hours}h {minutes}m" if attendance.check_in else None,
        }
    
    async def _execute_get_attendance_summary(
        self,
        month: Optional[int] = None,
        year: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Get attendance summary for a month"""
        now = datetime.now()
        month = month or now.month
        year = year or now.year
        
        # Get first and last day of month
        first_day = date(year, month, 1)
        if month == 12:
            last_day = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            last_day = date(year, month + 1, 1) - timedelta(days=1)
        
        # Don't count future dates
        if last_day > date.today():
            last_day = date.today()
        
        query = (
            select(Attendance)
            .where(Attendance.employee_id == self.employee.id)
            .where(Attendance.date >= first_day)
            .where(Attendance.date <= last_day)
        )
        
        result = await self.db.execute(query)
        records = result.scalars().all()
        
        # Calculate stats
        total_days = (last_day - first_day).days + 1
        present = sum(1 for r in records if r.status == AttendanceStatus.PRESENT)
        absent = sum(1 for r in records if r.status == AttendanceStatus.ABSENT)
        late = sum(1 for r in records if r.is_late)
        half_day = sum(1 for r in records if r.status == AttendanceStatus.HALF_DAY)
        on_leave = sum(1 for r in records if r.status == AttendanceStatus.ON_LEAVE)
        
        total_hours = sum(r.working_hours or 0 for r in records)
        avg_hours = total_hours / present if present > 0 else 0
        
        return {
            "month": first_day.strftime("%B %Y"),
            "summary": {
                "total_working_days": total_days,
                "present": present,
                "absent": absent,
                "late": late,
                "half_day": half_day,
                "on_leave": on_leave,
                "not_marked": total_days - len(records),
            },
            "hours": {
                "total": round(total_hours, 2),
                "average_per_day": round(avg_hours, 2),
            },
            "attendance_percentage": round((present / total_days) * 100, 1) if total_days > 0 else 0,
        }
    
    # ============================================
    # TICKET IMPLEMENTATIONS
    # ============================================
    
    async def _execute_create_ticket(
        self,
        subject: str,
        description: str,
        category: str,
        priority: str = "MEDIUM",
    ) -> Dict[str, Any]:
        """Create a helpdesk ticket"""
        # Find or create category
        cat_query = select(TicketCategory).where(
            func.upper(TicketCategory.name) == category.upper().replace("_", " ")
        )
        result = await self.db.execute(cat_query)
        cat = result.scalar_one_or_none()
        
        if not cat:
            # Create the category if it doesn't exist
            cat = TicketCategory(
                id=str(uuid.uuid4()),
                name=category.replace("_", " ").title(),
                description=f"{category.replace('_', ' ').title()} related tickets",
            )
            self.db.add(cat)
            await self.db.flush()
        
        # Generate ticket number
        count_query = select(func.count()).select_from(Ticket)
        result = await self.db.execute(count_query)
        count = result.scalar() or 0
        ticket_number = f"TKT{str(count + 1).zfill(6)}"
        
        ticket = Ticket(
            id=str(uuid.uuid4()),
            ticket_number=ticket_number,
            category_id=cat.id,
            created_by_id=self.employee.id,
            subject=subject,
            description=description,
            priority=priority.upper(),
            status="OPEN",
        )
        self.db.add(ticket)
        await self.db.flush()
        
        return {
            "success": True,
            "message": "Ticket created successfully",
            "ticket": {
                "id": ticket.id,
                "number": ticket_number,
                "subject": subject,
                "category": cat.name,
                "priority": priority,
                "status": "OPEN",
            }
        }
    
    async def _execute_get_my_tickets(
        self,
        status: Optional[str] = None,
        limit: int = 10,
    ) -> Dict[str, Any]:
        """Get employee's tickets"""
        query = (
            select(Ticket)
            .options(selectinload(Ticket.category))
            .where(Ticket.created_by_id == self.employee.id)
            .order_by(Ticket.created_at.desc())
            .limit(limit)
        )
        
        if status:
            query = query.where(Ticket.status == status.upper())
        
        result = await self.db.execute(query)
        tickets = result.scalars().all()
        
        return {
            "total": len(tickets),
            "tickets": [
                {
                    "id": t.id,
                    "number": t.ticket_number,
                    "subject": t.subject,
                    "category": t.category.name if t.category else "General",
                    "priority": t.priority,
                    "status": t.status,
                    "created": t.created_at.isoformat() if t.created_at else None,
                }
                for t in tickets
            ],
        }
    
    async def _execute_add_ticket_comment(
        self,
        ticket_id: str,
        comment: str,
    ) -> Dict[str, Any]:
        """Add comment to a ticket"""
        # Verify ticket exists and belongs to user or they have access
        query = select(Ticket).where(Ticket.id == ticket_id)
        result = await self.db.execute(query)
        ticket = result.scalar_one_or_none()
        
        if not ticket:
            raise ToolExecutionError("Ticket not found", "NOT_FOUND")
        
        if ticket.created_by_id != self.employee.id:
            raise ToolExecutionError("You don't have permission to comment on this ticket", "FORBIDDEN")
        
        new_comment = TicketComment(
            id=str(uuid.uuid4()),
            ticket_id=ticket_id,
            employee_id=self.employee.id,
            content=comment,
        )
        self.db.add(new_comment)
        await self.db.flush()
        
        return {
            "success": True,
            "message": "Comment added successfully",
            "comment_id": new_comment.id,
        }
    
    # ============================================
    # PROFILE IMPLEMENTATIONS
    # ============================================
    
    async def _execute_get_my_profile(self) -> Dict[str, Any]:
        """Get employee profile"""
        emp = self.employee
        
        return {
            "employee_id": emp.employee_id,
            "name": f"{emp.first_name} {emp.last_name}",
            "email": emp.work_email or emp.personal_email,
            "phone": emp.phone,
            "department": emp.department.name if emp.department else None,
            "designation": emp.designation.name if emp.designation else None,
            "reporting_manager": f"{emp.reporting_manager.first_name} {emp.reporting_manager.last_name}" if emp.reporting_manager else None,
            "date_of_joining": emp.date_of_joining.isoformat() if emp.date_of_joining else None,
            "employment_type": emp.employment_type.value if emp.employment_type else None,
            "work_location": emp.work_location,
        }
    
    async def _execute_get_team_members(self) -> Dict[str, Any]:
        """Get team members (direct reports)"""
        query = (
            select(Employee)
            .where(Employee.reporting_manager_id == self.employee.id)
            .options(
                selectinload(Employee.department),
                selectinload(Employee.designation),
            )
        )
        
        result = await self.db.execute(query)
        members = result.scalars().all()
        
        return {
            "team_size": len(members),
            "members": [
                {
                    "employee_id": m.employee_id,
                    "name": f"{m.first_name} {m.last_name}",
                    "email": m.work_email,
                    "designation": m.designation.name if m.designation else None,
                    "department": m.department.name if m.department else None,
                }
                for m in members
            ],
        }
    
    async def _execute_get_department_directory(
        self,
        department_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get department employee directory"""
        from app.models.company import Department
        
        # If no department specified, use employee's department
        if department_name:
            dept_query = select(Department).where(
                func.upper(Department.name).like(f"%{department_name.upper()}%")
            )
            result = await self.db.execute(dept_query)
            dept = result.scalar_one_or_none()
            
            if not dept:
                raise ToolExecutionError(f"Department '{department_name}' not found", "NOT_FOUND")
            
            dept_id = dept.id
        else:
            dept_id = self.employee.department_id
        
        query = (
            select(Employee)
            .where(Employee.department_id == dept_id)
            .options(selectinload(Employee.designation))
            .order_by(Employee.first_name)
        )
        
        result = await self.db.execute(query)
        employees = result.scalars().all()
        
        return {
            "department": department_name or (self.employee.department.name if self.employee.department else "Unknown"),
            "count": len(employees),
            "employees": [
                {
                    "name": f"{e.first_name} {e.last_name}",
                    "designation": e.designation.name if e.designation else None,
                    "email": e.work_email,
                }
                for e in employees
            ],
        }
    
    # ============================================
    # PAYROLL IMPLEMENTATIONS
    # ============================================
    
    async def _execute_get_payslip(
        self,
        month: Optional[int] = None,
        year: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Get payslip for a month"""
        now = datetime.now()
        month = month or (now.month - 1 if now.month > 1 else 12)
        year = year or (now.year if now.month > 1 else now.year - 1)
        
        query = (
            select(PayrollDetail)
            .options(selectinload(PayrollDetail.components))
            .where(PayrollDetail.employee_id == self.employee.id)
            .where(PayrollDetail.month == month)
            .where(PayrollDetail.year == year)
        )
        
        result = await self.db.execute(query)
        payslip = result.scalar_one_or_none()
        
        if not payslip:
            return {
                "message": f"No payslip found for {datetime(year, month, 1).strftime('%B %Y')}",
                "payslip": None,
            }
        
        earnings = []
        deductions = []
        
        for comp in payslip.components:
            item = {
                "name": comp.name,
                "amount": float(comp.amount),
            }
            if comp.type == "EARNING":
                earnings.append(item)
            else:
                deductions.append(item)
        
        return {
            "period": datetime(year, month, 1).strftime("%B %Y"),
            "earnings": earnings,
            "deductions": deductions,
            "summary": {
                "gross": float(payslip.gross_salary or 0),
                "total_deductions": float(payslip.total_deductions or 0),
                "net_pay": float(payslip.net_salary or 0),
            },
        }
    
    async def _execute_get_salary_structure(self) -> Dict[str, Any]:
        """Get salary structure"""
        query = (
            select(SalaryDetail)
            .options(selectinload(SalaryDetail.components))
            .where(SalaryDetail.employee_id == self.employee.id)
            .where(SalaryDetail.is_active == True)
        )
        
        result = await self.db.execute(query)
        salary = result.scalar_one_or_none()
        
        if not salary:
            return {
                "message": "No salary structure found",
                "structure": None,
            }
        
        components = []
        for comp in salary.components:
            components.append({
                "name": comp.component.name if comp.component else "Unknown",
                "type": comp.component.type if comp.component else "EARNING",
                "amount": float(comp.amount or 0),
            })
        
        return {
            "effective_from": salary.effective_from.isoformat() if salary.effective_from else None,
            "ctc": float(salary.ctc or 0),
            "gross": float(salary.gross_salary or 0),
            "net": float(salary.net_salary or 0),
            "components": components,
        }
    
    # ============================================
    # QUERY IMPLEMENTATIONS
    # ============================================
    
    async def _execute_query_hr_data(self, question: str) -> Dict[str, Any]:
        """
        Query HR data using natural language.
        This is a placeholder - will integrate with Vanna later.
        """
        # For now, return a placeholder response
        # TODO: Integrate with Vanna for actual text-to-SQL
        return {
            "message": "Text-to-SQL queries are coming soon! For now, please use the specific tools available to get HR data.",
            "question": question,
            "suggestion": "Try asking me to get your leave balance, attendance summary, or team information using the available tools.",
        }
    
    # ============================================
    # GENERAL IMPLEMENTATIONS
    # ============================================
    
    async def _execute_get_pending_approvals(
        self,
        type: str = "ALL",
    ) -> Dict[str, Any]:
        """Get pending approvals (for managers)"""
        # Check if employee is a manager
        subordinates_query = (
            select(func.count())
            .select_from(Employee)
            .where(Employee.reporting_manager_id == self.employee.id)
        )
        result = await self.db.execute(subordinates_query)
        subordinate_count = result.scalar() or 0
        
        if subordinate_count == 0:
            return {
                "message": "You don't have any team members. Approval features are for managers.",
                "approvals": [],
            }
        
        # Get subordinate IDs
        sub_query = (
            select(Employee.id)
            .where(Employee.reporting_manager_id == self.employee.id)
        )
        result = await self.db.execute(sub_query)
        subordinate_ids = [r[0] for r in result.all()]
        
        pending = []
        
        # Get pending leaves
        if type in ["ALL", "LEAVE"]:
            leave_query = (
                select(LeaveApplication)
                .options(
                    selectinload(LeaveApplication.employee),
                    selectinload(LeaveApplication.leave_type),
                )
                .where(LeaveApplication.employee_id.in_(subordinate_ids))
                .where(LeaveApplication.status == "PENDING")
            )
            result = await self.db.execute(leave_query)
            leaves = result.scalars().all()
            
            for leave in leaves:
                pending.append({
                    "type": "LEAVE",
                    "id": leave.id,
                    "employee": f"{leave.employee.first_name} {leave.employee.last_name}" if leave.employee else "Unknown",
                    "details": f"{leave.leave_type.name if leave.leave_type else 'Leave'}: {leave.start_date} to {leave.end_date}",
                    "days": leave.days,
                    "reason": leave.reason,
                    "applied_on": leave.applied_on.isoformat() if leave.applied_on else None,
                })
        
        return {
            "total": len(pending),
            "approvals": pending,
        }
    
    async def _execute_approve_request(
        self,
        request_type: str,
        request_id: str,
        comments: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Approve a pending request"""
        if request_type == "LEAVE":
            query = (
                select(LeaveApplication)
                .options(selectinload(LeaveApplication.employee))
                .where(LeaveApplication.id == request_id)
            )
            result = await self.db.execute(query)
            leave = result.scalar_one_or_none()
            
            if not leave:
                raise ToolExecutionError("Leave request not found", "NOT_FOUND")
            
            # Verify the approver is the reporting manager
            if leave.employee.reporting_manager_id != self.employee.id:
                raise ToolExecutionError("You are not authorized to approve this request", "FORBIDDEN")
            
            if leave.status != "PENDING":
                raise ToolExecutionError(f"Leave is already {leave.status.lower()}", "INVALID_STATUS")
            
            # Approve the leave
            leave.status = "APPROVED"
            leave.approved_by_id = self.employee.id
            leave.approved_at = datetime.utcnow()
            leave.approval_comments = comments
            
            # Update balance
            balance_query = (
                select(LeaveBalance)
                .where(LeaveBalance.employee_id == leave.employee_id)
                .where(LeaveBalance.leave_type_id == leave.leave_type_id)
                .where(LeaveBalance.year == leave.start_date.year)
            )
            result = await self.db.execute(balance_query)
            balance = result.scalar_one_or_none()
            
            if balance:
                balance.pending_days = max(0, balance.pending_days - leave.days)
                balance.used_days += leave.days
            
            await self.db.flush()
            
            return {
                "success": True,
                "message": f"Leave approved for {leave.employee.first_name} {leave.employee.last_name}",
            }
        
        raise ToolExecutionError(f"Approval for {request_type} not implemented", "NOT_IMPLEMENTED")
    
    async def _execute_reject_request(
        self,
        request_type: str,
        request_id: str,
        reason: str,
    ) -> Dict[str, Any]:
        """Reject a pending request"""
        if request_type == "LEAVE":
            query = (
                select(LeaveApplication)
                .options(selectinload(LeaveApplication.employee))
                .where(LeaveApplication.id == request_id)
            )
            result = await self.db.execute(query)
            leave = result.scalar_one_or_none()
            
            if not leave:
                raise ToolExecutionError("Leave request not found", "NOT_FOUND")
            
            if leave.employee.reporting_manager_id != self.employee.id:
                raise ToolExecutionError("You are not authorized to reject this request", "FORBIDDEN")
            
            if leave.status != "PENDING":
                raise ToolExecutionError(f"Leave is already {leave.status.lower()}", "INVALID_STATUS")
            
            leave.status = "REJECTED"
            leave.rejected_by_id = self.employee.id
            leave.rejected_at = datetime.utcnow()
            leave.rejection_reason = reason
            
            # Update balance
            balance_query = (
                select(LeaveBalance)
                .where(LeaveBalance.employee_id == leave.employee_id)
                .where(LeaveBalance.leave_type_id == leave.leave_type_id)
                .where(LeaveBalance.year == leave.start_date.year)
            )
            result = await self.db.execute(balance_query)
            balance = result.scalar_one_or_none()
            
            if balance:
                balance.pending_days = max(0, balance.pending_days - leave.days)
            
            await self.db.flush()
            
            return {
                "success": True,
                "message": f"Leave rejected for {leave.employee.first_name} {leave.employee.last_name}",
            }
        
        raise ToolExecutionError(f"Rejection for {request_type} not implemented", "NOT_IMPLEMENTED")
    
    async def _execute_get_announcements(self, limit: int = 5) -> Dict[str, Any]:
        """Get company announcements"""
        query = (
            select(Announcement)
            .where(Announcement.company_id == self.employee.company_id)
            .where(Announcement.is_active == True)
            .order_by(Announcement.created_at.desc())
            .limit(limit)
        )
        
        result = await self.db.execute(query)
        announcements = result.scalars().all()
        
        return {
            "announcements": [
                {
                    "title": a.title,
                    "content": a.content[:200] + "..." if len(a.content) > 200 else a.content,
                    "priority": a.priority,
                    "published": a.created_at.isoformat() if a.created_at else None,
                }
                for a in announcements
            ],
        }
