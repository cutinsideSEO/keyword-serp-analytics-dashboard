"""
Supabase database client for REST API access.

Provides database operations using the Supabase Python client,
bypassing the PostgreSQL wire protocol connection issues.
"""

import json
import logging
from contextlib import asynccontextmanager
from functools import lru_cache
from typing import Any, AsyncGenerator, Dict, List, Optional, Tuple

from supabase import create_client, Client

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


@lru_cache()
def get_supabase_client() -> Client:
    """Get a cached Supabase client instance."""
    url = settings.supabase_url
    # Use anon key for REST API access
    key = settings.supabase_anon_key or "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnbm9vaWt3dWhhZXdsdXdja3RlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5NzM3NTgsImV4cCI6MjA4NDU0OTc1OH0.vTVeEgkyra2K_J-P_ySmQyn1rGJ7_qKFx6IN3Auyhio"

    if not url:
        url = "https://sgnooikwuhaewluwckte.supabase.co"

    return create_client(url, key)


class SupabaseSession:
    """
    Supabase session that mimics SQLAlchemy session interface.

    Provides a compatibility layer for existing code that uses SQLAlchemy patterns.
    """

    def __init__(self):
        self.client = get_supabase_client()
        self._market_id: Optional[str] = None

    def set_market_id(self, market_id: str):
        """Set the current market context."""
        self._market_id = market_id

    @property
    def market_id(self) -> str:
        """Get the current market ID."""
        return self._market_id or settings.default_market_id

    # Table access methods
    def table(self, name: str):
        """Get a table reference for operations."""
        return self.client.table(name)

    # Query execution methods
    async def fetch_all(self, table: str, filters: Optional[Dict] = None,
                        select: str = "*", order_by: Optional[str] = None,
                        limit: Optional[int] = None) -> List[Dict]:
        """
        Fetch all records from a table with optional filters.

        Args:
            table: Table name
            filters: Dict of column=value filters
            select: Columns to select (default "*")
            order_by: Column to order by (prefix with - for desc)
            limit: Max records to return
        """
        query = self.client.table(table).select(select)

        if filters:
            for col, val in filters.items():
                if isinstance(val, list):
                    query = query.in_(col, val)
                else:
                    query = query.eq(col, val)

        if order_by:
            if order_by.startswith("-"):
                query = query.order(order_by[1:], desc=True)
            else:
                query = query.order(order_by)

        if limit:
            query = query.limit(limit)

        result = query.execute()
        return result.data or []

    async def fetch_one(self, table: str, filters: Dict, select: str = "*") -> Optional[Dict]:
        """Fetch a single record."""
        results = await self.fetch_all(table, filters, select, limit=1)
        return results[0] if results else None

    async def count(self, table: str, filters: Optional[Dict] = None) -> int:
        """Count records in a table."""
        query = self.client.table(table).select("*", count="exact")

        if filters:
            for col, val in filters.items():
                if isinstance(val, list):
                    query = query.in_(col, val)
                else:
                    query = query.eq(col, val)

        result = query.limit(0).execute()
        return result.count or 0

    async def insert(self, table: str, data: List[Dict] | Dict) -> List[Dict]:
        """Insert records into a table."""
        if isinstance(data, dict):
            data = [data]

        result = self.client.table(table).insert(data).execute()
        return result.data or []

    async def update(self, table: str, data: Dict, filters: Dict) -> List[Dict]:
        """Update records in a table."""
        query = self.client.table(table).update(data)

        for col, val in filters.items():
            query = query.eq(col, val)

        result = query.execute()
        return result.data or []

    async def delete(self, table: str, filters: Dict) -> None:
        """Delete records from a table."""
        query = self.client.table(table).delete()

        for col, val in filters.items():
            query = query.eq(col, val)

        query.execute()

    # RPC (stored procedure) execution
    async def rpc(self, function_name: str, params: Optional[Dict] = None) -> Any:
        """Call a PostgreSQL function via RPC."""
        result = self.client.rpc(function_name, params or {}).execute()
        return result.data

    # Compatibility methods (no-op for REST API)
    async def commit(self):
        """No-op for REST API (auto-commit)."""
        pass

    async def rollback(self):
        """No-op for REST API."""
        pass

    async def close(self):
        """No-op for REST API."""
        pass


# Global session factory
def get_supabase_session() -> SupabaseSession:
    """Get a new Supabase session."""
    return SupabaseSession()


@asynccontextmanager
async def get_supabase_db() -> AsyncGenerator[SupabaseSession, None]:
    """
    Context manager for Supabase database sessions.

    Provides compatibility with existing get_db() patterns.
    """
    session = SupabaseSession()
    try:
        yield session
    finally:
        await session.close()


async def init_supabase_db() -> None:
    """Verify Supabase connection on startup."""
    try:
        client = get_supabase_client()
        # Test connection by counting markets
        result = client.table("markets").select("id", count="exact").limit(1).execute()
        logger.info(f"Supabase connected. Markets count: {result.count}")
    except Exception as e:
        logger.error(f"Supabase connection failed: {e}")
        raise


async def close_supabase_db() -> None:
    """Cleanup (no-op for REST API)."""
    pass
