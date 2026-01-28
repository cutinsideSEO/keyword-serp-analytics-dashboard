/**
 * Shared HeroStats sub-component for drawer hero sections.
 * Adapts display based on context: market (totals only), protection (win rate ring),
 * or opportunity (capture rate ring).
 */

import { Target, TrendingUp, TrendingDown } from 'lucide-react';
import { formatNumber, formatCompactNumber } from '@/utils/formatters';

export type DrawerContext = 'market' | 'protection' | 'opportunity';

interface BrandMetrics {
  total_keywords: number;
  total_volume: number;
  avg_brand_position?: number | null;
  /** Protection metrics */
  win_rate?: number;
  keywords_winning?: number;
  volume_winning?: number;
  keywords_losing?: number;
  volume_losing?: number;
  /** Opportunity metrics */
  capture_rate?: number;
  keywords_captured?: number;
  volume_captured?: number;
}

interface MarketMetrics {
  total_keywords: number;
  total_volume: number;
  /** Count of values or tags */
  itemCount?: number;
  itemLabel?: string;
}

interface HeroStatsProps {
  context: DrawerContext;
  metrics: BrandMetrics | MarketMetrics;
}

export function HeroStats({ context, metrics }: HeroStatsProps) {
  if (context === 'market') {
    return <MarketHero metrics={metrics as MarketMetrics} />;
  }
  return <BrandHero context={context} metrics={metrics as BrandMetrics} />;
}

// ── Market Hero (no ring, just totals) ──────────────────────────────────────

function MarketHero({ metrics }: { metrics: MarketMetrics }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-center">
        <div className="text-2xl font-semibold text-emerald-600">
          {formatNumber(metrics.total_keywords)}
        </div>
        <div className="text-xs text-gray-500">Keywords</div>
      </div>
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-center">
        <div className="text-2xl font-semibold text-emerald-600">
          {formatCompactNumber(metrics.total_volume)}
        </div>
        <div className="text-xs text-gray-500">Total Volume</div>
      </div>
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-center">
        <div className="text-2xl font-semibold text-emerald-600">
          {metrics.itemCount ?? 0}
        </div>
        <div className="text-xs text-gray-500">{metrics.itemLabel ?? 'Items'}</div>
      </div>
    </div>
  );
}

// ── Brand Hero (protection / opportunity with ring) ─────────────────────────

function BrandHero({
  context,
  metrics,
}: {
  context: 'protection' | 'opportunity';
  metrics: BrandMetrics;
}) {
  const primaryRate = context === 'protection' ? (metrics.win_rate ?? 0) : (metrics.capture_rate ?? 0);
  const primaryLabel = context === 'protection' ? 'Win Rate' : 'Capture Rate';

  const wonCount =
    context === 'protection' ? (metrics.keywords_winning ?? 0) : (metrics.keywords_captured ?? 0);
  const wonVolume =
    context === 'protection' ? (metrics.volume_winning ?? 0) : (metrics.volume_captured ?? 0);
  const wonLabel = context === 'protection' ? 'Won' : 'Captured';

  const lostCount =
    context === 'protection'
      ? (metrics.keywords_losing ?? 0)
      : metrics.total_keywords - (metrics.keywords_captured ?? 0);
  const lostVolume =
    context === 'protection'
      ? (metrics.volume_losing ?? 0)
      : metrics.total_volume - (metrics.volume_captured ?? 0);
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
      <div className="flex items-center gap-6 p-5 bg-gray-50 rounded-xl border border-gray-200">
        <div className="relative w-24 h-24 flex-shrink-0">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r="40" fill="none" stroke="#e5e7eb" strokeWidth="6" />
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
            <span className={`text-lg font-semibold ${rateColor}`}>{(primaryRate ?? 0).toFixed(0)}%</span>
          </div>
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-500 mb-1">{primaryLabel}</div>
          <div className={`text-2xl font-semibold ${rateColor}`}>{(primaryRate ?? 0).toFixed(1)}%</div>
          <div className="text-sm text-gray-500 mt-1">
            {formatNumber(metrics.total_keywords)} keywords &middot;{' '}
            {formatCompactNumber(metrics.total_volume)} volume
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
          <div className="text-lg font-semibold text-gray-900">
            {metrics.avg_brand_position ? `#${metrics.avg_brand_position.toFixed(1)}` : 'N/A'}
          </div>
        </div>
        <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200 text-center">
          <div className="flex items-center justify-center gap-1 text-emerald-600 text-xs mb-1">
            <TrendingUp className="h-3 w-3" />
            {wonLabel}
          </div>
          <div className="text-lg font-semibold text-emerald-700">{formatNumber(wonCount)}</div>
          <div className="text-xs text-emerald-600">{formatCompactNumber(wonVolume)} vol</div>
        </div>
        <div className="bg-rose-50 rounded-lg p-3 border border-rose-200 text-center">
          <div className="flex items-center justify-center gap-1 text-rose-600 text-xs mb-1">
            <TrendingDown className="h-3 w-3" />
            {lostLabel}
          </div>
          <div className="text-lg font-semibold text-rose-700">{formatNumber(lostCount)}</div>
          <div className="text-xs text-rose-600">{formatCompactNumber(lostVolume)} vol</div>
        </div>
      </div>
    </div>
  );
}

export default HeroStats;
