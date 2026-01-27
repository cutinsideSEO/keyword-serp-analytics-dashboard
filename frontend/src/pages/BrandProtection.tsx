/**
 * Brand Protection Dashboard page (PROTECT section).
 * Redesigned with drawer-based drill-downs and focused KPI cards.
 */

import { useState, useCallback } from 'react';
import { Grid, Col } from '@tremor/react';
import { Shield, Layers, Tag } from 'lucide-react';
import { BrandPicker } from '../components/common/BrandPicker';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorDisplay } from '../components/common/ErrorBoundary';
import { BrandHealthCard } from '../components/dashboard/BrandHealthCard';
import { OpportunityCard } from '../components/dashboard/OpportunityCard';
import { ThreatCard } from '../components/dashboard/ThreatCard';
import { DataExplorer } from '../components/dashboard/DataExplorer';
import { CategoryDetailDrawer } from '../components/dashboard/CategoryDetailDrawer';
import { ModifierDetailDrawer } from '../components/dashboard/ModifierDetailDrawer';
import { InsightCard } from '../components/dashboard/InsightCard';
import { CompetitorChart } from '../components/dashboard/CompetitorChart';
import { DomainTypesChart } from '../components/dashboard/DomainTypesChart';
import { WinLossTable } from '../components/dashboard/WinLossTable';
import { useApiWithParam } from '../hooks/useApi';
import { getBrandProtectionDashboard, getModifierGroupStats } from '../api/endpoints';
import type {
  BrandProtectionDashboard as DashboardData,
  ModifierGroupStats,
  CategoryLossStats,
} from '../types';

export function BrandProtection() {
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

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
    if (!data || data.top_competitors.length === 0) return null;
    return data.top_competitors[0];
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
      render: (item: CategoryLossStats) => (
        <span className="font-medium text-gray-900">{item.display_name}</span>
      ),
    },
    {
      key: 'win_rate',
      header: 'Win Rate',
      align: 'right' as const,
      render: (item: CategoryLossStats) => (
        <span
          className={`font-medium ${
            item.win_rate >= 80
              ? 'text-emerald-600'
              : item.win_rate >= 50
              ? 'text-amber-600'
              : 'text-rose-600'
          }`}
        >
          {item.win_rate.toFixed(0)}%
        </span>
      ),
    },
    {
      key: 'keywords_losing',
      header: 'Lost',
      align: 'right' as const,
      render: (item: CategoryLossStats) => (
        <span className="text-rose-600">{item.keywords_losing}</span>
      ),
    },
    {
      key: 'volume_losing',
      header: 'Volume Lost',
      align: 'right' as const,
      render: (item: CategoryLossStats) => (
        <span className="text-rose-600">{formatVolume(item.volume_losing)}</span>
      ),
    },
  ];

  // Modifier group table columns
  const modifierColumns = [
    {
      key: 'modifier_group',
      header: 'Modifier Group',
      render: (item: ModifierGroupStats) => (
        <span className="font-medium text-gray-900">{item.modifier_group}</span>
      ),
    },
    {
      key: 'win_rate',
      header: 'Win Rate',
      align: 'right' as const,
      render: (item: ModifierGroupStats) => (
        <span
          className={`font-medium ${
            item.win_rate >= 80
              ? 'text-emerald-600'
              : item.win_rate >= 50
              ? 'text-amber-600'
              : 'text-rose-600'
          }`}
        >
          {item.win_rate.toFixed(0)}%
        </span>
      ),
    },
    {
      key: 'keywords_losing',
      header: 'Lost',
      align: 'right' as const,
      render: (item: ModifierGroupStats) => (
        <span className="text-rose-600">{item.keywords_losing}</span>
      ),
    },
    {
      key: 'volume_losing',
      header: 'Volume Lost',
      align: 'right' as const,
      render: (item: ModifierGroupStats) => (
        <span className="text-rose-600">{formatVolume(item.volume_losing)}</span>
      ),
    },
  ];

  const healthScore = calculateHealthScore();
  const topThreat = getTopThreat();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400 mb-1">
            Protect
          </h1>
          <p className="text-gray-600">
            Defend your branded keywords and identify competitive threats
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 min-w-[260px]">
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
        <div className="flex h-80 items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50">
          <div className="text-center">
            <Shield className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              Select a brand to get started
            </h3>
            <p className="mt-2 text-sm text-gray-500 max-w-sm">
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
          {data.brand_domains.length === 0 && (
            <InsightCard
              priority="warning"
              title="No domains mapped for this brand"
              description="All branded keywords will show as losses until you map the brand's domain in Configure."
              onAction={() => window.location.href = '/config'}
              actionLabel="Configure"
            />
          )}

          {/* KPI Cards Row - 3 focused cards */}
          <Grid numItemsMd={3} className="gap-6">
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
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg flex items-center justify-center">
                <div className="text-center">
                  <Shield className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                  <p className="font-semibold text-emerald-600">No threats detected</p>
                  <p className="text-sm text-gray-500">You're winning all keywords!</p>
                </div>
              </div>
            )}
          </Grid>

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
          <Grid numItemsMd={2} className="gap-6">
            <Col>
              <CompetitorChart
                competitors={data.top_competitors}
                brandName={data.brand_name}
              />
            </Col>
            <Col>
              <DomainTypesChart
                domainTypes={data.losses_by_domain_type}
                brandName={data.brand_name}
              />
            </Col>
          </Grid>

          {/* Category Losses - DataExplorer with drawer */}
          <DataExplorer
            title="Loss Analysis by Category"
            description={`${data.losses_by_category.length} categories - click any row to explore`}
            tooltipInfo={{
              title: 'Category Loss Analysis',
              description:
                'See which categories are contributing most to your losses. Click any row to see detailed breakdown, keywords, and competitors.',
            }}
            icon={<Layers className="h-5 w-5 text-amber-600" />}
            iconBgClass="bg-amber-100"
            data={data.losses_by_category}
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
            />
          )}

          {/* Win/Loss Detail Table */}
          <WinLossTable wins={data.wins} losses={data.losses} />
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

      {/* Modifier Detail Drawer */}
      <ModifierDetailDrawer
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
