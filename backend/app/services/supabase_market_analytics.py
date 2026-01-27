"""
Supabase Market Analytics Service for market overview dashboard.

Uses Supabase RPC functions instead of SQLAlchemy for serverless compatibility.
"""

import asyncio
import logging
from typing import List, Optional

from app.supabase_db import get_supabase_client
from app.utils.rpc_helpers import unwrap_rpc_single, unwrap_rpc_list
from app.middleware.market_context import get_current_market_id
from app.schemas import (
    ShareOfSearchItem,
    DomainVisibilityItem,
    MarketProtectionKPIs,
    MarketLossDistribution,
    BrandLossItem,
    CategoryMarketStats,
    CategoryBreakdown,
    ModifierGroupMarketStats,
    ModifierGroupBreakdown,
    MarketOverviewDashboard,
)

logger = logging.getLogger(__name__)


class SupabaseMarketAnalyticsService:
    """Service for computing market-wide analytics using Supabase RPC."""

    def __init__(self, market_id: Optional[str] = None):
        """
        Initialize the market analytics service.

        Args:
            market_id: Market ID (optional, uses context default if not provided)
        """
        self.client = get_supabase_client()
        self.market_id = market_id or get_current_market_id()
        self._domain_types_cache = None

    async def _rpc(self, function_name: str, params: dict):
        """Execute an RPC call in a thread for true async parallelism.

        The Supabase Python client is synchronous, so wrapping in
        asyncio.to_thread allows asyncio.gather to parallelize calls.
        """
        return await asyncio.to_thread(
            lambda: self.client.rpc(function_name, params).execute()
        )

    async def get_domain_type_names(self) -> dict:
        """Get domain type names for this market."""
        if self._domain_types_cache is None:
            try:
                result = await self._rpc(
                    "get_domain_type_names",
                    {"p_market_id": self.market_id}
                )
                data = unwrap_rpc_single(result.data, "get_domain_type_names")
                self._domain_types_cache = data if data else {
                    "all_types": [],
                    "brand_type": "Brand",
                    "non_brand_types": []
                }
            except Exception as e:
                logger.exception(f"Error getting domain type names: {e}")
                self._domain_types_cache = {
                    "all_types": [],
                    "brand_type": "Brand",
                    "non_brand_types": []
                }
        return self._domain_types_cache

    async def get_non_brand_type_names(self) -> List[str]:
        """Get names of non-brand domain types for this market."""
        types = await self.get_domain_type_names()
        return types.get("non_brand_types", []) or []

    async def get_brand_type_name(self) -> str:
        """Get the brand domain type name for this market."""
        types = await self.get_domain_type_names()
        return types.get("brand_type", "Brand") or "Brand"

    async def get_share_of_search(self, limit: int = 20) -> List[ShareOfSearchItem]:
        """
        Get share of search for brands.

        Args:
            limit: Maximum brands to return

        Returns:
            List of ShareOfSearchItem ordered by total_volume descending
        """
        try:
            result = await self._rpc(
                "get_share_of_search",
                {"p_market_id": self.market_id, "p_limit": limit}
            )

            items = unwrap_rpc_list(result.data)
            return [
                ShareOfSearchItem(
                    brand_name=item.get("brand_name", ""),
                    total_volume=item.get("total_volume", 0),
                    keyword_count=item.get("keyword_count", 0),
                    share_percentage=item.get("share_percentage", 0),
                )
                for item in items
            ]
        except Exception as e:
            logger.exception(f"Error getting share of search: {e}")
            return []

    async def get_domain_visibility_by_type(
        self, domain_type: str, limit: int = 10
    ) -> List[DomainVisibilityItem]:
        """
        Get top domains by visibility score for a specific domain type.

        Args:
            domain_type: Domain type to filter by
            limit: Maximum domains to return

        Returns:
            List of DomainVisibilityItem ordered by visibility_score descending
        """
        try:
            result = await self._rpc(
                "get_domain_visibility",
                {
                    "p_market_id": self.market_id,
                    "p_domain_type": domain_type,
                    "p_limit": limit,
                }
            )

            items = unwrap_rpc_list(result.data)
            return [
                DomainVisibilityItem(
                    domain=item.get("domain", ""),
                    domain_type=item.get("domain_type", ""),
                    visibility_score=item.get("visibility_score", 0),
                    ranking_count=item.get("ranking_count", 0),
                    total_volume=item.get("total_volume", 0),
                    win_count=item.get("win_count", 0),
                    avg_position=item.get("avg_position", 0),
                    top_brands=item.get("top_brands", []) or [],
                )
                for item in items
            ]
        except Exception as e:
            logger.exception(f"Error getting domain visibility: {e}")
            return []

    async def get_market_protection_kpis(self) -> MarketProtectionKPIs:
        """
        Get market-wide brand protection metrics.

        Returns:
            MarketProtectionKPIs with aggregate metrics
        """
        try:
            result = await self._rpc(
                "get_market_protection_kpis",
                {"p_market_id": self.market_id}
            )

            if result.data:
                data = result.data
                # Handle both list and dict responses from RPC
                if isinstance(data, list) and len(data) > 0:
                    data = data[0]
                # Handle function name wrapper if present
                if isinstance(data, dict) and "get_market_protection_kpis" in data:
                    data = data["get_market_protection_kpis"]

                if isinstance(data, dict):
                    return MarketProtectionKPIs(
                        total_market_keywords=data.get("total_market_keywords", 0),
                        total_market_volume=data.get("total_market_volume", 0),
                        total_brands=data.get("total_brands", 0),
                        total_branded_keywords=data.get("total_branded_keywords", 0),
                        total_branded_volume=data.get("total_branded_volume", 0),
                        total_keywords_winning=data.get("total_keywords_winning", 0),
                        total_keywords_losing=data.get("total_keywords_losing", 0),
                        total_volume_winning=data.get("total_volume_winning", 0),
                        total_volume_losing=data.get("total_volume_losing", 0),
                        average_win_rate=data.get("average_win_rate", 0),
                        median_win_rate=data.get("median_win_rate", 0),
                        average_volume_win_rate=data.get("average_volume_win_rate", 0),
                    )
                logger.warning(f"Unexpected data type for market protection KPIs: {type(data)}")
            return MarketProtectionKPIs()
        except Exception as e:
            logger.exception(f"Error getting market protection KPIs: {e}")
            return MarketProtectionKPIs()

    async def get_market_loss_distribution(self) -> List[MarketLossDistribution]:
        """
        Get loss distribution by domain type across all brands.

        Returns:
            List of MarketLossDistribution ordered by loss_volume descending
        """
        try:
            result = await self._rpc(
                "get_market_loss_distribution",
                {"p_market_id": self.market_id}
            )

            items = unwrap_rpc_list(result.data)
            return [
                MarketLossDistribution(
                    domain_type=item.get("domain_type", ""),
                    loss_count=item.get("loss_count", 0),
                    loss_volume=item.get("loss_volume", 0),
                    percentage_of_losses=item.get("percentage_of_losses", 0),
                    top_domains=item.get("top_domains", []) or [],
                )
                for item in items
            ]
        except Exception as e:
            logger.exception(f"Error getting market loss distribution: {e}")
            return []

    async def get_biggest_losers(self, limit: int = 20) -> List[BrandLossItem]:
        """
        Get brands with the worst brand protection.

        Args:
            limit: Maximum brands to return

        Returns:
            List of BrandLossItem ordered by volume_lost descending
        """
        try:
            result = await self._rpc(
                "get_biggest_losers",
                {"p_market_id": self.market_id, "p_limit": limit}
            )

            items = unwrap_rpc_list(result.data)
            return [
                BrandLossItem(
                    brand_name=item.get("brand_name", ""),
                    total_keywords=item.get("total_keywords", 0),
                    keywords_lost=item.get("keywords_lost", 0),
                    volume_lost=item.get("volume_lost", 0),
                    win_rate=item.get("win_rate", 0),
                    top_loss_modifier_groups=item.get("top_loss_modifier_groups", []) or [],
                )
                for item in items
            ]
        except Exception as e:
            logger.exception(f"Error getting biggest losers: {e}")
            return []

    async def get_category_market_stats(self) -> List[CategoryMarketStats]:
        """
        Get market statistics for each category.

        Returns:
            List of CategoryMarketStats ordered by total_volume descending
        """
        try:
            result = await self._rpc(
                "get_category_market_stats",
                {"p_market_id": self.market_id}
            )

            items = unwrap_rpc_list(result.data)
            return [
                CategoryMarketStats(
                    category_name=item.get("category_name", ""),
                    display_name=item.get("display_name", ""),
                    total_keywords=item.get("total_keywords", 0),
                    total_volume=item.get("total_volume", 0),
                    unique_values=item.get("unique_values", 0),
                    top_values_preview=item.get("top_values_preview") or [],
                )
                for item in items
            ]
        except Exception as e:
            logger.exception(f"Error getting category market stats: {e}")
            return []

    async def get_category_breakdown(
        self, category_name: str, limit: int = 10
    ) -> CategoryBreakdown:
        """
        Get detailed breakdown for a specific category.

        Args:
            category_name: Category name
            limit: Maximum values to return

        Returns:
            CategoryBreakdown with full details
        """
        try:
            logger.info(f"Calling get_category_breakdown with market_id={self.market_id}, category_name={category_name}")
            result = await self._rpc(
                "get_category_breakdown",
                {
                    "p_market_id": self.market_id,
                    "p_category_name": category_name,
                    "p_limit": limit,
                }
            )
            logger.info(f"RPC result type: {type(result.data)}, has data: {bool(result.data)}")

            if result.data:
                data = result.data
                # Handle both list and dict responses from RPC
                if isinstance(data, list) and len(data) > 0:
                    data = data[0]
                # Handle function name wrapper if present
                if isinstance(data, dict) and "get_category_breakdown" in data:
                    data = data["get_category_breakdown"]
                logger.info(f"Raw data keys: {list(data.keys()) if isinstance(data, dict) else 'not dict'}")
                # RPC returns JSON directly as dict
                if isinstance(data, dict):
                    return CategoryBreakdown(
                        category_name=data.get("category_name", category_name),
                        display_name=data.get("display_name", category_name),
                        total_keywords=data.get("total_keywords", 0),
                        total_volume=data.get("total_volume", 0),
                        top_values=data.get("top_values") or [],
                        top_players_by_type=data.get("top_players_by_type") or {},
                    )
                logger.warning(f"Unexpected data type: {type(data)}")
            return CategoryBreakdown(
                category_name=category_name,
                display_name=category_name,
                total_keywords=0,
                total_volume=0,
                top_values=[],
                top_players_by_type={},
            )
        except Exception as e:
            logger.exception(f"Error getting category breakdown: {e}")
            return CategoryBreakdown(
                category_name=category_name,
                display_name=category_name,
                total_keywords=0,
                total_volume=0,
                top_values=[],
                top_players_by_type={},
            )

    async def get_modifier_group_market_stats(self) -> List[ModifierGroupMarketStats]:
        """
        Get market statistics for each modifier group.

        Returns:
            List of ModifierGroupMarketStats ordered by total_volume descending
        """
        try:
            result = await self._rpc(
                "get_modifier_group_market_stats",
                {"p_market_id": self.market_id}
            )

            items = unwrap_rpc_list(result.data)
            return [
                ModifierGroupMarketStats(
                    modifier_group=item.get("modifier_group", ""),
                    total_keywords=item.get("total_keywords", 0),
                    total_volume=item.get("total_volume", 0),
                    top_tags_preview=item.get("top_tags_preview") or [],
                )
                for item in items
            ]
        except Exception as e:
            logger.exception(f"Error getting modifier group market stats: {e}")
            return []

    async def get_modifier_group_breakdown(
        self, modifier_group: str, limit: int = 10
    ) -> ModifierGroupBreakdown:
        """
        Get detailed breakdown for a specific modifier group.

        Args:
            modifier_group: Modifier group value
            limit: Maximum items to return

        Returns:
            ModifierGroupBreakdown with full details
        """
        try:
            result = await self._rpc(
                "get_modifier_group_breakdown",
                {
                    "p_market_id": self.market_id,
                    "p_modifier_group": modifier_group,
                    "p_limit": limit,
                }
            )

            if result.data:
                data = result.data
                # Handle both list and dict responses from RPC
                if isinstance(data, list) and len(data) > 0:
                    data = data[0]
                # Handle function name wrapper if present
                if isinstance(data, dict) and "get_modifier_group_breakdown" in data:
                    data = data["get_modifier_group_breakdown"]
                # RPC returns JSON directly as dict
                if isinstance(data, dict):
                    return ModifierGroupBreakdown(
                        modifier_group=data.get("modifier_group", modifier_group),
                        total_keywords=data.get("total_keywords", 0),
                        total_volume=data.get("total_volume", 0),
                        top_tags=data.get("top_tags") or [],
                        top_players_by_type=data.get("top_players_by_type") or {},
                        example_keywords=data.get("example_keywords") or [],
                    )
                logger.warning(f"Unexpected data type for modifier group breakdown: {type(data)}")
            return ModifierGroupBreakdown(
                modifier_group=modifier_group,
                total_keywords=0,
                total_volume=0,
                top_tags=[],
                top_players_by_type={},
                example_keywords=[],
            )
        except Exception as e:
            logger.exception(f"Error getting modifier group breakdown: {e}")
            return ModifierGroupBreakdown(
                modifier_group=modifier_group,
                total_keywords=0,
                total_volume=0,
                top_tags=[],
                top_players_by_type={},
                example_keywords=[],
            )

    async def get_full_dashboard(self) -> MarketOverviewDashboard:
        """
        Get complete market overview dashboard data in a single call.

        Returns:
            MarketOverviewDashboard with all data
        """
        # Phase 1: Get domain types (fast, needed for visibility calls)
        non_brand_types = await self.get_non_brand_type_names()

        retailer_type = non_brand_types[0] if non_brand_types else None
        voice_types = non_brand_types[1:] if len(non_brand_types) > 1 else []

        # Phase 2: Run all calls in parallel (RPC calls use asyncio.to_thread)
        visibility_coros = []
        if retailer_type:
            visibility_coros.append(self.get_domain_visibility_by_type(retailer_type, limit=10))
        for vt in voice_types:
            visibility_coros.append(self.get_domain_visibility_by_type(vt, limit=10))

        all_coros = [
            self.get_share_of_search(limit=20),
            *visibility_coros,
            self.get_market_protection_kpis(),
            self.get_market_loss_distribution(),
            self.get_biggest_losers(limit=20),
            self.get_category_market_stats(),
            self.get_modifier_group_market_stats(),
        ]

        results = await asyncio.gather(*all_coros, return_exceptions=True)

        # Unpack results (order matches all_coros above)
        idx = 0
        share_of_search = results[idx] if not isinstance(results[idx], Exception) else []
        idx += 1

        top_retailers = []
        if retailer_type:
            top_retailers = results[idx] if not isinstance(results[idx], Exception) else []
            idx += 1

        influential_voices = []
        for _ in voice_types:
            voices = results[idx] if not isinstance(results[idx], Exception) else []
            influential_voices.extend(voices)
            idx += 1
        influential_voices.sort(key=lambda x: x.visibility_score, reverse=True)
        influential_voices = influential_voices[:10]

        protection_kpis = results[idx] if not isinstance(results[idx], Exception) else MarketProtectionKPIs()
        idx += 1
        loss_distribution = results[idx] if not isinstance(results[idx], Exception) else []
        idx += 1
        biggest_losers = results[idx] if not isinstance(results[idx], Exception) else []
        idx += 1
        category_stats = results[idx] if not isinstance(results[idx], Exception) else []
        idx += 1
        modifier_group_stats = results[idx] if not isinstance(results[idx], Exception) else []

        # Log any errors from parallel calls
        for i, r in enumerate(results):
            if isinstance(r, Exception):
                logger.error(f"Market overview parallel call {i} failed: {r}")

        return MarketOverviewDashboard(
            share_of_search=share_of_search,
            top_retailers=top_retailers,
            influential_voices=influential_voices,
            protection_kpis=protection_kpis,
            loss_distribution=loss_distribution,
            biggest_losers=biggest_losers,
            category_stats=category_stats,
            modifier_group_stats=modifier_group_stats,
        )
