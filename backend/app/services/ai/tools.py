"""
HRMS Tool Definitions for AI Chatbot.
Defines all available tools/functions the AI can call.
"""
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum


class ToolCategory(str, Enum):
    """Categories of tools for organization"""
    LEAVE = "leave"
    ATTENDANCE = "attendance"
    TICKETS = "tickets"
    PROFILE = "profile"
    PAYROLL = "payroll"
    QUERY = "query"
    GENERAL = "general"


class RiskLevel(str, Enum):
    """Risk level for tool operations"""
    LOW = "low"        # Read operations, safe to auto-execute
    MEDIUM = "medium"  # Create operations, may need confirmation
    HIGH = "high"      # Update/Delete operations, requires confirmation


@dataclass
class ToolDefinition:
    """Represents a tool that can be called by the AI"""
    name: str
    description: str
    category: ToolCategory
    risk_level: RiskLevel
    parameters: Dict[str, Any]
    required_permissions: List[str] = None
    requires_confirmation: bool = False
    
    def to_openai_format(self) -> Dict[str, Any]:
        """Convert to OpenAI function calling format"""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters,
            }
        }


# ============================================
# LEAVE MANAGEMENT TOOLS
# ============================================

GET_LEAVE_BALANCE = ToolDefinition(
    name="get_leave_balance",
    description="Get the current leave balance for the employee. Shows available days for each leave type (Casual, Sick, Earned, etc.)",
    category=ToolCategory.LEAVE,
    risk_level=RiskLevel.LOW,
    parameters={
        "type": "object",
        "properties": {},
        "required": [],
    },
)

APPLY_LEAVE = ToolDefinition(
    name="apply_leave",
    description="Apply for leave. Requires leave type, start date, end date, and reason. The employee must have sufficient balance.",
    category=ToolCategory.LEAVE,
    risk_level=RiskLevel.MEDIUM,
    requires_confirmation=True,
    parameters={
        "type": "object",
        "properties": {
            "leave_type": {
                "type": "string",
                "description": "Type of leave: CASUAL, SICK, EARNED, MATERNITY, PATERNITY, COMPENSATORY, UNPAID",
            },
            "start_date": {
                "type": "string",
                "description": "Start date of leave in YYYY-MM-DD format",
            },
            "end_date": {
                "type": "string",
                "description": "End date of leave in YYYY-MM-DD format",
            },
            "reason": {
                "type": "string",
                "description": "Reason for taking leave",
            },
            "is_half_day": {
                "type": "boolean",
                "description": "Whether this is a half-day leave (only valid for single day)",
                "default": False,
            },
            "half_day_type": {
                "type": "string",
                "description": "If half day, specify FIRST_HALF or SECOND_HALF",
                "enum": ["FIRST_HALF", "SECOND_HALF"],
            },
        },
        "required": ["leave_type", "start_date", "end_date", "reason"],
    },
)

GET_MY_LEAVE_APPLICATIONS = ToolDefinition(
    name="get_my_leave_applications",
    description="Get list of employee's leave applications with their status (pending, approved, rejected)",
    category=ToolCategory.LEAVE,
    risk_level=RiskLevel.LOW,
    parameters={
        "type": "object",
        "properties": {
            "status": {
                "type": "string",
                "description": "Filter by status: PENDING, APPROVED, REJECTED, CANCELLED",
                "enum": ["PENDING", "APPROVED", "REJECTED", "CANCELLED"],
            },
            "limit": {
                "type": "integer",
                "description": "Maximum number of applications to return",
                "default": 10,
            },
        },
        "required": [],
    },
)

CANCEL_LEAVE = ToolDefinition(
    name="cancel_leave",
    description="Cancel a pending or approved leave application. Only the employee who applied can cancel.",
    category=ToolCategory.LEAVE,
    risk_level=RiskLevel.HIGH,
    requires_confirmation=True,
    parameters={
        "type": "object",
        "properties": {
            "leave_id": {
                "type": "string",
                "description": "ID of the leave application to cancel",
            },
            "reason": {
                "type": "string",
                "description": "Reason for cancellation",
            },
        },
        "required": ["leave_id"],
    },
)

GET_UPCOMING_HOLIDAYS = ToolDefinition(
    name="get_upcoming_holidays",
    description="Get list of upcoming company holidays for the current year",
    category=ToolCategory.LEAVE,
    risk_level=RiskLevel.LOW,
    parameters={
        "type": "object",
        "properties": {
            "limit": {
                "type": "integer",
                "description": "Maximum number of holidays to return",
                "default": 10,
            },
        },
        "required": [],
    },
)


# ============================================
# ATTENDANCE TOOLS
# ============================================

GET_ATTENDANCE_STATUS = ToolDefinition(
    name="get_attendance_status",
    description="Get today's attendance status - whether checked in, checked out, or not marked",
    category=ToolCategory.ATTENDANCE,
    risk_level=RiskLevel.LOW,
    parameters={
        "type": "object",
        "properties": {},
        "required": [],
    },
)

CHECK_IN = ToolDefinition(
    name="check_in",
    description="Mark attendance check-in for today. Records the current time as check-in time.",
    category=ToolCategory.ATTENDANCE,
    risk_level=RiskLevel.MEDIUM,
    requires_confirmation=True,
    parameters={
        "type": "object",
        "properties": {
            "notes": {
                "type": "string",
                "description": "Optional notes for check-in (e.g., working from home)",
            },
        },
        "required": [],
    },
)

CHECK_OUT = ToolDefinition(
    name="check_out",
    description="Mark attendance check-out for today. Records the current time as check-out time.",
    category=ToolCategory.ATTENDANCE,
    risk_level=RiskLevel.MEDIUM,
    requires_confirmation=True,
    parameters={
        "type": "object",
        "properties": {
            "notes": {
                "type": "string",
                "description": "Optional notes for check-out",
            },
        },
        "required": [],
    },
)

GET_ATTENDANCE_SUMMARY = ToolDefinition(
    name="get_attendance_summary",
    description="Get attendance summary for a month - total present days, absent, late arrivals, etc.",
    category=ToolCategory.ATTENDANCE,
    risk_level=RiskLevel.LOW,
    parameters={
        "type": "object",
        "properties": {
            "month": {
                "type": "integer",
                "description": "Month number (1-12). Defaults to current month.",
            },
            "year": {
                "type": "integer",
                "description": "Year. Defaults to current year.",
            },
        },
        "required": [],
    },
)


# ============================================
# HELPDESK / TICKET TOOLS
# ============================================

CREATE_TICKET = ToolDefinition(
    name="create_ticket",
    description="Create a new helpdesk/support ticket for IT issues, HR queries, facilities requests, etc.",
    category=ToolCategory.TICKETS,
    risk_level=RiskLevel.MEDIUM,
    requires_confirmation=True,
    parameters={
        "type": "object",
        "properties": {
            "subject": {
                "type": "string",
                "description": "Brief subject/title for the ticket",
            },
            "description": {
                "type": "string",
                "description": "Detailed description of the issue or request",
            },
            "category": {
                "type": "string",
                "description": "Category: IT_SUPPORT, HR_QUERY, FACILITIES, PAYROLL, GENERAL",
                "enum": ["IT_SUPPORT", "HR_QUERY", "FACILITIES", "PAYROLL", "GENERAL"],
            },
            "priority": {
                "type": "string",
                "description": "Priority level: LOW, MEDIUM, HIGH, URGENT",
                "enum": ["LOW", "MEDIUM", "HIGH", "URGENT"],
                "default": "MEDIUM",
            },
        },
        "required": ["subject", "description", "category"],
    },
)

GET_MY_TICKETS = ToolDefinition(
    name="get_my_tickets",
    description="Get list of tickets created by the employee",
    category=ToolCategory.TICKETS,
    risk_level=RiskLevel.LOW,
    parameters={
        "type": "object",
        "properties": {
            "status": {
                "type": "string",
                "description": "Filter by status: OPEN, IN_PROGRESS, RESOLVED, CLOSED",
                "enum": ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"],
            },
            "limit": {
                "type": "integer",
                "description": "Maximum number of tickets to return",
                "default": 10,
            },
        },
        "required": [],
    },
)

ADD_TICKET_COMMENT = ToolDefinition(
    name="add_ticket_comment",
    description="Add a comment/reply to an existing ticket",
    category=ToolCategory.TICKETS,
    risk_level=RiskLevel.LOW,
    parameters={
        "type": "object",
        "properties": {
            "ticket_id": {
                "type": "string",
                "description": "ID of the ticket to comment on",
            },
            "comment": {
                "type": "string",
                "description": "Comment text to add",
            },
        },
        "required": ["ticket_id", "comment"],
    },
)


# ============================================
# PROFILE & EMPLOYEE TOOLS
# ============================================

GET_MY_PROFILE = ToolDefinition(
    name="get_my_profile",
    description="Get the employee's profile information including name, department, designation, contact details",
    category=ToolCategory.PROFILE,
    risk_level=RiskLevel.LOW,
    parameters={
        "type": "object",
        "properties": {},
        "required": [],
    },
)

GET_TEAM_MEMBERS = ToolDefinition(
    name="get_team_members",
    description="Get list of team members reporting to the employee (for managers)",
    category=ToolCategory.PROFILE,
    risk_level=RiskLevel.LOW,
    required_permissions=["employees.view"],
    parameters={
        "type": "object",
        "properties": {},
        "required": [],
    },
)

GET_DEPARTMENT_DIRECTORY = ToolDefinition(
    name="get_department_directory",
    description="Get directory of employees in a specific department with contact information",
    category=ToolCategory.PROFILE,
    risk_level=RiskLevel.LOW,
    parameters={
        "type": "object",
        "properties": {
            "department_name": {
                "type": "string",
                "description": "Name of the department to search",
            },
        },
        "required": [],
    },
)


# ============================================
# PAYROLL TOOLS
# ============================================

GET_PAYSLIP = ToolDefinition(
    name="get_payslip",
    description="Get payslip details for a specific month. Shows earnings, deductions, and net pay.",
    category=ToolCategory.PAYROLL,
    risk_level=RiskLevel.LOW,
    parameters={
        "type": "object",
        "properties": {
            "month": {
                "type": "integer",
                "description": "Month number (1-12). Defaults to last processed month.",
            },
            "year": {
                "type": "integer",
                "description": "Year. Defaults to current year.",
            },
        },
        "required": [],
    },
)

GET_SALARY_STRUCTURE = ToolDefinition(
    name="get_salary_structure",
    description="Get the employee's salary structure breakdown - base pay, allowances, benefits",
    category=ToolCategory.PAYROLL,
    risk_level=RiskLevel.LOW,
    parameters={
        "type": "object",
        "properties": {},
        "required": [],
    },
)


# ============================================
# QUERY TOOLS (Text-to-SQL via Vanna)
# ============================================

QUERY_HR_DATA = ToolDefinition(
    name="query_hr_data",
    description="""
    Answer HR-related analytical questions using the database. 
    Use this for questions like:
    - How many employees are in the Engineering department?
    - What's the average leave balance across all employees?
    - How many leaves were approved last month?
    - What's the attendance percentage this week?
    - Who are the employees who joined in 2024?
    This tool converts natural language to SQL and returns results.
    """,
    category=ToolCategory.QUERY,
    risk_level=RiskLevel.LOW,
    parameters={
        "type": "object",
        "properties": {
            "question": {
                "type": "string",
                "description": "The analytical question to answer using HR data",
            },
        },
        "required": ["question"],
    },
)


# ============================================
# GENERAL / PENDING APPROVALS TOOLS
# ============================================

GET_PENDING_APPROVALS = ToolDefinition(
    name="get_pending_approvals",
    description="Get list of items pending the employee's approval (leaves, expenses, travel requests)",
    category=ToolCategory.GENERAL,
    risk_level=RiskLevel.LOW,
    required_permissions=["approvals.view"],
    parameters={
        "type": "object",
        "properties": {
            "type": {
                "type": "string",
                "description": "Filter by type: LEAVE, EXPENSE, TRAVEL, ALL",
                "enum": ["LEAVE", "EXPENSE", "TRAVEL", "ALL"],
                "default": "ALL",
            },
        },
        "required": [],
    },
)

APPROVE_REQUEST = ToolDefinition(
    name="approve_request",
    description="Approve a pending request (leave, expense, travel). Only for managers/approvers.",
    category=ToolCategory.GENERAL,
    risk_level=RiskLevel.HIGH,
    requires_confirmation=True,
    required_permissions=["approvals.approve"],
    parameters={
        "type": "object",
        "properties": {
            "request_type": {
                "type": "string",
                "description": "Type of request: LEAVE, EXPENSE, TRAVEL",
                "enum": ["LEAVE", "EXPENSE", "TRAVEL"],
            },
            "request_id": {
                "type": "string",
                "description": "ID of the request to approve",
            },
            "comments": {
                "type": "string",
                "description": "Optional approval comments",
            },
        },
        "required": ["request_type", "request_id"],
    },
)

REJECT_REQUEST = ToolDefinition(
    name="reject_request",
    description="Reject a pending request (leave, expense, travel). Only for managers/approvers.",
    category=ToolCategory.GENERAL,
    risk_level=RiskLevel.HIGH,
    requires_confirmation=True,
    required_permissions=["approvals.approve"],
    parameters={
        "type": "object",
        "properties": {
            "request_type": {
                "type": "string",
                "description": "Type of request: LEAVE, EXPENSE, TRAVEL",
                "enum": ["LEAVE", "EXPENSE", "TRAVEL"],
            },
            "request_id": {
                "type": "string",
                "description": "ID of the request to reject",
            },
            "reason": {
                "type": "string",
                "description": "Reason for rejection (required)",
            },
        },
        "required": ["request_type", "request_id", "reason"],
    },
)

GET_ANNOUNCEMENTS = ToolDefinition(
    name="get_announcements",
    description="Get latest company announcements and news",
    category=ToolCategory.GENERAL,
    risk_level=RiskLevel.LOW,
    parameters={
        "type": "object",
        "properties": {
            "limit": {
                "type": "integer",
                "description": "Maximum number of announcements to return",
                "default": 5,
            },
        },
        "required": [],
    },
)


# ============================================
# ALL TOOLS REGISTRY
# ============================================

HRMS_TOOLS: List[ToolDefinition] = [
    # Leave
    GET_LEAVE_BALANCE,
    APPLY_LEAVE,
    GET_MY_LEAVE_APPLICATIONS,
    CANCEL_LEAVE,
    GET_UPCOMING_HOLIDAYS,
    # Attendance
    GET_ATTENDANCE_STATUS,
    CHECK_IN,
    CHECK_OUT,
    GET_ATTENDANCE_SUMMARY,
    # Tickets
    CREATE_TICKET,
    GET_MY_TICKETS,
    ADD_TICKET_COMMENT,
    # Profile
    GET_MY_PROFILE,
    GET_TEAM_MEMBERS,
    GET_DEPARTMENT_DIRECTORY,
    # Payroll
    GET_PAYSLIP,
    GET_SALARY_STRUCTURE,
    # Query
    QUERY_HR_DATA,
    # General
    GET_PENDING_APPROVALS,
    APPROVE_REQUEST,
    REJECT_REQUEST,
    GET_ANNOUNCEMENTS,
]


def get_tool_by_name(name: str) -> Optional[ToolDefinition]:
    """Get a tool definition by name"""
    for tool in HRMS_TOOLS:
        if tool.name == name:
            return tool
    return None


def get_tools_for_openai() -> List[Dict[str, Any]]:
    """Get all tools in OpenAI function calling format"""
    return [tool.to_openai_format() for tool in HRMS_TOOLS]


def get_tools_by_category(category: ToolCategory) -> List[ToolDefinition]:
    """Get all tools in a specific category"""
    return [tool for tool in HRMS_TOOLS if tool.category == category]


def get_safe_tools() -> List[ToolDefinition]:
    """Get tools that are safe to auto-execute (LOW risk)"""
    return [tool for tool in HRMS_TOOLS if tool.risk_level == RiskLevel.LOW]
