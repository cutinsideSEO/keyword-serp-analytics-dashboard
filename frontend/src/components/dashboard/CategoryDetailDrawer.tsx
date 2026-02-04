/**
 * CategoryDetailDrawer component.
 * Unified drawer for category drill-downs across all 3 contexts:
 * - market: calls getCategoryMarketBreakdown (no brand)
 * - protection: calls getCategoryProtectionBreakdown (brand-specific)
 * - opportunity: calls getCategoryOpportunityBreakdown (brand-specific, keyword type)
 *
 * Replaces both the old CategoryDetailDrawer (protection-only) and MarketCategoryDrawer.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Tag, Users, FileText, BarChart3 } from 'lucide-react';
import { Drawer } from '../common/Drawer';
import { HeroStats } from './drawer-parts/HeroStats';
import { CompetitorsTab } from './drawer-parts/CompetitorsTab';
import { KeywordsTab } from './drawer-parts/KeywordsTab';
import {
  ProtectionValuesTab,
  OpportunityValuesTab,
  MarketValuesTab,
} from './drawer-parts/ValuesTab';
import { LossDistribution } from './drawer-parts/LossDistribution';
import type { DrawerContext } from './drawer-parts/HeroStats';
import type {
  CategoryProtectionBreakdown,
  CategoryBreakdown,
  CategoryOpportunityBreakdown,
} from '../../types';
import {
  getCategoryProtectionBreakdown,
  getCategoryMarketBreakdown,
  getCategoryOpportunityBreakdown,
} from '../../api/endpoints';
import { formatCompactNumber } from '../../utils/formatters';
import { useMarketConfig } from '../../contexts/MarketConfigContext';

interface CategoryDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  categoryName: string;
  displayName: string;
  brandName?: string;
  context: DrawerContext;
  keywordType?: 'nonbranded' | 'competitor_branded';
}

type BreakdownData = CategoryProtectionBreakdown | CategoryBreakdown | CategoryOpportunityBreakdown;

export function CategoryDetailDrawer({
  isOpen,
  onClose,
  categoryName,
  displayName,
  brandName,
  context,
  keywordType = 'nonbranded',
}: CategoryDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<'values' | 'competitors' | 'keywords'>('values');
  const { currentMarketId } = useMarketConfig();

  const needsBrand = context !== 'market';
  const queryEnabled = isOpen && !!categoryName && (!needsBrand || !!brandName);

  const { data: breakdown = null, isLoading: loading, error: queryError, refetch } = useQuery<BreakdownData>({
    queryKey: ['category-breakdown', currentMarketId, context, categoryName, brandName, keywordType],
    queryFn: () => {
      if (context === 'market') {
        return getCategoryMarketBreakdown(categoryName, 15);
      } else if (context === 'opportunity') {
        return getCategoryOpportunityBreakdown(brandName || '', categoryName, keywordType);
      } else {
        return getCategoryProtectionBreakdown(brandName || '', categoryName, 10);
      }
    },
    enabled: queryEnabled,
  });

  const error = queryError ? queryError.message : null;
  const fetchData = () => refetch();

  const subtitleMap: Record<DrawerContext, string> = {
    market: 'Market Overview',
    protection: 'Brand Protection',
    opportunity: 'Opportunity Analysis',
  };

  const tabs = [
    { id: 'values' as const, label: 'Values', icon: Tag },
    { id: 'competitors' as const, label: 'Competitors', icon: Users },
    { id: 'keywords' as const, label: 'Keywords', icon: FileText },
  ];

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={displayName}
      subtitle={`Category: ${categoryName} - ${subtitleMap[context]}`}
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
            onClick={fetchData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : breakdown ? (
        <div className="space-y-6">
          {/* Hero Stats */}
          {context === 'market' ? (
            <HeroStats
              context="market"
              metrics={{
                total_keywords: breakdown.total_keywords,
                total_volume: breakdown.total_volume,
                itemCount: (breakdown as CategoryBreakdown).top_values?.length ?? 0,
                itemLabel: 'Values',
              }}
            />
          ) : context === 'protection' ? (
            <HeroStats
              context="protection"
              metrics={{
                total_keywords: breakdown.total_keywords,
                total_volume: breakdown.total_volume,
                win_rate: (breakdown as CategoryProtectionBreakdown).win_rate,
                keywords_winning: (breakdown as CategoryProtectionBreakdown).keywords_winning,
                volume_winning: (breakdown as CategoryProtectionBreakdown).volume_winning,
                keywords_losing: (breakdown as CategoryProtectionBreakdown).keywords_losing,
                volume_losing: (breakdown as CategoryProtectionBreakdown).volume_losing,
                avg_brand_position: (breakdown as CategoryProtectionBreakdown).avg_brand_position,
              }}
            />
          ) : (
            <HeroStats
              context="opportunity"
              metrics={{
                total_keywords: breakdown.total_keywords,
                total_volume: breakdown.total_volume,
                capture_rate: (breakdown as CategoryOpportunityBreakdown).capture_rate,
                keywords_captured: (breakdown as CategoryOpportunityBreakdown).keywords_captured,
                volume_captured: (breakdown as CategoryOpportunityBreakdown).volume_captured,
                avg_brand_position: (breakdown as CategoryOpportunityBreakdown).avg_brand_position,
              }}
            />
          )}

          {/* Volume by Value chart (protection only) */}
          {context === 'protection' && (
            <VolumeByValue
              values={(breakdown as CategoryProtectionBreakdown).top_values}
            />
          )}

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          {activeTab === 'values' && (
            <div>
              {context === 'market' ? (
                <MarketValuesTab values={(breakdown as CategoryBreakdown).top_values} />
              ) : context === 'protection' ? (
                <ProtectionValuesTab
                  values={(breakdown as CategoryProtectionBreakdown).top_values}
                />
              ) : (
                <OpportunityValuesTab
                  values={(breakdown as CategoryOpportunityBreakdown).top_values}
                />
              )}
            </div>
          )}

          {activeTab === 'competitors' && (
            <CompetitorsTab
              context={context}
              competitorsByType={
                context !== 'market'
                  ? (breakdown as CategoryProtectionBreakdown | CategoryOpportunityBreakdown)
                      .competitors_by_type
                  : undefined
              }
              playersByType={
                context === 'market'
                  ? (breakdown as CategoryBreakdown).top_players_by_type
                  : undefined
              }
            />
          )}

          {activeTab === 'keywords' && (
            <KeywordsTab
              context={context}
              winners={
                context === 'protection'
                  ? (breakdown as CategoryProtectionBreakdown).top_values.flatMap(
                      (v) => v.example_winners
                    )
                  : undefined
              }
              losers={
                context === 'protection'
                  ? (breakdown as CategoryProtectionBreakdown).top_values.flatMap(
                      (v) => v.example_losers
                    )
                  : undefined
              }
              opportunityKeywords={
                context === 'opportunity'
                  ? (breakdown as CategoryOpportunityBreakdown).example_keywords
                  : undefined
              }
              marketKeywords={
                context === 'market'
                  ? (breakdown as CategoryBreakdown).top_values
                      .slice(0, 12)
                      .flatMap((v) =>
                        (v.example_keywords || []).map((kw) => ({ keyword: kw, volume: 0 }))
                      )
                  : undefined
              }
            />
          )}

          {/* Loss Distribution (Protection only) */}
          {context === 'protection' &&
            (breakdown as CategoryProtectionBreakdown).loss_distribution_by_type?.length > 0 && (
              <LossDistribution
                losses={(breakdown as CategoryProtectionBreakdown).loss_distribution_by_type}
              />
            )}
        </div>
      ) : null}
    </Drawer>
  );
}

// ── Volume by Value chart (protection context) ──────────────────────────────

function VolumeByValue({
  values,
}: {
  values: CategoryProtectionBreakdown['top_values'];
}) {
  if (values.length === 0) return null;

  const topValues = values.slice(0, 7);
  const maxVolume = Math.max(...topValues.map((v) => v.total_volume));

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-blue-500" />
        Volume by Value
      </h4>
      <div className="space-y-3">
        {topValues.map((v) => {
          const totalPct = maxVolume > 0 ? (v.total_volume / maxVolume) * 100 : 0;
          const wonPct = v.total_volume > 0 ? (v.volume_winning / v.total_volume) * 100 : 0;

          return (
            <div key={v.value} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-700 font-medium truncate max-w-[200px]">{v.value}</span>
                <span className="text-gray-500">{formatCompactNumber(v.total_volume)}</span>
              </div>
              <div
                className="h-3 bg-gray-200 rounded-full overflow-hidden"
                style={{ width: `${totalPct}%`, minWidth: '20px' }}
              >
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
                  style={{ width: `${wonPct}%`, transition: 'width 0.4s ease' }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-emerald-400" />
          Won
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-gray-200" />
          Lost
        </div>
      </div>
    </div>
  );
}

export default CategoryDetailDrawer;
