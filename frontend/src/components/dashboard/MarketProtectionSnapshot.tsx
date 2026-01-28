/**
 * Market Protection Snapshot Component
 * Displays overall brand protection health metrics and loss distribution
 * Uses dynamic domain types from market configuration.
 */

import { motion } from 'framer-motion';
import { Shield, AlertTriangle, TrendingDown, Users, PieChart } from 'lucide-react';
import type { MarketProtectionKPIs, MarketLossDistribution } from '../../types';
import { useMarketConfig } from '../../contexts/MarketConfigContext';

interface MarketProtectionSnapshotProps {
  kpis: MarketProtectionKPIs;
  lossDistribution: MarketLossDistribution[];
}

export function MarketProtectionSnapshot({ kpis, lossDistribution }: MarketProtectionSnapshotProps) {
  const { getStyles } = useMarketConfig();

  // Determine market health status
  const getHealthStatus = (avgWinRate: number) => {
    if (avgWinRate >= 50) return { label: 'Healthy', color: 'emerald' };
    if (avgWinRate >= 30) return { label: 'Moderate', color: 'yellow' };
    return { label: 'At Risk', color: 'red' };
  };

  const healthStatus = getHealthStatus(kpis.average_win_rate ?? 0);

  // Helper to get combined class for domain type
  const getDomainTypeClasses = (domainType: string): string => {
    const styles = getStyles(domainType);
    return `${styles.textColor} ${styles.bgColor} ${styles.borderColor}`;
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Average Win Rate */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="rounded-xl border border-gray-200 p-6 h-full">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Shield className="h-4 w-4" />
              </div>
              <p className="text-sm text-muted-foreground">Average Win Rate</p>
            </div>
            <div className="text-2xl font-semibold text-emerald-600 mt-2">
              {(kpis.average_win_rate ?? 0).toFixed(1)}%
            </div>
            <p className="text-sm text-gray-500 mt-1">
              across {kpis.total_brands ?? 0} brands
            </p>
            <div className="mt-3 pt-3 border-t border-gray-200">
              <span className={`text-xs font-medium px-2 py-1 rounded-full bg-${healthStatus.color}-50 text-${healthStatus.color}-600`}>
                {healthStatus.label}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Total Volume at Risk */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="rounded-xl border border-gray-200 p-6 h-full">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <p className="text-sm text-muted-foreground">Volume at Risk</p>
            </div>
            <div className="text-2xl font-semibold text-red-600 mt-2">
              {((kpis.total_volume_losing ?? 0) / 1000000).toFixed(1)}M
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {(kpis.total_keywords_losing ?? 0).toLocaleString()} keywords
            </p>
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full"
                  style={{
                    width: `${kpis.total_branded_volume ? ((kpis.total_volume_losing ?? 0) / kpis.total_branded_volume) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Median Win Rate */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="rounded-xl border border-gray-200 p-6 h-full">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <TrendingDown className="h-4 w-4" />
              </div>
              <p className="text-sm text-muted-foreground">Median Win Rate</p>
            </div>
            <div className="text-2xl font-semibold text-blue-600 mt-2">
              {(kpis.median_win_rate ?? 0).toFixed(1)}%
            </div>
            <p className="text-sm text-gray-500 mt-1">
              50% of brands
            </p>
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-600">
                {(kpis.median_win_rate ?? 0) < (kpis.average_win_rate ?? 0)
                  ? 'Few brands dominate'
                  : 'Balanced distribution'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Total Brands */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="rounded-xl border border-gray-200 p-6 h-full">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
              <p className="text-sm text-muted-foreground">Total Brands</p>
            </div>
            <div className="text-2xl font-semibold text-purple-600 mt-2">
              {kpis.total_brands ?? 0}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {(kpis.total_branded_keywords ?? 0).toLocaleString()} keywords
            </p>
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-600">
                Avg {kpis.total_brands ? Math.round((kpis.total_branded_keywords ?? 0) / kpis.total_brands) : 0} kw/brand
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Loss Distribution */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Who Captures Brand Traffic</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Distribution of #1 rankings on branded keywords
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {lossDistribution
              .sort((a, b) => b.percentage_of_losses - a.percentage_of_losses)
              .map((dist, idx) => {
                const colorClass = getDomainTypeClasses(dist.domain_type);

                return (
                  <motion.div
                    key={dist.domain_type}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 + idx * 0.03 }}
                    className={`text-center p-4 rounded-lg border ${colorClass} transition-all hover:border-gray-300`}
                  >
                    <div className="text-2xl font-semibold mb-1">
                      {(dist.percentage_of_losses ?? 0).toFixed(1)}%
                    </div>
                    <div className="text-sm font-medium mb-2">{dist.domain_type}</div>
                    <div className="text-xs opacity-75">
                      {((dist.loss_volume ?? 0) / 1000).toFixed(0)}K volume
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
            <p className="text-sm text-muted-foreground mb-3">Top capturing domains by type:</p>
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
        </div>
      </motion.div>
    </div>
  );
}

export default MarketProtectionSnapshot;
