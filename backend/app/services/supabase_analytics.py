"""
Supabase Analytics Service for brand protection dashboard.

Uses Supabase RPC functions instead of SQLAlchemy for serverless compatibility.
"""

import logging
from typing import List, Optional, Tuple

from app.supabase_db import get_supabase_client
from app.middleware.market_context import get_current_market_id
from app.schemas import (
    BrandProtectionDashboard,
    BrandProtectionKPIs,
    BrandProtectionLoss,
    BrandProtectionWin,
    CategoryLossStats,
    CompetitorStats,
    ModifierGroupStats,
)

logger = logging.getLogger(__name__)


class SupabaseAnalyticsService:
    """Service for computing analytics using Supabase RPC."""

    def __init__(self, market_id: Optional[str] = None):
        """
        Initialize the analytics service.

        Args:
            market_id: Market ID (optional, uses context default if not provided)
        """
        self.client = get_supabase_client()
        self.market_id = market_id or get_current_market_id()

    async def get_brand_protection_kpis(self, brand_name: str) -> BrandProtectionKPIs:
        """
        Get brand protection KPIs using RPC.

        Args:
            brand_name: Brand to analyze

        Returns:
            BrandProtectionKPIs with all metrics
        """
        try:
            result = self.client.rpc(
                "get_brand_protection_kpis",
                {"p_market_id": self.market_id, "p_brand_name": brand_name}
            ).execute()

            if result.data:
                data = result.data
                return BrandProtectionKPIs(
                    total_branded_keywords=data.get("total_branded_keywords", 0),
                    total_branded_volume=data.get("total_branded_volume", 0),
                    keywords_winning=data.get("keywords_winning", 0),
                    keywords_losing=data.get("keywords_losing", 0),
                    volume_winning=data.get("volume_winning", 0),
                    volume_losing=data.get("volume_losing", 0),
                    win_rate_keywords=data.get("win_rate_keywords", 0),
                    win_rate_volume=data.get("win_rate_volume", 0),
                )
            return BrandProtectionKPIs()
        except Exception as e:
            logger.exception(f"Error getting brand protection KPIs: {e}")
            return BrandProtectionKPIs()

    async def get_brand_wins(
        self, brand_name: str, limit: int = 100, offset: int = 0
    ) -> Tuple[List[BrandProtectionWin], int]:
        """
        Get keywords where the brand ranks #1.

        Args:
            brand_name: Brand to analyze
            limit: Maximum results
            offset: Results offset

        Returns:
            Tuple of (wins list, total count)
        """
        try:
            result = self.client.rpc(
                "get_brand_wins",
                {
                    "p_market_id": self.market_id,
                    "p_brand_name": brand_name,
                    "p_limit": limit,
                    "p_offset": offset,
                }
            ).execute()

            if result.data:
                data = result.data
                items = data.get("items", [])
                total = data.get("total", 0)

                wins = [
                    BrandProtectionWin(
                        keyword=item.get("keyword", ""),
                        volume=item.get("volume", 0),
                        rank_absolute=item.get("rank_absolute") or 1,
                        url=item.get("url") or "",
                        tags=item.get("tags") or {},
                    )
                    for item in items
                ]
                return wins, total
            return [], 0
        except Exception as e:
            logger.exception(f"Error getting brand wins: {e}")
            return [], 0

    async def get_brand_losses(
        self, brand_name: str, limit: int = 100, offset: int = 0
    ) -> Tuple[List[BrandProtectionLoss], int]:
        """
        Get keywords where competitors beat the brand.

        Args:
            brand_name: Brand to analyze
            limit: Maximum results
            offset: Results offset

        Returns:
            Tuple of (losses list, total count)
        """
        try:
            result = self.client.rpc(
                "get_brand_losses",
                {
                    "p_market_id": self.market_id,
                    "p_brand_name": brand_name,
                    "p_limit": limit,
                    "p_offset": offset,
                }
            ).execute()

            if result.data:
                data = result.data
                items = data.get("items", [])
                total = data.get("total", 0)

                losses = [
                    BrandProtectionLoss(
                        keyword=item.get("keyword", ""),
                        volume=item.get("volume", 0),
                        winner_domain=item.get("winner_domain", ""),
                        winner_position=item.get("winner_position") or 1,
                        winner_url=item.get("winner_url") or "",
                        brand_position=item.get("brand_position"),
                        brand_url=item.get("brand_url"),
                        modifier_group=item.get("modifier_group"),
                        tags=item.get("tags") or {},
                    )
                    for item in items
                ]
                return losses, total
            return [], 0
        except Exception as e:
            logger.exception(f"Error getting brand losses: {e}")
            return [], 0

    async def get_top_competitors(
        self, brand_name: str, limit: int = 10
    ) -> List[CompetitorStats]:
        """
        Get top competitors on brand keywords.

        Args:
            brand_name: Brand to analyze
            limit: Maximum competitors to return

        Returns:
            List of competitor statistics
        """
        try:
            result = self.client.rpc(
                "get_top_competitors",
                {
                    "p_market_id": self.market_id,
                    "p_brand_name": brand_name,
                    "p_limit": limit,
                }
            ).execute()

            if result.data:
                return [
                    CompetitorStats(
                        domain=item.get("domain", ""),
                        domain_type=item.get("domain_type", "Unknown"),
                        wins_count=item.get("keywords_captured", 0),
                        wins_volume=item.get("volume_captured", 0),
                        avg_position=float(item.get("avg_position", 1) or 1),
                    )
                    for item in result.data
                ]
            return []
        except Exception as e:
            logger.exception(f"Error getting top competitors: {e}")
            return []

    async def get_losses_by_category(
        self, brand_name: str, limit: int = 20
    ) -> List[CategoryLossStats]:
        """
        Get category breakdown of brand losses.

        Args:
            brand_name: Brand to analyze
            limit: Maximum categories to return

        Returns:
            List of category loss statistics
        """
        try:
            result = self.client.rpc(
                "get_losses_by_category",
                {
                    "p_market_id": self.market_id,
                    "p_brand_name": brand_name,
                    "p_limit": limit,
                }
            ).execute()

            if result.data:
                return [
                    CategoryLossStats(
                        category=item.get("category_name", ""),
                        display_name=item.get("display_name", ""),
                        loss_count=item.get("total_keywords", 0),
                        loss_volume=item.get("total_volume", 0),
                        example_keywords=item.get("top_values", []) or [],
                    )
                    for item in result.data
                ]
            return []
        except Exception as e:
            logger.exception(f"Error getting losses by category: {e}")
            return []

    async def get_modifier_group_stats(
        self, brand_name: str
    ) -> List[ModifierGroupStats]:
        """
        Get modifier group statistics for brand keywords.

        Args:
            brand_name: Brand to analyze

        Returns:
            List of modifier group statistics
        """
        try:
            result = self.client.rpc(
                "get_modifier_group_stats",
                {
                    "p_market_id": self.market_id,
                    "p_brand_name": brand_name,
                }
            ).execute()

            if result.data:
                return [
                    ModifierGroupStats(
                        modifier_group=item.get("modifier_group", ""),
                        total_keywords=item.get("total_keywords", 0),
                        total_volume=item.get("total_volume", 0),
                        keywords_winning=item.get("keywords_winning", 0),
                        keywords_losing=item.get("keywords_losing", 0),
                        volume_winning=item.get("volume_winning", 0),
                        volume_losing=item.get("volume_losing", 0),
                        win_rate=item.get("win_rate", 0),
                        avg_position=item.get("avg_position"),
                        top_tags=item.get("top_tags", []),
                    )
                    for item in result.data
                ]
            return []
        except Exception as e:
            logger.exception(f"Error getting modifier group stats: {e}")
            return []

    async def get_brand_protection_dashboard(
        self, brand_name: str
    ) -> BrandProtectionDashboard:
        """
        Get complete brand protection dashboard data.

        Args:
            brand_name: Brand to analyze

        Returns:
            Complete dashboard data
        """
        kpis = await self.get_brand_protection_kpis(brand_name)
        wins, _ = await self.get_brand_wins(brand_name, limit=100)
        losses, _ = await self.get_brand_losses(brand_name, limit=100)
        competitors = await self.get_top_competitors(brand_name)

        return BrandProtectionDashboard(
            brand_name=brand_name,
            kpis=kpis,
            wins=wins,
            losses=losses,
            top_competitors=competitors,
        )
