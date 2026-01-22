"""
API routers package.

Contains all FastAPI router modules.
"""

from app.routers.brands import router as brands_router
from app.routers.config import router as config_router
from app.routers.dashboard import router as dashboard_router
from app.routers.keywords import router as keywords_router
from app.routers.market_overview import router as market_overview_router
from app.routers.markets import router as markets_router

__all__ = [
    "brands_router",
    "config_router",
    "dashboard_router",
    "keywords_router",
    "market_overview_router",
    "markets_router",
]
