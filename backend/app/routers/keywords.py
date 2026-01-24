"""
Keyword-related API endpoints.

Provides endpoints for querying and filtering keywords.
Uses Supabase RPC for serverless compatibility.
"""

from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query

from app.middleware.market_context import get_current_market_id
from app.schemas import (
    CategoryWithValues,
    KeywordListResponse,
    KeywordWithSerp,
)
from app.services.supabase_keywords import SupabaseKeywordsService

router = APIRouter(prefix="/keywords", tags=["keywords"])


@router.get("", response_model=KeywordListResponse)
async def list_keywords(
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
    service = SupabaseKeywordsService(market_id=effective_market_id)
    return await service.list_keywords(
        page=page,
        page_size=page_size,
        search=search,
        category=category,
        category_value=category_value,
        min_volume=min_volume,
        max_volume=max_volume,
        modifier_group=modifier_group,
    )


@router.get("/categories", response_model=List[CategoryWithValues])
async def list_categories(
    market_id: Optional[str] = Query(None, description="Market ID"),
) -> List[CategoryWithValues]:
    """
    List all categories with their unique values.

    Args:
        market_id: Market ID (optional)

    Returns:
        List of categories with values
    """
    effective_market_id = market_id or get_current_market_id()
    service = SupabaseKeywordsService(market_id=effective_market_id)
    return await service.list_categories()


@router.get("/{keyword_id}", response_model=KeywordWithSerp)
async def get_keyword(
    keyword_id: int,
    market_id: Optional[str] = Query(None, description="Market ID"),
) -> KeywordWithSerp:
    """
    Get keyword details with SERP results.

    Args:
        keyword_id: Keyword ID
        market_id: Market ID (optional)

    Returns:
        Keyword with tags and SERP results
    """
    effective_market_id = market_id or get_current_market_id()
    service = SupabaseKeywordsService(market_id=effective_market_id)
    result = await service.get_keyword(keyword_id)

    if not result:
        raise HTTPException(status_code=404, detail="Keyword not found")

    return result
