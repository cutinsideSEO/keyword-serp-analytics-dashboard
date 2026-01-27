/**
 * Unified ModifierGroupDrawer component.
 * Context-aware: shows win/loss metrics for protection, capture metrics for opportunity.
 * Replaces both ModifierDetailDrawer (Protect) and OpportunityExpandedDetails (Opportunities).
 */

import { useState, useEffect } from 'react';
import {
  Target,
  TrendingUp,
  TrendingDown,
  Loader2,
  Tag,
  Users,
  FileText,
  Hash,
  BarChart3,
} from 'lucide-react';
import { Drawer } from '../common/Drawer';
import { useMarketConfig } from '../../contexts/MarketConfigContext';
import type {
  ModifierGroupProtectionBreakdown,
  ModifierGroupOpportunityBreakdown,
  OpportunityKeywordDetail,
  OpportunityCategoryValue,
  OpportunityCompetitor,
  CategoryCompetitor,
  TagProtectionStats,
  ExampleWinnerKeyword,
  ExampleLoserKeyword,
  DomainTypeLossDetail,
} from '../../types';
import {
  getModifierGroupProtectionBreakdown,
  getModifierGroupOpportunityBreakdown,
} from '../../api/endpoints';
import { formatNumber, formatCompactNumber, formatPercent } from '../../utils/formatters';

interface ModifierGroupDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  modifierGroup: string;
  brandName: string;
  context: 'protection' | 'opportunity';
  keywordType?: 'nonbranded' | 'competitor_branded';
}

type BreakdownData = ModifierGroupProtectionBreakdown | ModifierGroupOpportunityBreakdown;

function isProtectionBreakdown(
  _data: BreakdownData,
  context: 'protection' | 'opportunity'
): _data is ModifierGroupProtectionBreakdown {
  return context === 'protection';
}

function isOpportunityBreakdown(
  _data: BreakdownData,
  context: 'protection' | 'opportunity'
): _data is ModifierGroupOpportunityBreakdown {
  return context === 'opportunity';
}

// ── Hero Stats Section ──────────────────────────────────────────────────────

function HeroStats({
  data,
  context,
}: {
  data: BreakdownData;
  context: 'protection' | 'opportunity';
}) {
  const primaryRate = isProtectionBreakdown(data, context)
    ? data.win_rate
    : (data as ModifierGroupOpportunityBreakdown).capture_rate;

  const primaryLabel = context === 'protection' ? 'Win Rate' : 'Capture Rate';

  const wonCount = isProtectionBreakdown(data, context)
    ? data.keywords_winning
    : (data as ModifierGroupOpportunityBreakdown).keywords_captured;

  const wonVolume = isProtectionBreakdown(data, context)
    ? data.volume_winning
    : (data as ModifierGroupOpportunityBreakdown).volume_captured;

  const lostCount = isProtectionBreakdown(data, context)
    ? data.keywords_losing
    : (data as ModifierGroupOpportunityBreakdown).total_keywords -
      (data as ModifierGroupOpportunityBreakdown).keywords_captured;

  const lostVolume = isProtectionBreakdown(data, context)
    ? data.volume_losing
    : data.total_volume - (data as ModifierGroupOpportunityBreakdown).volume_captured;

  const wonLabel = context === 'protection' ? 'Won' : 'Captured';
  const lostLabel = context === 'protection' ? 'Lost' : 'To Capture';

  const rateColor =
    primaryRate >= 80
      ? 'text-emerald-600'
      : primaryRate >= 50
      ? 'text-amber-600'
      : 'text-rose-600';

  const ringColor =
    primaryRate >= 80
      ? 'stroke-emerald-500'
      : primaryRate >= 50
      ? 'stroke-amber-500'
      : 'stroke-rose-500';

  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (primaryRate / 100) * circumference;

  return (
    <div className="space-y-4">
      {/* Primary metric with progress ring */}
      <div className="flex items-center gap-6 p-5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
        <div className="relative w-24 h-24 flex-shrink-0">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
            <circle
              cx="48"
              cy="48"
              r="40"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="6"
            />
            <circle
              cx="48"
              cy="48"
              r="40"
              fill="none"
              className={ringColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-xl font-bold ${rateColor}`}>
              {primaryRate.toFixed(0)}%
            </span>
          </div>
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-500 mb-1">{primaryLabel}</div>
          <div className={`text-3xl font-bold ${rateColor}`}>
            {primaryRate.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {formatNumber(data.total_keywords)} keywords &middot;{' '}
            {formatCompactNumber(data.total_volume)} volume
          </div>
        </div>
      </div>

      {/* Supporting stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-lg p-3 border border-gray-200 text-center">
          <div className="flex items-center justify-center gap-1 text-gray-500 text-xs mb-1">
            <Target className="h-3 w-3" />
            Avg Position
          </div>
          <div className="text-lg font-bold text-gray-900">
            {data.avg_brand_position ? `#${data.avg_brand_position.toFixed(1)}` : 'N/A'}
          </div>
        </div>
        <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200 text-center">
          <div className="flex items-center justify-center gap-1 text-emerald-600 text-xs mb-1">
            <TrendingUp className="h-3 w-3" />
            {wonLabel}
          </div>
          <div className="text-lg font-bold text-emerald-700">
            {formatNumber(wonCount)}
          </div>
          <div className="text-xs text-emerald-600">{formatCompactNumber(wonVolume)} vol</div>
        </div>
        <div className="bg-rose-50 rounded-lg p-3 border border-rose-200 text-center">
          <div className="flex items-center justify-center gap-1 text-rose-600 text-xs mb-1">
            <TrendingDown className="h-3 w-3" />
            {lostLabel}
          </div>
          <div className="text-lg font-bold text-rose-700">
            {formatNumber(lostCount)}
          </div>
          <div className="text-xs text-rose-600">{formatCompactNumber(lostVolume)} vol</div>
        </div>
      </div>
    </div>
  );
}

// ── Values Tab (Protection: Tags, Opportunity: Category Values) ─────────────

function ProtectionTagsTab({ tags }: { tags: TagProtectionStats[] }) {
  if (tags.length === 0) {
    return <div className="text-sm text-gray-500 italic py-4 text-center">No tags available</div>;
  }

  return (
    <div className="space-y-3">
      {tags.slice(0, 12).map((tag) => {
        const rateColor =
          tag.win_rate >= 80
            ? 'bg-emerald-100 text-emerald-700'
            : tag.win_rate >= 50
            ? 'bg-amber-100 text-amber-700'
            : 'bg-rose-100 text-rose-700';

        const barColor =
          tag.win_rate >= 80
            ? 'bg-emerald-400'
            : tag.win_rate >= 50
            ? 'bg-amber-400'
            : 'bg-rose-400';

        return (
          <div
            key={tag.tag}
            className="bg-white rounded-lg border border-gray-200 p-3 hover:border-blue-300 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Hash className="w-3.5 h-3.5 text-gray-400" />
                <span className="font-medium text-gray-900 text-sm">{tag.tag}</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${rateColor}`}>
                {tag.win_rate.toFixed(0)}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${barColor}`}
                  style={{ width: `${tag.win_rate}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {formatNumber(tag.count)} keywords
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OpportunityValuesTab({ values }: { values: OpportunityCategoryValue[] }) {
  if (values.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic py-4 text-center">No category values found</div>
    );
  }

  return (
    <div className="space-y-3">
      {values.slice(0, 8).map((value, idx) => {
        const rateColor =
          value.capture_rate >= 50
            ? 'bg-emerald-100 text-emerald-700'
            : value.capture_rate >= 25
            ? 'bg-amber-100 text-amber-700'
            : 'bg-red-100 text-red-700';

        return (
          <div
            key={idx}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:border-emerald-300 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-emerald-600 text-sm font-medium">
                  {value.category_name}:
                </span>
                <span className="font-semibold text-gray-900">{value.value}</span>
              </div>
              <span className={`px-2 py-1 rounded-md text-xs font-bold ${rateColor}`}>
                {formatPercent(value.capture_rate)} captured
              </span>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
              <span>{formatNumber(value.total_keywords)} keywords</span>
              <span>{formatCompactNumber(value.total_volume)} volume</span>
              <span className="text-emerald-600">
                {formatNumber(value.keywords_captured)} captured
              </span>
            </div>

            {value.top_keywords.length > 0 && (
              <div className="space-y-1">
                {value.top_keywords.slice(0, 3).map((kw, kwIdx) => (
                  <div
                    key={kwIdx}
                    className="flex items-center justify-between text-xs py-1.5 px-2 bg-gray-50 rounded"
                  >
                    <span className="text-gray-700 truncate max-w-[200px]" dir="auto">
                      {kw.keyword}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">{formatCompactNumber(kw.volume)}</span>
                      {kw.winner_domain && (
                        <span className="text-amber-600 truncate max-w-[100px]">
                          #{kw.winner_position} &rarr; {kw.winner_domain}
                        </span>
                      )}
                      {kw.brand_position && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                            kw.brand_position === 1
                              ? 'bg-emerald-100 text-emerald-700'
                              : kw.brand_position <= 3
                              ? 'bg-emerald-50 text-emerald-600'
                              : kw.brand_position <= 10
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          You: #{kw.brand_position}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Competitors Tab ─────────────────────────────────────────────────────────

function CompetitorsTab({
  competitorsByType,
}: {
  competitorsByType: Record<string, (CategoryCompetitor | OpportunityCompetitor)[]>;
}) {
  const { getStyles, getIcon } = useMarketConfig();
  const types = Object.keys(competitorsByType);

  if (types.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">No competitor data available</div>
    );
  }

  return (
    <div className="space-y-4">
      {types.map((type) => {
        const competitors = competitorsByType[type];
        const styles = getStyles(type);
        const Icon = getIcon(type);

        return (
          <div
            key={type}
            className={`rounded-xl border ${styles.borderColor} overflow-hidden`}
          >
            <div className={`flex items-center gap-2 px-4 py-3 ${styles.bgColor}`}>
              <Icon className={`w-4 h-4 ${styles.textColor}`} />
              <span className={`text-sm font-semibold ${styles.textColor}`}>{type}</span>
              <span className="text-xs text-gray-500 ml-auto">
                {competitors.length} domains
              </span>
            </div>
            <div className="divide-y divide-gray-100">
              {competitors.slice(0, 6).map((comp, i) => (
                <div
                  key={`${type}-${i}`}
                  className="flex items-center justify-between px-4 py-2.5 bg-white hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900">{comp.domain}</div>
                    <div className="text-xs text-gray-500">
                      {comp.wins_count} wins &middot; {formatCompactNumber(comp.wins_volume)}{' '}
                      volume
                    </div>
                  </div>
                  <span
                    className={`text-sm font-semibold px-2 py-0.5 rounded ${
                      comp.avg_position <= 3
                        ? 'bg-emerald-100 text-emerald-700'
                        : comp.avg_position <= 10
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    #{comp.avg_position.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Keywords Tab ────────────────────────────────────────────────────────────

function ProtectionKeywordsTab({
  winners,
  losers,
}: {
  winners: ExampleWinnerKeyword[];
  losers: ExampleLoserKeyword[];
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Winners */}
      <div className="rounded-xl border border-emerald-200 overflow-hidden">
        <div className="bg-emerald-50 px-4 py-2.5">
          <h4 className="text-sm font-semibold text-emerald-700 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Wins ({winners.length})
          </h4>
        </div>
        <div className="divide-y divide-emerald-100">
          {winners.slice(0, 10).map((kw, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-4 py-2 text-sm"
            >
              <span className="text-emerald-800 truncate flex-1 mr-2" dir="auto">
                {kw.keyword}
              </span>
              <span className="text-xs text-emerald-600 font-medium whitespace-nowrap">
                {formatCompactNumber(kw.volume)}
              </span>
            </div>
          ))}
          {winners.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-500 italic">No wins</div>
          )}
        </div>
      </div>

      {/* Losers */}
      <div className="rounded-xl border border-rose-200 overflow-hidden">
        <div className="bg-rose-50 px-4 py-2.5">
          <h4 className="text-sm font-semibold text-rose-700 flex items-center gap-2">
            <TrendingDown className="w-4 h-4" />
            Losses ({losers.length})
          </h4>
        </div>
        <div className="divide-y divide-rose-100">
          {losers.slice(0, 10).map((kw, i) => (
            <div key={i} className="px-4 py-2 text-sm">
              <div className="text-rose-800 truncate" dir="auto">
                {kw.keyword}
              </div>
              <div className="text-xs text-rose-600 mt-0.5">
                Lost to {kw.winner_domain} (#{kw.winner_position}) &middot;{' '}
                {formatCompactNumber(kw.volume)}
              </div>
            </div>
          ))}
          {losers.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-500 italic">No losses</div>
          )}
        </div>
      </div>
    </div>
  );
}

function OpportunityKeywordsTab({
  keywords,
}: {
  keywords: OpportunityKeywordDetail[];
}) {
  const { getStyles, getIcon } = useMarketConfig();

  if (keywords.length === 0) {
    return <div className="text-sm text-gray-500 italic py-4 text-center">No example keywords</div>;
  }

  return (
    <div className="space-y-2">
      {keywords.map((kw, idx) => {
        const styles = kw.winner_domain_type ? getStyles(kw.winner_domain_type) : null;
        const Icon = kw.winner_domain_type ? getIcon(kw.winner_domain_type) : null;

        return (
          <div
            key={idx}
            className="flex items-center justify-between py-2.5 px-3 bg-white rounded-lg border border-gray-200 text-sm hover:border-emerald-300 transition-colors"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="font-medium text-gray-900 truncate" dir="auto">
                {kw.keyword}
              </span>
              <span className="text-gray-500 flex-shrink-0">
                {formatCompactNumber(kw.volume)}
              </span>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              {kw.winner_domain && (
                <div className="flex items-center gap-1">
                  {Icon && styles && (
                    <Icon className={`w-3 h-3 ${styles.textColor}`} />
                  )}
                  <span className="text-amber-600">#{kw.winner_position}</span>
                  <span className="text-gray-600 truncate max-w-[100px]">
                    {kw.winner_domain}
                  </span>
                </div>
              )}

              {kw.brand_position ? (
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    kw.brand_position === 1
                      ? 'bg-emerald-100 text-emerald-700'
                      : kw.brand_position <= 3
                      ? 'bg-emerald-50 text-emerald-600'
                      : kw.brand_position <= 10
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  You: #{kw.brand_position}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-600">
                  Not ranked
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Loss Distribution Section (Protection only) ─────────────────────────────

function LossDistribution({ losses }: { losses: DomainTypeLossDetail[] }) {
  const { getStyles, getIcon } = useMarketConfig();

  if (losses.length === 0) return null;

  const maxVolume = Math.max(...losses.map((l) => l.loss_volume));

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-rose-500" />
        Who Beats You
      </h4>
      <div className="space-y-3">
        {losses.map((d) => {
          const styles = getStyles(d.domain_type);
          const Icon = getIcon(d.domain_type);
          const widthPct = maxVolume > 0 ? (d.loss_volume / maxVolume) * 100 : 0;

          return (
            <div key={d.domain_type} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`w-3.5 h-3.5 ${styles.textColor}`} />
                  <span className="text-sm font-medium text-gray-700">{d.domain_type}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{formatNumber(d.loss_count)} keywords</span>
                  <span className="font-semibold text-gray-700">
                    {formatCompactNumber(d.loss_volume)}
                  </span>
                </div>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    styles.textColor.includes('emerald')
                      ? 'bg-emerald-400'
                      : styles.textColor.includes('blue')
                      ? 'bg-blue-400'
                      : styles.textColor.includes('purple')
                      ? 'bg-purple-400'
                      : styles.textColor.includes('amber')
                      ? 'bg-amber-400'
                      : styles.textColor.includes('rose')
                      ? 'bg-rose-400'
                      : 'bg-gray-400'
                  }`}
                  style={{ width: `${widthPct}%`, transition: 'width 0.4s ease' }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export function ModifierGroupDrawer({
  isOpen,
  onClose,
  modifierGroup,
  brandName,
  context,
  keywordType = 'nonbranded',
}: ModifierGroupDrawerProps) {
  const [breakdown, setBreakdown] = useState<BreakdownData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'values' | 'competitors' | 'keywords'>('values');

  const fetchData = () => {
    setLoading(true);
    setError(null);
    setActiveTab('values');

    const promise =
      context === 'protection'
        ? getModifierGroupProtectionBreakdown(brandName, modifierGroup, 10)
        : getModifierGroupOpportunityBreakdown(brandName, modifierGroup, keywordType);

    promise
      .then(setBreakdown)
      .catch((err) => setError(err.message || 'Failed to load data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen && modifierGroup && brandName) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, modifierGroup, brandName, context, keywordType]);

  const tabs = [
    {
      id: 'values' as const,
      label: context === 'protection' ? 'Tags' : 'Values',
      icon: Tag,
    },
    { id: 'competitors' as const, label: 'Competitors', icon: Users },
    { id: 'keywords' as const, label: 'Keywords', icon: FileText },
  ];

  const subtitle = context === 'protection' ? 'Brand Protection' : 'Opportunity Analysis';

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={modifierGroup}
      subtitle={subtitle}
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
          <HeroStats data={breakdown} context={context} />

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
              {isProtectionBreakdown(breakdown, context) ? (
                <ProtectionTagsTab tags={breakdown.top_tags} />
              ) : isOpportunityBreakdown(breakdown, context) ? (
                <OpportunityValuesTab values={breakdown.top_values} />
              ) : null}
            </div>
          )}

          {activeTab === 'competitors' && (
            <CompetitorsTab competitorsByType={breakdown.competitors_by_type} />
          )}

          {activeTab === 'keywords' && (
            <div>
              {isProtectionBreakdown(breakdown, context) ? (
                <ProtectionKeywordsTab
                  winners={breakdown.example_winners}
                  losers={breakdown.example_losers}
                />
              ) : isOpportunityBreakdown(breakdown, context) ? (
                <OpportunityKeywordsTab keywords={breakdown.example_keywords} />
              ) : null}
            </div>
          )}

          {/* Loss Distribution (Protection only) */}
          {isProtectionBreakdown(breakdown, context) &&
            breakdown.loss_distribution_by_type.length > 0 && (
              <LossDistribution losses={breakdown.loss_distribution_by_type} />
            )}
        </div>
      ) : null}
    </Drawer>
  );
}

export default ModifierGroupDrawer;
