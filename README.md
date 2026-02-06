# HRMS - Human Resource Management System

A comprehensive Human Resource Management System built with modern technologies including Next.js (Frontend) and FastAPI (Backend).

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Node.js 18+
- PostgreSQL or SQLite (for development)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hrms
   ```

2. **Setup Backend**
   ```bash
   cd backend
   python -m venv .venv
   .venv\Scripts\activate  # Windows
   # source .venv/bin/activate  # Linux/macOS
   pip install -r requirements.txt
   ```

3. **Setup Frontend**
   ```bash
   cd frontend
   npm install
   ```

4. **Configure Environment**
   ```bash
   # Edit backend/.env with your database settings
   ```

5. **Initialize Database**
   ```bash
   # Generate initial migrations
   python ../makemigrations.py "Initial schema"

   # Apply migrations
   python ../migrations.py upgrade

   # Seed sample data (optional)
   python seed.py
   ```

6. **Start Development Servers**

   Terminal 1 (Backend):
   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```

   Terminal 2 (Frontend):
   ```bash
   cd frontend
   npm run dev
   ```

7. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

---

## 📁 Project Structure

```
hrms/
├── frontend/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/            # App router pages
│   │   ├── components/     # React components
│   │   └── lib/           # Utilities
│   └── public/            # Static assets
│
├── backend/                 # FastAPI backend application
│   ├── alembic/            # Database migrations
│   ├── app/
│   │   ├── api/           # API routes
│   │   ├── core/          # Core configuration
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── services/      # Business logic
│   │   └── utils/         # Utilities
│   └── logs/              # Application logs
│
├── makemigrations.py       # Generate migrations
├── migrations.py           # Apply migrations
├── MIGRATION_README.md     # Migration guide
├── .gitignore             # Git ignore rules
└── README.md              # This file
```

---

## 🗃️ Database Migrations

This project uses **Alembic** for database migration management.

### Quick Migration Commands

```bash
# Generate a new migration (after model changes)
python makemigrations.py "Description of changes"

# Apply all pending migrations
python migrations.py upgrade

# Rollback one migration
python migrations.py downgrade

# Show current status
python migrations.py current

# Show pending migrations
python migrations.py pending

# Show migration history
python migrations.py history
```

### Detailed Migration Guide

See [MIGRATION_README.md](MIGRATION_README.md) for comprehensive migration documentation including:

- Migration workflow
- Troubleshooting common issues
- Best practices
- Production deployment guidelines

---

## 📚 Documentation

- [Setup Guide](docs/SETUP.md) - Complete setup instructions
- [User Guide - HR](docs/USER_GUIDE_HR.md) - HR functionality
- [User Guide - Employee](docs/USER_GUIDE_EMPLOYEE.md) - Employee portal
- [Customization Guide](docs/CUSTOMIZATION.md) - Customizing HRMS
- [Migration Guide](MIGRATION_README.md) - Database migrations

---

## 🛠️ Development

### Available Scripts

#### Backend

```bash
cd backend

# Run development server
uvicorn app.main:app --reload

# Run with custom host/port
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Generate migrations
python ../makemigrations.py "Your message"

# Apply migrations
python ../migrations.py upgrade

# Create seed data
python seed.py

# Run tests
pytest
```

#### Frontend

```bash
cd frontend

# Run development server
npm run dev

# Build for production
npm run build

# Start production build
npm start

# Run linting
npm run lint
```

---

## 🔧 Configuration

### Backend Environment (.env)

```env
# Database
DATABASE_URL=sqlite:///./hrms.db
# Or for PostgreSQL:
# DATABASE_URL=postgresql://user:password@localhost/hrms

# Application
APP_NAME=HRMS
DEBUG=True
SECRET_KEY=your-secret-key-here

# JWT
JWT_SECRET_KEY=your-jwt-secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
CORS_ORIGINS=http://localhost:3000
```

---

## 🚢 Deployment

### Docker Deployment

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f
```

### Manual Deployment

1. **Backend**
   ```bash
   cd backend
   pip install -r requirements.txt
   gunicorn -k uvicorn.workers.UvicornWorker app.main:app
   ```

2. **Frontend**
   ```bash
   cd frontend
   npm run build
   npm run start
   ```

---

## 📦 Features

### Core Modules

- 👥 **Employee Management** - Manage employee records and information
- 🏢 **Organization** - Departments, designations, and org structure
- 📅 **Attendance** - Track daily attendance and work hours
- 🌴 **Leave Management** - Leave requests and approval workflows
- 💰 **Payroll** - Salary processing and payslip generation
- 📊 **Performance** - Employee reviews and performance metrics
- 📈 **Analytics** - HR dashboards and reports
- 📄 **Documents** - Document management system
- 💼 **Expenses** - Expense claims and approvals
- 🎫 **Tickets** - Support ticket system
- 🚀 **Recruitment** - Job postings and candidate tracking

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 🆘 Support

For support, please open an issue in the repository or contact the development team.

---

**Built with ❤️ using Next.js, FastAPI, and SQLAlchemy**
