"""
Data import script.

Imports keyword data from CSV and SERP data from JSON into Supabase.

Folder Structure:
    source_data/
    ├── insurance_il/
    │   ├── keywords.csv
    │   └── serp.json
    ├── bicycle/
    │   ├── keywords.csv
    │   └── serp.json
    └── electronics_us/
        ├── keywords.csv
        └── serp.json

Usage:
    python scripts/import_data.py --market insurance_il   # Import specific market
    python scripts/import_data.py --all                   # Import ALL markets
    python scripts/import_data.py --market insurance_il --no-fresh  # Add to existing
    python scripts/import_data.py --list                  # List available markets

Note: This script connects directly to Supabase. Configure DATABASE_URL in backend/.env
"""

import argparse
import asyncio
import logging
import sys
from pathlib import Path
from typing import Optional

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from app.config import get_settings
from app.database import init_db, get_db_context
from app.services.data_import import run_full_import, DataImportService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

settings = get_settings()


def get_source_data_dir() -> Path:
    """Get the source_data directory path."""
    return settings.project_root / "source_data"


def list_available_markets() -> list[str]:
    """
    List all markets that have data folders in source_data/.

    Returns:
        List of market IDs (folder names)
    """
    source_dir = get_source_data_dir()
    if not source_dir.exists():
        return []

    markets = []
    for folder in source_dir.iterdir():
        if folder.is_dir():
            # Check if folder has required files
            csv_files = list(folder.glob("*.csv"))
            json_files = [f for f in folder.glob("*.json") if not f.name.startswith("package")]
            if csv_files and json_files:
                markets.append(folder.name)
            elif csv_files:
                markets.append(f"{folder.name} (CSV only)")
            elif json_files:
                markets.append(f"{folder.name} (JSON only, needs CSV)")

    return sorted(markets)


def find_market_files(market_id: str) -> tuple[Path, Path]:
    """
    Find CSV and JSON files for a specific market.

    Args:
        market_id: Market ID (folder name in source_data/)

    Returns:
        Tuple of (csv_path, json_path)

    Raises:
        FileNotFoundError: If market folder or required files don't exist
    """
    source_dir = get_source_data_dir()
    market_dir = source_dir / market_id

    if not market_dir.exists():
        # Fallback: check for files in root source_data (legacy support)
        csv_files = list(source_dir.glob("*.csv"))
        json_files = [f for f in source_dir.glob("*.json") if not f.name.startswith("package")]

        if csv_files and json_files:
            logger.warning(f"Market folder '{market_id}' not found. Using files from source_data/ root.")
            return csv_files[0], json_files[0]

        raise FileNotFoundError(
            f"Market folder not found: {market_dir}\n"
            f"Create folder: source_data/{market_id}/ with keywords.csv and serp.json"
        )

    # Find CSV file in market folder
    csv_files = list(market_dir.glob("*.csv"))
    if not csv_files:
        raise FileNotFoundError(f"No CSV file found in {market_dir}")

    csv_path = csv_files[0]
    logger.info(f"Found CSV: {csv_path}")

    # Find JSON file in market folder
    json_files = [f for f in market_dir.glob("*.json") if not f.name.startswith("package")]
    if not json_files:
        raise FileNotFoundError(f"No JSON file found in {market_dir}")

    json_path = json_files[0]
    logger.info(f"Found JSON: {json_path}")

    return csv_path, json_path


async def import_market(
    market_id: str,
    csv_only: bool = False,
    json_only: bool = False,
    fresh: bool = True
) -> dict:
    """
    Import data for a single market.

    Args:
        market_id: Market ID (folder name)
        csv_only: Only import CSV data
        json_only: Only import JSON data
        fresh: Clear existing data before import

    Returns:
        Import statistics
    """
    logger.info(f"{'='*60}")
    logger.info(f"Importing market: {market_id}")
    logger.info(f"{'='*60}")

    csv_path, json_path = find_market_files(market_id)

    await init_db()

    if csv_only:
        logger.info(f"Importing CSV only (fresh={fresh})...")
        async with get_db_context() as session:
            service = DataImportService(session, market_id=market_id)
            if fresh:
                await service.clear_market_data()
            stats = await service.import_csv(csv_path)
    elif json_only:
        logger.info("Importing JSON only...")
        async with get_db_context() as session:
            service = DataImportService(session, market_id=market_id)
            stats = await service.import_serp_json(json_path)
    else:
        logger.info(f"Running full import (fresh={fresh})...")
        stats = await run_full_import(csv_path, json_path, market_id=market_id, fresh=fresh)

    logger.info(f"Import complete for {market_id}: {stats}")
    return stats


async def import_all_markets(fresh: bool = True) -> dict:
    """
    Import all markets that have data folders.

    Args:
        fresh: Clear existing data before import

    Returns:
        Dictionary of market_id -> stats
    """
    markets = list_available_markets()
    # Filter out incomplete markets
    complete_markets = [m for m in markets if "(" not in m]

    if not complete_markets:
        logger.error("No complete market data found in source_data/")
        logger.info("Expected structure:")
        logger.info("  source_data/{market_id}/keywords.csv")
        logger.info("  source_data/{market_id}/serp.json")
        return {}

    logger.info(f"Found {len(complete_markets)} markets to import: {complete_markets}")

    results = {}
    for market_id in complete_markets:
        try:
            stats = await import_market(market_id, fresh=fresh)
            results[market_id] = {"status": "success", "stats": stats}
        except Exception as e:
            logger.error(f"Failed to import {market_id}: {e}")
            results[market_id] = {"status": "error", "error": str(e)}

    return results


def print_market_list():
    """Print available markets."""
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
        print("  │   └── serp.json")
        print("  └── bicycle/")
        print("      ├── keywords.csv")
        print("      └── serp.json")
    else:
        print(f"Found {len(markets)} market(s):\n")
        for market in markets:
            print(f"  • {market}")

    print()


async def main(
    market_id: Optional[str] = None,
    import_all: bool = False,
    csv_only: bool = False,
    json_only: bool = False,
    fresh: bool = True,
    list_markets: bool = False
):
    """Main entry point."""

    if list_markets:
        print_market_list()
        return

    if import_all:
        results = await import_all_markets(fresh=fresh)
        print("\n" + "=" * 60)
        print("IMPORT SUMMARY")
        print("=" * 60)
        for market, result in results.items():
            status = "✓" if result["status"] == "success" else "✗"
            print(f"{status} {market}: {result['status']}")
        return

    if not market_id:
        # Try to auto-detect if only one market exists
        markets = [m for m in list_available_markets() if "(" not in m]
        if len(markets) == 1:
            market_id = markets[0]
            logger.info(f"Auto-detected market: {market_id}")
        else:
            print("Error: --market is required (or use --all to import all markets)")
            print("\nAvailable markets:")
            print_market_list()
            sys.exit(1)

    try:
        await import_market(
            market_id=market_id,
            csv_only=csv_only,
            json_only=json_only,
            fresh=fresh
        )
        logger.info("Import completed successfully!")
    except FileNotFoundError as e:
        logger.error(str(e))
        sys.exit(1)
    except Exception as e:
        logger.error(f"Import failed: {e}")
        raise


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Import keyword and SERP data to Supabase",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python import_data.py --list                    # List available markets
  python import_data.py --market insurance_il     # Import specific market
  python import_data.py --all                     # Import all markets
  python import_data.py --market bicycle --no-fresh  # Add to existing data

Folder structure:
  source_data/
  ├── insurance_il/
  │   ├── keywords.csv
  │   └── serp.json
  └── bicycle/
      ├── keywords.csv
      └── serp.json
        """
    )
    parser.add_argument(
        "--market",
        type=str,
        help="Market ID to import (folder name in source_data/)",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        dest="import_all",
        help="Import ALL markets found in source_data/",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        dest="list_markets",
        help="List available markets in source_data/",
    )
    parser.add_argument(
        "--csv-only",
        action="store_true",
        help="Only import CSV data (keywords + categories)",
    )
    parser.add_argument(
        "--json-only",
        action="store_true",
        help="Only import JSON data (SERP rankings)",
    )
    parser.add_argument(
        "--no-fresh",
        action="store_true",
        help="Do NOT clear existing data (add to existing)",
    )

    args = parser.parse_args()

    asyncio.run(main(
        market_id=args.market,
        import_all=args.import_all,
        csv_only=args.csv_only,
        json_only=args.json_only,
        fresh=not args.no_fresh,
        list_markets=args.list_markets
    ))
