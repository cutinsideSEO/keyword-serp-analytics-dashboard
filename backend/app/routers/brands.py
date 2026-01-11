"""
Brand-related API endpoints.

Provides endpoints for listing brands and managing brand-domain mappings.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import BrandDomain, Category, Domain, Keyword, KeywordTag
from app.schemas import (
    BrandDomainResponse,
    BrandDomainUpdate,
    BrandListResponse,
    BrandResponse,
    BrandWithDomains,
)
from app.services.brand_mapper import BrandMapperService

router = APIRouter(prefix="/brands", tags=["brands"])


@router.get("", response_model=BrandListResponse)
async def list_brands(
    db: AsyncSession = Depends(get_db),
    min_keywords: int = 1,
    min_volume: int = 0,
) -> BrandListResponse:
    """
    List all brands with their keyword counts and total volume.

    Args:
        db: Database session
        min_keywords: Minimum keyword count filter
        min_volume: Minimum total volume filter

    Returns:
        List of brands with statistics
    """
    # Get brand category
    result = await db.execute(select(Category).where(Category.name == "brand"))
    brand_category = result.scalar_one_or_none()

    if not brand_category:
        return BrandListResponse(items=[], total=0)

    # Get all unique brand values with counts
    query = (
        select(
            KeywordTag.value,
            func.count(distinct(KeywordTag.keyword_id)).label("keyword_count"),
            func.sum(Keyword.volume).label("total_volume"),
        )
        .join(Keyword, KeywordTag.keyword_id == Keyword.id)
        .where(KeywordTag.category_id == brand_category.id)
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
) -> BrandWithDomains:
    """
    Get brand details with its domain mappings.

    Args:
        brand_name: Brand name to look up
        db: Database session

    Returns:
        Brand details with associated domains
    """
    # Get brand category
    result = await db.execute(select(Category).where(Category.name == "brand"))
    brand_category = result.scalar_one_or_none()

    if not brand_category:
        raise HTTPException(status_code=404, detail="Brand category not found")

    # Get brand stats
    stats_query = (
        select(
            func.count(distinct(KeywordTag.keyword_id)).label("keyword_count"),
            func.sum(Keyword.volume).label("total_volume"),
        )
        .join(Keyword, KeywordTag.keyword_id == Keyword.id)
        .where(
            KeywordTag.category_id == brand_category.id,
            KeywordTag.value == brand_name,
        )
    )

    result = await db.execute(stats_query)
    row = result.one()

    if row[0] == 0:
        raise HTTPException(status_code=404, detail=f"Brand '{brand_name}' not found")

    # Get domain mappings
    domains_query = (
        select(BrandDomain, Domain.domain)
        .join(Domain, BrandDomain.domain_id == Domain.id)
        .where(BrandDomain.brand_name == brand_name)
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
) -> BrandWithDomains:
    """
    Update brand-domain mappings.

    Args:
        brand_name: Brand name
        update: New domain mappings
        db: Database session

    Returns:
        Updated brand with domains
    """
    # Delete existing mappings
    await db.execute(
        BrandDomain.__table__.delete().where(BrandDomain.brand_name == brand_name)
    )

    # Add new mappings
    for domain_data in update.domains:
        domain_str = domain_data.get("domain")
        is_primary = domain_data.get("is_primary", False)

        if not domain_str:
            continue

        # Find or create domain
        result = await db.execute(
            select(Domain).where(Domain.domain == domain_str)
        )
        domain = result.scalar_one_or_none()

        if not domain:
            domain = Domain(domain=domain_str)
            db.add(domain)
            await db.flush()

        # Create mapping
        mapping = BrandDomain(
            brand_name=brand_name,
            domain_id=domain.id,
            is_primary=is_primary,
            confidence=1.0,  # Manual mapping = full confidence
        )
        db.add(mapping)

    await db.commit()

    # Return updated brand
    return await get_brand(brand_name, db)


@router.post("/{brand_name}/auto-map", response_model=BrandWithDomains)
async def auto_map_brand_domains(
    brand_name: str,
    db: AsyncSession = Depends(get_db),
    use_ai: bool = True,
) -> BrandWithDomains:
    """
    Automatically map brand to its domains using AI.

    Args:
        brand_name: Brand name
        db: Database session
        use_ai: Whether to use AI for mapping

    Returns:
        Brand with newly mapped domains
    """
    service = BrandMapperService(db)

    # Get domain mappings from AI
    mappings = await service.map_brand_to_domains(brand_name, use_ai=use_ai)

    if mappings:
        await service.save_brand_mapping(brand_name, mappings)

    return await get_brand(brand_name, db)
