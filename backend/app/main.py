"""
FastAPI application entry point.

Configures the application, middleware, and routes.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.config import get_settings
from app.database import close_db, init_db
from app.routers import brands_router, dashboard_router, keywords_router, market_overview_router
from app.schemas import HealthResponse


class NoCacheMiddleware(BaseHTTPMiddleware):
    """Middleware to prevent browser caching of API responses."""

    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        # Add no-cache headers to all API responses
        if request.url.path.startswith("/api"):
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        return response

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler.

    Initializes database on startup and closes connections on shutdown.
    """
    logger.info("Starting application...")

    # Initialize database
    await init_db()
    logger.info("Database initialized")

    yield

    # Cleanup
    await close_db()
    logger.info("Application shutdown complete")


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    description="Analytics dashboard for keyword and SERP data analysis",
    version="0.1.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add no-cache middleware to prevent stale data
app.add_middleware(NoCacheMiddleware)

# Include routers
app.include_router(brands_router, prefix="/api")
app.include_router(keywords_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(market_overview_router, prefix="/api")


@app.get("/api/health", response_model=HealthResponse, tags=["system"])
async def health_check() -> HealthResponse:
    """
    Health check endpoint.

    Returns:
        Health status of the application
    """
    return HealthResponse(
        status="ok",
        database="connected",
        version="0.1.0",
    )


@app.get("/", tags=["system"])
async def root():
    """Root endpoint with API information."""
    return {
        "name": settings.app_name,
        "version": "0.1.0",
        "docs": "/docs",
        "health": "/api/health",
    }
