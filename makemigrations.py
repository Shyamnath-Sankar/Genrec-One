#!/usr/bin/env python3
"""
HRMS - Make Migrations Script
=============================

This script generates new Alembic migration files based on the current state
of your SQLAlchemy models compared to the database schema.

Usage:
------
    python makemigrations.py [message]
    python makemigrations.py --help

Arguments:
----------
    message : str (optional)
        A descriptive message for the migration. If not provided,
        a timestamp-based message will be generated.

Examples:
---------
    python makemigrations.py "Added new employee field"
    python makemigrations.py  # Auto-generates message

Requirements:
-------------
    - Python 3.8+
    - Alembic installed
    - SQLAlchemy models properly configured
    - Backend virtual environment activated

Author: HRMS Team
Version: 1.0.0
"""

import os
import sys
import subprocess
import argparse
from datetime import datetime
from pathlib import Path

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


def generate_migration_message(auto_message: bool, custom_message: str) -> str:
    """
    Generate a migration message.
    
    Args:
        auto_message: Whether to auto-generate the message
        custom_message: Custom message provided by user
        
    Returns:
        str: The migration message to use
    """
    if custom_message:
        return custom_message
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"Auto-generated migration at {timestamp}"


def run_alembic_command(args: list, python_path: Path) -> bool:
    """
    Run an Alembic command.
    
    Args:
        args: List of command arguments
        python_path: Path to Python executable
        
    Returns:
        bool: True if command succeeded
    """
    # Build the command
    cmd = [str(python_path), "-m", "alembic"] + args
    
    print_info(f"Running command: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(
            cmd,
            cwd=str(BACKEND_DIR),
            capture_output=True,
            text=True,
            check=True
        )
        print_success("Alembic command completed successfully")
        if result.stdout:
            print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print_error(f"Alembic command failed with exit code {e.returncode}")
        if e.stdout:
            print(f"STDOUT: {e.stdout}")
        if e.stderr:
            print(f"STDERR: {e.stderr}")
        return False


# ============================================================================
# MAIN FUNCTIONS
# ============================================================================


def make_migrations(message: str, autogenerate: bool = True) -> bool:
    """
    Generate a new migration file.
    
    Args:
        message: Description of the migration
        autogenerate: Whether to auto-detect schema changes
        
    Returns:
        bool: True if migration was created successfully
    """
    print_header("HRMS - Make Migrations")
    
    # Check Alembic setup
    print_step("Checking Alembic configuration")
    if not check_alembic_setup():
        return False
    print_success("Alembic configuration verified")
    
    # Get Python executable
    python_path = get_virtual_env_python()
    print_step("Detecting Python executable")
    print_info(f"Using Python: {python_path}")
    
    # Generate message
    migration_message = generate_migration_message(not message, message)
    print_step("Migration message")
    print_info(f"Message: {migration_message}")
    
    # Build Alembic command
    cmd = ["revision", "--autogenerate", "-m", migration_message]
    
    # Run Alembic
    print_step("Generating migration")
    if run_alembic_command(cmd, python_path):
        print_success(f"Migration '{migration_message}' created successfully")
        return True
    else:
        print_error("Failed to create migration")
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
    return run_alembic_command(["current"], python_path)


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
    return run_alembic_command(["heads", "--pending"], python_path)


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
    return run_alembic_command(["history"], python_path)


# ============================================================================
# COMMAND LINE INTERFACE
# ============================================================================


def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(
        description="HRMS Database Migration Manager",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python makemigrations.py                  # Auto-generate migration with timestamp
  python makemigrations.py "Added new field" # Migration with custom message
  python makemigrations.py --current         # Show current revision
  python makemigrations.py --pending        # Show pending migrations
  python makemigrations.py --history        # Show migration history
  python makemigrations.py --help           # Show this help message
        """
    )
    
    parser.add_argument(
        "message",
        nargs="?",
        default=None,
        help="Message describing the migration"
    )
    
    parser.add_argument(
        "-a", "--autogenerate",
        action="store_true",
        default=True,
        help="Auto-detect schema changes (default: True)"
    )
    
    parser.add_argument(
        "-c", "--current",
        action="store_true",
        help="Show current database revision"
    )
    
    parser.add_argument(
        "-p", "--pending",
        action="store_true",
        help="Show pending migrations"
    )
    
    parser.add_argument(
        "-H", "--history",
        action="store_true",
        help="Show complete migration history"
    )
    
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Enable verbose output"
    )
    
    args = parser.parse_args()
    
    # Handle different commands
    if args.current:
        success = show_current_revision()
    elif args.pending:
        success = show_pending_migrations()
    elif args.history:
        success = show_history()
    else:
        success = make_migrations(args.message, args.autogenerate)
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
