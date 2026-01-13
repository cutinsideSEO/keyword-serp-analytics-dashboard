/**
 * Expanded details component for opportunity modifier groups.
 * Lazy loads detailed breakdown data when a row is expanded.
 * Shows category values breakdown + competitors by type + detailed keywords.
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Loader2,
  TrendingUp,
  Tag,
  FileText,
  Users,
  ExternalLink,
} from 'lucide-react';
import type {
  ModifierGroupOpportunityBreakdown,
  OpportunityCategoryValue,
  OpportunityKeywordDetail,
  OpportunityCompetitor,
} from '../../types';
import { getModifierGroupOpportunityBreakdown } from '../../api/endpoints';
import { formatNumber, formatCompactNumber, formatPercent } from '../../utils/formatters';
import { useMarketConfig } from '../../contexts/MarketConfigContext';

interface OpportunityExpandedDetailsProps {
  brandName: string;
  modifierGroup: string;
  keywordType: 'nonbranded' | 'competitor_branded';
}

function CategoryValueCard({ value }: { value: OpportunityCategoryValue }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:border-emerald-300 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-emerald-600 text-sm font-medium">{value.category_name}:</span>
          <span className="font-semibold text-gray-900">{value.value}</span>
        </div>
        <span
          className={`px-2 py-1 rounded-md text-xs font-bold ${
            value.capture_rate >= 50
              ? 'bg-emerald-100 text-emerald-700'
              : value.capture_rate >= 25
              ? 'bg-amber-100 text-amber-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {formatPercent(value.capture_rate)} captured
        </span>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
        <span>{formatNumber(value.total_keywords)} keywords</span>
        <span>{formatCompactNumber(value.total_volume)} volume</span>
        <span className="text-emerald-600">{formatNumber(value.keywords_captured)} captured</span>
      </div>

      {value.top_keywords.length > 0 && (
        <div className="space-y-1">
          {value.top_keywords.slice(0, 3).map((kw, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between text-xs py-1 px-2 bg-gray-50 rounded"
            >
              <span className="text-gray-700 truncate max-w-[200px]" dir="auto">
                {kw.keyword}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">{formatCompactNumber(kw.volume)}</span>
                {kw.winner_domain && (
                  <span className="text-amber-600 truncate max-w-[100px]">
                    #{kw.winner_position} → {kw.winner_domain}
                  </span>
                )}
                {kw.brand_position && (
                  <span className="text-emerald-600">You: #{kw.brand_position}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CompetitorsByTypeSection({
  competitorsByType,
}: {
  competitorsByType: Record<string, OpportunityCompetitor[]>;
}) {
  const { getStyles, getIcon } = useMarketConfig();

  const types = Object.keys(competitorsByType);

  if (types.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic">
        No competitors ranking #1 on these keywords
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {types.map((type) => {
        const competitors = competitorsByType[type];
        const styles = getStyles(type);
        const Icon = getIcon(type);

        return (
          <div
            key={type}
            className={`p-3 rounded-lg border ${styles.bgColor} ${styles.borderColor}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${styles.textColor}`} />
              <span className={`text-sm font-semibold ${styles.textColor}`}>{type}</span>
            </div>
            <div className="space-y-1">
              {competitors.map((comp, idx) => (
                <div key={idx} className="flex justify-between text-xs">
                  <span className="text-gray-700 truncate max-w-[150px]">{comp.domain}</span>
                  <span className="font-medium text-gray-900">
                    {formatCompactNumber(comp.wins_volume)}
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

function ExampleKeywordsSection({ keywords }: { keywords: OpportunityKeywordDetail[] }) {
  const { getStyles, getIcon } = useMarketConfig();

  if (keywords.length === 0) {
    return <div className="text-sm text-gray-500 italic">No example keywords</div>;
  }

  return (
    <div className="space-y-2">
      {keywords.map((kw, idx) => {
        const styles = kw.winner_domain_type ? getStyles(kw.winner_domain_type) : null;
        const Icon = kw.winner_domain_type ? getIcon(kw.winner_domain_type) : null;

        return (
          <div
            key={idx}
            className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-gray-200 text-sm"
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
                  <span className="text-amber-600">
                    #{kw.winner_position}
                  </span>
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

export function OpportunityExpandedDetails({
  brandName,
  modifierGroup,
  keywordType,
}: OpportunityExpandedDetailsProps) {
  const [breakdown, setBreakdown] = useState<ModifierGroupOpportunityBreakdown | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchBreakdown() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getModifierGroupOpportunityBreakdown(
          brandName,
          modifierGroup,
          keywordType
        );
        if (!cancelled) {
          setBreakdown(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load breakdown');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchBreakdown();

    return () => {
      cancelled = true;
    };
  }, [brandName, modifierGroup, keywordType]);

  if (isLoading) {
    return (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <div className="py-8 px-6 bg-gradient-to-r from-gray-50 to-emerald-50/30 border-t border-gray-100 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mr-2" />
          <span className="text-gray-600">Loading breakdown...</span>
        </div>
      </motion.div>
    );
  }

  if (error || !breakdown) {
    return (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <div className="py-8 px-6 bg-gradient-to-r from-gray-50 to-red-50/30 border-t border-gray-100 text-center">
          <span className="text-red-600">{error || 'No data available'}</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="overflow-hidden"
    >
      <div className="py-4 px-6 bg-gradient-to-r from-gray-50 to-emerald-50/30 border-t border-gray-100">
        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-3 border border-gray-200 text-center">
            <div className="text-2xl font-bold text-gray-900">
              {formatCompactNumber(breakdown.total_volume)}
            </div>
            <div className="text-xs text-gray-500">Total Volume</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-emerald-200 text-center">
            <div className="text-2xl font-bold text-emerald-600">
              {formatPercent(breakdown.capture_rate)}
            </div>
            <div className="text-xs text-gray-500">Capture Rate</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200 text-center">
            <div className="text-2xl font-bold text-gray-900">
              {breakdown.avg_brand_position
                ? `#${breakdown.avg_brand_position.toFixed(1)}`
                : 'N/A'}
            </div>
            <div className="text-xs text-gray-500">Avg Position</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-amber-200 text-center">
            <div className="text-2xl font-bold text-amber-600">
              {formatCompactNumber(breakdown.total_volume - breakdown.volume_captured)}
            </div>
            <div className="text-xs text-gray-500">Volume to Capture</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Category Values */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-600" />
              Top Category Values
            </h4>
            {breakdown.top_values.length > 0 ? (
              <div className="space-y-3">
                {breakdown.top_values.slice(0, 5).map((value, idx) => (
                  <CategoryValueCard key={idx} value={value} />
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic">No category values found</div>
            )}
          </div>

          {/* Right Column - Competitors + Keywords */}
          <div className="space-y-6">
            {/* Competitors by Type */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                Top Competitors by Domain Type
              </h4>
              <CompetitorsByTypeSection competitorsByType={breakdown.competitors_by_type} />
            </div>

            {/* Example Keywords */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                Example Keywords
              </h4>
              <ExampleKeywordsSection keywords={breakdown.example_keywords} />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default OpportunityExpandedDetails;
