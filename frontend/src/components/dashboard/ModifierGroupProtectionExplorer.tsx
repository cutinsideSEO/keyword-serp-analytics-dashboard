/**
 * Modifier Group Protection Explorer Component
 * Interactive accordion explorer for modifier group performance in brand protection context
 * Shows win/loss breakdown, tag performance, competitors by type, and domain type distribution
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Title, Text, BarChart, DonutChart, Grid } from '@tremor/react';
import {
  Target, ChevronRight, ChevronDown, TrendingUp, TrendingDown,
  Building2, ShoppingCart, MessageCircle, Newspaper, Loader2,
  Trophy, Tag, Award
} from 'lucide-react';
import type {
  ModifierGroupStats,
  ModifierGroupProtectionBreakdown,
  TagProtectionStats,
  CategoryCompetitor,
  DomainTypeLossDetail
} from '../../types';
import { getModifierGroupProtectionBreakdown } from '../../api/endpoints';
import { InfoTooltip } from '../common/InfoTooltip';

interface ModifierGroupProtectionExplorerProps {
  modifierGroups: ModifierGroupStats[];
  brandName: string;
}

// Domain type icons and colors
const domainTypeConfig: Record<string, {
  icon: typeof Building2;
  color: string;
  bgColor: string;
  textColor: string;
  chartColor: string;
}> = {
  Brand: { icon: Building2, color: 'blue', bgColor: 'bg-blue-50', textColor: 'text-blue-700', chartColor: '#3b82f6' },
  Reseller: { icon: ShoppingCart, color: 'purple', bgColor: 'bg-purple-50', textColor: 'text-purple-700', chartColor: '#8b5cf6' },
  UGC: { icon: MessageCircle, color: 'amber', bgColor: 'bg-amber-50', textColor: 'text-amber-700', chartColor: '#f59e0b' },
  '3rd Party': { icon: Newspaper, color: 'teal', bgColor: 'bg-teal-50', textColor: 'text-teal-700', chartColor: '#14b8a6' },
  Unknown: { icon: Target, color: 'gray', bgColor: 'bg-gray-50', textColor: 'text-gray-700', chartColor: '#6b7280' },
};

const ITEMS_PER_PAGE = 12;

export function ModifierGroupProtectionExplorer({ modifierGroups, brandName }: ModifierGroupProtectionExplorerProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [groupBreakdowns, setGroupBreakdowns] = useState<Record<string, ModifierGroupProtectionBreakdown>>({});
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
          const breakdown = await getModifierGroupProtectionBreakdown(brandName, modifierGroup, 10);
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

  // Prepare bar chart data for top tags with win rate
  const prepareTagBarData = (tags: TagProtectionStats[]) => {
    return tags.slice(0, 8).map(t => {
      const displayName = t.tag.includes(':') ? t.tag.split(':')[1] : t.tag;
      return {
        name: displayName.length > 12 ? displayName.substring(0, 12) + '...' : displayName,
        Count: t.count,
        'Win Rate': t.win_rate,
      };
    });
  };

  // Prepare donut chart data from loss distribution
  const prepareDonutData = (distribution: DomainTypeLossDetail[]) => {
    return distribution.map(d => ({
      name: d.domain_type,
      value: d.loss_volume,
    }));
  };

  // Get win rate color
  const getWinRateColor = (winRate: number) => {
    if (winRate >= 80) return 'bg-emerald-100 text-emerald-700';
    if (winRate >= 50) return 'bg-amber-100 text-amber-700';
    return 'bg-rose-100 text-rose-700';
  };

  // Get win rate text color
  const getWinRateTextColor = (winRate: number) => {
    if (winRate >= 80) return 'text-emerald-600';
    if (winRate >= 50) return 'text-amber-600';
    return 'text-rose-600';
  };

  return (
    <Card className="overflow-visible">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Target className="h-5 w-5 text-purple-600" />
        </div>
        <div>
          <Title className="flex items-center gap-2">
            Modifier Group Performance
            <InfoTooltip
              title="Modifier Group Performance"
              description="See how your brand performs across different modifier groups (keyword types). Click any group to see detailed win/loss breakdown, top tags, and which competitors beat you."
              calculation="Win Rate = (Keywords where you rank #1) / (Total keywords in group) * 100"
            />
          </Title>
          <Text className="text-gray-500">{modifierGroups.length} modifier groups - click to explore</Text>
        </div>
      </div>

      <div className="space-y-3">
        {modifierGroups.slice(0, visibleCount).map((group, idx) => {
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
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 text-white">
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900">{group.modifier_group}</span>
                      <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {group.total_keywords} keywords
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${getWinRateColor(group.win_rate)}`}>
                      {group.win_rate.toFixed(0)}% win
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatVolume(group.total_volume)} vol
                    </span>
                  </div>
                </div>

                {/* Top tags preview */}
                {!isExpanded && Object.keys(group.top_tags).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 pl-11">
                    {Object.entries(group.top_tags).slice(0, 3).map(([tag, count], i) => {
                      const displayTag = tag.includes(':') ? tag.split(':')[1] : tag;
                      return (
                        <span
                          key={i}
                          className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700"
                        >
                          {displayTag} ({count})
                        </span>
                      );
                    })}
                  </div>
                )}
              </button>

              {/* Expanded Content */}
              <AnimatePresence>
                {isExpanded && breakdown && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="border-t border-gray-200 bg-gray-50"
                  >
                    <div className="p-4">
                      {/* Quick Stats */}
                      <Grid numItems={4} className="gap-3 mb-4">
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                            <Trophy className="h-3.5 w-3.5" />
                            Win Rate
                          </div>
                          <div className={`text-lg font-bold ${getWinRateTextColor(breakdown.win_rate)}`}>
                            {breakdown.win_rate.toFixed(1)}%
                          </div>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                            <Target className="h-3.5 w-3.5" />
                            Avg Position
                          </div>
                          <div className="text-lg font-bold text-gray-900">
                            #{breakdown.avg_brand_position?.toFixed(1) || 'N/A'}
                          </div>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="flex items-center gap-2 text-emerald-500 text-xs mb-1">
                            <TrendingUp className="h-3.5 w-3.5" />
                            Won
                          </div>
                          <div className="text-lg font-bold text-emerald-600">
                            {breakdown.keywords_winning} <span className="text-xs font-normal text-gray-500">/ {formatVolume(breakdown.volume_winning)}</span>
                          </div>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="flex items-center gap-2 text-rose-500 text-xs mb-1">
                            <TrendingDown className="h-3.5 w-3.5" />
                            Lost
                          </div>
                          <div className="text-lg font-bold text-rose-600">
                            {breakdown.keywords_losing} <span className="text-xs font-normal text-gray-500">/ {formatVolume(breakdown.volume_losing)}</span>
                          </div>
                        </div>
                      </Grid>

                      {/* Two Column Layout */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Left Column - Tags & Keywords */}
                        <div className="space-y-4">
                          {/* Tag Distribution Chart */}
                          {breakdown.top_tags.length > 0 && (
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Tag Distribution</h4>
                              <BarChart
                                data={prepareTagBarData(breakdown.top_tags)}
                                index="name"
                                categories={['Count']}
                                colors={['purple']}
                                valueFormatter={(v) => v.toString()}
                                className="h-40"
                                showLegend={false}
                              />
                            </div>
                          )}

                          {/* Top Tags with Win Rates */}
                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">Top Tags Performance</h4>
                            <div className="space-y-2">
                              {breakdown.top_tags.slice(0, 6).map((tag, i) => {
                                const displayTag = tag.tag.includes(':') ? tag.tag.split(':')[1] : tag.tag;
                                return (
                                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                                    <div className="flex items-center gap-2">
                                      <Tag className="h-3.5 w-3.5 text-purple-500" />
                                      <span className="text-sm text-gray-700">{displayTag}</span>
                                      <span className="text-xs text-gray-400">({tag.count})</span>
                                    </div>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${getWinRateColor(tag.win_rate)}`}>
                                      {tag.win_rate.toFixed(0)}%
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Example Keywords */}
                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">Example Keywords</h4>
                            <div className="space-y-2">
                              {breakdown.example_winners.length > 0 && (
                                <div>
                                  <div className="text-xs text-emerald-600 font-medium mb-1 flex items-center gap-1">
                                    <Award className="h-3 w-3" /> Winners
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {breakdown.example_winners.slice(0, 3).map((kw, j) => (
                                      <span key={j} className="text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700" title={kw.url}>
                                        {kw.keyword.length > 25 ? kw.keyword.substring(0, 25) + '...' : kw.keyword}
                                        <span className="ml-1 text-emerald-500">({formatVolume(kw.volume)})</span>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {breakdown.example_losers.length > 0 && (
                                <div>
                                  <div className="text-xs text-rose-600 font-medium mb-1 mt-2 flex items-center gap-1">
                                    <TrendingDown className="h-3 w-3" /> Losses
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {breakdown.example_losers.slice(0, 3).map((kw, j) => (
                                      <span key={j} className="text-xs px-2 py-1 rounded bg-rose-50 text-rose-700" title={`Lost to ${kw.winner_domain}`}>
                                        {kw.keyword.length > 25 ? kw.keyword.substring(0, 25) + '...' : kw.keyword}
                                        <span className="ml-1 text-rose-400">→ {kw.winner_domain.length > 15 ? kw.winner_domain.substring(0, 15) + '...' : kw.winner_domain}</span>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right Column - Competitors */}
                        <div className="space-y-4">
                          {/* Loss Distribution Donut */}
                          {breakdown.loss_distribution_by_type.length > 0 && (
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Who Beats You</h4>
                              <DonutChart
                                data={prepareDonutData(breakdown.loss_distribution_by_type)}
                                category="value"
                                index="name"
                                valueFormatter={(v) => formatVolume(v)}
                                colors={breakdown.loss_distribution_by_type.map(d =>
                                  domainTypeConfig[d.domain_type]?.color || 'gray'
                                )}
                                className="h-40"
                                showLabel={true}
                              />
                            </div>
                          )}

                          {/* Competitors by Type */}
                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">Top Competitors by Type</h4>
                            <div className="space-y-3">
                              {Object.entries(breakdown.competitors_by_type).map(([type, competitors]) => {
                                const config = domainTypeConfig[type] || domainTypeConfig.Unknown;
                                const Icon = config.icon;

                                return competitors.slice(0, 3).map((comp, i) => (
                                  <div
                                    key={`${type}-${i}`}
                                    className={`flex items-center justify-between p-2 rounded-lg ${config.bgColor}`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <Icon className={`h-4 w-4 ${config.textColor}`} />
                                      <div>
                                        <div className={`text-sm font-medium ${config.textColor}`}>
                                          {comp.domain.length > 25 ? comp.domain.substring(0, 25) + '...' : comp.domain}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {comp.wins_count} wins | {formatVolume(comp.wins_volume)} vol
                                        </div>
                                      </div>
                                    </div>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/50 text-gray-600">
                                      #{comp.avg_position.toFixed(1)}
                                    </span>
                                  </div>
                                ));
                              })}
                              {Object.keys(breakdown.competitors_by_type).length === 0 && (
                                <div className="text-sm text-gray-500 text-center py-4">
                                  No competitor data available
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* See More Button */}
      {visibleCount < modifierGroups.length && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setVisibleCount(prev => Math.min(prev + ITEMS_PER_PAGE, modifierGroups.length))}
            className="px-4 py-2 text-sm font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
          >
            Show More Modifier Groups ({modifierGroups.length - visibleCount} remaining)
          </button>
        </div>
      )}

      {/* Summary Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 pt-4 border-t border-gray-200"
      >
        <Grid numItems={3} className="gap-4">
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{modifierGroups.length}</div>
            <div className="text-xs text-gray-600">Modifier Groups</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-700">
              {formatVolume(modifierGroups.reduce((sum, g) => sum + g.total_volume, 0))}
            </div>
            <div className="text-xs text-gray-600">Total Volume</div>
          </div>
          <div className="text-center p-3 bg-emerald-50 rounded-lg">
            <div className="text-2xl font-bold text-emerald-600">
              {modifierGroups.length > 0
                ? (modifierGroups.reduce((sum, g) => sum + g.win_rate, 0) / modifierGroups.length).toFixed(0)
                : 0}%
            </div>
            <div className="text-xs text-gray-600">Avg Win Rate</div>
          </div>
        </Grid>
      </motion.div>
    </Card>
  );
}
