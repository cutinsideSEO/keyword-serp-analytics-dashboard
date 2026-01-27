/**
 * Brand Protection Dashboard page (PROTECT section).
 * Redesigned with drawer-based drill-downs and focused KPI cards.
 */

import { useState, useCallback } from 'react';
import { Shield, Layers, Tag, TrendingDown, CheckCircle2, XCircle } from 'lucide-react';
import { BrandPicker } from '../components/common/BrandPicker';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorDisplay } from '../components/common/ErrorBoundary';
import { BrandHealthCard } from '../components/dashboard/BrandHealthCard';
import { OpportunityCard } from '../components/dashboard/OpportunityCard';
import { ThreatCard } from '../components/dashboard/ThreatCard';
import { DataExplorer } from '../components/dashboard/DataExplorer';
import { CategoryDetailDrawer } from '../components/dashboard/CategoryDetailDrawer';
import { ModifierGroupDrawer } from '../components/dashboard/ModifierGroupDrawer';
import { InsightCard } from '../components/dashboard/InsightCard';
import { CompetitorChart } from '../components/dashboard/CompetitorChart';
import { DomainTypesChart } from '../components/dashboard/DomainTypesChart';
import { WinLossTable } from '../components/dashboard/WinLossTable';
import { useApiWithParam } from '../hooks/useApi';
import { usePersistedBrand } from '../hooks/usePersistedBrand';
import { getBrandProtectionDashboard, getModifierGroupStats } from '../api/endpoints';
import { formatCompactNumber, formatNumber } from '../utils/formatters';
import type {
  BrandProtectionDashboard as DashboardData,
  ModifierGroupStats,
  CategoryLossStats,
} from '../types';

export function BrandProtection() {
  const [selectedBrand, setSelectedBrand] = usePersistedBrand();

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

  const fetchDashboard = useCallback(
    (brand: string) => getBrandProtectionDashboard(brand),
    []
  );

  const fetchModifierGroups = useCallback(
    (brand: string) => getModifierGroupStats(brand),
    []
  );

  const { data, loading, error, refetch } = useApiWithParam<DashboardData, string>(
    fetchDashboard,
    selectedBrand
  );

  const { data: modifierGroups, loading: loadingModifierGroups } = useApiWithParam<
    ModifierGroupStats[],
    string
  >(fetchModifierGroups, selectedBrand);

  // Calculate brand health score
  const calculateHealthScore = () => {
    if (!data) return 0;
    const keywordScore = data.kpis.win_rate_keywords;
    const volumeScore = data.kpis.win_rate_volume;
    return Math.round(keywordScore * 0.6 + volumeScore * 0.4);
  };

  // Get top threat
  const getTopThreat = () => {
    if (!data || !data.top_competitors?.length) return null;
    return data.top_competitors[0];
  };

  // Category table columns
  const categoryColumns = [
    {
      key: 'display_name',
      header: 'Category',
      render: (item: CategoryLossStats) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Layers className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <span className="font-medium text-gray-900">{item.display_name}</span>
        </div>
      ),
    },
    {
      key: 'win_rate',
      header: 'Win Rate',
      align: 'right' as const,
      render: (item: CategoryLossStats) => {
        const isGood = item.win_rate >= 80;
        const isMid = item.win_rate >= 50;
        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold ${
              isGood
                ? 'bg-emerald-100 text-emerald-700'
                : isMid
                ? 'bg-amber-100 text-amber-700'
                : 'bg-rose-100 text-rose-700'
            }`}
          >
            {isGood ? (
              <CheckCircle2 className="w-3 h-3" />
            ) : (
              <XCircle className="w-3 h-3" />
            )}
            {item.win_rate.toFixed(0)}%
          </span>
        );
      },
    },
    {
      key: 'total_keywords',
      header: 'Total',
      align: 'right' as const,
      render: (item: CategoryLossStats) => (
        <div className="space-y-0.5">
          <div className="font-medium text-gray-900">
            {formatNumber(item.total_keywords)}
          </div>
          <div className="text-xs text-gray-500">
            {formatCompactNumber(item.total_volume)} vol
          </div>
        </div>
      ),
    },
    {
      key: 'keywords_losing',
      header: 'Lost',
      align: 'right' as const,
      render: (item: CategoryLossStats) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-rose-600">
            {formatNumber(item.keywords_losing)}
          </div>
          <div className="text-xs text-rose-500">
            {formatCompactNumber(item.volume_losing)} vol
          </div>
        </div>
      ),
    },
  ];

  // Modifier group table columns
  const modifierColumns = [
    {
      key: 'modifier_group',
      header: 'Modifier Group',
      render: (item: ModifierGroupStats) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-purple-100 flex items-center justify-center flex-shrink-0">
            <Tag className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <span className="font-medium text-gray-900">{item.modifier_group}</span>
        </div>
      ),
    },
    {
      key: 'win_rate',
      header: 'Win Rate',
      align: 'right' as const,
      render: (item: ModifierGroupStats) => {
        const isGood = item.win_rate >= 80;
        const isMid = item.win_rate >= 50;
        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold ${
              isGood
                ? 'bg-emerald-100 text-emerald-700'
                : isMid
                ? 'bg-amber-100 text-amber-700'
                : 'bg-rose-100 text-rose-700'
            }`}
          >
            {isGood ? (
              <CheckCircle2 className="w-3 h-3" />
            ) : (
              <XCircle className="w-3 h-3" />
            )}
            {item.win_rate.toFixed(0)}%
          </span>
        );
      },
    },
    {
      key: 'total_keywords',
      header: 'Total',
      align: 'right' as const,
      render: (item: ModifierGroupStats) => (
        <div className="space-y-0.5">
          <div className="font-medium text-gray-900">
            {formatNumber(item.total_keywords)}
          </div>
          <div className="text-xs text-gray-500">
            {formatCompactNumber(item.total_volume)} vol
          </div>
        </div>
      ),
    },
    {
      key: 'keywords_losing',
      header: 'Lost',
      align: 'right' as const,
      render: (item: ModifierGroupStats) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-rose-600">
            {formatNumber(item.keywords_losing)}
          </div>
          <div className="text-xs text-rose-500">
            {formatCompactNumber(item.volume_losing)} vol
          </div>
        </div>
      ),
    },
  ];

  const healthScore = calculateHealthScore();
  const topThreat = getTopThreat();

  // Category table footer
  const lossByCategory = data?.losses_by_category ?? [];
  const categoryFooter = lossByCategory.length > 0 ? (
    <div className="flex justify-between text-sm">
      <div className="text-gray-600">
        <span className="font-semibold text-gray-900">{lossByCategory.length}</span> categories
      </div>
      <div className="flex gap-4">
        <div className="text-rose-600 flex items-center gap-1">
          <TrendingDown className="w-3.5 h-3.5" />
          {formatNumber(lossByCategory.reduce((s, c) => s + c.keywords_losing, 0))} lost
        </div>
        <div className="text-rose-600">
          {formatCompactNumber(lossByCategory.reduce((s, c) => s + c.volume_losing, 0))} volume lost
        </div>
      </div>
    </div>
  ) : undefined;

  // Modifier table footer
  const modifierFooter = modifierGroups && modifierGroups.length > 0 ? (
    <div className="flex justify-between text-sm">
      <div className="text-gray-600">
        <span className="font-semibold text-gray-900">{modifierGroups.length}</span> groups
      </div>
      <div className="flex gap-4">
        <div className="text-rose-600 flex items-center gap-1">
          <TrendingDown className="w-3.5 h-3.5" />
          {formatNumber(modifierGroups.reduce((s, m) => s + m.keywords_losing, 0))} lost
        </div>
        <div className="text-rose-600">
          {formatCompactNumber(modifierGroups.reduce((s, m) => s + m.volume_losing, 0))} volume lost
        </div>
      </div>
    </div>
  ) : undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 mb-1">
            Protect
          </h1>
          <p className="text-sm text-muted-foreground">
            Defend your branded keywords and identify competitive threats
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 min-w-[260px]">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Select Brand
          </label>
          <BrandPicker
            value={selectedBrand}
            onChange={setSelectedBrand}
            minKeywords={3}
            minVolume={100}
            placeholder="Choose a brand..."
          />
        </div>
      </div>

      {/* No Brand Selected */}
      {!selectedBrand && (
        <div className="flex h-80 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50">
          <div className="text-center">
            <Shield className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              Select a brand to get started
            </h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-sm">
              Choose a brand from the dropdown above to see brand protection metrics
            </p>
          </div>
        </div>
      )}

      {/* Loading */}
      {selectedBrand && loading && (
        <LoadingSpinner size="lg" message="Loading protection data..." />
      )}

      {/* Error */}
      {selectedBrand && error && (
        <ErrorDisplay error={error} message="Failed to load dashboard" onRetry={refetch} />
      )}

      {/* Dashboard Content */}
      {selectedBrand && data && !loading && (
        <>
          {/* Brand Warning if no domains mapped */}
          {(!data.brand_domains || data.brand_domains.length === 0) && (
            <InsightCard
              priority="warning"
              title="No domains mapped for this brand"
              description="All branded keywords will show as losses until you map the brand's domain in Configure."
              onAction={() => window.location.href = '/config'}
              actionLabel="Configure"
            />
          )}

          {/* KPI Cards Row - 3 focused cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <BrandHealthCard
              score={healthScore}
              winRateKeywords={data.kpis.win_rate_keywords}
              winRateVolume={data.kpis.win_rate_volume}
            />
            <OpportunityCard
              volume={data.kpis.volume_losing}
              keywords={data.kpis.keywords_losing}
            />
            {topThreat ? (
              <ThreatCard
                domain={topThreat.domain}
                domainType={topThreat.domain_type}
                keywords={topThreat.wins_count}
                volume={topThreat.wins_volume}
                avgPosition={topThreat.avg_position}
              />
            ) : (
              <div className="bg-white rounded-xl p-6 border border-gray-200 flex items-center justify-center">
                <div className="text-center">
                  <Shield className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                  <p className="font-semibold text-emerald-600">No threats detected</p>
                  <p className="text-sm text-muted-foreground">You're winning all keywords!</p>
                </div>
              </div>
            )}
          </div>

          {/* Key Insight */}
          {healthScore < 50 && (
            <InsightCard
              priority="critical"
              title="Brand health is critical"
              description={`You're winning only ${data.kpis.win_rate_keywords.toFixed(0)}% of your branded keywords. Focus on the categories below to reclaim lost positions.`}
              volume={data.kpis.volume_losing}
              keywords={data.kpis.keywords_losing}
            />
          )}

          {/* Charts Row: Competitors & Domain Types */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <CompetitorChart
                competitors={data.top_competitors ?? []}
                brandName={data.brand_name}
              />
            </div>
            <div>
              <DomainTypesChart
                domainTypes={data.losses_by_domain_type ?? []}
                brandName={data.brand_name}
              />
            </div>
          </div>

          {/* Category Losses - DataExplorer with drawer */}
          <DataExplorer
            title="Loss Analysis by Category"
            description={`${lossByCategory.length} categories - click any row to explore`}
            tooltipInfo={{
              title: 'Category Loss Analysis',
              description:
                'See which categories are contributing most to your losses. Click any row to see detailed breakdown, keywords, and competitors.',
            }}
            icon={<Layers className="h-5 w-5 text-amber-600" />}
            iconBgClass="bg-amber-100"
            data={lossByCategory}
            columns={categoryColumns}
            getRowKey={(item) => item.category}
            onRowClick={(item) =>
              setCategoryDrawer({
                isOpen: true,
                category: item.category,
                displayName: item.display_name,
              })
            }
            emptyMessage="No category losses found - great job!"
            showMoreLabel="categories"
            footer={categoryFooter}
          />

          {/* Modifier Groups - DataExplorer with drawer */}
          {!loadingModifierGroups && modifierGroups && modifierGroups.length > 0 && (
            <DataExplorer
              title="Performance by Modifier Group"
              description={`${modifierGroups.length} modifier groups - click any row to explore`}
              tooltipInfo={{
                title: 'Modifier Group Performance',
                description:
                  'Modifier groups represent keyword intent patterns. Click any row to see detailed performance and competitors.',
              }}
              icon={<Tag className="h-5 w-5 text-purple-600" />}
              iconBgClass="bg-purple-100"
              data={modifierGroups}
              columns={modifierColumns}
              getRowKey={(item) => item.modifier_group}
              onRowClick={(item) =>
                setModifierDrawer({
                  isOpen: true,
                  modifierGroup: item.modifier_group,
                })
              }
              emptyMessage="No modifier groups found"
              showMoreLabel="groups"
              footer={modifierFooter}
            />
          )}

          {/* Win/Loss Detail Table */}
          <WinLossTable wins={data.wins ?? []} losses={data.losses ?? []} />
        </>
      )}

      {/* Category Detail Drawer */}
      <CategoryDetailDrawer
        isOpen={categoryDrawer.isOpen}
        onClose={() =>
          setCategoryDrawer({ isOpen: false, category: '', displayName: '' })
        }
        categoryName={categoryDrawer.category}
        displayName={categoryDrawer.displayName}
        brandName={selectedBrand || ''}
        context="protection"
      />

      {/* Modifier Group Drawer (unified) */}
      <ModifierGroupDrawer
        isOpen={modifierDrawer.isOpen}
        onClose={() => setModifierDrawer({ isOpen: false, modifierGroup: '' })}
        modifierGroup={modifierDrawer.modifierGroup}
        brandName={selectedBrand || ''}
        context="protection"
      />
    </div>
  );
}

export default BrandProtection;
