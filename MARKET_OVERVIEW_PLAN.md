# Market Overview Tab - Implementation Plan

## Executive Summary

This document outlines the comprehensive implementation plan for the **Market Overview** tab in the Keyword & SERP Analytics Dashboard. Unlike the Brand Protection tab which focuses on a single brand's performance, the Market Overview provides a bird's-eye view of the entire market landscape, revealing demand patterns, competitive dynamics, and opportunities across all brands and categories.

---

## Table of Contents

1. [Goals &amp; Objectives](#1-goals--objectives)
2. [Architecture Overview](#2-architecture-overview)
3. [Data Model &amp; Calculations](#3-data-model--calculations)
4. [Backend Implementation](#4-backend-implementation)
5. [Frontend Implementation](#5-frontend-implementation)
6. [Component Spcategoryecifications](#6-component-specifications)
7. [API Endpoint Specifications](#7-api-endpoint-specifications)
8. [SQL Query Specifications](#8-sql-query-specifications)
9. [Optional Enhancements](#9-optional-enhancements)
10. [Implementation Checklist](#10-implementation-checklist)

---

## 1. Goals & Objectives

### Primary Goals

- Provide a **market-wide perspective** independent of any single brand
- Show **demand distribution** across brands (Share of Search)
- Identify **strongest players** by domain type (Brand, Retailer, UGC, 3rd Party)
- Reveal **brand protection health** across the entire market
- Enable **category and modifier group exploration** with full drill-down capabilities

### Key Metrics to Display

| Metric            | Description                     | Calculation                               |
| ----------------- | ------------------------------- | ----------------------------------------- |
| Share of Search   | Brand demand by search volume   | `SUM(volume)` per brand tag             |
| Visibility Score  | Domain presence strength        | `SUM(volume / rank_group)` per domain   |
| Market Win Rate   | Overall brand protection health | `AVG(brand_win_rate)` across all brands |
| Loss Distribution | Who captures brand traffic      | Volume lost by domain type                |

### User Experience Goals

- **Single page load** with all data fetched upfront
- **Expandable sections** for category/modifier drill-downs
- **Consistent design** with Brand Protection tab
- **Interactive charts** with hover details and click actions

---

## 2. Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MARKET OVERVIEW TAB                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Share of Search Section                          │   │
│  │  ┌──────────────────────────┐  ┌──────────────────────────────┐    │   │
│  │  │  Brand Demand Chart      │  │  Brand Performance Table     │    │   │
│  │  │  (Bar Chart - Top 15)    │  │  (Top 10 with metrics)       │    │   │
│  │  └──────────────────────────┘  └──────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Strongest Retailers Section                      │   │
│  │  ┌──────────────────────────┐  ┌──────────────────────────────┐    │   │
│  │  │  Retailer Visibility     │  │  Retailer Performance Table  │    │   │
│  │  │  Chart (Bar)             │  │  (Top 5 detailed)            │    │   │
│  │  └──────────────────────────┘  └──────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Influential Voices Section                       │   │
│  │  ┌──────────────────────────┐  ┌──────────────────────────────┐    │   │
│  │  │  UGC/3rd Party Visibility│  │  Voices Performance Table    │    │   │
│  │  │  Chart (Bar)             │  │  (Top 10 detailed)           │    │   │
│  │  └──────────────────────────┘  └──────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                Market Brand Protection Snapshot                     │   │
│  │  ┌──────────────────────────┐  ┌──────────────────────────────┐    │   │
│  │  │  Overall Win/Loss Chart  │  │  Loss Distribution Chart     │    │   │
│  │  │  (Stacked Bar/Donut)     │  │  (By Domain Type)            │    │   │
│  │  └──────────────────────────┘  └──────────────────────────────┘    │   │
│  │  ┌──────────────────────────────────────────────────────────────┐  │   │
│  │  │  KPI Cards: Total/Avg Win Rate, Total/Avg Loss Volume        │  │   │
│  │  └──────────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Biggest Losers Section                           │   │
│  │  ┌──────────────────────────────────────────────────────────────┐  │   │
│  │  │  Brand Loss Table (Top 20)                                    │  │   │
│  │  │  - Brand Name, Keywords Lost, Volume Lost, Win Rate           │  │   │
│  │  │  - Top 3 Modifier Groups Where They Lose Most                 │  │   │
│  │  └──────────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Category Exploration Section                     │   │
│  │  ┌──────────────────────────────────────────────────────────────┐  │   │
│  │  │  Expandable Category List                                     │  │   │
│  │  │  ▶ bicycle_type (15,420 keywords, 2.3M volume)               │  │   │
│  │  │    └─ Top Values: mountain, road, electric...                │  │   │
│  │  │    └─ Top Players by Type: Brand, Retailer, UGC              │  │   │
│  │  │    └─ Example Keywords...                                     │  │   │
│  │  │  ▶ model_or_product (8,200 keywords, 1.1M volume)            │  │   │
│  │  └──────────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Modifier Group Exploration                       │   │
│  │  ┌──────────────────────────────────────────────────────────────┐  │   │
│  │  │  Expandable Modifier Group List                               │  │   │
│  │  │  ▶ brand (25,000 keywords, 5.2M volume)                      │  │   │
│  │  │    └─ Top Values/Tags within this modifier                   │  │   │
│  │  │    └─ Top Players by Type                                     │  │   │
│  │  │    └─ Example Keywords...                                     │  │   │
│  │  └──────────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### File Structure Changes

```
backend/app/
├── routers/
│   └── market_overview.py        # NEW - Market overview endpoints
├── services/
│   └── market_analytics.py       # NEW - Market-wide analytics
└── schemas.py                    # EXTEND - New response models

frontend/src/
├── api/
│   └── endpoints.ts              # EXTEND - New API functions
├── components/
│   └── market-overview/          # NEW - Market overview components
│       ├── ShareOfSearchChart.tsx
│       ├── ShareOfSearchTable.tsx
│       ├── RetailerStrengthSection.tsx
│       ├── InfluentialVoicesSection.tsx
│       ├── MarketProtectionSnapshot.tsx
│       ├── BiggestLosersTable.tsx
│       ├── CategoryExplorer.tsx
│       └── ModifierGroupExplorer.tsx
├── pages/
│   └── MarketOverview.tsx        # NEW - Main page component
└── types/
    └── index.ts                  # EXTEND - New type definitions
```

---

## 3. Data Model & Calculations

### Core Calculation Definitions

#### 3.1 Share of Search (Brand Demand)

```
Share of Search = SUM(keyword.volume) WHERE keyword is tagged with brand
```

This represents **market demand** for each brand based on search volume. A brand with high Share of Search has strong consumer interest regardless of whether they capture that traffic.

#### 3.2 Visibility Score

```
Visibility = SUM(keyword.volume / serp_result.rank_group) for each domain
```

- Rank 1 gets full volume credit
- Rank 2 gets 50% volume credit
- Rank 10 gets 10% volume credit

This represents **actual presence** and performance in search results.

#### 3.3 Win Rate (Per Brand)

```
Win Rate = (keywords_where_brand_ranks_#1 / total_branded_keywords) * 100
```

#### 3.4 Market Average Win Rate

```
Market Avg Win Rate = AVG(brand_win_rate) across all brands with >= 10 keywords
```

#### 3.5 Loss Attribution

```
Loss Volume by Domain Type = SUM(keyword.volume)
    WHERE rank_group = 1
    AND winner_domain_type = {type}
    AND brand_domain does not rank #1
```

---

## 4. Backend Implementation

### 4.1 New Service: `market_analytics.py`

Create `backend/app/services/market_analytics.py`:

```python
"""
Market Analytics Service

Provides market-wide analytics independent of any single brand.
All methods operate on the entire dataset to give market overview.
"""

from sqlalchemy import select, func, and_, or_, case, literal, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased
from typing import List, Dict, Optional, Tuple
from ..models import Keyword, Category, KeywordTag, Domain, SerpResult, BrandDomain
from ..schemas import (
    ShareOfSearchItem,
    DomainVisibilityItem,
    MarketProtectionKPIs,
    BrandLossItem,
    CategoryMarketStats,
    CategoryValueMarketStats,
    ModifierGroupMarketStats,
    MarketOverviewDashboard
)


class MarketAnalyticsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_share_of_search(self, limit: int = 20) -> List[ShareOfSearchItem]:
        """
        Calculate Share of Search for each brand.
        Returns brands ranked by total search volume demand.
        """
        # Implementation details in Section 8
        pass

    async def get_domain_visibility_by_type(
        self,
        domain_type: str,
        limit: int = 10
    ) -> List[DomainVisibilityItem]:
        """
        Get top domains by visibility score for a specific domain type.
        domain_type: 'Reseller', 'UGC', '3rd Party', or 'Brand'
        """
        pass

    async def get_market_protection_kpis(self) -> MarketProtectionKPIs:
        """
        Calculate market-wide brand protection metrics.
        Returns both totals and averages across all brands.
        """
        pass

    async def get_market_loss_distribution(self) -> List[Dict]:
        """
        Get loss distribution by domain type across all brands.
        """
        pass

    async def get_biggest_losers(self, limit: int = 20) -> List[BrandLossItem]:
        """
        Get brands with the worst brand protection (most losses).
        Includes top modifier groups where each brand loses most.
        """
        pass

    async def get_category_market_stats(self) -> List[CategoryMarketStats]:
        """
        Get market statistics for each category.
        Includes keyword count, volume, and summary metrics.
        """
        pass

    async def get_category_breakdown(
        self,
        category_name: str,
        limit: int = 10
    ) -> Dict:
        """
        Get detailed breakdown for a specific category.
        Includes top values, players by type, and example keywords.
        """
        pass

    async def get_modifier_group_market_stats(self) -> List[ModifierGroupMarketStats]:
        """
        Get market statistics for each modifier group.
        """
        pass

    async def get_modifier_group_breakdown(
        self,
        modifier_group: str,
        limit: int = 10
    ) -> Dict:
        """
        Get detailed breakdown for a specific modifier group.
        """
        pass

    async def get_full_dashboard(self) -> MarketOverviewDashboard:
        """
        Get complete market overview dashboard data in a single call.
        Aggregates all sections for upfront loading.
        """
        pass
```

### 4.2 Schema Extensions: `schemas.py`

Add to `backend/app/schemas.py`:

```python
# ============================================
# MARKET OVERVIEW SCHEMAS
# ============================================

class ShareOfSearchItem(BaseModel):
    """Brand's share of search volume demand"""
    brand_name: str
    total_volume: int
    keyword_count: int
    share_percentage: float
    # Domain performance metrics for this brand
    primary_domain: Optional[str] = None
    domain_visibility: Optional[float] = None
    domain_win_count: Optional[int] = None
    domain_avg_position: Optional[float] = None

class DomainVisibilityItem(BaseModel):
    """Domain visibility metrics"""
    domain: str
    domain_type: str
    visibility_score: float
    ranking_count: int  # How many keywords they rank on
    total_volume: int   # Sum of volume for keywords they rank on
    win_count: int      # #1 rankings
    avg_position: float
    top_brands: List[str] = []  # Top 3 brands they appear on

class MarketProtectionKPIs(BaseModel):
    """Market-wide brand protection metrics"""
    # Totals
    total_brands: int
    total_branded_keywords: int
    total_branded_volume: int
    total_keywords_winning: int
    total_keywords_losing: int
    total_volume_winning: int
    total_volume_losing: int
    # Averages
    average_win_rate: float
    median_win_rate: float
    average_volume_win_rate: float

class MarketLossDistribution(BaseModel):
    """Loss distribution by domain type"""
    domain_type: str
    loss_count: int
    loss_volume: int
    percentage_of_losses: float
    top_domains: List[str] = []  # Top 3 domains in this type

class BrandLossItem(BaseModel):
    """Individual brand's loss metrics"""
    brand_name: str
    total_keywords: int
    keywords_lost: int
    volume_lost: int
    win_rate: float
    top_loss_modifier_groups: List[Dict[str, Any]] = []  # Top 3 modifier groups

class CategoryMarketStats(BaseModel):
    """Market statistics for a category"""
    category_name: str
    display_name: str
    total_keywords: int
    total_volume: int
    unique_values: int
    # Summary of top values
    top_values_preview: List[str] = []  # Top 3 values

class CategoryValueMarketStats(BaseModel):
    """Detailed stats for a value within a category"""
    value: str
    keyword_count: int
    total_volume: int
    # Top players by domain type
    top_brand_domain: Optional[str] = None
    top_brand_visibility: Optional[float] = None
    top_retailer_domain: Optional[str] = None
    top_retailer_visibility: Optional[float] = None
    top_ugc_domain: Optional[str] = None
    top_ugc_visibility: Optional[float] = None
    top_3rd_party_domain: Optional[str] = None
    top_3rd_party_visibility: Optional[float] = None
    example_keywords: List[str] = []

class CategoryBreakdown(BaseModel):
    """Full breakdown for a category"""
    category_name: str
    display_name: str
    total_keywords: int
    total_volume: int
    top_values: List[CategoryValueMarketStats]
    # Aggregate top players across category
    top_players_by_type: Dict[str, List[DomainVisibilityItem]]

class ModifierGroupMarketStats(BaseModel):
    """Market statistics for a modifier group"""
    modifier_group: str
    total_keywords: int
    total_volume: int
    # Summary preview
    top_tags_preview: List[str] = []

class ModifierGroupBreakdown(BaseModel):
    """Full breakdown for a modifier group"""
    modifier_group: str
    total_keywords: int
    total_volume: int
    top_tags: List[Dict[str, Any]]  # Tag name + count
    top_players_by_type: Dict[str, List[DomainVisibilityItem]]
    example_keywords: List[Dict[str, Any]]

class MarketOverviewDashboard(BaseModel):
    """Complete market overview dashboard"""
    # Share of Search
    share_of_search: List[ShareOfSearchItem]
    # Domain Type Sections
    top_retailers: List[DomainVisibilityItem]
    influential_voices: List[DomainVisibilityItem]  # UGC + 3rd Party
    # Brand Protection
    protection_kpis: MarketProtectionKPIs
    loss_distribution: List[MarketLossDistribution]
    biggest_losers: List[BrandLossItem]
    # Categories & Modifiers (summary for expandable)
    category_stats: List[CategoryMarketStats]
    modifier_group_stats: List[ModifierGroupMarketStats]
```

### 4.3 New Router: `market_overview.py`

Create `backend/app/routers/market_overview.py`:

```python
"""
Market Overview Router

Endpoints for market-wide analytics dashboard.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from ..database import get_db
from ..services.market_analytics import MarketAnalyticsService
from ..schemas import (
    MarketOverviewDashboard,
    ShareOfSearchItem,
    DomainVisibilityItem,
    MarketProtectionKPIs,
    MarketLossDistribution,
    BrandLossItem,
    CategoryMarketStats,
    CategoryBreakdown,
    ModifierGroupMarketStats,
    ModifierGroupBreakdown
)

router = APIRouter(prefix="/market-overview", tags=["market-overview"])


@router.get("", response_model=MarketOverviewDashboard)
async def get_market_overview_dashboard(
    db: AsyncSession = Depends(get_db)
):
    """
    Get complete market overview dashboard.
    Single endpoint that returns all data for upfront loading.
    """
    service = MarketAnalyticsService(db)
    return await service.get_full_dashboard()


@router.get("/share-of-search", response_model=list[ShareOfSearchItem])
async def get_share_of_search(
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Get brands ranked by Share of Search (search volume demand)."""
    service = MarketAnalyticsService(db)
    return await service.get_share_of_search(limit)


@router.get("/retailers", response_model=list[DomainVisibilityItem])
async def get_top_retailers(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    """Get top retailers by visibility score."""
    service = MarketAnalyticsService(db)
    return await service.get_domain_visibility_by_type("Reseller", limit)


@router.get("/influential-voices", response_model=list[DomainVisibilityItem])
async def get_influential_voices(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    """Get top UGC and 3rd Party domains by visibility."""
    service = MarketAnalyticsService(db)
    ugc = await service.get_domain_visibility_by_type("UGC", limit // 2 + 1)
    third_party = await service.get_domain_visibility_by_type("3rd Party", limit // 2 + 1)
    # Merge and sort by visibility
    combined = ugc + third_party
    combined.sort(key=lambda x: x.visibility_score, reverse=True)
    return combined[:limit]


@router.get("/protection-kpis", response_model=MarketProtectionKPIs)
async def get_market_protection_kpis(
    db: AsyncSession = Depends(get_db)
):
    """Get market-wide brand protection KPIs."""
    service = MarketAnalyticsService(db)
    return await service.get_market_protection_kpis()


@router.get("/loss-distribution", response_model=list[MarketLossDistribution])
async def get_loss_distribution(
    db: AsyncSession = Depends(get_db)
):
    """Get loss distribution by domain type."""
    service = MarketAnalyticsService(db)
    return await service.get_market_loss_distribution()


@router.get("/biggest-losers", response_model=list[BrandLossItem])
async def get_biggest_losers(
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Get brands with worst brand protection."""
    service = MarketAnalyticsService(db)
    return await service.get_biggest_losers(limit)


@router.get("/categories", response_model=list[CategoryMarketStats])
async def get_category_stats(
    db: AsyncSession = Depends(get_db)
):
    """Get market statistics for all categories."""
    service = MarketAnalyticsService(db)
    return await service.get_category_market_stats()


@router.get("/categories/{category_name}", response_model=CategoryBreakdown)
async def get_category_breakdown(
    category_name: str,
    value_limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    """Get detailed breakdown for a specific category."""
    service = MarketAnalyticsService(db)
    return await service.get_category_breakdown(category_name, value_limit)


@router.get("/modifier-groups", response_model=list[ModifierGroupMarketStats])
async def get_modifier_group_stats(
    db: AsyncSession = Depends(get_db)
):
    """Get market statistics for all modifier groups."""
    service = MarketAnalyticsService(db)
    return await service.get_modifier_group_market_stats()


@router.get("/modifier-groups/{modifier_group}", response_model=ModifierGroupBreakdown)
async def get_modifier_group_breakdown(
    modifier_group: str,
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    """Get detailed breakdown for a specific modifier group."""
    service = MarketAnalyticsService(db)
    return await service.get_modifier_group_breakdown(modifier_group, limit)
```

### 4.4 Register Router in `main.py`

Add to `backend/app/main.py`:

```python
from .routers import brands, keywords, dashboard, market_overview

# In the lifespan or after app creation:
app.include_router(market_overview.router, prefix="/api/dashboard")
```

---

## 5. Frontend Implementation

### 5.1 Type Definitions

Add to `frontend/src/types/index.ts`:

```typescript
// ============================================
// MARKET OVERVIEW TYPES
// ============================================

export interface ShareOfSearchItem {
  brand_name: string;
  total_volume: number;
  keyword_count: number;
  share_percentage: number;
  primary_domain?: string;
  domain_visibility?: number;
  domain_win_count?: number;
  domain_avg_position?: number;
}

export interface DomainVisibilityItem {
  domain: string;
  domain_type: string;
  visibility_score: number;
  ranking_count: number;
  total_volume: number;
  win_count: number;
  avg_position: number;
  top_brands: string[];
}

export interface MarketProtectionKPIs {
  total_brands: number;
  total_branded_keywords: number;
  total_branded_volume: number;
  total_keywords_winning: number;
  total_keywords_losing: number;
  total_volume_winning: number;
  total_volume_losing: number;
  average_win_rate: number;
  median_win_rate: number;
  average_volume_win_rate: number;
}

export interface MarketLossDistribution {
  domain_type: string;
  loss_count: number;
  loss_volume: number;
  percentage_of_losses: float;
  top_domains: string[];
}

export interface BrandLossItem {
  brand_name: string;
  total_keywords: number;
  keywords_lost: number;
  volume_lost: number;
  win_rate: number;
  top_loss_modifier_groups: Array<{
    modifier_group: string;
    loss_count: number;
    loss_volume: number;
  }>;
}

export interface CategoryMarketStats {
  category_name: string;
  display_name: string;
  total_keywords: number;
  total_volume: number;
  unique_values: number;
  top_values_preview: string[];
}

export interface CategoryValueMarketStats {
  value: string;
  keyword_count: number;
  total_volume: number;
  top_brand_domain?: string;
  top_brand_visibility?: number;
  top_retailer_domain?: string;
  top_retailer_visibility?: number;
  top_ugc_domain?: string;
  top_ugc_visibility?: number;
  top_3rd_party_domain?: string;
  top_3rd_party_visibility?: number;
  example_keywords: string[];
}

export interface CategoryBreakdown {
  category_name: string;
  display_name: string;
  total_keywords: number;
  total_volume: number;
  top_values: CategoryValueMarketStats[];
  top_players_by_type: Record<string, DomainVisibilityItem[]>;
}

export interface ModifierGroupMarketStats {
  modifier_group: string;
  total_keywords: number;
  total_volume: number;
  top_tags_preview: string[];
}

export interface ModifierGroupBreakdown {
  modifier_group: string;
  total_keywords: number;
  total_volume: number;
  top_tags: Array<{ tag: string; count: number }>;
  top_players_by_type: Record<string, DomainVisibilityItem[]>;
  example_keywords: Array<{ keyword: string; volume: number }>;
}

export interface MarketOverviewDashboard {
  share_of_search: ShareOfSearchItem[];
  top_retailers: DomainVisibilityItem[];
  influential_voices: DomainVisibilityItem[];
  protection_kpis: MarketProtectionKPIs;
  loss_distribution: MarketLossDistribution[];
  biggest_losers: BrandLossItem[];
  category_stats: CategoryMarketStats[];
  modifier_group_stats: ModifierGroupMarketStats[];
}
```

### 5.2 API Endpoints

Add to `frontend/src/api/endpoints.ts`:

```typescript
// ============================================
// MARKET OVERVIEW API
// ============================================

export const getMarketOverviewDashboard = async (): Promise<MarketOverviewDashboard> => {
  const response = await client.get('/dashboard/market-overview');
  return response.data;
};

export const getShareOfSearch = async (limit: number = 20): Promise<ShareOfSearchItem[]> => {
  const response = await client.get('/dashboard/market-overview/share-of-search', {
    params: { limit }
  });
  return response.data;
};

export const getTopRetailers = async (limit: number = 10): Promise<DomainVisibilityItem[]> => {
  const response = await client.get('/dashboard/market-overview/retailers', {
    params: { limit }
  });
  return response.data;
};

export const getInfluentialVoices = async (limit: number = 10): Promise<DomainVisibilityItem[]> => {
  const response = await client.get('/dashboard/market-overview/influential-voices', {
    params: { limit }
  });
  return response.data;
};

export const getMarketProtectionKPIs = async (): Promise<MarketProtectionKPIs> => {
  const response = await client.get('/dashboard/market-overview/protection-kpis');
  return response.data;
};

export const getLossDistribution = async (): Promise<MarketLossDistribution[]> => {
  const response = await client.get('/dashboard/market-overview/loss-distribution');
  return response.data;
};

export const getBiggestLosers = async (limit: number = 20): Promise<BrandLossItem[]> => {
  const response = await client.get('/dashboard/market-overview/biggest-losers', {
    params: { limit }
  });
  return response.data;
};

export const getCategoryMarketStats = async (): Promise<CategoryMarketStats[]> => {
  const response = await client.get('/dashboard/market-overview/categories');
  return response.data;
};

export const getCategoryBreakdown = async (
  categoryName: string,
  valueLimit: number = 10
): Promise<CategoryBreakdown> => {
  const response = await client.get(`/dashboard/market-overview/categories/${categoryName}`, {
    params: { value_limit: valueLimit }
  });
  return response.data;
};

export const getModifierGroupMarketStats = async (): Promise<ModifierGroupMarketStats[]> => {
  const response = await client.get('/dashboard/market-overview/modifier-groups');
  return response.data;
};

export const getModifierGroupBreakdown = async (
  modifierGroup: string,
  limit: number = 10
): Promise<ModifierGroupBreakdown> => {
  const response = await client.get(`/dashboard/market-overview/modifier-groups/${encodeURIComponent(modifierGroup)}`, {
    params: { limit }
  });
  return response.data;
};
```

### 5.3 Navigation Update

Update `frontend/src/components/layout/Sidebar.tsx` to add Market Overview link:

```typescript
const navigationItems = [
  {
    name: 'Market Overview',
    href: '/market-overview',
    icon: GlobeAltIcon,  // or TrendingUpIcon from lucide-react
  },
  {
    name: 'Brand Protection',
    href: '/brand-protection',
    icon: ShieldCheckIcon,
  },
];
```

### 5.4 App Router Update

Update `frontend/src/App.tsx`:

```typescript
import MarketOverview from './pages/MarketOverview';

// In routes:
<Route path="/market-overview" element={<MarketOverview />} />
<Route path="/" element={<Navigate to="/market-overview" replace />} />
```

---

## 6. Component Specifications

### 6.1 ShareOfSearchChart.tsx

**Purpose**: Display brand demand as a horizontal bar chart

**Props**:

```typescript
interface Props {
  data: ShareOfSearchItem[];
  loading?: boolean;
}
```

**Features**:

- Horizontal bar chart showing top 15 brands
- X-axis: Search volume (formatted)
- Y-axis: Brand names
- Hover tooltip: Volume, keyword count, share %
- Color gradient based on share percentage

**Visual Design**:

- Uses Tremor's BarChart component
- Blue gradient for bars
- Animated entrance (Framer Motion)

### 6.2 ShareOfSearchTable.tsx

**Purpose**: Detailed table of top brands with performance metrics

**Props**:

```typescript
interface Props {
  data: ShareOfSearchItem[];
  loading?: boolean;
}
```

**Columns**:

1. Rank (#)
2. Brand Name
3. Search Volume (formatted)
4. Keywords
5. Share %
6. Primary Domain
7. Domain Visibility Score
8. Domain #1 Wins
9. Avg Position

### 6.3 RetailerStrengthSection.tsx

**Purpose**: Combined chart + table for retailer visibility

**Internal Components**:

- Horizontal bar chart (top 5 retailers by visibility)
- Detailed table (top 5 with all metrics)

**Columns in Table**:

1. Domain
2. Visibility Score
3. Rankings Count
4. #1 Wins
5. Avg Position
6. Top Brands Appearing On

### 6.4 InfluentialVoicesSection.tsx

**Purpose**: UGC and 3rd Party domain visibility

**Similar to RetailerStrengthSection but**:

- Shows both UGC and 3rd Party combined
- Color-coded by type (UGC vs 3rd Party)
- Split or combined chart view option

### 6.5 MarketProtectionSnapshot.tsx

**Purpose**: Overall brand protection health visualization

**Sub-components**:

1. **KPI Cards Row** (4 cards):

   - Total Win Rate (%)
   - Average Win Rate per Brand (%)
   - Total Volume at Risk
   - Average Loss per Brand
2. **Win/Loss Visualization**:

   - Stacked bar or gauge showing win vs loss ratio
   - Total keywords winning vs losing
3. **Loss Distribution Donut**:

   - By domain type (Brand, Reseller, UGC, 3rd Party)
   - Center: Total loss volume
   - Hover: Top 3 domains in each type

### 6.6 BiggestLosersTable.tsx

**Purpose**: Brands with worst protection ranked by loss volume

**Props**:

```typescript
interface Props {
  data: BrandLossItem[];
  loading?: boolean;
}
```

**Columns**:

1. Rank
2. Brand Name (clickable → Brand Protection page)
3. Total Keywords
4. Keywords Lost
5. Volume Lost
6. Win Rate (%)
7. Top Loss Modifiers (expandable badge list)

**Interactive Features**:

- Click brand → Navigate to Brand Protection with that brand selected
- Hover on modifiers → Show loss count per modifier

### 6.7 CategoryExplorer.tsx

**Purpose**: Expandable category list with drill-down

**Initial State**: Collapsed list showing category name, keywords, volume

**Expanded State** (on click):

- Top 10 values with stats
- For each value:
  - Keyword count, volume
  - Top domain per type (Brand, Retailer, UGC, 3rd Party)
  - 3 example keywords
- Aggregate top players across category

**UI Pattern**: Accordion-style expansion like Brand Protection's CategoryBreakdown

### 6.8 ModifierGroupExplorer.tsx

**Purpose**: Same as CategoryExplorer but for modifier groups

**Same pattern** with:

- Top tags within modifier group
- Top players by domain type
- Example keywords

---

## 7. API Endpoint Specifications

### Complete Endpoint Reference

| Endpoint                                                  | Method | Response                       | Use Case         |
| --------------------------------------------------------- | ------ | ------------------------------ | ---------------- |
| `/api/dashboard/market-overview`                        | GET    | `MarketOverviewDashboard`    | Main page load   |
| `/api/dashboard/market-overview/share-of-search`        | GET    | `ShareOfSearchItem[]`        | Refresh just SoS |
| `/api/dashboard/market-overview/retailers`              | GET    | `DomainVisibilityItem[]`     | Top retailers    |
| `/api/dashboard/market-overview/influential-voices`     | GET    | `DomainVisibilityItem[]`     | UGC + 3rd Party  |
| `/api/dashboard/market-overview/protection-kpis`        | GET    | `MarketProtectionKPIs`       | KPIs only        |
| `/api/dashboard/market-overview/loss-distribution`      | GET    | `MarketLossDistribution[]`   | Loss breakdown   |
| `/api/dashboard/market-overview/biggest-losers`         | GET    | `BrandLossItem[]`            | Worst performers |
| `/api/dashboard/market-overview/categories`             | GET    | `CategoryMarketStats[]`      | Category list    |
| `/api/dashboard/market-overview/categories/{name}`      | GET    | `CategoryBreakdown`          | Category detail  |
| `/api/dashboard/market-overview/modifier-groups`        | GET    | `ModifierGroupMarketStats[]` | Modifier list    |
| `/api/dashboard/market-overview/modifier-groups/{name}` | GET    | `ModifierGroupBreakdown`     | Modifier detail  |

---

## 8. SQL Query Specifications

### 8.1 Share of Search Query

```sql
-- Get brand search volume demand
SELECT
    kt.value AS brand_name,
    SUM(k.volume) AS total_volume,
    COUNT(DISTINCT k.id) AS keyword_count,
    -- Calculate share percentage
    ROUND(100.0 * SUM(k.volume) / (
        SELECT SUM(k2.volume)
        FROM keywords k2
        JOIN keyword_tags kt2 ON k2.id = kt2.keyword_id
        JOIN categories c2 ON kt2.category_id = c2.id
        WHERE c2.name = 'brand'
    ), 2) AS share_percentage,
    -- Get primary domain info
    bd.domain AS primary_domain
FROM keywords k
JOIN keyword_tags kt ON k.id = kt.keyword_id
JOIN categories c ON kt.category_id = c.id
LEFT JOIN brand_domains bd ON kt.value = bd.brand_name AND bd.is_primary = 1
LEFT JOIN domains d ON bd.domain_id = d.id
WHERE c.name = 'brand'
GROUP BY kt.value
ORDER BY total_volume DESC
LIMIT :limit;
```

### 8.2 Domain Visibility by Type Query

```sql
-- Calculate visibility score for domains of specific type
SELECT
    d.domain,
    bd.domain_type,
    SUM(k.volume * 1.0 / sr.rank_group) AS visibility_score,
    COUNT(DISTINCT sr.keyword_id) AS ranking_count,
    SUM(k.volume) AS total_volume,
    SUM(CASE WHEN sr.rank_group = 1 THEN 1 ELSE 0 END) AS win_count,
    AVG(sr.rank_group) AS avg_position
FROM serp_results sr
JOIN domains d ON sr.domain_id = d.id
JOIN keywords k ON sr.keyword_id = k.id
JOIN brand_domains bd ON d.id = bd.domain_id
WHERE bd.domain_type = :domain_type
  AND sr.rank_group <= 20  -- Only consider top 20 positions
GROUP BY d.id, d.domain, bd.domain_type
ORDER BY visibility_score DESC
LIMIT :limit;
```

### 8.3 Market Protection KPIs Query

```sql
-- Get win/loss stats per brand, then aggregate
WITH brand_stats AS (
    SELECT
        kt.value AS brand_name,
        COUNT(DISTINCT k.id) AS total_keywords,
        SUM(k.volume) AS total_volume,
        SUM(CASE WHEN sr.rank_group = 1 AND sr.domain_id = bd.domain_id THEN 1 ELSE 0 END) AS keywords_winning,
        SUM(CASE WHEN sr.rank_group = 1 AND sr.domain_id = bd.domain_id THEN k.volume ELSE 0 END) AS volume_winning
    FROM keywords k
    JOIN keyword_tags kt ON k.id = kt.keyword_id
    JOIN categories c ON kt.category_id = c.id
    LEFT JOIN brand_domains bd ON kt.value = bd.brand_name AND bd.is_primary = 1
    LEFT JOIN serp_results sr ON k.id = sr.keyword_id AND sr.rank_group = 1
    WHERE c.name = 'brand'
    GROUP BY kt.value
    HAVING total_keywords >= 10  -- Minimum keywords threshold
)
SELECT
    COUNT(*) AS total_brands,
    SUM(total_keywords) AS total_branded_keywords,
    SUM(total_volume) AS total_branded_volume,
    SUM(keywords_winning) AS total_keywords_winning,
    SUM(total_keywords - keywords_winning) AS total_keywords_losing,
    SUM(volume_winning) AS total_volume_winning,
    SUM(total_volume - volume_winning) AS total_volume_losing,
    AVG(100.0 * keywords_winning / total_keywords) AS average_win_rate,
    -- Median requires window function or subquery
    AVG(100.0 * volume_winning / total_volume) AS average_volume_win_rate
FROM brand_stats;
```

### 8.4 Loss Distribution by Domain Type Query

```sql
-- Count losses by domain type across all brands
SELECT
    bd_winner.domain_type,
    COUNT(DISTINCT sr.keyword_id) AS loss_count,
    SUM(k.volume) AS loss_volume,
    ROUND(100.0 * SUM(k.volume) / (
        SELECT SUM(k2.volume)
        FROM keywords k2
        JOIN keyword_tags kt2 ON k2.id = kt2.keyword_id
        JOIN categories c2 ON kt2.category_id = c2.id
        WHERE c2.name = 'brand'
    ), 2) AS percentage_of_losses
FROM serp_results sr
JOIN keywords k ON sr.keyword_id = k.id
JOIN keyword_tags kt ON k.id = kt.keyword_id
JOIN categories c ON kt.category_id = c.id
JOIN domains d ON sr.domain_id = d.id
JOIN brand_domains bd_winner ON d.id = bd_winner.domain_id
LEFT JOIN brand_domains bd_brand ON kt.value = bd_brand.brand_name AND bd_brand.is_primary = 1
WHERE c.name = 'brand'
  AND sr.rank_group = 1
  AND (bd_brand.domain_id IS NULL OR sr.domain_id != bd_brand.domain_id)
GROUP BY bd_winner.domain_type
ORDER BY loss_volume DESC;
```

### 8.5 Biggest Losers Query

```sql
-- Brands losing most traffic
WITH brand_losses AS (
    SELECT
        kt.value AS brand_name,
        COUNT(DISTINCT k.id) AS total_keywords,
        SUM(k.volume) AS total_volume,
        SUM(CASE
            WHEN sr.rank_group = 1 AND sr.domain_id = bd.domain_id THEN 0
            ELSE 1
        END) AS keywords_lost,
        SUM(CASE
            WHEN sr.rank_group = 1 AND sr.domain_id = bd.domain_id THEN 0
            ELSE k.volume
        END) AS volume_lost
    FROM keywords k
    JOIN keyword_tags kt ON k.id = kt.keyword_id
    JOIN categories c ON kt.category_id = c.id
    LEFT JOIN brand_domains bd ON kt.value = bd.brand_name AND bd.is_primary = 1
    LEFT JOIN serp_results sr ON k.id = sr.keyword_id AND sr.rank_group = 1
    WHERE c.name = 'brand'
    GROUP BY kt.value
)
SELECT
    brand_name,
    total_keywords,
    keywords_lost,
    volume_lost,
    ROUND(100.0 * (total_keywords - keywords_lost) / total_keywords, 1) AS win_rate
FROM brand_losses
WHERE total_keywords >= 10
ORDER BY volume_lost DESC
LIMIT :limit;
```

### 8.6 Category Market Stats Query

```sql
-- Get stats for each category
SELECT
    c.name AS category_name,
    c.display_name,
    COUNT(DISTINCT kt.keyword_id) AS total_keywords,
    SUM(k.volume) AS total_volume,
    COUNT(DISTINCT kt.value) AS unique_values
FROM categories c
JOIN keyword_tags kt ON c.id = kt.category_id
JOIN keywords k ON kt.keyword_id = k.id
WHERE c.name != 'brand'  -- Exclude brand category
GROUP BY c.id, c.name, c.display_name
ORDER BY total_volume DESC;
```

### 8.7 Modifier Group Stats Query

```sql
-- Get stats for each modifier group
SELECT
    k.modifier_group,
    COUNT(DISTINCT k.id) AS total_keywords,
    SUM(k.volume) AS total_volume
FROM keywords k
WHERE k.modifier_group IS NOT NULL
GROUP BY k.modifier_group
ORDER BY total_volume DESC;
```

---

## 9. Optional Enhancements

### 9.1 Market Health Score

Create a composite score (0-100) based on:

- Average brand win rate (40%)
- Market concentration (Herfindahl index) (20%)
- Domain type diversity (20%)
- Volume distribution fairness (20%)

Display as a gauge or prominent number at the top.

### 9.2 Trend Indicators

If historical data becomes available:

- Week-over-week change in Share of Search
- Win rate trends per brand
- Rising/falling competitors

### 9.3 Competitive Benchmarking

Compare any two brands side-by-side:

- Share of Search comparison
- Win rate comparison
- Category strength comparison

### 9.4 Export Functionality

- Export Share of Search data as CSV
- Export category breakdown as report
- Generate PDF summary

### 9.5 Filter by Category/Modifier

Allow filtering the entire dashboard by:

- Specific category (e.g., only "mountain" bicycle_type)
- Specific modifier group
- Volume threshold

### 9.6 Interactive Brand Navigation

Click any brand in:

- Share of Search table
- Biggest Losers table
- Category breakdown

Navigate directly to Brand Protection page with that brand pre-selected.

### 9.7 Domain Deep Dive

Click any domain to see:

- All brands they compete on
- Category distribution
- Win rate against each brand

### 9.8 Market Segmentation

Group keywords by:

- Price tier (if available)
- Intent type (informational vs transactional)
- Seasonality patterns

### 9.9 Opportunity Finder

> **MOVED** to separate document: `OPPORTUNITIES_PLAN.md`
> This will be a dedicated dashboard with multiple opportunity signals.

### 9.10 Real-time Filtering

Add global filters at the top:

- Minimum volume threshold
- Date range (if available)
- Include/exclude specific domain types

---

## 10. Implementation Checklist

### Phase 1: Backend Foundation

- [ ] Create `backend/app/services/market_analytics.py`
- [ ] Implement `get_share_of_search()` method
- [ ] Implement `get_domain_visibility_by_type()` method
- [ ] Implement `get_market_protection_kpis()` method
- [ ] Implement `get_market_loss_distribution()` method
- [ ] Implement `get_biggest_losers()` method
- [ ] Implement `get_category_market_stats()` method
- [ ] Implement `get_category_breakdown()` method
- [ ] Implement `get_modifier_group_market_stats()` method
- [ ] Implement `get_modifier_group_breakdown()` method
- [ ] Implement `get_full_dashboard()` method

### Phase 2: Backend API Layer

- [ ] Add schemas to `backend/app/schemas.py`
- [ ] Create `backend/app/routers/market_overview.py`
- [ ] Register router in `backend/app/main.py`
- [ ] Test all endpoints via `/docs`

### Phase 3: Frontend Types & API

- [ ] Add types to `frontend/src/types/index.ts`
- [ ] Add API functions to `frontend/src/api/endpoints.ts`
- [ ] Test API calls in browser console

### Phase 4: Frontend Components

- [ ] Create `frontend/src/components/market-overview/` directory
- [ ] Implement `ShareOfSearchChart.tsx`
- [ ] Implement `ShareOfSearchTable.tsx`
- [ ] Implement `RetailerStrengthSection.tsx`
- [ ] Implement `InfluentialVoicesSection.tsx`
- [ ] Implement `MarketProtectionSnapshot.tsx`
- [ ] Implement `BiggestLosersTable.tsx`
- [ ] Implement `CategoryExplorer.tsx`
- [ ] Implement `ModifierGroupExplorer.tsx`

### Phase 5: Page Assembly

- [ ] Create `frontend/src/pages/MarketOverview.tsx`
- [ ] Update `frontend/src/components/layout/Sidebar.tsx`
- [ ] Update `frontend/src/App.tsx` routing
- [ ] Style and polish components

### Phase 6: Testing & Polish

- [ ] Test all components with real data
- [ ] Verify performance with full dataset
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add empty state handling
- [ ] Test navigation links
- [ ] Responsive design check

### Phase 7: Documentation

- [ ] Update `CLAUDE.md` with Market Overview section
- [ ] Document new endpoints in API docs
- [ ] Add inline code comments

---

## Appendix: Reusable Code Patterns

### From Brand Protection (Reuse These):

1. **Visibility Calculation** - Already in `brand_mapper.py`
2. **Domain Type Classification** - `BrandDomain.domain_type` field
3. **Category Breakdown Pattern** - `CategoryBreakdown.tsx` component
4. **Table Styling** - Tremor Table component usage
5. **Chart Patterns** - BarChart, DonutChart from Tremor
6. **KPI Card Pattern** - `KPICards.tsx` styling
7. **Expandable Row Pattern** - `CategoryBreakdown.tsx` accordion
8. **API Hook Pattern** - `useApi.ts` custom hook
9. **Number Formatting** - `formatters.ts` utilities

### Database Query Patterns:

1. **Subquery for exclusion** - Find losing keywords
2. **Window functions** - Running totals, rankings
3. **CTE (WITH clause)** - Complex aggregations
4. **Conditional aggregation** - CASE WHEN in SUM/COUNT

---

*Document Version: 1.0*
*Created: January 2026*
*Author: Claude Code*
