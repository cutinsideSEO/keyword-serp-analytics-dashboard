"""
Market Overview API endpoints.

Provides endpoints for market-wide analytics dashboard.
Domain types are configurable per market via market_config.py
"""

from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.market_config import get_market_config
from app.database import get_db
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
from app.services.market_analytics import MarketAnalyticsService

router = APIRouter(prefix="/dashboard/market-overview", tags=["market-overview"])

# Get market configuration
market_config = get_market_config()


@router.get("", response_model=MarketOverviewDashboard)
async def get_market_overview_dashboard(
    db: AsyncSession = Depends(get_db),
) -> MarketOverviewDashboard:
    """
    Get complete market overview dashboard.
    Single endpoint that returns all data for upfront loading.

    Args:
        db: Database session

    Returns:
        Complete market overview dashboard data
    """
    service = MarketAnalyticsService(db)
    return await service.get_full_dashboard()


@router.get("/share-of-search", response_model=List[ShareOfSearchItem])
async def get_share_of_search(
    limit: int = Query(20, ge=1, le=100, description="Maximum brands to return"),
    db: AsyncSession = Depends(get_db),
) -> List[ShareOfSearchItem]:
    """
    Get brands ranked by Share of Search (search volume demand).

    Args:
        limit: Maximum brands to return
        db: Database session

    Returns:
        List of brands with their share of search metrics
    """
    service = MarketAnalyticsService(db)
    return await service.get_share_of_search(limit)


@router.get("/retailers", response_model=List[DomainVisibilityItem])
async def get_top_retailers(
    limit: int = Query(10, ge=1, le=50, description="Maximum retailers to return"),
    db: AsyncSession = Depends(get_db),
) -> List[DomainVisibilityItem]:
    """
    Get top retailers/comparison sites by visibility score.
    Uses first non-brand domain type from market config.

    Args:
        limit: Maximum retailers to return
        db: Database session

    Returns:
        List of top retailers with visibility metrics
    """
    service = MarketAnalyticsService(db)

    # Get first non-brand type (e.g., Comparison Site, Reseller)
    non_brand_types = market_config.get_non_brand_type_names()
    retailer_type = non_brand_types[0] if non_brand_types else "Reseller"

    return await service.get_domain_visibility_by_type(retailer_type, limit)


@router.get("/influential-voices", response_model=List[DomainVisibilityItem])
async def get_influential_voices(
    limit: int = Query(10, ge=1, le=50, description="Maximum domains to return"),
    db: AsyncSession = Depends(get_db),
) -> List[DomainVisibilityItem]:
    """
    Get top UGC and 3rd Party domains by visibility.
    Uses remaining non-brand domain types from market config.

    Args:
        limit: Maximum domains to return
        db: Database session

    Returns:
        List of influential UGC and 3rd Party domains
    """
    service = MarketAnalyticsService(db)

    # Get remaining non-brand types (excluding first which is "retailers")
    non_brand_types = market_config.get_non_brand_type_names()
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
    db: AsyncSession = Depends(get_db),
) -> MarketProtectionKPIs:
    """
    Get market-wide brand protection KPIs.
    Includes both totals and averages across all brands.

    Args:
        db: Database session

    Returns:
        Market-wide protection KPIs
    """
    service = MarketAnalyticsService(db)
    return await service.get_market_protection_kpis()


@router.get("/loss-distribution", response_model=List[MarketLossDistribution])
async def get_loss_distribution(
    db: AsyncSession = Depends(get_db),
) -> List[MarketLossDistribution]:
    """
    Get loss distribution by domain type across all brands.

    Args:
        db: Database session

    Returns:
        Loss distribution by domain type
    """
    service = MarketAnalyticsService(db)
    return await service.get_market_loss_distribution()


@router.get("/biggest-losers", response_model=List[BrandLossItem])
async def get_biggest_losers(
    limit: int = Query(20, ge=1, le=100, description="Maximum brands to return"),
    db: AsyncSession = Depends(get_db),
) -> List[BrandLossItem]:
    """
    Get brands with worst brand protection.
    Ranked by volume lost, includes top modifier groups where they lose.

    Args:
        limit: Maximum brands to return
        db: Database session

    Returns:
        List of brands with worst protection metrics
    """
    service = MarketAnalyticsService(db)
    return await service.get_biggest_losers(limit)


@router.get("/categories", response_model=List[CategoryMarketStats])
async def get_category_stats(
    db: AsyncSession = Depends(get_db),
) -> List[CategoryMarketStats]:
    """
    Get market statistics for all categories.

    Args:
        db: Database session

    Returns:
        List of categories with market statistics
    """
    service = MarketAnalyticsService(db)
    return await service.get_category_market_stats()


@router.get("/categories/{category_name}", response_model=CategoryBreakdown)
async def get_category_breakdown(
    category_name: str,
    value_limit: int = Query(
        10, ge=1, le=50, description="Maximum values to return per category"
    ),
    db: AsyncSession = Depends(get_db),
) -> CategoryBreakdown:
    """
    Get detailed breakdown for a specific category.
    Includes top values, players by type, and example keywords.

    Args:
        category_name: Category name (internal name)
        value_limit: Maximum values to return
        db: Database session

    Returns:
        Detailed category breakdown
    """
    service = MarketAnalyticsService(db)
    return await service.get_category_breakdown(category_name, value_limit)


@router.get("/modifier-groups", response_model=List[ModifierGroupMarketStats])
async def get_modifier_group_stats(
    db: AsyncSession = Depends(get_db),
) -> List[ModifierGroupMarketStats]:
    """
    Get market statistics for all modifier groups.

    Args:
        db: Database session

    Returns:
        List of modifier groups with market statistics
    """
    service = MarketAnalyticsService(db)
    return await service.get_modifier_group_market_stats()


@router.get("/modifier-groups/{modifier_group}", response_model=ModifierGroupBreakdown)
async def get_modifier_group_breakdown(
    modifier_group: str,
    limit: int = Query(10, ge=1, le=50, description="Maximum items to return in lists"),
    db: AsyncSession = Depends(get_db),
) -> ModifierGroupBreakdown:
    """
    Get detailed breakdown for a specific modifier group.

    Args:
        modifier_group: Modifier group value
        limit: Maximum items to return in lists
        db: Database session

    Returns:
        Detailed modifier group breakdown
    """
    service = MarketAnalyticsService(db)
    return await service.get_modifier_group_breakdown(modifier_group, limit)
