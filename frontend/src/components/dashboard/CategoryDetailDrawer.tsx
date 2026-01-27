/**
 * CategoryDetailDrawer component.
 * Shows detailed breakdown when clicking a category row in DataExplorer.
 */

import { useState, useEffect } from 'react';
import { BarChart, DonutChart, Grid } from '@tremor/react';
import { Trophy, Target, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { Drawer } from '../common/Drawer';
import { useMarketConfig } from '../../contexts/MarketConfigContext';
import type { CategoryProtectionBreakdown } from '../../types';
import { getCategoryProtectionBreakdown } from '../../api/endpoints';

interface CategoryDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  categoryName: string;
  displayName: string;
  brandName: string;
  context: 'protection' | 'market' | 'opportunity';
}

export function CategoryDetailDrawer({
  isOpen,
  onClose,
  categoryName,
  displayName,
  brandName,
  context,
}: CategoryDetailDrawerProps) {
  const { getStyles, getIcon, getTremorColor } = useMarketConfig();
  const [breakdown, setBreakdown] = useState<CategoryProtectionBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'keywords' | 'competitors'>('overview');

  useEffect(() => {
    if (isOpen && categoryName && brandName) {
      setLoading(true);
      setError(null);
      getCategoryProtectionBreakdown(brandName, categoryName, 10)
        .then(setBreakdown)
        .catch((err) => setError(err.message || 'Failed to load data'))
        .finally(() => setLoading(false));
    }
  }, [isOpen, categoryName, brandName]);

  const formatVolume = (vol: number) => {
    if (vol >= 1000000) return `${(vol / 1000000).toFixed(1)}M`;
    if (vol >= 1000) return `${(vol / 1000).toFixed(0)}K`;
    return vol.toString();
  };

  const getWinRateColor = (winRate: number) => {
    if (winRate >= 80) return 'text-emerald-600';
    if (winRate >= 50) return 'text-amber-600';
    return 'text-rose-600';
  };

  const prepareValueBarData = () => {
    if (!breakdown) return [];
    return breakdown.top_values.slice(0, 7).map((v) => ({
      name: v.value.length > 15 ? v.value.substring(0, 15) + '...' : v.value,
      'Volume Won': v.volume_winning,
      'Volume Lost': v.volume_losing,
    }));
  };

  const prepareDonutData = () => {
    if (!breakdown) return [];
    return breakdown.loss_distribution_by_type.map((d) => ({
      name: d.domain_type,
      value: d.loss_volume,
    }));
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'keywords', label: 'Keywords' },
    { id: 'competitors', label: 'Competitors' },
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
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              getCategoryProtectionBreakdown(brandName, categoryName, 10)
                .then(setBreakdown)
                .catch((err) => setError(err.message))
                .finally(() => setLoading(false));
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
              <Grid numItems={4} className="gap-3">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                    <Trophy className="h-3.5 w-3.5" />
                    Win Rate
                  </div>
                  <div className={`text-2xl font-bold ${getWinRateColor(breakdown.win_rate)}`}>
                    {breakdown.win_rate.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                    <Target className="h-3.5 w-3.5" />
                    Avg Position
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    #{breakdown.avg_brand_position?.toFixed(1) || 'N/A'}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 text-emerald-500 text-xs mb-1">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Won
                  </div>
                  <div className="text-2xl font-bold text-emerald-600">
                    {breakdown.keywords_winning}
                    <span className="text-sm font-normal text-gray-500 ml-1">
                      / {formatVolume(breakdown.volume_winning)}
                    </span>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 text-rose-500 text-xs mb-1">
                    <TrendingDown className="h-3.5 w-3.5" />
                    Lost
                  </div>
                  <div className="text-2xl font-bold text-rose-600">
                    {breakdown.keywords_losing}
                    <span className="text-sm font-normal text-gray-500 ml-1">
                      / {formatVolume(breakdown.volume_losing)}
                    </span>
                  </div>
                </div>
              </Grid>

              {/* Volume Distribution Chart */}
              {breakdown.top_values.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-4">Volume by Value</h4>
                  <BarChart
                    data={prepareValueBarData()}
                    index="name"
                    categories={['Volume Won', 'Volume Lost']}
                    colors={['emerald', 'rose']}
                    valueFormatter={(v) => formatVolume(v)}
                    stack={true}
                    className="h-64"
                    showLegend={true}
                  />
                </div>
              )}

              {/* Loss Distribution Donut */}
              {breakdown.loss_distribution_by_type.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-4">Who Beats You</h4>
                  <DonutChart
                    data={prepareDonutData()}
                    category="value"
                    index="name"
                    valueFormatter={(v) => formatVolume(v)}
                    colors={breakdown.loss_distribution_by_type.map((d) =>
                      getTremorColor(d.domain_type)
                    )}
                    className="h-48"
                    showLabel={true}
                  />
                </div>
              )}
            </div>
          )}

          {/* Keywords Tab */}
          {activeTab === 'keywords' && (
            <div className="space-y-4">
              {breakdown.top_values.map((value) => (
                <div key={value.value} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-gray-900">{value.value}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        value.win_rate >= 80
                          ? 'bg-emerald-100 text-emerald-700'
                          : value.win_rate >= 50
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {value.win_rate.toFixed(0)}% win rate
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500"
                        style={{ width: `${(value.volume_winning / value.total_volume) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatVolume(value.volume_winning)} / {formatVolume(value.total_volume)}
                    </span>
                  </div>

                  {/* Example Keywords */}
                  <div className="flex flex-wrap gap-1.5">
                    {value.example_winners.slice(0, 3).map((kw, i) => (
                      <span
                        key={`w-${i}`}
                        className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700"
                      >
                        {kw.keyword.length > 25 ? kw.keyword.substring(0, 25) + '...' : kw.keyword}
                      </span>
                    ))}
                    {value.example_losers.slice(0, 3).map((kw, i) => (
                      <span
                        key={`l-${i}`}
                        className="text-xs px-2 py-0.5 rounded bg-rose-50 text-rose-700"
                        title={`Lost to ${kw.winner_domain}`}
                      >
                        {kw.keyword.length > 25 ? kw.keyword.substring(0, 25) + '...' : kw.keyword}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Competitors Tab */}
          {activeTab === 'competitors' && (
            <div className="space-y-4">
              {Object.entries(breakdown.competitors_by_type).map(([type, competitors]) => {
                const styles = getStyles(type);
                const Icon = getIcon(type);

                return (
                  <div key={type} className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${styles.textColor}`} />
                      {type}
                    </h4>
                    {competitors.slice(0, 5).map((comp, i) => (
                      <div
                        key={`${type}-${i}`}
                        className={`flex items-center justify-between p-3 rounded-lg ${styles.bgColor}`}
                      >
                        <div>
                          <div className={`text-sm font-medium ${styles.textColor}`}>
                            {comp.domain}
                          </div>
                          <div className="text-xs text-gray-500">
                            {comp.wins_count} wins | {formatVolume(comp.wins_volume)} volume
                          </div>
                        </div>
                        <span className="text-sm font-medium text-gray-600">
                          #{comp.avg_position.toFixed(1)}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })}
              {Object.keys(breakdown.competitors_by_type).length === 0 && (
                <div className="text-center py-8 text-gray-500">No competitor data available</div>
              )}
            </div>
          )}
        </div>
      ) : null}
    </Drawer>
  );
}

export default CategoryDetailDrawer;
