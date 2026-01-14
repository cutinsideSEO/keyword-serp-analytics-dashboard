/**
 * Modifier Group Explorer Component
 * Full accordion-style explorer with detailed breakdowns, charts, and visualizations
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Title, Text, BarChart, DonutChart, Grid, ProgressBar } from '@tremor/react';
import { Tag, ChevronRight, ChevronDown, BarChart3, Loader2, Hash } from 'lucide-react';
import type { ModifierGroupMarketStats, ModifierGroupBreakdown, DomainVisibilityItem } from '../../types';
import { getModifierGroupMarketBreakdown } from '../../api/endpoints';
import { useMarketConfig } from '../../contexts/MarketConfigContext';

interface ModifierGroupExplorerProps {
  data: ModifierGroupMarketStats[];
}

const ITEMS_PER_PAGE = 12;

export function ModifierGroupExplorer({ data }: ModifierGroupExplorerProps) {
  const { getStyles, getIcon, getTremorColor, getDomainTypeNames } = useMarketConfig();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [groupBreakdowns, setGroupBreakdowns] = useState<Record<string, ModifierGroupBreakdown>>({});
  const [loadingGroups, setLoadingGroups] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  const toggleGroup = async (modifierGroup: string) => {
    const isExpanded = expandedGroups.has(modifierGroup);
    const newExpanded = new Set(expandedGroups);

    if (isExpanded) {
      newExpanded.delete(modifierGroup);
    } else {
      newExpanded.add(modifierGroup);

      // Load breakdown if not already loaded
      if (!groupBreakdowns[modifierGroup]) {
        setLoadingGroups(new Set([...loadingGroups, modifierGroup]));
        try {
          const breakdown = await getModifierGroupMarketBreakdown(modifierGroup, 15);
          setGroupBreakdowns({ ...groupBreakdowns, [modifierGroup]: breakdown });
        } catch (error) {
          console.error(`Failed to load breakdown for ${modifierGroup}:`, error);
        } finally {
          const newLoading = new Set(loadingGroups);
          newLoading.delete(modifierGroup);
          setLoadingGroups(newLoading);
        }
      }
    }

    setExpandedGroups(newExpanded);
  };

  const formatVolume = (vol: number) => {
    if (vol >= 1000000) return `${(vol / 1000000).toFixed(1)}M`;
    if (vol >= 1000) return `${(vol / 1000).toFixed(0)}K`;
    return vol.toString();
  };

  // Prepare donut chart data from top_players_by_type
  const prepareDonutData = (breakdown: ModifierGroupBreakdown) => {
    const chartData: { name: string; value: number }[] = [];
    const types = getDomainTypeNames();

    types.forEach(type => {
      const players = breakdown.top_players_by_type[type] || [];
      const totalVisibility = players.reduce((sum, p) => sum + (p.visibility_score || 0), 0);
      if (totalVisibility > 0) {
        chartData.push({ name: type, value: Math.round(totalVisibility) });
      }
    });

    return chartData;
  };

  // Prepare bar chart data from top_tags
  const prepareTagBarData = (tags: Array<{ tag: string; count: number }>) => {
    return tags.slice(0, 8).map(t => ({
      name: t.tag.length > 20 ? t.tag.substring(0, 20) + '...' : t.tag,
      Count: t.count,
    }));
  };

  // Prepare keywords bar data
  const prepareKeywordBarData = (keywords: Array<{ keyword: string; volume: number }>) => {
    return keywords.slice(0, 6).map(kw => ({
      name: kw.keyword.length > 25 ? kw.keyword.substring(0, 25) + '...' : kw.keyword,
      Volume: kw.volume,
    }));
  };

  return (
    <Card className="overflow-visible">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Tag className="h-5 w-5 text-purple-600" />
        </div>
        <div>
          <Title>Modifier Group Analysis</Title>
          <Text className="text-gray-500">{data.length} modifier groups tracked - click to explore</Text>
        </div>
      </div>

      <div className="space-y-3">
        {data.slice(0, visibleCount).map((group, idx) => {
          const isExpanded = expandedGroups.has(group.modifier_group);
          const isLoading = loadingGroups.has(group.modifier_group);
          const breakdown = groupBreakdowns[group.modifier_group];

          return (
            <motion.div
              key={group.modifier_group}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="border-2 border-gray-200 rounded-xl overflow-hidden hover:border-purple-300 transition-colors"
            >
              {/* Group Header - Clickable */}
              <button
                onClick={() => toggleGroup(group.modifier_group)}
                className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
                      isExpanded
                        ? 'bg-gradient-to-br from-purple-500 to-purple-600'
                        : 'bg-gradient-to-br from-purple-400 to-purple-500'
                    } text-white`}>
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {group.modifier_group || '(no modifiers)'}
                      </h4>
                      <p className="text-xs text-gray-500">
                        Keyword modifier combination
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">
                        {group.total_keywords.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">keywords</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-purple-600 flex items-center justify-end gap-1">
                        <BarChart3 className="h-4 w-4" />
                        {formatVolume(group.total_volume)}
                      </div>
                      <div className="text-xs text-gray-500">volume</div>
                    </div>
                  </div>
                </div>

                {/* Preview badges when collapsed */}
                {!isExpanded && group.top_tags_preview && group.top_tags_preview.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {group.top_tags_preview.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="inline-block px-2 py-0.5 text-xs bg-purple-50 text-purple-700 rounded border border-purple-200"
                      >
                        {tag}
                      </span>
                    ))}
                    {group.top_tags_preview.length > 4 && (
                      <span className="inline-block px-2 py-0.5 text-xs text-gray-500">
                        +more
                      </span>
                    )}
                  </div>
                )}
              </button>

              {/* Expanded Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="border-t border-gray-200 bg-gray-50"
                  >
                    {isLoading ? (
                      <div className="p-8 text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-purple-500 mx-auto mb-2" />
                        <Text className="text-gray-500">Loading modifier group breakdown...</Text>
                      </div>
                    ) : breakdown ? (
                      <div className="p-4">
                        <Grid numItems={1} numItemsLg={2} className="gap-6">
                          {/* Left Column - Tags and Keywords */}
                          <div className="space-y-6">
                            {/* Tag Distribution Chart */}
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <h5 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                <Hash className="h-4 w-4 text-purple-600" />
                                Tag Distribution
                              </h5>
                              {breakdown.top_tags && breakdown.top_tags.length > 0 ? (
                                <BarChart
                                  data={prepareTagBarData(breakdown.top_tags)}
                                  index="name"
                                  categories={['Count']}
                                  colors={['violet']}
                                  valueFormatter={(v) => v.toLocaleString()}
                                  showLegend={false}
                                  showGridLines={false}
                                  className="h-48"
                                />
                              ) : (
                                <div className="h-48 flex items-center justify-center text-gray-400">
                                  No tag data available
                                </div>
                              )}
                            </div>

                            {/* Top Tags Detail */}
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <h5 className="font-semibold text-gray-800 mb-3">Common Tags</h5>
                              {breakdown.top_tags && breakdown.top_tags.length > 0 ? (
                                <div className="space-y-2">
                                  {breakdown.top_tags.slice(0, 8).map((tag, tIdx) => {
                                    const maxCount = breakdown.top_tags[0]?.count || 1;
                                    const percentage = (tag.count / maxCount) * 100;

                                    return (
                                      <div key={tag.tag} className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-sm font-medium text-gray-800 truncate max-w-[200px]">
                                            {tag.tag}
                                          </span>
                                          <span className="text-xs font-bold text-purple-600 ml-2">
                                            {tag.count.toLocaleString()}
                                          </span>
                                        </div>
                                        <ProgressBar value={percentage} color="violet" className="h-1.5" />
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="text-center text-gray-400 py-4">No tags found</div>
                              )}
                            </div>

                            {/* Example Keywords with Volume Chart */}
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <h5 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 text-purple-600" />
                                Top Keywords by Volume
                              </h5>
                              {breakdown.example_keywords && breakdown.example_keywords.length > 0 ? (
                                <>
                                  <BarChart
                                    data={prepareKeywordBarData(breakdown.example_keywords)}
                                    index="name"
                                    categories={['Volume']}
                                    colors={['fuchsia']}
                                    valueFormatter={(v) => formatVolume(v)}
                                    showLegend={false}
                                    showGridLines={false}
                                    className="h-40"
                                  />
                                  <div className="mt-3 space-y-1">
                                    {breakdown.example_keywords.slice(0, 5).map((kw, kwIdx) => (
                                      <div
                                        key={kwIdx}
                                        className="flex items-center justify-between py-1 px-2 bg-purple-50 rounded text-sm"
                                      >
                                        <span className="text-gray-700 truncate max-w-[250px]">{kw.keyword}</span>
                                        <span className="text-purple-600 font-medium ml-2">
                                          {formatVolume(kw.volume)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </>
                              ) : (
                                <div className="h-40 flex items-center justify-center text-gray-400">
                                  No keyword examples available
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right Column - Domain Type Analysis */}
                          <div className="space-y-6">
                            {/* Domain Type Distribution */}
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <h5 className="font-semibold text-gray-800 mb-3">Market Share by Domain Type</h5>
                              <DonutChart
                                data={prepareDonutData(breakdown)}
                                category="value"
                                index="name"
                                colors={getDomainTypeNames().map(type => getTremorColor(type))}
                                valueFormatter={(v) => formatVolume(v)}
                                className="h-48"
                                showLabel={true}
                                label={`${breakdown.top_tags?.length || 0} tags`}
                              />
                            </div>

                            {/* Domain Leaders */}
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <h5 className="font-semibold text-gray-800 mb-3">Top Players by Type</h5>
                              <div className="space-y-3">
                                {getDomainTypeNames().map((type) => {
                                  const players = breakdown.top_players_by_type[type] || [];
                                  const topPlayer = players[0];
                                  const styles = getStyles(type);
                                  const Icon = getIcon(type);

                                  if (!topPlayer) return null;

                                  return (
                                    <div
                                      key={type}
                                      className={`p-3 rounded-lg border ${styles.bgColor} ${styles.borderColor}`}
                                    >
                                      <div className="flex items-center gap-2 mb-1">
                                        <Icon className={`h-4 w-4 ${styles.textColor}`} />
                                        <span className={`text-xs font-medium ${styles.textColor}`}>{type}</span>
                                      </div>
                                      <div className="font-semibold text-gray-900 truncate">
                                        {topPlayer.domain.replace('www.', '')}
                                      </div>
                                      <div className="flex items-center justify-between mt-1 text-xs text-gray-600">
                                        <span>{formatVolume(topPlayer.visibility_score)} visibility</span>
                                        <span>{topPlayer.win_count} #1 wins</span>
                                      </div>
                                      {/* Show more players */}
                                      {players.length > 1 && (
                                        <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
                                          {players.slice(1, 3).map((player) => (
                                            <div
                                              key={player.domain}
                                              className="flex items-center justify-between text-xs text-gray-500"
                                            >
                                              <span className="truncate max-w-[120px]">
                                                {player.domain.replace('www.', '')}
                                              </span>
                                              <span>{formatVolume(player.visibility_score)}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Quick Stats */}
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <h5 className="font-semibold text-gray-800 mb-3">Quick Stats</h5>
                              <Grid numItems={2} className="gap-3">
                                <div className="text-center p-3 bg-purple-50 rounded-lg">
                                  <div className="text-xs text-purple-600 font-medium">Keywords</div>
                                  <div className="text-xl font-bold text-purple-700">
                                    {breakdown.total_keywords.toLocaleString()}
                                  </div>
                                </div>
                                <div className="text-center p-3 bg-purple-50 rounded-lg">
                                  <div className="text-xs text-purple-600 font-medium">Volume</div>
                                  <div className="text-xl font-bold text-purple-700">
                                    {formatVolume(breakdown.total_volume)}
                                  </div>
                                </div>
                                <div className="text-center p-3 bg-purple-50 rounded-lg">
                                  <div className="text-xs text-purple-600 font-medium">Tags</div>
                                  <div className="text-xl font-bold text-purple-700">
                                    {breakdown.top_tags?.length || 0}
                                  </div>
                                </div>
                                <div className="text-center p-3 bg-purple-50 rounded-lg">
                                  <div className="text-xs text-purple-600 font-medium">Domain Types</div>
                                  <div className="text-xl font-bold text-purple-700">
                                    {Object.keys(breakdown.top_players_by_type).filter(
                                      (k) => breakdown.top_players_by_type[k]?.length > 0
                                    ).length}
                                  </div>
                                </div>
                              </Grid>
                            </div>
                          </div>
                        </Grid>
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <Text className="text-gray-500">No data available</Text>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 pt-6 border-t border-gray-200"
      >
        <Grid numItems={3} className="gap-4">
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-xs text-purple-600 font-medium mb-1">Total Groups</div>
            <div className="text-2xl font-bold text-purple-700">{data.length}</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-xs text-purple-600 font-medium mb-1">Total Keywords</div>
            <div className="text-2xl font-bold text-purple-700">
              {data.reduce((sum, g) => sum + g.total_keywords, 0).toLocaleString()}
            </div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-xs text-purple-600 font-medium mb-1">Total Volume</div>
            <div className="text-2xl font-bold text-purple-700">
              {formatVolume(data.reduce((sum, g) => sum + g.total_volume, 0))}
            </div>
          </div>
        </Grid>

        {data.length > ITEMS_PER_PAGE && (
          <div className="mt-4 flex items-center justify-center gap-4">
            <p className="text-sm text-gray-500">
              Showing {Math.min(visibleCount, data.length)} of {data.length} modifier groups
            </p>
            <div className="flex gap-2">
              {visibleCount < data.length && (
                <button
                  onClick={() => setVisibleCount(prev => Math.min(prev + ITEMS_PER_PAGE, data.length))}
                  className="px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors"
                >
                  See More (+{Math.min(ITEMS_PER_PAGE, data.length - visibleCount)})
                </button>
              )}
              {visibleCount > ITEMS_PER_PAGE && (
                <button
                  onClick={() => setVisibleCount(ITEMS_PER_PAGE)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                >
                  Show Less
                </button>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </Card>
  );
}

export default ModifierGroupExplorer;
