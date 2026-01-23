"""
Vercel serverless function entry point.

Vercel has native ASGI support for FastAPI.
"""

import os
import sys
from pathlib import Path

# Add backend to Python path for imports
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

# Step 1: Import FastAPI and middleware
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Step 2: Import config
from app.config import get_settings

# Step 3: Import middleware
from app.middleware import MarketContextMiddleware

# Step 4: Import routers
from app.routers import (
    brands_router,
    config_router,
    dashboard_router,
    keywords_router,
    market_overview_router,
    markets_router,
)

# Step 5: Import schemas
from app.schemas import HealthResponse

# Step 6: Get settings
settings = get_settings()

# Create app (without lifespan - Vercel serverless doesn't need startup/shutdown handlers)
app = FastAPI(
    title=settings.app_name,
    description="Analytics dashboard for keyword and SERP data analysis",
    version="0.1.0",
)

# Configure CORS
cors_origins = ["*"] if settings.cors_allow_all else settings.cors_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add market context middleware
app.add_middleware(MarketContextMiddleware)

# Include routers
app.include_router(markets_router, prefix="/api")
app.include_router(brands_router, prefix="/api")
app.include_router(config_router, prefix="/api")
app.include_router(keywords_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(market_overview_router, prefix="/api")


@app.get("/api/health", response_model=HealthResponse, tags=["system"])
async def health_check() -> HealthResponse:
    """Health check endpoint."""
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
