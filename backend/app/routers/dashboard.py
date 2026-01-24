"""
Dashboard API endpoints.

Provides endpoints for dashboard data aggregation.
Uses Supabase RPC for serverless compatibility.
"""

from typing import List, Optional

from fastapi import APIRouter, Query

from app.middleware.market_context import get_current_market_id
from app.schemas import (
    BrandProtectionDashboard,
    BrandProtectionKPIs,
    BrandProtectionLoss,
    BrandProtectionWin,
    CategoryLossStats,
    CompetitorStats,
    ModifierGroupStats,
)
from app.services.supabase_analytics import SupabaseAnalyticsService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/brand-protection", response_model=BrandProtectionDashboard)
async def get_brand_protection_dashboard(
    brand: str = Query(..., description="Brand name to analyze"),
    market_id: Optional[str] = Query(None, description="Market ID"),
) -> BrandProtectionDashboard:
    """
    Get complete brand protection dashboard data.

    Args:
        brand: Brand name to analyze
        market_id: Market ID (optional)

    Returns:
        Complete dashboard data including KPIs, wins, losses, and competitors
    """
    effective_market_id = market_id or get_current_market_id()
    service = SupabaseAnalyticsService(market_id=effective_market_id)
    return await service.get_brand_protection_dashboard(brand)


@router.get("/brand-protection/kpis", response_model=BrandProtectionKPIs)
async def get_brand_protection_kpis(
    brand: str = Query(..., description="Brand name to analyze"),
    market_id: Optional[str] = Query(None, description="Market ID"),
) -> BrandProtectionKPIs:
    """
    Get brand protection KPIs.

    Args:
        brand: Brand name to analyze
        market_id: Market ID (optional)

    Returns:
        KPI metrics for brand protection
    """
    effective_market_id = market_id or get_current_market_id()
    service = SupabaseAnalyticsService(market_id=effective_market_id)
    return await service.get_brand_protection_kpis(brand)


@router.get("/brand-protection/wins", response_model=List[BrandProtectionWin])
async def get_brand_protection_wins(
    brand: str = Query(..., description="Brand name to analyze"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    market_id: Optional[str] = Query(None, description="Market ID"),
) -> List[BrandProtectionWin]:
    """
    Get keywords where the brand ranks #1.

    Args:
        brand: Brand name to analyze
        limit: Maximum results to return
        offset: Results offset for pagination
        market_id: Market ID (optional)

    Returns:
        List of keywords where brand wins
    """
    effective_market_id = market_id or get_current_market_id()
    service = SupabaseAnalyticsService(market_id=effective_market_id)
    wins, _ = await service.get_brand_wins(brand, limit=limit, offset=offset)
    return wins


@router.get("/brand-protection/losses", response_model=List[BrandProtectionLoss])
async def get_brand_protection_losses(
    brand: str = Query(..., description="Brand name to analyze"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    market_id: Optional[str] = Query(None, description="Market ID"),
) -> List[BrandProtectionLoss]:
    """
    Get keywords where competitors beat the brand.

    Args:
        brand: Brand name to analyze
        limit: Maximum results to return
        offset: Results offset for pagination
        market_id: Market ID (optional)

    Returns:
        List of keywords where brand loses
    """
    effective_market_id = market_id or get_current_market_id()
    service = SupabaseAnalyticsService(market_id=effective_market_id)
    losses, _ = await service.get_brand_losses(brand, limit=limit, offset=offset)
    return losses


@router.get("/brand-protection/competitors", response_model=List[CompetitorStats])
async def get_top_competitors(
    brand: str = Query(..., description="Brand name to analyze"),
    limit: int = Query(10, ge=1, le=50),
    market_id: Optional[str] = Query(None, description="Market ID"),
) -> List[CompetitorStats]:
    """
    Get top competitors on brand keywords.

    Args:
        brand: Brand name to analyze
        limit: Maximum competitors to return
        market_id: Market ID (optional)

    Returns:
        List of competitor statistics
    """
    effective_market_id = market_id or get_current_market_id()
    service = SupabaseAnalyticsService(market_id=effective_market_id)
    return await service.get_top_competitors(brand, limit=limit)


@router.get("/brand-protection/categories", response_model=List[CategoryLossStats])
async def get_loss_categories(
    brand: str = Query(..., description="Brand name to analyze"),
    limit: int = Query(20, ge=1, le=100),
    market_id: Optional[str] = Query(None, description="Market ID"),
) -> List[CategoryLossStats]:
    """
    Get category breakdown of brand losses (aggregated by category).

    Args:
        brand: Brand name to analyze
        limit: Maximum categories to return
        market_id: Market ID (optional)

    Returns:
        List of category loss statistics
    """
    effective_market_id = market_id or get_current_market_id()
    service = SupabaseAnalyticsService(market_id=effective_market_id)
    return await service.get_losses_by_category(brand, limit=limit)


@router.get(
    "/brand-protection/modifier-groups",
    response_model=List[ModifierGroupStats],
)
async def get_modifier_group_stats(
    brand: str = Query(..., description="Brand name to analyze"),
    market_id: Optional[str] = Query(None, description="Market ID"),
) -> List[ModifierGroupStats]:
    """
    Get statistics for each modifier group value on brand keywords.
    Shows wins/losses, volume, average position, and top tags per modifier group.

    Args:
        brand: Brand name to analyze
        market_id: Market ID (optional)

    Returns:
        List of modifier group statistics
    """
    effective_market_id = market_id or get_current_market_id()
    service = SupabaseAnalyticsService(market_id=effective_market_id)
    return await service.get_modifier_group_stats(brand)
