/**
 * CombinationKeywordsDrawer - Drill-down drawer for heatmap cell keywords.
 * Shows keywords for a specific (row_value, col_value) combination.
 */

import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Search, TrendingUp, CheckCircle2, XCircle } from 'lucide-react';
import { Drawer } from '../common/Drawer';
import { getCombinationKeywords } from '../../api/endpoints';
import { useMarketConfig } from '../../contexts/MarketConfigContext';
import { formatNumber, formatCompactNumber, formatPercent } from '../../utils/formatters';
import type { CombinationKeywordsResponse, CombinationKeyword } from '../../types';

interface CombinationKeywordsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  modifierGroup: string;
  rowCategory: string;
  rowValue: string;
  colCategory: string;
  colValue: string;
  brandName: string;
  keywordType: 'nonbranded' | 'competitor_branded';
}

function DomainBadge({ domain, domainType }: { domain: string; domainType: string }) {
  const { getStyles, getIcon } = useMarketConfig();
  const styles = getStyles(domainType);
  const Icon = getIcon(domainType);

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${styles.bgColor} ${styles.textColor} ${styles.borderColor} border`}
    >
      <Icon className="w-3 h-3" />
      {domain.length > 20 ? domain.substring(0, 20) + '...' : domain}
    </span>
  );
}

function KeywordRow({ keyword }: { keyword: CombinationKeyword }) {
  const { getStyles } = useMarketConfig();

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      {/* Keyword */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="font-medium text-gray-900 text-sm">{keyword.keyword}</span>
        </div>
      </td>

      {/* Volume */}
      <td className="px-4 py-3 text-right">
        <span className="font-semibold text-gray-900 text-sm">
          {formatCompactNumber(keyword.volume)}
        </span>
      </td>

      {/* Brand Position */}
      <td className="px-4 py-3 text-center">
        {keyword.brand_position != null ? (
          <span
            className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold ${
              keyword.brand_position <= 3
                ? 'bg-emerald-100 text-emerald-700'
                : keyword.brand_position <= 10
                ? 'bg-amber-100 text-amber-700'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            #{keyword.brand_position}
          </span>
        ) : (
          <span className="text-gray-400 text-xs italic">Not ranking</span>
        )}
      </td>

      {/* Status */}
      <td className="px-4 py-3 text-center">
        {keyword.is_captured ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-100 text-emerald-700 text-xs font-medium">
            <CheckCircle2 className="w-3 h-3" />
            Captured
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-100 text-amber-700 text-xs font-medium">
            <XCircle className="w-3 h-3" />
            Opportunity
          </span>
        )}
      </td>

      {/* Winner */}
      <td className="px-4 py-3">
        {keyword.winner_domain ? (
          <DomainBadge
            domain={keyword.winner_domain}
            domainType={keyword.winner_domain_type || '3rd Party'}
          />
        ) : (
          <span className="text-gray-400 text-xs italic">No winner</span>
        )}
      </td>

      {/* Top 5 */}
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {keyword.top_5.slice(0, 3).map((ranker, idx) => {
            const styles = getStyles(ranker.domain_type);
            return (
              <span
                key={idx}
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs ${styles.bgColor} ${styles.textColor}`}
                title={`#${ranker.rank}: ${ranker.domain}`}
              >
                <span className="font-bold">#{ranker.rank}</span>
              </span>
            );
          })}
          {keyword.top_5.length > 3 && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-xs">
              +{keyword.top_5.length - 3}
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

export function CombinationKeywordsDrawer({
  isOpen,
  onClose,
  onBack,
  modifierGroup,
  rowCategory,
  rowValue,
  colCategory,
  colValue,
  brandName,
  keywordType,
}: CombinationKeywordsDrawerProps) {
  // Fetch combination keywords
  const {
    data,
    isLoading,
    error,
  } = useQuery<CombinationKeywordsResponse>({
    queryKey: ['combinationKeywords', modifierGroup, rowValue, colValue, brandName, keywordType],
    queryFn: () =>
      getCombinationKeywords(
        brandName,
        modifierGroup,
        rowCategory,
        rowValue,
        colCategory,
        colValue,
        keywordType
      ),
    enabled: isOpen && !!modifierGroup && !!brandName && !!rowValue && !!colValue,
  });

  const captureRateColor =
    (data?.capture_rate ?? 0) >= 50
      ? 'text-emerald-600'
      : (data?.capture_rate ?? 0) >= 25
      ? 'text-amber-600'
      : 'text-rose-600';

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="" size="xl">
      <div className="flex flex-col h-full">
        {/* Header with Back Button */}
        <div className="px-6 py-4 border-b border-gray-200">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Heatmap
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Search className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {rowValue} + {colValue}
              </h2>
              <p className="text-sm text-gray-500">
                Keywords in {modifierGroup}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-red-500">Failed to load keyword data</p>
            </div>
          ) : data ? (
            <div className="p-6 space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-500 mb-1">Total Keywords</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {formatNumber(data.total_keywords)}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-500 mb-1">Total Volume</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {formatCompactNumber(data.total_volume)}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-500 mb-1">Volume to Capture</p>
                  <p className="text-xl font-semibold text-amber-600">
                    {formatCompactNumber(data.volume_uncaptured)}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-500 mb-1">Capture Rate</p>
                  <p className={`text-xl font-semibold ${captureRateColor}`}>
                    {formatPercent(data.capture_rate)}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">Capture Progress</span>
                  <span className="font-medium text-gray-900">
                    {formatCompactNumber(data.volume_captured)} / {formatCompactNumber(data.total_volume)}
                  </span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(data.capture_rate, 100)}%` }}
                  />
                </div>
              </div>

              {/* Keywords Table */}
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-gray-500" />
                    Keywords ({data.keywords.length})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Keyword
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Volume
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Your Pos
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Winner
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Top 5
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.keywords.map((kw) => (
                        <KeywordRow key={kw.keyword_id} keyword={kw} />
                      ))}
                    </tbody>
                  </table>
                </div>
                {data.keywords.length === 0 && (
                  <div className="text-center py-12">
                    <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No keywords found for this combination</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-20">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Select a heatmap cell to view keywords</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            Showing keywords sorted by volume • Click back to return to heatmap
          </p>
        </div>
      </div>
    </Drawer>
  );
}

export default CombinationKeywordsDrawer;
