/**
 * MarketModifierDrawer component.
 * Shows market-wide modifier group breakdown (not brand-specific).
 */

import { useState, useEffect } from 'react';
import { BarChart, Grid } from '@tremor/react';
import { Tag, Loader2 } from 'lucide-react';
import { Drawer } from '../common/Drawer';
import { useMarketConfig } from '../../contexts/MarketConfigContext';
import type { ModifierGroupBreakdown } from '../../types';
import { getModifierGroupMarketBreakdown } from '../../api/endpoints';

interface MarketModifierDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  modifierGroup: string;
}

export function MarketModifierDrawer({
  isOpen,
  onClose,
  modifierGroup,
}: MarketModifierDrawerProps) {
  const { getStyles, getIcon, getDomainTypeNames } = useMarketConfig();
  const [breakdown, setBreakdown] = useState<ModifierGroupBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'tags' | 'players'>('overview');

  useEffect(() => {
    if (isOpen && modifierGroup) {
      setLoading(true);
      setError(null);
      getModifierGroupMarketBreakdown(modifierGroup, 15)
        .then(setBreakdown)
        .catch((err) => setError(err.message || 'Failed to load data'))
        .finally(() => setLoading(false));
    }
  }, [isOpen, modifierGroup]);

  const formatVolume = (vol: number) => {
    if (vol >= 1000000) return `${(vol / 1000000).toFixed(1)}M`;
    if (vol >= 1000) return `${(vol / 1000).toFixed(0)}K`;
    return vol.toString();
  };

  const prepareTagBarData = () => {
    if (!breakdown) return [];
    return breakdown.top_tags.slice(0, 8).map((t) => ({
      name: typeof t === 'object' ? (t.tag?.length > 12 ? t.tag.substring(0, 12) + '...' : t.tag) : String(t),
      Keywords: typeof t === 'object' ? t.count : 0,
    }));
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'tags', label: 'Tags' },
    { id: 'players', label: 'Top Players' },
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
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              getModifierGroupMarketBreakdown(modifierGroup, 15)
                .then(setBreakdown)
                .catch((err) => setError(err.message))
                .finally(() => setLoading(false));
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
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
                  <div className="text-2xl font-bold text-purple-600">
                    {breakdown.total_keywords.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">Keywords</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {formatVolume(breakdown.total_volume)}
                  </div>
                  <div className="text-xs text-gray-500">Total Volume</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {breakdown.top_tags?.length || 0}
                  </div>
                  <div className="text-xs text-gray-500">Tags</div>
                </div>
              </Grid>

              {/* Top Tags Chart */}
              {breakdown.top_tags && breakdown.top_tags.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <Tag className="h-4 w-4 text-purple-600" />
                    Keywords by Tag
                  </h4>
                  <BarChart
                    data={prepareTagBarData()}
                    index="name"
                    categories={['Keywords']}
                    colors={['violet']}
                    className="h-64"
                    showLegend={false}
                  />
                </div>
              )}

              {/* Example Keywords */}
              {breakdown.example_keywords && breakdown.example_keywords.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Example Keywords</h4>
                  <div className="flex flex-wrap gap-2">
                    {breakdown.example_keywords.slice(0, 12).map((kw, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 text-sm bg-purple-50 text-purple-700 rounded-lg border border-purple-200"
                      >
                        {typeof kw === 'object' ? kw.keyword : kw}
                        {typeof kw === 'object' && kw.volume && (
                          <span className="text-xs text-purple-500 ml-1">
                            ({formatVolume(kw.volume)})
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tags Tab */}
          {activeTab === 'tags' && (
            <div className="space-y-2">
              {breakdown.top_tags?.map((tag, i) => {
                const tagData = typeof tag === 'object' ? tag : { tag: String(tag), count: 0 };
                const maxCount = typeof breakdown.top_tags[0] === 'object'
                  ? breakdown.top_tags[0].count
                  : 1;
                const percentage = (tagData.count / maxCount) * 100;

                return (
                  <div
                    key={i}
                    className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{tagData.tag}</span>
                      <span className="text-sm text-purple-600">{tagData.count} keywords</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {(!breakdown.top_tags || breakdown.top_tags.length === 0) && (
                <div className="text-center py-8 text-gray-500">No tag data available</div>
              )}
            </div>
          )}

          {/* Players Tab */}
          {activeTab === 'players' && (
            <div className="space-y-4">
              {getDomainTypeNames().map((type) => {
                const players = breakdown.top_players_by_type?.[type] || [];
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
              {Object.keys(breakdown.top_players_by_type || {}).length === 0 && (
                <div className="text-center py-8 text-gray-500">No player data available</div>
              )}
            </div>
          )}
        </div>
      ) : null}
    </Drawer>
  );
}

export default MarketModifierDrawer;
