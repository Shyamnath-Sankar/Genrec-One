# HRMS Backend

Complete Human Resource Management System backend built with FastAPI.

## Features

- **Authentication & Authorization**: JWT-based auth with role-based access control
- **Employee Management**: CRUD operations, departments, designations
- **Attendance**: Check-in/out, regularization, reports
- **Leave Management**: Leave types, applications, balances, approvals
- **Payroll**: Salary components, payroll processing, payslips
- **Timesheets**: Project-based time tracking
- **Recruitment (ATS)**: Jobs, candidates, interviews, offers
- **Performance**: Goals, appraisals, 360 feedback
- **Expenses**: Claims, approvals, reimbursement
- **Assets**: Asset tracking and assignment
- **Helpdesk**: Ticketing system with SLA
- **Travel**: Request and approval workflow
- **Documents**: Upload, versioning, acknowledgment
- **Reports**: Attendance, leave, payroll, headcount

## Tech Stack

- **FastAPI** - Modern async Python web framework
- **SQLAlchemy** - ORM with async support
- **PostgreSQL** - Database
- **Alembic** - Database migrations
- **Pydantic** - Data validation
- **JWT** - Authentication

## Setup

1. **Create virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install dependencies**
```bash
pip install -r requirements.txt
```

3. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. **Create database**
```bash
createdb hrms  # PostgreSQL
```

5. **Run migrations**
```bash
alembic upgrade head
```

6. **Seed database**
```bash
python -m app.seed
```

7. **Start server**
```bash
uvicorn app.main:app --reload
```

## API Documentation

Once running, access:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Default Credentials

After seeding:
- Email: admin@hrms.com
- Password: Admin@123

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   └── routes/          # API route handlers
│   ├── core/
│   │   ├── config.py        # Configuration
│   │   ├── database.py      # Database connection
│   │   └── security.py      # Auth utilities
│   ├── models/              # SQLAlchemy models
│   ├── schemas/             # Pydantic schemas
│   ├── services/            # Business logic
│   ├── utils/               # Utilities
│   ├── main.py              # FastAPI app
│   └── seed.py              # Database seeder
├── alembic/                 # Migrations
├── requirements.txt
└── .env
```
