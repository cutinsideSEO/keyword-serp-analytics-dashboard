/**
 * API endpoint functions.
 */

import apiClient from './client';
import type {
  BrandListResponse,
  BrandWithDomains,
  BrandProtectionDashboard,
  BrandProtectionKPIs,
  BrandProtectionWin,
  BrandProtectionLoss,
  CompetitorStats,
  CategoryLossStats,
  CategoryValueLossStats,
  CategoryProtectionBreakdown,
  ModifierGroupStats,
  ModifierGroupProtectionBreakdown,
  KeywordListResponse,
  KeywordWithSerp,
  CategoryWithValues,
  HealthResponse,
  // Market Overview types
  MarketOverviewDashboard,
  ShareOfSearchItem,
  DomainVisibilityItem,
  MarketProtectionKPIs,
  MarketLossDistribution,
  BrandLossItem,
  CategoryMarketStats,
  CategoryBreakdown,
  ModifierGroupMarketStats,
  ModifierGroupBreakdown,
  // Category Opportunities types
  CategoryOpportunityDashboard,
} from '../types';

// =============================================================================
// Health
// =============================================================================

export async function getHealth(): Promise<HealthResponse> {
  const response = await apiClient.get<HealthResponse>('/health');
  return response.data;
}

// =============================================================================
// Brands
// =============================================================================

export async function getBrands(
  minKeywords = 1,
  minVolume = 0
): Promise<BrandListResponse> {
  const response = await apiClient.get<BrandListResponse>('/brands', {
    params: { min_keywords: minKeywords, min_volume: minVolume },
  });
  return response.data;
}

export async function getBrand(brandName: string): Promise<BrandWithDomains> {
  const response = await apiClient.get<BrandWithDomains>(
    `/brands/${encodeURIComponent(brandName)}`
  );
  return response.data;
}

export async function updateBrandDomains(
  brandName: string,
  domains: Array<{ domain: string; is_primary: boolean }>
): Promise<BrandWithDomains> {
  const response = await apiClient.put<BrandWithDomains>(
    `/brands/${encodeURIComponent(brandName)}/domains`,
    { domains }
  );
  return response.data;
}

export async function autoMapBrandDomains(
  brandName: string,
  useAi = true
): Promise<BrandWithDomains> {
  const response = await apiClient.post<BrandWithDomains>(
    `/brands/${encodeURIComponent(brandName)}/auto-map`,
    null,
    { params: { use_ai: useAi } }
  );
  return response.data;
}

// =============================================================================
// Dashboard
// =============================================================================

export async function getBrandProtectionDashboard(
  brand: string
): Promise<BrandProtectionDashboard> {
  const response = await apiClient.get<BrandProtectionDashboard>(
    '/dashboard/brand-protection',
    { params: { brand } }
  );
  return response.data;
}

export async function getBrandProtectionKPIs(
  brand: string
): Promise<BrandProtectionKPIs> {
  const response = await apiClient.get<BrandProtectionKPIs>(
    '/dashboard/brand-protection/kpis',
    { params: { brand } }
  );
  return response.data;
}

export async function getBrandProtectionWins(
  brand: string,
  limit = 100,
  offset = 0
): Promise<BrandProtectionWin[]> {
  const response = await apiClient.get<BrandProtectionWin[]>(
    '/dashboard/brand-protection/wins',
    { params: { brand, limit, offset } }
  );
  return response.data;
}

export async function getBrandProtectionLosses(
  brand: string,
  limit = 100,
  offset = 0
): Promise<BrandProtectionLoss[]> {
  const response = await apiClient.get<BrandProtectionLoss[]>(
    '/dashboard/brand-protection/losses',
    { params: { brand, limit, offset } }
  );
  return response.data;
}

export async function getTopCompetitors(
  brand: string,
  limit = 10
): Promise<CompetitorStats[]> {
  const response = await apiClient.get<CompetitorStats[]>(
    '/dashboard/brand-protection/competitors',
    { params: { brand, limit } }
  );
  return response.data;
}

export async function getLossCategories(
  brand: string,
  limit = 20
): Promise<CategoryLossStats[]> {
  const response = await apiClient.get<CategoryLossStats[]>(
    '/dashboard/brand-protection/categories',
    { params: { brand, limit } }
  );
  return response.data;
}

export async function getCategoryValueLosses(
  brand: string,
  category: string,
  limit = 20
): Promise<CategoryValueLossStats[]> {
  const response = await apiClient.get<CategoryValueLossStats[]>(
    `/dashboard/brand-protection/categories/${encodeURIComponent(category)}/values`,
    { params: { brand, limit } }
  );
  return response.data;
}

export async function getModifierGroupStats(
  brand: string
): Promise<ModifierGroupStats[]> {
  const response = await apiClient.get<ModifierGroupStats[]>(
    '/dashboard/brand-protection/modifier-groups',
    { params: { brand } }
  );
  return response.data;
}

export async function getCategoryProtectionBreakdown(
  brand: string,
  category: string,
  valueLimit = 10
): Promise<CategoryProtectionBreakdown> {
  const response = await apiClient.get<CategoryProtectionBreakdown>(
    `/dashboard/brand-protection/categories/${encodeURIComponent(category)}/breakdown`,
    { params: { brand, value_limit: valueLimit } }
  );
  return response.data;
}

export async function getModifierGroupProtectionBreakdown(
  brand: string,
  modifierGroup: string,
  limit = 10
): Promise<ModifierGroupProtectionBreakdown> {
  const response = await apiClient.get<ModifierGroupProtectionBreakdown>(
    `/dashboard/brand-protection/modifier-groups/${encodeURIComponent(modifierGroup)}/breakdown`,
    { params: { brand, limit } }
  );
  return response.data;
}

// =============================================================================
// Keywords
// =============================================================================

export interface KeywordFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  categoryValue?: string;
  minVolume?: number;
  maxVolume?: number;
  modifierGroup?: string;
}

export async function getKeywords(
  filters: KeywordFilters = {}
): Promise<KeywordListResponse> {
  const response = await apiClient.get<KeywordListResponse>('/keywords', {
    params: {
      page: filters.page || 1,
      page_size: filters.pageSize || 50,
      search: filters.search,
      category: filters.category,
      category_value: filters.categoryValue,
      min_volume: filters.minVolume,
      max_volume: filters.maxVolume,
      modifier_group: filters.modifierGroup,
    },
  });
  return response.data;
}

export async function getKeyword(keywordId: number): Promise<KeywordWithSerp> {
  const response = await apiClient.get<KeywordWithSerp>(`/keywords/${keywordId}`);
  return response.data;
}

export async function getCategories(): Promise<CategoryWithValues[]> {
  const response = await apiClient.get<CategoryWithValues[]>('/keywords/categories');
  return response.data;
}

// =============================================================================
// Market Overview
// =============================================================================

export async function getMarketOverviewDashboard(): Promise<MarketOverviewDashboard> {
  const response = await apiClient.get<MarketOverviewDashboard>(
    '/dashboard/market-overview'
  );
  return response.data;
}

export async function getShareOfSearch(limit = 20): Promise<ShareOfSearchItem[]> {
  const response = await apiClient.get<ShareOfSearchItem[]>(
    '/dashboard/market-overview/share-of-search',
    { params: { limit } }
  );
  return response.data;
}

export async function getTopRetailers(limit = 10): Promise<DomainVisibilityItem[]> {
  const response = await apiClient.get<DomainVisibilityItem[]>(
    '/dashboard/market-overview/retailers',
    { params: { limit } }
  );
  return response.data;
}

export async function getInfluentialVoices(limit = 10): Promise<DomainVisibilityItem[]> {
  const response = await apiClient.get<DomainVisibilityItem[]>(
    '/dashboard/market-overview/influential-voices',
    { params: { limit } }
  );
  return response.data;
}

export async function getMarketProtectionKPIs(): Promise<MarketProtectionKPIs> {
  const response = await apiClient.get<MarketProtectionKPIs>(
    '/dashboard/market-overview/protection-kpis'
  );
  return response.data;
}

export async function getMarketLossDistribution(): Promise<MarketLossDistribution[]> {
  const response = await apiClient.get<MarketLossDistribution[]>(
    '/dashboard/market-overview/loss-distribution'
  );
  return response.data;
}

export async function getBiggestLosers(limit = 20): Promise<BrandLossItem[]> {
  const response = await apiClient.get<BrandLossItem[]>(
    '/dashboard/market-overview/biggest-losers',
    { params: { limit } }
  );
  return response.data;
}

export async function getCategoryMarketStats(): Promise<CategoryMarketStats[]> {
  const response = await apiClient.get<CategoryMarketStats[]>(
    '/dashboard/market-overview/categories'
  );
  return response.data;
}

export async function getCategoryMarketBreakdown(
  categoryName: string,
  valueLimit = 10
): Promise<CategoryBreakdown> {
  const response = await apiClient.get<CategoryBreakdown>(
    `/dashboard/market-overview/categories/${encodeURIComponent(categoryName)}`,
    { params: { value_limit: valueLimit } }
  );
  return response.data;
}

export async function getModifierGroupMarketStats(): Promise<ModifierGroupMarketStats[]> {
  const response = await apiClient.get<ModifierGroupMarketStats[]>(
    '/dashboard/market-overview/modifier-groups'
  );
  return response.data;
}

export async function getModifierGroupMarketBreakdown(
  modifierGroup: string,
  limit = 10
): Promise<ModifierGroupBreakdown> {
  const response = await apiClient.get<ModifierGroupBreakdown>(
    `/dashboard/market-overview/modifier-groups/${encodeURIComponent(modifierGroup)}`,
    { params: { limit } }
  );
  return response.data;
}

// =============================================================================
// Category Opportunities
// =============================================================================

export async function getCategoryOpportunities(
  brand: string
): Promise<CategoryOpportunityDashboard> {
  const response = await apiClient.get<CategoryOpportunityDashboard>(
    '/dashboard/category-opportunities',
    { params: { brand } }
  );
  return response.data;
}
