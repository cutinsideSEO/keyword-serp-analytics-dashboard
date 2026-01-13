"""
Dashboard API endpoints.

Provides endpoints for dashboard data aggregation.
"""

from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas import (
    BrandProtectionDashboard,
    BrandProtectionKPIs,
    BrandProtectionLoss,
    BrandProtectionWin,
    CategoryLossStats,
    CategoryOpportunityDashboard,
    CategoryProtectionBreakdown,
    CategoryValueLossStats,
    CompetitorBrandedDashboard,
    CompetitorStats,
    DomainTypeLossStats,
    InfluentialDomain,
    ModifierGroupOpportunityBreakdown,
    ModifierGroupProtectionBreakdown,
    ModifierGroupStats,
)
from app.services.analytics import AnalyticsService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/brand-protection", response_model=BrandProtectionDashboard)
async def get_brand_protection_dashboard(
    brand: str = Query(..., description="Brand name to analyze"),
    db: AsyncSession = Depends(get_db),
) -> BrandProtectionDashboard:
    """
    Get complete brand protection dashboard data.

    Args:
        brand: Brand name to analyze
        db: Database session

    Returns:
        Complete dashboard data including KPIs, wins, losses, and competitors
    """
    service = AnalyticsService(db)
    return await service.get_brand_protection_dashboard(brand)


@router.get("/brand-protection/kpis", response_model=BrandProtectionKPIs)
async def get_brand_protection_kpis(
    brand: str = Query(..., description="Brand name to analyze"),
    db: AsyncSession = Depends(get_db),
) -> BrandProtectionKPIs:
    """
    Get brand protection KPIs.

    Args:
        brand: Brand name to analyze
        db: Database session

    Returns:
        KPI metrics for brand protection
    """
    service = AnalyticsService(db)
    return await service.get_brand_protection_kpis(brand)


@router.get("/brand-protection/wins", response_model=List[BrandProtectionWin])
async def get_brand_protection_wins(
    brand: str = Query(..., description="Brand name to analyze"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> List[BrandProtectionWin]:
    """
    Get keywords where the brand ranks #1.

    Args:
        brand: Brand name to analyze
        limit: Maximum results to return
        offset: Results offset for pagination
        db: Database session

    Returns:
        List of keywords where brand wins
    """
    service = AnalyticsService(db)
    wins, _ = await service.get_brand_wins(brand, limit=limit, offset=offset)
    return wins


@router.get("/brand-protection/losses", response_model=List[BrandProtectionLoss])
async def get_brand_protection_losses(
    brand: str = Query(..., description="Brand name to analyze"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> List[BrandProtectionLoss]:
    """
    Get keywords where competitors beat the brand.

    Args:
        brand: Brand name to analyze
        limit: Maximum results to return
        offset: Results offset for pagination
        db: Database session

    Returns:
        List of keywords where brand loses
    """
    service = AnalyticsService(db)
    losses, _ = await service.get_brand_losses(brand, limit=limit, offset=offset)
    return losses


@router.get("/brand-protection/competitors", response_model=List[CompetitorStats])
async def get_top_competitors(
    brand: str = Query(..., description="Brand name to analyze"),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
) -> List[CompetitorStats]:
    """
    Get top competitors on brand keywords.

    Args:
        brand: Brand name to analyze
        limit: Maximum competitors to return
        db: Database session

    Returns:
        List of competitor statistics
    """
    service = AnalyticsService(db)
    return await service.get_top_competitors(brand, limit=limit)


@router.get("/brand-protection/categories", response_model=List[CategoryLossStats])
async def get_loss_categories(
    brand: str = Query(..., description="Brand name to analyze"),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> List[CategoryLossStats]:
    """
    Get category breakdown of brand losses (aggregated by category).

    Args:
        brand: Brand name to analyze
        limit: Maximum categories to return
        db: Database session

    Returns:
        List of category loss statistics
    """
    service = AnalyticsService(db)
    return await service.get_losses_by_category(brand, limit=limit)


@router.get(
    "/brand-protection/categories/{category}/values",
    response_model=List[CategoryValueLossStats],
)
async def get_category_value_losses(
    category: str,
    brand: str = Query(..., description="Brand name to analyze"),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> List[CategoryValueLossStats]:
    """
    Get top values breakdown for a specific category where brand loses.
    Used to expand a category row and see which values contribute most to losses.

    Args:
        category: Category name (internal name, not display_name)
        brand: Brand name to analyze
        limit: Maximum values to return
        db: Database session

    Returns:
        List of category value loss statistics
    """
    service = AnalyticsService(db)
    return await service.get_category_value_losses(brand, category, limit=limit)


@router.get(
    "/brand-protection/modifier-groups",
    response_model=List[ModifierGroupStats],
)
async def get_modifier_group_stats(
    brand: str = Query(..., description="Brand name to analyze"),
    db: AsyncSession = Depends(get_db),
) -> List[ModifierGroupStats]:
    """
    Get statistics for each modifier group value on brand keywords.
    Shows wins/losses, volume, average position, and top tags per modifier group.

    Args:
        brand: Brand name to analyze
        db: Database session

    Returns:
        List of modifier group statistics
    """
    service = AnalyticsService(db)
    return await service.get_modifier_group_stats(brand)


@router.get(
    "/brand-protection/categories/{category}/breakdown",
    response_model=CategoryProtectionBreakdown,
)
async def get_category_protection_breakdown(
    category: str,
    brand: str = Query(..., description="Brand name to analyze"),
    value_limit: int = Query(10, ge=1, le=50, description="Max values to return"),
    db: AsyncSession = Depends(get_db),
) -> CategoryProtectionBreakdown:
    """
    Get full breakdown for a specific category in brand protection context.
    Includes win/loss split, top values with examples, competitors by type,
    and loss distribution by domain type.

    Args:
        category: Category name (internal name)
        brand: Brand name to analyze
        value_limit: Maximum values to return
        db: Database session

    Returns:
        Complete category protection breakdown
    """
    service = AnalyticsService(db)
    return await service.get_category_protection_breakdown(brand, category, value_limit)


@router.get(
    "/brand-protection/modifier-groups/{modifier_group}/breakdown",
    response_model=ModifierGroupProtectionBreakdown,
)
async def get_modifier_group_protection_breakdown(
    modifier_group: str,
    brand: str = Query(..., description="Brand name to analyze"),
    limit: int = Query(10, ge=1, le=50, description="Max tags to return"),
    db: AsyncSession = Depends(get_db),
) -> ModifierGroupProtectionBreakdown:
    """
    Get full breakdown for a specific modifier group in brand protection context.
    Includes win/loss split, top tags with win rates, competitors by type,
    loss distribution, and example keywords.

    Args:
        modifier_group: Modifier group name
        brand: Brand name to analyze
        limit: Maximum tags to return
        db: Database session

    Returns:
        Complete modifier group protection breakdown
    """
    service = AnalyticsService(db)
    return await service.get_modifier_group_protection_breakdown(brand, modifier_group, limit)


# =============================================================================
# Category Opportunities Endpoints
# =============================================================================


@router.get("/category-opportunities", response_model=CategoryOpportunityDashboard)
async def get_category_opportunities(
    brand: str = Query(..., description="Brand name to analyze"),
    db: AsyncSession = Depends(get_db),
) -> CategoryOpportunityDashboard:
    """
    Get non-branded keyword opportunities for a brand.

    Shows modifier groups where the brand can capture market share
    on generic/category keywords (keywords without brand mention).

    Non-branded keywords are keywords that do not have any brand tag,
    representing generic category searches like "mountain bike" or
    "road bike reviews".

    Args:
        brand: Brand name to analyze
        db: Database session

    Returns:
        Complete category opportunities dashboard with KPIs and modifier groups
    """
    service = AnalyticsService(db)
    return await service.get_category_opportunities(brand)


@router.get("/competitor-branded-opportunities", response_model=CompetitorBrandedDashboard)
async def get_competitor_branded_opportunities(
    brand: str = Query(..., description="Brand name to analyze"),
    db: AsyncSession = Depends(get_db),
) -> CompetitorBrandedDashboard:
    """
    Get opportunities on competitor branded keywords.

    Shows modifier groups for keywords that have a brand tag but NOT
    the selected brand. These are competitor branded keywords where
    the selected brand can potentially capture traffic.

    Example: If analyzing "Trek", this shows keywords branded to
    "Specialized", "Giant", "Cannondale" etc.

    Args:
        brand: Brand name to analyze
        db: Database session

    Returns:
        Competitor branded opportunities dashboard with KPIs and modifier groups
    """
    service = AnalyticsService(db)
    return await service.get_competitor_branded_opportunities(brand)


@router.get(
    "/modifier-group-opportunity-breakdown",
    response_model=ModifierGroupOpportunityBreakdown,
)
async def get_modifier_group_opportunity_breakdown(
    brand: str = Query(..., description="Brand name to analyze"),
    modifier_group: str = Query(..., description="Modifier group to break down"),
    keyword_type: str = Query(
        ...,
        description="Type of keywords: 'nonbranded' or 'competitor_branded'",
        regex="^(nonbranded|competitor_branded)$",
    ),
    db: AsyncSession = Depends(get_db),
) -> ModifierGroupOpportunityBreakdown:
    """
    Get detailed breakdown for a modifier group (lazy loaded on expand).

    Returns rich breakdown including:
    - Top category values with capture stats per value
    - Competitors grouped by domain type
    - Detailed keyword examples with rank, volume, winner info

    Args:
        brand: Brand name to analyze
        modifier_group: The modifier group to break down
        keyword_type: Type of keywords ('nonbranded' or 'competitor_branded')
        db: Database session

    Returns:
        Complete modifier group opportunity breakdown
    """
    service = AnalyticsService(db)
    return await service.get_modifier_group_opportunity_breakdown(
        brand, modifier_group, keyword_type
    )
