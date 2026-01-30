/**
 * Unified ModifierGroupDrawer component.
 * Context-aware: shows win/loss metrics for protection, capture metrics for opportunity,
 * and totals for market overview.
 * Replaces both the old ModifierGroupDrawer and MarketModifierDrawer.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Tag, Users, FileText, Grid3X3 } from 'lucide-react';
import { Drawer } from '../common/Drawer';
import { HeroStats } from './drawer-parts/HeroStats';
import { CompetitorsTab } from './drawer-parts/CompetitorsTab';
import { KeywordsTab } from './drawer-parts/KeywordsTab';
import {
  ProtectionTagsTab,
  OpportunityValuesTab,
  MarketTagsTab,
} from './drawer-parts/ValuesTab';
import { LossDistribution } from './drawer-parts/LossDistribution';
import type { DrawerContext } from './drawer-parts/HeroStats';
import type {
  ModifierGroupProtectionBreakdown,
  ModifierGroupOpportunityBreakdown,
  ModifierGroupBreakdown,
} from '../../types';
import {
  getModifierGroupProtectionBreakdown,
  getModifierGroupOpportunityBreakdown,
  getModifierGroupMarketBreakdown,
} from '../../api/endpoints';
import { isTwoCategoryGroup } from '../../utils/modifierGroup';

interface ModifierGroupDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  modifierGroup: string;
  brandName?: string;
  context: DrawerContext;
  keywordType?: 'nonbranded' | 'competitor_branded';
  /** Callback when "View Heatmap" is clicked (only for two-category opportunity groups) */
  onViewHeatmap?: () => void;
}

type BreakdownData =
  | ModifierGroupProtectionBreakdown
  | ModifierGroupOpportunityBreakdown
  | ModifierGroupBreakdown;

export function ModifierGroupDrawer({
  isOpen,
  onClose,
  modifierGroup,
  brandName,
  context,
  keywordType = 'nonbranded',
  onViewHeatmap,
}: ModifierGroupDrawerProps) {
  const [activeTab, setActiveTab] = useState<'values' | 'competitors' | 'keywords'>('values');

  const needsBrand = context !== 'market';
  const queryEnabled = isOpen && !!modifierGroup && (!needsBrand || !!brandName);

  const { data: breakdown = null, isLoading: loading, error: queryError, refetch } = useQuery<BreakdownData>({
    queryKey: ['modifier-group-breakdown', context, modifierGroup, brandName, keywordType],
    queryFn: () => {
      if (context === 'market') {
        return getModifierGroupMarketBreakdown(modifierGroup, 15);
      } else if (context === 'opportunity') {
        return getModifierGroupOpportunityBreakdown(brandName || '', modifierGroup, keywordType);
      } else {
        return getModifierGroupProtectionBreakdown(brandName || '', modifierGroup, 10);
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

  const valuesLabel = context === 'protection' ? 'Tags' : context === 'market' ? 'Tags' : 'Values';

  const tabs = [
    { id: 'values' as const, label: valuesLabel, icon: Tag },
    { id: 'competitors' as const, label: 'Competitors', icon: Users },
    { id: 'keywords' as const, label: 'Keywords', icon: FileText },
  ];

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={modifierGroup}
      subtitle={subtitleMap[context]}
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
                itemCount: (breakdown as ModifierGroupBreakdown).top_tags?.length ?? 0,
                itemLabel: 'Tags',
              }}
            />
          ) : context === 'protection' ? (
            <HeroStats
              context="protection"
              metrics={{
                total_keywords: breakdown.total_keywords,
                total_volume: breakdown.total_volume,
                win_rate: (breakdown as ModifierGroupProtectionBreakdown).win_rate,
                keywords_winning: (breakdown as ModifierGroupProtectionBreakdown).keywords_winning,
                volume_winning: (breakdown as ModifierGroupProtectionBreakdown).volume_winning,
                keywords_losing: (breakdown as ModifierGroupProtectionBreakdown).keywords_losing,
                volume_losing: (breakdown as ModifierGroupProtectionBreakdown).volume_losing,
                avg_brand_position: (breakdown as ModifierGroupProtectionBreakdown).avg_brand_position,
              }}
            />
          ) : (
            <HeroStats
              context="opportunity"
              metrics={{
                total_keywords: breakdown.total_keywords,
                total_volume: breakdown.total_volume,
                capture_rate: (breakdown as ModifierGroupOpportunityBreakdown).capture_rate,
                keywords_captured: (breakdown as ModifierGroupOpportunityBreakdown).keywords_captured,
                volume_captured: (breakdown as ModifierGroupOpportunityBreakdown).volume_captured,
                avg_brand_position: (breakdown as ModifierGroupOpportunityBreakdown).avg_brand_position,
              }}
            />
          )}

          {/* View Heatmap Button (only for two-category opportunity groups) */}
          {context === 'opportunity' && isTwoCategoryGroup(modifierGroup) && onViewHeatmap && (
            <button
              onClick={onViewHeatmap}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium rounded-lg border border-blue-200 transition-colors"
            >
              <Grid3X3 className="w-4 h-4" />
              View Heatmap
              <span className="text-xs text-blue-500 ml-1">
                (explore category combinations)
              </span>
            </button>
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
                <MarketTagsTab tags={(breakdown as ModifierGroupBreakdown).top_tags} />
              ) : context === 'protection' ? (
                <ProtectionTagsTab
                  tags={(breakdown as ModifierGroupProtectionBreakdown).top_tags}
                />
              ) : (
                <OpportunityValuesTab
                  values={(breakdown as ModifierGroupOpportunityBreakdown).top_values}
                />
              )}
            </div>
          )}

          {activeTab === 'competitors' && (
            <CompetitorsTab
              context={context}
              competitorsByType={
                context !== 'market'
                  ? (
                      breakdown as
                        | ModifierGroupProtectionBreakdown
                        | ModifierGroupOpportunityBreakdown
                    ).competitors_by_type
                  : undefined
              }
              playersByType={
                context === 'market'
                  ? (breakdown as ModifierGroupBreakdown).top_players_by_type
                  : undefined
              }
            />
          )}

          {activeTab === 'keywords' && (
            <KeywordsTab
              context={context}
              winners={
                context === 'protection'
                  ? (breakdown as ModifierGroupProtectionBreakdown).example_winners
                  : undefined
              }
              losers={
                context === 'protection'
                  ? (breakdown as ModifierGroupProtectionBreakdown).example_losers
                  : undefined
              }
              opportunityKeywords={
                context === 'opportunity'
                  ? (breakdown as ModifierGroupOpportunityBreakdown).example_keywords
                  : undefined
              }
              marketKeywords={
                context === 'market'
                  ? (breakdown as ModifierGroupBreakdown).example_keywords
                  : undefined
              }
            />
          )}

          {/* Loss Distribution (Protection only) */}
          {context === 'protection' &&
            (breakdown as ModifierGroupProtectionBreakdown).loss_distribution_by_type?.length >
              0 && (
              <LossDistribution
                losses={
                  (breakdown as ModifierGroupProtectionBreakdown).loss_distribution_by_type
                }
              />
            )}
        </div>
      ) : null}
    </Drawer>
  );
}

export default ModifierGroupDrawer;
