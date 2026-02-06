# HRMS Setup Guide

This guide walks you through setting up the HRMS application on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** v18+ (for frontend)
- **Python** 3.10+ (for backend)
- **PostgreSQL** 14+ (database)
- **Git** (for cloning the repository)

---

## 1. Database Setup (PostgreSQL)

### Windows

1. Open **pgAdmin** or **psql** command line

2. Create the HRMS database:
   ```sql
   CREATE DATABASE hrms;
   ```

3. (Optional) Create a dedicated user:
   ```sql
   CREATE USER hrms_user WITH PASSWORD 'your_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE hrms TO hrms_user;
   ```

### macOS / Linux

```bash
# Access PostgreSQL
sudo -u postgres psql

# Create database
CREATE DATABASE hrms;

# Exit
\q
```

---

## 2. Backend Setup (FastAPI)

### Navigate to Backend Directory

```bash
cd backend
```

### Create Virtual Environment

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Configure Environment Variables

Create a `.env` file in the `backend` directory:

```bash
# Copy the example file
cp .env.example .env
```

Edit `.env` with your settings:

```env
# Database
DATABASE_URL=postgresql+asyncpg://postgres:your_password@localhost:5432/hrms
DATABASE_SYNC_URL=postgresql://postgres:your_password@localhost:5432/hrms

# Security - CHANGE THIS IN PRODUCTION!
SECRET_KEY=your-super-secret-key-minimum-32-characters-long

# Server
HOST=0.0.0.0
PORT=8000
DEBUG=True

# CORS (frontend URL)
CORS_ORIGINS=["http://localhost:3000", "http://127.0.0.1:3000"]
```

### Initialize Database

Run Alembic migrations to create database tables:

```bash
# Generate migration (if needed)
alembic revision --autogenerate -m "Initial migration"

# Apply migrations
alembic upgrade head
```

### Seed Demo Data

Populate the database with demo users and sample data:

```bash
python -m app.seed
```

This creates the following demo users:

| Role | Email | Password | Access Level |
|------|-------|----------|--------------|
| Super Admin | admin@hrms.com | Admin@123 | Full system access |
| HR Admin | hr@hrms.com | Hr@12345 | HR management, recruitment, payroll config |
| Manager | manager@hrms.com | Manager@123 | Team management, approvals |
| Employee | employee@hrms.com | Employee@123 | Self-service only |

### Start Backend Server

```bash
# Development mode (with hot reload)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Or simply:
python -m app.main
```

The API will be available at: **http://localhost:8000**

API Documentation: **http://localhost:8000/docs**

---

## 3. Frontend Setup (Next.js)

### Navigate to Project Root

```bash
cd ..  # Back to project root
```

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

Create a `.env.local` file in the project root:

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# NextAuth Configuration (if using NextAuth)
NEXTAUTH_SECRET=your-nextauth-secret-key
NEXTAUTH_URL=http://localhost:3000
```

### Start Development Server

```bash
npm run dev
```

The application will be available at: **http://localhost:3000**

---

## 4. Verify Installation

1. **Backend Health Check**
   ```bash
   curl http://localhost:8000/health
   # Expected: {"status":"healthy"}
   ```

2. **Open Frontend**
   - Navigate to http://localhost:3000
   - You should see the login page

3. **Test Login**
   - Use demo credentials: `admin@hrms.com` / `Admin@123`
   - You should be redirected to the dashboard

---

## Project Structure

```
hrms/
├── backend/                 # FastAPI Backend
│   ├── app/
│   │   ├── api/routes/      # API endpoints
│   │   ├── core/            # Config, security, database
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── main.py          # Application entry
│   │   └── seed.py          # Database seeder
│   ├── alembic/             # Database migrations
│   ├── .env                 # Environment variables
│   └── requirements.txt     # Python dependencies
│
├── src/                     # Next.js Frontend
│   ├── app/                 # App router pages
│   ├── components/          # React components
│   └── lib/                 # Utilities, hooks, API client
│
├── docs/                    # Documentation
└── package.json             # Node dependencies
```

---

## Common Issues & Solutions

### Issue: Database Connection Error

```
Error: Connection refused to localhost:5432
```

**Solution:**
- Ensure PostgreSQL is running
- Check if the port 5432 is correct
- Verify credentials in `.env` file

### Issue: CORS Error

```
Access-Control-Allow-Origin error
```

**Solution:**
- Add your frontend URL to `CORS_ORIGINS` in backend `.env`
- Restart the backend server

### Issue: Module Not Found (Python)

```
ModuleNotFoundError: No module named 'app'
```

**Solution:**
- Ensure you're in the `backend` directory
- Activate the virtual environment
- Run `pip install -r requirements.txt`

### Issue: Port Already in Use

```
Error: Port 8000 is already in use
```

**Solution:**
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :8000
kill -9 <PID>
```

---

## Production Deployment

For production deployment, ensure you:

1. **Set `DEBUG=False`** in backend `.env`
2. **Use a strong `SECRET_KEY`** (minimum 32 characters)
3. **Configure HTTPS** for both frontend and backend
4. **Use environment variables** for all secrets
5. **Set up proper database backups**
6. **Configure a reverse proxy** (nginx recommended)

### Production Build (Frontend)

```bash
npm run build
npm start
```

### Production Run (Backend)

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## Next Steps

- [Employee User Guide](./USER_GUIDE_EMPLOYEE.md) - For employees using the system
- [HR Admin Guide](./USER_GUIDE_HR.md) - For HR managers
- [Customization Guide](./CUSTOMIZATION.md) - Enable/disable features
