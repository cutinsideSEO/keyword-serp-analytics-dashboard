"""
Brand-related API endpoints.

Provides endpoints for listing brands and managing brand-domain mappings.
"""

import json
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import distinct, func, select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import BrandDomain, Category, Domain, Keyword, KeywordTag, Market
from app.schemas import (
    BrandDomainResponse,
    BrandDomainUpdate,
    BrandListResponse,
    BrandResponse,
    BrandWithDomains,
)
from app.services.brand_mapper import BrandMapperService
from app.middleware.market_context import get_current_market_id

router = APIRouter(prefix="/brands", tags=["brands"])


async def _get_brand_category_ids(
    db: AsyncSession,
    market_id: str,
) -> List[int]:
    """Get brand category IDs for a market from database."""
    # Get market config from database
    result = await db.execute(select(Market).where(Market.id == market_id))
    market = result.scalar_one_or_none()

    if not market:
        return []

    # Parse brand_category_names from JSON
    try:
        brand_category_names = json.loads(market.brand_category_names)
    except (json.JSONDecodeError, TypeError):
        brand_category_names = ["brand"]

    # Get category IDs
    result = await db.execute(
        select(Category.id).where(
            Category.market_id == market_id,
            Category.name.in_(brand_category_names)
        )
    )
    return [row[0] for row in result.all()]


@router.get("", response_model=BrandListResponse)
async def list_brands(
    db: AsyncSession = Depends(get_db),
    min_keywords: int = 1,
    min_volume: int = 0,
    market_id: Optional[str] = Query(None, description="Market ID (optional, uses default from context)"),
) -> BrandListResponse:
    """
    List all brands with their keyword counts and total volume.

    Uses brand_category_names from market config to determine which categories
    represent brands (e.g., "brand" for bicycle, "insurance_company___canonical" for insurance).

    Args:
        db: Database session
        min_keywords: Minimum keyword count filter
        min_volume: Minimum total volume filter
        market_id: Market ID (optional, defaults to context market)

    Returns:
        List of brands with statistics
    """
    # Get market_id from parameter or context
    effective_market_id = market_id or get_current_market_id()

    # Get brand category IDs for this market
    brand_category_ids = await _get_brand_category_ids(db, effective_market_id)

    if not brand_category_ids:
        return BrandListResponse(items=[], total=0)

    # Get all unique brand values with counts across all brand categories
    # Filter by market_id through Keyword table
    query = (
        select(
            KeywordTag.value,
            func.count(distinct(KeywordTag.keyword_id)).label("keyword_count"),
            func.sum(Keyword.volume).label("total_volume"),
        )
        .join(Keyword, KeywordTag.keyword_id == Keyword.id)
        .where(
            Keyword.market_id == effective_market_id,
            KeywordTag.category_id.in_(brand_category_ids)
        )
        .group_by(KeywordTag.value)
        .having(func.count(distinct(KeywordTag.keyword_id)) >= min_keywords)
        .having(func.sum(Keyword.volume) >= min_volume)
        .order_by(func.sum(Keyword.volume).desc())
    )

    result = await db.execute(query)
    rows = result.all()

    brands = [
        BrandResponse(
            brand_name=row[0],
            keyword_count=row[1],
            total_volume=row[2] or 0,
        )
        for row in rows
    ]

    return BrandListResponse(items=brands, total=len(brands))


@router.get("/{brand_name}", response_model=BrandWithDomains)
async def get_brand(
    brand_name: str,
    db: AsyncSession = Depends(get_db),
    market_id: Optional[str] = Query(None, description="Market ID (optional, uses default from context)"),
) -> BrandWithDomains:
    """
    Get brand details with its domain mappings.

    Args:
        brand_name: Brand name to look up
        db: Database session
        market_id: Market ID (optional, defaults to context market)

    Returns:
        Brand details with associated domains
    """
    # Get market_id from parameter or context
    effective_market_id = market_id or get_current_market_id()

    # Get brand category IDs for this market
    brand_category_ids = await _get_brand_category_ids(db, effective_market_id)

    if not brand_category_ids:
        raise HTTPException(status_code=404, detail="Brand category not found")

    # Get brand stats (filtered by market)
    stats_query = (
        select(
            func.count(distinct(KeywordTag.keyword_id)).label("keyword_count"),
            func.sum(Keyword.volume).label("total_volume"),
        )
        .join(Keyword, KeywordTag.keyword_id == Keyword.id)
        .where(
            Keyword.market_id == effective_market_id,
            KeywordTag.category_id.in_(brand_category_ids),
            KeywordTag.value == brand_name,
        )
    )

    result = await db.execute(stats_query)
    row = result.one()

    if row[0] == 0:
        raise HTTPException(status_code=404, detail=f"Brand '{brand_name}' not found")

    # Get domain mappings (filtered by market)
    domains_query = (
        select(BrandDomain, Domain.domain)
        .join(Domain, BrandDomain.domain_id == Domain.id)
        .where(
            BrandDomain.market_id == effective_market_id,
            BrandDomain.brand_name == brand_name
        )
        .order_by(BrandDomain.is_primary.desc(), BrandDomain.confidence.desc())
    )

    result = await db.execute(domains_query)
    domain_rows = result.all()

    domains = [
        BrandDomainResponse(
            id=bd.id,
            brand_name=bd.brand_name,
            domain=domain_str,
            is_primary=bd.is_primary,
            confidence=bd.confidence,
            created_at=bd.created_at,
        )
        for bd, domain_str in domain_rows
    ]

    return BrandWithDomains(
        brand_name=brand_name,
        keyword_count=row[0],
        total_volume=row[1] or 0,
        domains=domains,
    )


@router.put("/{brand_name}/domains", response_model=BrandWithDomains)
async def update_brand_domains(
    brand_name: str,
    update: BrandDomainUpdate,
    db: AsyncSession = Depends(get_db),
    market_id: Optional[str] = Query(None, description="Market ID (optional, uses default from context)"),
) -> BrandWithDomains:
    """
    Update brand-domain mappings.

    Args:
        brand_name: Brand name
        update: New domain mappings
        db: Database session
        market_id: Market ID (optional, defaults to context market)

    Returns:
        Updated brand with domains
    """
    # Get market_id from parameter or context
    effective_market_id = market_id or get_current_market_id()

    # Delete existing mappings for this market
    await db.execute(
        BrandDomain.__table__.delete().where(
            BrandDomain.market_id == effective_market_id,
            BrandDomain.brand_name == brand_name
        )
    )

    # Add new mappings
    for domain_data in update.domains:
        domain_str = domain_data.get("domain")
        is_primary = domain_data.get("is_primary", False)

        if not domain_str:
            continue

        # Find or create domain for this market
        result = await db.execute(
            select(Domain).where(
                Domain.market_id == effective_market_id,
                Domain.domain == domain_str
            )
        )
        domain = result.scalar_one_or_none()

        if not domain:
            domain = Domain(market_id=effective_market_id, domain=domain_str)
            db.add(domain)
            await db.flush()

        # Create mapping
        mapping = BrandDomain(
            market_id=effective_market_id,
            brand_name=brand_name,
            domain_id=domain.id,
            is_primary=is_primary,
            confidence=1.0,  # Manual mapping = full confidence
        )
        db.add(mapping)

    await db.commit()

    # Return updated brand
    return await get_brand(brand_name, db, market_id=effective_market_id)


@router.post("/{brand_name}/auto-map", response_model=BrandWithDomains)
async def auto_map_brand_domains(
    brand_name: str,
    db: AsyncSession = Depends(get_db),
    use_ai: bool = True,
    market_id: Optional[str] = Query(None, description="Market ID (optional, uses default from context)"),
) -> BrandWithDomains:
    """
    Automatically map brand to its domains using AI.

    Args:
        brand_name: Brand name
        db: Database session
        use_ai: Whether to use AI for mapping
        market_id: Market ID (optional, defaults to context market)

    Returns:
        Brand with newly mapped domains
    """
    # Get market_id from parameter or context
    effective_market_id = market_id or get_current_market_id()

    service = BrandMapperService(db, market_id=effective_market_id)

    # Get domain mappings from AI
    mappings = await service.map_brand_to_domains(brand_name, use_ai=use_ai)

    if mappings:
        await service.save_brand_mapping(brand_name, mappings)

    return await get_brand(brand_name, db, market_id=effective_market_id)
