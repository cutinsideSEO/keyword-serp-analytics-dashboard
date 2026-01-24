"""
Market Overview API endpoints.

Provides endpoints for market-wide analytics dashboard.
Uses Supabase RPC for serverless compatibility.
"""

from typing import List, Optional

from fastapi import APIRouter, Query

from app.middleware.market_context import get_current_market_id
from app.schemas import (
    MarketOverviewDashboard,
    ShareOfSearchItem,
    DomainVisibilityItem,
    MarketProtectionKPIs,
    MarketLossDistribution,
    BrandLossItem,
    CategoryMarketStats,
    CategoryBreakdown,
    ModifierGroupMarketStats,
    ModifierGroupBreakdown,
)
from app.services.supabase_market_analytics import SupabaseMarketAnalyticsService

router = APIRouter(prefix="/dashboard/market-overview", tags=["market-overview"])


@router.get("", response_model=MarketOverviewDashboard)
async def get_market_overview_dashboard(
    market_id: Optional[str] = Query(None, description="Market ID"),
) -> MarketOverviewDashboard:
    """
    Get complete market overview dashboard.
    Single endpoint that returns all data for upfront loading.

    Args:
        market_id: Market ID (optional)

    Returns:
        Complete market overview dashboard data
    """
    effective_market_id = market_id or get_current_market_id()
    service = SupabaseMarketAnalyticsService(market_id=effective_market_id)
    return await service.get_full_dashboard()


@router.get("/share-of-search", response_model=List[ShareOfSearchItem])
async def get_share_of_search(
    limit: int = Query(20, ge=1, le=100, description="Maximum brands to return"),
    market_id: Optional[str] = Query(None, description="Market ID"),
) -> List[ShareOfSearchItem]:
    """
    Get brands ranked by Share of Search (search volume demand).

    Args:
        limit: Maximum brands to return
        market_id: Market ID (optional)

    Returns:
        List of brands with their share of search metrics
    """
    effective_market_id = market_id or get_current_market_id()
    service = SupabaseMarketAnalyticsService(market_id=effective_market_id)
    return await service.get_share_of_search(limit)


@router.get("/retailers", response_model=List[DomainVisibilityItem])
async def get_top_retailers(
    limit: int = Query(10, ge=1, le=50, description="Maximum retailers to return"),
    market_id: Optional[str] = Query(None, description="Market ID"),
) -> List[DomainVisibilityItem]:
    """
    Get top retailers/comparison sites by visibility score.
    Uses first non-brand domain type from market config.

    Args:
        limit: Maximum retailers to return
        market_id: Market ID (optional)

    Returns:
        List of top retailers with visibility metrics
    """
    effective_market_id = market_id or get_current_market_id()
    service = SupabaseMarketAnalyticsService(market_id=effective_market_id)

    # Get first non-brand type (e.g., Comparison Site, Reseller)
    non_brand_types = await service.get_non_brand_type_names()
    retailer_type = non_brand_types[0] if non_brand_types else "Reseller"

    return await service.get_domain_visibility_by_type(retailer_type, limit)


@router.get("/influential-voices", response_model=List[DomainVisibilityItem])
async def get_influential_voices(
    limit: int = Query(10, ge=1, le=50, description="Maximum domains to return"),
    market_id: Optional[str] = Query(None, description="Market ID"),
) -> List[DomainVisibilityItem]:
    """
    Get top UGC and 3rd Party domains by visibility.
    Uses remaining non-brand domain types from market config.

    Args:
        limit: Maximum domains to return
        market_id: Market ID (optional)

    Returns:
        List of influential UGC and 3rd Party domains
    """
    effective_market_id = market_id or get_current_market_id()
    service = SupabaseMarketAnalyticsService(market_id=effective_market_id)

    # Get remaining non-brand types (excluding first which is "retailers")
    non_brand_types = await service.get_non_brand_type_names()
    voice_types = non_brand_types[1:] if len(non_brand_types) > 1 else []

    # Fetch and combine all voice types
    combined = []
    for voice_type in voice_types:
        voices = await service.get_domain_visibility_by_type(voice_type, limit)
        combined.extend(voices)

    # Sort by visibility and limit
    combined.sort(key=lambda x: x.visibility_score, reverse=True)

    return combined[:limit]


@router.get("/protection-kpis", response_model=MarketProtectionKPIs)
async def get_market_protection_kpis(
    market_id: Optional[str] = Query(None, description="Market ID"),
) -> MarketProtectionKPIs:
    """
    Get market-wide brand protection KPIs.
    Includes both totals and averages across all brands.

    Args:
        market_id: Market ID (optional)

    Returns:
        Market-wide protection KPIs
    """
    effective_market_id = market_id or get_current_market_id()
    service = SupabaseMarketAnalyticsService(market_id=effective_market_id)
    return await service.get_market_protection_kpis()


@router.get("/loss-distribution", response_model=List[MarketLossDistribution])
async def get_loss_distribution(
    market_id: Optional[str] = Query(None, description="Market ID"),
) -> List[MarketLossDistribution]:
    """
    Get loss distribution by domain type across all brands.

    Args:
        market_id: Market ID (optional)

    Returns:
        Loss distribution by domain type
    """
    effective_market_id = market_id or get_current_market_id()
    service = SupabaseMarketAnalyticsService(market_id=effective_market_id)
    return await service.get_market_loss_distribution()


@router.get("/biggest-losers", response_model=List[BrandLossItem])
async def get_biggest_losers(
    limit: int = Query(20, ge=1, le=100, description="Maximum brands to return"),
    market_id: Optional[str] = Query(None, description="Market ID"),
) -> List[BrandLossItem]:
    """
    Get brands with worst brand protection.
    Ranked by volume lost, includes top modifier groups where they lose.

    Args:
        limit: Maximum brands to return
        market_id: Market ID (optional)

    Returns:
        List of brands with worst protection metrics
    """
    effective_market_id = market_id or get_current_market_id()
    service = SupabaseMarketAnalyticsService(market_id=effective_market_id)
    return await service.get_biggest_losers(limit)


@router.get("/categories", response_model=List[CategoryMarketStats])
async def get_category_stats(
    market_id: Optional[str] = Query(None, description="Market ID"),
) -> List[CategoryMarketStats]:
    """
    Get market statistics for all categories.

    Args:
        market_id: Market ID (optional)

    Returns:
        List of categories with market statistics
    """
    effective_market_id = market_id or get_current_market_id()
    service = SupabaseMarketAnalyticsService(market_id=effective_market_id)
    return await service.get_category_market_stats()


@router.get("/categories/{category_name}", response_model=CategoryBreakdown)
async def get_category_breakdown(
    category_name: str,
    value_limit: int = Query(
        10, ge=1, le=50, description="Maximum values to return per category"
    ),
    market_id: Optional[str] = Query(None, description="Market ID"),
) -> CategoryBreakdown:
    """
    Get detailed breakdown for a specific category.
    Includes top values, players by type, and example keywords.

    Args:
        category_name: Category name (internal name)
        value_limit: Maximum values to return
        market_id: Market ID (optional)

    Returns:
        Detailed category breakdown
    """
    effective_market_id = market_id or get_current_market_id()
    service = SupabaseMarketAnalyticsService(market_id=effective_market_id)
    return await service.get_category_breakdown(category_name, value_limit)


@router.get("/modifier-groups", response_model=List[ModifierGroupMarketStats])
async def get_modifier_group_stats(
    market_id: Optional[str] = Query(None, description="Market ID"),
) -> List[ModifierGroupMarketStats]:
    """
    Get market statistics for all modifier groups.

    Args:
        market_id: Market ID (optional)

    Returns:
        List of modifier groups with market statistics
    """
    effective_market_id = market_id or get_current_market_id()
    service = SupabaseMarketAnalyticsService(market_id=effective_market_id)
    return await service.get_modifier_group_market_stats()


@router.get("/modifier-groups/{modifier_group}", response_model=ModifierGroupBreakdown)
async def get_modifier_group_breakdown(
    modifier_group: str,
    limit: int = Query(10, ge=1, le=50, description="Maximum items to return in lists"),
    market_id: Optional[str] = Query(None, description="Market ID"),
) -> ModifierGroupBreakdown:
    """
    Get detailed breakdown for a specific modifier group.

    Args:
        modifier_group: Modifier group value
        limit: Maximum items to return in lists
        market_id: Market ID (optional)

    Returns:
        Detailed modifier group breakdown
    """
    effective_market_id = market_id or get_current_market_id()
    service = SupabaseMarketAnalyticsService(market_id=effective_market_id)
    return await service.get_modifier_group_breakdown(modifier_group, limit)
