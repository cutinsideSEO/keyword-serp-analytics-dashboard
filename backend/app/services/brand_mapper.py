"""
Brand-domain mapping service using Claude AI.

Automatically detects which domains belong to which brands using:
1. Manual mappings (highest priority)
2. Heuristic matching (brand name in domain)
3. AI analysis for top 1000 domains by visibility

Domain types are loaded from market_domain_types table for the specific market.
"""

import json
import logging
from typing import Any, Dict, List, Optional, Tuple

import orjson
from anthropic import Anthropic
from sqlalchemy import case, distinct, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db_context
from app.models import BrandDomain, Category, Domain, Keyword, KeywordTag, Market, MarketDomainType, SerpResult

logger = logging.getLogger(__name__)
settings = get_settings()


def normalize_category_name(name: str) -> str:
    """
    Normalize category name to match database format.

    Config files may use display names like "Insurance Company - Canonical"
    but categories are stored with normalized names like "insurance_company___canonical".
    """
    return name.lower().strip().replace(" ", "_").replace("-", "_")


class BrandMapperService:
    """Service for mapping brands to their domains using multiple strategies."""

    def __init__(self, session: AsyncSession, market_id: str):
        """
        Initialize the brand mapper service.

        Args:
            session: SQLAlchemy async session
            market_id: Market ID to operate on
        """
        self.session = session
        self.market_id = market_id
        self._market_config: Optional[Market] = None
        self._domain_types: Optional[List[MarketDomainType]] = None

        if settings.anthropic_api_key:
            self.client = Anthropic(api_key=settings.anthropic_api_key)
        else:
            self.client = None

    async def _load_market_config(self):
        """Load market configuration and domain types from database."""
        if self._market_config is None:
            result = await self.session.execute(
                select(Market).where(Market.id == self.market_id)
            )
            self._market_config = result.scalar_one_or_none()

            if not self._market_config:
                raise ValueError(f"Market not found: {self.market_id}")

        if self._domain_types is None:
            result = await self.session.execute(
                select(MarketDomainType)
                .where(MarketDomainType.market_id == self.market_id)
                .order_by(MarketDomainType.sort_order)
            )
            self._domain_types = list(result.scalars().all())

            if not self._domain_types:
                raise ValueError(f"No domain types found for market: {self.market_id}")

    def _get_brand_type(self) -> Optional[MarketDomainType]:
        """Get the brand domain type for this market."""
        if not self._domain_types:
            return None
        for dt in self._domain_types:
            if dt.is_brand_type:
                return dt
        return self._domain_types[0] if self._domain_types else None

    # =========================================================================
    # BULK OPERATION METHODS (Optimized for performance)
    # =========================================================================

    async def _preload_domain_ids(self) -> Dict[str, int]:
        """
        Load all domain IDs for the market in one query.

        Returns:
            Dict mapping domain string to database id
        """
        result = await self.session.execute(
            select(Domain.id, Domain.domain)
            .where(Domain.market_id == self.market_id)
        )
        return {row.domain: row.id for row in result.fetchall()}

    async def _bulk_save_brand_mappings(
        self,
        mappings: List[Dict[str, Any]],
        domain_id_map: Dict[str, int]
    ) -> int:
        """
        Bulk insert brand-domain mappings.

        Args:
            mappings: List of mapping dicts with domain, brand_name, domain_type, etc.
            domain_id_map: Pre-loaded domain -> id mapping

        Returns:
            Number of mappings inserted
        """
        if not mappings:
            return 0

        await self._load_market_config()
        brand_type = self._get_brand_type()
        default_type = brand_type.display_name if brand_type else "Brand"

        # Prepare data with domain_ids
        insert_data = []
        for m in mappings:
            domain_id = domain_id_map.get(m["domain"])
            if not domain_id:
                continue
            insert_data.append({
                "market_id": self.market_id,
                "brand_name": m.get("brand_name", "N/A"),
                "domain_id": domain_id,
                "is_primary": m.get("is_primary", False),
                "domain_type": m.get("domain_type", default_type),
                "confidence": m.get("confidence", 0.5),
            })

        if not insert_data:
            return 0

        result = await self.session.execute(
            text("""
                INSERT INTO brand_domains (market_id, brand_name, domain_id, is_primary, domain_type, confidence, created_at)
                SELECT
                    d.market_id,
                    d.brand_name,
                    CAST(d.domain_id AS INTEGER),
                    CAST(d.is_primary AS BOOLEAN),
                    d.domain_type,
                    CAST(d.confidence AS FLOAT),
                    NOW()
                FROM jsonb_to_recordset(CAST(:data AS jsonb)) AS d(
                    market_id TEXT,
                    brand_name TEXT,
                    domain_id INTEGER,
                    is_primary BOOLEAN,
                    domain_type TEXT,
                    confidence FLOAT
                )
                ON CONFLICT (market_id, brand_name, domain_id) DO UPDATE
                    SET domain_type = EXCLUDED.domain_type,
                        confidence = EXCLUDED.confidence
            """),
            {"data": orjson.dumps(insert_data).decode()}
        )

        await self.session.commit()
        return len(insert_data)

    # =========================================================================
    # BRAND ANALYSIS METHODS
    # =========================================================================

    async def get_all_brands(self) -> List[Tuple[str, int, int]]:
        """
        Get all unique brand values from keyword tags for this market.

        Returns:
            List of tuples: (brand_name, keyword_count, total_volume)
        """
        await self._load_market_config()

        # Get the brand category IDs for this market
        # Config may use display names, but database uses normalized names
        raw_brand_category_names = json.loads(self._market_config.brand_category_names or '["brand"]')
        brand_category_names = [normalize_category_name(n) for n in raw_brand_category_names]

        result = await self.session.execute(
            select(Category).where(
                Category.market_id == self.market_id,
                Category.name.in_(brand_category_names)
            )
        )
        brand_categories = list(result.scalars().all())

        if not brand_categories:
            logger.warning(f"No brand categories found for market {self.market_id} (looking for: {brand_category_names})")
            return []

        brand_category_ids = [c.id for c in brand_categories]

        # Get all unique brand values with counts
        query = (
            select(
                KeywordTag.value,
                func.count(distinct(KeywordTag.keyword_id)).label("keyword_count"),
                func.sum(Keyword.volume).label("total_volume"),
            )
            .join(Keyword, KeywordTag.keyword_id == Keyword.id)
            .where(
                KeywordTag.category_id.in_(brand_category_ids),
                Keyword.market_id == self.market_id
            )
            .group_by(KeywordTag.value)
            .order_by(func.sum(Keyword.volume).desc())
        )

        result = await self.session.execute(query)
        brands = [(row[0], row[1], row[2] or 0) for row in result.all()]

        logger.info(f"Found {len(brands)} unique brands for market {self.market_id}")
        return brands

    async def get_domains_for_brand_keywords(
        self, brand_name: str, limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get domains that rank for a brand's keywords in this market.

        Args:
            brand_name: Brand name to analyze
            limit: Maximum number of domains to return

        Returns:
            List of domain stats dictionaries
        """
        await self._load_market_config()

        # Get brand category IDs (normalize names to match database format)
        raw_brand_category_names = json.loads(self._market_config.brand_category_names or '["brand"]')
        brand_category_names = [normalize_category_name(n) for n in raw_brand_category_names]

        brand_category_result = await self.session.execute(
            select(Category).where(
                Category.market_id == self.market_id,
                Category.name.in_(brand_category_names)
            )
        )
        brand_categories = list(brand_category_result.scalars().all())

        if not brand_categories:
            return []

        brand_category_ids = [c.id for c in brand_categories]

        # Find domains that rank for these brand keywords
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
            .join(Keyword, SerpResult.keyword_id == Keyword.id)
            .where(
                KeywordTag.category_id.in_(brand_category_ids),
                KeywordTag.value == brand_name,
                Domain.market_id == self.market_id,
                Keyword.market_id == self.market_id
            )
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
        Calculate visibility score for all domains in this market.
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
            .where(Domain.market_id == self.market_id)
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

        logger.info(f"Calculated visibility for {len(domains)} domains in market {self.market_id}")
        return domains

    async def get_unmapped_domains(self, all_domains: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Filter out domains that are already mapped in this market.

        Args:
            all_domains: List of domain dictionaries with domain_id

        Returns:
            List of unmapped domains
        """
        domain_ids = [d["domain_id"] for d in all_domains]

        # Get already mapped domain IDs for this market
        result = await self.session.execute(
            select(distinct(BrandDomain.domain_id)).where(
                BrandDomain.domain_id.in_(domain_ids),
                BrandDomain.market_id == self.market_id
            )
        )
        mapped_ids = {row[0] for row in result.all()}

        # Filter unmapped
        unmapped = [d for d in all_domains if d["domain_id"] not in mapped_ids]
        logger.info(f"Found {len(unmapped)} unmapped domains out of {len(all_domains)}")

        return unmapped

    async def _heuristic_matching(
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
        await self._load_market_config()

        brand_lower = brand_name.lower().replace(" ", "").replace("-", "")
        mappings = []

        # Known retailers to skip (common across markets)
        known_retailers = [
            "amazon", "walmart", "ebay", "target", "alibaba",
            "aliexpress", "wish", "etsy",
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

                # Get the brand type name from market config
                brand_type = self._get_brand_type()
                brand_type_name = brand_type.display_name if brand_type else "Brand"

                mappings.append(
                    {
                        "domain": domain_info["domain"],
                        "brand_name": brand_name,
                        "is_primary": is_primary and len(mappings) == 0,
                        "domain_type": brand_type_name,
                        "confidence": confidence,
                        "reason": "Brand name contained in domain",
                    }
                )

        return mappings

    async def _generate_classification_prompt(
        self, domains: List[Dict[str, Any]], brands: List[str]
    ) -> str:
        """
        Generate a dynamic classification prompt based on market config.

        Args:
            domains: List of domain statistics
            brands: List of known brand names

        Returns:
            Formatted prompt string for Claude
        """
        await self._load_market_config()

        # Prepare domain info (increased limit to 100 for larger batches)
        domain_info = "\n".join(
            [
                f"{i+1}. {d['domain']} (visibility: {d.get('visibility', 0)}, "
                f"{d.get('keyword_count', 0)} keywords)"
                for i, d in enumerate(domains[:100])
            ]
        )

        brands_list = ", ".join(brands[:30])  # Include brand context

        # Build domain type descriptions from database config
        type_descriptions = "\n".join(
            [
                f"   - {dt.display_name}: Domain type for {dt.id}"
                for dt in self._domain_types
            ]
        )

        # Build example JSON entries
        brand_type = self._get_brand_type()
        brand_type_name = brand_type.display_name if brand_type else "Brand"

        examples = []
        for dt in self._domain_types:
            if dt.is_brand_type:
                examples.append(
                    f'{{"domain": "example-brand.com", "brand_name": "{brands[0] if brands else "ExampleBrand"}", '
                    f'"domain_type": "{dt.display_name}", "is_primary": true, "confidence": 0.98}}'
                )
            else:
                examples.append(
                    f'{{"domain": "example-{dt.id}.com", "brand_name": "N/A", '
                    f'"domain_type": "{dt.display_name}", "is_primary": false, "confidence": 0.95}}'
                )

        examples_json = ",\n        ".join(examples[:4])  # Limit examples

        # Build list of valid domain types
        type_list = ", ".join([dt.display_name for dt in self._domain_types])

        industry = self._market_config.industry_context if self._market_config else "general market"

        prompt = f"""Analyze these domains in the {industry} and classify each one.

Known brands: {brands_list}

Domains to classify:
{domain_info}

For EACH domain, determine:
1. Domain Type (choose one):
{type_descriptions}

2. Associated Brand (if type is "{brand_type_name}", specify which brand owns it; otherwise use "N/A")

3. Confidence (0.0 to 1.0)

Respond in this exact JSON format:
{{
    "mappings": [
        {examples_json}
    ]
}}

Rules:
- ONLY use domain_type values: {type_list}
- brand_name should be exact brand name from the list, or "N/A" for non-{brand_type_name} types
- is_primary is true only for the main website of a brand
- Classify ALL provided domains

Respond only with valid JSON, no other text."""

        return prompt

    async def _call_claude_for_mapping(
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

        # Generate dynamic prompt based on market config
        prompt = await self._generate_classification_prompt(domains, brands)

        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=8192,  # Increased for larger batches
                messages=[{"role": "user", "content": prompt}],
            )

            response_text = response.content[0].text.strip()

            # Extract JSON from response (handle markdown code blocks)
            import re

            # Try to find JSON in markdown code block first
            code_block_match = re.search(r'```(?:json)?\s*\n?([\s\S]*?)\n?```', response_text)
            if code_block_match:
                response_text = code_block_match.group(1).strip()

            # If no code block, try to find JSON object directly
            if not response_text.startswith('{'):
                json_match = re.search(r'\{[\s\S]*\}', response_text)
                if json_match:
                    response_text = json_match.group(0)

            # Try to parse JSON
            try:
                result = json.loads(response_text)
            except json.JSONDecodeError:
                # Try to fix common issues: trailing commas, incomplete arrays
                # Remove trailing commas before ] or }
                fixed_text = re.sub(r',\s*([}\]])', r'\1', response_text)
                # Try to close unclosed arrays/objects
                open_braces = fixed_text.count('{') - fixed_text.count('}')
                open_brackets = fixed_text.count('[') - fixed_text.count(']')
                fixed_text += ']' * open_brackets + '}' * open_braces
                result = json.loads(fixed_text)

            mappings = result.get("mappings", [])

            # Filter out N/A brand names for non-Brand types
            brand_type = self._get_brand_type()
            brand_type_name = brand_type.display_name if brand_type else "Brand"
            for mapping in mappings:
                if mapping.get("domain_type") != brand_type_name:
                    mapping["brand_name"] = "N/A"

            return mappings

        except Exception as e:
            logger.error(f"Error calling Claude for domain mapping: {e}")
            return []

    async def apply_manual_mappings(
        self, manual_mappings: Dict[str, Dict[str, Any]]
    ) -> int:
        """
        Apply manual brand-domain mappings for this market.

        Args:
            manual_mappings: Dict of domain -> {brand_name, domain_type, is_primary, confidence}

        Returns:
            Number of mappings saved
        """
        await self._load_market_config()
        saved_count = 0

        for domain_str, mapping_info in manual_mappings.items():
            # Get domain for this market
            result = await self.session.execute(
                select(Domain).where(
                    Domain.domain == domain_str,
                    Domain.market_id == self.market_id
                )
            )
            domain = result.scalar_one_or_none()

            if not domain:
                logger.warning(f"Domain not found in market {self.market_id}: {domain_str}")
                continue

            brand_name = mapping_info.get("brand_name", "N/A")

            # Check if mapping already exists for this market
            existing = await self.session.execute(
                select(BrandDomain).where(
                    BrandDomain.brand_name == brand_name,
                    BrandDomain.domain_id == domain.id,
                    BrandDomain.market_id == self.market_id,
                )
            )

            if existing.scalar_one_or_none():
                logger.info(f"Mapping already exists: {brand_name} -> {domain_str}")
                continue

            # Get default domain type from config
            brand_type = self._get_brand_type()
            default_type = brand_type.display_name if brand_type else "Brand"

            # Create new mapping
            brand_domain = BrandDomain(
                market_id=self.market_id,
                brand_name=brand_name,
                domain_id=domain.id,
                is_primary=mapping_info.get("is_primary", False),
                domain_type=mapping_info.get("domain_type", default_type),
                confidence=mapping_info.get("confidence", 1.0),
            )
            self.session.add(brand_domain)
            saved_count += 1

        await self.session.commit()
        logger.info(f"Applied {saved_count} manual mappings for market {self.market_id}")
        return saved_count

    async def save_brand_mapping(
        self, mappings: List[Dict[str, Any]]
    ) -> int:
        """
        Save brand-domain mappings to database for this market.

        Args:
            mappings: List of domain mappings with brand_name, domain_type, etc.

        Returns:
            Number of mappings saved
        """
        await self._load_market_config()
        saved_count = 0

        # Get default domain type from config
        brand_type = self._get_brand_type()
        default_type = brand_type.display_name if brand_type else "Brand"

        for mapping in mappings:
            domain_str = mapping["domain"]
            brand_name = mapping.get("brand_name", "N/A")

            # Get domain for this market
            result = await self.session.execute(
                select(Domain).where(
                    Domain.domain == domain_str,
                    Domain.market_id == self.market_id
                )
            )
            domain = result.scalar_one_or_none()

            if not domain:
                logger.warning(f"Domain not found: {domain_str}")
                continue

            # Check if mapping already exists for this market
            existing = await self.session.execute(
                select(BrandDomain).where(
                    BrandDomain.brand_name == brand_name,
                    BrandDomain.domain_id == domain.id,
                    BrandDomain.market_id == self.market_id,
                )
            )

            if existing.scalar_one_or_none():
                continue

            # Create new mapping
            brand_domain = BrandDomain(
                market_id=self.market_id,
                brand_name=brand_name,
                domain_id=domain.id,
                is_primary=mapping.get("is_primary", False),
                domain_type=mapping.get("domain_type", default_type),
                confidence=mapping.get("confidence", 0.5),
            )
            self.session.add(brand_domain)
            saved_count += 1

        await self.session.commit()
        return saved_count


async def run_comprehensive_mapping(
    market_id: str,
    manual_mappings: Optional[Dict[str, Dict[str, Any]]] = None,
    use_ai: bool = True,
) -> Dict[str, Any]:
    """
    Run comprehensive brand-domain mapping with 3 phases for a specific market:
    1. Manual mappings (if provided)
    2. Heuristic matching (brand name in domain)
    3. AI mapping for top 1000 unmapped domains by visibility

    Uses bulk operations for improved performance.
    Each phase uses separate DB connections to avoid timeout issues.

    Args:
        market_id: Market ID to run mapping for
        manual_mappings: Optional dict of manual domain mappings
        use_ai: Whether to use AI for remaining domains

    Returns:
        Statistics dictionary
    """
    stats = {
        "market_id": market_id,
        "manual_mappings": 0,
        "heuristic_mappings": 0,
        "ai_mappings": 0,
        "total_mappings": 0,
        "errors": [],
    }

    # Pre-load data we'll need throughout (quick DB operation)
    async with get_db_context() as session:
        service = BrandMapperService(session, market_id=market_id)

        logger.info("Pre-loading domain IDs for bulk operations...")
        domain_id_map = await service._preload_domain_ids()
        logger.info(f"Loaded {len(domain_id_map)} domain IDs")

    # Phase 1: Apply manual mappings (separate DB context)
    if manual_mappings:
        async with get_db_context() as session:
            service = BrandMapperService(session, market_id=market_id)
            logger.info(f"Phase 1: Applying {len(manual_mappings)} manual mappings...")
            manual_list = [
                {
                    "domain": domain_str,
                    "brand_name": info.get("brand_name", "N/A"),
                    "domain_type": info.get("domain_type", "Brand"),
                    "is_primary": info.get("is_primary", False),
                    "confidence": info.get("confidence", 1.0),
                }
                for domain_str, info in manual_mappings.items()
            ]
            stats["manual_mappings"] = await service._bulk_save_brand_mappings(manual_list, domain_id_map)

    # Phase 2: Heuristic matching (separate DB context)
    logger.info("Phase 2: Heuristic matching (brand name in domain)...")
    async with get_db_context() as session:
        service = BrandMapperService(session, market_id=market_id)
        brands = await service.get_all_brands()

        all_heuristic_mappings = []
        for brand_name, keyword_count, total_volume in brands:
            try:
                if keyword_count < 3:
                    continue

                domains = await service.get_domains_for_brand_keywords(brand_name, limit=100)
                heuristic_mappings = await service._heuristic_matching(brand_name, domains)

                if heuristic_mappings:
                    all_heuristic_mappings.extend(heuristic_mappings)

            except Exception as e:
                error_msg = f"Error in heuristic matching for '{brand_name}': {str(e)}"
                logger.error(error_msg)
                stats["errors"].append(error_msg)

        if all_heuristic_mappings:
            stats["heuristic_mappings"] = await service._bulk_save_brand_mappings(
                all_heuristic_mappings, domain_id_map
            )

    logger.info(f"Heuristic matching complete: {stats['heuristic_mappings']} mappings created")

    # Phase 3: AI mapping (separate DB contexts for data fetch and inserts)
    if use_ai:
        # Check for API key
        client = None
        if settings.anthropic_api_key:
            client = Anthropic(api_key=settings.anthropic_api_key)

        if client:
            logger.info("Phase 3: AI mapping for top 1000 unmapped domains by visibility...")

            # Fetch data needed for AI (quick DB operation)
            async with get_db_context() as session:
                service = BrandMapperService(session, market_id=market_id)
                service.client = client

                top_domains = await service.calculate_domain_visibility(limit=2000)
                unmapped = await service.get_unmapped_domains(top_domains)
                unmapped_top = unmapped[:1000]
                brand_names = [b[0] for b in brands]

            logger.info(f"Processing {len(unmapped_top)} unmapped domains with AI...")

            # AI processing (NO database connection held open)
            batch_size = 50
            all_ai_mappings = []

            # Create a temporary service just for AI calls (no session needed)
            temp_service = BrandMapperService.__new__(BrandMapperService)
            temp_service.market_id = market_id
            temp_service.client = client
            temp_service._market_config = None
            temp_service._domain_types = None

            # Load market config for AI prompt generation
            async with get_db_context() as session:
                temp_service.session = session
                await temp_service._load_market_config()

            for i in range(0, len(unmapped_top), batch_size):
                batch = unmapped_top[i:i+batch_size]

                try:
                    ai_mappings = await temp_service._call_claude_for_mapping(batch, brand_names)

                    if ai_mappings:
                        all_ai_mappings.extend(ai_mappings)

                    logger.info(f"Processed AI batch {i//batch_size + 1}/{(len(unmapped_top)-1)//batch_size + 1}")

                except Exception as e:
                    error_msg = f"Error in AI mapping batch {i//batch_size + 1}: {str(e)}"
                    logger.error(error_msg)
                    stats["errors"].append(error_msg)

            # Insert AI mappings in batches (fresh DB connections)
            if all_ai_mappings:
                insert_batch_size = 200
                total_inserted = 0
                for i in range(0, len(all_ai_mappings), insert_batch_size):
                    batch = all_ai_mappings[i:i+insert_batch_size]
                    try:
                        async with get_db_context() as session:
                            service = BrandMapperService(session, market_id=market_id)
                            inserted = await service._bulk_save_brand_mappings(batch, domain_id_map)
                            total_inserted += inserted
                            logger.info(f"Inserted AI mapping batch {i//insert_batch_size + 1}: {inserted} mappings")
                    except Exception as e:
                        logger.error(f"Error inserting AI batch {i//insert_batch_size + 1}: {e}")
                        stats["errors"].append(f"AI insert batch {i//insert_batch_size + 1}: {str(e)}")
                stats["ai_mappings"] = total_inserted

        else:
            logger.warning("AI mapping requested but no API key available")

    stats["total_mappings"] = (
        stats["manual_mappings"] + stats["heuristic_mappings"] + stats["ai_mappings"]
    )

    logger.info(f"Comprehensive mapping complete for market {market_id}: {stats}")
    return stats
