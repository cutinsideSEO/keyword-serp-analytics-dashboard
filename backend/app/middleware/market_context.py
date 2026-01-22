"""
Market Context Middleware

Extracts and manages the current market context for each request.
Market ID can be specified via:
1. Path parameter: /api/markets/{market_id}/...
2. Query parameter: ?market_id=...
3. Header: X-Market-ID
4. Default from settings
"""

import re
from contextvars import ContextVar
from typing import Optional

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.config import get_settings

# ContextVar to hold the current market_id for the request
current_market_id: ContextVar[str] = ContextVar("current_market_id", default="")


def get_current_market_id() -> str:
    """
    Get the current market ID from the context.

    Returns:
        str: The current market ID, or the default if not set.
    """
    market_id = current_market_id.get()
    if not market_id:
        return get_settings().default_market_id
    return market_id


class MarketContextMiddleware(BaseHTTPMiddleware):
    """
    Middleware that extracts the market_id from the request and sets it
    in the context for use throughout the request lifecycle.
    """

    # Pattern to match market_id in path: /api/markets/{market_id}/...
    MARKET_PATH_PATTERN = re.compile(r"/api/markets/([^/]+)")

    async def dispatch(self, request: Request, call_next) -> Response:
        """
        Extract market_id from request and set in context.

        Priority:
        1. Path parameter (/api/markets/{market_id}/...)
        2. Query parameter (?market_id=...)
        3. Header (X-Market-ID)
        4. Default from settings
        """
        market_id = self._extract_market_id(request)

        # Set the market_id in context
        token = current_market_id.set(market_id)

        try:
            response = await call_next(request)
            return response
        finally:
            # Reset the context
            current_market_id.reset(token)

    def _extract_market_id(self, request: Request) -> str:
        """
        Extract market_id from request using priority order.
        """
        settings = get_settings()

        # 1. Check path parameter
        path_match = self.MARKET_PATH_PATTERN.search(request.url.path)
        if path_match:
            return path_match.group(1)

        # 2. Check query parameter
        market_id = request.query_params.get("market_id")
        if market_id:
            return market_id

        # 3. Check header
        market_id = request.headers.get("X-Market-ID")
        if market_id:
            return market_id

        # 4. Return default
        return settings.default_market_id


def get_market_id_dependency() -> str:
    """
    FastAPI dependency to get the current market_id.

    Use this in route handlers to get the market context.

    Example:
        @router.get("/brands")
        async def get_brands(market_id: str = Depends(get_market_id_dependency)):
            ...
    """
    return get_current_market_id()
