"""
Data import service for CSV and JSON source files.

Handles parsing and importing keyword data from CSV and SERP data from JSON.
This service is GENERIC - it works with any CSV that has:
  - Keyword column (required)
  - Volume column (required)
  - Modifier Groups column (required)
  - Any other columns become tag categories automatically
"""

import csv
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse

import orjson
from sqlalchemy import delete, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db_context
from app.models import BrandDomain, Category, Domain, Keyword, KeywordTag, SerpResult

logger = logging.getLogger(__name__)


# Required columns (case-insensitive matching)
REQUIRED_COLUMNS = {"keyword", "volume", "modifier groups"}


def find_column(headers: List[str], target: str) -> Optional[str]:
    """
    Find a column by name (case-insensitive).

    Args:
        headers: List of column headers
        target: Target column name (lowercase)

    Returns:
        Actual column name from headers, or None if not found
    """
    target_lower = target.lower().strip()
    for header in headers:
        if header.lower().strip() == target_lower:
            return header
    return None


def normalize_category_name(column_name: str) -> str:
    """
    Convert column name to normalized category name.

    Args:
        column_name: Original column name from CSV

    Returns:
        Normalized snake_case name
    """
    return column_name.lower().strip().replace(" ", "_").replace("-", "_")


def create_display_name(column_name: str) -> str:
    """
    Create human-readable display name from column name.

    Args:
        column_name: Original column name from CSV

    Returns:
        Title-cased display name
    """
    return column_name.strip().title()


def extract_domain(url: str) -> str:
    """
    Extract domain from URL.

    Args:
        url: Full URL string

    Returns:
        Domain without protocol or path
    """
    try:
        parsed = urlparse(url)
        domain = parsed.netloc or parsed.path.split("/")[0]
        # Remove www. prefix for consistency
        if domain.startswith("www."):
            domain = domain[4:]
        return domain.lower()
    except Exception:
        return url.lower()


def sanitize_text(text: Optional[str]) -> Optional[str]:
    """
    Sanitize text by removing null characters that PostgreSQL doesn't support.

    Args:
        text: Input text that may contain null characters

    Returns:
        Sanitized text with null characters removed
    """
    if text is None:
        return None
    # Remove null characters (\x00 / \u0000) which PostgreSQL rejects
    return text.replace("\x00", "").replace("\u0000", "")


class DataImportService:
    """Service for importing data from source files into the database."""

    def __init__(self, session: AsyncSession, market_id: str = "insurance_il"):
        """
        Initialize the import service.

        Args:
            session: SQLAlchemy async session
            market_id: Market ID to import data into
        """
        self.session = session
        self.market_id = market_id
        self._category_cache: Dict[str, int] = {}
        self._domain_cache: Dict[str, int] = {}
        self._keyword_cache: Dict[str, int] = {}

    async def clear_market_data(self) -> Dict[str, int]:
        """
        Clear all data for the current market for fresh import.

        Returns:
            Dictionary with counts of deleted records
        """
        logger.info(f"Clearing all existing data for market: {self.market_id}...")

        counts = {}

        # Use raw SQL with subqueries to avoid parameter limits
        # Delete SERP results for keywords in this market
        result = await self.session.execute(
            text("""
                DELETE FROM serp_results
                WHERE keyword_id IN (
                    SELECT id FROM keywords WHERE market_id = :market_id
                )
            """),
            {"market_id": self.market_id}
        )
        counts["serp_results"] = result.rowcount

        # Delete keyword tags for keywords in this market
        result = await self.session.execute(
            text("""
                DELETE FROM keyword_tags
                WHERE keyword_id IN (
                    SELECT id FROM keywords WHERE market_id = :market_id
                )
            """),
            {"market_id": self.market_id}
        )
        counts["keyword_tags"] = result.rowcount

        # Delete brand domains for this market
        result = await self.session.execute(
            delete(BrandDomain).where(BrandDomain.market_id == self.market_id)
        )
        counts["brand_domains"] = result.rowcount

        # Delete keywords for this market
        result = await self.session.execute(
            delete(Keyword).where(Keyword.market_id == self.market_id)
        )
        counts["keywords"] = result.rowcount

        # Delete domains for this market
        result = await self.session.execute(
            delete(Domain).where(Domain.market_id == self.market_id)
        )
        counts["domains"] = result.rowcount

        # Delete categories for this market
        result = await self.session.execute(
            delete(Category).where(Category.market_id == self.market_id)
        )
        counts["categories"] = result.rowcount

        await self.session.commit()

        # Clear caches
        self._category_cache.clear()
        self._domain_cache.clear()
        self._keyword_cache.clear()

        logger.info(f"Cleared data for market {self.market_id}: {counts}")
        return counts

    async def clear_all_data(self) -> Dict[str, int]:
        """
        Clear all data from the database (all markets) for fresh import.
        DEPRECATED: Use clear_market_data() instead for market-specific clearing.

        Returns:
            Dictionary with counts of deleted records
        """
        logger.warning("clear_all_data() is deprecated. Use clear_market_data() for market-specific clearing.")
        return await self.clear_market_data()

    async def _get_or_create_category(self, name: str, display_name: str) -> int:
        """
        Get existing category ID or create new one.

        Args:
            name: Normalized category name
            display_name: Human-readable display name

        Returns:
            Category ID
        """
        cache_key = f"{self.market_id}:{name}"
        if cache_key in self._category_cache:
            return self._category_cache[cache_key]

        result = await self.session.execute(
            select(Category).where(
                Category.market_id == self.market_id,
                Category.name == name
            )
        )
        category = result.scalar_one_or_none()

        if category is None:
            category = Category(market_id=self.market_id, name=name, display_name=display_name)
            self.session.add(category)
            await self.session.flush()
            logger.info(f"Created category: {name} for market {self.market_id}")

        self._category_cache[cache_key] = category.id
        return category.id

    async def _get_or_create_domain(self, domain: str) -> int:
        """
        Get existing domain ID or create new one.

        Args:
            domain: Domain string

        Returns:
            Domain ID
        """
        cache_key = f"{self.market_id}:{domain}"
        if cache_key in self._domain_cache:
            return self._domain_cache[cache_key]

        result = await self.session.execute(
            select(Domain).where(
                Domain.market_id == self.market_id,
                Domain.domain == domain
            )
        )
        db_domain = result.scalar_one_or_none()

        if db_domain is None:
            db_domain = Domain(market_id=self.market_id, domain=domain)
            self.session.add(db_domain)
            await self.session.flush()

        self._domain_cache[cache_key] = db_domain.id
        return db_domain.id

    async def _get_or_create_keyword(
        self, keyword: str, volume: int, modifier_group: Optional[str]
    ) -> tuple[int, bool]:
        """
        Get existing keyword ID or create new one.

        Args:
            keyword: Keyword string
            volume: Search volume
            modifier_group: Modifier group value

        Returns:
            Tuple of (keyword_id, is_new)
        """
        cache_key = f"{self.market_id}:{keyword}"
        if cache_key in self._keyword_cache:
            return self._keyword_cache[cache_key], False

        result = await self.session.execute(
            select(Keyword).where(
                Keyword.market_id == self.market_id,
                Keyword.keyword == keyword
            )
        )
        db_keyword = result.scalar_one_or_none()

        is_new = db_keyword is None

        if is_new:
            db_keyword = Keyword(
                market_id=self.market_id,
                keyword=keyword,
                volume=volume,
                modifier_group=modifier_group if modifier_group else None,
            )
            self.session.add(db_keyword)
            await self.session.flush()

        self._keyword_cache[cache_key] = db_keyword.id
        return db_keyword.id, is_new

    # =========================================================================
    # BULK INSERT METHODS (Optimized for large imports)
    # =========================================================================

    async def _bulk_insert_keywords(
        self, keyword_data: List[Dict[str, Any]]
    ) -> Dict[str, int]:
        """
        Bulk insert keywords and return mapping of keyword -> id.

        Args:
            keyword_data: List of dicts with keys: keyword, volume, modifier_group

        Returns:
            Dict mapping keyword string to database id
        """
        if not keyword_data:
            return {}

        # Use INSERT ... ON CONFLICT with RETURNING to get IDs
        # Note: Use CAST() instead of :: to avoid SQLAlchemy parameter parsing issues
        result = await self.session.execute(
            text("""
                INSERT INTO keywords (market_id, keyword, volume, modifier_group, created_at)
                SELECT
                    :market_id,
                    d.keyword,
                    CAST(d.volume AS INTEGER),
                    d.modifier_group,
                    NOW()
                FROM jsonb_to_recordset(CAST(:data AS jsonb)) AS d(
                    keyword TEXT,
                    volume INTEGER,
                    modifier_group TEXT
                )
                ON CONFLICT (market_id, keyword) DO UPDATE
                    SET volume = EXCLUDED.volume
                RETURNING id, keyword
            """),
            {
                "market_id": self.market_id,
                "data": orjson.dumps(keyword_data).decode()
            }
        )

        # Build keyword -> id mapping
        return {row.keyword: row.id for row in result.fetchall()}

    async def _bulk_insert_tags(
        self, tag_data: List[Dict[str, Any]]
    ) -> int:
        """
        Bulk insert keyword tags.

        Args:
            tag_data: List of dicts with keys: keyword_id, category_id, value

        Returns:
            Number of tags inserted
        """
        if not tag_data:
            return 0

        result = await self.session.execute(
            text("""
                INSERT INTO keyword_tags (keyword_id, category_id, value, created_at)
                SELECT
                    CAST(d.keyword_id AS INTEGER),
                    CAST(d.category_id AS INTEGER),
                    d.value,
                    NOW()
                FROM jsonb_to_recordset(CAST(:data AS jsonb)) AS d(
                    keyword_id INTEGER,
                    category_id INTEGER,
                    value TEXT
                )
                ON CONFLICT (keyword_id, category_id) DO UPDATE
                    SET value = EXCLUDED.value
            """),
            {"data": orjson.dumps(tag_data).decode()}
        )

        return result.rowcount or len(tag_data)

    async def _bulk_insert_domains(
        self, domains: List[str]
    ) -> Dict[str, int]:
        """
        Bulk insert domains and return mapping of domain -> id.

        Args:
            domains: List of domain strings

        Returns:
            Dict mapping domain string to database id
        """
        if not domains:
            return {}

        # Deduplicate
        unique_domains = list(set(domains))

        result = await self.session.execute(
            text("""
                INSERT INTO domains (market_id, domain, created_at)
                SELECT :market_id, d.domain, NOW()
                FROM jsonb_to_recordset(CAST(:data AS jsonb)) AS d(domain TEXT)
                ON CONFLICT (market_id, domain) DO UPDATE
                    SET domain = EXCLUDED.domain
                RETURNING id, domain
            """),
            {
                "market_id": self.market_id,
                "data": orjson.dumps([{"domain": d} for d in unique_domains]).decode()
            }
        )

        return {row.domain: row.id for row in result.fetchall()}

    async def _bulk_insert_serp_results(
        self, serp_data: List[Dict[str, Any]]
    ) -> int:
        """
        Bulk insert SERP results.

        Args:
            serp_data: List of dicts with SERP result data

        Returns:
            Number of results inserted
        """
        if not serp_data:
            return 0

        result = await self.session.execute(
            text("""
                INSERT INTO serp_results (
                    keyword_id, domain_id, rank_group, rank_absolute,
                    page, result_type, title, description, url, created_at
                )
                SELECT
                    CAST(d.keyword_id AS INTEGER),
                    CAST(d.domain_id AS INTEGER),
                    CAST(d.rank_group AS INTEGER),
                    CAST(d.rank_absolute AS INTEGER),
                    CAST(d.page AS INTEGER),
                    d.result_type,
                    d.title,
                    d.description,
                    d.url,
                    NOW()
                FROM jsonb_to_recordset(CAST(:data AS jsonb)) AS d(
                    keyword_id INTEGER,
                    domain_id INTEGER,
                    rank_group INTEGER,
                    rank_absolute INTEGER,
                    page INTEGER,
                    result_type TEXT,
                    title TEXT,
                    description TEXT,
                    url TEXT
                )
            """),
            {"data": orjson.dumps(serp_data).decode()}
        )

        return result.rowcount or len(serp_data)

    async def _preload_keyword_ids(self) -> Dict[str, int]:
        """
        Load all keyword IDs for the market in one query.

        Returns:
            Dict mapping keyword string to database id
        """
        result = await self.session.execute(
            select(Keyword.id, Keyword.keyword)
            .where(Keyword.market_id == self.market_id)
        )
        return {row.keyword: row.id for row in result.fetchall()}

    # =========================================================================
    # IMPORT METHODS
    # =========================================================================

    async def import_csv(self, csv_path: Path) -> Dict[str, Any]:
        """
        Import keyword data from CSV file using bulk operations.

        The CSV must have these columns (case-insensitive):
        - Keyword: The keyword string
        - Volume: Monthly search volume
        - Modifier Groups: Keyword modifier category

        All other columns are automatically treated as tag categories.

        Args:
            csv_path: Path to the CSV file

        Returns:
            Import statistics dictionary
        """
        logger.info(f"Starting CSV import (BULK MODE) from: {csv_path}")

        stats = {
            "keywords_imported": 0,
            "duplicate_keywords_skipped": 0,
            "tags_imported": 0,
            "categories_created": 0,
            "errors": [],
        }

        # First pass: identify columns and create categories
        with open(csv_path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            headers = reader.fieldnames or []

            # Find required columns (case-insensitive)
            keyword_col = find_column(headers, "keyword")
            volume_col = find_column(headers, "volume")
            modifier_col = find_column(headers, "modifier groups")

            if not keyword_col:
                raise ValueError("CSV must have a 'Keyword' column")
            if not volume_col:
                raise ValueError("CSV must have a 'Volume' column")

            logger.info(f"Found columns - Keyword: '{keyword_col}', Volume: '{volume_col}', Modifier: '{modifier_col}'")

            # Identify tag columns (everything else)
            required_cols_actual = {keyword_col, volume_col}
            if modifier_col:
                required_cols_actual.add(modifier_col)

            tag_columns = [col for col in headers if col not in required_cols_actual]
            logger.info(f"Found {len(tag_columns)} tag categories: {tag_columns[:5]}{'...' if len(tag_columns) > 5 else ''}")

            # Pre-create all categories
            for col in tag_columns:
                name = normalize_category_name(col)
                display_name = create_display_name(col)
                await self._get_or_create_category(name, display_name)
                stats["categories_created"] += 1

        await self.session.commit()
        logger.info(f"Created {stats['categories_created']} categories")

        # Second pass: load ALL rows into memory for batch processing
        logger.info("Loading CSV into memory...")
        all_rows = []
        with open(csv_path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                all_rows.append(row)

        total_rows = len(all_rows)
        logger.info(f"Loaded {total_rows} rows into memory")

        # Process in large batches
        batch_size = 5000  # Much larger batches for bulk insert

        for batch_start in range(0, total_rows, batch_size):
            batch_end = min(batch_start + batch_size, total_rows)
            batch_rows = all_rows[batch_start:batch_end]

            try:
                # Step 1: Prepare keyword data for bulk insert
                keyword_data = []
                row_keyword_map = {}  # Map row index to keyword string

                for i, row in enumerate(batch_rows):
                    keyword_str = row.get(keyword_col, "").strip()
                    if not keyword_str:
                        continue

                    # Parse volume (handle empty or non-numeric)
                    volume_str = row.get(volume_col, "0").strip()
                    try:
                        volume = int(volume_str.replace(",", "")) if volume_str else 0
                    except ValueError:
                        volume = 0

                    modifier_group = row.get(modifier_col, "").strip() if modifier_col else None

                    keyword_data.append({
                        "keyword": keyword_str,
                        "volume": volume,
                        "modifier_group": modifier_group
                    })
                    row_keyword_map[i] = keyword_str

                # Step 2: Bulk insert keywords (ONE DB call for entire batch)
                keyword_id_map = await self._bulk_insert_keywords(keyword_data)
                stats["keywords_imported"] += len(keyword_id_map)

                # Update cache with new IDs
                for keyword_str, keyword_id in keyword_id_map.items():
                    cache_key = f"{self.market_id}:{keyword_str}"
                    self._keyword_cache[cache_key] = keyword_id

                # Step 3: Prepare tag data using the returned IDs
                tag_data = []
                seen_keyword_categories = set()  # Track (keyword_id, category_id) pairs

                for i, row in enumerate(batch_rows):
                    keyword_str = row_keyword_map.get(i)
                    if not keyword_str:
                        continue

                    keyword_id = keyword_id_map.get(keyword_str)
                    if not keyword_id:
                        continue

                    for col in tag_columns:
                        value = row.get(col, "").strip()
                        if value:
                            category_name = normalize_category_name(col)
                            cache_key = f"{self.market_id}:{category_name}"
                            category_id = self._category_cache.get(cache_key)

                            if category_id:
                                # Skip duplicates within this batch
                                pair_key = (keyword_id, category_id)
                                if pair_key in seen_keyword_categories:
                                    continue
                                seen_keyword_categories.add(pair_key)

                                tag_data.append({
                                    "keyword_id": keyword_id,
                                    "category_id": category_id,
                                    "value": value
                                })

                # Step 4: Bulk insert tags (ONE DB call for entire batch)
                if tag_data:
                    tags_inserted = await self._bulk_insert_tags(tag_data)
                    stats["tags_imported"] += tags_inserted

                # Commit this batch
                await self.session.commit()

                logger.info(
                    f"Imported batch {batch_start}-{batch_end} "
                    f"({stats['keywords_imported']} keywords, {stats['tags_imported']} tags)"
                )

            except Exception as e:
                await self.session.rollback()
                error_msg = f"Error importing batch {batch_start}-{batch_end}: {str(e)}"
                logger.error(error_msg)
                stats["errors"].append(error_msg)

        logger.info(f"CSV import complete: {stats}")
        return stats

    async def import_serp_json(self, json_path: Path) -> Dict[str, Any]:
        """
        Import SERP data from JSON file using bulk operations.

        The JSON structure is:
        {
            "keywords": {
                "keyword_string": [
                    {
                        "type": "organic",
                        "rank_group": 1,
                        "rank_absolute": 2,
                        "page": 1,
                        "domain": "example.com",
                        "title": "...",
                        "description": "...",
                        "url": "https://..."
                    },
                    ...
                ],
                ...
            }
        }

        Args:
            json_path: Path to the JSON file

        Returns:
            Import statistics dictionary
        """
        logger.info(f"Starting SERP JSON import (BULK MODE) from: {json_path}")

        stats = {
            "serp_results_imported": 0,
            "domains_found": 0,
            "keywords_matched": 0,
            "keywords_not_found": 0,
            "errors": [],
        }

        # Load JSON file (using orjson for speed)
        logger.info("Loading JSON file (this may take a moment for large files)...")
        with open(json_path, "rb") as f:
            data = orjson.loads(f.read())

        keywords_data = data.get("keywords", {})
        total_keywords = len(keywords_data)
        logger.info(f"Found {total_keywords} keywords in SERP data")

        # Step 1: Pre-load ALL keyword IDs in one query
        logger.info("Pre-loading keyword IDs...")
        keyword_id_map = await self._preload_keyword_ids()
        logger.info(f"Loaded {len(keyword_id_map)} keyword IDs")

        # Step 2: First pass - collect all unique domains
        logger.info("Extracting unique domains...")
        all_domains = set()
        for keyword_str, results in keywords_data.items():
            if keyword_str not in keyword_id_map:
                continue
            for serp_item in results:
                if isinstance(serp_item, dict):
                    url = serp_item.get("url", "")
                    domain = serp_item.get("domain", "") or extract_domain(url)
                    if domain:
                        all_domains.add(domain)

        logger.info(f"Found {len(all_domains)} unique domains")

        # Step 3: Bulk insert all domains (ONE DB call)
        logger.info("Bulk inserting domains...")
        domain_id_map = await self._bulk_insert_domains(list(all_domains))
        await self.session.commit()
        stats["domains_found"] = len(domain_id_map)
        logger.info(f"Inserted/updated {len(domain_id_map)} domains")

        # Update domain cache
        for domain_str, domain_id in domain_id_map.items():
            cache_key = f"{self.market_id}:{domain_str}"
            self._domain_cache[cache_key] = domain_id

        # Step 4: Process SERP results in batches
        # Use smaller batches to avoid Supabase statement timeout (60s default)
        batch_size = 2000  # Smaller batches for reliability
        serp_batch = []
        processed_keywords = 0

        async def insert_batch_with_retry(batch: List[Dict], max_retries: int = 3) -> int:
            """Insert batch with exponential backoff on smaller chunks if timeout occurs."""
            current_batch = batch
            chunk_size = len(batch)

            for attempt in range(max_retries):
                try:
                    if chunk_size < len(batch):
                        # Split into smaller chunks and insert sequentially
                        total_inserted = 0
                        for i in range(0, len(batch), chunk_size):
                            chunk = batch[i:i + chunk_size]
                            inserted = await self._bulk_insert_serp_results(chunk)
                            total_inserted += inserted
                            await self.session.commit()
                        return total_inserted
                    else:
                        inserted = await self._bulk_insert_serp_results(current_batch)
                        await self.session.commit()
                        return inserted
                except Exception as e:
                    await self.session.rollback()
                    error_str = str(e).lower()

                    # Check if it's a timeout error
                    if "timeout" in error_str or "cancel" in error_str:
                        # Reduce chunk size by half for next attempt
                        chunk_size = max(100, chunk_size // 2)
                        logger.warning(
                            f"Timeout on batch insert (attempt {attempt + 1}), "
                            f"retrying with chunk_size={chunk_size}"
                        )
                        continue
                    else:
                        # Non-timeout error, don't retry
                        raise

            # All retries exhausted
            raise Exception(f"Failed to insert batch after {max_retries} retries")

        for keyword_str, results in keywords_data.items():
            keyword_id = keyword_id_map.get(keyword_str)
            if not keyword_id:
                stats["keywords_not_found"] += 1
                continue

            stats["keywords_matched"] += 1

            for serp_item in results:
                if not isinstance(serp_item, dict):
                    continue

                url = serp_item.get("url", "")
                domain = serp_item.get("domain", "") or extract_domain(url)
                domain_id = domain_id_map.get(domain)

                if not domain_id:
                    continue

                serp_batch.append({
                    "keyword_id": keyword_id,
                    "domain_id": domain_id,
                    "rank_group": serp_item.get("rank_group", 0),
                    "rank_absolute": serp_item.get("rank_absolute", 0),
                    "page": serp_item.get("page", 1),
                    "result_type": serp_item.get("type", "organic"),
                    "title": sanitize_text(serp_item.get("title")),
                    "description": sanitize_text(serp_item.get("description")),
                    "url": sanitize_text(url),
                })

            processed_keywords += 1

            # Flush batch when full
            if len(serp_batch) >= batch_size:
                try:
                    inserted = await insert_batch_with_retry(serp_batch)
                    stats["serp_results_imported"] += inserted
                    logger.info(
                        f"Processed {processed_keywords}/{total_keywords} keywords "
                        f"({stats['serp_results_imported']} SERP results)"
                    )
                except Exception as e:
                    error_msg = f"Error inserting SERP batch: {str(e)}"
                    logger.error(error_msg)
                    stats["errors"].append(error_msg)
                serp_batch = []

        # Final batch
        if serp_batch:
            try:
                inserted = await insert_batch_with_retry(serp_batch)
                stats["serp_results_imported"] += inserted
            except Exception as e:
                error_msg = f"Error inserting final SERP batch: {str(e)}"
                logger.error(error_msg)
                stats["errors"].append(error_msg)

        logger.info(f"SERP JSON import complete: {stats}")
        return stats


async def run_full_import(
    csv_path: Path,
    json_path: Path,
    market_id: str = "insurance_il",
    fresh: bool = True
) -> Dict[str, Any]:
    """
    Run complete data import from CSV and JSON files.

    Args:
        csv_path: Path to keyword CSV file
        json_path: Path to SERP JSON file
        market_id: Market ID to import data into
        fresh: If True, clear all existing data before import

    Returns:
        Combined import statistics
    """
    async with get_db_context() as session:
        service = DataImportService(session, market_id=market_id)

        # Clear existing data if fresh import
        cleared = {}
        if fresh:
            cleared = await service.clear_market_data()

        # Import CSV first (creates keywords)
        csv_stats = await service.import_csv(csv_path)

        # Then import SERP data (references keywords)
        json_stats = await service.import_serp_json(json_path)

        return {
            "cleared": cleared,
            "csv_import": csv_stats,
            "json_import": json_stats,
            "status": "completed",
        }
