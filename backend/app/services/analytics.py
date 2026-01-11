"""
Analytics service for computing dashboard metrics.

Provides methods for calculating brand protection metrics and other analytics.
"""

import logging
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import and_, case, distinct, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.models import (
    BrandDomain,
    Category,
    Domain,
    Keyword,
    KeywordTag,
    SerpResult,
)
from app.schemas import (
    BrandProtectionDashboard,
    BrandProtectionKPIs,
    BrandProtectionLoss,
    BrandProtectionWin,
    CategoryCompetitor,
    CategoryLossStats,
    CategoryOpportunityDashboard,
    CategoryOpportunityKPIs,
    CategoryProtectionBreakdown,
    CategoryValueLossStats,
    CategoryValueProtectionStats,
    CompetitorStats,
    DomainTypeLossDetail,
    DomainTypeLossStats,
    ExampleLoserKeyword,
    ExampleWinnerKeyword,
    InfluentialDomain,
    ModifierGroupOpportunity,
    ModifierGroupProtectionBreakdown,
    ModifierGroupStats,
    OpportunityCompetitor,
    TagProtectionStats,
)

logger = logging.getLogger(__name__)


class AnalyticsService:
    """Service for computing analytics and dashboard data."""

    def __init__(self, session: AsyncSession):
        """
        Initialize the analytics service.

        Args:
            session: SQLAlchemy async session
        """
        self.session = session
        self._brand_category_id: Optional[int] = None

    async def _get_brand_category_id(self) -> int:
        """Get the brand category ID (cached)."""
        if self._brand_category_id is None:
            result = await self.session.execute(
                select(Category.id).where(Category.name == "brand")
            )
            self._brand_category_id = result.scalar_one()
        return self._brand_category_id

    async def _get_brand_domains(self, brand_name: str) -> List[int]:
        """
        Get domain IDs owned by a brand.

        Args:
            brand_name: Brand name

        Returns:
            List of domain IDs
        """
        result = await self.session.execute(
            select(BrandDomain.domain_id).where(
                BrandDomain.brand_name == brand_name,
                BrandDomain.is_primary == True,
            )
        )
        domain_ids = [row[0] for row in result.all()]

        # If no primary, get all domains for the brand
        if not domain_ids:
            result = await self.session.execute(
                select(BrandDomain.domain_id).where(
                    BrandDomain.brand_name == brand_name
                )
            )
            domain_ids = [row[0] for row in result.all()]

        return domain_ids

    async def _get_branded_keywords(self, brand_name: str) -> List[int]:
        """
        Get keyword IDs tagged with a brand.

        Args:
            brand_name: Brand name

        Returns:
            List of keyword IDs
        """
        brand_category_id = await self._get_brand_category_id()

        result = await self.session.execute(
            select(KeywordTag.keyword_id).where(
                KeywordTag.category_id == brand_category_id,
                KeywordTag.value == brand_name,
            )
        )
        return [row[0] for row in result.all()]

    async def get_brand_protection_kpis(self, brand_name: str) -> BrandProtectionKPIs:
        """
        Calculate brand protection KPIs.

        Args:
            brand_name: Brand to analyze

        Returns:
            BrandProtectionKPIs with all metrics
        """
        brand_domain_ids = await self._get_brand_domains(brand_name)
        branded_keyword_ids = await self._get_branded_keywords(brand_name)

        if not branded_keyword_ids:
            return BrandProtectionKPIs()

        # Get total branded keywords and volume
        result = await self.session.execute(
            select(
                func.count(Keyword.id).label("total_keywords"),
                func.sum(Keyword.volume).label("total_volume"),
            ).where(Keyword.id.in_(branded_keyword_ids))
        )
        row = result.one()
        total_keywords = row[0] or 0
        total_volume = row[1] or 0

        if not brand_domain_ids:
            # No domains mapped - all are losses
            return BrandProtectionKPIs(
                total_branded_keywords=total_keywords,
                total_branded_volume=total_volume,
                keywords_winning=0,
                keywords_losing=total_keywords,
                volume_winning=0,
                volume_losing=total_volume,
                win_rate_keywords=0.0,
                win_rate_volume=0.0,
            )

        # Find keywords where brand ranks #1
        wins_query = (
            select(
                func.count(distinct(SerpResult.keyword_id)).label("win_count"),
                func.sum(Keyword.volume).label("win_volume"),
            )
            .select_from(SerpResult)
            .join(Keyword, SerpResult.keyword_id == Keyword.id)
            .where(
                SerpResult.keyword_id.in_(branded_keyword_ids),
                SerpResult.domain_id.in_(brand_domain_ids),
                SerpResult.rank_group == 1,
            )
        )

        result = await self.session.execute(wins_query)
        row = result.one()
        keywords_winning = row[0] or 0
        volume_winning = row[1] or 0

        keywords_losing = total_keywords - keywords_winning
        volume_losing = total_volume - volume_winning

        win_rate_keywords = (
            round(100 * keywords_winning / total_keywords, 1) if total_keywords > 0 else 0
        )
        win_rate_volume = (
            round(100 * volume_winning / total_volume, 1) if total_volume > 0 else 0
        )

        return BrandProtectionKPIs(
            total_branded_keywords=total_keywords,
            total_branded_volume=total_volume,
            keywords_winning=keywords_winning,
            keywords_losing=keywords_losing,
            volume_winning=volume_winning,
            volume_losing=volume_losing,
            win_rate_keywords=win_rate_keywords,
            win_rate_volume=win_rate_volume,
        )

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
        brand_domain_ids = await self._get_brand_domains(brand_name)
        branded_keyword_ids = await self._get_branded_keywords(brand_name)

        if not brand_domain_ids or not branded_keyword_ids:
            return [], 0

        # Count total wins
        count_query = (
            select(func.count(distinct(SerpResult.keyword_id)))
            .where(
                SerpResult.keyword_id.in_(branded_keyword_ids),
                SerpResult.domain_id.in_(brand_domain_ids),
                SerpResult.rank_group == 1,
            )
        )
        result = await self.session.execute(count_query)
        total = result.scalar() or 0

        # Get win details
        query = (
            select(
                Keyword.keyword,
                Keyword.volume,
                SerpResult.rank_absolute,
                SerpResult.url,
                Keyword.id,
            )
            .select_from(SerpResult)
            .join(Keyword, SerpResult.keyword_id == Keyword.id)
            .where(
                SerpResult.keyword_id.in_(branded_keyword_ids),
                SerpResult.domain_id.in_(brand_domain_ids),
                SerpResult.rank_group == 1,
            )
            .order_by(Keyword.volume.desc())
            .limit(limit)
            .offset(offset)
        )

        result = await self.session.execute(query)
        rows = result.all()

        # Get tags for each keyword
        wins = []
        for row in rows:
            keyword_str, volume, rank_absolute, url, keyword_id = row

            # Get tags
            tags_query = (
                select(Category.name, KeywordTag.value)
                .select_from(KeywordTag)
                .join(Category, KeywordTag.category_id == Category.id)
                .where(KeywordTag.keyword_id == keyword_id)
            )
            tags_result = await self.session.execute(tags_query)
            tags = {tag_row[0]: tag_row[1] for tag_row in tags_result.all()}

            wins.append(
                BrandProtectionWin(
                    keyword=keyword_str,
                    volume=volume,
                    rank_absolute=rank_absolute,
                    url=url,
                    tags=tags,
                )
            )

        return wins, total

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
        brand_domain_ids = await self._get_brand_domains(brand_name)
        branded_keyword_ids = await self._get_branded_keywords(brand_name)

        if not branded_keyword_ids:
            return [], 0

        # Create aliases for the subqueries
        WinnerSerp = aliased(SerpResult)
        BrandSerp = aliased(SerpResult)

        # Find keywords where brand doesn't rank #1
        # We need a winner who ranks #1 and the brand either doesn't rank or ranks lower

        if brand_domain_ids:
            # Subquery for keywords where brand ranks #1
            brand_wins_subq = (
                select(SerpResult.keyword_id)
                .where(
                    SerpResult.keyword_id.in_(branded_keyword_ids),
                    SerpResult.domain_id.in_(brand_domain_ids),
                    SerpResult.rank_group == 1,
                )
            )

            # Get keywords where brand doesn't rank #1
            losses_keywords = (
                select(Keyword.id)
                .where(
                    Keyword.id.in_(branded_keyword_ids),
                    ~Keyword.id.in_(brand_wins_subq),
                )
            )
        else:
            # No brand domains - all branded keywords are losses
            losses_keywords = (
                select(Keyword.id)
                .where(Keyword.id.in_(branded_keyword_ids))
            )

        # Count losses
        count_query = select(func.count()).select_from(losses_keywords.subquery())
        result = await self.session.execute(count_query)
        total = result.scalar() or 0

        # Get loss details with winner info
        losses_subq = losses_keywords.subquery()

        query = (
            select(
                Keyword.keyword,
                Keyword.volume,
                Domain.domain.label("winner_domain"),
                SerpResult.rank_group.label("winner_position"),
                SerpResult.url.label("winner_url"),
                Keyword.id,
            )
            .select_from(Keyword)
            .join(losses_subq, Keyword.id == losses_subq.c.id)
            .join(SerpResult, and_(
                SerpResult.keyword_id == Keyword.id,
                SerpResult.rank_group == 1,
            ))
            .join(Domain, SerpResult.domain_id == Domain.id)
            .order_by(Keyword.volume.desc())
            .limit(limit)
            .offset(offset)
        )

        result = await self.session.execute(query)
        rows = result.all()

        losses = []
        for row in rows:
            keyword_str, volume, winner_domain, winner_position, winner_url, keyword_id = row

            # Get brand's position if they rank at all
            brand_position = None
            brand_url = None
            if brand_domain_ids:
                brand_rank_query = (
                    select(SerpResult.rank_group, SerpResult.url)
                    .where(
                        SerpResult.keyword_id == keyword_id,
                        SerpResult.domain_id.in_(brand_domain_ids),
                    )
                    .order_by(SerpResult.rank_group)
                    .limit(1)
                )
                brand_result = await self.session.execute(brand_rank_query)
                brand_row = brand_result.first()
                if brand_row:
                    brand_position = brand_row[0]
                    brand_url = brand_row[1]

            # Get tags
            tags_query = (
                select(Category.name, KeywordTag.value)
                .select_from(KeywordTag)
                .join(Category, KeywordTag.category_id == Category.id)
                .where(KeywordTag.keyword_id == keyword_id)
            )
            tags_result = await self.session.execute(tags_query)
            tags = {tag_row[0]: tag_row[1] for tag_row in tags_result.all()}

            # Get modifier group from Keyword
            modifier_query = select(Keyword.modifier_group).where(Keyword.id == keyword_id)
            modifier_result = await self.session.execute(modifier_query)
            modifier_group = modifier_result.scalar()

            losses.append(
                BrandProtectionLoss(
                    keyword=keyword_str,
                    volume=volume,
                    winner_domain=winner_domain,
                    winner_position=winner_position,
                    winner_url=winner_url,
                    brand_position=brand_position,
                    brand_url=brand_url,
                    modifier_group=modifier_group,
                    tags=tags,
                )
            )

        return losses, total

    async def get_top_competitors(
        self, brand_name: str, limit: int = 10
    ) -> List[CompetitorStats]:
        """
        Get top competitors on brand keywords by volume captured.

        Args:
            brand_name: Brand to analyze
            limit: Maximum competitors to return

        Returns:
            List of competitor statistics
        """
        brand_domain_ids = await self._get_brand_domains(brand_name)
        branded_keyword_ids = await self._get_branded_keywords(brand_name)

        if not branded_keyword_ids:
            return []

        # Find competitors who rank #1 on brand keywords
        query = (
            select(
                Domain.domain,
                BrandDomain.domain_type,
                func.count(distinct(SerpResult.keyword_id)).label("wins_count"),
                func.sum(Keyword.volume).label("wins_volume"),
                func.avg(SerpResult.rank_group).label("avg_position"),
            )
            .select_from(SerpResult)
            .join(Domain, SerpResult.domain_id == Domain.id)
            .join(Keyword, SerpResult.keyword_id == Keyword.id)
            .outerjoin(BrandDomain, Domain.id == BrandDomain.domain_id)
            .where(
                SerpResult.keyword_id.in_(branded_keyword_ids),
                SerpResult.rank_group == 1,
            )
        )

        # Exclude brand's own domains
        if brand_domain_ids:
            query = query.where(~SerpResult.domain_id.in_(brand_domain_ids))

        query = (
            query
            .group_by(Domain.domain, BrandDomain.domain_type)
            .order_by(func.sum(Keyword.volume).desc())
            .limit(limit)
        )

        result = await self.session.execute(query)
        rows = result.all()

        competitors = []
        for row in rows:
            domain, domain_type, wins_count, wins_volume, avg_position = row
            competitors.append(
                CompetitorStats(
                    domain=domain,
                    domain_type=domain_type,
                    wins_count=wins_count,
                    wins_volume=wins_volume or 0,
                    avg_position=round(avg_position, 2) if avg_position else 0,
                )
            )

        return competitors

    async def get_losses_by_category(
        self, brand_name: str, limit: int = 20
    ) -> List[CategoryLossStats]:
        """
        Get category breakdown of brand losses (aggregated by category only).

        Args:
            brand_name: Brand to analyze
            limit: Maximum categories to return

        Returns:
            List of category loss statistics
        """
        brand_domain_ids = await self._get_brand_domains(brand_name)
        branded_keyword_ids = await self._get_branded_keywords(brand_name)

        if not branded_keyword_ids:
            return []

        # Get keywords that are losses
        if brand_domain_ids:
            brand_wins_subq = (
                select(SerpResult.keyword_id)
                .where(
                    SerpResult.keyword_id.in_(branded_keyword_ids),
                    SerpResult.domain_id.in_(brand_domain_ids),
                    SerpResult.rank_group == 1,
                )
            )
            losses_subq = (
                select(Keyword.id, Keyword.volume)
                .where(
                    Keyword.id.in_(branded_keyword_ids),
                    ~Keyword.id.in_(brand_wins_subq),
                )
            ).subquery()
        else:
            losses_subq = (
                select(Keyword.id, Keyword.volume)
                .where(Keyword.id.in_(branded_keyword_ids))
            ).subquery()

        # Total losses for percentage calculation
        total_losses_query = select(func.count()).select_from(losses_subq)
        total_result = await self.session.execute(total_losses_query)
        total_losses = total_result.scalar() or 1

        # Group losses by category only (not by value)
        query = (
            select(
                Category.name.label("category"),
                Category.display_name,
                func.count(distinct(KeywordTag.keyword_id)).label("loss_count"),
                func.sum(losses_subq.c.volume).label("loss_volume"),
            )
            .select_from(KeywordTag)
            .join(losses_subq, KeywordTag.keyword_id == losses_subq.c.id)
            .join(Category, KeywordTag.category_id == Category.id)
            .where(Category.name != "brand")  # Exclude brand category itself
            .group_by(Category.name, Category.display_name)
            .order_by(func.sum(losses_subq.c.volume).desc())
            .limit(limit)
        )

        result = await self.session.execute(query)
        rows = result.all()

        categories = []
        for row in rows:
            category, display_name, loss_count, loss_volume = row

            # Get example keywords for this category
            example_query = (
                select(Keyword.keyword)
                .select_from(KeywordTag)
                .join(losses_subq, KeywordTag.keyword_id == losses_subq.c.id)
                .join(Keyword, KeywordTag.keyword_id == Keyword.id)
                .join(Category, KeywordTag.category_id == Category.id)
                .where(Category.name == category)
                .order_by(Keyword.volume.desc())
                .limit(5)
            )
            example_result = await self.session.execute(example_query)
            example_keywords = [r[0] for r in example_result.all()]

            categories.append(
                CategoryLossStats(
                    category=category,
                    display_name=display_name,
                    loss_count=loss_count,
                    loss_volume=loss_volume or 0,
                    percentage_of_losses=round(100 * loss_count / total_losses, 1),
                    example_keywords=example_keywords,
                )
            )

        return categories

    async def get_category_value_losses(
        self, brand_name: str, category_name: str, limit: int = 20
    ) -> List[CategoryValueLossStats]:
        """
        Get top values breakdown for a specific category where brand loses.

        Args:
            brand_name: Brand to analyze
            category_name: Category name (internal name, not display_name)
            limit: Maximum values to return

        Returns:
            List of category value loss statistics
        """
        brand_domain_ids = await self._get_brand_domains(brand_name)
        branded_keyword_ids = await self._get_branded_keywords(brand_name)

        if not branded_keyword_ids:
            return []

        # Get keywords that are losses
        if brand_domain_ids:
            brand_wins_subq = (
                select(SerpResult.keyword_id)
                .where(
                    SerpResult.keyword_id.in_(branded_keyword_ids),
                    SerpResult.domain_id.in_(brand_domain_ids),
                    SerpResult.rank_group == 1,
                )
            )
            losses_subq = (
                select(Keyword.id, Keyword.volume)
                .where(
                    Keyword.id.in_(branded_keyword_ids),
                    ~Keyword.id.in_(brand_wins_subq),
                )
            ).subquery()
        else:
            losses_subq = (
                select(Keyword.id, Keyword.volume)
                .where(Keyword.id.in_(branded_keyword_ids))
            ).subquery()

        # Get category ID
        category_result = await self.session.execute(
            select(Category.id).where(Category.name == category_name)
        )
        category_id = category_result.scalar()
        if not category_id:
            return []

        # Total losses in this category for percentage calculation
        total_category_losses_query = (
            select(func.count(distinct(KeywordTag.keyword_id)))
            .select_from(KeywordTag)
            .join(losses_subq, KeywordTag.keyword_id == losses_subq.c.id)
            .where(KeywordTag.category_id == category_id)
        )
        total_result = await self.session.execute(total_category_losses_query)
        total_category_losses = total_result.scalar() or 1

        # Group losses by value within this category
        query = (
            select(
                KeywordTag.value,
                func.count(distinct(KeywordTag.keyword_id)).label("loss_count"),
                func.sum(losses_subq.c.volume).label("loss_volume"),
            )
            .select_from(KeywordTag)
            .join(losses_subq, KeywordTag.keyword_id == losses_subq.c.id)
            .where(KeywordTag.category_id == category_id)
            .group_by(KeywordTag.value)
            .order_by(func.sum(losses_subq.c.volume).desc())
            .limit(limit)
        )

        result = await self.session.execute(query)
        rows = result.all()

        values = []
        for row in rows:
            value, loss_count, loss_volume = row
            values.append(
                CategoryValueLossStats(
                    value=value,
                    loss_count=loss_count,
                    loss_volume=loss_volume or 0,
                    percentage_of_category=round(100 * loss_count / total_category_losses, 1),
                )
            )

        return values

    async def get_losses_by_domain_type(
        self, brand_name: str
    ) -> List[DomainTypeLossStats]:
        """
        Get domain type breakdown of brand losses.

        Args:
            brand_name: Brand to analyze

        Returns:
            List of domain type loss statistics
        """
        brand_domain_ids = await self._get_brand_domains(brand_name)
        branded_keyword_ids = await self._get_branded_keywords(brand_name)

        if not branded_keyword_ids:
            return []

        # Get keywords that are losses (competitors rank #1)
        if brand_domain_ids:
            brand_wins_subq = (
                select(SerpResult.keyword_id)
                .where(
                    SerpResult.keyword_id.in_(branded_keyword_ids),
                    SerpResult.domain_id.in_(brand_domain_ids),
                    SerpResult.rank_group == 1,
                )
            )
            losses_keywords = (
                select(Keyword.id, Keyword.volume)
                .where(
                    Keyword.id.in_(branded_keyword_ids),
                    ~Keyword.id.in_(brand_wins_subq),
                )
            ).subquery()
        else:
            losses_keywords = (
                select(Keyword.id, Keyword.volume)
                .where(Keyword.id.in_(branded_keyword_ids))
            ).subquery()

        # Total losses for percentage calculation
        total_losses_query = select(func.count()).select_from(losses_keywords)
        total_result = await self.session.execute(total_losses_query)
        total_losses = total_result.scalar() or 1

        # Join with SERP results to get winners, then get domain types
        query = (
            select(
                BrandDomain.domain_type,
                func.count(distinct(SerpResult.keyword_id)).label("loss_count"),
                func.sum(losses_keywords.c.volume).label("loss_volume"),
            )
            .select_from(SerpResult)
            .join(losses_keywords, SerpResult.keyword_id == losses_keywords.c.id)
            .join(BrandDomain, SerpResult.domain_id == BrandDomain.domain_id)
            .where(SerpResult.rank_group == 1)  # Only the #1 ranked competitor
            .group_by(BrandDomain.domain_type)
            .order_by(func.sum(losses_keywords.c.volume).desc())
        )

        result = await self.session.execute(query)
        rows = result.all()

        domain_types = []
        for row in rows:
            domain_type, loss_count, loss_volume = row
            domain_types.append(
                DomainTypeLossStats(
                    domain_type=domain_type,
                    loss_count=loss_count,
                    loss_volume=loss_volume or 0,
                    percentage_of_losses=round(100 * loss_count / total_losses, 1),
                )
            )

        return domain_types

    async def get_influential_voices(
        self, brand_name: str
    ) -> List[InfluentialDomain]:
        """
        Get most influential domains for each domain type on brand keywords.

        Args:
            brand_name: Brand to analyze

        Returns:
            List of influential domains (top domain per type)
        """
        brand_domain_ids = await self._get_brand_domains(brand_name)
        branded_keyword_ids = await self._get_branded_keywords(brand_name)

        if not branded_keyword_ids:
            return []

        # Query for most influential domain per domain type
        # Influential = highest visibility (sum of volume/rank) on branded keywords
        # We'll use a window function to rank domains within each domain_type

        # First, calculate rankings and stats per domain
        domain_stats_query = (
            select(
                Domain.domain,
                BrandDomain.domain_type,
                func.count(distinct(SerpResult.keyword_id)).label("ranking_count"),
                func.sum(Keyword.volume).label("ranking_volume"),
                func.avg(SerpResult.rank_group).label("avg_position"),
                func.count(
                    case((SerpResult.rank_group == 1, 1))
                ).label("win_count"),
            )
            .select_from(SerpResult)
            .join(Keyword, SerpResult.keyword_id == Keyword.id)
            .join(Domain, SerpResult.domain_id == Domain.id)
            .join(BrandDomain, SerpResult.domain_id == BrandDomain.domain_id)
            .where(
                SerpResult.keyword_id.in_(branded_keyword_ids),
            )
        )

        # Exclude brand's own domains
        if brand_domain_ids:
            domain_stats_query = domain_stats_query.where(
                ~SerpResult.domain_id.in_(brand_domain_ids)
            )

        domain_stats_query = (
            domain_stats_query
            .group_by(Domain.domain, BrandDomain.domain_type)
            .order_by(func.sum(Keyword.volume).desc())
        )

        result = await self.session.execute(domain_stats_query)
        rows = result.all()

        # Get top 10 most influential domains by ranking volume
        influential_domains: List[InfluentialDomain] = []
        for row in rows[:10]:  # Take top 10 domains by ranking volume
            domain, domain_type, ranking_count, ranking_volume, avg_position, win_count = row

            influential_domains.append(
                InfluentialDomain(
                    domain=domain,
                    domain_type=domain_type,
                    ranking_count=ranking_count,
                    ranking_volume=ranking_volume or 0,
                    avg_position=round(avg_position, 2) if avg_position else 0,
                    win_count=win_count,
                )
            )

        return influential_domains

    async def get_modifier_group_stats(
        self, brand_name: str
    ) -> List[ModifierGroupStats]:
        """
        Get statistics for each modifier group value on brand keywords.

        Args:
            brand_name: Brand to analyze

        Returns:
            List of modifier group statistics
        """
        brand_domain_ids = await self._get_brand_domains(brand_name)
        branded_keyword_ids = await self._get_branded_keywords(brand_name)

        if not branded_keyword_ids:
            return []

        # Get all keywords with their modifier groups
        keywords_query = (
            select(
                Keyword.id,
                Keyword.modifier_group,
                Keyword.volume,
            )
            .where(Keyword.id.in_(branded_keyword_ids))
        )
        result = await self.session.execute(keywords_query)
        keywords_data = {row[0]: {"modifier_group": row[1], "volume": row[2]} for row in result.all()}

        # Group by modifier group
        modifier_groups: Dict[str, Dict[str, Any]] = {}

        for keyword_id, data in keywords_data.items():
            mg = data["modifier_group"] or "No Modifier Group"
            if mg not in modifier_groups:
                modifier_groups[mg] = {
                    "keyword_ids": [],
                    "total_volume": 0,
                    "win_keyword_ids": set(),
                    "brand_positions": [],
                }
            modifier_groups[mg]["keyword_ids"].append(keyword_id)
            modifier_groups[mg]["total_volume"] += data["volume"]

        # Get wins for each modifier group
        if brand_domain_ids:
            wins_query = (
                select(SerpResult.keyword_id)
                .where(
                    SerpResult.keyword_id.in_(branded_keyword_ids),
                    SerpResult.domain_id.in_(brand_domain_ids),
                    SerpResult.rank_group == 1,
                )
            )
            wins_result = await self.session.execute(wins_query)
            winning_keyword_ids = {row[0] for row in wins_result.all()}

            # Get brand positions for all branded keywords
            positions_query = (
                select(SerpResult.keyword_id, SerpResult.rank_group)
                .where(
                    SerpResult.keyword_id.in_(branded_keyword_ids),
                    SerpResult.domain_id.in_(brand_domain_ids),
                )
            )
            positions_result = await self.session.execute(positions_query)
            brand_positions = {row[0]: row[1] for row in positions_result.all()}
        else:
            winning_keyword_ids = set()
            brand_positions = {}

        # Calculate stats for each modifier group
        stats_list = []
        for mg, data in modifier_groups.items():
            keyword_ids = data["keyword_ids"]
            total_keywords = len(keyword_ids)

            # Count wins
            wins = [kid for kid in keyword_ids if kid in winning_keyword_ids]
            keywords_winning = len(wins)
            keywords_losing = total_keywords - keywords_winning

            # Calculate volume
            volume_winning = sum(keywords_data[kid]["volume"] for kid in wins)
            volume_losing = data["total_volume"] - volume_winning

            # Calculate average brand position
            positions = [brand_positions[kid] for kid in keyword_ids if kid in brand_positions]
            avg_position = round(sum(positions) / len(positions), 1) if positions else None

            # Calculate win rate
            win_rate = round(100 * keywords_winning / total_keywords, 1) if total_keywords > 0 else 0

            # Get top tags for this modifier group
            tags_query = (
                select(Category.name, KeywordTag.value, func.count(KeywordTag.keyword_id))
                .select_from(KeywordTag)
                .join(Category, KeywordTag.category_id == Category.id)
                .where(
                    KeywordTag.keyword_id.in_(keyword_ids),
                    Category.name != "brand",
                )
                .group_by(Category.name, KeywordTag.value)
                .order_by(func.count(KeywordTag.keyword_id).desc())
                .limit(5)
            )
            tags_result = await self.session.execute(tags_query)
            top_tags = {f"{row[0]}:{row[1]}": row[2] for row in tags_result.all()}

            # Get example keywords for this modifier group
            example_query = (
                select(Keyword.keyword)
                .where(Keyword.id.in_(keyword_ids))
                .order_by(Keyword.volume.desc())
                .limit(5)
            )
            example_result = await self.session.execute(example_query)
            example_keywords = [r[0] for r in example_result.all()]

            stats_list.append(
                ModifierGroupStats(
                    modifier_group=mg,
                    total_keywords=total_keywords,
                    total_volume=data["total_volume"],
                    keywords_winning=keywords_winning,
                    keywords_losing=keywords_losing,
                    volume_winning=volume_winning,
                    volume_losing=volume_losing,
                    avg_brand_position=avg_position,
                    win_rate=win_rate,
                    top_tags=top_tags,
                    example_keywords=example_keywords,
                )
            )

        # Sort by total volume descending
        stats_list.sort(key=lambda x: x.total_volume, reverse=True)

        return stats_list

    async def get_category_protection_breakdown(
        self, brand_name: str, category_name: str, value_limit: int = 10
    ) -> CategoryProtectionBreakdown:
        """
        Get full breakdown for a category in brand protection context.
        Includes win/loss split, top values, competitors by type, and loss distribution.

        Args:
            brand_name: Brand to analyze
            category_name: Category internal name
            value_limit: Maximum values to return

        Returns:
            CategoryProtectionBreakdown with complete data
        """
        brand_domain_ids = await self._get_brand_domains(brand_name)
        branded_keyword_ids = await self._get_branded_keywords(brand_name)

        if not branded_keyword_ids:
            return CategoryProtectionBreakdown(
                category_name=category_name,
                display_name=category_name,
            )

        # Get category info
        category_result = await self.session.execute(
            select(Category.id, Category.display_name).where(Category.name == category_name)
        )
        category_row = category_result.first()
        if not category_row:
            return CategoryProtectionBreakdown(
                category_name=category_name,
                display_name=category_name,
            )
        category_id, display_name = category_row

        # Get branded keywords with this category
        category_keywords_query = (
            select(KeywordTag.keyword_id)
            .where(
                KeywordTag.category_id == category_id,
                KeywordTag.keyword_id.in_(branded_keyword_ids),
            )
        )
        category_keywords_result = await self.session.execute(category_keywords_query)
        category_keyword_ids = [row[0] for row in category_keywords_result.all()]

        if not category_keyword_ids:
            return CategoryProtectionBreakdown(
                category_name=category_name,
                display_name=display_name,
            )

        # Get total keywords and volume for this category
        totals_query = (
            select(
                func.count(Keyword.id).label("total"),
                func.sum(Keyword.volume).label("volume"),
            ).where(Keyword.id.in_(category_keyword_ids))
        )
        totals_result = await self.session.execute(totals_query)
        totals_row = totals_result.one()
        total_keywords = totals_row[0] or 0
        total_volume = totals_row[1] or 0

        # Get winning keyword IDs
        if brand_domain_ids:
            wins_query = (
                select(SerpResult.keyword_id)
                .where(
                    SerpResult.keyword_id.in_(category_keyword_ids),
                    SerpResult.domain_id.in_(brand_domain_ids),
                    SerpResult.rank_group == 1,
                )
            )
            wins_result = await self.session.execute(wins_query)
            winning_keyword_ids = set(row[0] for row in wins_result.all())
        else:
            winning_keyword_ids = set()

        # Calculate overall stats
        keywords_winning = len(winning_keyword_ids)
        keywords_losing = total_keywords - keywords_winning

        # Get volume for wins
        if winning_keyword_ids:
            win_volume_query = (
                select(func.sum(Keyword.volume))
                .where(Keyword.id.in_(winning_keyword_ids))
            )
            win_volume_result = await self.session.execute(win_volume_query)
            volume_winning = win_volume_result.scalar() or 0
        else:
            volume_winning = 0
        volume_losing = total_volume - volume_winning

        win_rate = round(100 * keywords_winning / total_keywords, 1) if total_keywords > 0 else 0.0

        # Get average brand position
        if brand_domain_ids:
            avg_pos_query = (
                select(func.avg(SerpResult.rank_group))
                .where(
                    SerpResult.keyword_id.in_(category_keyword_ids),
                    SerpResult.domain_id.in_(brand_domain_ids),
                )
            )
            avg_pos_result = await self.session.execute(avg_pos_query)
            avg_brand_position = avg_pos_result.scalar()
            if avg_brand_position:
                avg_brand_position = round(avg_brand_position, 1)
        else:
            avg_brand_position = None

        # Get top values with win/loss breakdown
        values_query = (
            select(
                KeywordTag.value,
                func.count(distinct(KeywordTag.keyword_id)).label("count"),
            )
            .where(
                KeywordTag.category_id == category_id,
                KeywordTag.keyword_id.in_(category_keyword_ids),
            )
            .group_by(KeywordTag.value)
            .order_by(func.count(distinct(KeywordTag.keyword_id)).desc())
            .limit(value_limit)
        )
        values_result = await self.session.execute(values_query)
        top_values_data = values_result.all()

        top_values = []
        for value_row in top_values_data:
            value_name = value_row[0]

            # Get keyword IDs for this value
            value_kw_query = (
                select(KeywordTag.keyword_id)
                .where(
                    KeywordTag.category_id == category_id,
                    KeywordTag.value == value_name,
                    KeywordTag.keyword_id.in_(category_keyword_ids),
                )
            )
            value_kw_result = await self.session.execute(value_kw_query)
            value_keyword_ids = [r[0] for r in value_kw_result.all()]

            # Get volume for this value
            value_volume_query = (
                select(
                    func.count(Keyword.id),
                    func.sum(Keyword.volume),
                ).where(Keyword.id.in_(value_keyword_ids))
            )
            value_volume_result = await self.session.execute(value_volume_query)
            val_row = value_volume_result.one()
            value_total_keywords = val_row[0] or 0
            value_total_volume = val_row[1] or 0

            # Count wins for this value
            value_winning_ids = [kid for kid in value_keyword_ids if kid in winning_keyword_ids]
            value_keywords_winning = len(value_winning_ids)
            value_keywords_losing = value_total_keywords - value_keywords_winning

            # Get volume won
            if value_winning_ids:
                value_win_vol_query = (
                    select(func.sum(Keyword.volume))
                    .where(Keyword.id.in_(value_winning_ids))
                )
                value_win_vol_result = await self.session.execute(value_win_vol_query)
                value_volume_winning = value_win_vol_result.scalar() or 0
            else:
                value_volume_winning = 0
            value_volume_losing = value_total_volume - value_volume_winning

            value_win_rate = round(100 * value_keywords_winning / value_total_keywords, 1) if value_total_keywords > 0 else 0.0

            # Get average position for this value
            if brand_domain_ids:
                value_pos_query = (
                    select(func.avg(SerpResult.rank_group))
                    .where(
                        SerpResult.keyword_id.in_(value_keyword_ids),
                        SerpResult.domain_id.in_(brand_domain_ids),
                    )
                )
                value_pos_result = await self.session.execute(value_pos_query)
                value_avg_position = value_pos_result.scalar()
                if value_avg_position:
                    value_avg_position = round(value_avg_position, 1)
            else:
                value_avg_position = None

            # Get example winners (brand ranks #1)
            example_winners = []
            if value_winning_ids:
                winners_query = (
                    select(Keyword.keyword, Keyword.volume, SerpResult.url)
                    .select_from(Keyword)
                    .join(SerpResult, and_(
                        SerpResult.keyword_id == Keyword.id,
                        SerpResult.rank_group == 1,
                    ))
                    .where(
                        Keyword.id.in_(value_winning_ids),
                        SerpResult.domain_id.in_(brand_domain_ids) if brand_domain_ids else True,
                    )
                    .order_by(Keyword.volume.desc())
                    .limit(3)
                )
                winners_result = await self.session.execute(winners_query)
                for w_row in winners_result.all():
                    example_winners.append(ExampleWinnerKeyword(
                        keyword=w_row[0],
                        volume=w_row[1],
                        url=w_row[2],
                    ))

            # Get example losers
            example_losers = []
            losing_value_ids = [kid for kid in value_keyword_ids if kid not in winning_keyword_ids]
            if losing_value_ids:
                losers_query = (
                    select(Keyword.keyword, Keyword.volume, Domain.domain, SerpResult.rank_group)
                    .select_from(Keyword)
                    .join(SerpResult, and_(
                        SerpResult.keyword_id == Keyword.id,
                        SerpResult.rank_group == 1,
                    ))
                    .join(Domain, SerpResult.domain_id == Domain.id)
                    .where(Keyword.id.in_(losing_value_ids))
                    .order_by(Keyword.volume.desc())
                    .limit(3)
                )
                losers_result = await self.session.execute(losers_query)
                for l_row in losers_result.all():
                    example_losers.append(ExampleLoserKeyword(
                        keyword=l_row[0],
                        volume=l_row[1],
                        winner_domain=l_row[2],
                        winner_position=l_row[3],
                    ))

            top_values.append(CategoryValueProtectionStats(
                value=value_name,
                total_keywords=value_total_keywords,
                total_volume=value_total_volume,
                keywords_winning=value_keywords_winning,
                keywords_losing=value_keywords_losing,
                volume_winning=value_volume_winning,
                volume_losing=value_volume_losing,
                win_rate=value_win_rate,
                avg_brand_position=value_avg_position,
                example_winners=example_winners,
                example_losers=example_losers,
            ))

        # Get competitors by domain type for this category
        losing_keyword_ids = [kid for kid in category_keyword_ids if kid not in winning_keyword_ids]
        competitors_by_type: Dict[str, List[CategoryCompetitor]] = {}

        if losing_keyword_ids:
            competitors_query = (
                select(
                    Domain.domain,
                    BrandDomain.domain_type,
                    func.count(distinct(SerpResult.keyword_id)).label("wins_count"),
                    func.sum(Keyword.volume).label("wins_volume"),
                    func.avg(SerpResult.rank_group).label("avg_position"),
                )
                .select_from(SerpResult)
                .join(Domain, SerpResult.domain_id == Domain.id)
                .join(Keyword, SerpResult.keyword_id == Keyword.id)
                .outerjoin(BrandDomain, Domain.id == BrandDomain.domain_id)
                .where(
                    SerpResult.keyword_id.in_(losing_keyword_ids),
                    SerpResult.rank_group == 1,
                )
            )
            if brand_domain_ids:
                competitors_query = competitors_query.where(~SerpResult.domain_id.in_(brand_domain_ids))

            competitors_query = (
                competitors_query
                .group_by(Domain.domain, BrandDomain.domain_type)
                .order_by(func.sum(Keyword.volume).desc())
            )
            competitors_result = await self.session.execute(competitors_query)

            for comp_row in competitors_result.all():
                domain, domain_type, wins_count, wins_volume, avg_pos = comp_row
                dtype = domain_type or "Unknown"
                if dtype not in competitors_by_type:
                    competitors_by_type[dtype] = []
                if len(competitors_by_type[dtype]) < 5:  # Top 5 per type
                    competitors_by_type[dtype].append(CategoryCompetitor(
                        domain=domain,
                        domain_type=dtype,
                        wins_count=wins_count,
                        wins_volume=wins_volume or 0,
                        avg_position=round(avg_pos, 1) if avg_pos else 0.0,
                    ))

        # Get loss distribution by domain type
        loss_distribution: List[DomainTypeLossDetail] = []
        if losing_keyword_ids:
            dist_query = (
                select(
                    BrandDomain.domain_type,
                    func.count(distinct(SerpResult.keyword_id)).label("loss_count"),
                    func.sum(Keyword.volume).label("loss_volume"),
                )
                .select_from(SerpResult)
                .join(Keyword, SerpResult.keyword_id == Keyword.id)
                .join(BrandDomain, SerpResult.domain_id == BrandDomain.domain_id)
                .where(
                    SerpResult.keyword_id.in_(losing_keyword_ids),
                    SerpResult.rank_group == 1,
                )
                .group_by(BrandDomain.domain_type)
                .order_by(func.sum(Keyword.volume).desc())
            )
            dist_result = await self.session.execute(dist_query)
            total_loss_count = len(losing_keyword_ids)
            for dist_row in dist_result.all():
                dtype, loss_count, loss_volume = dist_row
                loss_distribution.append(DomainTypeLossDetail(
                    domain_type=dtype,
                    loss_count=loss_count,
                    loss_volume=loss_volume or 0,
                    percentage=round(100 * loss_count / total_loss_count, 1) if total_loss_count > 0 else 0.0,
                ))

        return CategoryProtectionBreakdown(
            category_name=category_name,
            display_name=display_name,
            total_keywords=total_keywords,
            total_volume=total_volume,
            keywords_winning=keywords_winning,
            keywords_losing=keywords_losing,
            volume_winning=volume_winning,
            volume_losing=volume_losing,
            win_rate=win_rate,
            avg_brand_position=avg_brand_position,
            top_values=top_values,
            competitors_by_type=competitors_by_type,
            loss_distribution_by_type=loss_distribution,
        )

    async def get_modifier_group_protection_breakdown(
        self, brand_name: str, modifier_group: str, limit: int = 10
    ) -> ModifierGroupProtectionBreakdown:
        """
        Get full breakdown for a modifier group in brand protection context.
        Includes win/loss split, top tags, competitors by type, and loss distribution.

        Args:
            brand_name: Brand to analyze
            modifier_group: Modifier group name
            limit: Maximum tags to return

        Returns:
            ModifierGroupProtectionBreakdown with complete data
        """
        brand_domain_ids = await self._get_brand_domains(brand_name)
        branded_keyword_ids = await self._get_branded_keywords(brand_name)

        if not branded_keyword_ids:
            return ModifierGroupProtectionBreakdown(modifier_group=modifier_group)

        # Get branded keywords with this modifier group
        mg_value = modifier_group if modifier_group != "No Modifier Group" else None
        if mg_value:
            mg_keywords_query = (
                select(Keyword.id)
                .where(
                    Keyword.id.in_(branded_keyword_ids),
                    Keyword.modifier_group == mg_value,
                )
            )
        else:
            mg_keywords_query = (
                select(Keyword.id)
                .where(
                    Keyword.id.in_(branded_keyword_ids),
                    or_(Keyword.modifier_group == None, Keyword.modifier_group == ""),
                )
            )
        mg_keywords_result = await self.session.execute(mg_keywords_query)
        mg_keyword_ids = [row[0] for row in mg_keywords_result.all()]

        if not mg_keyword_ids:
            return ModifierGroupProtectionBreakdown(modifier_group=modifier_group)

        # Get total keywords and volume
        totals_query = (
            select(
                func.count(Keyword.id),
                func.sum(Keyword.volume),
            ).where(Keyword.id.in_(mg_keyword_ids))
        )
        totals_result = await self.session.execute(totals_query)
        totals_row = totals_result.one()
        total_keywords = totals_row[0] or 0
        total_volume = totals_row[1] or 0

        # Get winning keyword IDs
        if brand_domain_ids:
            wins_query = (
                select(SerpResult.keyword_id)
                .where(
                    SerpResult.keyword_id.in_(mg_keyword_ids),
                    SerpResult.domain_id.in_(brand_domain_ids),
                    SerpResult.rank_group == 1,
                )
            )
            wins_result = await self.session.execute(wins_query)
            winning_keyword_ids = set(row[0] for row in wins_result.all())
        else:
            winning_keyword_ids = set()

        keywords_winning = len(winning_keyword_ids)
        keywords_losing = total_keywords - keywords_winning

        # Get volume for wins
        if winning_keyword_ids:
            win_volume_query = (
                select(func.sum(Keyword.volume))
                .where(Keyword.id.in_(winning_keyword_ids))
            )
            win_volume_result = await self.session.execute(win_volume_query)
            volume_winning = win_volume_result.scalar() or 0
        else:
            volume_winning = 0
        volume_losing = total_volume - volume_winning

        win_rate = round(100 * keywords_winning / total_keywords, 1) if total_keywords > 0 else 0.0

        # Get average brand position
        if brand_domain_ids:
            avg_pos_query = (
                select(func.avg(SerpResult.rank_group))
                .where(
                    SerpResult.keyword_id.in_(mg_keyword_ids),
                    SerpResult.domain_id.in_(brand_domain_ids),
                )
            )
            avg_pos_result = await self.session.execute(avg_pos_query)
            avg_brand_position = avg_pos_result.scalar()
            if avg_brand_position:
                avg_brand_position = round(avg_brand_position, 1)
        else:
            avg_brand_position = None

        # Get top tags with win rates
        tags_query = (
            select(
                Category.name,
                KeywordTag.value,
                func.count(distinct(KeywordTag.keyword_id)).label("count"),
            )
            .select_from(KeywordTag)
            .join(Category, KeywordTag.category_id == Category.id)
            .where(
                KeywordTag.keyword_id.in_(mg_keyword_ids),
                Category.name != "brand",
            )
            .group_by(Category.name, KeywordTag.value)
            .order_by(func.count(distinct(KeywordTag.keyword_id)).desc())
            .limit(limit)
        )
        tags_result = await self.session.execute(tags_query)
        top_tags_data = tags_result.all()

        top_tags = []
        for tag_row in top_tags_data:
            cat_name, value, count = tag_row
            tag_name = f"{cat_name}:{value}"

            # Calculate win rate for this tag
            tag_kw_query = (
                select(KeywordTag.keyword_id)
                .join(Category, KeywordTag.category_id == Category.id)
                .where(
                    Category.name == cat_name,
                    KeywordTag.value == value,
                    KeywordTag.keyword_id.in_(mg_keyword_ids),
                )
            )
            tag_kw_result = await self.session.execute(tag_kw_query)
            tag_keyword_ids = [r[0] for r in tag_kw_result.all()]
            tag_wins = sum(1 for kid in tag_keyword_ids if kid in winning_keyword_ids)
            tag_win_rate = round(100 * tag_wins / len(tag_keyword_ids), 1) if tag_keyword_ids else 0.0

            top_tags.append(TagProtectionStats(
                tag=tag_name,
                count=count,
                win_rate=tag_win_rate,
            ))

        # Get competitors by domain type
        losing_keyword_ids = [kid for kid in mg_keyword_ids if kid not in winning_keyword_ids]
        competitors_by_type: Dict[str, List[CategoryCompetitor]] = {}

        if losing_keyword_ids:
            competitors_query = (
                select(
                    Domain.domain,
                    BrandDomain.domain_type,
                    func.count(distinct(SerpResult.keyword_id)).label("wins_count"),
                    func.sum(Keyword.volume).label("wins_volume"),
                    func.avg(SerpResult.rank_group).label("avg_position"),
                )
                .select_from(SerpResult)
                .join(Domain, SerpResult.domain_id == Domain.id)
                .join(Keyword, SerpResult.keyword_id == Keyword.id)
                .outerjoin(BrandDomain, Domain.id == BrandDomain.domain_id)
                .where(
                    SerpResult.keyword_id.in_(losing_keyword_ids),
                    SerpResult.rank_group == 1,
                )
            )
            if brand_domain_ids:
                competitors_query = competitors_query.where(~SerpResult.domain_id.in_(brand_domain_ids))

            competitors_query = (
                competitors_query
                .group_by(Domain.domain, BrandDomain.domain_type)
                .order_by(func.sum(Keyword.volume).desc())
            )
            competitors_result = await self.session.execute(competitors_query)

            for comp_row in competitors_result.all():
                domain, domain_type, wins_count, wins_volume, avg_pos = comp_row
                dtype = domain_type or "Unknown"
                if dtype not in competitors_by_type:
                    competitors_by_type[dtype] = []
                if len(competitors_by_type[dtype]) < 5:
                    competitors_by_type[dtype].append(CategoryCompetitor(
                        domain=domain,
                        domain_type=dtype,
                        wins_count=wins_count,
                        wins_volume=wins_volume or 0,
                        avg_position=round(avg_pos, 1) if avg_pos else 0.0,
                    ))

        # Get loss distribution by domain type
        loss_distribution: List[DomainTypeLossDetail] = []
        if losing_keyword_ids:
            dist_query = (
                select(
                    BrandDomain.domain_type,
                    func.count(distinct(SerpResult.keyword_id)).label("loss_count"),
                    func.sum(Keyword.volume).label("loss_volume"),
                )
                .select_from(SerpResult)
                .join(Keyword, SerpResult.keyword_id == Keyword.id)
                .join(BrandDomain, SerpResult.domain_id == BrandDomain.domain_id)
                .where(
                    SerpResult.keyword_id.in_(losing_keyword_ids),
                    SerpResult.rank_group == 1,
                )
                .group_by(BrandDomain.domain_type)
                .order_by(func.sum(Keyword.volume).desc())
            )
            dist_result = await self.session.execute(dist_query)
            total_loss_count = len(losing_keyword_ids)
            for dist_row in dist_result.all():
                dtype, loss_count, loss_volume = dist_row
                loss_distribution.append(DomainTypeLossDetail(
                    domain_type=dtype,
                    loss_count=loss_count,
                    loss_volume=loss_volume or 0,
                    percentage=round(100 * loss_count / total_loss_count, 1) if total_loss_count > 0 else 0.0,
                ))

        # Get example winners
        example_winners = []
        if winning_keyword_ids and brand_domain_ids:
            winners_query = (
                select(Keyword.keyword, Keyword.volume, SerpResult.url)
                .select_from(Keyword)
                .join(SerpResult, and_(
                    SerpResult.keyword_id == Keyword.id,
                    SerpResult.rank_group == 1,
                    SerpResult.domain_id.in_(brand_domain_ids),
                ))
                .where(Keyword.id.in_(winning_keyword_ids))
                .order_by(Keyword.volume.desc())
                .limit(5)
            )
            winners_result = await self.session.execute(winners_query)
            for w_row in winners_result.all():
                example_winners.append(ExampleWinnerKeyword(
                    keyword=w_row[0],
                    volume=w_row[1],
                    url=w_row[2],
                ))

        # Get example losers
        example_losers = []
        if losing_keyword_ids:
            losers_query = (
                select(Keyword.keyword, Keyword.volume, Domain.domain, SerpResult.rank_group)
                .select_from(Keyword)
                .join(SerpResult, and_(
                    SerpResult.keyword_id == Keyword.id,
                    SerpResult.rank_group == 1,
                ))
                .join(Domain, SerpResult.domain_id == Domain.id)
                .where(Keyword.id.in_(losing_keyword_ids))
                .order_by(Keyword.volume.desc())
                .limit(5)
            )
            losers_result = await self.session.execute(losers_query)
            for l_row in losers_result.all():
                example_losers.append(ExampleLoserKeyword(
                    keyword=l_row[0],
                    volume=l_row[1],
                    winner_domain=l_row[2],
                    winner_position=l_row[3],
                ))

        return ModifierGroupProtectionBreakdown(
            modifier_group=modifier_group,
            total_keywords=total_keywords,
            total_volume=total_volume,
            keywords_winning=keywords_winning,
            keywords_losing=keywords_losing,
            volume_winning=volume_winning,
            volume_losing=volume_losing,
            win_rate=win_rate,
            avg_brand_position=avg_brand_position,
            top_tags=top_tags,
            competitors_by_type=competitors_by_type,
            loss_distribution_by_type=loss_distribution,
            example_winners=example_winners,
            example_losers=example_losers,
        )

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
        # Get brand domains
        brand_domain_ids = await self._get_brand_domains(brand_name)
        brand_domains = []
        if brand_domain_ids:
            result = await self.session.execute(
                select(Domain.domain).where(Domain.id.in_(brand_domain_ids))
            )
            brand_domains = [row[0] for row in result.all()]

        # Get all dashboard components
        kpis = await self.get_brand_protection_kpis(brand_name)
        wins, _ = await self.get_brand_wins(brand_name, limit=50)
        losses, _ = await self.get_brand_losses(brand_name, limit=50)
        competitors = await self.get_top_competitors(brand_name)
        losses_by_category = await self.get_losses_by_category(brand_name)
        losses_by_domain_type = await self.get_losses_by_domain_type(brand_name)
        influential_voices = await self.get_influential_voices(brand_name)

        return BrandProtectionDashboard(
            brand_name=brand_name,
            brand_domains=brand_domains,
            kpis=kpis,
            wins=wins,
            losses=losses,
            top_competitors=competitors,
            losses_by_category=losses_by_category,
            losses_by_domain_type=losses_by_domain_type,
            influential_voices=influential_voices,
        )

    # =========================================================================
    # Category Opportunities Methods
    # =========================================================================

    def _get_nonbranded_keywords_subquery(self, brand_category_id: int):
        """
        Get a subquery that selects non-branded keyword IDs.

        Returns a subquery (not a list) to avoid SQLite's parameter limit
        when dealing with large datasets. This subquery can be JOINed
        with other tables efficiently.

        Args:
            brand_category_id: The category ID for 'brand' tags

        Returns:
            SQLAlchemy subquery selecting keyword IDs without brand tags
        """
        # Keywords that HAVE a brand tag
        branded_subq = select(KeywordTag.keyword_id).where(
            KeywordTag.category_id == brand_category_id
        )

        # Non-branded = NOT in branded set
        # Return as subquery for use in JOINs
        return select(Keyword.id.label("id")).where(
            ~Keyword.id.in_(branded_subq)
        ).subquery("nonbranded_keywords")

    async def get_category_opportunities(
        self, brand_name: str, limit_competitors: int = 5
    ) -> CategoryOpportunityDashboard:
        """
        Get non-branded keyword opportunities for a brand.

        Analyzes keywords without brand tags to show where the brand
        can capture market share in generic/category searches.

        Uses subquery-based JOINs to avoid SQLite's parameter limit
        when dealing with large datasets (~74,000+ non-branded keywords).

        Args:
            brand_name: Brand to analyze
            limit_competitors: Max competitors per modifier group

        Returns:
            CategoryOpportunityDashboard with opportunities
        """
        # Get brand category ID first (needed for subquery)
        brand_category_id = await self._get_brand_category_id()

        # Get brand's domain IDs
        brand_domain_ids = await self._get_brand_domains(brand_name)
        brand_domains = []
        if brand_domain_ids:
            result = await self.session.execute(
                select(Domain.domain).where(Domain.id.in_(brand_domain_ids))
            )
            brand_domains = [row[0] for row in result.all()]

        # Get non-branded keywords subquery (not a list, to avoid parameter limits)
        nonbranded_subq = self._get_nonbranded_keywords_subquery(brand_category_id)

        # Check if we have any non-branded keywords
        count_result = await self.session.execute(
            select(func.count()).select_from(nonbranded_subq)
        )
        total_nonbranded = count_result.scalar() or 0

        if total_nonbranded == 0:
            return CategoryOpportunityDashboard(
                brand_name=brand_name,
                brand_domains=brand_domains,
                kpis=CategoryOpportunityKPIs(),
                modifier_groups=[],
            )

        # Calculate KPIs using subquery JOIN
        kpis = await self._calculate_opportunity_kpis(
            nonbranded_subq, brand_domain_ids, brand_category_id
        )

        # Get modifier group opportunities using subquery JOIN
        modifier_groups = await self._get_modifier_group_opportunities(
            nonbranded_subq, brand_domain_ids, brand_category_id, limit_competitors
        )

        # Update KPIs with biggest opportunity
        if modifier_groups:
            biggest = max(modifier_groups, key=lambda x: x.volume_uncaptured)
            kpis.biggest_opportunity_group = biggest.modifier_group
            kpis.biggest_opportunity_volume = biggest.volume_uncaptured

        return CategoryOpportunityDashboard(
            brand_name=brand_name,
            brand_domains=brand_domains,
            kpis=kpis,
            modifier_groups=modifier_groups,
        )

    async def _calculate_opportunity_kpis(
        self, nonbranded_subq, brand_domain_ids: List[int], brand_category_id: int
    ) -> CategoryOpportunityKPIs:
        """
        Calculate KPIs for category opportunities.

        Uses subquery JOIN instead of .in_() to avoid SQLite parameter limits.

        Args:
            nonbranded_subq: Subquery selecting non-branded keyword IDs
            brand_domain_ids: Brand's domain IDs
            brand_category_id: Brand category ID (unused but kept for consistency)

        Returns:
            CategoryOpportunityKPIs
        """
        # Get total keywords and volume using JOIN with subquery
        result = await self.session.execute(
            select(
                func.count(Keyword.id).label("total_keywords"),
                func.sum(Keyword.volume).label("total_volume"),
            )
            .select_from(Keyword)
            .join(nonbranded_subq, Keyword.id == nonbranded_subq.c.id)
        )
        row = result.one()
        total_keywords = row[0] or 0
        total_volume = row[1] or 0

        if not brand_domain_ids or total_keywords == 0:
            return CategoryOpportunityKPIs(
                total_nonbranded_keywords=total_keywords,
                total_nonbranded_volume=total_volume,
                keywords_captured=0,
                volume_captured=0,
                keywords_uncaptured=total_keywords,
                volume_uncaptured=total_volume,
                overall_capture_rate=0.0,
                volume_capture_rate=0.0,
            )

        # Count keywords where brand ranks #1 using JOIN with subquery
        captured_query = (
            select(
                func.count(distinct(SerpResult.keyword_id)).label("captured_count"),
                func.sum(Keyword.volume).label("captured_volume"),
            )
            .select_from(SerpResult)
            .join(Keyword, SerpResult.keyword_id == Keyword.id)
            .join(nonbranded_subq, SerpResult.keyword_id == nonbranded_subq.c.id)
            .where(
                SerpResult.domain_id.in_(brand_domain_ids),
                SerpResult.rank_group == 1,
            )
        )
        result = await self.session.execute(captured_query)
        row = result.one()
        keywords_captured = row[0] or 0
        volume_captured = row[1] or 0

        keywords_uncaptured = total_keywords - keywords_captured
        volume_uncaptured = total_volume - volume_captured

        overall_capture_rate = (
            round(100 * keywords_captured / total_keywords, 1)
            if total_keywords > 0
            else 0.0
        )
        volume_capture_rate = (
            round(100 * volume_captured / total_volume, 1)
            if total_volume > 0
            else 0.0
        )

        return CategoryOpportunityKPIs(
            total_nonbranded_keywords=total_keywords,
            total_nonbranded_volume=total_volume,
            keywords_captured=keywords_captured,
            volume_captured=volume_captured,
            keywords_uncaptured=keywords_uncaptured,
            volume_uncaptured=volume_uncaptured,
            overall_capture_rate=overall_capture_rate,
            volume_capture_rate=volume_capture_rate,
        )

    async def _get_modifier_group_opportunities(
        self,
        nonbranded_subq,
        brand_domain_ids: List[int],
        brand_category_id: int,
        limit_competitors: int = 5,
    ) -> List[ModifierGroupOpportunity]:
        """
        Get opportunity metrics for each modifier group on non-branded keywords.

        Uses subquery JOIN instead of .in_() to avoid SQLite parameter limits.

        Args:
            nonbranded_subq: Subquery selecting non-branded keyword IDs
            brand_domain_ids: Brand's domain IDs
            brand_category_id: Brand category ID for tag filtering
            limit_competitors: Max competitors per group

        Returns:
            List of ModifierGroupOpportunity sorted by uncaptured volume
        """
        # Get all keywords with their modifier groups using JOIN with subquery
        result = await self.session.execute(
            select(Keyword.id, Keyword.modifier_group, Keyword.volume, Keyword.keyword)
            .select_from(Keyword)
            .join(nonbranded_subq, Keyword.id == nonbranded_subq.c.id)
        )
        keywords_data = {
            row[0]: {
                "modifier_group": row[1] or "No Modifier Group",
                "volume": row[2],
                "keyword": row[3],
            }
            for row in result.all()
        }

        if not keywords_data:
            return []

        # Get keywords where brand ranks #1 (captured) using JOIN with subquery
        captured_keyword_ids = set()
        if brand_domain_ids:
            result = await self.session.execute(
                select(SerpResult.keyword_id)
                .select_from(SerpResult)
                .join(nonbranded_subq, SerpResult.keyword_id == nonbranded_subq.c.id)
                .where(
                    SerpResult.domain_id.in_(brand_domain_ids),
                    SerpResult.rank_group == 1,
                )
            )
            captured_keyword_ids = {row[0] for row in result.all()}

        # Get brand's average position on non-branded keywords using JOIN
        brand_positions: Dict[int, float] = {}
        if brand_domain_ids:
            result = await self.session.execute(
                select(SerpResult.keyword_id, func.min(SerpResult.rank_group))
                .select_from(SerpResult)
                .join(nonbranded_subq, SerpResult.keyword_id == nonbranded_subq.c.id)
                .where(
                    SerpResult.domain_id.in_(brand_domain_ids),
                )
                .group_by(SerpResult.keyword_id)
            )
            brand_positions = {row[0]: row[1] for row in result.all()}

        # Group keywords by modifier_group
        modifier_groups: Dict[str, Dict[str, Any]] = {}
        for kw_id, data in keywords_data.items():
            mg = data["modifier_group"]
            if mg not in modifier_groups:
                modifier_groups[mg] = {
                    "keyword_ids": [],
                    "total_volume": 0,
                    "captured_keyword_ids": set(),
                    "volume_captured": 0,
                    "brand_positions": [],
                    "example_keywords": [],
                }

            modifier_groups[mg]["keyword_ids"].append(kw_id)
            modifier_groups[mg]["total_volume"] += data["volume"]

            if kw_id in captured_keyword_ids:
                modifier_groups[mg]["captured_keyword_ids"].add(kw_id)
                modifier_groups[mg]["volume_captured"] += data["volume"]

            if kw_id in brand_positions:
                modifier_groups[mg]["brand_positions"].append(brand_positions[kw_id])

            # Collect example keywords (up to 5)
            if len(modifier_groups[mg]["example_keywords"]) < 5:
                modifier_groups[mg]["example_keywords"].append(data["keyword"])

        # Build ModifierGroupOpportunity objects
        opportunities = []
        for mg_name, mg_data in modifier_groups.items():
            total_keywords = len(mg_data["keyword_ids"])
            keywords_captured = len(mg_data["captured_keyword_ids"])
            keywords_uncaptured = total_keywords - keywords_captured
            volume_uncaptured = mg_data["total_volume"] - mg_data["volume_captured"]

            capture_rate = (
                round(100 * keywords_captured / total_keywords, 1)
                if total_keywords > 0
                else 0.0
            )

            avg_brand_position = None
            if mg_data["brand_positions"]:
                avg_brand_position = round(
                    sum(mg_data["brand_positions"]) / len(mg_data["brand_positions"]),
                    1,
                )

            # Get top competitors for this modifier group
            # Per-modifier-group keyword lists are smaller, but still use chunking for safety
            top_competitors = await self._get_opportunity_competitors(
                mg_data["keyword_ids"], brand_domain_ids, limit_competitors
            )

            # Get top tags for this modifier group
            top_tags = await self._get_opportunity_tags(
                mg_data["keyword_ids"], brand_category_id
            )

            opportunities.append(
                ModifierGroupOpportunity(
                    modifier_group=mg_name,
                    total_keywords=total_keywords,
                    total_volume=mg_data["total_volume"],
                    keywords_captured=keywords_captured,
                    volume_captured=mg_data["volume_captured"],
                    keywords_uncaptured=keywords_uncaptured,
                    volume_uncaptured=volume_uncaptured,
                    capture_rate=capture_rate,
                    avg_brand_position=avg_brand_position,
                    top_competitors=top_competitors,
                    top_tags=top_tags,
                    example_keywords=mg_data["example_keywords"],
                )
            )

        # Sort by uncaptured volume (biggest opportunities first)
        opportunities.sort(key=lambda x: x.volume_uncaptured, reverse=True)
        return opportunities

    async def _get_opportunity_competitors(
        self,
        keyword_ids: List[int],
        brand_domain_ids: List[int],
        limit: int = 5,
    ) -> List[OpportunityCompetitor]:
        """
        Get top competitors ranking #1 on the given keywords.

        Uses chunking to handle large keyword lists that could exceed
        SQLite's parameter limit.

        Args:
            keyword_ids: Keyword IDs to analyze
            brand_domain_ids: Brand's domain IDs (to exclude)
            limit: Max competitors to return

        Returns:
            List of OpportunityCompetitor
        """
        if not keyword_ids:
            return []

        # Chunk size to stay well under SQLite's 999 parameter limit
        CHUNK_SIZE = 800

        # If small enough, do direct query
        if len(keyword_ids) <= CHUNK_SIZE:
            return await self._get_opportunity_competitors_chunk(
                keyword_ids, brand_domain_ids, limit
            )

        # For large lists, use chunking and aggregate results
        domain_stats: Dict[str, Dict[str, Any]] = {}

        for i in range(0, len(keyword_ids), CHUNK_SIZE):
            chunk = keyword_ids[i:i + CHUNK_SIZE]
            chunk_results = await self._get_opportunity_competitors_chunk(
                chunk, brand_domain_ids, limit=None  # Get all for aggregation
            )

            for comp in chunk_results:
                if comp.domain not in domain_stats:
                    domain_stats[comp.domain] = {
                        "domain_type": comp.domain_type,
                        "wins_count": 0,
                        "wins_volume": 0,
                        "position_sum": 0.0,
                        "position_count": 0,
                    }
                domain_stats[comp.domain]["wins_count"] += comp.wins_count
                domain_stats[comp.domain]["wins_volume"] += comp.wins_volume
                domain_stats[comp.domain]["position_sum"] += comp.avg_position * comp.wins_count
                domain_stats[comp.domain]["position_count"] += comp.wins_count

        # Convert aggregated stats to competitors list
        competitors = []
        for domain, stats in domain_stats.items():
            avg_pos = (
                stats["position_sum"] / stats["position_count"]
                if stats["position_count"] > 0
                else 0.0
            )
            competitors.append(
                OpportunityCompetitor(
                    domain=domain,
                    domain_type=stats["domain_type"],
                    wins_count=stats["wins_count"],
                    wins_volume=stats["wins_volume"],
                    avg_position=round(avg_pos, 1),
                )
            )

        # Sort by volume and limit
        competitors.sort(key=lambda x: x.wins_volume, reverse=True)
        return competitors[:limit]

    async def _get_opportunity_competitors_chunk(
        self,
        keyword_ids: List[int],
        brand_domain_ids: List[int],
        limit: Optional[int] = 5,
    ) -> List[OpportunityCompetitor]:
        """
        Get competitors for a single chunk of keyword IDs.

        Args:
            keyword_ids: Chunk of keyword IDs (must be <= 800)
            brand_domain_ids: Brand's domain IDs (to exclude)
            limit: Max competitors to return (None for no limit)

        Returns:
            List of OpportunityCompetitor
        """
        # Build query for competitors ranking #1
        query = (
            select(
                Domain.domain,
                BrandDomain.domain_type,
                func.count(distinct(SerpResult.keyword_id)).label("wins_count"),
                func.sum(Keyword.volume).label("wins_volume"),
                func.avg(SerpResult.rank_group).label("avg_position"),
            )
            .select_from(SerpResult)
            .join(Domain, SerpResult.domain_id == Domain.id)
            .join(Keyword, SerpResult.keyword_id == Keyword.id)
            .outerjoin(BrandDomain, Domain.id == BrandDomain.domain_id)
            .where(
                SerpResult.keyword_id.in_(keyword_ids),
                SerpResult.rank_group == 1,
            )
        )

        # Exclude brand's own domains
        if brand_domain_ids:
            query = query.where(~SerpResult.domain_id.in_(brand_domain_ids))

        query = query.group_by(Domain.domain, BrandDomain.domain_type)
        query = query.order_by(func.sum(Keyword.volume).desc())

        if limit is not None:
            query = query.limit(limit)

        result = await self.session.execute(query)
        competitors = []
        for row in result.all():
            competitors.append(
                OpportunityCompetitor(
                    domain=row[0],
                    domain_type=row[1] or "Unknown",
                    wins_count=row[2] or 0,
                    wins_volume=row[3] or 0,
                    avg_position=round(row[4] or 0, 1),
                )
            )
        return competitors

    async def _get_opportunity_tags(
        self, keyword_ids: List[int], brand_category_id: int, limit: int = 5
    ) -> Dict[str, int]:
        """
        Get top tags for the given keywords.

        Uses chunking to handle large keyword lists that could exceed
        SQLite's parameter limit.

        Args:
            keyword_ids: Keyword IDs to analyze
            brand_category_id: Brand category ID (to exclude brand tags)
            limit: Max tags to return

        Returns:
            Dict of tag (category:value) -> count
        """
        if not keyword_ids:
            return {}

        # Chunk size to stay well under SQLite's 999 parameter limit
        CHUNK_SIZE = 800

        # If small enough, do direct query
        if len(keyword_ids) <= CHUNK_SIZE:
            return await self._get_opportunity_tags_chunk(
                keyword_ids, brand_category_id, limit
            )

        # For large lists, use chunking and aggregate results
        tag_counts: Dict[str, int] = {}

        for i in range(0, len(keyword_ids), CHUNK_SIZE):
            chunk = keyword_ids[i:i + CHUNK_SIZE]
            chunk_results = await self._get_opportunity_tags_chunk(
                chunk, brand_category_id, limit=None  # Get all for aggregation
            )

            for tag, count in chunk_results.items():
                tag_counts[tag] = tag_counts.get(tag, 0) + count

        # Sort by count and limit
        sorted_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)
        return dict(sorted_tags[:limit])

    async def _get_opportunity_tags_chunk(
        self, keyword_ids: List[int], brand_category_id: int, limit: Optional[int] = 5
    ) -> Dict[str, int]:
        """
        Get tags for a single chunk of keyword IDs.

        Args:
            keyword_ids: Chunk of keyword IDs (must be <= 800)
            brand_category_id: Brand category ID (to exclude brand tags)
            limit: Max tags to return (None for no limit)

        Returns:
            Dict of tag (category:value) -> count
        """
        query = (
            select(
                Category.name,
                KeywordTag.value,
                func.count(KeywordTag.keyword_id).label("count"),
            )
            .select_from(KeywordTag)
            .join(Category, KeywordTag.category_id == Category.id)
            .where(
                KeywordTag.keyword_id.in_(keyword_ids),
                Category.id != brand_category_id,  # Exclude brand category
            )
            .group_by(Category.name, KeywordTag.value)
            .order_by(func.count(KeywordTag.keyword_id).desc())
        )

        if limit is not None:
            query = query.limit(limit)

        result = await self.session.execute(query)
        return {f"{row[0]}:{row[1]}": row[2] for row in result.all()}
