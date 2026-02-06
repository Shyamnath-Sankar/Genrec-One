# HRMS Customization Guide

This guide explains how to customize the HRMS by enabling/disabling modules and configuring module-specific settings.

---

## Feature Flags System

The HRMS uses a feature flags system to enable or disable modules. This allows you to:
- Deploy only the features your organization needs
- Reduce complexity for end users
- Control navigation and API endpoints

---

## Configuration File

Feature flags are configured in:

```
backend/app/core/features.py
```

---

## Module Configuration

### Available Modules

| Module | Default | Description |
|--------|---------|-------------|
| `EMPLOYEES` | `True` | Employee directory and management |
| `ATTENDANCE` | `True` | Check-in/out, attendance tracking |
| `LEAVES` | `True` | Leave management and approvals |
| `PAYROLL` | `True` | Salary processing and payslips |
| `EXPENSES` | `True` | Expense claims and reimbursements |
| `TIMESHEETS` | `True` | Time tracking and project hours |
| `PROJECTS` | `True` | Project management |
| `RECRUITMENT` | `True` | Job postings and candidate tracking |
| `PERFORMANCE` | `True` | Goals, appraisals, feedback |
| `ONBOARDING` | `True` | New employee onboarding workflows |
| `ASSETS` | `True` | Asset management and tracking |
| `HELPDESK` | `True` | IT/HR support tickets |
| `TRAVEL` | `True` | Travel requests and approvals |
| `DOCUMENTS` | `True` | Document management |
| `COMPLIANCE` | `True` | Compliance tracking |
| `TRAINING` | `True` | Training and certifications |
| `REPORTS` | `True` | Reporting and analytics |
| `ANALYTICS` | `True` | Advanced analytics |

### Enabling/Disabling Modules

To disable a module, set its flag to `False`:

```python
# backend/app/core/features.py

class FeatureFlags:
    # Core Modules (typically always enabled)
    EMPLOYEES: bool = True
    ATTENDANCE: bool = True
    LEAVES: bool = True
    
    # Disable payroll for organizations using external payroll
    PAYROLL: bool = False
    
    # Disable recruitment if not hiring
    RECRUITMENT: bool = False
    
    # Keep other modules enabled
    EXPENSES: bool = True
    # ... etc
```

### Effects of Disabling a Module

When a module is disabled:
1. **Navigation**: Menu item is hidden
2. **API Endpoints**: Return 404 (optional, based on implementation)
3. **Database**: Tables remain but are unused
4. **Reports**: Module-specific reports are hidden

---

## Module-Specific Settings

Beyond on/off toggles, each module has detailed configuration options.

### Attendance Settings

```python
class ModuleSettings:
    # Require GPS location when checking in
    ATTENDANCE_GEOLOCATION_REQUIRED: bool = False
    
    # Require selfie when checking in
    ATTENDANCE_PHOTO_REQUIRED: bool = False
    
    # Allow work-from-home check-ins
    ATTENDANCE_ALLOW_WFH: bool = True
    
    # Automatically check out after X hours if forgotten
    ATTENDANCE_AUTO_CHECKOUT: bool = True
    ATTENDANCE_AUTO_CHECKOUT_HOURS: int = 12
```

### Leave Settings

```python
class ModuleSettings:
    # Count weekends between leave days (sandwich rule)
    LEAVE_SANDWICH_RULE: bool = True
    
    # Require manager approval for all leaves
    LEAVE_REQUIRE_APPROVAL: bool = True
    
    # Allow half-day leave applications
    LEAVE_HALF_DAY_ALLOWED: bool = True
    
    # Days until compensatory off expires
    LEAVE_COMP_OFF_EXPIRY_DAYS: int = 30
```

### Payroll Settings

```python
class ModuleSettings:
    # Currency for salary display
    PAYROLL_CURRENCY: str = "USD"
    
    # Enable statutory deductions (PF, ESI, etc.)
    PAYROLL_STATUTORY_ENABLED: bool = True
    
    # Automatically calculate tax
    PAYROLL_AUTO_TAX_CALCULATION: bool = True
```

### Expense Settings

```python
class ModuleSettings:
    # Require receipt for all expenses
    EXPENSE_RECEIPT_REQUIRED: bool = True
    
    # Auto-approve expenses below this amount
    EXPENSE_AUTO_APPROVAL_LIMIT: float = 50.0
```

### Performance Settings

```python
class ModuleSettings:
    # Enable 360-degree feedback
    PERFORMANCE_360_FEEDBACK: bool = True
    
    # Allow employees to self-review
    PERFORMANCE_SELF_REVIEW: bool = True
    
    # Enable goal tracking features
    PERFORMANCE_GOAL_TRACKING: bool = True
```

### Recruitment Settings

```python
class ModuleSettings:
    # Enable public career page
    RECRUITMENT_CAREER_PAGE: bool = True
    
    # Enable offer letter templates
    RECRUITMENT_OFFER_LETTER_TEMPLATE: bool = True
```

### General Settings

```python
class ModuleSettings:
    # Show company logo in header
    COMPANY_LOGO_ENABLED: bool = True
    
    # Enable dark mode toggle
    DARK_MODE_ENABLED: bool = True
    
    # Enable multiple languages
    MULTI_LANGUAGE_ENABLED: bool = False
    
    # Default language code
    DEFAULT_LANGUAGE: str = "en"
```

---

## Common Configuration Scenarios

### Scenario 1: Small Company (< 50 employees)

Focus on core HR functions, disable complex features:

```python
class FeatureFlags:
    EMPLOYEES: bool = True
    ATTENDANCE: bool = True
    LEAVES: bool = True
    PAYROLL: bool = True
    DOCUMENTS: bool = True
    
    # Disable advanced modules
    TIMESHEETS: bool = False
    PROJECTS: bool = False
    RECRUITMENT: bool = False
    PERFORMANCE: bool = False
    ONBOARDING: bool = False
    ASSETS: bool = False
    HELPDESK: bool = False
    TRAVEL: bool = False
    COMPLIANCE: bool = False
    TRAINING: bool = False
    ANALYTICS: bool = False
```

### Scenario 2: IT Services Company

Enable timesheet and project tracking:

```python
class FeatureFlags:
    EMPLOYEES: bool = True
    ATTENDANCE: bool = True
    LEAVES: bool = True
    PAYROLL: bool = True
    TIMESHEETS: bool = True      # Track billable hours
    PROJECTS: bool = True        # Project management
    EXPENSES: bool = True        # Client-reimbursable expenses
    RECRUITMENT: bool = True     # Always hiring
    PERFORMANCE: bool = True
    ASSETS: bool = True          # Laptop tracking
    
    # May not need
    TRAVEL: bool = False
    COMPLIANCE: bool = False
```

### Scenario 3: Manufacturing Company

Focus on attendance and compliance:

```python
class FeatureFlags:
    EMPLOYEES: bool = True
    ATTENDANCE: bool = True      # Shift tracking
    LEAVES: bool = True
    PAYROLL: bool = True
    COMPLIANCE: bool = True      # Safety certifications
    TRAINING: bool = True        # Safety training
    ASSETS: bool = True          # Equipment tracking
    
    # Less relevant
    TIMESHEETS: bool = False
    PROJECTS: bool = False
    RECRUITMENT: bool = False
```

### Scenario 4: Using External Payroll System

Disable payroll, keep everything else:

```python
class FeatureFlags:
    PAYROLL: bool = False        # Using ADP/Paychex/etc.
    
    # Everything else enabled
    EMPLOYEES: bool = True
    ATTENDANCE: bool = True
    LEAVES: bool = True
    # ... etc
```

---

## Navigation Customization

The navigation is dynamically built based on enabled modules. The function `get_navigation_items()` in `features.py` returns the navigation structure.

### Adding Custom Navigation Items

```python
# In features.py

def get_navigation_items() -> List[dict]:
    nav_items = [
        {"name": "Dashboard", "path": "/dashboard", "icon": "LayoutDashboard", "always_visible": True},
    ]
    
    # Add custom items
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
                # Add custom sub-item
                {"name": "Org Chart", "path": "/employees/org-chart"},
            ]
        })
    
    # ... rest of navigation
```

### Hiding Navigation Based on Permissions

Each navigation item can have a `permission` attribute:

```python
{
    "name": "Payroll",
    "path": "/payroll",
    "icon": "DollarSign",
    "permission": "payroll.view_own",  # Only users with this permission see it
    "children": [
        {"name": "My Payslips", "path": "/payroll"},
        {"name": "Run Payroll", "path": "/payroll/run", "permission": "payroll.process"},
    ]
}
```

---

## API Feature Checking

Use the feature flags in API routes:

```python
# In any router file

from app.core.features import FeatureFlags

@router.get("/timesheets")
async def get_timesheets():
    if not FeatureFlags.TIMESHEETS:
        raise HTTPException(status_code=404, detail="Timesheets module is disabled")
    
    # ... rest of endpoint
```

### Getting Enabled Modules via API

The backend provides an endpoint to fetch enabled modules:

```python
@router.get("/api/v1/settings/features")
async def get_features():
    return FeatureFlags.get_config()
```

Response:
```json
{
    "employees": true,
    "attendance": true,
    "leaves": true,
    "payroll": false,
    "timesheets": true,
    ...
}
```

---

## Frontend Feature Integration

The frontend should fetch features from the API and conditionally render navigation.

### Fetching Features

```typescript
// src/lib/api/features.ts

export async function getFeatures() {
  const response = await fetch('/api/v1/settings/features');
  return response.json();
}
```

### Conditional Navigation

```tsx
// In your navigation component

function Sidebar() {
  const { features } = useFeatures();
  
  return (
    <nav>
      <NavItem href="/dashboard" icon={LayoutDashboard}>Dashboard</NavItem>
      
      {features.employees && (
        <NavItem href="/employees" icon={Users}>Employees</NavItem>
      )}
      
      {features.attendance && (
        <NavItem href="/attendance" icon={Clock}>Attendance</NavItem>
      )}
      
      {features.payroll && (
        <NavItem href="/payroll" icon={DollarSign}>Payroll</NavItem>
      )}
      
      {/* ... other items */}
    </nav>
  );
}
```

---

## Environment-Based Configuration

For different environments (dev, staging, production), you can use environment variables:

```python
# features.py
import os

class FeatureFlags:
    PAYROLL: bool = os.getenv("FEATURE_PAYROLL", "true").lower() == "true"
    RECRUITMENT: bool = os.getenv("FEATURE_RECRUITMENT", "true").lower() == "true"
    # ... etc
```

Then in `.env`:
```env
FEATURE_PAYROLL=true
FEATURE_RECRUITMENT=false
```

---

## Adding New Modules

To add a new module:

1. **Add Feature Flag**
   ```python
   class FeatureFlags:
       # ... existing flags
       MY_NEW_MODULE: bool = True
   ```

2. **Update Navigation**
   ```python
   if FeatureFlags.MY_NEW_MODULE:
       nav_items.append({
           "name": "My Module",
           "path": "/my-module",
           "icon": "Star",
       })
   ```

3. **Update Config Export**
   ```python
   @classmethod
   def get_config(cls) -> Dict[str, bool]:
       return {
           # ... existing
           "my_new_module": cls.MY_NEW_MODULE,
       }
   ```

4. **Create API Routes**
   - Add router in `backend/app/api/routes/my_module/router.py`
   - Register in `main.py`

5. **Create Frontend Pages**
   - Add page in `src/app/(dashboard)/my-module/page.tsx`

---

## Role-Based Module Access

Even if a module is enabled, access can be restricted by role:

```python
# In seed.py or role configuration

ROLE_PERMISSIONS = {
    "super_admin": ["*"],  # All permissions
    "hr_admin": [
        "employees.*",
        "attendance.*",
        "leaves.*",
        "payroll.view",
        "payroll.configure",
        "recruitment.*",
        # No access to settings.*
    ],
    "manager": [
        "employees.view_team",
        "attendance.view_team",
        "leaves.approve_team",
        # Limited access
    ],
    "employee": [
        "attendance.own",
        "leaves.own",
        "payroll.view_own",
        # Self-service only
    ],
}
```

---

## Best Practices

1. **Start minimal** - Enable only modules you'll use
2. **Test after changes** - Verify navigation updates correctly
3. **Document customizations** - Keep track of your configuration
4. **Use environment variables** - For different environments
5. **Restart servers** - After changing feature flags

---

## Troubleshooting

### Module still visible after disabling

1. Clear browser cache
2. Restart backend server
3. Check if frontend is caching features

### API endpoint still accessible

Feature flags don't automatically disable endpoints. Add checks in route handlers:

```python
if not FeatureFlags.MODULE_NAME:
    raise HTTPException(status_code=404, detail="Module disabled")
```

### Navigation not updating

Ensure the frontend is fetching features from the API and not using hardcoded values.

---

*For setup instructions, see [Setup Guide](./SETUP.md)*
*For user guides, see [Employee Guide](./USER_GUIDE_EMPLOYEE.md) or [HR Guide](./USER_GUIDE_HR.md)*
