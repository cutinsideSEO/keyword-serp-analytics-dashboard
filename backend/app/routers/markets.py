"""
Markets router for multi-market support.

Provides endpoints for listing markets and retrieving market configurations.
Uses Supabase REST API for database operations.
"""

import logging
from typing import List

from fastapi import APIRouter, HTTPException

from app.supabase_db import get_supabase_client
from app.schemas import (
    MarketConfigResponse,
    MarketDomainTypeResponse,
    MarketSummary,
    MarketsListResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/markets", tags=["markets"])


@router.get("", response_model=MarketsListResponse)
async def list_markets() -> MarketsListResponse:
    """
    List all available markets.

    Returns a list of active markets with basic info for the market selector.
    """
    client = get_supabase_client()

    result = client.table("markets").select(
        "id, name, language, text_direction, is_active"
    ).eq("is_active", True).order("name").execute()

    market_summaries = [
        MarketSummary(
            id=m["id"],
            name=m["name"],
            language=m.get("language", "en"),
            text_direction=m.get("text_direction", "ltr"),
            is_active=m.get("is_active", True),
        )
        for m in (result.data or [])
    ]

    return MarketsListResponse(
        markets=market_summaries,
        total=len(market_summaries),
    )


@router.get("/{market_id}/config", response_model=MarketConfigResponse)
async def get_market_config(market_id: str) -> MarketConfigResponse:
    """
    Get full configuration for a specific market.

    Returns market details including domain type configurations for styling.
    """
    client = get_supabase_client()

    # Get market
    market_result = client.table("markets").select("*").eq("id", market_id).limit(1).execute()

    if not market_result.data:
        raise HTTPException(status_code=404, detail=f"Market '{market_id}' not found")

    market = market_result.data[0]

    # Get domain types
    dt_result = client.table("market_domain_types").select("*").eq(
        "market_id", market_id
    ).order("sort_order").execute()

    domain_type_responses = [
        MarketDomainTypeResponse(
            type_id=dt["type_id"],
            display_name=dt["display_name"],
            is_brand_type=dt.get("is_brand_type", False),
            tremor_color=dt.get("tremor_color", "blue"),
            hex_color=dt.get("hex_color"),
            gradient=dt.get("gradient"),
            bg_class=dt.get("bg_class"),
            text_class=dt.get("text_class"),
            border_class=dt.get("border_class"),
            icon=dt.get("icon"),
        )
        for dt in (dt_result.data or [])
    ]

    return MarketConfigResponse(
        id=market["id"],
        name=market["name"],
        industry_context=market.get("industry_context"),
        language=market.get("language", "en"),
        text_direction=market.get("text_direction", "ltr"),
        domain_types=domain_type_responses,
    )


@router.get("/{market_id}/domain-types", response_model=List[MarketDomainTypeResponse])
async def get_market_domain_types(market_id: str) -> List[MarketDomainTypeResponse]:
    """
    Get domain types for a specific market.

    Returns just the domain type configurations, useful for styling components.
    """
    client = get_supabase_client()

    result = client.table("market_domain_types").select("*").eq(
        "market_id", market_id
    ).order("sort_order").execute()

    if not result.data:
        raise HTTPException(
            status_code=404,
            detail=f"No domain types found for market '{market_id}'"
        )

    return [
        MarketDomainTypeResponse(
            type_id=dt["type_id"],
            display_name=dt["display_name"],
            is_brand_type=dt.get("is_brand_type", False),
            tremor_color=dt.get("tremor_color", "blue"),
            hex_color=dt.get("hex_color"),
            gradient=dt.get("gradient"),
            bg_class=dt.get("bg_class"),
            text_class=dt.get("text_class"),
            border_class=dt.get("border_class"),
            icon=dt.get("icon"),
        )
        for dt in result.data
    ]
