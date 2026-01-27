/**
 * MarketCategoryDrawer component.
 * Shows market-wide category breakdown (not brand-specific).
 */

import { useState, useEffect } from 'react';
import { BarChart, DonutChart, Grid, ProgressBar } from '@tremor/react';
import { TrendingUp, Loader2, Tag } from 'lucide-react';
import { Drawer } from '../common/Drawer';
import { useMarketConfig } from '../../contexts/MarketConfigContext';
import type { CategoryBreakdown } from '../../types';
import { getCategoryMarketBreakdown } from '../../api/endpoints';

interface MarketCategoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  categoryName: string;
  displayName: string;
}

export function MarketCategoryDrawer({
  isOpen,
  onClose,
  categoryName,
  displayName,
}: MarketCategoryDrawerProps) {
  const { getStyles, getIcon, getDomainTypeNames } = useMarketConfig();
  const [breakdown, setBreakdown] = useState<CategoryBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'values' | 'players'>('overview');

  useEffect(() => {
    if (isOpen && categoryName) {
      setLoading(true);
      setError(null);
      getCategoryMarketBreakdown(categoryName, 15)
        .then(setBreakdown)
        .catch((err) => setError(err.message || 'Failed to load data'))
        .finally(() => setLoading(false));
    }
  }, [isOpen, categoryName]);

  const formatVolume = (vol: number) => {
    if (vol >= 1000000) return `${(vol / 1000000).toFixed(1)}M`;
    if (vol >= 1000) return `${(vol / 1000).toFixed(0)}K`;
    return vol.toString();
  };

  const prepareBarData = () => {
    if (!breakdown) return [];
    return breakdown.top_values.slice(0, 8).map((v) => ({
      name: v.value.length > 12 ? v.value.substring(0, 12) + '...' : v.value,
      Volume: v.total_volume,
    }));
  };

  const prepareDonutData = () => {
    if (!breakdown) return [];
    const data: { name: string; value: number }[] = [];
    const types = getDomainTypeNames();

    types.forEach((type) => {
      const players = breakdown.top_players_by_type[type] || [];
      const totalVisibility = players.reduce((sum, p) => sum + (p.visibility_score || 0), 0);
      if (totalVisibility > 0) {
        data.push({ name: type, value: Math.round(totalVisibility) });
      }
    });

    return data;
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'values', label: 'Values' },
    { id: 'players', label: 'Top Players' },
  ] as const;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={displayName}
      subtitle={`Category: ${categoryName}`}
      size="lg"
    >
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              getCategoryMarketBreakdown(categoryName, 15)
                .then(setBreakdown)
                .catch((err) => setError(err.message))
                .finally(() => setLoading(false));
            }}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            Retry
          </button>
        </div>
      ) : breakdown ? (
        <div className="space-y-6">
          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick Stats */}
              <Grid numItems={3} className="gap-4">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-center">
                  <div className="text-2xl font-bold text-emerald-600">
                    {breakdown.total_keywords.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">Keywords</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-center">
                  <div className="text-2xl font-bold text-emerald-600">
                    {formatVolume(breakdown.total_volume)}
                  </div>
                  <div className="text-xs text-gray-500">Total Volume</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-center">
                  <div className="text-2xl font-bold text-emerald-600">
                    {breakdown.top_values.length}
                  </div>
                  <div className="text-xs text-gray-500">Values</div>
                </div>
              </Grid>

              {/* Volume Distribution Chart */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  Volume by Value
                </h4>
                <BarChart
                  data={prepareBarData()}
                  index="name"
                  categories={['Volume']}
                  colors={['emerald']}
                  valueFormatter={(v) => formatVolume(v)}
                  className="h-64"
                  showLegend={false}
                />
              </div>

              {/* Domain Type Distribution */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-4">
                  Market Share by Domain Type
                </h4>
                <DonutChart
                  data={prepareDonutData()}
                  category="value"
                  index="name"
                  colors={['blue', 'violet', 'amber', 'teal']}
                  valueFormatter={(v) => formatVolume(v)}
                  className="h-48"
                  showLabel={true}
                />
              </div>
            </div>
          )}

          {/* Values Tab */}
          {activeTab === 'values' && (
            <div className="space-y-3">
              {breakdown.top_values.map((value) => {
                const maxVolume = breakdown.top_values[0]?.total_volume || 1;
                const percentage = (value.total_volume / maxVolume) * 100;

                return (
                  <div
                    key={value.value}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{value.value}</span>
                      <span className="font-semibold text-emerald-600">
                        {formatVolume(value.total_volume)}
                      </span>
                    </div>
                    <ProgressBar value={percentage} color="emerald" className="mb-2" />
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{value.keyword_count.toLocaleString()} keywords</span>
                      <span>{percentage.toFixed(0)}% of category</span>
                    </div>

                    {/* Example Keywords */}
                    {value.example_keywords && value.example_keywords.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {value.example_keywords.slice(0, 4).map((kw, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 text-xs bg-emerald-50 text-emerald-700 rounded border border-emerald-200"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Players Tab */}
          {activeTab === 'players' && (
            <div className="space-y-4">
              {getDomainTypeNames().map((type) => {
                const players = breakdown.top_players_by_type[type] || [];
                if (players.length === 0) return null;

                const styles = getStyles(type);
                const Icon = getIcon(type);

                return (
                  <div key={type} className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${styles.textColor}`} />
                      {type}
                    </h4>
                    {players.slice(0, 5).map((player, i) => (
                      <div
                        key={`${type}-${i}`}
                        className={`flex items-center justify-between p-3 rounded-lg ${styles.bgColor} border ${styles.borderColor}`}
                      >
                        <div>
                          <div className={`font-medium ${styles.textColor}`}>
                            {player.domain}
                          </div>
                          <div className="text-xs text-gray-500">
                            {player.win_count} wins | {formatVolume(player.visibility_score || 0)}{' '}
                            visibility
                          </div>
                        </div>
                        <span className="text-sm font-medium text-gray-600">
                          #{player.avg_position?.toFixed(1) || 'N/A'}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </Drawer>
  );
}

export default MarketCategoryDrawer;
