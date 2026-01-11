/**
 * Category Opportunities page.
 * Shows non-branded keyword opportunities for a selected brand.
 */

import { useState, useCallback, useRef } from 'react';
import { Compass } from 'lucide-react';
import { BrandPicker } from '../components/common/BrandPicker';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorDisplay } from '../components/common/ErrorBoundary';
import { OpportunityKPICards } from '../components/dashboard/OpportunityKPICards';
import { OpportunityBarChart } from '../components/dashboard/OpportunityBarChart';
import { OpportunityModifierGroupsTable } from '../components/dashboard/OpportunityModifierGroupsTable';
import { useApiWithParam } from '../hooks/useApi';
import { getCategoryOpportunities } from '../api/endpoints';
import type { CategoryOpportunityDashboard } from '../types';

export function CategoryOpportunities() {
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const fetchDashboard = useCallback(
    (brand: string) => getCategoryOpportunities(brand),
    []
  );

  const { data, loading, error, refetch } = useApiWithParam<CategoryOpportunityDashboard, string>(
    fetchDashboard,
    selectedBrand
  );

  // Handle click on bar chart to scroll to table
  const handleGroupClick = (modifierGroup: string) => {
    // Scroll to table
    if (tableRef.current) {
      tableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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
            Discover non-branded keyword opportunities to expand market share
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
              Choose a brand from the dropdown above to see non-branded keyword opportunities.
              These are generic/category searches where your brand can capture market share.
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
          onRetry={refetch}
        />
      )}

      {/* Content */}
      {selectedBrand && data && !loading && (
        <>
          {/* Brand Info Banner */}
          {data.brand_domains.length > 0 && (
            <div className="rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-100 border border-emerald-200 px-6 py-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-900 mb-1">Analyzing opportunities for: {data.brand_name}</p>
                <p className="text-sm text-emerald-700">Domains: {data.brand_domains.join(', ')}</p>
              </div>
            </div>
          )}

          {data.brand_domains.length === 0 && (
            <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 px-6 py-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-900 mb-1">No domains mapped for this brand</p>
                <p className="text-sm text-amber-700">All non-branded keywords will show as opportunities (0% capture rate) until you map the brand's domain.</p>
              </div>
            </div>
          )}

          {/* KPI Cards */}
          <OpportunityKPICards kpis={data.kpis} />

          {/* Opportunity Bar Chart */}
          {data.modifier_groups.length > 0 && (
            <OpportunityBarChart
              modifierGroups={data.modifier_groups}
              limit={10}
              onGroupClick={handleGroupClick}
            />
          )}

          {/* Modifier Groups Table */}
          <div ref={tableRef}>
            <OpportunityModifierGroupsTable
              modifierGroups={data.modifier_groups}
              brandName={data.brand_name}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default CategoryOpportunities;
