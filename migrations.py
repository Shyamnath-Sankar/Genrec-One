#!/usr/bin/env python3
"""
HRMS - Database Migration Script
==================================

This script manages database migrations for the HRMS application.
It provides commands to upgrade, downgrade, stamp, and manage database schema.

Usage:
------
    python migrations.py upgrade         # Apply all pending migrations
    python migrations.py upgrade --step  # Apply one migration at a time
    python migrations.py downgrade -1    # Rollback one migration
    python migrations.py downgrade 001    # Rollback to specific revision
    python migrations.py stamp head      # Stamp database to current revision
    python migrations.py --help           # Show this help message

Requirements:
-------------
    - Python 3.8+
    - Alembic installed
    - Database connection configured
    - Backend virtual environment activated

Author: HRMS Team
Version: 1.0.0
"""

import os
import sys
import subprocess
import argparse
from pathlib import Path
from datetime import datetime

# ============================================================================
# CONFIGURATION
# ============================================================================

# Project root directory
PROJECT_ROOT = Path(__file__).parent.absolute()

# Backend directory
BACKEND_DIR = PROJECT_ROOT / "backend"

# Alembic configuration
ALEMBIC_INI = BACKEND_DIR / "alembic.ini"
ALEMBIC_DIR = BACKEND_DIR / "alembic"

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================


def print_header(title: str) -> None:
    """Print a formatted header."""
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)


def print_step(step: str) -> None:
    """Print a step indicator."""
    print(f"\n[STEP] {step}")


def print_success(message: str) -> None:
    """Print a success message."""
    print(f"  ✓ {message}")


def print_error(message: str) -> None:
    """Print an error message."""
    print(f"  ✗ {message}")


def print_info(message: str) -> None:
    """Print an info message."""
    print(f"  → {message}")


def print_warning(message: str) -> None:
    """Print a warning message."""
    print(f"  ⚠ {message}")


def get_virtual_env_python() -> Path:
    """
    Get the Python executable path from the virtual environment.
    
    Returns:
        Path: Path to Python executable in venv
    """
    # Check common virtual environment locations
    venv_paths = [
        BACKEND_DIR / ".venv" / "Scripts" / "python.exe",
        BACKEND_DIR / ".venv" / "bin" / "python",
        BACKEND_DIR / "venv" / "Scripts" / "python.exe",
        BACKEND_DIR / "venv" / "bin" / "python",
        BACKEND_DIR / "env" / "Scripts" / "python.exe",
        BACKEND_DIR / "env" / "bin" / "python",
    ]
    
    for venv_path in venv_paths:
        if venv_path.exists():
            return venv_path
    
    # Fall back to system Python
    return sys.executable


def check_alembic_setup() -> bool:
    """
    Check if Alembic is properly configured.
    
    Returns:
        bool: True if Alembic is set up correctly
    """
    if not ALEMBIC_INI.exists():
        print_error(f"Alembic configuration file not found: {ALEMBIC_INI}")
        return False
    
    if not ALEMBIC_DIR.exists():
        print_error(f"Alembic directory not found: {ALEMBIC_DIR}")
        return False
    
    return True


def run_alembic_command(args: list, python_path: Path, capture: bool = True) -> tuple:
    """
    Run an Alembic command.
    
    Args:
        args: List of command arguments
        python_path: Path to Python executable
        capture: Whether to capture output
        
    Returns:
        tuple: (success: bool, stdout: str, stderr: str)
    """
    # Build the command
    cmd = [str(python_path), "-m", "alembic"] + args
    
    print_info(f"Running command: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(
            cmd,
            cwd=str(BACKEND_DIR),
            capture_output=capture,
            text=True,
            check=True
        )
        return True, result.stdout or "", result.stderr or ""
    except subprocess.CalledProcessError as e:
        return False, e.stdout or "", e.stderr or ""


def confirm_action(message: str) -> bool:
    """
    Confirm an action with the user.
    
    Args:
        message: Confirmation message
        
    Returns:
        bool: True if user confirmed
    """
    print_warning(message)
    response = input("\nDo you want to continue? (yes/no): ").strip().lower()
    return response in ["yes", "y"]


# ============================================================================
# MAIN FUNCTIONS
# ============================================================================


def upgrade_database(revision: str = "head", sql: bool = False, step: bool = False) -> bool:
    """
    Upgrade database to a newer revision.
    
    Args:
        revision: Target revision (default: head)
        sql: Generate SQL without executing
        step: Apply one migration at a time
        
    Returns:
        bool: True if upgrade succeeded
    """
    print_header("HRMS - Database Upgrade")
    
    # Check Alembic setup
    print_step("Checking Alembic configuration")
    if not check_alembic_setup():
        return False
    print_success("Alembic configuration verified")
    
    # Get Python executable
    python_path = get_virtual_env_python()
    print_step("Detecting Python executable")
    print_info(f"Using Python: {python_path}")
    
    # Build command
    cmd = ["upgrade", revision]
    if sql:
        cmd.insert(1, "--sql")
    if step:
        cmd.insert(1, "--step")
    
    # Confirm action
    if not sql:
        print_step("Applying migrations")
        if not confirm_action("This will apply pending migrations to your database."):
            print_info("Upgrade cancelled by user")
            return True
    
    # Run Alembic
    success, stdout, stderr = run_alembic_command(cmd, python_path)
    
    if success:
        print_success("Database upgrade completed successfully")
        if stdout:
            print(stdout)
        return True
    else:
        print_error("Database upgrade failed")
        print(f"STDERR: {stderr}")
        return False


def downgrade_database(revision: str = "-1", sql: bool = False) -> bool:
    """
    Downgrade database to a previous revision.
    
    Args:
        revision: Target revision (default: -1, i.e., one step back)
        sql: Generate SQL without executing
        
    Returns:
        bool: True if downgrade succeeded
    """
    print_header("HRMS - Database Downgrade")
    
    # Check Alembic setup
    print_step("Checking Alembic configuration")
    if not check_alembic_setup():
        return False
    print_success("Alembic configuration verified")
    
    # Get Python executable
    python_path = get_virtual_env_python()
    print_step("Detecting Python executable")
    print_info(f"Using Python: {python_path}")
    
    # Build command
    cmd = ["downgrade", revision]
    if sql:
        cmd.insert(1, "--sql")
    
    # Confirm action
    if not sql:
        print_step("Rolling back migrations")
        if not confirm_action(f"WARNING: This will downgrade your database to revision '{revision}'."):
            print_info("Downgrade cancelled by user")
            return True
    
    # Run Alembic
    success, stdout, stderr = run_alembic_command(cmd, python_path)
    
    if success:
        print_success("Database downgrade completed successfully")
        if stdout:
            print(stdout)
        return True
    else:
        print_error("Database downgrade failed")
        print(f"STDERR: {stderr}")
        return False


def stamp_database(revision: str = "head", sql: bool = False) -> bool:
    """
    Stamp the database with a revision without running migrations.
    
    Args:
        revision: Revision to stamp (default: head)
        sql: Generate SQL without executing
        
    Returns:
        bool: True if stamp succeeded
    """
    print_header("HRMS - Database Stamp")
    
    # Check Alembic setup
    print_step("Checking Alembic configuration")
    if not check_alembic_setup():
        return False
    print_success("Alembic configuration verified")
    
    # Get Python executable
    python_path = get_virtual_env_python()
    print_step("Detecting Python executable")
    print_info(f"Using Python: {python_path}")
    
    # Build command
    cmd = ["stamp", "--revision", revision]
    if sql:
        cmd.insert(1, "--sql")
    
    # Confirm action
    if not sql:
        print_step("Stamping database")
        if not confirm_action(f"This will stamp the database at revision '{revision}' without running migrations."):
            print_info("Stamp cancelled by user")
            return True
    
    # Run Alembic
    success, stdout, stderr = run_alembic_command(cmd, python_path)
    
    if success:
        print_success("Database stamp completed successfully")
        if stdout:
            print(stdout)
        return True
    else:
        print_error("Database stamp failed")
        print(f"STDERR: {stderr}")
        return False


def show_current_revision() -> bool:
    """
    Show the current database revision.
    
    Returns:
        bool: True if command succeeded
    """
    print_header("Current Database Revision")
    
    if not check_alembic_setup():
        return False
    
    python_path = get_virtual_env_python()
    
    print_step("Getting current revision")
    success, stdout, stderr = run_alembic_command(["current"], python_path)
    
    if success:
        print_success("Current revision retrieved")
        if stdout:
            print(stdout)
        return True
    else:
        print_error("Failed to get current revision")
        print(f"STDERR: {stderr}")
        return False


def show_pending_migrations() -> bool:
    """
    Show pending migrations.
    
    Returns:
        bool: True if command succeeded
    """
    print_header("Pending Migrations")
    
    if not check_alembic_setup():
        return False
    
    python_path = get_virtual_env_python()
    
    print_step("Checking pending migrations")
    success, stdout, stderr = run_alembic_command(["heads", "--pending"], python_path)
    
    if success:
        print_success("Pending migrations retrieved")
        if stdout:
            print(stdout)
        return True
    else:
        print_error("Failed to check pending migrations")
        print(f"STDERR: {stderr}")
        return False


def show_history() -> bool:
    """
    Show migration history.
    
    Returns:
        bool: True if command succeeded
    """
    print_header("Migration History")
    
    if not check_alembic_setup():
        return False
    
    python_path = get_virtual_env_python()
    
    print_step("Showing migration history")
    success, stdout, stderr = run_alembic_command(["history"], python_path)
    
    if success:
        print_success("Migration history retrieved")
        if stdout:
            print(stdout)
        return True
    else:
        print_error("Failed to show migration history")
        print(f"STDERR: {stderr}")
        return False


def show_branches() -> bool:
    """
    Show migration branches.
    
    Returns:
        bool: True if command succeeded
    """
    print_header("Migration Branches")
    
    if not check_alembic_setup():
        return False
    
    python_path = get_virtual_env_python()
    
    print_step("Showing branches")
    success, stdout, stderr = run_alembic_command(["branches"], python_path)
    
    if success:
        print_success("Branches retrieved")
        if stdout:
            print(stdout)
        return True
    else:
        print_error("Failed to show branches")
        print(f"STDERR: {stderr}")
        return False


def show_database_info() -> bool:
    """
    Show comprehensive database information.
    
    Returns:
        bool: True if command succeeded
    """
    print_header("Database Information")
    
    if not check_alembic_setup():
        return False
    
    python_path = get_virtual_env_python()
    
    print_step("Current Revision")
    success, _, _ = run_alembic_command(["current"], python_path)
    
    print_step("\nPending Migrations")
    success, _, _ = run_alembic_command(["heads", "--pending"], python_path)
    
    print_step("\nMigration History")
    success, _, _ = run_alembic_command(["history", "-r", ":5"], python_path)
    
    return True


# ============================================================================
# COMMAND LINE INTERFACE
# ============================================================================


def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(
        description="HRMS Database Migration Manager",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Commands:
  upgrade [revision]     Apply migrations (default: head)
  downgrade [revision]  Rollback migrations (default: -1)
  stamp [revision]       Stamp database without running migrations
  current                Show current revision
  pending                Show pending migrations
  history                Show complete migration history
  branches               Show migration branches
  info                   Show comprehensive database info

Examples:
  # Apply all pending migrations
  python migrations.py upgrade
  
  # Apply one migration at a time
  python migrations.py upgrade --step
  
  # Upgrade to specific revision
  python migrations.py upgrade 001
  
  # Generate SQL without executing
  python migrations.py upgrade --sql
  
  # Rollback one migration
  python migrations.py downgrade
  
  # Rollback to specific revision
  python migrations.py downgrade 001
  
  # Generate downgrade SQL
  python migrations.py downgrade --sql
  
  # Stamp database at head
  python migrations.py stamp head
  
  # Show current status
  python migrations.py current
  
  # Show all information
  python migrations.py info
        """
    )
    
    parser.add_argument(
        "command",
        choices=[
            "upgrade",
            "downgrade",
            "stamp",
            "current",
            "pending",
            "history",
            "branches",
            "info"
        ],
        help="Migration command to execute"
    )
    
    parser.add_argument(
        "revision",
        nargs="?",
        default=None,
        help="Target revision (context-dependent)"
    )
    
    parser.add_argument(
        "-s", "--sql",
        action="store_true",
        help="Generate SQL without executing"
    )
    
    parser.add_argument(
        "--step",
        action="store_true",
        help="Apply one migration at a time (upgrade only)"
    )
    
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Enable verbose output"
    )
    
    args = parser.parse_args()
    
    # Execute the requested command
    success = False
    
    if args.command == "upgrade":
        revision = args.revision if args.revision else "head"
        success = upgrade_database(revision, args.sql, args.step)
    elif args.command == "downgrade":
        revision = args.revision if args.revision else "-1"
        success = downgrade_database(revision, args.sql)
    elif args.command == "stamp":
        revision = args.revision if args.revision else "head"
        success = stamp_database(revision, args.sql)
    elif args.command == "current":
        success = show_current_revision()
    elif args.command == "pending":
        success = show_pending_migrations()
    elif args.command == "history":
        success = show_history()
    elif args.command == "branches":
        success = show_branches()
    elif args.command == "info":
        success = show_database_info()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
