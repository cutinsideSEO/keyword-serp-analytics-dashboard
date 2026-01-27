"""
Supabase Analytics Service for brand protection dashboard.

Uses Supabase RPC functions instead of SQLAlchemy for serverless compatibility.
"""

import logging
from typing import List, Optional, Tuple

from app.supabase_db import get_supabase_client
from app.utils.rpc_helpers import unwrap_rpc_single, unwrap_rpc_list
from app.middleware.market_context import get_current_market_id
from app.schemas import (
    BrandProtectionDashboard,
    BrandProtectionKPIs,
    BrandProtectionLoss,
    BrandProtectionSummary,
    BrandProtectionWin,
    CategoryCompetitor,
    CategoryLossStats,
    CategoryOpportunityDashboard,
    CategoryOpportunityKPIs,
    CategoryProtectionBreakdown,
    CategoryValueProtectionStats,
    CompetitorBrandedDashboard,
    CompetitorStats,
    DomainTypeLossDetail,
    ExampleLoserKeyword,
    ExampleWinnerKeyword,
    HomeDashboard,
    HomeDashboardKPIs,
    ModifierGroupOpportunity,
    ModifierGroupOpportunityBreakdown,
    ModifierGroupProtectionBreakdown,
    ModifierGroupStats,
    OpportunityCompetitor,
    OpportunityCategoryValue,
    OpportunityKeywordDetail,
    TagProtectionStats,
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

            items = unwrap_rpc_list(result.data)
            return [
                CompetitorStats(
                    domain=item.get("domain", ""),
                    domain_type=item.get("domain_type", "Unknown"),
                    wins_count=item.get("keywords_captured", 0),
                    wins_volume=item.get("volume_captured", 0),
                    avg_position=float(item.get("avg_position", 1) or 1),
                )
                for item in items
            ]
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

            items = unwrap_rpc_list(result.data)
            return [
                CategoryLossStats(
                    category=item.get("category_name", ""),
                    display_name=item.get("display_name", ""),
                    loss_count=item.get("total_keywords", 0),
                    loss_volume=item.get("total_volume", 0),
                    example_keywords=item.get("top_values", []) or [],
                )
                for item in items
            ]
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

            items = unwrap_rpc_list(result.data)
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
                )
                for item in items
            ]
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
        losses_by_category = await self.get_losses_by_category(brand_name)

        # Fetch brand domains
        brand_domains = []
        try:
            result = self.client.table("brand_domains")\
                .select("domain:domains(domain)")\
                .eq("market_id", self.market_id)\
                .eq("brand_name", brand_name)\
                .execute()
            if result.data:
                brand_domains = [
                    item["domain"]["domain"]
                    for item in result.data
                    if item.get("domain")
                ]
        except Exception as e:
            logger.warning(f"Error fetching brand domains: {e}")

        return BrandProtectionDashboard(
            brand_name=brand_name,
            brand_domains=brand_domains,
            kpis=kpis,
            wins=wins,
            losses=losses,
            top_competitors=competitors,
            losses_by_category=losses_by_category,
        )

    async def get_category_opportunities(
        self, brand_name: str
    ) -> CategoryOpportunityDashboard:
        """
        Get category opportunities for non-branded keywords.

        Args:
            brand_name: Brand to analyze

        Returns:
            CategoryOpportunityDashboard with KPIs and modifier groups
        """
        try:
            result = self.client.rpc(
                "get_category_opportunities",
                {"p_market_id": self.market_id, "p_brand_name": brand_name}
            ).execute()

            data = unwrap_rpc_single(result.data, "get_category_opportunities")
            if data:
                kpis = CategoryOpportunityKPIs(
                    total_nonbranded_keywords=data.get("total_nonbranded_keywords", 0),
                    total_nonbranded_volume=data.get("total_nonbranded_volume", 0),
                    keywords_captured=data.get("keywords_captured", 0),
                    volume_captured=data.get("volume_captured", 0),
                    keywords_uncaptured=data.get("keywords_uncaptured", 0),
                    volume_uncaptured=data.get("volume_uncaptured", 0),
                    overall_capture_rate=data.get("overall_capture_rate", 0),
                    volume_capture_rate=data.get("volume_capture_rate", 0),
                    biggest_opportunity_group=data.get("biggest_opportunity_group"),
                    biggest_opportunity_volume=data.get("biggest_opportunity_volume", 0),
                )
                modifier_groups = [
                    ModifierGroupOpportunity(
                        modifier_group=mg.get("modifier_group", ""),
                        total_keywords=mg.get("total_keywords", 0),
                        total_volume=mg.get("total_volume", 0),
                        keywords_captured=mg.get("keywords_captured", 0),
                        volume_captured=mg.get("volume_captured", 0),
                        keywords_uncaptured=mg.get("keywords_uncaptured", 0),
                        volume_uncaptured=mg.get("volume_uncaptured", 0),
                        capture_rate=mg.get("capture_rate", 0),
                        avg_brand_position=mg.get("avg_brand_position"),
                        top_competitors=[
                            OpportunityCompetitor(
                                domain=c.get("domain", ""),
                                domain_type=c.get("domain_type"),
                                wins_count=c.get("wins_count", 0),
                                wins_volume=c.get("volume_captured", 0),
                            )
                            for c in mg.get("top_competitors", []) or []
                        ],
                        top_tags=mg.get("top_tags") or {},
                        example_keywords=mg.get("example_keywords") or [],
                    )
                    for mg in data.get("modifier_groups", []) or []
                ]
                return CategoryOpportunityDashboard(
                    brand_name=brand_name,
                    brand_domains=data.get("brand_domains") or [],
                    kpis=kpis,
                    modifier_groups=modifier_groups,
                )
            return CategoryOpportunityDashboard(
                brand_name=brand_name,
                brand_domains=[],
                kpis=CategoryOpportunityKPIs(),
                modifier_groups=[],
            )
        except Exception as e:
            logger.exception(f"Error getting category opportunities: {e}")
            return CategoryOpportunityDashboard(
                brand_name=brand_name,
                brand_domains=[],
                kpis=CategoryOpportunityKPIs(),
                modifier_groups=[],
            )

    async def get_competitor_branded_opportunities(
        self, brand_name: str
    ) -> CompetitorBrandedDashboard:
        """
        Get opportunities on competitor-branded keywords.

        Args:
            brand_name: Brand to analyze

        Returns:
            CompetitorBrandedDashboard
        """
        try:
            result = self.client.rpc(
                "get_competitor_branded_opportunities",
                {"p_market_id": self.market_id, "p_brand_name": brand_name}
            ).execute()

            data = unwrap_rpc_single(result.data, "get_competitor_branded_opportunities")
            if data:
                kpis = CategoryOpportunityKPIs(
                    total_nonbranded_keywords=data.get("total_competitor_keywords", 0),
                    total_nonbranded_volume=data.get("total_competitor_volume", 0),
                    keywords_captured=data.get("keywords_captured", 0),
                    volume_captured=data.get("volume_captured", 0),
                    keywords_uncaptured=data.get("keywords_uncaptured", 0),
                    volume_uncaptured=data.get("volume_uncaptured", 0),
                    overall_capture_rate=data.get("overall_capture_rate", 0),
                    volume_capture_rate=data.get("volume_capture_rate", 0),
                    biggest_opportunity_group=data.get("biggest_opportunity_group"),
                    biggest_opportunity_volume=data.get("biggest_opportunity_volume", 0),
                )
                modifier_groups = [
                    ModifierGroupOpportunity(
                        modifier_group=mg.get("modifier_group", ""),
                        total_keywords=mg.get("total_keywords", 0),
                        total_volume=mg.get("total_volume", 0),
                        keywords_captured=mg.get("keywords_captured", 0),
                        volume_captured=mg.get("volume_captured", 0),
                        keywords_uncaptured=mg.get("keywords_uncaptured", 0),
                        volume_uncaptured=mg.get("volume_uncaptured", 0),
                        capture_rate=mg.get("capture_rate", 0),
                        avg_brand_position=mg.get("avg_brand_position"),
                        top_competitors=[
                            OpportunityCompetitor(
                                domain=c.get("domain", ""),
                                domain_type=c.get("domain_type"),
                                wins_count=c.get("wins_count", 0),
                                wins_volume=c.get("volume_captured", 0),
                            )
                            for c in mg.get("top_competitors", []) or []
                        ],
                        top_tags=mg.get("top_tags") or {},
                        example_keywords=mg.get("example_keywords") or [],
                    )
                    for mg in data.get("modifier_groups", []) or []
                ]
                return CompetitorBrandedDashboard(
                    brand_name=brand_name,
                    brand_domains=data.get("brand_domains") or [],
                    competitor_brands=data.get("competitor_brands") or [],
                    kpis=kpis,
                    modifier_groups=modifier_groups,
                )
            return CompetitorBrandedDashboard(
                brand_name=brand_name,
                brand_domains=[],
                competitor_brands=[],
                kpis=CategoryOpportunityKPIs(),
                modifier_groups=[],
            )
        except Exception as e:
            logger.exception(f"Error getting competitor branded opportunities: {e}")
            return CompetitorBrandedDashboard(
                brand_name=brand_name,
                brand_domains=[],
                competitor_brands=[],
                kpis=CategoryOpportunityKPIs(),
                modifier_groups=[],
            )

    async def get_modifier_group_opportunity_breakdown(
        self, brand_name: str, modifier_group: str, keyword_type: str
    ) -> ModifierGroupOpportunityBreakdown:
        """
        Get detailed breakdown for a modifier group opportunity.

        Args:
            brand_name: Brand to analyze
            modifier_group: Modifier group value
            keyword_type: nonbranded or competitor_branded

        Returns:
            ModifierGroupOpportunityBreakdown
        """
        try:
            result = self.client.rpc(
                "get_modifier_group_opportunity_breakdown",
                {
                    "p_market_id": self.market_id,
                    "p_brand_name": brand_name,
                    "p_modifier_group": modifier_group,
                    "p_keyword_type": keyword_type,
                }
            ).execute()

            data = unwrap_rpc_single(result.data, "get_modifier_group_opportunity_breakdown")
            if data:
                top_values = [
                    OpportunityCategoryValue(
                        category_name=v.get("category_name", ""),
                        value=v.get("value", ""),
                        total_keywords=v.get("total_keywords", 0),
                        total_volume=v.get("total_volume", 0),
                        keywords_captured=v.get("keywords_captured", 0),
                        volume_captured=v.get("volume_captured", 0),
                        capture_rate=v.get("capture_rate", 0),
                        top_keywords=[
                            OpportunityKeywordDetail(
                                keyword=kw.get("keyword", ""),
                                volume=kw.get("volume", 0),
                                winner_domain=kw.get("winner_domain"),
                                winner_position=kw.get("winner_position"),
                                brand_position=kw.get("brand_position"),
                                winner_domain_type=kw.get("winner_domain_type"),
                            )
                            for kw in v.get("top_keywords", []) or []
                        ],
                    )
                    for v in data.get("top_values", []) or []
                ]
                competitors_by_type = {}
                for dtype, comps in (data.get("competitors_by_type") or {}).items():
                    competitors_by_type[dtype] = [
                        OpportunityCompetitor(
                            domain=c.get("domain", ""),
                            domain_type=c.get("domain_type"),
                            wins_count=c.get("wins_count", 0),
                            wins_volume=c.get("volume_captured", 0),
                        )
                        for c in comps or []
                    ]
                example_keywords = [
                    OpportunityKeywordDetail(
                        keyword=kw.get("keyword", ""),
                        volume=kw.get("volume", 0),
                        winner_domain=kw.get("winner_domain"),
                        winner_position=kw.get("winner_position"),
                        brand_position=kw.get("brand_position"),
                        winner_domain_type=kw.get("winner_domain_type"),
                    )
                    for kw in data.get("example_keywords", []) or []
                ]
                return ModifierGroupOpportunityBreakdown(
                    modifier_group=modifier_group,
                    total_keywords=data.get("total_keywords", 0),
                    total_volume=data.get("total_volume", 0),
                    keywords_captured=data.get("keywords_captured", 0),
                    volume_captured=data.get("volume_captured", 0),
                    capture_rate=data.get("capture_rate", 0),
                    avg_brand_position=data.get("avg_brand_position"),
                    top_values=top_values,
                    competitors_by_type=competitors_by_type,
                    example_keywords=example_keywords,
                )
            return ModifierGroupOpportunityBreakdown(
                modifier_group=modifier_group,
                total_keywords=0,
                total_volume=0,
                keywords_captured=0,
                volume_captured=0,
                capture_rate=0,
                avg_brand_position=None,
                top_values=[],
                competitors_by_type={},
                example_keywords=[],
            )
        except Exception as e:
            logger.exception(f"Error getting modifier group opportunity breakdown: {e}")
            return ModifierGroupOpportunityBreakdown(
                modifier_group=modifier_group,
                total_keywords=0,
                total_volume=0,
                keywords_captured=0,
                volume_captured=0,
                capture_rate=0,
                avg_brand_position=None,
                top_values=[],
                competitors_by_type={},
                example_keywords=[],
            )

    async def get_category_protection_breakdown(
        self, brand_name: str, category_name: str, value_limit: int = 10
    ) -> CategoryProtectionBreakdown:
        """
        Get detailed category breakdown for brand protection.

        Args:
            brand_name: Brand to analyze
            category_name: Category to break down
            value_limit: Max values to return

        Returns:
            CategoryProtectionBreakdown with detailed stats
        """
        try:
            result = self.client.rpc(
                "get_category_protection_breakdown",
                {
                    "p_market_id": self.market_id,
                    "p_brand_name": brand_name,
                    "p_category_name": category_name,
                    "p_limit": value_limit,
                }
            ).execute()

            data = unwrap_rpc_single(result.data, "get_category_protection_breakdown")
            if data:
                top_values = [
                    CategoryValueProtectionStats(
                        value=v.get("value", ""),
                        total_keywords=v.get("total_keywords", 0),
                        total_volume=v.get("total_volume", 0),
                        keywords_winning=v.get("keywords_winning", 0),
                        keywords_losing=v.get("keywords_losing", 0),
                        volume_winning=v.get("volume_winning", 0),
                        volume_losing=v.get("volume_losing", 0),
                        win_rate=v.get("win_rate", 0),
                        avg_brand_position=v.get("avg_brand_position"),
                        example_winners=[
                            ExampleWinnerKeyword(**w) for w in v.get("example_winners") or []
                        ],
                        example_losers=[
                            ExampleLoserKeyword(**l) for l in v.get("example_losers") or []
                        ],
                    )
                    for v in data.get("top_values") or []
                ]
                competitors_by_type = {}
                for dtype, comps in (data.get("competitors_by_type") or {}).items():
                    competitors_by_type[dtype] = [
                        CategoryCompetitor(
                            domain=c.get("domain", ""),
                            domain_type=c.get("domain_type", dtype),
                            wins_count=c.get("wins_count", 0),
                            wins_volume=c.get("wins_volume", 0),
                            avg_position=c.get("avg_position", 0),
                        )
                        for c in comps or []
                    ]
                loss_distribution = [
                    DomainTypeLossDetail(
                        domain_type=d.get("domain_type", ""),
                        loss_count=d.get("loss_count", 0),
                        loss_volume=d.get("loss_volume", 0),
                        percentage=d.get("percentage", 0),
                    )
                    for d in data.get("loss_distribution_by_type") or []
                ]
                return CategoryProtectionBreakdown(
                    category_name=data.get("category_name", category_name),
                    display_name=data.get("display_name", category_name),
                    total_keywords=data.get("total_keywords", 0),
                    total_volume=data.get("total_volume", 0),
                    keywords_winning=data.get("keywords_winning", 0),
                    keywords_losing=data.get("keywords_losing", 0),
                    volume_winning=data.get("volume_winning", 0),
                    volume_losing=data.get("volume_losing", 0),
                    win_rate=data.get("win_rate", 0),
                    avg_brand_position=data.get("avg_brand_position"),
                    top_values=top_values,
                    competitors_by_type=competitors_by_type,
                    loss_distribution_by_type=loss_distribution,
                )
            return CategoryProtectionBreakdown(
                category_name=category_name,
                display_name=category_name,
            )
        except Exception as e:
            logger.exception(f"Error getting category protection breakdown: {e}")
            return CategoryProtectionBreakdown(
                category_name=category_name,
                display_name=category_name,
            )

    async def get_modifier_group_protection_breakdown(
        self, brand_name: str, modifier_group: str, limit: int = 10
    ) -> ModifierGroupProtectionBreakdown:
        """
        Get detailed modifier group breakdown for brand protection.

        Args:
            brand_name: Brand to analyze
            modifier_group: Modifier group to break down
            limit: Max items to return

        Returns:
            ModifierGroupProtectionBreakdown with detailed stats
        """
        try:
            result = self.client.rpc(
                "get_modifier_group_protection_breakdown",
                {
                    "p_market_id": self.market_id,
                    "p_brand_name": brand_name,
                    "p_modifier_group": modifier_group,
                    "p_limit": limit,
                }
            ).execute()

            data = unwrap_rpc_single(result.data, "get_modifier_group_protection_breakdown")
            if data:
                top_tags = [
                    TagProtectionStats(
                        tag=t.get("tag", ""),
                        count=t.get("count", 0),
                        win_rate=t.get("win_rate", 0),
                    )
                    for t in data.get("top_tags") or []
                ]
                competitors_by_type = {}
                for dtype, comps in (data.get("competitors_by_type") or {}).items():
                    competitors_by_type[dtype] = [
                        CategoryCompetitor(
                            domain=c.get("domain", ""),
                            domain_type=c.get("domain_type", dtype),
                            wins_count=c.get("wins_count", 0),
                            wins_volume=c.get("wins_volume", 0),
                            avg_position=c.get("avg_position", 0),
                        )
                        for c in comps or []
                    ]
                loss_distribution = [
                    DomainTypeLossDetail(
                        domain_type=d.get("domain_type", ""),
                        loss_count=d.get("loss_count", 0),
                        loss_volume=d.get("loss_volume", 0),
                        percentage=d.get("percentage", 0),
                    )
                    for d in data.get("loss_distribution_by_type") or []
                ]
                example_winners = [
                    ExampleWinnerKeyword(
                        keyword=w.get("keyword", ""),
                        volume=w.get("volume", 0),
                        url=w.get("url", ""),
                    )
                    for w in data.get("example_winners") or []
                ]
                example_losers = [
                    ExampleLoserKeyword(
                        keyword=l.get("keyword", ""),
                        volume=l.get("volume", 0),
                        winner_domain=l.get("winner_domain", ""),
                        winner_position=l.get("winner_position", 1),
                    )
                    for l in data.get("example_losers") or []
                ]
                return ModifierGroupProtectionBreakdown(
                    modifier_group=data.get("modifier_group", modifier_group),
                    total_keywords=data.get("total_keywords", 0),
                    total_volume=data.get("total_volume", 0),
                    keywords_winning=data.get("keywords_winning", 0),
                    keywords_losing=data.get("keywords_losing", 0),
                    volume_winning=data.get("volume_winning", 0),
                    volume_losing=data.get("volume_losing", 0),
                    win_rate=data.get("win_rate", 0),
                    avg_brand_position=data.get("avg_brand_position"),
                    top_tags=top_tags,
                    competitors_by_type=competitors_by_type,
                    loss_distribution_by_type=loss_distribution,
                    example_winners=example_winners,
                    example_losers=example_losers,
                )
            return ModifierGroupProtectionBreakdown(modifier_group=modifier_group)
        except Exception as e:
            logger.exception(f"Error getting modifier group protection breakdown: {e}")
            return ModifierGroupProtectionBreakdown(modifier_group=modifier_group)

    def _calculate_health_score(self, win_rate_keywords: float, win_rate_volume: float) -> tuple:
        """
        Calculate brand health score from win rates.

        Formula: 60% keyword win rate + 40% volume win rate

        Args:
            win_rate_keywords: Keyword win rate (0-100)
            win_rate_volume: Volume win rate (0-100)

        Returns:
            Tuple of (score, grade)
        """
        score = round(win_rate_keywords * 0.6 + win_rate_volume * 0.4)

        # Determine grade
        if score >= 90:
            grade = "A"
        elif score >= 80:
            grade = "B"
        elif score >= 70:
            grade = "C"
        elif score >= 50:
            grade = "D"
        else:
            grade = "F"

        return score, grade

    async def get_home_dashboard(self, brand_name: str) -> HomeDashboard:
        """
        Get home dashboard quick pulse data.

        Lightweight endpoint for the HOME page. Returns health score,
        opportunity size, and top threat.

        Args:
            brand_name: Brand to analyze

        Returns:
            HomeDashboard with KPIs
        """
        # Get brand protection KPIs
        kpis = await self.get_brand_protection_kpis(brand_name)

        # Calculate health score
        health_score, health_grade = self._calculate_health_score(
            kpis.win_rate_keywords, kpis.win_rate_volume
        )

        # Get top threat
        competitors = await self.get_top_competitors(brand_name, limit=1)
        top_threat = competitors[0] if competitors else None

        # Fetch brand domains
        brand_domains = []
        has_domain_mapping = True
        try:
            result = self.client.table("brand_domains")\
                .select("domain:domains(domain)")\
                .eq("market_id", self.market_id)\
                .eq("brand_name", brand_name)\
                .execute()
            if result.data:
                brand_domains = [
                    item["domain"]["domain"]
                    for item in result.data
                    if item.get("domain")
                ]
            has_domain_mapping = len(brand_domains) > 0
        except Exception as e:
            logger.warning(f"Error fetching brand domains: {e}")
            has_domain_mapping = False

        home_kpis = HomeDashboardKPIs(
            health_score=health_score,
            health_grade=health_grade,
            win_rate_keywords=kpis.win_rate_keywords,
            win_rate_volume=kpis.win_rate_volume,
            volume_at_risk=kpis.volume_losing,
            keywords_at_risk=kpis.keywords_losing,
            top_threat_domain=top_threat.domain if top_threat else None,
            top_threat_domain_type=top_threat.domain_type if top_threat else None,
            top_threat_keywords=top_threat.wins_count if top_threat else 0,
            top_threat_volume=top_threat.wins_volume if top_threat else 0,
        )

        return HomeDashboard(
            brand_name=brand_name,
            brand_domains=brand_domains,
            kpis=home_kpis,
            has_domain_mapping=has_domain_mapping,
        )

    async def get_brand_protection_summary(self, brand_name: str) -> BrandProtectionSummary:
        """
        Get lightweight brand protection summary with health score.

        Smaller payload than the full dashboard.

        Args:
            brand_name: Brand to analyze

        Returns:
            BrandProtectionSummary with health score
        """
        # Get brand protection KPIs
        kpis = await self.get_brand_protection_kpis(brand_name)

        # Calculate health score
        health_score, health_grade = self._calculate_health_score(
            kpis.win_rate_keywords, kpis.win_rate_volume
        )

        # Get top threat
        competitors = await self.get_top_competitors(brand_name, limit=1)
        top_threat = competitors[0] if competitors else None

        # Fetch brand domains
        brand_domains = []
        try:
            result = self.client.table("brand_domains")\
                .select("domain:domains(domain)")\
                .eq("market_id", self.market_id)\
                .eq("brand_name", brand_name)\
                .execute()
            if result.data:
                brand_domains = [
                    item["domain"]["domain"]
                    for item in result.data
                    if item.get("domain")
                ]
        except Exception as e:
            logger.warning(f"Error fetching brand domains: {e}")

        return BrandProtectionSummary(
            brand_name=brand_name,
            brand_domains=brand_domains,
            health_score=health_score,
            health_grade=health_grade,
            total_keywords=kpis.total_branded_keywords,
            keywords_winning=kpis.keywords_winning,
            keywords_losing=kpis.keywords_losing,
            volume_winning=kpis.volume_winning,
            volume_losing=kpis.volume_losing,
            win_rate_keywords=kpis.win_rate_keywords,
            win_rate_volume=kpis.win_rate_volume,
            top_threat_domain=top_threat.domain if top_threat else None,
            top_threat_domain_type=top_threat.domain_type if top_threat else None,
            top_threat_keywords=top_threat.wins_count if top_threat else 0,
            top_threat_volume=top_threat.wins_volume if top_threat else 0,
        )
