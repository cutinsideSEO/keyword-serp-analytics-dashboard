/**
 * Market Overview Dashboard page.
 *
 * Provides market-wide analytics without brand selection.
 */

import { useEffect, useState } from 'react';
import { Grid, Title, Text } from '@tremor/react';
import { Globe, TrendingUp } from 'lucide-react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorDisplay } from '../components/common/ErrorBoundary';
import { ShareOfSearchChart } from '../components/dashboard/ShareOfSearchChart';
import { DomainVisibilitySection } from '../components/dashboard/DomainVisibilitySection';
import { MarketProtectionSnapshot } from '../components/dashboard/MarketProtectionSnapshot';
import { BiggestLosersTable } from '../components/dashboard/BiggestLosersTable';
import { CategoryExplorer } from '../components/dashboard/CategoryExplorer';
import { ModifierGroupExplorer } from '../components/dashboard/ModifierGroupExplorer';
import { getMarketOverviewDashboard } from '../api/endpoints';
import type { MarketOverviewDashboard } from '../types';

export function MarketOverview() {
  const [data, setData] = useState<MarketOverviewDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      console.error('Error loading market overview:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-500 mb-2">
              Market Overview
            </h1>
            <p className="text-gray-600 text-lg">
              Comprehensive market analytics across all brands and competitors
            </p>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl shadow-lg border border-emerald-200 p-6">
            <div className="flex items-center space-x-3">
              <Globe className="h-8 w-8 text-emerald-600" />
              <div>
                <div className="text-sm text-gray-600">Market Analysis</div>
                <div className="text-xl font-bold text-emerald-700">Loading...</div>
              </div>
            </div>
          </div>
        </div>
        <LoadingSpinner size="lg" message="Loading market data (this may take up to 60 seconds)..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-500 mb-2">
            Market Overview
          </h1>
          <p className="text-gray-600 text-lg">
            Comprehensive market analytics across all brands and competitors
          </p>
        </div>
        <ErrorDisplay
          message={error}
          onRetry={loadDashboard}
        />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Modern Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-500 mb-2">
            Market Overview
          </h1>
          <p className="text-gray-600 text-lg">
            Comprehensive market analytics across {data.protection_kpis.total_brands} brands
          </p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl shadow-lg border border-emerald-200 p-6">
          <div className="flex items-center space-x-3">
            <TrendingUp className="h-8 w-8 text-emerald-600" />
            <div>
              <div className="text-sm text-gray-600">Market Size</div>
              <div className="text-xl font-bold text-emerald-700">
                {data.protection_kpis.total_market_volume.toLocaleString()} volume
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share of Search Section */}
      <section>
        <Title className="text-2xl font-bold mb-4">Share of Search</Title>
        <Text className="text-gray-600 mb-6">
          Brand demand by search volume - who users are searching for
        </Text>
        <ShareOfSearchChart data={data.share_of_search} topN={10} />
      </section>

      {/* Strongest Players Section */}
      <section>
        <Title className="text-2xl font-bold mb-4">Strongest Market Players</Title>
        <Grid numItems={1} numItemsMd={2} className="gap-6">
          <DomainVisibilitySection
            title="Top Retailers"
            subtitle="Resellers with strongest visibility"
            data={data.top_retailers}
            variant="retailer"
            limit={5}
          />
          <DomainVisibilitySection
            title="Influential Voices"
            subtitle="UGC & 3rd Party shapers"
            data={data.influential_voices}
            variant="influencer"
            limit={5}
          />
        </Grid>
      </section>

      {/* Market Protection Snapshot */}
      <section>
        <Title className="text-2xl font-bold mb-4">Market Brand Protection</Title>
        <Text className="text-gray-600 mb-6">
          Overall brand protection health across the market
        </Text>
        <MarketProtectionSnapshot
          kpis={data.protection_kpis}
          lossDistribution={data.loss_distribution}
        />
      </section>

      {/* Biggest Losers */}
      <section>
        <Title className="text-2xl font-bold mb-4">Biggest Losers</Title>
        <Text className="text-gray-600 mb-6">
          Brands with the worst brand protection
        </Text>
        <BiggestLosersTable data={data.biggest_losers} limit={10} />
      </section>

      {/* Category Insights */}
      <section>
        <CategoryExplorer data={data.category_stats} />
      </section>

      {/* Modifier Group Analysis */}
      <section>
        <ModifierGroupExplorer data={data.modifier_group_stats} />
      </section>
    </div>
  );
}
