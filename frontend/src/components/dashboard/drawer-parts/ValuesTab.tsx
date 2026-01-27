/**
 * Shared ValuesTab sub-component for drawers.
 * Renders category values (for CategoryDetailDrawer) or modifier group tags
 * (for ModifierGroupDrawer) with context-aware metrics.
 *
 * Protection: value + win_rate badge + progress bar + example winners/losers
 * Opportunity: value + capture_rate badge + keyword details with brand position
 * Market: value + keyword count + volume + example keywords
 */

import { Hash } from 'lucide-react';
import { formatNumber, formatCompactNumber, formatPercent } from '@/utils/formatters';
import type {
  CategoryValueProtectionStats,
  TagProtectionStats,
  OpportunityCategoryValue,
  CategoryValueMarketStats,
} from '@/types';

// ── Protection values (for CategoryDetailDrawer) ────────────────────────────

export function ProtectionValuesTab({ values }: { values: CategoryValueProtectionStats[] }) {
  if (values.length === 0) {
    return <div className="text-sm text-gray-500 italic py-4 text-center">No values available</div>;
  }

  return (
    <div className="space-y-3">
      {values.map((value) => {
        const rateColor =
          value.win_rate >= 80
            ? 'bg-emerald-100 text-emerald-700'
            : value.win_rate >= 50
            ? 'bg-amber-100 text-amber-700'
            : 'bg-rose-100 text-rose-700';

        const barPct = value.total_volume > 0 ? (value.volume_winning / value.total_volume) * 100 : 0;

        return (
          <div
            key={value.value}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-gray-900">{value.value}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${rateColor}`}>
                {value.win_rate.toFixed(0)}% win rate
              </span>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
                  style={{ width: `${barPct}%`, transition: 'width 0.4s ease' }}
                />
              </div>
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {formatCompactNumber(value.volume_winning)} / {formatCompactNumber(value.total_volume)}
              </span>
            </div>

            <div className="space-y-1">
              {value.example_winners.slice(0, 2).map((kw, i) => (
                <div
                  key={`w-${i}`}
                  className="flex items-center justify-between text-xs py-1.5 px-2 bg-emerald-50 rounded"
                >
                  <span className="text-emerald-800 truncate max-w-[200px]" dir="auto">
                    {kw.keyword}
                  </span>
                  <span className="text-emerald-600 font-medium">
                    {formatCompactNumber(kw.volume)}
                  </span>
                </div>
              ))}
              {value.example_losers.slice(0, 2).map((kw, i) => (
                <div
                  key={`l-${i}`}
                  className="flex items-center justify-between text-xs py-1.5 px-2 bg-rose-50 rounded"
                >
                  <span className="text-rose-800 truncate max-w-[200px]" dir="auto">
                    {kw.keyword}
                  </span>
                  <span className="text-rose-600">
                    &rarr; {kw.winner_domain} (#{kw.winner_position})
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

// ── Protection tags (for ModifierGroupDrawer) ───────────────────────────────

export function ProtectionTagsTab({ tags }: { tags: TagProtectionStats[] }) {
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
          tag.win_rate >= 80 ? 'bg-emerald-400' : tag.win_rate >= 50 ? 'bg-amber-400' : 'bg-rose-400';

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

// ── Opportunity values (for ModifierGroupDrawer + CategoryDetailDrawer) ─────

export function OpportunityValuesTab({ values }: { values: OpportunityCategoryValue[] }) {
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
                <span className="text-emerald-600 text-sm font-medium">{value.category_name}:</span>
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

// ── Market values (for CategoryDetailDrawer in market context) ──────────────

export function MarketValuesTab({ values }: { values: CategoryValueMarketStats[] }) {
  if (values.length === 0) {
    return <div className="text-sm text-gray-500 italic py-4 text-center">No values available</div>;
  }

  const maxVolume = values[0]?.total_volume || 1;

  return (
    <div className="space-y-3">
      {values.map((value) => {
        const percentage = (value.total_volume / maxVolume) * 100;

        return (
          <div key={value.value} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900">{value.value}</span>
              <span className="font-semibold text-emerald-600">
                {formatCompactNumber(value.total_volume)}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-emerald-400 rounded-full"
                style={{ width: `${percentage}%`, transition: 'width 0.4s ease' }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{value.keyword_count.toLocaleString()} keywords</span>
              <span>{percentage.toFixed(0)}% of category</span>
            </div>

            {value.example_keywords && value.example_keywords.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {value.example_keywords.slice(0, 4).map((kw, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 text-xs bg-emerald-50 text-emerald-700 rounded border border-emerald-200"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Market tags (for ModifierGroupDrawer in market context) ─────────────────

export function MarketTagsTab({ tags }: { tags: Array<{ tag: string; count: number }> }) {
  if (!tags || tags.length === 0) {
    return <div className="text-center py-8 text-gray-500">No tag data available</div>;
  }

  const maxCount = tags[0]?.count || 1;

  return (
    <div className="space-y-2">
      {tags.map((tag, i) => {
        const percentage = (tag.count / maxCount) * 100;

        return (
          <div key={i} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900">{tag.tag}</span>
              <span className="text-sm text-purple-600">{tag.count} keywords</span>
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
    </div>
  );
}

// All exports are named; import the specific tab variant you need.
