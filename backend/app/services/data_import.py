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


class DataImportService:
    """Service for importing data from source files into the database."""

    def __init__(self, session: AsyncSession):
        """
        Initialize the import service.

        Args:
            session: SQLAlchemy async session
        """
        self.session = session
        self._category_cache: Dict[str, int] = {}
        self._domain_cache: Dict[str, int] = {}
        self._keyword_cache: Dict[str, int] = {}

    async def clear_all_data(self) -> Dict[str, int]:
        """
        Clear all data from the database for fresh import.

        Returns:
            Dictionary with counts of deleted records
        """
        logger.info("Clearing all existing data...")

        counts = {}

        # Delete in order due to foreign key constraints
        result = await self.session.execute(delete(SerpResult))
        counts["serp_results"] = result.rowcount

        result = await self.session.execute(delete(KeywordTag))
        counts["keyword_tags"] = result.rowcount

        result = await self.session.execute(delete(BrandDomain))
        counts["brand_domains"] = result.rowcount

        result = await self.session.execute(delete(Keyword))
        counts["keywords"] = result.rowcount

        result = await self.session.execute(delete(Domain))
        counts["domains"] = result.rowcount

        result = await self.session.execute(delete(Category))
        counts["categories"] = result.rowcount

        await self.session.commit()

        # Clear caches
        self._category_cache.clear()
        self._domain_cache.clear()
        self._keyword_cache.clear()

        logger.info(f"Cleared data: {counts}")
        return counts

    async def _get_or_create_category(self, name: str, display_name: str) -> int:
        """
        Get existing category ID or create new one.

        Args:
            name: Normalized category name
            display_name: Human-readable display name

        Returns:
            Category ID
        """
        if name in self._category_cache:
            return self._category_cache[name]

        result = await self.session.execute(
            select(Category).where(Category.name == name)
        )
        category = result.scalar_one_or_none()

        if category is None:
            category = Category(name=name, display_name=display_name)
            self.session.add(category)
            await self.session.flush()
            logger.info(f"Created category: {name}")

        self._category_cache[name] = category.id
        return category.id

    async def _get_or_create_domain(self, domain: str) -> int:
        """
        Get existing domain ID or create new one.

        Args:
            domain: Domain string

        Returns:
            Domain ID
        """
        if domain in self._domain_cache:
            return self._domain_cache[domain]

        result = await self.session.execute(
            select(Domain).where(Domain.domain == domain)
        )
        db_domain = result.scalar_one_or_none()

        if db_domain is None:
            db_domain = Domain(domain=domain)
            self.session.add(db_domain)
            await self.session.flush()

        self._domain_cache[domain] = db_domain.id
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
        if keyword in self._keyword_cache:
            return self._keyword_cache[keyword], False

        result = await self.session.execute(
            select(Keyword).where(Keyword.keyword == keyword)
        )
        db_keyword = result.scalar_one_or_none()

        is_new = db_keyword is None

        if is_new:
            db_keyword = Keyword(
                keyword=keyword,
                volume=volume,
                modifier_group=modifier_group if modifier_group else None,
            )
            self.session.add(db_keyword)
            await self.session.flush()

        self._keyword_cache[keyword] = db_keyword.id
        return db_keyword.id, is_new

    async def import_csv(self, csv_path: Path) -> Dict[str, Any]:
        """
        Import keyword data from CSV file.

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
        logger.info(f"Starting CSV import from: {csv_path}")

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

        # Second pass: import keywords and tags
        with open(csv_path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)

            batch_size = 500
            batch_count = 0

            for row in reader:
                try:
                    keyword_str = row.get(keyword_col, "").strip()
                    if not keyword_str:
                        continue

                    # Parse volume (handle empty or non-numeric)
                    volume_str = row.get(volume_col, "0").strip()
                    try:
                        volume = int(volume_str.replace(",", "")) if volume_str else 0
                    except ValueError:
                        volume = 0

                    modifier_group = row.get(modifier_col, "").strip() if modifier_col else ""

                    # Create keyword (or get existing)
                    keyword_id, is_new = await self._get_or_create_keyword(
                        keyword_str, volume, modifier_group
                    )

                    if is_new:
                        stats["keywords_imported"] += 1
                    else:
                        stats["duplicate_keywords_skipped"] += 1

                    # Only create tags for NEW keywords
                    # If keyword already exists, skip tags (they were already added)
                    if is_new:
                        # Track which categories we've already added for this keyword
                        added_categories = set()

                        for col in tag_columns:
                            value = row.get(col, "").strip()
                            if value:
                                category_name = normalize_category_name(col)

                                # Skip if we've already added this category for this keyword
                                # (handles duplicate column names that normalize to same thing)
                                if category_name in added_categories:
                                    continue

                                category_id = self._category_cache[category_name]

                                tag = KeywordTag(
                                    keyword_id=keyword_id,
                                    category_id=category_id,
                                    value=value,
                                )
                                self.session.add(tag)
                                added_categories.add(category_name)
                                stats["tags_imported"] += 1

                    batch_count += 1
                    if batch_count >= batch_size:
                        await self.session.commit()
                        batch_count = 0
                        logger.info(f"Imported {stats['keywords_imported']} keywords...")

                except Exception as e:
                    # Rollback the session to recover from the error
                    await self.session.rollback()
                    error_msg = f"Error importing keyword '{row.get(keyword_col, 'unknown')}': {str(e)}"
                    logger.error(error_msg)
                    stats["errors"].append(error_msg)
                    batch_count = 0  # Reset batch count after error

        await self.session.commit()
        logger.info(f"CSV import complete: {stats}")
        return stats

    async def import_serp_json(self, json_path: Path) -> Dict[str, Any]:
        """
        Import SERP data from JSON file.

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
        logger.info(f"Starting SERP JSON import from: {json_path}")

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

        # Process in batches
        batch_size = 100
        processed = 0
        batch_results: List[SerpResult] = []

        for keyword_str, results in keywords_data.items():
            try:
                # Find the keyword in the database
                if keyword_str not in self._keyword_cache:
                    result = await self.session.execute(
                        select(Keyword).where(Keyword.keyword == keyword_str)
                    )
                    db_keyword = result.scalar_one_or_none()
                    if db_keyword:
                        self._keyword_cache[keyword_str] = db_keyword.id
                    else:
                        stats["keywords_not_found"] += 1
                        continue

                keyword_id = self._keyword_cache[keyword_str]
                stats["keywords_matched"] += 1

                # Process each SERP result
                for serp_item in results:
                    if not isinstance(serp_item, dict):
                        continue

                    # Extract domain from URL or use provided domain
                    url = serp_item.get("url", "")
                    domain_str = serp_item.get("domain", "") or extract_domain(url)

                    if not domain_str:
                        continue

                    # Get or create domain
                    domain_id = await self._get_or_create_domain(domain_str)

                    # Create SERP result
                    serp_result = SerpResult(
                        keyword_id=keyword_id,
                        domain_id=domain_id,
                        rank_group=serp_item.get("rank_group", 0),
                        rank_absolute=serp_item.get("rank_absolute", 0),
                        page=serp_item.get("page", 1),
                        result_type=serp_item.get("type", "organic"),
                        title=serp_item.get("title"),
                        description=serp_item.get("description"),
                        url=url,
                    )
                    batch_results.append(serp_result)
                    stats["serp_results_imported"] += 1

                processed += 1

                # Commit batch
                if processed % batch_size == 0:
                    self.session.add_all(batch_results)
                    await self.session.commit()
                    batch_results = []
                    logger.info(
                        f"Processed {processed}/{total_keywords} keywords "
                        f"({stats['serp_results_imported']} SERP results)"
                    )

            except Exception as e:
                error_msg = f"Error processing keyword '{keyword_str}': {str(e)}"
                logger.error(error_msg)
                stats["errors"].append(error_msg)

        # Final batch
        if batch_results:
            self.session.add_all(batch_results)
            await self.session.commit()

        stats["domains_found"] = len(self._domain_cache)
        logger.info(f"SERP JSON import complete: {stats}")
        return stats


async def run_full_import(
    csv_path: Path,
    json_path: Path,
    fresh: bool = True
) -> Dict[str, Any]:
    """
    Run complete data import from CSV and JSON files.

    Args:
        csv_path: Path to keyword CSV file
        json_path: Path to SERP JSON file
        fresh: If True, clear all existing data before import

    Returns:
        Combined import statistics
    """
    async with get_db_context() as session:
        service = DataImportService(session)

        # Clear existing data if fresh import
        cleared = {}
        if fresh:
            cleared = await service.clear_all_data()

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
