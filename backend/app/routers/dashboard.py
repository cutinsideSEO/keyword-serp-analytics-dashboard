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
    CategoryOpportunityDashboard,
    CategoryProtectionBreakdown,
    CompetitorBrandedDashboard,
    CompetitorStats,
    ModifierGroupOpportunityBreakdown,
    ModifierGroupProtectionBreakdown,
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


@router.get(
    "/brand-protection/categories/{category}/breakdown",
    response_model=CategoryProtectionBreakdown,
)
async def get_category_protection_breakdown(
    category: str,
    brand: str = Query(..., description="Brand name to analyze"),
    value_limit: int = Query(10, ge=1, le=50, description="Max values to return"),
    market_id: Optional[str] = Query(None, description="Market ID"),
) -> CategoryProtectionBreakdown:
    """
    Get detailed category breakdown for brand protection.

    Shows win/loss statistics by category value, competitors by type,
    and loss distribution.

    Args:
        category: Category name to break down
        brand: Brand name to analyze
        value_limit: Maximum values to return
        market_id: Market ID (optional)

    Returns:
        Detailed category protection breakdown
    """
    effective_market_id = market_id or get_current_market_id()
    service = SupabaseAnalyticsService(market_id=effective_market_id)
    return await service.get_category_protection_breakdown(brand, category, value_limit)


@router.get(
    "/brand-protection/modifier-groups/{modifier_group}/breakdown",
    response_model=ModifierGroupProtectionBreakdown,
)
async def get_modifier_group_protection_breakdown(
    modifier_group: str,
    brand: str = Query(..., description="Brand name to analyze"),
    limit: int = Query(10, ge=1, le=50, description="Max items to return"),
    market_id: Optional[str] = Query(None, description="Market ID"),
) -> ModifierGroupProtectionBreakdown:
    """
    Get detailed modifier group breakdown for brand protection.

    Shows win/loss statistics by tag, competitors by type,
    loss distribution, and example keywords.

    Args:
        modifier_group: Modifier group to break down
        brand: Brand name to analyze
        limit: Maximum items to return
        market_id: Market ID (optional)

    Returns:
        Detailed modifier group protection breakdown
    """
    effective_market_id = market_id or get_current_market_id()
    service = SupabaseAnalyticsService(market_id=effective_market_id)
    return await service.get_modifier_group_protection_breakdown(brand, modifier_group, limit)


@router.get("/category-opportunities", response_model=CategoryOpportunityDashboard)
async def get_category_opportunities(
    brand: str = Query(..., description="Brand name to analyze"),
    market_id: Optional[str] = Query(None, description="Market ID"),
) -> CategoryOpportunityDashboard:
    """
    Get category opportunities for non-branded keywords.

    Shows where the brand can capture more non-branded search volume
    by modifier group.

    Args:
        brand: Brand name to analyze
        market_id: Market ID (optional)

    Returns:
        Category opportunity dashboard with KPIs and modifier groups
    """
    effective_market_id = market_id or get_current_market_id()
    service = SupabaseAnalyticsService(market_id=effective_market_id)
    return await service.get_category_opportunities(brand)


@router.get("/competitor-branded-opportunities", response_model=CompetitorBrandedDashboard)
async def get_competitor_branded_opportunities(
    brand: str = Query(..., description="Brand name to analyze"),
    market_id: Optional[str] = Query(None, description="Market ID"),
) -> CompetitorBrandedDashboard:
    """
    Get opportunities on competitor-branded keywords.

    Shows where the brand can capture volume on competitor brand searches.

    Args:
        brand: Brand name to analyze
        market_id: Market ID (optional)

    Returns:
        Competitor branded opportunity dashboard
    """
    effective_market_id = market_id or get_current_market_id()
    service = SupabaseAnalyticsService(market_id=effective_market_id)
    return await service.get_competitor_branded_opportunities(brand)


@router.get("/modifier-group-opportunity-breakdown", response_model=ModifierGroupOpportunityBreakdown)
async def get_modifier_group_opportunity_breakdown(
    brand: str = Query(..., description="Brand name to analyze"),
    modifier_group: str = Query(..., description="Modifier group to analyze"),
    keyword_type: str = Query("nonbranded", description="Keyword type: nonbranded or competitor_branded"),
    market_id: Optional[str] = Query(None, description="Market ID"),
) -> ModifierGroupOpportunityBreakdown:
    """
    Get detailed breakdown for a modifier group opportunity.

    Args:
        brand: Brand name to analyze
        modifier_group: Modifier group value
        keyword_type: Type of keywords (nonbranded or competitor_branded)
        market_id: Market ID (optional)

    Returns:
        Detailed modifier group opportunity breakdown
    """
    effective_market_id = market_id or get_current_market_id()
    service = SupabaseAnalyticsService(market_id=effective_market_id)
    return await service.get_modifier_group_opportunity_breakdown(brand, modifier_group, keyword_type)
