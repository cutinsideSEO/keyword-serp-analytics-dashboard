/**
 * Category Explorer Component
 * Full accordion-style explorer with detailed breakdowns, charts, and visualizations
 * Uses dynamic domain types from market configuration.
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Title, Text, BarChart, DonutChart, Grid, ProgressBar } from '@tremor/react';
import { Layers, ChevronRight, ChevronDown, TrendingUp, Loader2 } from 'lucide-react';
import type { CategoryMarketStats, CategoryBreakdown, DomainVisibilityItem } from '../../types';
import { getCategoryMarketBreakdown } from '../../api/endpoints';
import { useMarketConfig } from '../../contexts/MarketConfigContext';

interface CategoryExplorerProps {
  data: CategoryMarketStats[];
}

const ITEMS_PER_PAGE = 12;

export function CategoryExplorer({ data }: CategoryExplorerProps) {
  const { getStyles, getIcon, hexColorMap, getDomainTypeNames } = useMarketConfig();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [categoryBreakdowns, setCategoryBreakdowns] = useState<Record<string, CategoryBreakdown>>({});
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
          const breakdown = await getCategoryMarketBreakdown(categoryName, 15);
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

  // Prepare donut chart data from top_players_by_type
  const prepareDonutData = (breakdown: CategoryBreakdown) => {
    const data: { name: string; value: number }[] = [];
    const types = getDomainTypeNames();

    types.forEach(type => {
      const players = breakdown.top_players_by_type[type] || [];
      const totalVisibility = players.reduce((sum, p) => sum + (p.visibility_score || 0), 0);
      if (totalVisibility > 0) {
        data.push({ name: type, value: Math.round(totalVisibility) });
      }
    });

    return data;
  };

  // Prepare bar chart data from top_values
  const prepareBarData = (values: CategoryValueMarketStats[]) => {
    return values.slice(0, 7).map(v => ({
      name: v.value,
      Volume: v.total_volume,
    }));
  };

  // Get top domain for each type from a value
  const getTopDomainsByType = (value: CategoryValueMarketStats) => {
    const domains: { type: string; domain: string; visibility: number }[] = [];

    if (value.top_brand_domain) {
      domains.push({ type: 'Brand', domain: value.top_brand_domain, visibility: value.top_brand_visibility || 0 });
    }
    if (value.top_retailer_domain) {
      domains.push({ type: 'Reseller', domain: value.top_retailer_domain, visibility: value.top_retailer_visibility || 0 });
    }
    if (value.top_ugc_domain) {
      domains.push({ type: 'UGC', domain: value.top_ugc_domain, visibility: value.top_ugc_visibility || 0 });
    }
    if (value.top_3rd_party_domain) {
      domains.push({ type: '3rd Party', domain: value.top_3rd_party_domain, visibility: value.top_3rd_party_visibility || 0 });
    }

    return domains;
  };

  return (
    <Card className="overflow-visible">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-emerald-100 rounded-lg">
          <Layers className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <Title>Category Insights</Title>
          <Text className="text-gray-500">{data.length} categories analyzed - click to explore</Text>
        </div>
      </div>

      <div className="space-y-3">
        {data.slice(0, visibleCount).map((category, idx) => {
          const isExpanded = expandedCategories.has(category.category_name);
          const isLoading = loadingCategories.has(category.category_name);
          const breakdown = categoryBreakdowns[category.category_name];

          return (
            <motion.div
              key={category.category_name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="border-2 border-gray-200 rounded-xl overflow-hidden hover:border-emerald-300 transition-colors"
            >
              {/* Category Header - Clickable */}
              <button
                onClick={() => toggleCategory(category.category_name)}
                className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
                      isExpanded
                        ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                        : 'bg-gradient-to-br from-emerald-400 to-emerald-500'
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
                      <h4 className="font-semibold text-gray-900 capitalize">
                        {category.display_name}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {category.unique_values} unique values
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">
                        {category.total_keywords.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">keywords</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-emerald-600 flex items-center justify-end gap-1">
                        <TrendingUp className="h-4 w-4" />
                        {formatVolume(category.total_volume)}
                      </div>
                      <div className="text-xs text-gray-500">volume</div>
                    </div>
                  </div>
                </div>

                {/* Preview badges when collapsed */}
                {!isExpanded && category.top_values_preview && category.top_values_preview.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {category.top_values_preview.slice(0, 5).map((value) => (
                      <span
                        key={value}
                        className="inline-block px-2 py-0.5 text-xs bg-emerald-50 text-emerald-700 rounded border border-emerald-200"
                      >
                        {value}
                      </span>
                    ))}
                    {category.top_values_preview.length > 5 && (
                      <span className="inline-block px-2 py-0.5 text-xs text-gray-500">
                        +{category.unique_values - 5} more
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
                        <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mx-auto mb-2" />
                        <Text className="text-gray-500">Loading category breakdown...</Text>
                      </div>
                    ) : breakdown ? (
                      <div className="p-4">
                        <Grid numItems={1} numItemsLg={2} className="gap-6">
                          {/* Left Column - Charts and Values */}
                          <div className="space-y-6">
                            {/* Volume Distribution Chart */}
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <h5 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-emerald-600" />
                                Volume Distribution
                              </h5>
                              <BarChart
                                data={prepareBarData(breakdown.top_values)}
                                index="name"
                                categories={['Volume']}
                                colors={['emerald']}
                                valueFormatter={(v) => formatVolume(v)}
                                showLegend={false}
                                showGridLines={false}
                                className="h-48"
                              />
                            </div>

                            {/* Top Values Detail */}
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <h5 className="font-semibold text-gray-800 mb-3">Top Values</h5>
                              <div className="space-y-3">
                                {breakdown.top_values.slice(0, 5).map((value, vIdx) => {
                                  const maxVolume = breakdown.top_values[0]?.total_volume || 1;
                                  const percentage = (value.total_volume / maxVolume) * 100;
                                  const topDomains = getTopDomainsByType(value);

                                  return (
                                    <div key={value.value} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium text-gray-800">{value.value}</span>
                                        <span className="text-sm font-bold text-emerald-600">
                                          {formatVolume(value.total_volume)}
                                        </span>
                                      </div>
                                      <ProgressBar value={percentage} color="emerald" className="mb-2" />
                                      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                                        <span>{value.keyword_count.toLocaleString()} keywords</span>
                                        <span>{percentage.toFixed(0)}% of category</span>
                                      </div>

                                      {/* Example Keywords */}
                                      {value.example_keywords && value.example_keywords.length > 0 && (
                                        <div className="mb-2">
                                          <div className="text-xs text-gray-500 mb-1">Example keywords:</div>
                                          <div className="flex flex-wrap gap-1">
                                            {value.example_keywords.slice(0, 3).map((kw, kwIdx) => (
                                              <span
                                                key={kwIdx}
                                                className="px-2 py-0.5 text-xs bg-emerald-50 text-emerald-700 rounded border border-emerald-200"
                                              >
                                                {kw}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* Top Domains per Type */}
                                      {topDomains.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-gray-200">
                                          {topDomains.slice(0, 4).map((d) => {
                                            const config = domainTypeConfig[d.type as keyof typeof domainTypeConfig];
                                            const Icon = config?.icon || Building2;
                                            return (
                                              <div
                                                key={d.type}
                                                className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${config?.bgColor || 'bg-gray-50'} ${config?.textColor || 'text-gray-700'} ${config?.borderColor || 'border-gray-200'} border`}
                                                title={`${d.type}: ${d.domain} (${formatVolume(d.visibility)} visibility)`}
                                              >
                                                <Icon className="h-3 w-3" />
                                                <span className="truncate max-w-[80px]">{d.domain.replace('www.', '')}</span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
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
                                colors={['blue', 'violet', 'amber', 'teal']}
                                valueFormatter={(v) => formatVolume(v)}
                                className="h-48"
                                showLabel={true}
                                label={`${breakdown.top_values.length} values`}
                              />
                            </div>

                            {/* Domain Leaders */}
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <h5 className="font-semibold text-gray-800 mb-3">Top Players by Type</h5>
                              <div className="space-y-3">
                                {(['Brand', 'Reseller', 'UGC', '3rd Party'] as const).map((type) => {
                                  const players = breakdown.top_players_by_type[type] || [];
                                  const topPlayer = players[0];
                                  const config = domainTypeConfig[type];
                                  const Icon = config.icon;

                                  if (!topPlayer) return null;

                                  return (
                                    <div
                                      key={type}
                                      className={`p-3 rounded-lg border ${config.bgColor} ${config.borderColor}`}
                                    >
                                      <div className="flex items-center gap-2 mb-1">
                                        <Icon className={`h-4 w-4 ${config.textColor}`} />
                                        <span className={`text-xs font-medium ${config.textColor}`}>{type}</span>
                                      </div>
                                      <div className="font-semibold text-gray-900 truncate">
                                        {topPlayer.domain.replace('www.', '')}
                                      </div>
                                      <div className="flex items-center justify-between mt-1 text-xs text-gray-600">
                                        <span>{formatVolume(topPlayer.visibility_score)} visibility</span>
                                        <span>{topPlayer.win_count} #1 wins</span>
                                      </div>
                                      {/* Show top brands this domain appears on */}
                                      {topPlayer.top_brands && topPlayer.top_brands.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-gray-200">
                                          <div className="text-xs text-gray-500">Top brands:</div>
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {topPlayer.top_brands.slice(0, 3).map((brand) => (
                                              <span
                                                key={brand}
                                                className="px-1.5 py-0.5 text-xs bg-white rounded text-gray-600"
                                              >
                                                {brand}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
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
          <div className="text-center p-4 bg-emerald-50 rounded-lg">
            <div className="text-xs text-emerald-600 font-medium mb-1">Total Categories</div>
            <div className="text-2xl font-bold text-emerald-700">{data.length}</div>
          </div>
          <div className="text-center p-4 bg-emerald-50 rounded-lg">
            <div className="text-xs text-emerald-600 font-medium mb-1">Total Keywords</div>
            <div className="text-2xl font-bold text-emerald-700">
              {data.reduce((sum, c) => sum + c.total_keywords, 0).toLocaleString()}
            </div>
          </div>
          <div className="text-center p-4 bg-emerald-50 rounded-lg">
            <div className="text-xs text-emerald-600 font-medium mb-1">Total Volume</div>
            <div className="text-2xl font-bold text-emerald-700">
              {formatVolume(data.reduce((sum, c) => sum + c.total_volume, 0))}
            </div>
          </div>
        </Grid>

        {data.length > ITEMS_PER_PAGE && (
          <div className="mt-4 flex items-center justify-center gap-4">
            <p className="text-sm text-gray-500">
              Showing {Math.min(visibleCount, data.length)} of {data.length} categories
            </p>
            <div className="flex gap-2">
              {visibleCount < data.length && (
                <button
                  onClick={() => setVisibleCount(prev => Math.min(prev + ITEMS_PER_PAGE, data.length))}
                  className="px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
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

export default CategoryExplorer;
