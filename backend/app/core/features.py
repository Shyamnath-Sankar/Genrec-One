"""
Feature Flags Configuration
Enable or disable HRMS modules based on your requirements.
"""
from typing import Dict, List


class FeatureFlags:
    """
    Configure which modules are enabled for your HRMS instance.
    Set to False to disable a module completely.
    """
    
    # Core Modules (typically always enabled)
    EMPLOYEES: bool = True
    ATTENDANCE: bool = True
    LEAVES: bool = True
    
    # Payroll & Finance
    PAYROLL: bool = True
    EXPENSES: bool = True
    
    # Time & Project Management
    TIMESHEETS: bool = True
    PROJECTS: bool = True
    
    # HR Modules
    RECRUITMENT: bool = True
    PERFORMANCE: bool = True
    ONBOARDING: bool = True
    
    # Asset & Facilities
    ASSETS: bool = True
    HELPDESK: bool = True
    TRAVEL: bool = True
    
    # Documents & Compliance
    DOCUMENTS: bool = True
    COMPLIANCE: bool = True
    TRAINING: bool = True
    
    # Analytics
    REPORTS: bool = True
    ANALYTICS: bool = True
    
    @classmethod
    def get_enabled_modules(cls) -> List[str]:
        """Returns list of enabled module names."""
        return [
            attr for attr in dir(cls)
            if not attr.startswith('_') 
            and isinstance(getattr(cls, attr), bool)
            and getattr(cls, attr) is True
        ]
    
    @classmethod
    def is_enabled(cls, module: str) -> bool:
        """Check if a module is enabled."""
        return getattr(cls, module.upper(), False)
    
    @classmethod
    def get_config(cls) -> Dict[str, bool]:
        """Returns dictionary of all module configurations."""
        return {
            "employees": cls.EMPLOYEES,
            "attendance": cls.ATTENDANCE,
            "leaves": cls.LEAVES,
            "payroll": cls.PAYROLL,
            "expenses": cls.EXPENSES,
            "timesheets": cls.TIMESHEETS,
            "projects": cls.PROJECTS,
            "recruitment": cls.RECRUITMENT,
            "performance": cls.PERFORMANCE,
            "onboarding": cls.ONBOARDING,
            "assets": cls.ASSETS,
            "helpdesk": cls.HELPDESK,
            "travel": cls.TRAVEL,
            "documents": cls.DOCUMENTS,
            "compliance": cls.COMPLIANCE,
            "training": cls.TRAINING,
            "reports": cls.REPORTS,
            "analytics": cls.ANALYTICS,
        }


# Module-specific settings
class ModuleSettings:
    """
    Detailed configuration for each module.
    Customize behavior without disabling the entire module.
    """
    
    # Attendance Settings
    ATTENDANCE_GEOLOCATION_REQUIRED: bool = False
    ATTENDANCE_PHOTO_REQUIRED: bool = False
    ATTENDANCE_ALLOW_WFH: bool = True
    ATTENDANCE_AUTO_CHECKOUT: bool = True
    ATTENDANCE_AUTO_CHECKOUT_HOURS: int = 12
    
    # Leave Settings
    LEAVE_SANDWICH_RULE: bool = True  # Count weekends between leaves
    LEAVE_REQUIRE_APPROVAL: bool = True
    LEAVE_HALF_DAY_ALLOWED: bool = True
    LEAVE_COMP_OFF_EXPIRY_DAYS: int = 30
    
    # Payroll Settings
    PAYROLL_CURRENCY: str = "USD"
    PAYROLL_STATUTORY_ENABLED: bool = True
    PAYROLL_AUTO_TAX_CALCULATION: bool = True
    
    # Expense Settings
    EXPENSE_RECEIPT_REQUIRED: bool = True
    EXPENSE_AUTO_APPROVAL_LIMIT: float = 50.0  # Auto-approve below this
    
    # Performance Settings
    PERFORMANCE_360_FEEDBACK: bool = True
    PERFORMANCE_SELF_REVIEW: bool = True
    PERFORMANCE_GOAL_TRACKING: bool = True
    
    # Recruitment Settings
    RECRUITMENT_CAREER_PAGE: bool = True
    RECRUITMENT_OFFER_LETTER_TEMPLATE: bool = True
    
    # General Settings
    COMPANY_LOGO_ENABLED: bool = True
    DARK_MODE_ENABLED: bool = True
    MULTI_LANGUAGE_ENABLED: bool = False
    DEFAULT_LANGUAGE: str = "en"


# Navigation items based on enabled modules
def get_navigation_items() -> List[dict]:
    """
    Returns navigation items based on enabled modules.
    Use this to dynamically build the sidebar navigation.
    """
    nav_items = [
        {"name": "Dashboard", "path": "/dashboard", "icon": "LayoutDashboard", "always_visible": True},
    ]
    
    if FeatureFlags.EMPLOYEES:
        nav_items.append({
            "name": "Employees",
            "path": "/employees",
            "icon": "Users",
            "permission": "employees.view",
            "children": [
                {"name": "All Employees", "path": "/employees"},
                {"name": "Departments", "path": "/employees/departments"},
                {"name": "Designations", "path": "/employees/designations"},
            ]
        })
    
    if FeatureFlags.ATTENDANCE:
        nav_items.append({
            "name": "Attendance",
            "path": "/attendance",
            "icon": "Clock",
            "children": [
                {"name": "My Attendance", "path": "/attendance"},
                {"name": "Team Attendance", "path": "/attendance/team", "permission": "attendance.view_team"},
                {"name": "Regularization", "path": "/attendance/regularization"},
            ]
        })
    
    if FeatureFlags.LEAVES:
        nav_items.append({
            "name": "Leaves",
            "path": "/leaves",
            "icon": "Calendar",
            "children": [
                {"name": "My Leaves", "path": "/leaves"},
                {"name": "Apply Leave", "path": "/leaves/apply"},
                {"name": "Team Leaves", "path": "/leaves/team", "permission": "leaves.view_team"},
                {"name": "Holidays", "path": "/leaves/holidays"},
            ]
        })
    
    if FeatureFlags.PAYROLL:
        nav_items.append({
            "name": "Payroll",
            "path": "/payroll",
            "icon": "DollarSign",
            "permission": "payroll.view_own",
            "children": [
                {"name": "My Payslips", "path": "/payroll"},
                {"name": "Salary Structure", "path": "/payroll/salary", "permission": "payroll.configure"},
                {"name": "Run Payroll", "path": "/payroll/run", "permission": "payroll.process"},
            ]
        })
    
    if FeatureFlags.TIMESHEETS:
        nav_items.append({
            "name": "Timesheets",
            "path": "/timesheets",
            "icon": "FileText",
            "children": [
                {"name": "My Timesheets", "path": "/timesheets"},
                {"name": "Projects", "path": "/timesheets/projects"},
                {"name": "Approvals", "path": "/timesheets/approvals", "permission": "timesheets.approve"},
            ]
        })
    
    if FeatureFlags.EXPENSES:
        nav_items.append({
            "name": "Expenses",
            "path": "/expenses",
            "icon": "Receipt",
            "children": [
                {"name": "My Expenses", "path": "/expenses"},
                {"name": "Submit Claim", "path": "/expenses/submit"},
                {"name": "Approvals", "path": "/expenses/approvals", "permission": "expenses.approve"},
            ]
        })
    
    if FeatureFlags.RECRUITMENT:
        nav_items.append({
            "name": "Recruitment",
            "path": "/recruitment",
            "icon": "Briefcase",
            "permission": "recruitment.view",
            "children": [
                {"name": "Jobs", "path": "/recruitment"},
                {"name": "Candidates", "path": "/recruitment/candidates"},
                {"name": "Interviews", "path": "/recruitment/interviews"},
            ]
        })
    
    if FeatureFlags.PERFORMANCE:
        nav_items.append({
            "name": "Performance",
            "path": "/performance",
            "icon": "Target",
            "children": [
                {"name": "My Goals", "path": "/performance"},
                {"name": "Appraisals", "path": "/performance/appraisals"},
                {"name": "Feedback", "path": "/performance/feedback"},
            ]
        })
    
    if FeatureFlags.ASSETS:
        nav_items.append({
            "name": "Assets",
            "path": "/assets",
            "icon": "Package",
            "children": [
                {"name": "My Assets", "path": "/assets/my"},
                {"name": "All Assets", "path": "/assets", "permission": "assets.view"},
            ]
        })
    
    if FeatureFlags.HELPDESK:
        nav_items.append({
            "name": "Helpdesk",
            "path": "/tickets",
            "icon": "HelpCircle",
            "children": [
                {"name": "My Tickets", "path": "/tickets"},
                {"name": "Create Ticket", "path": "/tickets/create"},
                {"name": "Knowledge Base", "path": "/tickets/kb"},
            ]
        })
    
    if FeatureFlags.TRAVEL:
        nav_items.append({
            "name": "Travel",
            "path": "/travel",
            "icon": "Plane",
            "children": [
                {"name": "My Requests", "path": "/travel"},
                {"name": "New Request", "path": "/travel/new"},
            ]
        })
    
    if FeatureFlags.DOCUMENTS:
        nav_items.append({
            "name": "Documents",
            "path": "/documents",
            "icon": "FileText",
            "children": [
                {"name": "My Documents", "path": "/documents"},
                {"name": "Company Documents", "path": "/documents/company"},
            ]
        })
    
    if FeatureFlags.REPORTS:
        nav_items.append({
            "name": "Reports",
            "path": "/reports",
            "icon": "BarChart3",
            "permission": "reports.view",
        })
    
    # Settings always visible for admins
    nav_items.append({
        "name": "Settings",
        "path": "/settings",
        "icon": "Settings",
        "permission": "settings.view",
    })
    
    return nav_items


# Export feature configuration for API
features = FeatureFlags()
settings = ModuleSettings()
