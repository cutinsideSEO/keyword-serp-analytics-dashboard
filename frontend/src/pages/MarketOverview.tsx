/**
 * Market Overview Dashboard page (ANALYZE section).
 * Redesigned with cleaner layout and drawer-based drill-downs.
 */

import { useEffect, useState, useMemo } from 'react';
import { Grid, Col } from '@tremor/react';
import { BarChart3, TrendingUp, Layers, Tag, Users } from 'lucide-react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorDisplay } from '../components/common/ErrorBoundary';
import { ShareOfSearchChart } from '../components/dashboard/ShareOfSearchChart';
import { DomainVisibilitySection } from '../components/dashboard/DomainVisibilitySection';
import { MarketProtectionSnapshot } from '../components/dashboard/MarketProtectionSnapshot';
import { BiggestLosersTable } from '../components/dashboard/BiggestLosersTable';
import { DataExplorer } from '../components/dashboard/DataExplorer';
import { MarketCategoryDrawer } from '../components/dashboard/MarketCategoryDrawer';
import { MarketModifierDrawer } from '../components/dashboard/MarketModifierDrawer';
import { getMarketOverviewDashboard } from '../api/endpoints';
import { useMarketConfig } from '../contexts/MarketConfigContext';
import type { MarketOverviewDashboard, CategoryMarketStats, ModifierGroupMarketStats } from '../types';

export function MarketOverview() {
  const [data, setData] = useState<MarketOverviewDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { marketConfig } = useMarketConfig();

  // Drawer state
  const [categoryDrawer, setCategoryDrawer] = useState<{
    isOpen: boolean;
    category: string;
    displayName: string;
  }>({ isOpen: false, category: '', displayName: '' });

  const [modifierDrawer, setModifierDrawer] = useState<{
    isOpen: boolean;
    modifierGroup: string;
  }>({ isOpen: false, modifierGroup: '' });

  // Get all non-brand domain types for dynamic section display
  const nonBrandDomainTypes = useMemo(() => {
    if (!marketConfig?.domain_types) return [];
    return marketConfig.domain_types
      .filter((dt) => !dt.is_brand_type)
      .map((dt) => dt.display_name);
  }, [marketConfig]);

  // Combine all visibility data
  const allTopPlayers = useMemo(() => {
    if (!data) return [];
    const combined = [...(data.top_retailers || []), ...(data.influential_voices || [])];
    const seen = new Set<string>();
    return combined
      .filter((item) => {
        if (seen.has(item.domain)) return false;
        seen.add(item.domain);
        return true;
      })
      .sort((a, b) => b.visibility_score - a.visibility_score);
  }, [data]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const dashboardData = await getMarketOverviewDashboard();
      setData(dashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const formatVolume = (vol: number) => {
    if (vol >= 1000000) return `${(vol / 1000000).toFixed(1)}M`;
    if (vol >= 1000) return `${(vol / 1000).toFixed(0)}K`;
    return vol.toString();
  };

  // Category table columns
  const categoryColumns = [
    {
      key: 'display_name',
      header: 'Category',
      render: (item: CategoryMarketStats) => (
        <span className="font-medium text-gray-900">{item.display_name}</span>
      ),
    },
    {
      key: 'unique_values',
      header: 'Values',
      align: 'right' as const,
      render: (item: CategoryMarketStats) => (
        <span className="text-gray-600">{item.unique_values}</span>
      ),
    },
    {
      key: 'total_keywords',
      header: 'Keywords',
      align: 'right' as const,
      render: (item: CategoryMarketStats) => (
        <span className="text-gray-600">{item.total_keywords.toLocaleString()}</span>
      ),
    },
    {
      key: 'total_volume',
      header: 'Volume',
      align: 'right' as const,
      render: (item: CategoryMarketStats) => (
        <span className="font-medium text-emerald-600">{formatVolume(item.total_volume)}</span>
      ),
    },
  ];

  // Modifier group table columns
  const modifierColumns = [
    {
      key: 'modifier_group',
      header: 'Modifier Group',
      render: (item: ModifierGroupMarketStats) => (
        <span className="font-medium text-gray-900">{item.modifier_group}</span>
      ),
    },
    {
      key: 'total_keywords',
      header: 'Keywords',
      align: 'right' as const,
      render: (item: ModifierGroupMarketStats) => (
        <span className="text-gray-600">{item.total_keywords.toLocaleString()}</span>
      ),
    },
    {
      key: 'total_volume',
      header: 'Volume',
      align: 'right' as const,
      render: (item: ModifierGroupMarketStats) => (
        <span className="font-medium text-purple-600">{formatVolume(item.total_volume)}</span>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-500 mb-1">
            Analyze
          </h1>
          <p className="text-gray-600">Loading market intelligence...</p>
        </div>
        <LoadingSpinner size="lg" message="Loading market data..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-500 mb-1">
            Analyze
          </h1>
          <p className="text-gray-600">Market intelligence and analytics</p>
        </div>
        <ErrorDisplay message={error} onRetry={loadDashboard} />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-500 mb-1">
            Analyze
          </h1>
          <p className="text-gray-600">
            Market intelligence across {data.protection_kpis.total_brands} brands
          </p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl shadow-lg border border-emerald-200 p-5">
          <div className="flex items-center space-x-3">
            <BarChart3 className="h-8 w-8 text-emerald-600" />
            <div>
              <div className="text-xs text-gray-600">Market Size</div>
              <div className="text-xl font-bold text-emerald-700">
                {formatVolume(data.protection_kpis.total_market_volume)} volume
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share of Search Section */}
      <section>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-emerald-600" />
          Share of Search
        </h2>
        <ShareOfSearchChart data={data.share_of_search} topN={10} />
      </section>

      {/* Top Players by Domain Type */}
      <section>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-emerald-600" />
          Strongest Market Players
        </h2>

        <div className="mb-6">
          <DomainVisibilitySection
            title="Overall Top Players"
            subtitle="Highest visibility domains across all types"
            data={allTopPlayers}
            limit={5}
          />
        </div>

        <Grid numItems={1} numItemsMd={nonBrandDomainTypes.length >= 3 ? 3 : 2} className="gap-6">
          {nonBrandDomainTypes.map((domainType) => (
            <DomainVisibilitySection
              key={domainType}
              title={`Top ${domainType}`}
              subtitle={`${domainType} domains with strongest visibility`}
              data={allTopPlayers}
              domainTypes={[domainType]}
              limit={5}
            />
          ))}
        </Grid>
      </section>

      {/* Brand Protection Health */}
      <section>
        <h2 className="text-xl font-bold mb-4">Market Brand Protection</h2>
        <MarketProtectionSnapshot
          kpis={data.protection_kpis}
          lossDistribution={data.loss_distribution}
        />
      </section>

      {/* Biggest Losers */}
      <section>
        <BiggestLosersTable data={data.biggest_losers} limit={10} />
      </section>

      {/* Category Insights - DataExplorer with drawer */}
      <DataExplorer
        title="Category Insights"
        description={`${data.category_stats.length} categories - click any row to explore`}
        tooltipInfo={{
          title: 'Category Insights',
          description:
            'See keyword distribution across categories. Click any row to see detailed values, volume breakdown, and top players.',
        }}
        icon={<Layers className="h-5 w-5 text-emerald-600" />}
        iconBgClass="bg-emerald-100"
        data={data.category_stats}
        columns={categoryColumns}
        getRowKey={(item) => item.category_name}
        onRowClick={(item) =>
          setCategoryDrawer({
            isOpen: true,
            category: item.category_name,
            displayName: item.display_name,
          })
        }
        emptyMessage="No category data available"
        showMoreLabel="categories"
      />

      {/* Modifier Group Analysis - DataExplorer with drawer */}
      <DataExplorer
        title="Modifier Group Analysis"
        description={`${data.modifier_group_stats.length} groups - click any row to explore`}
        tooltipInfo={{
          title: 'Modifier Group Analysis',
          description:
            'Modifier groups represent keyword intent patterns. Click any row to see detailed tags and top players.',
        }}
        icon={<Tag className="h-5 w-5 text-purple-600" />}
        iconBgClass="bg-purple-100"
        data={data.modifier_group_stats}
        columns={modifierColumns}
        getRowKey={(item) => item.modifier_group}
        onRowClick={(item) =>
          setModifierDrawer({
            isOpen: true,
            modifierGroup: item.modifier_group,
          })
        }
        emptyMessage="No modifier group data available"
        showMoreLabel="groups"
      />

      {/* Category Drawer */}
      <MarketCategoryDrawer
        isOpen={categoryDrawer.isOpen}
        onClose={() => setCategoryDrawer({ isOpen: false, category: '', displayName: '' })}
        categoryName={categoryDrawer.category}
        displayName={categoryDrawer.displayName}
      />

      {/* Modifier Drawer */}
      <MarketModifierDrawer
        isOpen={modifierDrawer.isOpen}
        onClose={() => setModifierDrawer({ isOpen: false, modifierGroup: '' })}
        modifierGroup={modifierDrawer.modifierGroup}
      />
    </div>
  );
}

export default MarketOverview;
