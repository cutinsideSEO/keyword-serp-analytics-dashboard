"""
Services package.

Contains business logic and data processing services.

For serverless deployment (Vercel), use Supabase-based services:
- SupabaseAnalyticsService
- SupabaseMarketAnalyticsService
- SupabaseKeywordsService

For local development with SQLAlchemy (optional), import directly from:
- app.services.analytics.AnalyticsService
- app.services.market_analytics.MarketAnalyticsService
"""

from app.services.supabase_analytics import SupabaseAnalyticsService
from app.services.supabase_market_analytics import SupabaseMarketAnalyticsService
from app.services.supabase_keywords import SupabaseKeywordsService

__all__ = [
    "SupabaseAnalyticsService",
    "SupabaseMarketAnalyticsService",
    "SupabaseKeywordsService",
]
