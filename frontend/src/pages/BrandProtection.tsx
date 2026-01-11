/**
 * Brand Protection Dashboard page.
 */

import { useState, useCallback } from 'react';
import { Title, Text, Flex, Grid, Col } from '@tremor/react';
import { BrandPicker } from '../components/common/BrandPicker';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorDisplay } from '../components/common/ErrorBoundary';
import { KPICards } from '../components/dashboard/KPICards';
import { WinLossTable } from '../components/dashboard/WinLossTable';
import { CompetitorChart } from '../components/dashboard/CompetitorChart';
import { CategoryProtectionExplorer } from '../components/dashboard/CategoryProtectionExplorer';
import { DomainTypesChart } from '../components/dashboard/DomainTypesChart';
import { InfluentialVoicesTable } from '../components/dashboard/InfluentialVoicesTable';
import { ModifierGroupProtectionExplorer } from '../components/dashboard/ModifierGroupProtectionExplorer';
import { useApiWithParam } from '../hooks/useApi';
import { getBrandProtectionDashboard, getModifierGroupStats } from '../api/endpoints';
import type { BrandProtectionDashboard as DashboardData, ModifierGroupStats } from '../types';

export function BrandProtection() {
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

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

  const { data: modifierGroups, loading: loadingModifierGroups } = useApiWithParam<ModifierGroupStats[], string>(
    fetchModifierGroups,
    selectedBrand
  );

  return (
    <div className="space-y-8">
      {/* Modern Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400 mb-2">
            Brand Protection
          </h1>
          <p className="text-gray-600 text-lg">
            Monitor your branded keywords and identify where competitors are winning
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

      {/* Content */}
      {!selectedBrand && (
        <div className="flex h-96 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50">
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              Select a brand to get started
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Choose a brand from the dropdown above to see your brand protection metrics
            </p>
          </div>
        </div>
      )}

      {selectedBrand && loading && (
        <LoadingSpinner size="lg" message="Loading dashboard data..." />
      )}

      {selectedBrand && error && (
        <ErrorDisplay
          error={error}
          message="Failed to load dashboard"
          onRetry={refetch}
        />
      )}

      {selectedBrand && data && !loading && (
        <>
          {/* Brand Info */}
          {data.brand_domains.length > 0 && (
            <div className="rounded-2xl bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 px-6 py-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-900 mb-1">Brand Domains</p>
                <p className="text-sm text-blue-700">{data.brand_domains.join(', ')}</p>
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
                <p className="text-sm text-amber-700">All branded keywords will show as losses until you map the brand's domain.</p>
              </div>
            </div>
          )}

          {/* KPIs */}
          <KPICards kpis={data.kpis} />

          {/* Charts Row 1: Competitors & Domain Types */}
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

          {/* Charts Row 2: Categories */}
          <CategoryProtectionExplorer
            categories={data.losses_by_category}
            brandName={data.brand_name}
          />

          {/* Influential Voices Table */}
          <InfluentialVoicesTable
            influentialVoices={data.influential_voices}
            brandName={data.brand_name}
          />

          {/* Modifier Groups Explorer */}
          {!loadingModifierGroups && modifierGroups && modifierGroups.length > 0 && (
            <ModifierGroupProtectionExplorer
              modifierGroups={modifierGroups}
              brandName={data.brand_name}
            />
          )}

          {/* Win/Loss Table */}
          <WinLossTable wins={data.wins} losses={data.losses} />
        </>
      )}
    </div>
  );
}

export default BrandProtection;
