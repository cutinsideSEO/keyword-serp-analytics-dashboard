/**
 * Market Overview Dashboard page (ANALYZE section).
 * Redesigned with cleaner layout and drawer-based drill-downs.
 */

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart3, TrendingUp, Layers, Tag, Users } from 'lucide-react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorDisplay } from '../components/common/ErrorBoundary';
import { ShareOfSearchChart } from '../components/dashboard/ShareOfSearchChart';
import { DomainVisibilitySection } from '../components/dashboard/DomainVisibilitySection';
import { MarketProtectionSnapshot } from '../components/dashboard/MarketProtectionSnapshot';
import { BiggestLosersTable } from '../components/dashboard/BiggestLosersTable';
import { DataExplorer } from '../components/dashboard/DataExplorer';
import { CategoryDetailDrawer } from '../components/dashboard/CategoryDetailDrawer';
import { ModifierGroupDrawer } from '../components/dashboard/ModifierGroupDrawer';
import { getMarketOverviewDashboard } from '../api/endpoints';
import { useMarketConfig } from '../contexts/MarketConfigContext';
import type { MarketOverviewDashboard, CategoryMarketStats, ModifierGroupMarketStats } from '../types';

export function MarketOverview() {
  const { marketConfig, currentMarketId } = useMarketConfig();
  const queryClient = useQueryClient();

  const { data, isLoading: loading, error: queryError } = useQuery<MarketOverviewDashboard>({
    queryKey: ['market-overview', currentMarketId],
    queryFn: getMarketOverviewDashboard,
  });

  const error = queryError ? queryError.message : null;

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

  const refetch = () => queryClient.invalidateQueries({ queryKey: ['market-overview', currentMarketId] });

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
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <span className="font-medium text-gray-900">{item.display_name}</span>
        </div>
      ),
    },
    {
      key: 'total_keywords',
      header: 'Total',
      align: 'right' as const,
      render: (item: CategoryMarketStats) => (
        <div className="space-y-0.5">
          <div className="font-medium text-gray-900">{item.total_keywords.toLocaleString()}</div>
          <div className="text-xs text-gray-500">{formatVolume(item.total_volume)} vol</div>
        </div>
      ),
    },
    {
      key: 'unique_values',
      header: 'Values',
      align: 'right' as const,
      render: (item: CategoryMarketStats) => (
        <span className="font-medium text-emerald-600">{item.unique_values}</span>
      ),
    },
  ];

  // Modifier group table columns
  const modifierColumns = [
    {
      key: 'modifier_group',
      header: 'Modifier Group',
      render: (item: ModifierGroupMarketStats) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-purple-100 flex items-center justify-center flex-shrink-0">
            <Tag className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <span className="font-medium text-gray-900">{item.modifier_group}</span>
        </div>
      ),
    },
    {
      key: 'total_keywords',
      header: 'Total',
      align: 'right' as const,
      render: (item: ModifierGroupMarketStats) => (
        <div className="space-y-0.5">
          <div className="font-medium text-gray-900">{item.total_keywords.toLocaleString()}</div>
          <div className="text-xs text-gray-500">{formatVolume(item.total_volume)} vol</div>
        </div>
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
          <h1 className="text-3xl font-semibold text-gray-900 mb-1">
            Analyze
          </h1>
          <p className="text-sm text-muted-foreground">Loading market intelligence...</p>
        </div>
        <LoadingSpinner size="lg" message="Loading market data..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 mb-1">
            Analyze
          </h1>
          <p className="text-sm text-muted-foreground">Market intelligence and analytics</p>
        </div>
        <ErrorDisplay error={queryError} message={error ?? undefined} onRetry={refetch} />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 mb-1">
            Analyze
          </h1>
          <p className="text-sm text-muted-foreground">
            Market intelligence across {data.protection_kpis?.total_brands ?? 0} brands
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Market Size</div>
              <div className="text-xl font-semibold text-gray-900">
                {formatVolume(data.protection_kpis?.total_market_volume ?? 0)} volume
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share of Search Section */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-emerald-600" />
          Share of Search
        </h2>
        <ShareOfSearchChart data={data.share_of_search ?? []} topN={10} />
      </section>

      {/* Top Players by Domain Type */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
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

        <div className={`grid grid-cols-1 ${nonBrandDomainTypes.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-6`}>
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
        </div>
      </section>

      {/* Brand Protection Health */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Market Brand Protection</h2>
        <MarketProtectionSnapshot
          kpis={data.protection_kpis ?? {}}
          lossDistribution={data.loss_distribution ?? []}
        />
      </section>

      {/* Biggest Losers */}
      <section>
        <BiggestLosersTable data={data.biggest_losers ?? []} limit={10} />
      </section>

      {/* Category Insights - DataExplorer with drawer */}
      <DataExplorer
        title="Category Insights"
        description={`${data.category_stats?.length ?? 0} categories - click any row to explore`}
        tooltipInfo={{
          title: 'Category Insights',
          description:
            'See keyword distribution across categories. Click any row to see detailed values, volume breakdown, and top players.',
        }}
        icon={<Layers className="h-5 w-5 text-emerald-600" />}
        iconBgClass="bg-emerald-100"
        data={data.category_stats ?? []}
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
        description={`${data.modifier_group_stats?.length ?? 0} groups - click any row to explore`}
        tooltipInfo={{
          title: 'Modifier Group Analysis',
          description:
            'Modifier groups represent keyword intent patterns. Click any row to see detailed tags and top players.',
        }}
        icon={<Tag className="h-5 w-5 text-purple-600" />}
        iconBgClass="bg-purple-100"
        data={data.modifier_group_stats ?? []}
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
      <CategoryDetailDrawer
        isOpen={categoryDrawer.isOpen}
        onClose={() => setCategoryDrawer({ isOpen: false, category: '', displayName: '' })}
        categoryName={categoryDrawer.category}
        displayName={categoryDrawer.displayName}
        context="market"
      />

      {/* Modifier Drawer */}
      <ModifierGroupDrawer
        isOpen={modifierDrawer.isOpen}
        onClose={() => setModifierDrawer({ isOpen: false, modifierGroup: '' })}
        modifierGroup={modifierDrawer.modifierGroup}
        context="market"
      />
    </div>
  );
}

export default MarketOverview;
