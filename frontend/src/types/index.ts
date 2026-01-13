/**
 * TypeScript type definitions for the API.
 */

// =============================================================================
// Brand Types
// =============================================================================

export interface Brand {
  brand_name: string;
  keyword_count: number;
  total_volume: number;
}

export interface BrandDomain {
  id: number;
  brand_name: string;
  domain: string;
  is_primary: boolean;
  confidence: number;
  created_at: string;
}

export interface BrandWithDomains extends Brand {
  domains: BrandDomain[];
}

export interface BrandListResponse {
  items: Brand[];
  total: number;
}

// =============================================================================
// Keyword Types
// =============================================================================

export interface Keyword {
  id: number;
  keyword: string;
  volume: number;
  modifier_group: string | null;
  created_at: string;
}

export interface KeywordWithTags extends Keyword {
  tags: Record<string, string>;
}

export interface SerpResult {
  id: number;
  keyword_id: number;
  domain_id: number;
  domain: string;
  rank_group: number;
  rank_absolute: number;
  page: number;
  result_type: string;
  title: string | null;
  description: string | null;
  url: string;
  created_at: string;
}

export interface KeywordWithSerp extends KeywordWithTags {
  serp_results: SerpResult[];
}

export interface KeywordListResponse {
  items: KeywordWithTags[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// =============================================================================
// Category Types
// =============================================================================

export interface Category {
  id: number;
  name: string;
  display_name: string;
}

export interface CategoryWithValues extends Category {
  values: string[];
  keyword_count: number;
}

// =============================================================================
// Dashboard Types
// =============================================================================

export interface BrandProtectionKPIs {
  total_branded_keywords: number;
  total_branded_volume: number;
  keywords_winning: number;
  keywords_losing: number;
  volume_winning: number;
  volume_losing: number;
  win_rate_keywords: number;
  win_rate_volume: number;
}

export interface BrandProtectionWin {
  keyword: string;
  volume: number;
  rank_absolute: number;
  url: string;
  tags: Record<string, string>;
}

export interface BrandProtectionLoss {
  keyword: string;
  volume: number;
  winner_domain: string;
  winner_position: number;
  winner_url: string;
  brand_position: number | null;
  brand_url: string | null;
  modifier_group: string | null;
  tags: Record<string, string>;
}

export interface CompetitorStats {
  domain: string;
  domain_type?: string;
  wins_count: number;
  wins_volume: number;
  avg_position: number;
  keywords?: string[];
}

export interface CategoryLossStats {
  category: string;
  display_name: string;
  loss_count: number;
  loss_volume: number;
  percentage_of_losses: number;
  example_keywords: string[];
}

export interface CategoryValueLossStats {
  value: string;
  loss_count: number;
  loss_volume: number;
  percentage_of_category: number;
}

export interface DomainTypeLossStats {
  domain_type: string;
  loss_count: number;
  loss_volume: number;
  percentage_of_losses: number;
}

export interface InfluentialDomain {
  domain: string;
  domain_type: string;
  ranking_count: number;
  ranking_volume: number;
  avg_position: number;
  win_count: number;
}

export interface ModifierGroupStats {
  modifier_group: string;
  total_keywords: number;
  total_volume: number;
  keywords_winning: number;
  keywords_losing: number;
  volume_winning: number;
  volume_losing: number;
  avg_brand_position: number | null;
  win_rate: number;
  top_tags: Record<string, number>;
  example_keywords: string[];
}

export interface BrandProtectionDashboard {
  brand_name: string;
  brand_domains: string[];
  kpis: BrandProtectionKPIs;
  wins: BrandProtectionWin[];
  losses: BrandProtectionLoss[];
  top_competitors: CompetitorStats[];
  losses_by_category: CategoryLossStats[];
  losses_by_domain_type: DomainTypeLossStats[];
  influential_voices: InfluentialDomain[];
}

// =============================================================================
// Brand Protection Explorer Types
// =============================================================================

export interface ExampleWinnerKeyword {
  keyword: string;
  volume: number;
  url: string;
}

export interface ExampleLoserKeyword {
  keyword: string;
  volume: number;
  winner_domain: string;
  winner_position: number;
}

export interface CategoryValueProtectionStats {
  value: string;
  total_keywords: number;
  total_volume: number;
  keywords_winning: number;
  keywords_losing: number;
  volume_winning: number;
  volume_losing: number;
  win_rate: number;
  avg_brand_position: number | null;
  example_winners: ExampleWinnerKeyword[];
  example_losers: ExampleLoserKeyword[];
}

export interface CategoryCompetitor {
  domain: string;
  domain_type: string;
  wins_count: number;
  wins_volume: number;
  avg_position: number;
}

export interface DomainTypeLossDetail {
  domain_type: string;
  loss_count: number;
  loss_volume: number;
  percentage: number;
}

export interface CategoryProtectionBreakdown {
  category_name: string;
  display_name: string;
  total_keywords: number;
  total_volume: number;
  keywords_winning: number;
  keywords_losing: number;
  volume_winning: number;
  volume_losing: number;
  win_rate: number;
  avg_brand_position: number | null;
  top_values: CategoryValueProtectionStats[];
  competitors_by_type: Record<string, CategoryCompetitor[]>;
  loss_distribution_by_type: DomainTypeLossDetail[];
}

export interface TagProtectionStats {
  tag: string;
  count: number;
  win_rate: number;
}

export interface ModifierGroupProtectionBreakdown {
  modifier_group: string;
  total_keywords: number;
  total_volume: number;
  keywords_winning: number;
  keywords_losing: number;
  volume_winning: number;
  volume_losing: number;
  win_rate: number;
  avg_brand_position: number | null;
  top_tags: TagProtectionStats[];
  competitors_by_type: Record<string, CategoryCompetitor[]>;
  loss_distribution_by_type: DomainTypeLossDetail[];
  example_winners: ExampleWinnerKeyword[];
  example_losers: ExampleLoserKeyword[];
}

// =============================================================================
// API Response Types
// =============================================================================

export interface HealthResponse {
  status: string;
  database: string;
  version: string;
}

export interface ApiError {
  detail: string;
}

// =============================================================================
// Market Overview Types
// =============================================================================

export interface ShareOfSearchItem {
  brand_name: string;
  total_volume: number;
  keyword_count: number;
  share_percentage: number;
  primary_domain?: string | null;
  domain_visibility?: number | null;
  domain_win_count?: number | null;
  domain_avg_position?: number | null;
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
  total_market_keywords: number;
  total_market_volume: number;
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
  percentage_of_losses: number;
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
  top_brand_domain?: string | null;
  top_brand_visibility?: number | null;
  top_retailer_domain?: string | null;
  top_retailer_visibility?: number | null;
  top_ugc_domain?: string | null;
  top_ugc_visibility?: number | null;
  top_3rd_party_domain?: string | null;
  top_3rd_party_visibility?: number | null;
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

// =============================================================================
// Category Opportunities Types
// =============================================================================

export interface OpportunityCompetitor {
  domain: string;
  domain_type: string;
  wins_count: number;
  wins_volume: number;
  avg_position: number;
}

export interface ModifierGroupOpportunity {
  modifier_group: string;
  total_keywords: number;
  total_volume: number;
  keywords_captured: number;
  volume_captured: number;
  keywords_uncaptured: number;
  volume_uncaptured: number;
  capture_rate: number;
  avg_brand_position: number | null;
  top_competitors: OpportunityCompetitor[];
  top_tags: Record<string, number>;
  example_keywords: string[];
}

export interface CategoryOpportunityKPIs {
  total_nonbranded_keywords: number;
  total_nonbranded_volume: number;
  keywords_captured: number;
  volume_captured: number;
  keywords_uncaptured: number;
  volume_uncaptured: number;
  overall_capture_rate: number;
  volume_capture_rate: number;
  biggest_opportunity_group: string | null;
  biggest_opportunity_volume: number;
}

export interface CategoryOpportunityDashboard {
  brand_name: string;
  brand_domains: string[];
  kpis: CategoryOpportunityKPIs;
  modifier_groups: ModifierGroupOpportunity[];
}

// =============================================================================
// Enhanced Opportunity Breakdown Types
// =============================================================================

export interface OpportunityKeywordDetail {
  keyword: string;
  volume: number;
  winner_domain: string | null;
  winner_position: number | null;
  brand_position: number | null;
  winner_domain_type: string | null;
}

export interface OpportunityCategoryValue {
  category_name: string;
  value: string;
  total_keywords: number;
  total_volume: number;
  keywords_captured: number;
  volume_captured: number;
  capture_rate: number;
  top_keywords: OpportunityKeywordDetail[];
}

export interface ModifierGroupOpportunityBreakdown {
  modifier_group: string;
  total_keywords: number;
  total_volume: number;
  keywords_captured: number;
  volume_captured: number;
  capture_rate: number;
  avg_brand_position: number | null;
  top_values: OpportunityCategoryValue[];
  competitors_by_type: Record<string, OpportunityCompetitor[]>;
  example_keywords: OpportunityKeywordDetail[];
}

export interface CompetitorBrandedDashboard {
  brand_name: string;
  brand_domains: string[];
  competitor_brands: string[];
  kpis: CategoryOpportunityKPIs;
  modifier_groups: ModifierGroupOpportunity[];
}
