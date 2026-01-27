/**
 * Category Opportunities page.
 * Shows non-branded keyword opportunities AND competitor branded opportunities for a selected brand.
 * Drill-down via ModifierGroupDrawer (side panel).
 */

import { useState, useCallback, useRef } from 'react';
import { Compass, Target, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { BrandPicker } from '../components/common/BrandPicker';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorDisplay } from '../components/common/ErrorBoundary';
import { OpportunityKPICards } from '../components/dashboard/OpportunityKPICards';
import { OpportunityBarChart } from '../components/dashboard/OpportunityBarChart';
import { OpportunityModifierGroupsTable } from '../components/dashboard/OpportunityModifierGroupsTable';
import { ModifierGroupDrawer } from '../components/dashboard/ModifierGroupDrawer';
import { useApiWithParam } from '../hooks/useApi';
import { getCategoryOpportunities, getCompetitorBrandedOpportunities } from '../api/endpoints';
import type {
  CategoryOpportunityDashboard,
  CompetitorBrandedDashboard,
  ModifierGroupOpportunity,
} from '../types';

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
                <OpportunityModifierGroupsTable
                  modifierGroups={nonBrandedData.modifier_groups}
                  brandName={nonBrandedData.brand_name}
                  keywordType="nonbranded"
                  onRowClick={handleNonBrandedRowClick}
                />
              </div>
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
                <OpportunityModifierGroupsTable
                  modifierGroups={competitorData.modifier_groups}
                  brandName={competitorData.brand_name}
                  keywordType="competitor_branded"
                  onRowClick={handleCompetitorRowClick}
                />
              </div>
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
    </div>
  );
}

export default CategoryOpportunities;
