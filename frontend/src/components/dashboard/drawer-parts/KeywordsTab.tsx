/**
 * Shared KeywordsTab sub-component for drawers.
 * Protection: two-column winners/losers layout
 * Opportunity: single-column with keyword, volume, winner domain, brand position
 * Market: simple keyword + volume list
 */

import { TrendingUp, TrendingDown } from 'lucide-react';
import { useMarketConfig } from '@/contexts/MarketConfigContext';
import { formatCompactNumber } from '@/utils/formatters';
import type { DrawerContext } from './HeroStats';
import type { ExampleWinnerKeyword, ExampleLoserKeyword, OpportunityKeywordDetail } from '@/types';

interface MarketKeyword {
  keyword: string;
  volume: number;
}

interface KeywordsTabProps {
  context: DrawerContext;
  /** Protection context */
  winners?: ExampleWinnerKeyword[];
  losers?: ExampleLoserKeyword[];
  /** Opportunity context */
  opportunityKeywords?: OpportunityKeywordDetail[];
  /** Market context */
  marketKeywords?: MarketKeyword[];
}

export function KeywordsTab({
  context,
  winners,
  losers,
  opportunityKeywords,
  marketKeywords,
}: KeywordsTabProps) {
  if (context === 'protection') {
    return <ProtectionKeywords winners={winners ?? []} losers={losers ?? []} />;
  }
  if (context === 'opportunity') {
    return <OpportunityKeywords keywords={opportunityKeywords ?? []} />;
  }
  return <MarketKeywords keywords={marketKeywords ?? []} />;
}

// ── Protection: Winners / Losers columns ────────────────────────────────────

function ProtectionKeywords({
  winners,
  losers,
}: {
  winners: ExampleWinnerKeyword[];
  losers: ExampleLoserKeyword[];
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="rounded-xl border border-emerald-200 overflow-hidden">
        <div className="bg-emerald-50 px-4 py-2.5">
          <h4 className="text-sm font-semibold text-emerald-700 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Wins ({winners.length})
          </h4>
        </div>
        <div className="divide-y divide-emerald-100">
          {winners.slice(0, 10).map((kw, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-2 text-sm">
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

// ── Opportunity: Single column with brand position ──────────────────────────

function OpportunityKeywords({ keywords }: { keywords: OpportunityKeywordDetail[] }) {
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
                  {Icon && styles && <Icon className={`w-3 h-3 ${styles.textColor}`} />}
                  <span className="text-amber-600">#{kw.winner_position}</span>
                  <span className="text-gray-600 truncate max-w-[100px]">{kw.winner_domain}</span>
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

// ── Market: Simple keyword + volume list ────────────────────────────────────

function MarketKeywords({ keywords }: { keywords: MarketKeyword[] }) {
  if (keywords.length === 0) {
    return <div className="text-sm text-gray-500 italic py-4 text-center">No keywords available</div>;
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="flex flex-wrap gap-2">
        {keywords.slice(0, 12).map((kw, i) => (
          <span
            key={i}
            className="px-3 py-1 text-sm bg-purple-50 text-purple-700 rounded-lg border border-purple-200"
          >
            {kw.keyword}
            {kw.volume > 0 && (
              <span className="text-xs text-purple-500 ml-1">
                ({formatCompactNumber(kw.volume)})
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

export default KeywordsTab;
