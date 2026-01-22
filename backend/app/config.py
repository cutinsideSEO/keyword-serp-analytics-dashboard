"""
Application configuration management.

Handles environment variables and application settings using pydantic-settings.
"""

from functools import lru_cache
from pathlib import Path
from typing import List, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).parent.parent / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Application
    app_name: str = "Keyword Analytics Dashboard"
    debug: bool = False

    # Database - PostgreSQL (Supabase) connection
    database_url: str = "postgresql+asyncpg://postgres:password@db.example.supabase.co:5432/postgres"

    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_key: str = ""

    # Market
    default_market_id: str = "insurance_il"

    # CORS
    cors_origins: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    # Claude API
    anthropic_api_key: str = ""

    # Paths
    @property
    def project_root(self) -> Path:
        """Get the project root directory."""
        return Path(__file__).parent.parent.parent

    @property
    def data_dir(self) -> Path:
        """Get the data directory."""
        return self.project_root / "data"

    @property
    def source_data_dir(self) -> Path:
        """Get the source data directory."""
        return self.project_root / "source_data"

    @property
    def is_supabase(self) -> bool:
        """Check if using Supabase (PostgreSQL) database."""
        return "supabase" in self.database_url or "postgresql" in self.database_url


@lru_cache
def get_settings() -> Settings:
    """
    Get cached application settings.

    Returns:
        Settings: Application settings instance
    """
    return Settings()
