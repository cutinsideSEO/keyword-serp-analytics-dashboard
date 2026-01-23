"""
Market Analytics Service

Provides market-wide analytics independent of any single brand.
All methods operate on the entire dataset to give market overview.

Domain types are configurable per market via database.
"""

import json
import logging
from typing import Any, Dict, List, Optional, Set, Tuple

from sqlalchemy import and_, case, distinct, func, or_, select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.models import (
    BrandDomain,
    Category,
    Domain,
    Keyword,
    KeywordTag,
    Market,
    MarketDomainType,
    SerpResult,
)
from app.middleware.market_context import get_current_market_id
from app.schemas import (
    ShareOfSearchItem,
    DomainVisibilityItem,
    MarketProtectionKPIs,
    MarketLossDistribution,
    BrandLossItem,
    CategoryMarketStats,
    CategoryBreakdown,
    CategoryValueMarketStats,
    ModifierGroupMarketStats,
    ModifierGroupBreakdown,
    MarketOverviewDashboard,
)

logger = logging.getLogger(__name__)


class MarketAnalyticsService:
    """Service for computing market-wide analytics and dashboard data."""

    def __init__(self, session: AsyncSession, market_id: Optional[str] = None):
        """
        Initialize the market analytics service.

        Args:
            session: SQLAlchemy async session
            market_id: Market ID (optional, uses context default if not provided)
        """
        self.session = session
        self.market_id = market_id or get_current_market_id()
        self._brand_category_ids: Optional[List[int]] = None
        self._brand_category_names: Optional[List[str]] = None
        self._domain_types_cache: Optional[List[MarketDomainType]] = None

    async def _get_domain_types(self) -> List[MarketDomainType]:
        """Get all domain types for this market (cached)."""
        if self._domain_types_cache is None:
            result = await self.session.execute(
                select(MarketDomainType)
                .where(MarketDomainType.market_id == self.market_id)
                .order_by(MarketDomainType.sort_order)
            )
            self._domain_types_cache = list(result.scalars().all())
        return self._domain_types_cache

    async def get_domain_type_names(self) -> List[str]:
        """Get all domain type display names for this market."""
        domain_types = await self._get_domain_types()
        return [dt.display_name for dt in domain_types]

    async def get_non_brand_type_names(self) -> List[str]:
        """Get names of non-brand domain types for this market."""
        domain_types = await self._get_domain_types()
        return [dt.display_name for dt in domain_types if not dt.is_brand_type]

    async def get_brand_type_name(self) -> str:
        """Get the brand domain type name for this market."""
        domain_types = await self._get_domain_types()
        for dt in domain_types:
            if dt.is_brand_type:
                return dt.display_name
        return "Brand"  # Default fallback

    async def _get_brand_category_names(self) -> List[str]:
        """Get brand category names from database (cached)."""
        if self._brand_category_names is None:
            result = await self.session.execute(
                select(Market.brand_category_names).where(Market.id == self.market_id)
            )
            row = result.scalar_one_or_none()

            if row:
                try:
                    self._brand_category_names = json.loads(row)
                except (json.JSONDecodeError, TypeError):
                    self._brand_category_names = ["brand"]
            else:
                self._brand_category_names = ["brand"]

        return self._brand_category_names

    async def _get_brand_category_ids(self) -> List[int]:
        """Get the brand category IDs based on market config (cached)."""
        if self._brand_category_ids is None:
            # Get category names from database
            brand_category_names = await self._get_brand_category_names()

            result = await self.session.execute(
                select(Category.id).where(
                    Category.market_id == self.market_id,
                    Category.name.in_(brand_category_names)
                )
            )
            self._brand_category_ids = [row[0] for row in result.fetchall()]

            if not self._brand_category_ids:
                logger.warning(f"No brand categories found for market {self.market_id}: {brand_category_names}")
                self._brand_category_ids = []
        return self._brand_category_ids

    async def get_share_of_search(self, limit: int = 20) -> List[ShareOfSearchItem]:
        """
        Calculate Share of Search for each brand.
        Returns brands ranked by total search volume demand.

        Args:
            limit: Maximum brands to return

        Returns:
            List of ShareOfSearchItem ordered by total_volume descending
        """
        brand_category_ids = await self._get_brand_category_ids()

        if not brand_category_ids:
            return []

        # Get total market volume for percentage calculation
        total_market_query = (
            select(func.sum(Keyword.volume))
            .select_from(Keyword)
            .join(KeywordTag, Keyword.id == KeywordTag.keyword_id)
            .where(KeywordTag.category_id.in_(brand_category_ids))
        )
        total_result = await self.session.execute(total_market_query)
        total_market_volume = total_result.scalar() or 1

        # Get volume and keyword count per brand
        query = (
            select(
                KeywordTag.value.label("brand_name"),
                func.sum(Keyword.volume).label("total_volume"),
                func.count(distinct(Keyword.id)).label("keyword_count"),
            )
            .select_from(Keyword)
            .join(KeywordTag, Keyword.id == KeywordTag.keyword_id)
            .where(KeywordTag.category_id.in_(brand_category_ids))
            .group_by(KeywordTag.value)
            .order_by(func.sum(Keyword.volume).desc())
            .limit(limit)
        )

        result = await self.session.execute(query)
        rows = result.all()

        brands = []
        for row in rows:
            brand_name, total_volume, keyword_count = row

            # Calculate share percentage
            share_percentage = round(100.0 * total_volume / total_market_volume, 2)

            # Get primary domain for this brand
            domain_query = (
                select(Domain.domain)
                .select_from(BrandDomain)
                .join(Domain, BrandDomain.domain_id == Domain.id)
                .where(
                    BrandDomain.brand_name == brand_name,
                    BrandDomain.is_primary == True
                )
                .limit(1)
            )
            domain_result = await self.session.execute(domain_query)
            primary_domain = domain_result.scalar()

            # Get domain performance metrics if primary domain exists
            domain_visibility = None
            domain_win_count = None
            domain_avg_position = None

            if primary_domain:
                # Get domain_id
                domain_id_query = select(Domain.id).where(Domain.domain == primary_domain)
                domain_id_result = await self.session.execute(domain_id_query)
                domain_id = domain_id_result.scalar()

                if domain_id:
                    # Calculate visibility score: SUM(volume / rank)
                    visibility_query = (
                        select(
                            func.sum(Keyword.volume / SerpResult.rank_group).label("visibility"),
                            func.count(case((SerpResult.rank_group == 1, 1))).label("wins"),
                            func.avg(SerpResult.rank_group).label("avg_pos"),
                        )
                        .select_from(SerpResult)
                        .join(Keyword, SerpResult.keyword_id == Keyword.id)
                        .where(SerpResult.domain_id == domain_id)
                    )
                    vis_result = await self.session.execute(visibility_query)
                    vis_row = vis_result.first()
                    if vis_row:
                        domain_visibility = round(vis_row[0], 2) if vis_row[0] else None
                        domain_win_count = vis_row[1]
                        domain_avg_position = round(vis_row[2], 2) if vis_row[2] else None

            brands.append(
                ShareOfSearchItem(
                    brand_name=brand_name,
                    total_volume=total_volume,
                    keyword_count=keyword_count,
                    share_percentage=share_percentage,
                    primary_domain=primary_domain,
                    domain_visibility=domain_visibility,
                    domain_win_count=domain_win_count,
                    domain_avg_position=domain_avg_position,
                )
            )

        return brands

    async def get_domain_visibility_by_type(
        self,
        domain_type: str,
        limit: int = 10
    ) -> List[DomainVisibilityItem]:
        """
        Get top domains by visibility score for a specific domain type.

        Args:
            domain_type: 'Reseller', 'UGC', '3rd Party', or 'Brand'
            limit: Maximum domains to return

        Returns:
            List of DomainVisibilityItem ordered by visibility_score descending
        """
        # Calculate visibility score: SUM(volume / rank) per domain
        query = (
            select(
                Domain.domain,
                BrandDomain.domain_type,
                func.sum(Keyword.volume / SerpResult.rank_group).label("visibility_score"),
                func.count(distinct(SerpResult.keyword_id)).label("ranking_count"),
                func.sum(Keyword.volume).label("total_volume"),
                func.count(case((SerpResult.rank_group == 1, 1))).label("win_count"),
                func.avg(SerpResult.rank_group).label("avg_position"),
            )
            .select_from(SerpResult)
            .join(Domain, SerpResult.domain_id == Domain.id)
            .join(Keyword, SerpResult.keyword_id == Keyword.id)
            .join(BrandDomain, Domain.id == BrandDomain.domain_id)
            .where(
                BrandDomain.domain_type == domain_type,
                SerpResult.rank_group <= 20  # Only consider top 20 positions
            )
            .group_by(Domain.id, Domain.domain, BrandDomain.domain_type)
            .order_by(desc(func.sum(Keyword.volume / SerpResult.rank_group)))
            .limit(limit)
        )

        result = await self.session.execute(query)
        rows = result.all()

        domains = []
        for row in rows:
            domain, dtype, visibility_score, ranking_count, total_volume, win_count, avg_position = row

            # Get top 3 brands this domain appears on
            brand_cat_ids = await self._get_brand_category_ids()
            brands_query = (
                select(KeywordTag.value)
                .select_from(SerpResult)
                .join(Keyword, SerpResult.keyword_id == Keyword.id)
                .join(KeywordTag, Keyword.id == KeywordTag.keyword_id)
                .join(Domain, SerpResult.domain_id == Domain.id)
                .where(
                    Domain.domain == domain,
                    KeywordTag.category_id.in_(brand_cat_ids) if brand_cat_ids else False
                )
                .group_by(KeywordTag.value)
                .order_by(func.count(distinct(Keyword.id)).desc())
                .limit(3)
            )
            brands_result = await self.session.execute(brands_query)
            top_brands = [b[0] for b in brands_result.all()]

            domains.append(
                DomainVisibilityItem(
                    domain=domain,
                    domain_type=dtype,
                    visibility_score=round(visibility_score, 2) if visibility_score else 0,
                    ranking_count=ranking_count,
                    total_volume=total_volume or 0,
                    win_count=win_count,
                    avg_position=round(avg_position, 2) if avg_position else 0,
                    top_brands=top_brands,
                )
            )

        return domains

    async def get_market_protection_kpis(self) -> MarketProtectionKPIs:
        """
        Calculate market-wide brand protection metrics.
        Returns both totals and averages across all brands.

        Returns:
            MarketProtectionKPIs with aggregate metrics
        """
        brand_category_ids = await self._get_brand_category_ids()

        if not brand_category_ids:
            return MarketProtectionKPIs()

        # Get all brands with at least 10 keywords
        brands_query = (
            select(KeywordTag.value.label("brand_name"))
            .select_from(KeywordTag)
            .where(KeywordTag.category_id.in_(brand_category_ids))
            .group_by(KeywordTag.value)
            .having(func.count(distinct(KeywordTag.keyword_id)) >= 10)
        )
        brands_result = await self.session.execute(brands_query)
        brands = [row[0] for row in brands_result.all()]

        if not brands:
            return MarketProtectionKPIs()

        # Calculate stats for each brand
        total_branded_keywords = 0
        total_branded_volume = 0
        total_keywords_winning = 0
        total_keywords_losing = 0
        total_volume_winning = 0
        total_volume_losing = 0
        win_rates = []
        volume_win_rates = []

        for brand_name in brands:
            # Get brand's keywords
            brand_keywords_query = (
                select(Keyword.id, Keyword.volume)
                .select_from(Keyword)
                .join(KeywordTag, Keyword.id == KeywordTag.keyword_id)
                .where(
                    KeywordTag.category_id.in_(brand_category_ids),
                    KeywordTag.value == brand_name
                )
            )
            keywords_result = await self.session.execute(brand_keywords_query)
            brand_keywords = {row[0]: row[1] for row in keywords_result.all()}

            if not brand_keywords:
                continue

            brand_total_keywords = len(brand_keywords)
            brand_total_volume = sum(brand_keywords.values())

            # Get brand's primary domains
            domain_ids_query = (
                select(BrandDomain.domain_id)
                .where(
                    BrandDomain.brand_name == brand_name,
                    BrandDomain.is_primary == True
                )
            )
            domains_result = await self.session.execute(domain_ids_query)
            domain_ids = [row[0] for row in domains_result.all()]

            if not domain_ids:
                # No domains = all losses
                total_branded_keywords += brand_total_keywords
                total_branded_volume += brand_total_volume
                total_keywords_losing += brand_total_keywords
                total_volume_losing += brand_total_volume
                win_rates.append(0.0)
                volume_win_rates.append(0.0)
                continue

            # Count wins
            wins_query = (
                select(
                    SerpResult.keyword_id,
                    Keyword.volume
                )
                .select_from(SerpResult)
                .join(Keyword, SerpResult.keyword_id == Keyword.id)
                .where(
                    SerpResult.keyword_id.in_(list(brand_keywords.keys())),
                    SerpResult.domain_id.in_(domain_ids),
                    SerpResult.rank_group == 1
                )
            )
            wins_result = await self.session.execute(wins_query)
            wins = {row[0]: row[1] for row in wins_result.all()}

            brand_keywords_winning = len(wins)
            brand_volume_winning = sum(wins.values())
            brand_keywords_losing = brand_total_keywords - brand_keywords_winning
            brand_volume_losing = brand_total_volume - brand_volume_winning

            # Aggregate totals
            total_branded_keywords += brand_total_keywords
            total_branded_volume += brand_total_volume
            total_keywords_winning += brand_keywords_winning
            total_keywords_losing += brand_keywords_losing
            total_volume_winning += brand_volume_winning
            total_volume_losing += brand_volume_losing

            # Calculate rates
            brand_win_rate = (100.0 * brand_keywords_winning / brand_total_keywords) if brand_total_keywords > 0 else 0
            brand_volume_win_rate = (100.0 * brand_volume_winning / brand_total_volume) if brand_total_volume > 0 else 0
            win_rates.append(brand_win_rate)
            volume_win_rates.append(brand_volume_win_rate)

        # Calculate averages and median
        average_win_rate = round(sum(win_rates) / len(win_rates), 1) if win_rates else 0
        average_volume_win_rate = round(sum(volume_win_rates) / len(volume_win_rates), 1) if volume_win_rates else 0

        # Calculate median
        sorted_win_rates = sorted(win_rates)
        n = len(sorted_win_rates)
        if n == 0:
            median_win_rate = 0
        elif n % 2 == 0:
            median_win_rate = round((sorted_win_rates[n//2 - 1] + sorted_win_rates[n//2]) / 2, 1)
        else:
            median_win_rate = round(sorted_win_rates[n//2], 1)

        # Get total market size (ALL keywords)
        market_stats_query = (
            select(
                func.count(Keyword.id).label("total_keywords"),
                func.sum(Keyword.volume).label("total_volume")
            )
            .select_from(Keyword)
        )
        market_stats_result = await self.session.execute(market_stats_query)
        market_stats = market_stats_result.first()
        total_market_keywords = market_stats[0] if market_stats and market_stats[0] else 0
        total_market_volume = market_stats[1] if market_stats and market_stats[1] else 0

        return MarketProtectionKPIs(
            total_market_keywords=total_market_keywords,
            total_market_volume=total_market_volume,
            total_brands=len(brands),
            total_branded_keywords=total_branded_keywords,
            total_branded_volume=total_branded_volume,
            total_keywords_winning=total_keywords_winning,
            total_keywords_losing=total_keywords_losing,
            total_volume_winning=total_volume_winning,
            total_volume_losing=total_volume_losing,
            average_win_rate=average_win_rate,
            median_win_rate=median_win_rate,
            average_volume_win_rate=average_volume_win_rate,
        )

    async def get_market_loss_distribution(self) -> List[MarketLossDistribution]:
        """
        Get loss distribution by domain type across all brands.

        Returns:
            List of MarketLossDistribution ordered by loss_volume descending
        """
        brand_category_ids = await self._get_brand_category_ids()

        if not brand_category_ids:
            return []

        # Get all branded keywords
        branded_keywords_query = (
            select(KeywordTag.keyword_id, KeywordTag.value)
            .where(KeywordTag.category_id.in_(brand_category_ids))
        )
        branded_result = await self.session.execute(branded_keywords_query)
        branded_keywords = {}  # keyword_id: brand_name
        for row in branded_result.all():
            branded_keywords[row[0]] = row[1]

        if not branded_keywords:
            return []

        # Get winners (#1 ranks) on branded keywords
        winners_query = (
            select(
                SerpResult.keyword_id,
                SerpResult.domain_id,
                Keyword.volume,
            )
            .select_from(SerpResult)
            .join(Keyword, SerpResult.keyword_id == Keyword.id)
            .where(
                SerpResult.keyword_id.in_(list(branded_keywords.keys())),
                SerpResult.rank_group == 1
            )
        )
        winners_result = await self.session.execute(winners_query)
        winners = winners_result.all()

        # Get brand domains mapping
        brand_domains_query = (
            select(BrandDomain.brand_name, BrandDomain.domain_id)
            .where(BrandDomain.is_primary == True)
        )
        bd_result = await self.session.execute(brand_domains_query)
        brand_domains = {}  # brand_name: [domain_ids]
        for row in bd_result.all():
            if row[0] not in brand_domains:
                brand_domains[row[0]] = []
            brand_domains[row[0]].append(row[1])

        # Classify losses: where winner is not the brand's domain
        losses_by_domain = {}  # domain_id: [(keyword_id, volume)]

        for keyword_id, winner_domain_id, volume in winners:
            brand_name = branded_keywords.get(keyword_id)
            if not brand_name:
                continue

            brand_domain_ids = brand_domains.get(brand_name, [])
            if winner_domain_id not in brand_domain_ids:
                # This is a loss
                if winner_domain_id not in losses_by_domain:
                    losses_by_domain[winner_domain_id] = []
                losses_by_domain[winner_domain_id].append((keyword_id, volume))

        if not losses_by_domain:
            return []

        # Get domain types
        domain_types_query = (
            select(BrandDomain.domain_id, BrandDomain.domain_type, Domain.domain)
            .select_from(BrandDomain)
            .join(Domain, BrandDomain.domain_id == Domain.id)
            .where(BrandDomain.domain_id.in_(list(losses_by_domain.keys())))
        )
        dt_result = await self.session.execute(domain_types_query)
        domain_type_map = {}  # domain_id: (domain_type, domain_name)
        for row in dt_result.all():
            domain_type_map[row[0]] = (row[1], row[2])

        # Aggregate by domain type
        type_stats = {}  # domain_type: {loss_count, loss_volume, top_domains: [(domain, volume)]}
        total_loss_count = 0

        for domain_id, losses in losses_by_domain.items():
            domain_info = domain_type_map.get(domain_id)
            if not domain_info:
                continue

            domain_type, domain_name = domain_info
            loss_count = len(set(kw_id for kw_id, _ in losses))
            loss_volume = sum(vol for _, vol in losses)
            total_loss_count += loss_count

            if domain_type not in type_stats:
                type_stats[domain_type] = {
                    "loss_count": 0,
                    "loss_volume": 0,
                    "domains": []
                }

            type_stats[domain_type]["loss_count"] += loss_count
            type_stats[domain_type]["loss_volume"] += loss_volume
            type_stats[domain_type]["domains"].append((domain_name, loss_volume))

        # Build response
        distribution = []
        for domain_type, stats in type_stats.items():
            # Get top 3 domains by volume
            top_domains = sorted(stats["domains"], key=lambda x: x[1], reverse=True)[:3]
            top_domains_list = [d[0] for d in top_domains]

            percentage = round(100.0 * stats["loss_count"] / total_loss_count, 1) if total_loss_count > 0 else 0

            distribution.append(
                MarketLossDistribution(
                    domain_type=domain_type,
                    loss_count=stats["loss_count"],
                    loss_volume=stats["loss_volume"],
                    percentage_of_losses=percentage,
                    top_domains=top_domains_list,
                )
            )

        # Sort by loss_volume descending
        distribution.sort(key=lambda x: x.loss_volume, reverse=True)

        return distribution

    async def get_biggest_losers(self, limit: int = 20) -> List[BrandLossItem]:
        """
        Get brands with the worst brand protection (most losses).
        Includes top modifier groups where each brand loses most.

        Args:
            limit: Maximum brands to return

        Returns:
            List of BrandLossItem ordered by volume_lost descending
        """
        brand_category_ids = await self._get_brand_category_ids()

        if not brand_category_ids:
            return []

        # Get all brands with keywords
        brands_query = (
            select(KeywordTag.value.label("brand_name"))
            .where(KeywordTag.category_id.in_(brand_category_ids))
            .group_by(KeywordTag.value)
            .having(func.count(distinct(KeywordTag.keyword_id)) >= 10)
        )
        brands_result = await self.session.execute(brands_query)
        brands = [row[0] for row in brands_result.all()]

        brand_stats = []

        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"=== get_biggest_losers called, processing {len(brands)} brands ===")

        for brand_name in brands:
            # Get brand keywords
            keywords_query = (
                select(Keyword.id, Keyword.volume, Keyword.modifier_group)
                .select_from(Keyword)
                .join(KeywordTag, Keyword.id == KeywordTag.keyword_id)
                .where(
                    KeywordTag.category_id.in_(brand_category_ids),
                    KeywordTag.value == brand_name
                )
            )
            kw_result = await self.session.execute(keywords_query)
            keywords = {row[0]: {"volume": row[1], "modifier_group": row[2]} for row in kw_result.all()}

            if not keywords:
                continue

            total_keywords = len(keywords)
            total_volume = sum(k["volume"] for k in keywords.values())

            # Get brand domains (all domains, not just primary)
            # Use brand type from market config
            brand_type_name = await self.get_brand_type_name()
            domains_query = (
                select(BrandDomain.domain_id)
                .where(
                    BrandDomain.brand_name == brand_name,
                    BrandDomain.domain_type == brand_type_name
                )
            )
            domains_result = await self.session.execute(domains_query)
            domain_ids = [row[0] for row in domains_result.all()]

            # DEBUG
            if brand_name == "trek":
                logger.info(f"DEBUG Trek: Found {len(domain_ids)} domains: {domain_ids}")
                logger.info(f"DEBUG Trek: Total keywords: {total_keywords}")

            if not domain_ids:
                # No domains = all losses
                keywords_lost = total_keywords
                volume_lost = total_volume
                win_rate = 0.0
                if brand_name == "trek":
                    logger.info(f"DEBUG Trek: NO DOMAINS FOUND - setting win_rate = 0.0")
            else:
                # Get wins
                wins_query = (
                    select(SerpResult.keyword_id)
                    .where(
                        SerpResult.keyword_id.in_(list(keywords.keys())),
                        SerpResult.domain_id.in_(domain_ids),
                        SerpResult.rank_group == 1
                    )
                )
                wins_result = await self.session.execute(wins_query)
                winning_keyword_ids = {row[0] for row in wins_result.all()}

                keywords_winning = len(winning_keyword_ids)
                keywords_lost = total_keywords - keywords_winning
                volume_winning = sum(keywords[kid]["volume"] for kid in winning_keyword_ids if kid in keywords)
                volume_lost = total_volume - volume_winning
                win_rate = round(100.0 * keywords_winning / total_keywords, 1) if total_keywords > 0 else 0

                if brand_name == "trek":
                    logger.info(f"DEBUG Trek: Wins found: {keywords_winning}, Win rate: {win_rate}%")

            # Get top modifier groups by loss
            modifier_losses = {}  # modifier_group: {loss_count, loss_volume}
            for keyword_id, kw_data in keywords.items():
                if domain_ids:
                    # Check if this keyword is a win
                    is_win_query = (
                        select(func.count())
                        .select_from(SerpResult)
                        .where(
                            SerpResult.keyword_id == keyword_id,
                            SerpResult.domain_id.in_(domain_ids),
                            SerpResult.rank_group == 1
                        )
                    )
                    is_win_result = await self.session.execute(is_win_query)
                    is_win = is_win_result.scalar() > 0
                else:
                    is_win = False

                if not is_win:
                    mg = kw_data["modifier_group"] or "No Modifier Group"
                    if mg not in modifier_losses:
                        modifier_losses[mg] = {"loss_count": 0, "loss_volume": 0}
                    modifier_losses[mg]["loss_count"] += 1
                    modifier_losses[mg]["loss_volume"] += kw_data["volume"]

            # Get top 3 modifier groups by volume
            top_modifiers = sorted(
                [{"modifier_group": mg, **stats} for mg, stats in modifier_losses.items()],
                key=lambda x: x["loss_volume"],
                reverse=True
            )[:3]

            brand_stats.append(
                BrandLossItem(
                    brand_name=brand_name,
                    total_keywords=total_keywords,
                    keywords_lost=keywords_lost,
                    volume_lost=volume_lost,
                    win_rate=win_rate,
                    top_loss_modifier_groups=top_modifiers,
                )
            )

        # Sort by volume_lost descending
        brand_stats.sort(key=lambda x: x.volume_lost, reverse=True)

        return brand_stats[:limit]

    async def get_category_market_stats(self) -> List[CategoryMarketStats]:
        """
        Get market statistics for each category.
        Includes keyword count, volume, and summary metrics.

        Returns:
            List of CategoryMarketStats ordered by total_volume descending
        """
        # Get all categories except brand
        categories_query = (
            select(Category.id, Category.name, Category.display_name)
            .where(Category.name != "brand")
        )
        categories_result = await self.session.execute(categories_query)
        categories = categories_result.all()

        category_stats = []

        for cat_id, cat_name, display_name in categories:
            # Get stats for this category
            stats_query = (
                select(
                    func.count(distinct(KeywordTag.keyword_id)).label("total_keywords"),
                    func.sum(Keyword.volume).label("total_volume"),
                    func.count(distinct(KeywordTag.value)).label("unique_values"),
                )
                .select_from(KeywordTag)
                .join(Keyword, KeywordTag.keyword_id == Keyword.id)
                .where(KeywordTag.category_id == cat_id)
            )
            stats_result = await self.session.execute(stats_query)
            stats_row = stats_result.first()

            if not stats_row or stats_row[0] == 0:
                continue

            total_keywords, total_volume, unique_values = stats_row

            # Get top 3 values preview
            top_values_query = (
                select(KeywordTag.value)
                .select_from(KeywordTag)
                .join(Keyword, KeywordTag.keyword_id == Keyword.id)
                .where(KeywordTag.category_id == cat_id)
                .group_by(KeywordTag.value)
                .order_by(func.sum(Keyword.volume).desc())
                .limit(3)
            )
            values_result = await self.session.execute(top_values_query)
            top_values_preview = [row[0] for row in values_result.all()]

            category_stats.append(
                CategoryMarketStats(
                    category_name=cat_name,
                    display_name=display_name,
                    total_keywords=total_keywords,
                    total_volume=total_volume or 0,
                    unique_values=unique_values,
                    top_values_preview=top_values_preview,
                )
            )

        # Sort by total_volume descending
        category_stats.sort(key=lambda x: x.total_volume, reverse=True)

        return category_stats

    async def get_category_breakdown(
        self,
        category_name: str,
        limit: int = 10
    ) -> CategoryBreakdown:
        """
        Get detailed breakdown for a specific category.
        Includes top values, players by type, and example keywords.

        Optimized to use batch queries instead of per-value queries.

        Args:
            category_name: Category name (internal name)
            limit: Maximum values to return

        Returns:
            CategoryBreakdown with full details
        """
        # Get category info
        cat_query = (
            select(Category.id, Category.display_name)
            .where(Category.name == category_name)
        )
        cat_result = await self.session.execute(cat_query)
        cat_row = cat_result.first()

        if not cat_row:
            # Return empty breakdown
            return CategoryBreakdown(
                category_name=category_name,
                display_name=category_name,
                total_keywords=0,
                total_volume=0,
                top_values=[],
                top_players_by_type={},
            )

        cat_id, display_name = cat_row

        # Get total stats
        total_query = (
            select(
                func.count(distinct(KeywordTag.keyword_id)),
                func.sum(Keyword.volume)
            )
            .select_from(KeywordTag)
            .join(Keyword, KeywordTag.keyword_id == Keyword.id)
            .where(KeywordTag.category_id == cat_id)
        )
        total_result = await self.session.execute(total_query)
        total_row = total_result.first()
        total_keywords = total_row[0] if total_row else 0
        total_volume = total_row[1] if total_row else 0

        # Get top values with stats
        values_query = (
            select(
                KeywordTag.value,
                func.count(distinct(KeywordTag.keyword_id)).label("keyword_count"),
                func.sum(Keyword.volume).label("total_volume"),
            )
            .select_from(KeywordTag)
            .join(Keyword, KeywordTag.keyword_id == Keyword.id)
            .where(KeywordTag.category_id == cat_id)
            .group_by(KeywordTag.value)
            .order_by(desc(func.sum(Keyword.volume)))
            .limit(limit)
        )
        values_result = await self.session.execute(values_query)
        values_rows = values_result.all()

        if not values_rows:
            return CategoryBreakdown(
                category_name=category_name,
                display_name=display_name,
                total_keywords=total_keywords,
                total_volume=total_volume or 0,
                top_values=[],
                top_players_by_type={},
            )

        top_value_names = [row[0] for row in values_rows]

        # Batch query for example keywords using window function (single query instead of loop)
        # This gets top 3 keywords per value in one query
        examples_subquery = (
            select(
                KeywordTag.value,
                Keyword.keyword,
                func.row_number().over(
                    partition_by=KeywordTag.value,
                    order_by=Keyword.volume.desc()
                ).label("rn")
            )
            .select_from(KeywordTag)
            .join(Keyword, KeywordTag.keyword_id == Keyword.id)
            .where(
                KeywordTag.category_id == cat_id,
                KeywordTag.value.in_(top_value_names)
            )
        ).subquery()

        # Select only top 3 per value
        examples_query = (
            select(examples_subquery.c.value, examples_subquery.c.keyword)
            .where(examples_subquery.c.rn <= 3)
        )
        examples_result = await self.session.execute(examples_query)

        # Group results by value
        value_examples: Dict[str, List[str]] = {v: [] for v in top_value_names}
        for value, keyword in examples_result.all():
            if value in value_examples:
                value_examples[value].append(keyword)

        # Build top_values list (without per-value domain analysis for speed)
        # Domain analysis is shown at the category level via top_players_by_type
        top_values = []
        for value, kw_count, vol in values_rows:
            top_values.append(
                CategoryValueMarketStats(
                    value=value,
                    keyword_count=kw_count,
                    total_volume=vol or 0,
                    top_brand_domain=None,
                    top_brand_visibility=None,
                    top_retailer_domain=None,
                    top_retailer_visibility=None,
                    top_ugc_domain=None,
                    top_ugc_visibility=None,
                    top_3rd_party_domain=None,
                    top_3rd_party_visibility=None,
                    example_keywords=value_examples.get(value, []),
                )
            )

        # Get top players by type (same approach as modifier groups - uses optimized bulk query)
        top_players_by_type = {}
        domain_type_names = await self.get_domain_type_names()
        for dtype in domain_type_names:
            players = await self.get_domain_visibility_by_type(dtype, limit=5)
            top_players_by_type[dtype] = players

        return CategoryBreakdown(
            category_name=category_name,
            display_name=display_name,
            total_keywords=total_keywords,
            total_volume=total_volume or 0,
            top_values=top_values,
            top_players_by_type=top_players_by_type,
        )

    async def get_modifier_group_market_stats(self) -> List[ModifierGroupMarketStats]:
        """
        Get market statistics for each modifier group.

        Returns:
            List of ModifierGroupMarketStats ordered by total_volume descending
        """
        # Get stats per modifier group
        query = (
            select(
                Keyword.modifier_group,
                func.count(distinct(Keyword.id)).label("total_keywords"),
                func.sum(Keyword.volume).label("total_volume"),
            )
            .where(Keyword.modifier_group != None)
            .group_by(Keyword.modifier_group)
            .order_by(desc(func.sum(Keyword.volume)))
        )

        result = await self.session.execute(query)
        rows = result.all()

        stats = []
        for modifier_group, total_keywords, total_volume in rows:
            # Get top 3 tags preview
            keywords_query = (
                select(Keyword.id)
                .where(Keyword.modifier_group == modifier_group)
            )
            kw_result = await self.session.execute(keywords_query)
            keyword_ids = [row[0] for row in kw_result.all()]

            if keyword_ids:
                tags_query = (
                    select(
                        Category.name,
                        KeywordTag.value,
                        func.count(distinct(KeywordTag.keyword_id))
                    )
                    .select_from(KeywordTag)
                    .join(Category, KeywordTag.category_id == Category.id)
                    .where(
                        KeywordTag.keyword_id.in_(keyword_ids[:1000]),  # Limit for performance
                        Category.name != "brand"
                    )
                    .group_by(Category.name, KeywordTag.value)
                    .order_by(desc(func.count(distinct(KeywordTag.keyword_id))))
                    .limit(3)
                )
                tags_result = await self.session.execute(tags_query)
                top_tags_preview = [f"{row[0]}:{row[1]}" for row in tags_result.all()]
            else:
                top_tags_preview = []

            stats.append(
                ModifierGroupMarketStats(
                    modifier_group=modifier_group,
                    total_keywords=total_keywords,
                    total_volume=total_volume or 0,
                    top_tags_preview=top_tags_preview,
                )
            )

        return stats

    async def get_modifier_group_breakdown(
        self,
        modifier_group: str,
        limit: int = 10
    ) -> ModifierGroupBreakdown:
        """
        Get detailed breakdown for a specific modifier group.

        Args:
            modifier_group: Modifier group value
            limit: Maximum items to return in lists

        Returns:
            ModifierGroupBreakdown with full details
        """
        # Get total stats
        total_query = (
            select(
                func.count(distinct(Keyword.id)),
                func.sum(Keyword.volume)
            )
            .where(Keyword.modifier_group == modifier_group)
        )
        total_result = await self.session.execute(total_query)
        total_row = total_result.first()
        total_keywords = total_row[0] if total_row else 0
        total_volume = total_row[1] if total_row else 0

        # Get keyword IDs for this modifier group
        keywords_query = (
            select(Keyword.id)
            .where(Keyword.modifier_group == modifier_group)
        )
        kw_result = await self.session.execute(keywords_query)
        keyword_ids = [row[0] for row in kw_result.all()]

        # Get top tags
        tags_query = (
            select(
                Category.name,
                KeywordTag.value,
                func.count(distinct(KeywordTag.keyword_id))
            )
            .select_from(KeywordTag)
            .join(Category, KeywordTag.category_id == Category.id)
            .where(
                KeywordTag.keyword_id.in_(keyword_ids[:1000]),  # Limit for performance
                Category.name != "brand"
            )
            .group_by(Category.name, KeywordTag.value)
            .order_by(desc(func.count(distinct(KeywordTag.keyword_id))))
            .limit(limit)
        )
        tags_result = await self.session.execute(tags_query)
        top_tags = [
            {"tag": f"{row[0]}:{row[1]}", "count": row[2]}
            for row in tags_result.all()
        ]

        # Get top players by type
        top_players_by_type = {}
        domain_type_names = await self.get_domain_type_names()
        for dtype in domain_type_names:
            players = await self.get_domain_visibility_by_type(dtype, limit=5)
            top_players_by_type[dtype] = players

        # Get example keywords
        example_query = (
            select(Keyword.keyword, Keyword.volume)
            .where(Keyword.modifier_group == modifier_group)
            .order_by(Keyword.volume.desc())
            .limit(limit)
        )
        example_result = await self.session.execute(example_query)
        example_keywords = [
            {"keyword": row[0], "volume": row[1]}
            for row in example_result.all()
        ]

        return ModifierGroupBreakdown(
            modifier_group=modifier_group,
            total_keywords=total_keywords,
            total_volume=total_volume,
            top_tags=top_tags,
            top_players_by_type=top_players_by_type,
            example_keywords=example_keywords,
        )

    async def get_full_dashboard(self) -> MarketOverviewDashboard:
        """
        Get complete market overview dashboard data in a single call.
        Aggregates all sections for upfront loading.

        Returns:
            MarketOverviewDashboard with all data
        """
        # Fetch all components
        share_of_search = await self.get_share_of_search(limit=20)

        # Get non-brand domain types from database
        non_brand_types = await self.get_non_brand_type_names()

        # First non-brand type is treated as "retailers" (e.g., Comparison Site, Reseller)
        # Remaining types are treated as "influential voices" (e.g., UGC, 3rd Party)
        retailer_type = non_brand_types[0] if non_brand_types else None
        voice_types = non_brand_types[1:] if len(non_brand_types) > 1 else []

        top_retailers = []
        if retailer_type:
            top_retailers = await self.get_domain_visibility_by_type(retailer_type, limit=10)

        # Get influential voices (all remaining non-brand types combined)
        influential_voices = []
        for voice_type in voice_types:
            voices = await self.get_domain_visibility_by_type(voice_type, limit=10)
            influential_voices.extend(voices)
        influential_voices.sort(key=lambda x: x.visibility_score, reverse=True)
        influential_voices = influential_voices[:10]

        protection_kpis = await self.get_market_protection_kpis()
        loss_distribution = await self.get_market_loss_distribution()
        biggest_losers = await self.get_biggest_losers(limit=20)
        category_stats = await self.get_category_market_stats()
        modifier_group_stats = await self.get_modifier_group_market_stats()

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
