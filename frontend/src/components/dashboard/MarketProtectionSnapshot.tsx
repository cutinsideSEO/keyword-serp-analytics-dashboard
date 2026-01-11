/**
 * Market Protection Snapshot Component
 * Displays overall brand protection health metrics and loss distribution
 */

import { motion } from 'framer-motion';
import { Card, Title, Text, Grid } from '@tremor/react';
import { Shield, AlertTriangle, TrendingDown, Users, PieChart } from 'lucide-react';
import type { MarketProtectionKPIs, MarketLossDistribution } from '../../types';

interface MarketProtectionSnapshotProps {
  kpis: MarketProtectionKPIs;
  lossDistribution: MarketLossDistribution[];
}

export function MarketProtectionSnapshot({ kpis, lossDistribution }: MarketProtectionSnapshotProps) {
  // Determine market health status
  const getHealthStatus = (avgWinRate: number) => {
    if (avgWinRate >= 50) return { label: 'Healthy', color: 'emerald' };
    if (avgWinRate >= 30) return { label: 'Moderate', color: 'yellow' };
    return { label: 'At Risk', color: 'red' };
  };

  const healthStatus = getHealthStatus(kpis.average_win_rate);

  // Domain type color mapping
  const domainTypeColors: Record<string, string> = {
    'Brand': 'text-emerald-600 bg-emerald-50 border-emerald-200',
    'Reseller': 'text-purple-600 bg-purple-50 border-purple-200',
    '3rd Party': 'text-blue-600 bg-blue-50 border-blue-200',
    'UGC': 'text-amber-600 bg-amber-50 border-amber-200',
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <Grid numItems={1} numItemsMd={4} className="gap-4">
        {/* Average Win Rate */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card decoration="top" decorationColor="emerald" className="h-full">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-emerald-600" />
              <Text>Average Win Rate</Text>
            </div>
            <div className="text-3xl font-bold text-emerald-600 mt-2">
              {kpis.average_win_rate.toFixed(1)}%
            </div>
            <Text className="text-sm text-gray-500 mt-1">
              across {kpis.total_brands} brands
            </Text>
            <div className="mt-3 pt-3 border-t border-gray-200">
              <span className={`text-xs font-semibold px-2 py-1 rounded-full bg-${healthStatus.color}-100 text-${healthStatus.color}-700`}>
                {healthStatus.label}
              </span>
            </div>
          </Card>
        </motion.div>

        {/* Total Volume at Risk */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card decoration="top" decorationColor="red" className="h-full">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <Text>Volume at Risk</Text>
            </div>
            <div className="text-3xl font-bold text-red-600 mt-2">
              {(kpis.total_volume_losing / 1000000).toFixed(1)}M
            </div>
            <Text className="text-sm text-gray-500 mt-1">
              {kpis.total_keywords_losing.toLocaleString()} keywords
            </Text>
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full"
                  style={{
                    width: `${(kpis.total_volume_losing / kpis.total_branded_volume) * 100}%`,
                  }}
                />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Median Win Rate */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card decoration="top" decorationColor="blue" className="h-full">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-blue-600" />
              <Text>Median Win Rate</Text>
            </div>
            <div className="text-3xl font-bold text-blue-600 mt-2">
              {kpis.median_win_rate.toFixed(1)}%
            </div>
            <Text className="text-sm text-gray-500 mt-1">
              50% of brands
            </Text>
            <div className="mt-3 pt-3 border-t border-gray-200">
              <Text className="text-xs text-gray-600">
                {kpis.median_win_rate < kpis.average_win_rate
                  ? 'Few brands dominate'
                  : 'Balanced distribution'}
              </Text>
            </div>
          </Card>
        </motion.div>

        {/* Total Brands */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card decoration="top" decorationColor="purple" className="h-full">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-purple-600" />
              <Text>Total Brands</Text>
            </div>
            <div className="text-3xl font-bold text-purple-600 mt-2">
              {kpis.total_brands}
            </div>
            <Text className="text-sm text-gray-500 mt-1">
              {kpis.total_branded_keywords.toLocaleString()} keywords
            </Text>
            <div className="mt-3 pt-3 border-t border-gray-200">
              <Text className="text-xs text-gray-600">
                Avg {Math.round(kpis.total_branded_keywords / kpis.total_brands)} kw/brand
              </Text>
            </div>
          </Card>
        </motion.div>
      </Grid>

      {/* Loss Distribution */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="h-5 w-5 text-gray-600" />
            <Title>Who Captures Brand Traffic</Title>
          </div>
          <Text className="text-gray-600 mb-4">
            Distribution of #1 rankings on branded keywords
          </Text>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {lossDistribution
              .sort((a, b) => b.percentage_of_losses - a.percentage_of_losses)
              .map((dist, idx) => {
                const colorClass = domainTypeColors[dist.domain_type] || 'text-gray-600 bg-gray-50 border-gray-200';

                return (
                  <motion.div
                    key={dist.domain_type}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 + idx * 0.1 }}
                    className={`text-center p-4 rounded-lg border-2 ${colorClass} transition-all hover:shadow-lg hover:scale-105`}
                  >
                    <div className="text-3xl font-bold mb-1">
                      {dist.percentage_of_losses.toFixed(1)}%
                    </div>
                    <div className="text-sm font-semibold mb-2">{dist.domain_type}</div>
                    <div className="text-xs opacity-75">
                      {(dist.loss_volume / 1000).toFixed(0)}K volume
                    </div>
                    <div className="mt-2 pt-2 border-t border-current opacity-50">
                      <div className="text-xs">
                        {dist.loss_count.toLocaleString()} kw
                      </div>
                    </div>
                  </motion.div>
                );
              })}
          </div>

          {/* Top Domains Preview */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <Text className="text-sm text-gray-600 mb-3">Top capturing domains by type:</Text>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {lossDistribution.map((dist) => (
                <div key={dist.domain_type} className="text-xs">
                  <span className="font-semibold">{dist.domain_type}:</span>{' '}
                  <span className="text-gray-600">
                    {dist.top_domains?.[0] || 'N/A'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

export default MarketProtectionSnapshot;
