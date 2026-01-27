/**
 * ModifierDetailDrawer component.
 * Shows detailed breakdown when clicking a modifier group row in DataExplorer.
 */

import { useState, useEffect } from 'react';
import { BarChart, DonutChart, Grid } from '@tremor/react';
import { Trophy, Target, TrendingUp, TrendingDown, Loader2, Tag } from 'lucide-react';
import { Drawer } from '../common/Drawer';
import { useMarketConfig } from '../../contexts/MarketConfigContext';
import type { ModifierGroupProtectionBreakdown } from '../../types';
import { getModifierGroupProtectionBreakdown } from '../../api/endpoints';

interface ModifierDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  modifierGroup: string;
  brandName: string;
  context: 'protection' | 'market' | 'opportunity';
}

export function ModifierDetailDrawer({
  isOpen,
  onClose,
  modifierGroup,
  brandName,
  context,
}: ModifierDetailDrawerProps) {
  const { getStyles, getIcon, getTremorColor } = useMarketConfig();
  const [breakdown, setBreakdown] = useState<ModifierGroupProtectionBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'keywords' | 'competitors'>('overview');

  useEffect(() => {
    if (isOpen && modifierGroup && brandName) {
      setLoading(true);
      setError(null);
      getModifierGroupProtectionBreakdown(brandName, modifierGroup, 10)
        .then(setBreakdown)
        .catch((err) => setError(err.message || 'Failed to load data'))
        .finally(() => setLoading(false));
    }
  }, [isOpen, modifierGroup, brandName]);

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

  const prepareTagBarData = () => {
    if (!breakdown) return [];
    return breakdown.top_tags.slice(0, 7).map((t) => ({
      name: t.tag.length > 12 ? t.tag.substring(0, 12) + '...' : t.tag,
      Keywords: t.count,
      'Win Rate': t.win_rate,
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
      title={modifierGroup}
      subtitle="Modifier Group"
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
              getModifierGroupProtectionBreakdown(brandName, modifierGroup, 10)
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

              {/* Top Tags Chart */}
              {breakdown.top_tags.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-4">Top Tags by Keywords</h4>
                  <BarChart
                    data={prepareTagBarData()}
                    index="name"
                    categories={['Keywords']}
                    colors={['blue']}
                    className="h-64"
                    showLegend={false}
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
              {/* Top Tags */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Tags Performance
                </h4>
                <div className="space-y-3">
                  {breakdown.top_tags.slice(0, 10).map((tag) => (
                    <div key={tag.tag} className="flex items-center justify-between">
                      <span className="text-sm text-gray-900">{tag.tag}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">{tag.count} keywords</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            tag.win_rate >= 80
                              ? 'bg-emerald-100 text-emerald-700'
                              : tag.win_rate >= 50
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {tag.win_rate.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Example Keywords */}
              <div className="grid grid-cols-2 gap-4">
                {/* Winners */}
                <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                  <h4 className="text-sm font-semibold text-emerald-700 mb-3">
                    Example Wins ({breakdown.example_winners.length})
                  </h4>
                  <div className="space-y-2">
                    {breakdown.example_winners.slice(0, 8).map((kw, i) => (
                      <div
                        key={i}
                        className="text-sm text-emerald-800 flex items-center justify-between"
                      >
                        <span className="truncate flex-1 mr-2">
                          {kw.keyword}
                        </span>
                        <span className="text-xs text-emerald-600 whitespace-nowrap">
                          {formatVolume(kw.volume)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Losers */}
                <div className="bg-rose-50 rounded-lg p-4 border border-rose-200">
                  <h4 className="text-sm font-semibold text-rose-700 mb-3">
                    Example Losses ({breakdown.example_losers.length})
                  </h4>
                  <div className="space-y-2">
                    {breakdown.example_losers.slice(0, 8).map((kw, i) => (
                      <div key={i} className="text-sm">
                        <div className="text-rose-800 truncate">{kw.keyword}</div>
                        <div className="text-xs text-rose-600">
                          Lost to {kw.winner_domain} (#{kw.winner_position})
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
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

export default ModifierDetailDrawer;
