"""
Data import script.

Imports keyword data from CSV and SERP data from JSON into the database.

Usage:
    python scripts/import_data.py                    # Fresh import (clears existing data)
    python scripts/import_data.py --no-fresh         # Add to existing data
    python scripts/import_data.py --csv-only         # Only import CSV
    python scripts/import_data.py --json-only        # Only import JSON
"""

import argparse
import asyncio
import logging
import sys
from pathlib import Path

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


def find_source_files() -> tuple[Path, Path]:
    """
    Find CSV and JSON source files in the project directory.

    Returns:
        Tuple of (csv_path, json_path)
    """
    project_root = settings.project_root

    # Look for CSV file
    csv_files = list(project_root.glob("*.csv"))
    if not csv_files:
        csv_files = list(project_root.glob("source_data/*.csv"))

    if not csv_files:
        raise FileNotFoundError("No CSV file found in project directory")

    csv_path = csv_files[0]
    logger.info(f"Found CSV file: {csv_path}")

    # Look for JSON file
    json_files = list(project_root.glob("*.json"))
    if not json_files:
        json_files = list(project_root.glob("source_data/*.json"))

    # Filter out package.json and similar
    json_files = [f for f in json_files if not f.name.startswith("package")]

    if not json_files:
        raise FileNotFoundError("No JSON file found in project directory")

    json_path = json_files[0]
    logger.info(f"Found JSON file: {json_path}")

    return csv_path, json_path


async def import_csv_only(csv_path: Path, fresh: bool = True) -> dict:
    """Import only CSV data."""
    await init_db()
    async with get_db_context() as session:
        service = DataImportService(session)
        if fresh:
            await service.clear_all_data()
        return await service.import_csv(csv_path)


async def import_json_only(json_path: Path) -> dict:
    """Import only JSON data (does not clear existing data)."""
    await init_db()
    async with get_db_context() as session:
        service = DataImportService(session)
        return await service.import_serp_json(json_path)


async def main(csv_only: bool = False, json_only: bool = False, fresh: bool = True):
    """
    Main import function.

    Args:
        csv_only: Only import CSV data
        json_only: Only import JSON data
        fresh: Clear existing data before import (default: True)
    """
    try:
        csv_path, json_path = find_source_files()

        # Ensure data directory exists
        settings.data_dir.mkdir(parents=True, exist_ok=True)

        # Initialize database
        await init_db()

        if csv_only:
            logger.info(f"Importing CSV only (fresh={fresh})...")
            stats = await import_csv_only(csv_path, fresh=fresh)
            logger.info(f"CSV Import Results: {stats}")
        elif json_only:
            logger.info("Importing JSON only (adding to existing keywords)...")
            stats = await import_json_only(json_path)
            logger.info(f"JSON Import Results: {stats}")
        else:
            logger.info(f"Running full import (fresh={fresh})...")
            stats = await run_full_import(csv_path, json_path, fresh=fresh)
            logger.info(f"Import Results: {stats}")

        logger.info("Import completed successfully!")

    except FileNotFoundError as e:
        logger.error(f"File not found: {e}")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Import failed: {e}")
        raise


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Import keyword and SERP data")
    parser.add_argument(
        "--csv-only",
        action="store_true",
        help="Only import CSV data",
    )
    parser.add_argument(
        "--json-only",
        action="store_true",
        help="Only import JSON data (requires CSV to be imported first)",
    )
    parser.add_argument(
        "--no-fresh",
        action="store_true",
        help="Do NOT clear existing data (add to existing)",
    )

    args = parser.parse_args()

    asyncio.run(main(
        csv_only=args.csv_only,
        json_only=args.json_only,
        fresh=not args.no_fresh
    ))
