# HRMS Database Migration Guide

This document provides comprehensive instructions for managing database migrations in the HRMS project using Alembic.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Migration Scripts](#migration-scripts)
5. [Usage Examples](#usage-examples)
6. [Migration Workflow](#migration-workflow)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

---

## Overview

The HRMS project uses **Alembic** for database migration management. Alembic is a lightweight database migration tool for usage with the **SQLAlchemy** Database Toolkit for Python.

### Key Components

- **SQLAlchemy Models**: Define your database schema in Python classes
- **Alembic Migrations**: Track and apply schema changes over time
- **Migration Scripts**: Custom scripts for easy migration management

### Directory Structure

```
hrms/
├── makemigrations.py      # Script to generate new migrations
├── migrations.py          # Script to apply/manage migrations
├── backend/
│   ├── alembic/
│   │   ├── env.py         # Alembic environment configuration
│   │   ├──.ini            # Alembic configuration
│   │   └── versions/      # Migration files
│   ├── app/
│   │   └── models/        # SQLAlchemy models
│   └── .env               # Database configuration
└── ...
```

---

## Prerequisites

Before working with migrations, ensure you have:

1. **Python 3.8+** installed
2. **Backend virtual environment** activated
3. **Required packages** installed:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
4. **Database connection** configured in `backend/.env`

### Environment Setup

```bash
# Navigate to backend directory
cd backend

# Activate virtual environment
# On Windows:
.venv\Scripts\activate

# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Verify Alembic is installed
alembic --version
```

---

## Quick Start

### 1. Create a New Migration

When you've made changes to your SQLAlchemy models:

```bash
# Navigate to project root
cd /path/to/hrms

# Generate migration with auto-detection
python makemigrations.py

# Or with a custom message
python makemigrations.py "Added email field to Employee model"
```

### 2. Apply Migrations

```bash
# Apply all pending migrations
python migrations.py upgrade

# Apply one migration at a time
python migrations.py upgrade --step

# Generate SQL without executing (for review)
python migrations.py upgrade --sql
```

### 3. Check Migration Status

```bash
# Show current revision
python migrations.py current

# Show pending migrations
python migrations.py pending

# Show complete history
python migrations.py history
```

---

## Migration Scripts

### makemigrations.py

Generates new migration files based on model changes.

#### Usage

```bash
python makemigrations.py [OPTIONS]
```

#### Options

| Option | Description |
|--------|-------------|
| `message` | Descriptive message for the migration (optional) |
| `-a, --autogenerate` | Auto-detect schema changes (default: True) |
| `-c, --current` | Show current database revision |
| `-p, --pending` | Show pending migrations |
| `-H, --history` | Show migration history |
| `-v, --verbose` | Enable verbose output |

#### Examples

```bash
# Auto-generate migration with timestamp
python makemigrations.py

# Migration with custom message
python makemigrations.py "Added department relationship to Employee"

# Show current revision
python makemigrations.py --current

# Show pending migrations
python makemigrations.py --pending

# Show migration history
python makemigrations.py --history
```

---

### migrations.py

Manages database migrations - upgrade, downgrade, stamp, etc.

#### Usage

```bash
python migrations.py <COMMAND> [OPTIONS]
```

#### Commands

| Command | Description |
|---------|-------------|
| `upgrade [revision]` | Apply migrations to specified revision |
| `downgrade [revision]` | Rollback migrations from specified revision |
| `stamp [revision]` | Stamp database without running migrations |
| `current` | Show current revision |
| `pending` | Show pending migrations |
| `history` | Show complete migration history |
| `branches` | Show migration branches |
| `info` | Show comprehensive database information |

#### Options

| Option | Description |
|--------|-------------|
| `revision` | Target revision (default: head for upgrade, -1 for downgrade) |
| `-s, --sql` | Generate SQL without executing |
| `--step` | Apply one migration at a time |

#### Examples

```bash
# Apply all pending migrations
python migrations.py upgrade

# Upgrade to specific revision
python migrations.py upgrade 001

# Apply one migration at a time
python migrations.py upgrade --step

# Generate SQL for review
python migrations.py upgrade --sql

# Rollback one migration
python migrations.py downgrade

# Rollback to specific revision
python migrations.py downgrade 001

# Generate downgrade SQL
python migrations.py downgrade --sql

# Stamp database at head
python migrations.py stamp head

# Show current revision
python migrations.py current

# Show all information
python migrations.py info
```

---

## Usage Examples

### Scenario 1: Adding a New Model

1. **Create the model** in `backend/app/models/your_model.py`
2. **Import the model** in `backend/app/models/__init__.py`
3. **Generate migration**:
   ```bash
   python makemigrations.py "Added new YourModel"
   ```
4. **Review the migration** in `backend/alembic/versions/`
5. **Apply migration**:
   ```bash
   python migrations.py upgrade
   ```

### Scenario 2: Modifying an Existing Model

1. **Edit the model** in `backend/app/models/your_model.py`
2. **Generate migration**:
   ```bash
   python makemigrations.py "Added status field to YourModel"
   ```
3. **Review the migration** in `backend/alembic/versions/`
4. **Apply migration**:
   ```bash
   python migrations.py upgrade
   ```

### Scenario 3: Rolling Back a Migration

1. **Check current state**:
   ```bash
   python migrations.py current
   ```
2. **Rollback one migration**:
   ```bash
   python migrations.py downgrade
   ```
3. **Rollback to specific revision**:
   ```bash
   python migrations.py downgrade 001
   ```
4. **Verify**:
   ```bash
   python migrations.py current
   ```

### Scenario 4: Fresh Database Setup

```bash
# Remove existing database (if needed)
rm backend/hrms.db

# Create initial migration (if no migrations exist)
python makemigrations.py "Initial schema"

# Apply all migrations
python migrations.py upgrade

# Verify
python migrations.py history
```

### Scenario 5: Database Migration for Deployment

```bash
# Generate SQL script for review
python migrations.py upgrade --sql > migration_script.sql

# Review the SQL
cat migration_script.sql

# If satisfied, apply migrations
python migrations.py upgrade
```

---

## Migration Workflow

### Development Workflow

```
1. Make changes to models
        ↓
2. Generate migration: python makemigrations.py "description"
        ↓
3. Review migration file in backend/alembic/versions/
        ↓
4. Test migration: python migrations.py upgrade
        ↓
5. Verify application works
        ↓
6. Commit: git add backend/alembic/versions/ && git commit
```

### Production Deployment Workflow

```
1. Generate migration in development
        ↓
2. Review and test thoroughly
        ↓
3. Generate SQL script: python migrations.py upgrade --sql
        ↓
4. Have DBA review SQL (if required)
        ↓
5. Apply to staging: python migrations.py upgrade
        ↓
6. Verify staging works
        ↓
7. Apply to production: python migrations.py upgrade
        ↓
8. Verify production works
```

---

## Troubleshooting

### Common Issues

#### Issue: "Target database is not up to date"

**Cause**: The alembic_version table doesn't match current migrations.

**Solution**:
```bash
# Check current state
python migrations.py current

# Stamp to current revision
python migrations.py stamp head
```

#### Issue: "Can't locate revision ID 'xxx'"

**Cause**: The specified revision doesn't exist.

**Solution**:
```bash
# Check available revisions
python migrations.py history
```

#### Issue: "Migration can't be applied"

**Cause**: Database constraint violations or dependency issues.

**Solution**:
1. Check the generated SQL: `python migrations.py upgrade --sql`
2. Manually fix database issues
3. Try applying with `--step` to identify problematic migration

#### Issue: "No changes detected"

**Cause**: Alembic can't detect model changes.

**Solutions**:
1. Ensure models are imported in `backend/app/models/__init__.py`
2. Check `backend/alembic/env.py` for proper model discovery
3. Try manual migration: `python makemigrations.py --no-autogenerate`

### Checking Logs

```bash
# View application logs
tail -f backend/logs/hrms.log

# View error logs
tail -f backend/logs/hrms-errors.log
```

---

## Best Practices

### 1. Migration Naming

Use descriptive, consistent messages:

```bash
# Good
python makemigrations.py "Added email field to Employee model"
python makemigrations.py "Created Department model"
python makemigrations.py "Added foreign key relationship Employee->Department"

# Bad
python makemigrations.py "fix"
python makemigrations.py "update"
python makemigrations.py "changes"
```

### 2. Review Before Applying

Always review generated migrations:

```bash
# Generate migration
python makemigrations.py "Your description"

# Check the generated file
cat backend/alembic/versions/*.py

# Test in development first
python migrations.py upgrade
```

### 3. Version Control

Commit migrations separately:

```bash
# Add migration files
git add backend/alembic/versions/

# Commit with descriptive message
git commit -m "Add migration for new Employee email field"
```

### 4. Back Up Before Production

Always backup before applying migrations in production:

```bash
# Backup database
cp backend/hrms.db backend/hrms.db.backup

# Apply migrations
python migrations.py upgrade

# If issues occur, restore
cp backend/hrms.db.backup backend/hrms.db
```

### 5. Use --sql for Review

Review SQL before applying:

```bash
# Generate SQL
python migrations.py upgrade --sql > upgrade.sql

# Review
less upgrade.sql

# Apply if satisfied
python migrations.py upgrade
```

### 6. Test Migrations

1. Test migrations on a copy of production data
2. Test rollback procedures
3. Verify application functionality after migration
4. Document any manual steps required

### 7. Migration Dependencies

Be aware of migration dependencies:

```bash
# Check for branches
python migrations.py branches

# Show dependency tree
python migrations.py history -v
```

---

## Alembic Configuration

### alembic.ini

Main configuration file located at `backend/alembic.ini`:

```ini
[alembic]
script = %(here)s/script.py.mako
target_metadata = None
output_encoding = utf-8

[post_write_actors]
...

[loggers]
...
```

### env.py

Environment configuration located at `backend/alembic/env.py`:

Key settings:
- `target_metadata`: Your model's Base.metadata
- `run_migrations_offline`: Offline migration support
- `run_migrations_online`: Online migration support

---

## Additional Resources

- [Alembic Documentation](https://alembic.sqlalchemy.org/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [HRMS Setup Guide](docs/SETUP.md)
- [HRMS User Guide](docs/USER_GUIDE_HR.md)

---

## Support

If you encounter issues not covered in this guide:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review application logs: `backend/logs/`
3. Check Alembic documentation
4. Contact the development team

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**Maintained by**: [GenrecAI Team](https://genrecai.com)
