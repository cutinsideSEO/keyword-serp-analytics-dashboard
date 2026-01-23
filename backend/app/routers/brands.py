"""
Brand-related API endpoints.

Provides endpoints for listing brands and managing brand-domain mappings.
Uses Supabase REST API for database operations.
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query

from app.supabase_db import get_supabase_client
from app.middleware.market_context import get_current_market_id

logger = logging.getLogger(__name__)
from app.schemas import (
    BrandDomainResponse,
    BrandDomainUpdate,
    BrandListResponse,
    BrandResponse,
    BrandWithDomains,
)

router = APIRouter(prefix="/brands", tags=["brands"])


@router.get("", response_model=BrandListResponse)
async def list_brands(
    min_keywords: int = 1,
    min_volume: int = 0,
    market_id: Optional[str] = Query(None, description="Market ID (optional, uses default from context)"),
) -> BrandListResponse:
    """
    List all brands with their keyword counts and total volume.

    Uses brand_category_names from market config to determine which categories
    represent brands (e.g., "brand" for bicycle, "insurance_company___canonical" for insurance).

    Args:
        min_keywords: Minimum keyword count filter
        min_volume: Minimum total volume filter
        market_id: Market ID (optional, defaults to context market)

    Returns:
        List of brands with statistics
    """
    try:
        logger.info(f"list_brands called with market_id={market_id}")
        effective_market_id = market_id or get_current_market_id()
        logger.info(f"effective_market_id={effective_market_id}")

        client = get_supabase_client()
        logger.info("Got Supabase client")

        # Call the database function via RPC
        result = client.rpc(
            "get_brands_list",
            {
                "p_market_id": effective_market_id,
                "p_min_keywords": min_keywords,
                "p_min_volume": min_volume,
            }
        ).execute()
        logger.info(f"RPC returned {len(result.data) if result.data else 0} brands")

        brands = [
            BrandResponse(
                brand_name=row["brand_name"],
                keyword_count=row["keyword_count"],
                total_volume=row["total_volume"] or 0,
            )
            for row in (result.data or [])
        ]

        return BrandListResponse(items=brands, total=len(brands))
    except Exception as e:
        logger.exception(f"Error in list_brands: {e}")
        raise


@router.get("/{brand_name}", response_model=BrandWithDomains)
async def get_brand(
    brand_name: str,
    market_id: Optional[str] = Query(None, description="Market ID (optional, uses default from context)"),
) -> BrandWithDomains:
    """
    Get brand details with its domain mappings.

    Args:
        brand_name: Brand name to look up
        market_id: Market ID (optional, defaults to context market)

    Returns:
        Brand details with associated domains
    """
    effective_market_id = market_id or get_current_market_id()
    client = get_supabase_client()

    # Get brand stats from brands list function
    result = client.rpc(
        "get_brands_list",
        {
            "p_market_id": effective_market_id,
            "p_min_keywords": 1,
            "p_min_volume": 0,
        }
    ).execute()

    brand_data = None
    for row in (result.data or []):
        if row["brand_name"] == brand_name:
            brand_data = row
            break

    if not brand_data:
        raise HTTPException(status_code=404, detail=f"Brand '{brand_name}' not found")

    # Get domain mappings
    domains_result = client.table("brand_domains").select(
        "id, brand_name, domain_id, is_primary, confidence, domain_type, created_at, domains(domain)"
    ).eq("market_id", effective_market_id).eq("brand_name", brand_name).order(
        "is_primary", desc=True
    ).order("confidence", desc=True).execute()

    domains = [
        BrandDomainResponse(
            id=row["id"],
            brand_name=row["brand_name"],
            domain=row["domains"]["domain"] if row.get("domains") else "unknown",
            is_primary=row["is_primary"],
            confidence=row["confidence"],
            created_at=row["created_at"],
        )
        for row in (domains_result.data or [])
    ]

    return BrandWithDomains(
        brand_name=brand_name,
        keyword_count=brand_data["keyword_count"],
        total_volume=brand_data["total_volume"] or 0,
        domains=domains,
    )


@router.put("/{brand_name}/domains", response_model=BrandWithDomains)
async def update_brand_domains(
    brand_name: str,
    update: BrandDomainUpdate,
    market_id: Optional[str] = Query(None, description="Market ID (optional, uses default from context)"),
) -> BrandWithDomains:
    """
    Update brand-domain mappings.

    Args:
        brand_name: Brand name
        update: New domain mappings
        market_id: Market ID (optional, defaults to context market)

    Returns:
        Updated brand with domains
    """
    effective_market_id = market_id or get_current_market_id()
    client = get_supabase_client()

    # Delete existing mappings for this brand/market
    client.table("brand_domains").delete().eq(
        "market_id", effective_market_id
    ).eq("brand_name", brand_name).execute()

    # Add new mappings
    for domain_data in update.domains:
        domain_str = domain_data.get("domain")
        is_primary = domain_data.get("is_primary", False)

        if not domain_str:
            continue

        # Find domain ID
        domain_result = client.table("domains").select("id").eq(
            "market_id", effective_market_id
        ).eq("domain", domain_str).limit(1).execute()

        if not domain_result.data:
            # Create domain if not exists
            new_domain = client.table("domains").insert({
                "market_id": effective_market_id,
                "domain": domain_str
            }).execute()
            domain_id = new_domain.data[0]["id"]
        else:
            domain_id = domain_result.data[0]["id"]

        # Create mapping
        client.table("brand_domains").insert({
            "market_id": effective_market_id,
            "brand_name": brand_name,
            "domain_id": domain_id,
            "is_primary": is_primary,
            "confidence": 1.0,
        }).execute()

    # Return updated brand
    return await get_brand(brand_name, market_id=effective_market_id)


@router.post("/{brand_name}/auto-map", response_model=BrandWithDomains)
async def auto_map_brand_domains(
    brand_name: str,
    use_ai: bool = True,
    market_id: Optional[str] = Query(None, description="Market ID (optional, uses default from context)"),
) -> BrandWithDomains:
    """
    Automatically map brand to its domains using AI.

    Note: This endpoint is not fully implemented with Supabase REST API.
    Please use the brand mapping script instead.

    Args:
        brand_name: Brand name
        use_ai: Whether to use AI for mapping
        market_id: Market ID (optional, defaults to context market)

    Returns:
        Brand with newly mapped domains
    """
    effective_market_id = market_id or get_current_market_id()

    # For now, just return the current brand state
    # The AI mapping should be done via the supabase_brand_mapper.py script
    raise HTTPException(
        status_code=501,
        detail="Auto-mapping via API not implemented. Use scripts/supabase_brand_mapper.py instead."
    )
