from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from app.core.config import settings
from app.models.base import Base

# Check if using SQLite
is_sqlite = settings.DATABASE_URL.startswith("sqlite")

# Async engine for FastAPI
# Note: SQL echo is disabled - use logging configuration for query debugging
if is_sqlite:
    # SQLite doesn't support pool_size/max_overflow
    async_engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,  # Disabled - use logging config instead
        future=True,
        connect_args={"check_same_thread": False},
    )
else:
    # PostgreSQL with connection pooling
    async_engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,  # Disabled - use logging config instead
        future=True,
        pool_size=20,
        max_overflow=10,
    )

# Sync engine for Alembic migrations
if is_sqlite:
    sync_engine = create_engine(
        settings.DATABASE_SYNC_URL,
        echo=False,
        connect_args={"check_same_thread": False},
    )
else:
    sync_engine = create_engine(
        settings.DATABASE_SYNC_URL,
        echo=False,
    )


# Enable foreign key constraints for SQLite
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if is_sqlite:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


# Session factory
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


# Dependency to get database session
async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# Function to create all tables (useful for SQLite development)
async def create_tables():
    """Create all tables in the database."""
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def drop_tables():
    """Drop all tables in the database."""
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
