# HRMS HR Admin User Guide

This guide explains how HR Administrators and Managers can use the HRMS system to manage employees and HR processes.

---

## User Roles Overview

| Role | Access Level |
|------|--------------|
| **Super Admin** | Full system access, settings, configurations |
| **HR Admin** | Employee management, recruitment, payroll config, all HR modules |
| **Manager** | Team management, approvals for direct reports |
| **Employee** | Self-service only |

---

## Dashboard (HR View)

HR Admins see an expanded dashboard with:

- **Workforce Stats**: Total employees, new hires, attrition
- **Pending Approvals**: Leave requests, expense claims, timesheets
- **Open Positions**: Active job postings
- **Alerts**: Expiring documents, probation reviews due

---

## Employee Management

### Viewing All Employees

1. Go to **Employees** from the sidebar
2. View the complete employee directory
3. Use filters:
   - Department
   - Status (Active, Inactive, On Leave)
   - Employment type (Full-time, Part-time, Contract)

### Adding a New Employee

1. Click **Add Employee**
2. Fill in required information:
   - **Personal**: Name, email, phone, date of birth
   - **Employment**: Employee ID, join date, department, designation
   - **Reporting**: Reporting manager
   - **Compensation**: Salary structure
3. Click **Create Employee**
4. System sends login credentials to employee email

### Editing Employee Information

1. Click on an employee name
2. Click **Edit**
3. Update required fields
4. Save changes

Audit log tracks all changes made.

### Employee Actions

From the employee detail page:
- **Deactivate**: For employees leaving
- **Promote**: Change designation/department
- **Transfer**: Move to different team
- **Reset Password**: Send password reset email

### Departments & Designations

Go to **Employees** > **Departments** to:
- Create new departments
- Set department heads
- View headcount per department

Go to **Employees** > **Designations** to:
- Create job titles
- Set pay grades
- Define reporting hierarchy

---

## Attendance Management

### Team Attendance

Go to **Attendance** > **Team Attendance** to:
- View attendance for all team members
- See who's checked in today
- Identify absent employees

### Attendance Reports

Generate reports for:
- Daily attendance summary
- Monthly attendance by department
- Late arrivals report
- Overtime report

### Approving Regularization Requests

1. Go to **Attendance** > **Regularization**
2. View pending requests
3. Review employee's explanation
4. **Approve** or **Reject** with comments

### Attendance Policies

Configure in Settings:
- Core working hours
- Grace period for late arrival
- Half-day rules
- Overtime thresholds

---

## Leave Management

### Approving Leave Requests

1. Go to **Leaves** > **Team Leaves**
2. View pending leave requests
3. Check:
   - Employee's leave balance
   - Team calendar for conflicts
   - Reason provided
4. Click **Approve** or **Reject**
5. Employee is notified automatically

### Managing Leave Types

Go to **Settings** > **Leave Types** to:
- Create leave types (Casual, Sick, Earned, etc.)
- Set annual allocation per type
- Configure carry-forward rules
- Set approval workflow

### Leave Policies

Configure:
- **Sandwich Rule**: Whether weekends count between leaves
- **Notice Period**: Required advance notice for leave
- **Max Consecutive Days**: Per leave type
- **Comp-off Rules**: How compensatory off is earned and used

### Holiday Calendar

Go to **Leaves** > **Holidays** to:
- Add company holidays
- Mark optional holidays
- Set location-specific holidays

---

## Payroll Management

### Running Payroll

1. Go to **Payroll** > **Run Payroll**
2. Select payroll period (month)
3. System calculates:
   - Base salary
   - Allowances
   - Deductions (tax, insurance)
   - Overtime pay
   - Leave deductions
4. Review payroll summary
5. Click **Process Payroll**
6. Payslips are generated for all employees

### Salary Structure

Go to **Payroll** > **Salary Structure** to:
- Define salary components (Basic, HRA, DA, etc.)
- Set tax brackets
- Configure deductions
- Create salary templates per grade

### Viewing Employee Payroll

1. Go to **Employees** > select employee
2. View **Compensation** tab
3. See:
   - Current CTC
   - Salary breakdown
   - Historical payslips
   - YTD earnings

### Payroll Reports

Generate:
- Monthly payroll summary
- Department-wise salary report
- Tax deduction report
- Bank transfer file

---

## Timesheets & Projects

### Project Management

Go to **Timesheets** > **Projects** to:
- Create projects
- Assign team members
- Set project budgets
- Track billable hours

### Timesheet Approvals

1. Go to **Timesheets** > **Approvals**
2. View submitted timesheets
3. Review hours logged
4. Approve or return for revision

### Timesheet Reports

- Hours by project
- Hours by employee
- Billable vs non-billable
- Weekly utilization

---

## Expense Management

### Approving Expenses

1. Go to **Expenses** > **Approvals**
2. View pending expense claims
3. Verify:
   - Receipt attached
   - Within policy limits
   - Valid business purpose
4. Approve or reject

### Expense Policies

Configure in Settings:
- Spending limits per category
- Receipt requirements
- Auto-approval thresholds
- Reimbursement timelines

### Expense Reports

- Monthly expense summary
- Category breakdown
- Per-employee spending
- Budget vs actual

---

## Recruitment

### Managing Job Postings

Go to **Recruitment** > **Jobs** to:

1. **Create Job Posting**
   - Job title and description
   - Department and location
   - Required skills
   - Experience range
   - Salary range (optional)

2. **Publish Job**
   - Internal posting
   - External job boards
   - Company careers page

### Candidate Management

Go to **Recruitment** > **Candidates** to:
- View all applicants
- Filter by job posting
- Track candidate pipeline

### Candidate Pipeline

1. **New**: Just applied
2. **Screening**: Resume review
3. **Interview**: Scheduled for interview
4. **Offer**: Selected, offer pending
5. **Hired**: Accepted offer
6. **Rejected**: Not selected

### Scheduling Interviews

1. Select candidate
2. Click **Schedule Interview**
3. Select interviewers
4. Choose date/time
5. Send calendar invites

### Making Offers

1. Move candidate to **Offer** stage
2. Generate offer letter from template
3. Set:
   - Start date
   - Salary
   - Benefits
4. Send offer to candidate

---

## Performance Management

### Creating Goals

1. Go to **Performance**
2. Click **Create Goal**
3. Assign to employee(s)
4. Set:
   - Goal title and description
   - Target metrics
   - Due date
   - Weightage

### Performance Reviews

1. Go to **Performance** > **Appraisals**
2. Start appraisal cycle
3. Define:
   - Review period
   - Rating scale
   - Competencies to evaluate
4. Notify employees to complete self-review
5. Managers complete evaluations
6. HR reviews and calibrates

### 360 Feedback

If enabled:
1. Select employees for 360 review
2. System identifies peers, reports, managers
3. Send feedback requests
4. Collect anonymous feedback
5. Generate feedback report

---

## Asset Management

### Adding Assets

Go to **Assets** to:
1. Click **Add Asset**
2. Enter:
   - Asset name
   - Asset tag/ID
   - Category (Laptop, Phone, etc.)
   - Purchase date
   - Warranty info

### Assigning Assets

1. Select asset
2. Click **Assign to Employee**
3. Select employee
4. Set expected return date (optional)

### Asset Reports

- Asset inventory
- Assigned vs available
- Warranty expiring
- Depreciation report

---

## Helpdesk Management

### Managing Tickets

1. Go to **Helpdesk**
2. View all tickets
3. Filter by:
   - Status
   - Category
   - Priority
   - Assigned to

### Assigning Tickets

1. Open ticket
2. Click **Assign**
3. Select team member
4. Set priority
5. Add internal notes

### Ticket Resolution

1. Work on the issue
2. Update status:
   - In Progress
   - Waiting on User
   - Resolved
3. Add resolution notes
4. Close ticket

---

## Travel Management

### Approving Travel Requests

1. Go to **Travel**
2. View pending requests
3. Check:
   - Business justification
   - Budget available
   - Policy compliance
4. Approve or reject

### Travel Policies

Configure:
- Advance booking requirements
- Hotel star limits
- Daily allowance rates
- Expense limits by destination

---

## Documents Management

### Company Documents

Go to **Documents** > **Company Documents** to:
- Upload policy documents
- Manage employee handbook
- Share HR forms
- Set document visibility

### Document Categories

- HR Policies
- Benefits Information
- Training Materials
- Legal Documents
- Forms & Templates

### Document Expiry Alerts

Set expiry dates for:
- Contracts
- Certifications
- Visas/Work permits

System sends alerts before expiry.

---

## Reports & Analytics

### Available Reports

Go to **Reports** to generate:

**Attendance Reports**
- Daily/Monthly attendance
- Absenteeism trends
- Late arrival analysis
- Overtime summary

**Leave Reports**
- Leave balance summary
- Leave trends by type
- Upcoming leaves
- Leave utilization

**Payroll Reports**
- Monthly payroll summary
- Salary register
- Tax reports
- Bank transfer file

**Headcount Reports**
- Current headcount
- Department distribution
- Tenure analysis
- Attrition report

### Exporting Reports

All reports can be exported as:
- PDF
- Excel (XLSX)
- CSV

---

## Settings

### Company Settings

- Company name and logo
- Address and contact
- Fiscal year
- Working days

### Email Notifications

Configure notifications for:
- Leave requests
- Expense claims
- New employees
- Document expiry

### User Management

- Create user accounts
- Assign roles
- Reset passwords
- Deactivate users

### Feature Configuration

Enable/disable modules based on your needs. See [Customization Guide](./CUSTOMIZATION.md).

---

## Best Practices for HR Admins

1. **Process approvals promptly** - Don't keep employees waiting
2. **Maintain accurate data** - Keep employee records updated
3. **Run payroll on time** - Employees depend on timely salaries
4. **Regular audits** - Review access and data periodically
5. **Document policies** - Keep HR policies accessible
6. **Monitor compliance** - Track document expiries and renewals

---

## Manager-Specific Tips

As a manager, you can:
- Approve leaves/expenses for your team only
- View attendance for direct reports
- Set goals for team members
- Conduct performance reviews
- View team timesheets

You cannot:
- Modify salary information
- Access other teams' data
- Change system settings

---

*For employee self-service features, see [Employee Guide](./USER_GUIDE_EMPLOYEE.md)*
*For customization options, see [Customization Guide](./CUSTOMIZATION.md)*
