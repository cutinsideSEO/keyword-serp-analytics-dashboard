"""
Brand mapping script with comprehensive 3-phase approach.

Maps brands to domains using:
1. Manual mappings (highest priority)
2. Heuristic matching (brand name in domain)
3. AI analysis for top 1000 unmapped domains by visibility

Usage:
    python scripts/map_brands.py                                    # Run all phases with AI
    python scripts/map_brands.py --no-ai                            # Skip AI phase
    python scripts/map_brands.py --manual manual_mappings.json     # With manual mappings file
"""

import argparse
import asyncio
import json
import logging
import sys
from pathlib import Path
from typing import Any, Dict, Optional

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


def load_manual_mappings(file_path: Optional[str]) -> Optional[Dict[str, Dict[str, Any]]]:
    """
    Load manual mappings from a JSON file.

    Args:
        file_path: Path to JSON file containing manual mappings

    Returns:
        Dictionary of manual mappings or None

    Example JSON format:
    {
        "trekbikes.com": {
            "brand_name": "Trek",
            "domain_type": "Brand",
            "is_primary": true,
            "confidence": 1.0
        },
        "amazon.com": {
            "brand_name": "N/A",
            "domain_type": "Reseller",
            "is_primary": false,
            "confidence": 1.0
        },
        "reddit.com": {
            "brand_name": "N/A",
            "domain_type": "UGC",
            "is_primary": false,
            "confidence": 1.0
        },
        "bikeradar.com": {
            "brand_name": "N/A",
            "domain_type": "3rd Party",
            "is_primary": false,
            "confidence": 1.0
        }
    }
    """
    if not file_path:
        return None

    try:
        with open(file_path, "r") as f:
            mappings = json.load(f)
        logger.info(f"Loaded {len(mappings)} manual mappings from {file_path}")
        return mappings
    except FileNotFoundError:
        logger.error(f"Manual mappings file not found: {file_path}")
        return None
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in manual mappings file: {e}")
        return None


def create_example_manual_mappings_file(output_path: str = "manual_mappings_example.json"):
    """
    Create an example manual mappings JSON file.

    Args:
        output_path: Where to save the example file
    """
    example = {
        "trekbikes.com": {
            "brand_name": "Trek",
            "domain_type": "Brand",
            "is_primary": True,
            "confidence": 1.0,
        },
        "giant-bicycles.com": {
            "brand_name": "Giant",
            "domain_type": "Brand",
            "is_primary": True,
            "confidence": 1.0,
        },
        "amazon.com": {
            "brand_name": "N/A",
            "domain_type": "Reseller",
            "is_primary": False,
            "confidence": 1.0,
        },
        "walmart.com": {
            "brand_name": "N/A",
            "domain_type": "Reseller",
            "is_primary": False,
            "confidence": 1.0,
        },
        "reddit.com": {
            "brand_name": "N/A",
            "domain_type": "UGC",
            "is_primary": False,
            "confidence": 1.0,
        },
        "bikeforums.net": {
            "brand_name": "N/A",
            "domain_type": "UGC",
            "is_primary": False,
            "confidence": 1.0,
        },
        "bikeradar.com": {
            "brand_name": "N/A",
            "domain_type": "3rd Party",
            "is_primary": False,
            "confidence": 1.0,
        },
        "cyclingnews.com": {
            "brand_name": "N/A",
            "domain_type": "3rd Party",
            "is_primary": False,
            "confidence": 1.0,
        },
    }

    output_file = Path(output_path)
    with open(output_file, "w") as f:
        json.dump(example, f, indent=2)

    logger.info(f"Created example manual mappings file: {output_file}")
    print(f"\nExample manual mappings file created: {output_file}")
    print("\nDomain types:")
    print("  - Brand: Official brand website selling their own products")
    print("  - Reseller: Multi-brand retailers/aggregators")
    print("  - UGC: User-generated content sites")
    print("  - 3rd Party: Reviews, content, news, or affiliate sites")


async def main(
    manual_mappings_file: Optional[str] = None,
    use_ai: bool = True,
    create_example: bool = False,
):
    """
    Main mapping function with 3-phase approach.

    Args:
        manual_mappings_file: Path to JSON file with manual mappings
        use_ai: Whether to use AI for phase 3
        create_example: Whether to create example file and exit
    """
    if create_example:
        create_example_manual_mappings_file()
        return

    if not use_ai:
        logger.warning("AI mapping disabled - will run phases 1 & 2 only")

    if settings.anthropic_api_key == "" and use_ai:
        logger.warning("ANTHROPIC_API_KEY not set - will skip AI phase (phase 3)")
        use_ai = False

    # Load manual mappings if provided
    manual_mappings = None
    if manual_mappings_file:
        manual_mappings = load_manual_mappings(manual_mappings_file)

    try:
        # Initialize database
        await init_db()

        logger.info("=" * 80)
        logger.info("Starting comprehensive brand-domain mapping")
        logger.info("=" * 80)

        if manual_mappings:
            logger.info(f"Phase 1: Manual mappings ({len(manual_mappings)} domains)")
        else:
            logger.info("Phase 1: Manual mappings (skipped - none provided)")

        logger.info("Phase 2: Heuristic matching (brand name in domain)")

        if use_ai:
            logger.info("Phase 3: AI classification (top 1000 unmapped domains by visibility)")
        else:
            logger.info("Phase 3: AI classification (skipped)")

        logger.info("=" * 80)

        # Run comprehensive mapping
        stats = await run_comprehensive_mapping(
            manual_mappings=manual_mappings,
            use_ai=use_ai,
        )

        # Print results
        logger.info("")
        logger.info("=" * 80)
        logger.info("MAPPING COMPLETE")
        logger.info("=" * 80)
        logger.info(f"Phase 1 - Manual mappings:      {stats['manual_mappings']}")
        logger.info(f"Phase 2 - Heuristic matching:   {stats['heuristic_mappings']}")
        logger.info(f"Phase 3 - AI classification:    {stats['ai_mappings']}")
        logger.info(f"Total mappings created:         {stats['total_mappings']}")

        if stats['errors']:
            logger.warning(f"Errors encountered:             {len(stats['errors'])}")
            logger.warning("First few errors:")
            for error in stats['errors'][:5]:
                logger.warning(f"  - {error}")

        logger.info("=" * 80)
        logger.info("Brand mapping completed successfully!")

    except Exception as e:
        logger.error(f"Brand mapping failed: {e}")
        raise


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Comprehensive brand-domain mapping",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Run all phases with AI
  python scripts/map_brands.py

  # Run without AI (phases 1 & 2 only)
  python scripts/map_brands.py --no-ai

  # Run with manual mappings file
  python scripts/map_brands.py --manual my_mappings.json

  # Create example manual mappings file
  python scripts/map_brands.py --create-example

Domain Types:
  - Brand: Official brand website (e.g., trekbikes.com)
  - Reseller: Multi-brand retailers (e.g., Amazon, Walmart)
  - UGC: User-generated content (e.g., Reddit, forums)
  - 3rd Party: Reviews/news/affiliates (e.g., bikeradar.com)
        """
    )
    parser.add_argument(
        "--no-ai",
        action="store_true",
        help="Disable AI mapping (skip phase 3)",
    )
    parser.add_argument(
        "--manual",
        type=str,
        metavar="FILE",
        help="JSON file with manual domain mappings",
    )
    parser.add_argument(
        "--create-example",
        action="store_true",
        help="Create an example manual mappings JSON file and exit",
    )

    args = parser.parse_args()

    asyncio.run(
        main(
            manual_mappings_file=args.manual,
            use_ai=not args.no_ai,
            create_example=args.create_example,
        )
    )
