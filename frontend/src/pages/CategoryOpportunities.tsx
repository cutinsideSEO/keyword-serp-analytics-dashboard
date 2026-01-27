/**
 * Category Opportunities page.
 * Shows non-branded keyword opportunities AND competitor branded opportunities for a selected brand.
 * Drill-down via ModifierGroupDrawer (side panel).
 */

import { useState, useCallback, useRef } from 'react';
import { Compass, Target, Users, TrendingUp, CheckCircle2, XCircle, Tag, TrendingDown, Layers } from 'lucide-react';
import { motion } from 'framer-motion';
import { BrandPicker } from '../components/common/BrandPicker';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorDisplay } from '../components/common/ErrorBoundary';
import { OpportunityKPICards } from '../components/dashboard/OpportunityKPICards';
import { OpportunityBarChart } from '../components/dashboard/OpportunityBarChart';
import { DataExplorer } from '../components/dashboard/DataExplorer';
import { ModifierGroupDrawer } from '../components/dashboard/ModifierGroupDrawer';
import { CategoryDetailDrawer } from '../components/dashboard/CategoryDetailDrawer';
import { useApiWithParam } from '../hooks/useApi';
import { useMarketConfig } from '../contexts/MarketConfigContext';
import { getCategoryOpportunities, getCompetitorBrandedOpportunities } from '../api/endpoints';
import { formatNumber, formatCompactNumber, formatPercent } from '../utils/formatters';
import type {
  CategoryOpportunityDashboard,
  CategoryOpportunityStats,
  CompetitorBrandedDashboard,
  ModifierGroupOpportunity,
  OpportunityCompetitor,
} from '../types';

function CompetitorBadge({ competitor }: { competitor: OpportunityCompetitor }) {
  const { getStyles, getIcon } = useMarketConfig();
  const styles = getStyles(competitor.domain_type);
  const Icon = getIcon(competitor.domain_type);

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${styles.bgColor} ${styles.textColor} ${styles.borderColor} border`}
    >
      <Icon className="w-3 h-3" />
      {competitor.domain.length > 15 ? competitor.domain.substring(0, 15) + '...' : competitor.domain}
    </span>
  );
}

export function CategoryOpportunities() {
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const nonBrandedTableRef = useRef<HTMLDivElement>(null);
  const competitorTableRef = useRef<HTMLDivElement>(null);

  // Drawer state
  const [drawerState, setDrawerState] = useState<{
    isOpen: boolean;
    modifierGroup: string;
    keywordType: 'nonbranded' | 'competitor_branded';
  }>({ isOpen: false, modifierGroup: '', keywordType: 'nonbranded' });

  const [categoryDrawer, setCategoryDrawer] = useState<{
    isOpen: boolean;
    category: string;
    displayName: string;
    keywordType: 'nonbranded' | 'competitor_branded';
  }>({ isOpen: false, category: '', displayName: '', keywordType: 'nonbranded' });

  // Fetch non-branded opportunities
  const fetchNonBranded = useCallback(
    (brand: string) => getCategoryOpportunities(brand),
    []
  );

  const {
    data: nonBrandedData,
    loading: nonBrandedLoading,
    error: nonBrandedError,
    refetch: refetchNonBranded,
  } = useApiWithParam<CategoryOpportunityDashboard, string>(fetchNonBranded, selectedBrand);

  // Fetch competitor branded opportunities
  const fetchCompetitorBranded = useCallback(
    (brand: string) => getCompetitorBrandedOpportunities(brand),
    []
  );

  const {
    data: competitorData,
    loading: competitorLoading,
    error: competitorError,
    refetch: refetchCompetitor,
  } = useApiWithParam<CompetitorBrandedDashboard, string>(fetchCompetitorBranded, selectedBrand);

  const loading = nonBrandedLoading || competitorLoading;
  const error = nonBrandedError || competitorError;

  // Handle click on bar chart to scroll to table
  const handleNonBrandedGroupClick = () => {
    if (nonBrandedTableRef.current) {
      nonBrandedTableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCompetitorGroupClick = () => {
    if (competitorTableRef.current) {
      competitorTableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Handle row click to open drawer
  const handleNonBrandedRowClick = (item: ModifierGroupOpportunity) => {
    setDrawerState({
      isOpen: true,
      modifierGroup: item.modifier_group,
      keywordType: 'nonbranded',
    });
  };

  const handleCompetitorRowClick = (item: ModifierGroupOpportunity) => {
    setDrawerState({
      isOpen: true,
      modifierGroup: item.modifier_group,
      keywordType: 'competitor_branded',
    });
  };

  // Modifier group table columns (shared by both non-branded and competitor tables)
  const modifierColumns = [
    {
      key: 'modifier_group',
      header: 'Modifier Group',
      render: (item: ModifierGroupOpportunity) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <Tag className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <span className="font-medium text-gray-900">{item.modifier_group}</span>
        </div>
      ),
    },
    {
      key: 'capture_rate',
      header: 'Capture Rate',
      align: 'right' as const,
      render: (item: ModifierGroupOpportunity) => {
        const isGood = item.capture_rate >= 50;
        const isMid = item.capture_rate >= 25;
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
            {formatPercent(item.capture_rate)}
          </span>
        );
      },
    },
    {
      key: 'total_keywords',
      header: 'Total',
      align: 'right' as const,
      render: (item: ModifierGroupOpportunity) => (
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
      key: 'keywords_captured',
      header: 'Captured',
      align: 'right' as const,
      render: (item: ModifierGroupOpportunity) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-emerald-600">
            {formatNumber(item.keywords_captured)}
          </div>
          <div className="text-xs text-emerald-500">
            {formatCompactNumber(item.volume_captured)} vol
          </div>
        </div>
      ),
    },
    {
      key: 'keywords_uncaptured',
      header: 'To Capture',
      align: 'right' as const,
      render: (item: ModifierGroupOpportunity) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-amber-600">
            {formatNumber(item.keywords_uncaptured)}
          </div>
          <div className="text-xs text-amber-500">
            {formatCompactNumber(item.volume_uncaptured)} vol
          </div>
        </div>
      ),
    },
    {
      key: 'avg_brand_position',
      header: 'Avg Pos',
      align: 'right' as const,
      render: (item: ModifierGroupOpportunity) => {
        if (item.avg_brand_position == null) {
          return <span className="text-xs text-gray-400 italic">N/A</span>;
        }
        const isGood = item.avg_brand_position <= 3;
        const isMid = item.avg_brand_position <= 10;
        return (
          <span
            className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold ${
              isGood
                ? 'bg-emerald-100 text-emerald-700'
                : isMid
                ? 'bg-amber-100 text-amber-700'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            #{item.avg_brand_position.toFixed(1)}
          </span>
        );
      },
    },
    {
      key: 'top_competitors',
      header: 'Top Competitors',
      render: (item: ModifierGroupOpportunity) => (
        <div className="flex flex-wrap gap-1">
          {item.top_competitors.slice(0, 3).map((comp, idx) => (
            <CompetitorBadge key={idx} competitor={comp} />
          ))}
          {item.top_competitors.length > 3 && (
            <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-700 text-xs font-medium">
              +{item.top_competitors.length - 3}
            </span>
          )}
          {item.top_competitors.length === 0 && (
            <span className="text-xs text-gray-400 italic">No competitors</span>
          )}
        </div>
      ),
    },
  ];

  // Category table columns
  const categoryColumns = [
    {
      key: 'display_name',
      header: 'Category',
      render: (item: CategoryOpportunityStats) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <span className="font-medium text-gray-900">{item.display_name}</span>
        </div>
      ),
    },
    {
      key: 'capture_rate',
      header: 'Capture Rate',
      align: 'right' as const,
      render: (item: CategoryOpportunityStats) => {
        const isGood = item.capture_rate >= 50;
        const isMid = item.capture_rate >= 25;
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
            {isGood ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
            {formatPercent(item.capture_rate)}
          </span>
        );
      },
    },
    {
      key: 'total_keywords',
      header: 'Total',
      align: 'right' as const,
      render: (item: CategoryOpportunityStats) => (
        <div className="space-y-0.5">
          <div className="font-medium text-gray-900">{formatNumber(item.total_keywords)}</div>
          <div className="text-xs text-gray-500">{formatCompactNumber(item.total_volume)} vol</div>
        </div>
      ),
    },
    {
      key: 'to_capture',
      header: 'To Capture',
      align: 'right' as const,
      render: (item: CategoryOpportunityStats) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-amber-600">
            {formatNumber(item.total_keywords - item.keywords_captured)}
          </div>
          <div className="text-xs text-amber-500">
            {formatCompactNumber(item.total_volume - item.volume_captured)} vol
          </div>
        </div>
      ),
    },
  ];

  // Build footer for non-branded table
  const nonBrandedFooter = nonBrandedData && nonBrandedData.modifier_groups.length > 0 ? (
    <div className="flex justify-between text-sm">
      <div className="text-gray-600">
        <span className="font-semibold text-gray-900">{nonBrandedData.modifier_groups.length}</span> modifier groups
      </div>
      <div className="flex gap-4">
        <div className="text-emerald-600 flex items-center gap-1">
          <TrendingUp className="w-3.5 h-3.5" />
          {formatCompactNumber(nonBrandedData.modifier_groups.reduce((s, m) => s + m.volume_captured, 0))} captured
        </div>
        <div className="text-amber-600 flex items-center gap-1">
          <TrendingDown className="w-3.5 h-3.5" />
          {formatCompactNumber(nonBrandedData.modifier_groups.reduce((s, m) => s + m.volume_uncaptured, 0))} opportunity
        </div>
      </div>
    </div>
  ) : undefined;

  // Build footer for competitor table
  const competitorFooter = competitorData && competitorData.modifier_groups.length > 0 ? (
    <div className="flex justify-between text-sm">
      <div className="text-gray-600">
        <span className="font-semibold text-gray-900">{competitorData.modifier_groups.length}</span> modifier groups
      </div>
      <div className="flex gap-4">
        <div className="text-emerald-600 flex items-center gap-1">
          <TrendingUp className="w-3.5 h-3.5" />
          {formatCompactNumber(competitorData.modifier_groups.reduce((s, m) => s + m.volume_captured, 0))} captured
        </div>
        <div className="text-amber-600 flex items-center gap-1">
          <TrendingDown className="w-3.5 h-3.5" />
          {formatCompactNumber(competitorData.modifier_groups.reduce((s, m) => s + m.volume_uncaptured, 0))} opportunity
        </div>
      </div>
    </div>
  ) : undefined;

  return (
    <div className="space-y-8">
      {/* Modern Header with emerald/teal gradient */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-400 mb-2">
            Category Opportunities
          </h1>
          <p className="text-gray-600 text-lg">
            Discover keyword opportunities to expand market share
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 min-w-[280px]">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Select Brand</label>
          <BrandPicker
            value={selectedBrand}
            onChange={setSelectedBrand}
            minKeywords={3}
            minVolume={100}
            placeholder="Choose a brand..."
          />
        </div>
      </div>

      {/* Empty State */}
      {!selectedBrand && (
        <div className="flex h-96 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50">
          <div className="text-center">
            <Compass className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              Select a brand to explore opportunities
            </h3>
            <p className="mt-2 text-sm text-gray-500 max-w-md">
              Choose a brand from the dropdown above to see keyword opportunities.
              You'll see both generic/category searches and competitor branded keywords.
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {selectedBrand && loading && (
        <LoadingSpinner size="lg" message="Analyzing opportunities..." />
      )}

      {/* Error State */}
      {selectedBrand && error && (
        <ErrorDisplay
          error={error}
          message="Failed to load opportunities"
          onRetry={() => {
            refetchNonBranded();
            refetchCompetitor();
          }}
        />
      )}

      {/* Content */}
      {selectedBrand && !loading && (
        <>
          {/* Brand Info Banner */}
          {nonBrandedData && nonBrandedData.brand_domains.length > 0 && (
            <div className="rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-100 border border-emerald-200 px-6 py-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-900 mb-1">
                  Analyzing opportunities for: {nonBrandedData.brand_name}
                </p>
                <p className="text-sm text-emerald-700">
                  Domains: {nonBrandedData.brand_domains.join(', ')}
                </p>
              </div>
            </div>
          )}

          {nonBrandedData && nonBrandedData.brand_domains.length === 0 && (
            <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 px-6 py-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-900 mb-1">No domains mapped for this brand</p>
                <p className="text-sm text-amber-700">
                  All keywords will show as opportunities (0% capture rate) until you map the brand's domain.
                </p>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* NON-BRANDED OPPORTUNITIES SECTION */}
          {/* ============================================================= */}
          {nonBrandedData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              {/* Section Header */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Non-Branded Opportunities</h2>
                  <p className="text-gray-600">
                    Generic/category keywords without any brand mention
                  </p>
                </div>
              </div>

              {/* KPI Cards */}
              <OpportunityKPICards kpis={nonBrandedData.kpis} />

              {/* Opportunity Bar Chart */}
              {nonBrandedData.modifier_groups.length > 0 && (
                <OpportunityBarChart
                  modifierGroups={nonBrandedData.modifier_groups}
                  limit={10}
                  onGroupClick={handleNonBrandedGroupClick}
                />
              )}

              {/* Modifier Groups Table */}
              <div ref={nonBrandedTableRef}>
                <DataExplorer
                  title="Opportunities by Modifier Group"
                  description={`${nonBrandedData.modifier_groups.length} modifier groups - click any row to explore`}
                  tooltipInfo={{
                    title: 'Modifier Group Opportunities',
                    description:
                      'Non-branded keywords grouped by their modifier type. Shows opportunity size, capture rate, and top competitors.',
                  }}
                  icon={<Target className="h-5 w-5 text-emerald-600" />}
                  iconBgClass="bg-emerald-100"
                  data={nonBrandedData.modifier_groups}
                  columns={modifierColumns}
                  getRowKey={(item) => item.modifier_group}
                  onRowClick={handleNonBrandedRowClick}
                  emptyMessage="No non-branded opportunities found"
                  showMoreLabel="groups"
                  footer={nonBrandedFooter}
                />
              </div>

              {/* Category Opportunities Table */}
              {nonBrandedData.category_stats && nonBrandedData.category_stats.length > 0 && (
                <DataExplorer
                  title="Opportunities by Category"
                  description={`${nonBrandedData.category_stats.length} categories - click any row to explore`}
                  tooltipInfo={{
                    title: 'Category Opportunities',
                    description: 'Non-branded keywords grouped by category. Shows opportunity size and capture rate.',
                  }}
                  icon={<Layers className="h-5 w-5 text-emerald-600" />}
                  iconBgClass="bg-emerald-100"
                  data={nonBrandedData.category_stats}
                  columns={categoryColumns}
                  getRowKey={(item) => item.category_name}
                  onRowClick={(item) => setCategoryDrawer({
                    isOpen: true,
                    category: item.category_name,
                    displayName: item.display_name,
                    keywordType: 'nonbranded',
                  })}
                  emptyMessage="No category data available"
                  showMoreLabel="categories"
                />
              )}
            </motion.div>
          )}

          {/* ============================================================= */}
          {/* COMPETITOR BRANDED OPPORTUNITIES SECTION */}
          {/* ============================================================= */}
          {competitorData && competitorData.modifier_groups.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="space-y-6 mt-12 pt-8 border-t-2 border-gray-200"
            >
              {/* Section Header */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center shadow-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Competitor Branded Opportunities</h2>
                  <p className="text-gray-600">
                    Keywords branded to competitors where you can capture traffic
                  </p>
                </div>
              </div>

              {/* Competitor Brands Found */}
              {competitorData.competitor_brands.length > 0 && (
                <div className="rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 px-6 py-4">
                  <p className="text-sm font-semibold text-purple-900 mb-2">
                    Competitor brands found ({competitorData.competitor_brands.length}):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {competitorData.competitor_brands.slice(0, 15).map((brand, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-full bg-white border border-purple-200 text-sm text-purple-700 font-medium"
                      >
                        {brand}
                      </span>
                    ))}
                    {competitorData.competitor_brands.length > 15 && (
                      <span className="px-3 py-1 rounded-full bg-purple-100 border border-purple-200 text-sm text-purple-700 font-medium">
                        +{competitorData.competitor_brands.length - 15} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* KPI Cards - Reuse with same style */}
              <OpportunityKPICards kpis={competitorData.kpis} variant="competitor" />

              {/* Opportunity Bar Chart */}
              {competitorData.modifier_groups.length > 0 && (
                <OpportunityBarChart
                  modifierGroups={competitorData.modifier_groups}
                  limit={10}
                  onGroupClick={handleCompetitorGroupClick}
                />
              )}

              {/* Modifier Groups Table */}
              <div ref={competitorTableRef}>
                <DataExplorer
                  title="Competitor Branded Opportunities by Modifier Group"
                  description={`${competitorData.modifier_groups.length} modifier groups - click any row to explore`}
                  tooltipInfo={{
                    title: 'Competitor Branded Opportunities',
                    description:
                      'Keywords branded to competitors grouped by modifier type. Shows capture potential and current competition.',
                  }}
                  icon={<Users className="h-5 w-5 text-purple-600" />}
                  iconBgClass="bg-purple-100"
                  data={competitorData.modifier_groups}
                  columns={modifierColumns}
                  getRowKey={(item) => item.modifier_group}
                  onRowClick={handleCompetitorRowClick}
                  emptyMessage="No competitor branded opportunities found"
                  showMoreLabel="groups"
                  footer={competitorFooter}
                />
              </div>

              {/* Competitor Category Opportunities Table */}
              {competitorData.category_stats && competitorData.category_stats.length > 0 && (
                <DataExplorer
                  title="Competitor Branded Opportunities by Category"
                  description={`${competitorData.category_stats.length} categories - click any row to explore`}
                  tooltipInfo={{
                    title: 'Competitor Branded Category Opportunities',
                    description: 'Competitor-branded keywords grouped by category. Shows capture potential.',
                  }}
                  icon={<Layers className="h-5 w-5 text-purple-600" />}
                  iconBgClass="bg-purple-100"
                  data={competitorData.category_stats}
                  columns={categoryColumns}
                  getRowKey={(item) => item.category_name}
                  onRowClick={(item) => setCategoryDrawer({
                    isOpen: true,
                    category: item.category_name,
                    displayName: item.display_name,
                    keywordType: 'competitor_branded',
                  })}
                  emptyMessage="No category data available"
                  showMoreLabel="categories"
                />
              )}
            </motion.div>
          )}

          {/* No Competitor Data Message */}
          {competitorData && competitorData.modifier_groups.length === 0 && (
            <div className="mt-12 pt-8 border-t-2 border-gray-200">
              <div className="rounded-xl bg-gray-50 border border-gray-200 p-8 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Competitor Branded Keywords Found
                </h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  There are no keywords tagged with competitor brands in this dataset, or all competitor
                  branded keywords have already been captured.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modifier Group Drawer */}
      <ModifierGroupDrawer
        isOpen={drawerState.isOpen}
        onClose={() =>
          setDrawerState({ isOpen: false, modifierGroup: '', keywordType: 'nonbranded' })
        }
        modifierGroup={drawerState.modifierGroup}
        brandName={selectedBrand || ''}
        context="opportunity"
        keywordType={drawerState.keywordType}
      />

      {/* Category Detail Drawer */}
      <CategoryDetailDrawer
        isOpen={categoryDrawer.isOpen}
        onClose={() =>
          setCategoryDrawer({ isOpen: false, category: '', displayName: '', keywordType: 'nonbranded' })
        }
        categoryName={categoryDrawer.category}
        displayName={categoryDrawer.displayName}
        brandName={selectedBrand || ''}
        context="opportunity"
        keywordType={categoryDrawer.keywordType}
      />
    </div>
  );
}

export default CategoryOpportunities;
