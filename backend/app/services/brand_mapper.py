"""
Brand-domain mapping service using Claude AI.

Automatically detects which domains belong to which brands using:
1. Manual mappings (highest priority)
2. Heuristic matching (brand name in domain)
3. AI analysis for top 1000 domains by visibility

Domain types:
- Brand: Official brand website
- Reseller: Multi-brand retailers/aggregators
- UGC: User-generated content sites
- 3rd Party: Reviews, content, affiliate sites
"""

import json
import logging
from typing import Any, Dict, List, Optional, Tuple

from anthropic import Anthropic
from sqlalchemy import case, distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db_context
from app.models import BrandDomain, Category, Domain, Keyword, KeywordTag, SerpResult

logger = logging.getLogger(__name__)
settings = get_settings()


class BrandMapperService:
    """Service for mapping brands to their domains using multiple strategies."""

    def __init__(self, session: AsyncSession):
        """
        Initialize the brand mapper service.

        Args:
            session: SQLAlchemy async session
        """
        self.session = session
        if settings.anthropic_api_key:
            self.client = Anthropic(api_key=settings.anthropic_api_key)
        else:
            self.client = None

    async def get_all_brands(self) -> List[Tuple[str, int, int]]:
        """
        Get all unique brand values from keyword tags.

        Returns:
            List of tuples: (brand_name, keyword_count, total_volume)
        """
        # Get the brand category ID
        result = await self.session.execute(
            select(Category).where(Category.name == "brand")
        )
        brand_category = result.scalar_one_or_none()

        if not brand_category:
            logger.warning("No 'brand' category found in database")
            return []

        # Get all unique brand values with counts
        query = (
            select(
                KeywordTag.value,
                func.count(distinct(KeywordTag.keyword_id)).label("keyword_count"),
                func.sum(Keyword.volume).label("total_volume"),
            )
            .join(Keyword, KeywordTag.keyword_id == Keyword.id)
            .where(KeywordTag.category_id == brand_category.id)
            .group_by(KeywordTag.value)
            .order_by(func.sum(Keyword.volume).desc())
        )

        result = await self.session.execute(query)
        brands = [(row[0], row[1], row[2] or 0) for row in result.all()]

        logger.info(f"Found {len(brands)} unique brands")
        return brands

    async def get_domains_for_brand_keywords(
        self, brand_name: str, limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get domains that rank for a brand's keywords.

        Args:
            brand_name: Brand name to analyze
            limit: Maximum number of domains to return

        Returns:
            List of domain stats dictionaries
        """
        # Get keywords tagged with this brand
        brand_category_result = await self.session.execute(
            select(Category).where(Category.name == "brand")
        )
        brand_category = brand_category_result.scalar_one_or_none()

        if not brand_category:
            return []

        # Find domains that rank for these brand keywords
        # Fixed SQL: use case() correctly without else_ parameter
        query = (
            select(
                Domain.domain,
                func.count(distinct(SerpResult.keyword_id)).label("keyword_count"),
                func.avg(SerpResult.rank_group).label("avg_position"),
                func.count(
                    distinct(
                        case((SerpResult.rank_group == 1, SerpResult.keyword_id))
                    )
                ).label("first_position_count"),
            )
            .select_from(SerpResult)
            .join(Domain, SerpResult.domain_id == Domain.id)
            .join(KeywordTag, SerpResult.keyword_id == KeywordTag.keyword_id)
            .where(KeywordTag.category_id == brand_category.id)
            .where(KeywordTag.value == brand_name)
            .group_by(Domain.domain)
            .order_by(func.count(distinct(SerpResult.keyword_id)).desc())
            .limit(limit)
        )

        result = await self.session.execute(query)
        domains = [
            {
                "domain": row[0],
                "keyword_count": row[1],
                "avg_position": round(row[2], 2) if row[2] else 0,
                "first_position_count": row[3],
            }
            for row in result.all()
        ]

        return domains

    async def calculate_domain_visibility(self, limit: int = 1000) -> List[Dict[str, Any]]:
        """
        Calculate visibility score for all domains.
        Visibility = sum(search_volume / rank) across all keywords.

        Args:
            limit: Maximum number of top domains to return

        Returns:
            List of domain visibility statistics
        """
        # Calculate visibility: sum(volume / rank) for each domain
        query = (
            select(
                Domain.id,
                Domain.domain,
                func.sum(Keyword.volume / SerpResult.rank_group).label("visibility"),
                func.count(distinct(SerpResult.keyword_id)).label("keyword_count"),
            )
            .select_from(Domain)
            .join(SerpResult, Domain.id == SerpResult.domain_id)
            .join(Keyword, SerpResult.keyword_id == Keyword.id)
            .group_by(Domain.id, Domain.domain)
            .order_by(func.sum(Keyword.volume / SerpResult.rank_group).desc())
            .limit(limit)
        )

        result = await self.session.execute(query)
        domains = [
            {
                "domain_id": row[0],
                "domain": row[1],
                "visibility": round(row[2], 2) if row[2] else 0,
                "keyword_count": row[3],
            }
            for row in result.all()
        ]

        logger.info(f"Calculated visibility for {len(domains)} domains")
        return domains

    async def get_unmapped_domains(self, all_domains: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Filter out domains that are already mapped.

        Args:
            all_domains: List of domain dictionaries with domain_id

        Returns:
            List of unmapped domains
        """
        domain_ids = [d["domain_id"] for d in all_domains]

        # Get already mapped domain IDs
        result = await self.session.execute(
            select(distinct(BrandDomain.domain_id)).where(
                BrandDomain.domain_id.in_(domain_ids)
            )
        )
        mapped_ids = {row[0] for row in result.all()}

        # Filter unmapped
        unmapped = [d for d in all_domains if d["domain_id"] not in mapped_ids]
        logger.info(f"Found {len(unmapped)} unmapped domains out of {len(all_domains)}")

        return unmapped

    def _heuristic_matching(
        self, brand_name: str, domains: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Simple heuristic-based domain mapping: brand name contained in domain.

        Args:
            brand_name: Brand name to map
            domains: List of domain statistics

        Returns:
            List of domain mappings
        """
        brand_lower = brand_name.lower().replace(" ", "").replace("-", "")
        mappings = []

        # Known retailers to skip
        known_retailers = [
            "amazon", "walmart", "ebay", "target", "rei",
            "dickssporting", "performancebike", "backcountry",
        ]

        for domain_info in domains:
            domain = domain_info["domain"].lower()
            domain_clean = domain.replace("-", "").replace(".", "")

            # Skip known retailers
            if any(retailer in domain for retailer in known_retailers):
                continue

            # Check if brand name is in domain
            if brand_lower in domain_clean:
                # Primary if domain starts with brand name
                is_primary = domain_clean.startswith(brand_lower)
                confidence = 0.95 if is_primary else 0.85

                mappings.append(
                    {
                        "domain": domain_info["domain"],
                        "brand_name": brand_name,
                        "is_primary": is_primary and len(mappings) == 0,
                        "domain_type": "Brand",
                        "confidence": confidence,
                        "reason": "Brand name contained in domain",
                    }
                )

        return mappings

    def _call_claude_for_mapping(
        self, domains: List[Dict[str, Any]], brands: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Use Claude to classify domains and map them to brands/types.

        Args:
            domains: List of domain statistics
            brands: List of known brand names

        Returns:
            List of domain mappings with brands and types
        """
        if not self.client or not domains:
            return []

        # Prepare domain info
        domain_info = "\n".join(
            [
                f"{i+1}. {d['domain']} (visibility: {d.get('visibility', 0)}, "
                f"{d.get('keyword_count', 0)} keywords)"
                for i, d in enumerate(domains[:50])  # Limit to 50 for prompt size
            ]
        )

        brands_list = ", ".join(brands[:30])  # Include brand context

        prompt = f"""Analyze these domains in the bicycle/cycling industry and classify each one.

Known brands: {brands_list}

Domains to classify:
{domain_info}

For EACH domain, determine:
1. Domain Type (choose one):
   - Brand: Official brand website selling their own products (e.g., trekbikes.com for Trek)
   - Reseller: Multi-brand retailers/aggregators (e.g., Amazon, Walmart, performancebike.com)
   - UGC: User-generated content sites (Reddit, Facebook, bikeforums.net, forums.mtbr.com)
   - 3rd Party: Reviews, content, news, or affiliate sites (bikeradar.com, cyclingnews.com)

2. Associated Brand (if type is "Brand", specify which brand owns it; otherwise use "N/A")

3. Confidence (0.0 to 1.0)

Respond in this exact JSON format:
{{
    "mappings": [
        {{"domain": "trekbikes.com", "brand_name": "Trek", "domain_type": "Brand", "is_primary": true, "confidence": 0.98}},
        {{"domain": "amazon.com", "brand_name": "N/A", "domain_type": "Reseller", "is_primary": false, "confidence": 0.99}},
        {{"domain": "reddit.com", "brand_name": "N/A", "domain_type": "UGC", "is_primary": false, "confidence": 0.99}},
        {{"domain": "bikeradar.com", "brand_name": "N/A", "domain_type": "3rd Party", "is_primary": false, "confidence": 0.95}}
    ]
}}

Rules:
- ONLY use domain_type values: Brand, Reseller, UGC, 3rd Party
- brand_name should be exact brand name from the list, or "N/A" for non-Brand types
- is_primary is true only for the main website of a brand
- Classify ALL provided domains

Respond only with valid JSON, no other text."""

        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=4096,
                messages=[{"role": "user", "content": prompt}],
            )

            response_text = response.content[0].text.strip()

            # Handle markdown code blocks
            if response_text.startswith("```"):
                lines = response_text.split("\n")
                response_text = "\n".join(lines[1:-1])

            result = json.loads(response_text)
            mappings = result.get("mappings", [])

            # Filter out N/A brand names for non-Brand types
            for mapping in mappings:
                if mapping.get("domain_type") != "Brand":
                    mapping["brand_name"] = "N/A"

            return mappings

        except Exception as e:
            logger.error(f"Error calling Claude for domain mapping: {e}")
            return []

    async def apply_manual_mappings(
        self, manual_mappings: Dict[str, Dict[str, Any]]
    ) -> int:
        """
        Apply manual brand-domain mappings.

        Args:
            manual_mappings: Dict of domain -> {brand_name, domain_type, is_primary, confidence}
            Example: {
                "trekbikes.com": {"brand_name": "Trek", "domain_type": "Brand", "is_primary": True, "confidence": 1.0},
                "amazon.com": {"brand_name": "N/A", "domain_type": "Reseller", "is_primary": False, "confidence": 1.0}
            }

        Returns:
            Number of mappings saved
        """
        saved_count = 0

        for domain_str, mapping_info in manual_mappings.items():
            # Get domain
            result = await self.session.execute(
                select(Domain).where(Domain.domain == domain_str)
            )
            domain = result.scalar_one_or_none()

            if not domain:
                logger.warning(f"Domain not found: {domain_str}")
                continue

            brand_name = mapping_info.get("brand_name", "N/A")

            # Check if mapping already exists
            existing = await self.session.execute(
                select(BrandDomain).where(
                    BrandDomain.brand_name == brand_name,
                    BrandDomain.domain_id == domain.id,
                )
            )

            if existing.scalar_one_or_none():
                logger.info(f"Mapping already exists: {brand_name} -> {domain_str}")
                continue

            # Create new mapping
            brand_domain = BrandDomain(
                brand_name=brand_name,
                domain_id=domain.id,
                is_primary=mapping_info.get("is_primary", False),
                domain_type=mapping_info.get("domain_type", "Brand"),
                confidence=mapping_info.get("confidence", 1.0),
            )
            self.session.add(brand_domain)
            saved_count += 1

        await self.session.commit()
        logger.info(f"Applied {saved_count} manual mappings")
        return saved_count

    async def save_brand_mapping(
        self, mappings: List[Dict[str, Any]]
    ) -> int:
        """
        Save brand-domain mappings to database.

        Args:
            mappings: List of domain mappings with brand_name, domain_type, etc.

        Returns:
            Number of mappings saved
        """
        saved_count = 0

        for mapping in mappings:
            domain_str = mapping["domain"]
            brand_name = mapping.get("brand_name", "N/A")

            # Get domain
            result = await self.session.execute(
                select(Domain).where(Domain.domain == domain_str)
            )
            domain = result.scalar_one_or_none()

            if not domain:
                logger.warning(f"Domain not found: {domain_str}")
                continue

            # Check if mapping already exists
            existing = await self.session.execute(
                select(BrandDomain).where(
                    BrandDomain.brand_name == brand_name,
                    BrandDomain.domain_id == domain.id,
                )
            )

            if existing.scalar_one_or_none():
                continue

            # Create new mapping
            brand_domain = BrandDomain(
                brand_name=brand_name,
                domain_id=domain.id,
                is_primary=mapping.get("is_primary", False),
                domain_type=mapping.get("domain_type", "Brand"),
                confidence=mapping.get("confidence", 0.5),
            )
            self.session.add(brand_domain)
            saved_count += 1

        await self.session.commit()
        return saved_count


async def run_comprehensive_mapping(
    manual_mappings: Optional[Dict[str, Dict[str, Any]]] = None,
    use_ai: bool = True,
) -> Dict[str, Any]:
    """
    Run comprehensive brand-domain mapping with 3 phases:
    1. Manual mappings (if provided)
    2. Heuristic matching (brand name in domain)
    3. AI mapping for top 1000 unmapped domains by visibility

    Args:
        manual_mappings: Optional dict of manual domain mappings
        use_ai: Whether to use AI for remaining domains

    Returns:
        Statistics dictionary
    """
    stats = {
        "manual_mappings": 0,
        "heuristic_mappings": 0,
        "ai_mappings": 0,
        "total_mappings": 0,
        "errors": [],
    }

    async with get_db_context() as session:
        service = BrandMapperService(session)

        # Phase 1: Apply manual mappings
        if manual_mappings:
            logger.info(f"Phase 1: Applying {len(manual_mappings)} manual mappings...")
            stats["manual_mappings"] = await service.apply_manual_mappings(manual_mappings)

        # Phase 2: Heuristic matching for all brands
        logger.info("Phase 2: Heuristic matching (brand name in domain)...")
        brands = await service.get_all_brands()

        for brand_name, keyword_count, total_volume in brands:
            try:
                # Skip brands with very few keywords
                if keyword_count < 3:
                    continue

                # Get domains for this brand
                domains = await service.get_domains_for_brand_keywords(brand_name, limit=100)

                # Apply heuristic matching
                heuristic_mappings = service._heuristic_matching(brand_name, domains)

                if heuristic_mappings:
                    saved = await service.save_brand_mapping(heuristic_mappings)
                    stats["heuristic_mappings"] += saved

            except Exception as e:
                error_msg = f"Error in heuristic matching for '{brand_name}': {str(e)}"
                logger.error(error_msg)
                stats["errors"].append(error_msg)

        logger.info(f"Heuristic matching complete: {stats['heuristic_mappings']} mappings created")

        # Phase 3: AI mapping for top 1000 unmapped domains by visibility
        if use_ai and service.client:
            logger.info("Phase 3: AI mapping for top 1000 unmapped domains by visibility...")

            # Calculate visibility for all domains
            top_domains = await service.calculate_domain_visibility(limit=2000)

            # Filter unmapped domains
            unmapped = await service.get_unmapped_domains(top_domains)

            # Take top 1000 by visibility
            unmapped_top = unmapped[:1000]
            logger.info(f"Processing {len(unmapped_top)} unmapped domains with AI...")

            # Get brand names for context
            brand_names = [b[0] for b in brands]

            # Process in batches of 50
            batch_size = 50
            for i in range(0, len(unmapped_top), batch_size):
                batch = unmapped_top[i:i+batch_size]

                try:
                    ai_mappings = service._call_claude_for_mapping(batch, brand_names)

                    if ai_mappings:
                        saved = await service.save_brand_mapping(ai_mappings)
                        stats["ai_mappings"] += saved

                    logger.info(f"Processed batch {i//batch_size + 1}/{(len(unmapped_top)-1)//batch_size + 1}")

                except Exception as e:
                    error_msg = f"Error in AI mapping batch {i//batch_size + 1}: {str(e)}"
                    logger.error(error_msg)
                    stats["errors"].append(error_msg)

        elif use_ai:
            logger.warning("AI mapping requested but no API key available")

    stats["total_mappings"] = (
        stats["manual_mappings"] + stats["heuristic_mappings"] + stats["ai_mappings"]
    )

    logger.info(f"Comprehensive mapping complete: {stats}")
    return stats
