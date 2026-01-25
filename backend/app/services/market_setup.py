"""
Market setup service for config-based market initialization.

Reads config.json from market folders and creates/updates markets
and domain types in the database before data import.
"""

import json
import logging
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert

from app.models import Market, MarketDomainType

logger = logging.getLogger(__name__)


def normalize_category_name(name: str) -> str:
    """
    Normalize category name to match database format.

    Config files may use display names like "Insurance Company - Canonical"
    but categories are stored with normalized names like "insurance_company___canonical".
    """
    return name.lower().strip().replace(" ", "_").replace("-", "_")


# =============================================================================
# COLOR PRESETS
# =============================================================================

COLOR_PRESETS: dict[str, dict[str, str]] = {
    "blue": {
        "tremor_color": "blue",
        "hex_color": "#3B82F6",
        "gradient": "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
        "bg_class": "bg-blue-50",
        "text_class": "text-blue-700",
        "border_class": "border-blue-200",
    },
    "purple": {
        "tremor_color": "purple",
        "hex_color": "#8B5CF6",
        "gradient": "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
        "bg_class": "bg-purple-50",
        "text_class": "text-purple-700",
        "border_class": "border-purple-200",
    },
    "orange": {
        "tremor_color": "orange",
        "hex_color": "#F97316",
        "gradient": "linear-gradient(135deg, #F97316 0%, #EA580C 100%)",
        "bg_class": "bg-orange-50",
        "text_class": "text-orange-700",
        "border_class": "border-orange-200",
    },
    "amber": {
        "tremor_color": "amber",
        "hex_color": "#F59E0B",
        "gradient": "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
        "bg_class": "bg-amber-50",
        "text_class": "text-amber-700",
        "border_class": "border-amber-200",
    },
    "emerald": {
        "tremor_color": "emerald",
        "hex_color": "#10B981",
        "gradient": "linear-gradient(135deg, #10B981 0%, #059669 100%)",
        "bg_class": "bg-emerald-50",
        "text_class": "text-emerald-700",
        "border_class": "border-emerald-200",
    },
    "teal": {
        "tremor_color": "teal",
        "hex_color": "#14B8A6",
        "gradient": "linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)",
        "bg_class": "bg-teal-50",
        "text_class": "text-teal-700",
        "border_class": "border-teal-200",
    },
    "rose": {
        "tremor_color": "rose",
        "hex_color": "#F43F5E",
        "gradient": "linear-gradient(135deg, #F43F5E 0%, #E11D48 100%)",
        "bg_class": "bg-rose-50",
        "text_class": "text-rose-700",
        "border_class": "border-rose-200",
    },
    "indigo": {
        "tremor_color": "indigo",
        "hex_color": "#6366F1",
        "gradient": "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
        "bg_class": "bg-indigo-50",
        "text_class": "text-indigo-700",
        "border_class": "border-indigo-200",
    },
    "cyan": {
        "tremor_color": "cyan",
        "hex_color": "#06B6D4",
        "gradient": "linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)",
        "bg_class": "bg-cyan-50",
        "text_class": "text-cyan-700",
        "border_class": "border-cyan-200",
    },
    "gray": {
        "tremor_color": "gray",
        "hex_color": "#6B7280",
        "gradient": "linear-gradient(135deg, #6B7280 0%, #4B5563 100%)",
        "bg_class": "bg-gray-50",
        "text_class": "text-gray-700",
        "border_class": "border-gray-200",
    },
}


def expand_color_preset(color: str) -> dict[str, str]:
    """
    Expand a color name into full styling properties.

    Args:
        color: Color preset name (e.g., "blue", "purple")

    Returns:
        Dictionary with tremor_color, hex_color, gradient, bg_class, text_class, border_class

    Raises:
        ValueError: If color is not a recognized preset
    """
    if color not in COLOR_PRESETS:
        available = ", ".join(sorted(COLOR_PRESETS.keys()))
        raise ValueError(f"Unknown color preset '{color}'. Available: {available}")
    return COLOR_PRESETS[color].copy()


def generate_template_config() -> dict[str, Any]:
    """
    Generate a template config.json for a new market.

    Returns:
        Dictionary with market template structure
    """
    return {
        "market": {
            "name": "My Market Name",
            "industry_context": "Description of the industry for AI classification",
            "language": "en",
            "text_direction": "ltr",
            "brand_category_names": ["Brand - Canonical"]
        },
        "domain_types": [
            {
                "type_id": "brand",
                "display_name": "Brand",
                "ai_description": "Official brand website selling their own products directly",
                "is_brand_type": True,
                "color": "blue",
                "icon": "Building2",
                "examples": ["example-brand.com"]
            },
            {
                "type_id": "retailer",
                "display_name": "Retailer",
                "ai_description": "Multi-brand retailers selling products from various brands",
                "is_brand_type": False,
                "color": "purple",
                "icon": "ShoppingCart",
                "examples": ["amazon.com", "ebay.com"]
            },
            {
                "type_id": "media",
                "display_name": "Media/Review",
                "ai_description": "Review sites, news outlets, and content publishers",
                "is_brand_type": False,
                "color": "emerald",
                "icon": "Newspaper",
                "examples": ["techcrunch.com", "reviews.com"]
            },
            {
                "type_id": "ugc",
                "display_name": "UGC",
                "ai_description": "User-generated content platforms like forums, social media, Q&A",
                "is_brand_type": False,
                "color": "amber",
                "icon": "Users",
                "examples": ["reddit.com", "quora.com"]
            }
        ]
    }


async def ensure_market_exists(
    session: AsyncSession,
    market_id: str,
    config: dict[str, Any]
) -> Market:
    """
    Create or update a market record from config.

    Args:
        session: Database session
        market_id: Market ID (from folder name)
        config: Parsed config.json content

    Returns:
        Market object
    """
    market_config = config.get("market", {})

    # Normalize brand category names to match database category format
    # Config may use display names like "Insurance Company - Canonical"
    # but categories are stored as "insurance_company___canonical"
    raw_brand_categories = market_config.get("brand_category_names", ["Brand"])
    normalized_brand_categories = [normalize_category_name(n) for n in raw_brand_categories]

    # Prepare market data
    market_data = {
        "id": market_id,
        "name": market_config.get("name", market_id),
        "industry_context": market_config.get("industry_context", ""),
        "language": market_config.get("language", "en"),
        "text_direction": market_config.get("text_direction", "ltr"),
        "brand_category_names": json.dumps(normalized_brand_categories),
        "is_active": True,
    }

    # Upsert market using PostgreSQL ON CONFLICT
    stmt = insert(Market).values(**market_data)
    stmt = stmt.on_conflict_do_update(
        index_elements=["id"],
        set_={
            "name": stmt.excluded.name,
            "industry_context": stmt.excluded.industry_context,
            "language": stmt.excluded.language,
            "text_direction": stmt.excluded.text_direction,
            "brand_category_names": stmt.excluded.brand_category_names,
            "is_active": stmt.excluded.is_active,
        }
    )
    await session.execute(stmt)
    await session.flush()

    # Fetch and return the market
    result = await session.execute(select(Market).where(Market.id == market_id))
    market = result.scalar_one()

    logger.info(f"Market '{market_id}' configured: {market.name}")
    return market


async def ensure_domain_types_exist(
    session: AsyncSession,
    market_id: str,
    domain_types: list[dict[str, Any]]
) -> list[MarketDomainType]:
    """
    Create or update domain types for a market.

    Args:
        session: Database session
        market_id: Market ID
        domain_types: List of domain type configs from config.json

    Returns:
        List of MarketDomainType objects
    """
    created_types = []

    for sort_order, dt_config in enumerate(domain_types):
        type_id = dt_config.get("type_id")
        if not type_id:
            logger.warning(f"Domain type missing type_id, skipping: {dt_config}")
            continue

        # Expand color preset
        color = dt_config.get("color", "gray")
        try:
            color_styles = expand_color_preset(color)
        except ValueError as e:
            logger.warning(f"Invalid color for {type_id}: {e}. Using gray.")
            color_styles = expand_color_preset("gray")

        # Build domain type data
        dt_data = {
            "market_id": market_id,
            "type_id": type_id,
            "display_name": dt_config.get("display_name", type_id.replace("_", " ").title()),
            "ai_description": dt_config.get("ai_description", ""),
            "is_brand_type": dt_config.get("is_brand_type", False),
            "icon": dt_config.get("icon", "Building2"),
            "examples": json.dumps(dt_config.get("examples", [])),
            "sort_order": sort_order,
            **color_styles,
        }

        # Upsert domain type using index_elements for composite unique key
        stmt = insert(MarketDomainType).values(**dt_data)
        stmt = stmt.on_conflict_do_update(
            index_elements=["market_id", "type_id"],
            set_={
                "display_name": stmt.excluded.display_name,
                "ai_description": stmt.excluded.ai_description,
                "is_brand_type": stmt.excluded.is_brand_type,
                "tremor_color": stmt.excluded.tremor_color,
                "hex_color": stmt.excluded.hex_color,
                "gradient": stmt.excluded.gradient,
                "bg_class": stmt.excluded.bg_class,
                "text_class": stmt.excluded.text_class,
                "border_class": stmt.excluded.border_class,
                "icon": stmt.excluded.icon,
                "examples": stmt.excluded.examples,
                "sort_order": stmt.excluded.sort_order,
            }
        )
        await session.execute(stmt)

        logger.info(f"  Domain type '{type_id}' ({color_styles['tremor_color']})")

    await session.flush()

    # Fetch all domain types for this market
    result = await session.execute(
        select(MarketDomainType)
        .where(MarketDomainType.market_id == market_id)
        .order_by(MarketDomainType.sort_order)
    )
    return list(result.scalars().all())


async def setup_market_from_config(
    session: AsyncSession,
    market_id: str,
    config: dict[str, Any]
) -> tuple[Market, list[MarketDomainType]]:
    """
    Setup market and domain types from config.json.

    This is the main entry point called by the import script.

    Args:
        session: Database session
        market_id: Market ID (from folder name)
        config: Parsed config.json content

    Returns:
        Tuple of (Market, list of MarketDomainType)
    """
    logger.info(f"Setting up market from config: {market_id}")

    # Create/update market
    market = await ensure_market_exists(session, market_id, config)

    # Create/update domain types
    domain_types = config.get("domain_types", [])
    if not domain_types:
        logger.warning(f"No domain_types in config for {market_id}, using defaults")
        domain_types = generate_template_config()["domain_types"]

    dt_objects = await ensure_domain_types_exist(session, market_id, domain_types)

    await session.commit()
    logger.info(f"Market setup complete: {market.name} with {len(dt_objects)} domain types")

    return market, dt_objects


def load_config_file(config_path: Path) -> dict[str, Any]:
    """
    Load and validate a config.json file.

    Args:
        config_path: Path to config.json

    Returns:
        Parsed config dictionary

    Raises:
        FileNotFoundError: If config file doesn't exist
        json.JSONDecodeError: If config is invalid JSON
        ValueError: If config is missing required fields
    """
    if not config_path.exists():
        raise FileNotFoundError(f"Config file not found: {config_path}")

    with open(config_path, "r", encoding="utf-8") as f:
        config = json.load(f)

    # Validate required fields
    if "market" not in config:
        raise ValueError(f"Config missing 'market' section: {config_path}")

    if "domain_types" not in config:
        raise ValueError(f"Config missing 'domain_types' section: {config_path}")

    if not config["domain_types"]:
        raise ValueError(f"Config has empty 'domain_types': {config_path}")

    return config


def find_config_file(market_dir: Path) -> Path:
    """
    Find config.json in a market directory.

    Args:
        market_dir: Path to market folder

    Returns:
        Path to config.json

    Raises:
        FileNotFoundError: If config.json doesn't exist
    """
    config_path = market_dir / "config.json"
    if not config_path.exists():
        raise FileNotFoundError(
            f"config.json not found in {market_dir}\n"
            f"Run: python import_data.py --create-config --market {market_dir.name}"
        )
    return config_path


def create_template_config_file(market_dir: Path, market_id: str) -> Path:
    """
    Create a template config.json file in a market directory.

    Args:
        market_dir: Path to market folder
        market_id: Market ID for customizing template

    Returns:
        Path to created config.json
    """
    # Create directory if needed
    market_dir.mkdir(parents=True, exist_ok=True)

    config_path = market_dir / "config.json"

    # Generate template with market-specific values
    template = generate_template_config()
    template["market"]["name"] = f"{market_id.replace('_', ' ').title()} Market"

    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(template, f, indent=2, ensure_ascii=False)

    return config_path
