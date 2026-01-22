"""
Markets router for multi-market support.

Provides endpoints for listing markets and retrieving market configurations.
"""

import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Market, MarketDomainType
from app.schemas import (
    MarketConfigResponse,
    MarketDomainTypeResponse,
    MarketSummary,
    MarketsListResponse,
)

router = APIRouter(prefix="/markets", tags=["markets"])


@router.get("", response_model=MarketsListResponse)
async def list_markets(db: AsyncSession = Depends(get_db)) -> MarketsListResponse:
    """
    List all available markets.

    Returns a list of active markets with basic info for the market selector.
    """
    result = await db.execute(
        select(Market)
        .where(Market.is_active == True)
        .order_by(Market.name)
    )
    markets = result.scalars().all()

    market_summaries = [
        MarketSummary(
            id=m.id,
            name=m.name,
            language=m.language,
            text_direction=m.text_direction,
            is_active=m.is_active,
        )
        for m in markets
    ]

    return MarketsListResponse(
        markets=market_summaries,
        total=len(market_summaries),
    )


@router.get("/{market_id}/config", response_model=MarketConfigResponse)
async def get_market_config(
    market_id: str,
    db: AsyncSession = Depends(get_db),
) -> MarketConfigResponse:
    """
    Get full configuration for a specific market.

    Returns market details including domain type configurations for styling.
    """
    result = await db.execute(
        select(Market)
        .options(selectinload(Market.domain_types))
        .where(Market.id == market_id)
    )
    market = result.scalar_one_or_none()

    if not market:
        raise HTTPException(status_code=404, detail=f"Market '{market_id}' not found")

    # Sort domain types by sort_order
    sorted_domain_types = sorted(market.domain_types, key=lambda dt: dt.sort_order)

    domain_type_responses = [
        MarketDomainTypeResponse(
            type_id=dt.type_id,
            display_name=dt.display_name,
            is_brand_type=dt.is_brand_type,
            tremor_color=dt.tremor_color,
            hex_color=dt.hex_color,
            gradient=dt.gradient,
            bg_class=dt.bg_class,
            text_class=dt.text_class,
            border_class=dt.border_class,
            icon=dt.icon,
        )
        for dt in sorted_domain_types
    ]

    return MarketConfigResponse(
        id=market.id,
        name=market.name,
        industry_context=market.industry_context,
        language=market.language,
        text_direction=market.text_direction,
        domain_types=domain_type_responses,
    )


@router.get("/{market_id}/domain-types", response_model=List[MarketDomainTypeResponse])
async def get_market_domain_types(
    market_id: str,
    db: AsyncSession = Depends(get_db),
) -> List[MarketDomainTypeResponse]:
    """
    Get domain types for a specific market.

    Returns just the domain type configurations, useful for styling components.
    """
    result = await db.execute(
        select(MarketDomainType)
        .where(MarketDomainType.market_id == market_id)
        .order_by(MarketDomainType.sort_order)
    )
    domain_types = result.scalars().all()

    if not domain_types:
        raise HTTPException(
            status_code=404,
            detail=f"No domain types found for market '{market_id}'"
        )

    return [
        MarketDomainTypeResponse(
            type_id=dt.type_id,
            display_name=dt.display_name,
            is_brand_type=dt.is_brand_type,
            tremor_color=dt.tremor_color,
            hex_color=dt.hex_color,
            gradient=dt.gradient,
            bg_class=dt.bg_class,
            text_class=dt.text_class,
            border_class=dt.border_class,
            icon=dt.icon,
        )
        for dt in domain_types
    ]
