"""
Database connection and session management.

Provides async SQLAlchemy engine and session factory for database operations.
Supports both SQLite (local dev) and PostgreSQL (Supabase production).
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.config import get_settings

settings = get_settings()

# Configure engine based on database type
engine_kwargs = {
    "echo": settings.debug,
    "future": True,
}

# PostgreSQL/Supabase specific settings
if settings.is_supabase:
    engine_kwargs.update({
        # Use NullPool for serverless environments (Supabase)
        "poolclass": NullPool,
        # SSL settings for Supabase
        "connect_args": {
            "ssl": "require",
        },
    })

# Create async engine
engine = create_async_engine(
    settings.database_url,
    **engine_kwargs,
)

# Session factory
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""

    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency that provides a database session.

    Yields:
        AsyncSession: Database session that auto-closes after use
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


@asynccontextmanager
async def get_db_context() -> AsyncGenerator[AsyncSession, None]:
    """
    Context manager for database sessions outside of FastAPI dependencies.

    Yields:
        AsyncSession: Database session that auto-closes after use
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """
    Initialize the database by creating all tables.

    Should be called once at application startup.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    """
    Close database connections.

    Should be called at application shutdown.
    """
    await engine.dispose()
