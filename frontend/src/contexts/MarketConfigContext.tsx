/**
 * Market Configuration Context
 *
 * Provides market configuration (domain types, styling) to all components.
 * Supports multiple markets with market selection.
 * Fetches config from backend API on app startup and when market changes.
 */

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  MarketConfig,
  DomainTypeConfig,
  DEFAULT_MARKET_CONFIG,
  buildTremorColorMap,
  buildHexColorMap,
  buildGradientMap,
  buildStylesMap,
  getDomainTypeIcon,
} from '../config/domainTypes';
import { LucideIcon } from 'lucide-react';

const STORAGE_KEY = 'selectedMarketId';

// Market summary from /api/markets
interface MarketSummary {
  id: string;
  name: string;
  language: string;
  text_direction: string;
  is_active: boolean;
}

// Snake_case format matching API response (for components that expect raw API format)
interface MarketConfigAPI {
  market_id: string;
  market_name: string;
  industry_context: string;
  language: string;
  text_direction: string;
  domain_types: Array<{
    id: string;
    display_name: string;
    tremor_color: string;
    hex_color: string;
    gradient: string;
    bg_class: string;
    text_class: string;
    border_class: string;
    icon: string;
    is_brand_type: boolean;
  }>;
  brand_category_names: string[];
}

interface MarketConfigContextValue {
  config: MarketConfig;
  domainTypes: DomainTypeConfig[];
  isLoading: boolean;
  loading: boolean; // Alias for isLoading
  error: string | null;

  // Multi-market support
  currentMarketId: string;
  availableMarkets: MarketSummary[];
  setCurrentMarket: (marketId: string) => void;

  // Raw API format for components expecting snake_case
  marketConfig: MarketConfigAPI | null;

  // Brand category names for filtering branded modifier groups
  brandCategoryNames: string[];

  // Helper functions for easy access
  getTremorColor: (typeName: string) => string;
  getHexColor: (typeName: string) => string;
  getGradient: (typeName: string) => string;
  getStyles: (typeName: string) => {
    gradient: string;
    bgColor: string;
    textColor: string;
    borderColor: string;
    icon: LucideIcon;
  };
  getIcon: (typeName: string) => LucideIcon;
  getDomainTypeNames: () => string[];
  tremorColorMap: Record<string, string>;
  hexColorMap: Record<string, string>;
  gradientMap: Record<string, string>;
}

const MarketConfigContext = createContext<MarketConfigContextValue | null>(null);

interface MarketConfigProviderProps {
  children: ReactNode;
}

export function MarketConfigProvider({ children }: MarketConfigProviderProps) {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<MarketConfig>(DEFAULT_MARKET_CONFIG);
  const [marketConfigAPI, setMarketConfigAPI] = useState<MarketConfigAPI | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Multi-market state
  const [availableMarkets, setAvailableMarkets] = useState<MarketSummary[]>([]);
  const [currentMarketId, setCurrentMarketId] = useState<string>(() => {
    // Try to load from localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored || 'insurance_il'; // Default market
  });

  // Pre-computed maps for efficient lookups
  const [tremorColorMap, setTremorColorMap] = useState<Record<string, string>>({});
  const [hexColorMap, setHexColorMap] = useState<Record<string, string>>({});
  const [gradientMap, setGradientMap] = useState<Record<string, string>>({});
  const [stylesMap, setStylesMap] = useState<Record<string, {
    gradient: string;
    bgColor: string;
    textColor: string;
    borderColor: string;
    icon: LucideIcon;
  }>>({});

  // Fetch available markets on mount
  useEffect(() => {
    async function fetchMarkets() {
      try {
        const response = await fetch('/api/markets');
        if (response.ok) {
          const data = await response.json();
          setAvailableMarkets(data.markets || []);
        }
      } catch (err) {
        console.error('Failed to fetch markets:', err);
      }
    }
    fetchMarkets();
  }, []);

  // Fetch config when market changes
  const fetchConfig = useCallback(async (marketId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/markets/${marketId}/config`);
      if (!response.ok) {
        throw new Error(`Failed to fetch config: ${response.statusText}`);
      }
      const data = await response.json();

      // Store raw API response for components expecting snake_case
      setMarketConfigAPI(data);

      // Transform API response to match our types
      const marketConfig: MarketConfig = {
        marketId: data.market_id,
        marketName: data.market_name,
        industryContext: data.industry_context,
        language: data.language,
        textDirection: data.text_direction,
        domainTypes: data.domain_types.map((dt: Record<string, string>) => ({
          id: dt.id,
          displayName: dt.display_name,
          tremorColor: dt.tremor_color,
          hexColor: dt.hex_color,
          gradient: dt.gradient,
          bgClass: dt.bg_class,
          textClass: dt.text_class,
          borderClass: dt.border_class,
          icon: dt.icon,
        })),
        brandCategoryNames: data.brand_category_names || [],
      };

      setConfig(marketConfig);

      // Build lookup maps
      setTremorColorMap(buildTremorColorMap(marketConfig.domainTypes));
      setHexColorMap(buildHexColorMap(marketConfig.domainTypes));
      setGradientMap(buildGradientMap(marketConfig.domainTypes));
      setStylesMap(buildStylesMap(marketConfig.domainTypes));

      setError(null);
    } catch (err) {
      console.error('Failed to load market config, using defaults:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');

      // Use defaults
      setTremorColorMap(buildTremorColorMap(DEFAULT_MARKET_CONFIG.domainTypes));
      setHexColorMap(buildHexColorMap(DEFAULT_MARKET_CONFIG.domainTypes));
      setGradientMap(buildGradientMap(DEFAULT_MARKET_CONFIG.domainTypes));
      setStylesMap(buildStylesMap(DEFAULT_MARKET_CONFIG.domainTypes));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch config on mount and when market changes
  useEffect(() => {
    fetchConfig(currentMarketId);
  }, [currentMarketId, fetchConfig]);

  // Function to change market
  const setCurrentMarket = useCallback((marketId: string) => {
    localStorage.setItem(STORAGE_KEY, marketId);
    setCurrentMarketId(marketId);
    // Invalidate all cached queries so pages refetch with the new market
    queryClient.invalidateQueries();
    // Config will be refetched via the useEffect
  }, [queryClient]);

  const value: MarketConfigContextValue = {
    config,
    domainTypes: config.domainTypes,
    isLoading,
    loading: isLoading, // Alias for isLoading
    error,

    // Multi-market support
    currentMarketId,
    availableMarkets,
    setCurrentMarket,

    marketConfig: marketConfigAPI,

    // Brand category names for filtering branded modifier groups
    brandCategoryNames: config.brandCategoryNames || [],

    getTremorColor: (typeName: string) => tremorColorMap[typeName] || 'gray',
    getHexColor: (typeName: string) => hexColorMap[typeName] || '#6B7280',
    getGradient: (typeName: string) =>
      gradientMap[typeName] || 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)',
    getStyles: (typeName: string) =>
      stylesMap[typeName] || {
        gradient: 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)',
        bgColor: 'bg-gray-50',
        textColor: 'text-gray-700',
        borderColor: 'border-gray-200',
        icon: getDomainTypeIcon('Unknown'),
      },
    getIcon: (typeName: string) => {
      const dt = config.domainTypes.find(
        (d) => d.displayName === typeName || d.id === typeName
      );
      return getDomainTypeIcon(dt?.icon || 'Unknown');
    },
    getDomainTypeNames: () => config.domainTypes.map((dt) => dt.displayName),
    tremorColorMap,
    hexColorMap,
    gradientMap,
  };

  return (
    <MarketConfigContext.Provider value={value}>
      {children}
    </MarketConfigContext.Provider>
  );
}

export function useMarketConfig(): MarketConfigContextValue {
  const context = useContext(MarketConfigContext);
  if (!context) {
    throw new Error('useMarketConfig must be used within a MarketConfigProvider');
  }
  return context;
}

export default MarketConfigContext;
