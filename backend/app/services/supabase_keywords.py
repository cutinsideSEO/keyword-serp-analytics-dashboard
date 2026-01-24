"""
Supabase Keywords Service for keyword operations.

Uses Supabase RPC functions instead of SQLAlchemy for serverless compatibility.
"""

import logging
from typing import List, Optional

from app.supabase_db import get_supabase_client
from app.middleware.market_context import get_current_market_id
from app.schemas import (
    CategoryWithValues,
    KeywordListResponse,
    KeywordWithSerp,
    KeywordWithTags,
    SerpResultResponse,
)

logger = logging.getLogger(__name__)


class SupabaseKeywordsService:
    """Service for keyword operations using Supabase RPC."""

    def __init__(self, market_id: Optional[str] = None):
        """
        Initialize the keywords service.

        Args:
            market_id: Market ID (optional, uses context default if not provided)
        """
        self.client = get_supabase_client()
        self.market_id = market_id or get_current_market_id()

    async def list_keywords(
        self,
        page: int = 1,
        page_size: int = 50,
        search: Optional[str] = None,
        category: Optional[str] = None,
        category_value: Optional[str] = None,
        min_volume: Optional[int] = None,
        max_volume: Optional[int] = None,
        modifier_group: Optional[str] = None,
    ) -> KeywordListResponse:
        """
        List keywords with filtering and pagination.

        Returns:
            Paginated list of keywords
        """
        try:
            result = self.client.rpc(
                "get_keywords_list",
                {
                    "p_market_id": self.market_id,
                    "p_page": page,
                    "p_page_size": page_size,
                    "p_search": search,
                    "p_category": category,
                    "p_category_value": category_value,
                    "p_min_volume": min_volume,
                    "p_max_volume": max_volume,
                    "p_modifier_group": modifier_group,
                }
            ).execute()

            if result.data:
                data = result.data
                items = [
                    KeywordWithTags(
                        id=item.get("id"),
                        keyword=item.get("keyword", ""),
                        volume=item.get("volume", 0),
                        modifier_group=item.get("modifier_group"),
                        created_at=item.get("created_at"),
                        tags=item.get("tags", {}),
                    )
                    for item in data.get("items", [])
                ]
                return KeywordListResponse(
                    items=items,
                    total=data.get("total", 0),
                    page=data.get("page", page),
                    page_size=data.get("page_size", page_size),
                    total_pages=data.get("total_pages", 0),
                )
            return KeywordListResponse(
                items=[],
                total=0,
                page=page,
                page_size=page_size,
                total_pages=0,
            )
        except Exception as e:
            logger.exception(f"Error listing keywords: {e}")
            return KeywordListResponse(
                items=[],
                total=0,
                page=page,
                page_size=page_size,
                total_pages=0,
            )

    async def list_categories(self) -> List[CategoryWithValues]:
        """
        List all categories with their unique values.

        Returns:
            List of categories with values
        """
        try:
            result = self.client.rpc(
                "get_categories_with_values",
                {"p_market_id": self.market_id}
            ).execute()

            if result.data:
                return [
                    CategoryWithValues(
                        id=item.get("id"),
                        name=item.get("name", ""),
                        display_name=item.get("display_name", ""),
                        values=item.get("values", []),
                        keyword_count=item.get("keyword_count", 0),
                    )
                    for item in result.data
                ]
            return []
        except Exception as e:
            logger.exception(f"Error listing categories: {e}")
            return []

    async def get_keyword(self, keyword_id: int) -> Optional[KeywordWithSerp]:
        """
        Get keyword details with SERP results.

        Args:
            keyword_id: Keyword ID

        Returns:
            Keyword with tags and SERP results, or None if not found
        """
        try:
            result = self.client.rpc(
                "get_keyword_detail",
                {"p_market_id": self.market_id, "p_keyword_id": keyword_id}
            ).execute()

            if result.data:
                data = result.data
                serp_results = [
                    SerpResultResponse(
                        id=sr.get("id"),
                        keyword_id=sr.get("keyword_id"),
                        domain_id=sr.get("domain_id"),
                        domain=sr.get("domain", ""),
                        rank_group=sr.get("rank_group"),
                        rank_absolute=sr.get("rank_absolute"),
                        page=sr.get("page"),
                        result_type=sr.get("result_type"),
                        title=sr.get("title"),
                        description=sr.get("description"),
                        url=sr.get("url"),
                        created_at=sr.get("created_at"),
                    )
                    for sr in data.get("serp_results", [])
                ]
                return KeywordWithSerp(
                    id=data.get("id"),
                    keyword=data.get("keyword", ""),
                    volume=data.get("volume", 0),
                    modifier_group=data.get("modifier_group"),
                    created_at=data.get("created_at"),
                    tags=data.get("tags", {}),
                    serp_results=serp_results,
                )
            return None
        except Exception as e:
            logger.exception(f"Error getting keyword: {e}")
            return None
