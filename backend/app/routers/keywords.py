"""
Keyword-related API endpoints.

Provides endpoints for querying and filtering keywords.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.market_context import get_current_market_id
from app.models import Category, Domain, Keyword, KeywordTag, SerpResult
from app.schemas import (
    CategoryResponse,
    CategoryWithValues,
    KeywordListResponse,
    KeywordWithSerp,
    KeywordWithTags,
    SerpResultResponse,
)

router = APIRouter(prefix="/keywords", tags=["keywords"])


@router.get("", response_model=KeywordListResponse)
async def list_keywords(
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    search: Optional[str] = None,
    category: Optional[str] = None,
    category_value: Optional[str] = None,
    min_volume: Optional[int] = None,
    max_volume: Optional[int] = None,
    modifier_group: Optional[str] = None,
    market_id: Optional[str] = Query(None, description="Market ID"),
) -> KeywordListResponse:
    """
    List keywords with filtering and pagination.

    Args:
        db: Database session
        page: Page number
        page_size: Results per page
        search: Keyword search string
        category: Filter by category name
        category_value: Filter by category value (requires category)
        min_volume: Minimum volume filter
        max_volume: Maximum volume filter
        modifier_group: Filter by modifier group
        market_id: Market ID (optional)

    Returns:
        Paginated list of keywords
    """
    effective_market_id = market_id or get_current_market_id()

    # Base query with market filter
    query = select(Keyword).where(Keyword.market_id == effective_market_id)
    count_query = select(func.count(Keyword.id)).where(Keyword.market_id == effective_market_id)

    # Apply filters
    if search:
        query = query.where(Keyword.keyword.ilike(f"%{search}%"))
        count_query = count_query.where(Keyword.keyword.ilike(f"%{search}%"))

    if min_volume is not None:
        query = query.where(Keyword.volume >= min_volume)
        count_query = count_query.where(Keyword.volume >= min_volume)

    if max_volume is not None:
        query = query.where(Keyword.volume <= max_volume)
        count_query = count_query.where(Keyword.volume <= max_volume)

    if modifier_group:
        query = query.where(Keyword.modifier_group == modifier_group)
        count_query = count_query.where(Keyword.modifier_group == modifier_group)

    if category:
        # Get category ID (filtered by market)
        cat_result = await db.execute(
            select(Category).where(
                Category.name == category,
                Category.market_id == effective_market_id
            )
        )
        cat = cat_result.scalar_one_or_none()

        if cat:
            subquery = (
                select(KeywordTag.keyword_id)
                .where(KeywordTag.category_id == cat.id)
            )
            if category_value:
                subquery = subquery.where(KeywordTag.value == category_value)

            query = query.where(Keyword.id.in_(subquery))
            count_query = count_query.where(Keyword.id.in_(subquery))

    # Get total count
    result = await db.execute(count_query)
    total = result.scalar() or 0

    # Apply pagination
    offset = (page - 1) * page_size
    query = query.order_by(Keyword.volume.desc()).limit(page_size).offset(offset)

    result = await db.execute(query)
    keywords = result.scalars().all()

    # Get tags for each keyword
    items = []
    for kw in keywords:
        tags_query = (
            select(Category.name, KeywordTag.value)
            .select_from(KeywordTag)
            .join(Category, KeywordTag.category_id == Category.id)
            .where(KeywordTag.keyword_id == kw.id)
        )
        tags_result = await db.execute(tags_query)
        tags = {row[0]: row[1] for row in tags_result.all()}

        items.append(
            KeywordWithTags(
                id=kw.id,
                keyword=kw.keyword,
                volume=kw.volume,
                modifier_group=kw.modifier_group,
                created_at=kw.created_at,
                tags=tags,
            )
        )

    total_pages = (total + page_size - 1) // page_size

    return KeywordListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/categories", response_model=List[CategoryWithValues])
async def list_categories(
    market_id: Optional[str] = Query(None, description="Market ID"),
    db: AsyncSession = Depends(get_db),
) -> List[CategoryWithValues]:
    """
    List all categories with their unique values.

    Args:
        market_id: Market ID (optional)
        db: Database session

    Returns:
        List of categories with values
    """
    effective_market_id = market_id or get_current_market_id()

    # Get all categories for this market
    result = await db.execute(
        select(Category)
        .where(Category.market_id == effective_market_id)
        .order_by(Category.display_name)
    )
    categories = result.scalars().all()

    items = []
    for cat in categories:
        # Get unique values and count
        values_query = (
            select(
                KeywordTag.value,
                func.count(distinct(KeywordTag.keyword_id)).label("count"),
            )
            .where(KeywordTag.category_id == cat.id)
            .group_by(KeywordTag.value)
            .order_by(func.count(distinct(KeywordTag.keyword_id)).desc())
            .limit(100)  # Limit to top 100 values
        )

        values_result = await db.execute(values_query)
        values = [row[0] for row in values_result.all()]

        # Get total keyword count for this category
        count_query = (
            select(func.count(distinct(KeywordTag.keyword_id)))
            .where(KeywordTag.category_id == cat.id)
        )
        count_result = await db.execute(count_query)
        keyword_count = count_result.scalar() or 0

        items.append(
            CategoryWithValues(
                id=cat.id,
                name=cat.name,
                display_name=cat.display_name,
                values=values,
                keyword_count=keyword_count,
            )
        )

    return items


@router.get("/{keyword_id}", response_model=KeywordWithSerp)
async def get_keyword(
    keyword_id: int,
    market_id: Optional[str] = Query(None, description="Market ID"),
    db: AsyncSession = Depends(get_db),
) -> KeywordWithSerp:
    """
    Get keyword details with SERP results.

    Args:
        keyword_id: Keyword ID
        market_id: Market ID (optional)
        db: Database session

    Returns:
        Keyword with tags and SERP results
    """
    effective_market_id = market_id or get_current_market_id()

    # Get keyword (filtered by market to ensure data isolation)
    result = await db.execute(
        select(Keyword).where(
            Keyword.id == keyword_id,
            Keyword.market_id == effective_market_id
        )
    )
    keyword = result.scalar_one_or_none()

    if not keyword:
        raise HTTPException(status_code=404, detail="Keyword not found")

    # Get tags
    tags_query = (
        select(Category.name, KeywordTag.value)
        .select_from(KeywordTag)
        .join(Category, KeywordTag.category_id == Category.id)
        .where(KeywordTag.keyword_id == keyword_id)
    )
    tags_result = await db.execute(tags_query)
    tags = {row[0]: row[1] for row in tags_result.all()}

    # Get SERP results
    serp_query = (
        select(SerpResult, Domain.domain)
        .join(Domain, SerpResult.domain_id == Domain.id)
        .where(SerpResult.keyword_id == keyword_id)
        .order_by(SerpResult.rank_group)
    )
    serp_result = await db.execute(serp_query)
    serp_rows = serp_result.all()

    serp_results = [
        SerpResultResponse(
            id=sr.id,
            keyword_id=sr.keyword_id,
            domain_id=sr.domain_id,
            domain=domain_str,
            rank_group=sr.rank_group,
            rank_absolute=sr.rank_absolute,
            page=sr.page,
            result_type=sr.result_type,
            title=sr.title,
            description=sr.description,
            url=sr.url,
            created_at=sr.created_at,
        )
        for sr, domain_str in serp_rows
    ]

    return KeywordWithSerp(
        id=keyword.id,
        keyword=keyword.keyword,
        volume=keyword.volume,
        modifier_group=keyword.modifier_group,
        created_at=keyword.created_at,
        tags=tags,
        serp_results=serp_results,
    )
