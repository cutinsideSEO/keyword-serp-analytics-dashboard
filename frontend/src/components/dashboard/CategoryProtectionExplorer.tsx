/**
 * Category Protection Explorer Component
 * Interactive accordion explorer for category performance in brand protection context
 * Shows win/loss breakdown, value charts, competitors by type, and domain type distribution
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Title, Text, BarChart, DonutChart, Grid, ProgressBar } from '@tremor/react';
import {
  Layers, ChevronRight, ChevronDown, TrendingUp, TrendingDown,
  Loader2, Trophy, Target
} from 'lucide-react';
import type {
  CategoryLossStats,
  CategoryProtectionBreakdown,
  CategoryValueProtectionStats,
  CategoryCompetitor,
  DomainTypeLossDetail
} from '../../types';
import { getCategoryProtectionBreakdown } from '../../api/endpoints';
import { InfoTooltip } from '../common/InfoTooltip';
import { useMarketConfig } from '../../contexts/MarketConfigContext';

interface CategoryProtectionExplorerProps {
  categories: CategoryLossStats[];
  brandName: string;
}

const ITEMS_PER_PAGE = 12;

export function CategoryProtectionExplorer({ categories, brandName }: CategoryProtectionExplorerProps) {
  const { getStyles, getIcon, getTremorColor } = useMarketConfig();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [categoryBreakdowns, setCategoryBreakdowns] = useState<Record<string, CategoryProtectionBreakdown>>({});
  const [loadingCategories, setLoadingCategories] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  const toggleCategory = async (categoryName: string) => {
    const isExpanded = expandedCategories.has(categoryName);
    const newExpanded = new Set(expandedCategories);

    if (isExpanded) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);

      // Load breakdown if not already loaded
      if (!categoryBreakdowns[categoryName]) {
        setLoadingCategories(new Set([...loadingCategories, categoryName]));
        try {
          const breakdown = await getCategoryProtectionBreakdown(brandName, categoryName, 10);
          setCategoryBreakdowns({ ...categoryBreakdowns, [categoryName]: breakdown });
        } catch (error) {
          console.error(`Failed to load breakdown for ${categoryName}:`, error);
        } finally {
          const newLoading = new Set(loadingCategories);
          newLoading.delete(categoryName);
          setLoadingCategories(newLoading);
        }
      }
    }

    setExpandedCategories(newExpanded);
  };

  const formatVolume = (vol: number) => {
    if (vol >= 1000000) return `${(vol / 1000000).toFixed(1)}M`;
    if (vol >= 1000) return `${(vol / 1000).toFixed(0)}K`;
    return vol.toString();
  };

  // Prepare stacked bar chart data for top values
  const prepareValueBarData = (values: CategoryValueProtectionStats[]) => {
    return values.slice(0, 7).map(v => ({
      name: v.value.length > 15 ? v.value.substring(0, 15) + '...' : v.value,
      'Volume Won': v.volume_winning,
      'Volume Lost': v.volume_losing,
    }));
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

  return (
    <Card className="overflow-visible">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-amber-100 rounded-lg">
          <Layers className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <Title className="flex items-center gap-2">
            Category Performance
            <InfoTooltip
              title="Category Performance"
              description="See how your brand performs across different categories. Click any category to see detailed win/loss breakdown, value performance, and which competitors beat you."
              calculation="Win Rate = (Keywords where you rank #1) / (Total keywords in category) * 100"
            />
          </Title>
          <Text className="text-gray-500">{categories.length} categories - click to explore</Text>
        </div>
      </div>

      <div className="space-y-3">
        {categories.slice(0, visibleCount).map((category, idx) => {
          const isExpanded = expandedCategories.has(category.category);
          const isLoading = loadingCategories.has(category.category);
          const breakdown = categoryBreakdowns[category.category];

          return (
            <motion.div
              key={category.category}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="border-2 border-gray-200 rounded-xl overflow-hidden hover:border-amber-300 transition-colors"
            >
              {/* Category Header - Clickable */}
              <button
                onClick={() => toggleCategory(category.category)}
                className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-white">
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900">{category.display_name}</span>
                      <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {category.loss_count} keywords
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-rose-600">
                      {formatVolume(category.loss_volume)} lost
                    </span>
                  </div>
                </div>

                {/* Example keywords preview */}
                {!isExpanded && category.example_keywords.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 pl-11">
                    {category.example_keywords.slice(0, 3).map((kw, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700"
                      >
                        {kw}
                      </span>
                    ))}
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
                          <div className={`text-lg font-bold ${breakdown.win_rate >= 80 ? 'text-emerald-600' : breakdown.win_rate >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
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
                        {/* Left Column - Value Breakdown */}
                        <div className="space-y-4">
                          {/* Volume Distribution Chart */}
                          {breakdown.top_values.length > 0 && (
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">Volume by Value</h4>
                              <BarChart
                                data={prepareValueBarData(breakdown.top_values)}
                                index="name"
                                categories={['Volume Won', 'Volume Lost']}
                                colors={['emerald', 'rose']}
                                valueFormatter={(v) => formatVolume(v)}
                                stack={true}
                                className="h-48"
                                showLegend={true}
                              />
                            </div>
                          )}

                          {/* Top Values Detail */}
                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">Top Values</h4>
                            <div className="space-y-3">
                              {breakdown.top_values.slice(0, 5).map((value, i) => (
                                <div key={i} className="space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-900">{value.value}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${getWinRateColor(value.win_rate)}`}>
                                      {value.win_rate.toFixed(0)}%
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
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
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {value.example_winners.slice(0, 2).map((kw, j) => (
                                      <span key={`w-${j}`} className="text-xs px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                                        {kw.keyword.length > 20 ? kw.keyword.substring(0, 20) + '...' : kw.keyword}
                                      </span>
                                    ))}
                                    {value.example_losers.slice(0, 2).map((kw, j) => (
                                      <span key={`l-${j}`} className="text-xs px-1.5 py-0.5 rounded bg-rose-50 text-rose-700" title={`Lost to ${kw.winner_domain}`}>
                                        {kw.keyword.length > 20 ? kw.keyword.substring(0, 20) + '...' : kw.keyword}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
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
                                  getTremorColor(d.domain_type)
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
                                const styles = getStyles(type);
                                const Icon = getIcon(type);

                                return competitors.slice(0, 3).map((comp, i) => (
                                  <div
                                    key={`${type}-${i}`}
                                    className={`flex items-center justify-between p-2 rounded-lg ${styles.bgColor}`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <Icon className={`h-4 w-4 ${styles.textColor}`} />
                                      <div>
                                        <div className={`text-sm font-medium ${styles.textColor}`}>
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
      {visibleCount < categories.length && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setVisibleCount(prev => Math.min(prev + ITEMS_PER_PAGE, categories.length))}
            className="px-4 py-2 text-sm font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
          >
            Show More Categories ({categories.length - visibleCount} remaining)
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
          <div className="text-center p-3 bg-amber-50 rounded-lg">
            <div className="text-2xl font-bold text-amber-600">{categories.length}</div>
            <div className="text-xs text-gray-600">Categories</div>
          </div>
          <div className="text-center p-3 bg-rose-50 rounded-lg">
            <div className="text-2xl font-bold text-rose-600">
              {formatVolume(categories.reduce((sum, c) => sum + c.loss_volume, 0))}
            </div>
            <div className="text-xs text-gray-600">Total Volume Lost</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-700">
              {categories.reduce((sum, c) => sum + c.loss_count, 0).toLocaleString()}
            </div>
            <div className="text-xs text-gray-600">Total Keywords Lost</div>
          </div>
        </Grid>
      </motion.div>
    </Card>
  );
}
