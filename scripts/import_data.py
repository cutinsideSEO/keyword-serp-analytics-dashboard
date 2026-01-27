"""
Data import script.

Imports keyword data from CSV and SERP data from JSON into Supabase.

Folder Structure:
    source_data/
    ├── insurance_il/
    │   ├── config.json       <- REQUIRED: Market + domain type definitions
    │   ├── keywords.csv
    │   └── serp.json
    └── new_market/
        ├── config.json       <- Must create before first import
        ├── keywords.csv
        └── serp.json

Usage:
    python scripts/import_data.py --market insurance_il   # Import specific market
    python scripts/import_data.py --all                   # Import ALL markets
    python scripts/import_data.py --market insurance_il --no-fresh  # Add to existing
    python scripts/import_data.py --list                  # List available markets
    python scripts/import_data.py --create-config --market new_market  # Create template config

Note: This script connects directly to Supabase. Configure DATABASE_URL in backend/.env
"""

import argparse
import asyncio
import logging
import sys
from pathlib import Path
from typing import Optional

# Fix Windows asyncio issue with psycopg
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from app.config import get_settings
from app.database import init_db, get_db_context
from app.services.data_import import run_full_import, DataImportService
from app.services.market_setup import (
    load_config_file,
    find_config_file,
    create_template_config_file,
    setup_market_from_config,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

settings = get_settings()


def get_source_data_dir() -> Path:
    """Get the source_data directory path."""
    return settings.project_root / "source_data"


def list_available_markets() -> list[dict]:
    """
    List all markets that have data folders in source_data/.

    Returns:
        List of market info dicts with id, has_config, has_csv, has_json
    """
    source_dir = get_source_data_dir()
    if not source_dir.exists():
        return []

    markets = []
    for folder in source_dir.iterdir():
        if folder.is_dir():
            has_config = (folder / "config.json").exists()
            csv_files = list(folder.glob("*.csv"))
            json_files = [f for f in folder.glob("*.json") if f.name != "config.json" and not f.name.startswith("package")]

            markets.append({
                "id": folder.name,
                "has_config": has_config,
                "has_csv": len(csv_files) > 0,
                "has_json": len(json_files) > 0,
                "ready": has_config and len(csv_files) > 0 and len(json_files) > 0,
            })

    return sorted(markets, key=lambda m: m["id"])


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
        raise FileNotFoundError(
            f"Market folder not found: {market_dir}\n"
            f"Create folder: source_data/{market_id}/ with config.json, keywords.csv, and serp.json"
        )

    # Find CSV file in market folder
    csv_files = list(market_dir.glob("*.csv"))
    if not csv_files:
        raise FileNotFoundError(f"No CSV file found in {market_dir}")

    csv_path = csv_files[0]
    logger.info(f"Found CSV: {csv_path}")

    # Find JSON file in market folder (exclude config.json and mappings.json)
    json_files = [
        f for f in market_dir.glob("*.json")
        if f.name not in ("config.json", "mappings.json") and not f.name.startswith("package")
    ]
    if not json_files:
        raise FileNotFoundError(f"No SERP JSON file found in {market_dir}")

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

    source_dir = get_source_data_dir()
    market_dir = source_dir / market_id

    # STEP 1: Require config.json
    try:
        config_path = find_config_file(market_dir)
        config = load_config_file(config_path)
        logger.info(f"Loaded config: {config_path}")
    except FileNotFoundError as e:
        logger.error(str(e))
        logger.error("")
        logger.error("config.json is REQUIRED before importing data.")
        logger.error(f"Create one with: python import_data.py --create-config --market {market_id}")
        raise

    # STEP 2: Find data files
    csv_path, json_path = find_market_files(market_id)

    # STEP 3: Initialize database
    await init_db()

    # STEP 4: Setup market from config BEFORE importing data
    async with get_db_context() as session:
        market, domain_types = await setup_market_from_config(session, market_id, config)
        logger.info(f"Market configured: {market.name}")
        for dt in domain_types:
            logger.info(f"  - {dt.display_name} ({dt.type_id})")

    # STEP 5: Import data
    needs_view_refresh = False
    if csv_only:
        logger.info(f"Importing CSV only (fresh={fresh})...")
        async with get_db_context() as session:
            service = DataImportService(session, market_id=market_id)
            if fresh:
                await service.clear_market_data()
            stats = await service.import_csv(csv_path)
        needs_view_refresh = fresh  # Only if data was cleared (SERP data affected)
    elif json_only:
        logger.info("Importing JSON only...")
        async with get_db_context() as session:
            service = DataImportService(session, market_id=market_id)
            stats = await service.import_serp_json(json_path)
        needs_view_refresh = True
    else:
        logger.info(f"Running full import (fresh={fresh})...")
        stats = await run_full_import(csv_path, json_path, market_id=market_id, fresh=fresh)
        # run_full_import already refreshes the view internally

    # STEP 6: Refresh materialized view for fast winner lookups
    if needs_view_refresh:
        try:
            from sqlalchemy import text
            async with get_db_context() as session:
                await session.execute(text("REFRESH MATERIALIZED VIEW CONCURRENTLY organic_winners"))
                await session.commit()
            logger.info("Refreshed organic_winners materialized view")
        except Exception as e:
            logger.warning(f"Could not refresh organic_winners view (may not exist yet): {e}")

    logger.info(f"Import complete for {market_id}: {stats}")
    return stats


async def import_all_markets(fresh: bool = True) -> dict:
    """
    Import all markets that have complete data folders (config + csv + json).

    Args:
        fresh: Clear existing data before import

    Returns:
        Dictionary of market_id -> stats
    """
    markets = list_available_markets()
    ready_markets = [m for m in markets if m["ready"]]

    if not ready_markets:
        logger.error("No complete market data found in source_data/")
        logger.info("Each market needs: config.json, keywords.csv, serp.json")
        logger.info("")
        logger.info("To create a new market:")
        logger.info("  python import_data.py --create-config --market my_market")
        return {}

    logger.info(f"Found {len(ready_markets)} markets to import: {[m['id'] for m in ready_markets]}")

    results = {}
    for market_info in ready_markets:
        market_id = market_info["id"]
        try:
            stats = await import_market(market_id, fresh=fresh)
            results[market_id] = {"status": "success", "stats": stats}
        except Exception as e:
            logger.error(f"Failed to import {market_id}: {e}")
            results[market_id] = {"status": "error", "error": str(e)}

    return results


def print_market_list():
    """Print available markets with their status."""
    markets = list_available_markets()
    source_dir = get_source_data_dir()

    print(f"\nSource data directory: {source_dir}")
    print("-" * 60)

    if not markets:
        print("No market folders found!")
        print("\nTo create a new market:")
        print("  python import_data.py --create-config --market my_market")
        print("\nExpected structure:")
        print("  source_data/")
        print("  └── my_market/")
        print("      ├── config.json    <- Market configuration (required)")
        print("      ├── keywords.csv   <- Keyword data")
        print("      └── serp.json      <- SERP rankings")
    else:
        print(f"Found {len(markets)} market folder(s):\n")

        for market in markets:
            status_parts = []
            if market["has_config"]:
                status_parts.append("config")
            if market["has_csv"]:
                status_parts.append("csv")
            if market["has_json"]:
                status_parts.append("json")

            status = ", ".join(status_parts) if status_parts else "empty"
            ready_icon = "[OK]" if market["ready"] else "[--]"

            print(f"  {ready_icon} {market['id']}: [{status}]")

            if not market["has_config"]:
                print(f"      > Missing config.json. Run: --create-config --market {market['id']}")

    print()


def create_config_for_market(market_id: str):
    """Create a template config.json for a market."""
    source_dir = get_source_data_dir()
    market_dir = source_dir / market_id

    # Check if config already exists
    config_path = market_dir / "config.json"
    if config_path.exists():
        print(f"\nconfig.json already exists: {config_path}")
        print("Edit it manually or delete it to regenerate.")
        return

    # Create template
    created_path = create_template_config_file(market_dir, market_id)

    print(f"\nCreated template config: {created_path}")
    print("\nNext steps:")
    print(f"  1. Edit {created_path} to customize:")
    print("     - market.name: Human-readable market name")
    print("     - market.industry_context: Description for AI classification")
    print("     - market.language: 'en', 'he', etc.")
    print("     - market.text_direction: 'ltr' or 'rtl'")
    print("     - domain_types: Configure your domain categories")
    print("")
    print(f"  2. Add data files to source_data/{market_id}/:")
    print("     - keywords.csv")
    print("     - serp.json")
    print("")
    print(f"  3. Import: python import_data.py --market {market_id}")


async def main(
    market_id: Optional[str] = None,
    import_all: bool = False,
    csv_only: bool = False,
    json_only: bool = False,
    fresh: bool = True,
    list_markets: bool = False,
    create_config: bool = False
):
    """Main entry point."""

    if list_markets:
        print_market_list()
        return

    if create_config:
        if not market_id:
            print("Error: --market is required with --create-config")
            sys.exit(1)
        create_config_for_market(market_id)
        return

    if import_all:
        results = await import_all_markets(fresh=fresh)
        print("\n" + "=" * 60)
        print("IMPORT SUMMARY")
        print("=" * 60)
        for market, result in results.items():
            status = "[OK]" if result["status"] == "success" else "[FAIL]"
            print(f"{status} {market}: {result['status']}")
        return

    if not market_id:
        # Try to auto-detect if only one ready market exists
        markets = [m for m in list_available_markets() if m["ready"]]
        if len(markets) == 1:
            market_id = markets[0]["id"]
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
  python import_data.py --list                          # List available markets
  python import_data.py --create-config --market new    # Create config template
  python import_data.py --market insurance_il           # Import specific market
  python import_data.py --all                           # Import all markets
  python import_data.py --market bicycle --no-fresh     # Add to existing data

Folder structure (config.json is REQUIRED):
  source_data/
  ├── insurance_il/
  │   ├── config.json    <- Market configuration
  │   ├── keywords.csv
  │   └── serp.json
  └── bicycle/
      ├── config.json
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
        "--create-config",
        action="store_true",
        dest="create_config",
        help="Create template config.json in market folder",
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
        list_markets=args.list_markets,
        create_config=args.create_config
    ))
