"""
Configuration API endpoints.

Provides endpoints for accessing market configuration.
"""

from typing import Any, Dict

from fastapi import APIRouter

from app.market_config import get_market_config

router = APIRouter(prefix="/config", tags=["config"])


@router.get("/market")
async def get_market_configuration() -> Dict[str, Any]:
    """
    Get current market configuration.
    Returns domain types, market info, and styling configuration.

    Returns:
        Market configuration dictionary
    """
    config = get_market_config()
    return config.to_dict()
