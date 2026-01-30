"""
Pydantic schemas for API request/response validation.

Defines all data transfer objects (DTOs) used by the API.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


# =============================================================================
# Base Schemas
# =============================================================================


class BaseSchema(BaseModel):
    """Base schema with common configuration."""

    model_config = ConfigDict(from_attributes=True)


# =============================================================================
# Market Schemas
# =============================================================================


class MarketDomainTypeResponse(BaseSchema):
    """Domain type configuration for a market."""

    id: str = Field(alias="type_id")
    display_name: str
    is_brand_type: bool = False
    tremor_color: str = "gray"
    hex_color: str = "#6B7280"
    gradient: Optional[str] = None
    bg_class: Optional[str] = None
    text_class: Optional[str] = None
    border_class: Optional[str] = None
    icon: str = "Building2"

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class MarketSummary(BaseSchema):
    """Brief market info for market selector."""

    id: str
    name: str
    language: str = "en"
    text_direction: str = "ltr"
    is_active: bool = True


class MarketConfigResponse(BaseSchema):
    """Full market configuration response."""

    market_id: str = Field(alias="id")
    market_name: str = Field(alias="name")
    industry_context: str
    language: str = "en"
    text_direction: str = "ltr"
    domain_types: List[MarketDomainTypeResponse] = Field(default_factory=list)
    brand_category_names: List[str] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class MarketsListResponse(BaseSchema):
    """List of available markets."""

    markets: List[MarketSummary] = Field(default_factory=list)
    total: int = 0


# =============================================================================
# Keyword Schemas
# =============================================================================


class KeywordBase(BaseSchema):
    """Base keyword schema with common fields."""

    keyword: str
    volume: int
    modifier_group: Optional[str] = None


class KeywordCreate(KeywordBase):
    """Schema for creating a new keyword."""

    pass


class KeywordResponse(KeywordBase):
    """Schema for keyword response."""

    id: int
    created_at: datetime


class KeywordWithTags(KeywordResponse):
    """Schema for keyword with its tags."""

    tags: Dict[str, str] = Field(default_factory=dict)


class KeywordWithSerp(KeywordWithTags):
    """Schema for keyword with SERP results."""

    serp_results: List["SerpResultResponse"] = Field(default_factory=list)


# =============================================================================
# Category Schemas
# =============================================================================


class CategoryBase(BaseSchema):
    """Base category schema."""

    name: str
    display_name: str


class CategoryResponse(CategoryBase):
    """Schema for category response."""

    id: int


class CategoryWithValues(CategoryResponse):
    """Schema for category with all its unique values."""

    values: List[str] = Field(default_factory=list)
    keyword_count: int = 0


# =============================================================================
# Domain Schemas
# =============================================================================


class DomainBase(BaseSchema):
    """Base domain schema."""

    domain: str


class DomainResponse(DomainBase):
    """Schema for domain response."""

    id: int
    created_at: datetime


class DomainWithStats(DomainResponse):
    """Schema for domain with statistics."""

    total_rankings: int = 0
    first_position_count: int = 0
    avg_position: Optional[float] = None


# =============================================================================
# SERP Result Schemas
# =============================================================================


class SerpResultBase(BaseSchema):
    """Base SERP result schema."""

    rank_group: int
    rank_absolute: int
    page: int
    result_type: str
    title: Optional[str] = None
    description: Optional[str] = None
    url: str


class SerpResultResponse(SerpResultBase):
    """Schema for SERP result response."""

    id: int
    keyword_id: int
    domain_id: int
    domain: str  # Denormalized for convenience
    created_at: datetime


# =============================================================================
# Brand Schemas
# =============================================================================


class BrandBase(BaseSchema):
    """Base brand schema."""

    brand_name: str


class BrandResponse(BrandBase):
    """Schema for brand response."""

    keyword_count: int = 0
    total_volume: int = 0


class BrandWithDomains(BrandResponse):
    """Schema for brand with its domain mappings."""

    domains: List["BrandDomainResponse"] = Field(default_factory=list)


class BrandDomainBase(BaseSchema):
    """Base brand-domain mapping schema."""

    brand_name: str
    domain_id: int
    is_primary: bool = True
    confidence: float = 1.0


class BrandDomainCreate(BrandDomainBase):
    """Schema for creating a brand-domain mapping."""

    pass


class BrandDomainResponse(BaseSchema):
    """Schema for brand-domain mapping response."""

    id: int
    brand_name: str
    domain: str  # Denormalized
    is_primary: bool
    confidence: float
    created_at: datetime


class BrandDomainUpdate(BaseSchema):
    """Schema for updating brand-domain mappings."""

    domains: List[Dict[str, Any]]  # List of {domain: str, is_primary: bool}


# =============================================================================
# Dashboard Schemas
# =============================================================================


class BrandProtectionKPIs(BaseSchema):
    """Key performance indicators for brand protection dashboard."""

    total_branded_keywords: int = 0
    total_branded_volume: int = 0
    keywords_winning: int = 0
    keywords_losing: int = 0
    volume_winning: int = 0
    volume_losing: int = 0
    win_rate_keywords: float = 0.0
    win_rate_volume: float = 0.0


class BrandProtectionWin(BaseSchema):
    """A keyword where the brand ranks #1."""

    keyword: str
    volume: int
    rank_absolute: int
    url: str
    tags: Dict[str, str] = Field(default_factory=dict)


class BrandProtectionLoss(BaseSchema):
    """A keyword where a competitor beats the brand."""

    keyword: str
    volume: int
    winner_domain: str
    winner_position: int
    winner_url: str
    brand_position: Optional[int] = None
    brand_url: Optional[str] = None
    modifier_group: Optional[str] = None
    tags: Dict[str, str] = Field(default_factory=dict)


class CompetitorStats(BaseSchema):
    """Statistics for a competitor domain on brand keywords."""

    domain: str
    domain_type: Optional[str] = None
    wins_count: int = 0
    wins_volume: int = 0
    avg_position: float = 0.0
    keywords: List[str] = Field(default_factory=list)


class CategoryLossStats(BaseSchema):
    """Statistics for wins/losses within a category (aggregated)."""

    category: str
    display_name: str
    total_keywords: int = 0
    total_volume: int = 0
    keywords_winning: int = 0
    keywords_losing: int = 0
    volume_winning: int = 0
    volume_losing: int = 0
    win_rate: float = 0.0


class CategoryValueLossStats(BaseSchema):
    """Statistics for losses within a specific category value."""

    value: str
    loss_count: int = 0
    loss_volume: int = 0
    percentage_of_category: float = 0.0


class DomainTypeLossStats(BaseSchema):
    """Statistics for losses by domain type."""

    domain_type: str
    loss_count: int = 0
    loss_volume: int = 0
    percentage_of_losses: float = 0.0


class InfluentialDomain(BaseSchema):
    """Most influential domain for a specific domain type on brand keywords."""

    domain: str
    domain_type: str
    ranking_count: int = 0
    ranking_volume: int = 0
    avg_position: float = 0.0
    win_count: int = 0  # Number of #1 rankings


class ModifierGroupStats(BaseSchema):
    """Statistics for a modifier group value on brand keywords."""

    modifier_group: str
    total_keywords: int = 0
    total_volume: int = 0
    keywords_winning: int = 0
    keywords_losing: int = 0
    volume_winning: int = 0
    volume_losing: int = 0
    win_rate: float = 0.0


class BrandProtectionDashboard(BaseSchema):
    """Complete brand protection dashboard data."""

    brand_name: str
    brand_domains: List[str] = Field(default_factory=list)
    kpis: BrandProtectionKPIs
    wins: List[BrandProtectionWin] = Field(default_factory=list)
    losses: List[BrandProtectionLoss] = Field(default_factory=list)
    top_competitors: List[CompetitorStats] = Field(default_factory=list)
    losses_by_category: List[CategoryLossStats] = Field(default_factory=list)
    losses_by_domain_type: List[DomainTypeLossStats] = Field(default_factory=list)
    influential_voices: List[InfluentialDomain] = Field(default_factory=list)


# =============================================================================
# Brand Protection Explorer Schemas
# =============================================================================


class ExampleWinnerKeyword(BaseSchema):
    """Example keyword where brand ranks #1."""

    keyword: str
    volume: int
    url: str


class ExampleLoserKeyword(BaseSchema):
    """Example keyword where competitor beats brand."""

    keyword: str
    volume: int
    winner_domain: str
    winner_position: int = 1


class CategoryValueProtectionStats(BaseSchema):
    """Detailed stats for a category value with win/loss split."""

    value: str
    total_keywords: int = 0
    total_volume: int = 0
    keywords_winning: int = 0
    keywords_losing: int = 0
    volume_winning: int = 0
    volume_losing: int = 0
    win_rate: float = 0.0
    avg_brand_position: Optional[float] = None
    example_winners: List[ExampleWinnerKeyword] = Field(default_factory=list)
    example_losers: List[ExampleLoserKeyword] = Field(default_factory=list)


class CategoryCompetitor(BaseSchema):
    """Top competitor within a category/modifier segment."""

    domain: str
    domain_type: str
    wins_count: int = 0
    wins_volume: int = 0
    avg_position: float = 0.0


class DomainTypeLossDetail(BaseSchema):
    """Loss distribution detail by domain type for charts."""

    domain_type: str
    loss_count: int = 0
    loss_volume: int = 0
    percentage: float = 0.0


class CategoryProtectionBreakdown(BaseSchema):
    """Full breakdown for a category in brand protection context."""

    category_name: str
    display_name: str
    total_keywords: int = 0
    total_volume: int = 0
    keywords_winning: int = 0
    keywords_losing: int = 0
    volume_winning: int = 0
    volume_losing: int = 0
    win_rate: float = 0.0
    avg_brand_position: Optional[float] = None
    top_values: List[CategoryValueProtectionStats] = Field(default_factory=list)
    competitors_by_type: Dict[str, List[CategoryCompetitor]] = Field(default_factory=dict)
    loss_distribution_by_type: List[DomainTypeLossDetail] = Field(default_factory=list)


class TagProtectionStats(BaseSchema):
    """Stats for a tag within a modifier group."""

    tag: str
    count: int = 0
    win_rate: float = 0.0


class ModifierGroupProtectionBreakdown(BaseSchema):
    """Full breakdown for a modifier group in brand protection context."""

    modifier_group: str
    total_keywords: int = 0
    total_volume: int = 0
    keywords_winning: int = 0
    keywords_losing: int = 0
    volume_winning: int = 0
    volume_losing: int = 0
    win_rate: float = 0.0
    avg_brand_position: Optional[float] = None
    top_tags: List[TagProtectionStats] = Field(default_factory=list)
    competitors_by_type: Dict[str, List[CategoryCompetitor]] = Field(default_factory=dict)
    loss_distribution_by_type: List[DomainTypeLossDetail] = Field(default_factory=list)
    example_winners: List[ExampleWinnerKeyword] = Field(default_factory=list)
    example_losers: List[ExampleLoserKeyword] = Field(default_factory=list)


# =============================================================================
# List Response Schemas
# =============================================================================


class PaginatedResponse(BaseSchema):
    """Base schema for paginated responses."""

    total: int
    page: int
    page_size: int
    total_pages: int


class KeywordListResponse(PaginatedResponse):
    """Paginated list of keywords."""

    items: List[KeywordWithTags] = Field(default_factory=list)


class BrandListResponse(BaseSchema):
    """List of all brands."""

    items: List[BrandResponse] = Field(default_factory=list)
    total: int


# =============================================================================
# System Schemas
# =============================================================================


class HealthResponse(BaseSchema):
    """Health check response."""

    status: str = "ok"
    database: str = "connected"
    version: str = "0.1.0"


class ImportStatus(BaseSchema):
    """Data import status response."""

    status: str
    keywords_imported: int = 0
    serp_results_imported: int = 0
    domains_found: int = 0
    categories_created: int = 0
    errors: List[str] = Field(default_factory=list)


# =============================================================================
# Market Overview Schemas
# =============================================================================


class ShareOfSearchItem(BaseSchema):
    """Brand's share of search volume demand."""

    brand_name: str
    total_volume: int
    keyword_count: int
    share_percentage: float


class DomainVisibilityItem(BaseSchema):
    """Domain visibility metrics."""

    domain: str
    domain_type: str
    visibility_score: float
    ranking_count: int  # How many keywords they rank on
    total_volume: int  # Sum of volume for keywords they rank on
    win_count: int  # #1 rankings
    avg_position: float
    top_brands: List[str] = Field(default_factory=list)  # Top 3 brands they appear on


class DomainWinnerItem(BaseSchema):
    """Domain winner for breakdown views. Compatible with frontend DomainVisibilityItem."""

    domain: str
    domain_type: str = ""
    win_count: int = 0
    volume_captured: int = 0
    # Aliases for frontend compatibility
    visibility_score: float = 0.0
    ranking_count: int = 0
    total_volume: int = 0
    avg_position: float = 0.0
    top_brands: List[str] = Field(default_factory=list)


class MarketProtectionKPIs(BaseSchema):
    """Market-wide brand protection metrics."""

    # Market totals (ALL keywords)
    total_market_keywords: int = 0
    total_market_volume: int = 0
    # Brand protection totals (branded keywords only)
    total_brands: int = 0
    total_branded_keywords: int = 0
    total_branded_volume: int = 0
    total_keywords_winning: int = 0
    total_keywords_losing: int = 0
    total_volume_winning: int = 0
    total_volume_losing: int = 0
    # Averages
    average_win_rate: float = 0.0
    median_win_rate: float = 0.0
    average_volume_win_rate: float = 0.0


class MarketLossDistribution(BaseSchema):
    """Loss distribution by domain type."""

    domain_type: str
    loss_count: int = 0
    loss_volume: int = 0
    percentage_of_losses: float = 0.0
    top_domains: List[str] = Field(default_factory=list)  # Top 3 domains in this type


class BrandLossItem(BaseSchema):
    """Individual brand's loss metrics."""

    brand_name: str
    total_keywords: int = 0
    keywords_lost: int = 0
    volume_lost: int = 0
    win_rate: float = 0.0
    top_loss_modifier_groups: List[Dict[str, Any]] = Field(
        default_factory=list
    )  # Top 3 modifier groups


class CategoryMarketStats(BaseSchema):
    """Market statistics for a category."""

    category_name: str
    display_name: str
    total_keywords: int = 0
    total_volume: int = 0
    unique_values: int = 0
    # Summary of top values
    top_values_preview: List[str] = Field(default_factory=list)  # Top 3 values


class CategoryValueMarketStats(BaseSchema):
    """Detailed stats for a value within a category."""

    value: str
    keyword_count: int = 0
    total_volume: int = 0
    # Top players by domain type
    top_brand_domain: Optional[str] = None
    top_brand_visibility: Optional[float] = None
    top_retailer_domain: Optional[str] = None
    top_retailer_visibility: Optional[float] = None
    top_ugc_domain: Optional[str] = None
    top_ugc_visibility: Optional[float] = None
    top_3rd_party_domain: Optional[str] = None
    top_3rd_party_visibility: Optional[float] = None
    example_keywords: List[str] = Field(default_factory=list)


class CategoryBreakdown(BaseSchema):
    """Full breakdown for a category."""

    category_name: str
    display_name: str
    total_keywords: int = 0
    total_volume: int = 0
    top_values: List[CategoryValueMarketStats] = Field(default_factory=list)
    # Aggregate top players across category (simplified winner items)
    top_players_by_type: Dict[str, List[DomainWinnerItem]] = Field(
        default_factory=dict
    )


class ModifierGroupMarketStats(BaseSchema):
    """Market statistics for a modifier group."""

    modifier_group: str
    total_keywords: int = 0
    total_volume: int = 0
    # Summary preview
    top_tags_preview: List[str] = Field(default_factory=list)


class ModifierGroupBreakdown(BaseSchema):
    """Full breakdown for a modifier group."""

    modifier_group: str
    total_keywords: int = 0
    total_volume: int = 0
    top_tags: List[Dict[str, Any]] = Field(default_factory=list)  # Tag name + count
    top_players_by_type: Dict[str, List[DomainWinnerItem]] = Field(
        default_factory=dict
    )
    example_keywords: List[Dict[str, Any]] = Field(default_factory=list)


class MarketOverviewDashboard(BaseSchema):
    """Complete market overview dashboard."""

    # Share of Search
    share_of_search: List[ShareOfSearchItem] = Field(default_factory=list)
    # Domain Type Sections
    top_retailers: List[DomainVisibilityItem] = Field(default_factory=list)
    influential_voices: List[DomainVisibilityItem] = Field(
        default_factory=list
    )  # UGC + 3rd Party
    # Brand Protection
    protection_kpis: MarketProtectionKPIs
    loss_distribution: List[MarketLossDistribution] = Field(default_factory=list)
    biggest_losers: List[BrandLossItem] = Field(default_factory=list)
    # Categories & Modifiers (summary for expandable)
    category_stats: List[CategoryMarketStats] = Field(default_factory=list)
    modifier_group_stats: List[ModifierGroupMarketStats] = Field(default_factory=list)


# =============================================================================
# Home Dashboard & Summary Schemas
# =============================================================================


class BrandHealthScore(BaseSchema):
    """Brand health score calculation result."""

    score: int = 0  # 0-100 composite score
    grade: str = "N/A"  # A, B, C, D, F
    win_rate_keywords: float = 0.0
    win_rate_volume: float = 0.0
    trend: str = "stable"  # up, down, stable (for future use)


class HomeDashboardKPIs(BaseSchema):
    """Quick pulse KPIs for the home dashboard."""

    # Brand health (for selected brand)
    health_score: int = 0
    health_grade: str = "N/A"
    win_rate_keywords: float = 0.0
    win_rate_volume: float = 0.0
    # Opportunity size
    volume_at_risk: int = 0
    keywords_at_risk: int = 0
    # Top threat
    top_threat_domain: Optional[str] = None
    top_threat_domain_type: Optional[str] = None
    top_threat_keywords: int = 0
    top_threat_volume: int = 0
    # Market position
    market_rank: Optional[int] = None
    share_of_search: float = 0.0


class HomeDashboard(BaseSchema):
    """Complete home dashboard data for quick pulse view."""

    brand_name: str
    brand_domains: List[str] = Field(default_factory=list)
    kpis: HomeDashboardKPIs
    # Recent alerts/insights could be added here later
    has_domain_mapping: bool = True


class BrandProtectionSummary(BaseSchema):
    """Lightweight brand protection summary with health score."""

    brand_name: str
    brand_domains: List[str] = Field(default_factory=list)
    # Health score
    health_score: int = 0
    health_grade: str = "N/A"
    # Core KPIs
    total_keywords: int = 0
    keywords_winning: int = 0
    keywords_losing: int = 0
    volume_winning: int = 0
    volume_losing: int = 0
    win_rate_keywords: float = 0.0
    win_rate_volume: float = 0.0
    # Top threat summary
    top_threat_domain: Optional[str] = None
    top_threat_domain_type: Optional[str] = None
    top_threat_keywords: int = 0
    top_threat_volume: int = 0


# =============================================================================
# Category Opportunities Schemas
# =============================================================================


class OpportunityCompetitor(BaseSchema):
    """Top competitor on non-branded keywords within a modifier group."""

    domain: str
    domain_type: str  # Brand, Reseller, UGC, 3rd Party
    wins_count: int = 0
    wins_volume: int = 0
    avg_position: float = 0.0


class ModifierGroupOpportunity(BaseSchema):
    """Opportunity metrics for a modifier group on non-branded keywords."""

    modifier_group: str
    # Opportunity Size
    total_keywords: int = 0
    total_volume: int = 0  # Total opportunity size
    # Current Capture
    keywords_captured: int = 0  # Where brand ranks #1
    volume_captured: int = 0
    # Volume to Capture
    keywords_uncaptured: int = 0
    volume_uncaptured: int = 0  # Opportunity volume
    # Capture Rate
    capture_rate: float = 0.0  # (captured / total) * 100
    # Position Metrics
    avg_brand_position: Optional[float] = None  # Where brand ranks overall
    # Competitors
    top_competitors: List[OpportunityCompetitor] = Field(default_factory=list)
    # Tags & Examples
    top_tags: Dict[str, int] = Field(default_factory=dict)
    example_keywords: List[str] = Field(default_factory=list)


class CategoryOpportunityKPIs(BaseSchema):
    """KPIs for the Category Opportunities dashboard."""

    total_nonbranded_keywords: int = 0
    total_nonbranded_volume: int = 0
    keywords_captured: int = 0
    volume_captured: int = 0
    keywords_uncaptured: int = 0
    volume_uncaptured: int = 0
    overall_capture_rate: float = 0.0  # Keywords capture rate
    volume_capture_rate: float = 0.0  # Volume capture rate
    # Biggest opportunity
    biggest_opportunity_group: Optional[str] = None
    biggest_opportunity_volume: int = 0


class CategoryOpportunityStats(BaseSchema):
    """Per-category stats for opportunity dashboard."""

    category_name: str
    display_name: str
    total_keywords: int = 0
    total_volume: int = 0
    keywords_captured: int = 0
    volume_captured: int = 0
    capture_rate: float = 0.0
    unique_values: int = 0


class CategoryOpportunityDashboard(BaseSchema):
    """Complete Category Opportunities dashboard data."""

    brand_name: str
    brand_domains: List[str] = Field(default_factory=list)
    kpis: CategoryOpportunityKPIs
    modifier_groups: List[ModifierGroupOpportunity] = Field(default_factory=list)
    category_stats: List[CategoryOpportunityStats] = Field(default_factory=list)


# =============================================================================
# Enhanced Opportunity Breakdown Schemas
# =============================================================================


class OpportunityKeywordDetail(BaseSchema):
    """Detailed keyword with full competitive data."""

    keyword: str
    volume: int
    winner_domain: Optional[str] = None
    winner_position: Optional[int] = None
    brand_position: Optional[int] = None
    winner_domain_type: Optional[str] = None


class OpportunityCategoryValue(BaseSchema):
    """Category value stats within an opportunity modifier group."""

    category_name: str
    value: str
    total_keywords: int = 0
    total_volume: int = 0
    keywords_captured: int = 0
    volume_captured: int = 0
    capture_rate: float = 0.0
    top_keywords: List[OpportunityKeywordDetail] = Field(default_factory=list)


class ModifierGroupOpportunityBreakdown(BaseSchema):
    """Full breakdown for a modifier group (lazy loaded on expand)."""

    modifier_group: str
    total_keywords: int = 0
    total_volume: int = 0
    keywords_captured: int = 0
    volume_captured: int = 0
    capture_rate: float = 0.0
    avg_brand_position: Optional[float] = None

    # Top category values with detailed stats
    top_values: List[OpportunityCategoryValue] = Field(default_factory=list)

    # Competitors grouped by domain type
    competitors_by_type: Dict[str, List[OpportunityCompetitor]] = Field(default_factory=dict)

    # Detailed keyword examples (not just strings)
    example_keywords: List[OpportunityKeywordDetail] = Field(default_factory=list)


class CategoryOpportunityBreakdown(BaseSchema):
    """Full breakdown for a category in opportunity context."""

    category_name: str
    display_name: str
    total_keywords: int = 0
    total_volume: int = 0
    keywords_captured: int = 0
    volume_captured: int = 0
    capture_rate: float = 0.0
    avg_brand_position: Optional[float] = None

    # Top category values with detailed stats
    top_values: List[OpportunityCategoryValue] = Field(default_factory=list)

    # Competitors grouped by domain type
    competitors_by_type: Dict[str, List[OpportunityCompetitor]] = Field(default_factory=dict)

    # Detailed keyword examples
    example_keywords: List[OpportunityKeywordDetail] = Field(default_factory=list)


class CompetitorBrandedDashboard(BaseSchema):
    """Dashboard for competitor branded keywords analysis."""

    brand_name: str
    brand_domains: List[str] = Field(default_factory=list)
    competitor_brands: List[str] = Field(default_factory=list)  # List of competitor brand names found
    kpis: CategoryOpportunityKPIs
    modifier_groups: List[ModifierGroupOpportunity] = Field(default_factory=list)
    category_stats: List[CategoryOpportunityStats] = Field(default_factory=list)


# =============================================================================
# Heatmap Schemas (Two-Category Cross-Tabulation)
# =============================================================================


class HeatmapCell(BaseSchema):
    """Single cell in the heatmap grid representing a (row_value, col_value) combination."""

    row_value: str
    col_value: str
    total_keywords: int = 0
    total_volume: int = 0
    volume_captured: int = 0
    volume_uncaptured: int = 0
    capture_rate: float = 0.0


class HeatmapResponse(BaseSchema):
    """Response for modifier group heatmap cross-tabulation."""

    modifier_group: str
    row_category: str  # Category name for rows (e.g., "bicycle_type")
    row_category_display: str  # Display name (e.g., "Bicycle Type")
    col_category: str  # Category name for columns (e.g., "parts")
    col_category_display: str  # Display name (e.g., "Parts")
    row_values: List[str] = Field(default_factory=list)  # Ordered list of row values
    col_values: List[str] = Field(default_factory=list)  # Ordered list of column values
    cells: List[HeatmapCell] = Field(default_factory=list)  # All non-empty cells
    max_volume_uncaptured: int = 0  # For color scaling
    total_combinations: int = 0  # Total number of cells with data


# =============================================================================
# Combination Keywords Schemas (Heatmap Cell Drill-Down)
# =============================================================================


class CombinationKeywordRanker(BaseSchema):
    """A domain in the top 5 ranking positions for a keyword."""

    rank: int
    domain: str
    domain_type: str = "3rd Party"


class CombinationKeyword(BaseSchema):
    """Keyword with full ranking info for combination drill-down."""

    keyword_id: int
    keyword: str
    volume: int
    brand_position: Optional[int] = None
    is_captured: bool = False
    winner_domain: Optional[str] = None
    winner_domain_type: Optional[str] = None
    top_5: List[CombinationKeywordRanker] = Field(default_factory=list)


class CombinationKeywordsResponse(BaseSchema):
    """Response for combination keywords drill-down from heatmap cell."""

    row_value: str
    col_value: str
    row_category: str
    col_category: str
    total_keywords: int = 0
    total_volume: int = 0
    volume_captured: int = 0
    volume_uncaptured: int = 0
    capture_rate: float = 0.0
    keywords: List[CombinationKeyword] = Field(default_factory=list)


# Update forward references
KeywordWithSerp.model_rebuild()
BrandWithDomains.model_rebuild()
CategoryBreakdown.model_rebuild()
