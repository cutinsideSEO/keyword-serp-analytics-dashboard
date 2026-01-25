"""
Brand mapping script with comprehensive 3-phase approach.

Maps brands to domains using:
1. Manual mappings from source_data/{market_id}/mappings.json (highest priority)
2. Heuristic matching (brand name in domain)
3. AI analysis for top 1000 unmapped domains by visibility

Folder Structure:
    source_data/
    ├── insurance_il/
    │   ├── keywords.csv
    │   ├── serp.json
    │   └── mappings.json      ← Manual brand-domain mappings
    └── bicycle/
        ├── keywords.csv
        ├── serp.json
        └── mappings.json

Usage:
    python scripts/map_brands.py --market insurance_il   # Map specific market
    python scripts/map_brands.py --all                   # Map ALL markets
    python scripts/map_brands.py --market insurance_il --no-ai  # Skip AI phase
    python scripts/map_brands.py --list                  # List available markets
    python scripts/map_brands.py --create-example        # Create example mappings.json
"""

import argparse
import asyncio
import json
import logging
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

# Fix Windows asyncio issue with psycopg
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from app.config import get_settings
from app.database import init_db
from app.services.brand_mapper import run_comprehensive_mapping

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

settings = get_settings()


def get_source_data_dir() -> Path:
    """Get the source_data directory path."""
    return settings.project_root / "source_data"


def list_available_markets() -> List[str]:
    """
    List all markets that have data in source_data/.

    Returns:
        List of market IDs (folder names)
    """
    source_dir = get_source_data_dir()
    if not source_dir.exists():
        return []

    markets = []
    for folder in source_dir.iterdir():
        if folder.is_dir():
            # Check if folder has data files (keywords imported)
            csv_files = list(folder.glob("*.csv"))
            json_files = [f for f in folder.glob("*.json")
                         if not f.name.startswith("package") and f.name != "mappings.json"]
            mappings_file = folder / "mappings.json"

            status_parts = []
            if csv_files and json_files:
                status_parts.append("data")
            if mappings_file.exists():
                status_parts.append("mappings")

            if status_parts:
                markets.append(f"{folder.name} ({', '.join(status_parts)})")
            elif csv_files or json_files:
                markets.append(f"{folder.name} (partial data)")

    return sorted(markets)


def find_mappings_file(market_id: str) -> Optional[Path]:
    """
    Find mappings.json file for a specific market.

    Args:
        market_id: Market ID (folder name in source_data/)

    Returns:
        Path to mappings.json or None if not found
    """
    source_dir = get_source_data_dir()
    mappings_path = source_dir / market_id / "mappings.json"

    if mappings_path.exists():
        return mappings_path

    return None


def load_manual_mappings(market_id: str) -> Optional[Dict[str, Dict[str, Any]]]:
    """
    Load manual mappings from the market's mappings.json file.

    Args:
        market_id: Market ID

    Returns:
        Dictionary of manual mappings or None

    Example mappings.json format:
    {
        "geico.com": {
            "brand_name": "Geico",
            "domain_type": "Brand",
            "is_primary": true,
            "confidence": 1.0
        },
        "amazon.com": {
            "brand_name": "N/A",
            "domain_type": "Reseller",
            "is_primary": false,
            "confidence": 1.0
        }
    }
    """
    mappings_path = find_mappings_file(market_id)

    if not mappings_path:
        logger.info(f"No mappings.json found for market {market_id}")
        return None

    try:
        with open(mappings_path, "r", encoding="utf-8") as f:
            mappings = json.load(f)
        logger.info(f"Loaded {len(mappings)} manual mappings from {mappings_path}")
        return mappings
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in mappings file {mappings_path}: {e}")
        return None


def create_example_mappings_file(market_id: str = "example_market"):
    """
    Create an example mappings.json file in source_data/{market_id}/.

    Args:
        market_id: Market ID to create example for
    """
    source_dir = get_source_data_dir()
    market_dir = source_dir / market_id
    market_dir.mkdir(parents=True, exist_ok=True)

    example = {
        "_comment": "Manual brand-domain mappings for this market",
        "_domain_types": [
            "Brand - Official brand website",
            "Reseller - Multi-brand retailers/aggregators",
            "UGC - User-generated content (forums, Reddit)",
            "3rd Party - Review sites, news, affiliates"
        ],
        "example-brand.com": {
            "brand_name": "ExampleBrand",
            "domain_type": "Brand",
            "is_primary": True,
            "confidence": 1.0
        },
        "amazon.com": {
            "brand_name": "N/A",
            "domain_type": "Reseller",
            "is_primary": False,
            "confidence": 1.0
        },
        "walmart.com": {
            "brand_name": "N/A",
            "domain_type": "Reseller",
            "is_primary": False,
            "confidence": 1.0
        },
        "reddit.com": {
            "brand_name": "N/A",
            "domain_type": "UGC",
            "is_primary": False,
            "confidence": 1.0
        },
        "review-site.com": {
            "brand_name": "N/A",
            "domain_type": "3rd Party",
            "is_primary": False,
            "confidence": 1.0
        }
    }

    output_path = market_dir / "mappings.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(example, f, indent=2, ensure_ascii=False)

    logger.info(f"Created example mappings file: {output_path}")
    print(f"\nExample mappings file created: {output_path}")
    print("\nEdit this file to add your manual domain mappings.")
    print("Remove the _comment and _domain_types keys before using.")
    print("\nDomain types (use exact names from your market config):")
    print("  - Brand: Official brand website")
    print("  - Reseller: Multi-brand retailers/aggregators")
    print("  - UGC: User-generated content sites")
    print("  - 3rd Party: Reviews, content, news, or affiliate sites")


async def map_market(market_id: str, use_ai: bool = True) -> Dict[str, Any]:
    """
    Run brand mapping for a single market.

    Args:
        market_id: Market ID to map
        use_ai: Whether to use AI for unmapped domains

    Returns:
        Mapping statistics
    """
    logger.info(f"{'='*60}")
    logger.info(f"Mapping brands for market: {market_id}")
    logger.info(f"{'='*60}")

    # Load manual mappings from market folder
    manual_mappings = load_manual_mappings(market_id)

    # Filter out comment keys
    if manual_mappings:
        manual_mappings = {
            k: v for k, v in manual_mappings.items()
            if not k.startswith("_") and isinstance(v, dict)
        }

    await init_db()

    if manual_mappings:
        logger.info(f"Phase 1: Manual mappings ({len(manual_mappings)} domains)")
    else:
        logger.info("Phase 1: Manual mappings (skipped - no mappings.json)")

    logger.info("Phase 2: Heuristic matching (brand name in domain)")

    if use_ai:
        logger.info("Phase 3: AI classification (top 1000 unmapped domains)")
    else:
        logger.info("Phase 3: AI classification (skipped)")

    stats = await run_comprehensive_mapping(
        market_id=market_id,
        manual_mappings=manual_mappings,
        use_ai=use_ai,
    )

    logger.info(f"Mapping complete for {market_id}")
    logger.info(f"  Manual:    {stats['manual_mappings']}")
    logger.info(f"  Heuristic: {stats['heuristic_mappings']}")
    logger.info(f"  AI:        {stats['ai_mappings']}")
    logger.info(f"  Total:     {stats['total_mappings']}")

    return stats


async def map_all_markets(use_ai: bool = True) -> Dict[str, Any]:
    """
    Run brand mapping for all markets.

    Args:
        use_ai: Whether to use AI

    Returns:
        Dictionary of market_id -> stats
    """
    markets = list_available_markets()
    # Extract market IDs (remove status info)
    market_ids = [m.split(" ")[0] for m in markets if "data" in m]

    if not market_ids:
        logger.error("No markets with imported data found")
        return {}

    logger.info(f"Found {len(market_ids)} markets to map: {market_ids}")

    results = {}
    for market_id in market_ids:
        try:
            stats = await map_market(market_id, use_ai=use_ai)
            results[market_id] = {"status": "success", "stats": stats}
        except Exception as e:
            logger.error(f"Failed to map {market_id}: {e}")
            results[market_id] = {"status": "error", "error": str(e)}

    return results


def print_market_list():
    """Print available markets with their mapping status."""
    markets = list_available_markets()
    source_dir = get_source_data_dir()

    print(f"\nSource data directory: {source_dir}")
    print("-" * 50)

    if not markets:
        print("No market data found!")
        print("\nExpected structure:")
        print("  source_data/")
        print("  ├── insurance_il/")
        print("  │   ├── keywords.csv")
        print("  │   ├── serp.json")
        print("  │   └── mappings.json  ← Manual mappings (optional)")
        print("  └── bicycle/")
        print("      ├── keywords.csv")
        print("      ├── serp.json")
        print("      └── mappings.json")
    else:
        print(f"Found {len(markets)} market(s):\n")
        for market in markets:
            print(f"  • {market}")
        print("\nTo add manual mappings, create mappings.json in the market folder.")
        print("Run with --create-example to see the format.")

    print()


async def main(
    market_id: Optional[str] = None,
    map_all: bool = False,
    use_ai: bool = True,
    create_example: bool = False,
    list_markets: bool = False,
):
    """Main entry point."""

    if list_markets:
        print_market_list()
        return

    if create_example:
        target = market_id or "example_market"
        create_example_mappings_file(target)
        return

    if not use_ai:
        logger.warning("AI mapping disabled - will run phases 1 & 2 only")

    if settings.anthropic_api_key == "" and use_ai:
        logger.warning("ANTHROPIC_API_KEY not set - will skip AI phase")
        use_ai = False

    if map_all:
        results = await map_all_markets(use_ai=use_ai)
        print("\n" + "=" * 60)
        print("MAPPING SUMMARY")
        print("=" * 60)
        for market, result in results.items():
            if result["status"] == "success":
                stats = result["stats"]
                print(f"✓ {market}: {stats['total_mappings']} mappings")
            else:
                print(f"✗ {market}: {result['error']}")
        return

    if not market_id:
        # Try to auto-detect if only one market exists
        markets = [m.split(" ")[0] for m in list_available_markets() if "data" in m]
        if len(markets) == 1:
            market_id = markets[0]
            logger.info(f"Auto-detected market: {market_id}")
        else:
            print("Error: --market is required (or use --all to map all markets)")
            print("\nAvailable markets:")
            print_market_list()
            sys.exit(1)

    try:
        await map_market(market_id, use_ai=use_ai)
        logger.info("Brand mapping completed successfully!")
    except Exception as e:
        logger.error(f"Brand mapping failed: {e}")
        raise


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Brand-domain mapping with AI classification",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python map_brands.py --list                    # List available markets
  python map_brands.py --market insurance_il     # Map specific market
  python map_brands.py --all                     # Map all markets
  python map_brands.py --market insurance_il --no-ai  # Skip AI phase
  python map_brands.py --create-example          # Create example mappings.json

Folder structure:
  source_data/
  ├── insurance_il/
  │   ├── keywords.csv      # Keyword data (required)
  │   ├── serp.json         # SERP rankings (required)
  │   └── mappings.json     # Manual mappings (optional)
  └── bicycle/
      ├── keywords.csv
      ├── serp.json
      └── mappings.json

mappings.json format:
  {
    "geico.com": {
      "brand_name": "Geico",
      "domain_type": "Brand",
      "is_primary": true,
      "confidence": 1.0
    },
    "amazon.com": {
      "brand_name": "N/A",
      "domain_type": "Reseller",
      "is_primary": false,
      "confidence": 1.0
    }
  }
        """
    )
    parser.add_argument(
        "--market",
        type=str,
        help="Market ID to map (folder name in source_data/)",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        dest="map_all",
        help="Map ALL markets found in source_data/",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        dest="list_markets",
        help="List available markets",
    )
    parser.add_argument(
        "--no-ai",
        action="store_true",
        help="Disable AI mapping (skip phase 3)",
    )
    parser.add_argument(
        "--create-example",
        action="store_true",
        help="Create an example mappings.json file",
    )

    args = parser.parse_args()

    asyncio.run(
        main(
            market_id=args.market,
            map_all=args.map_all,
            use_ai=not args.no_ai,
            create_example=args.create_example,
            list_markets=args.list_markets,
        )
    )
