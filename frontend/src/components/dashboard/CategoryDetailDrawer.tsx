/**
 * CategoryDetailDrawer component.
 * Shows detailed breakdown when clicking a category row in DataExplorer.
 * Upgraded with hero stats, custom CSS visualizations, and shared formatters.
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
  BarChart3,
} from 'lucide-react';
import { Drawer } from '../common/Drawer';
import { useMarketConfig } from '../../contexts/MarketConfigContext';
import type {
  CategoryProtectionBreakdown,
  CategoryValueProtectionStats,
  CategoryCompetitor,
  DomainTypeLossDetail,
} from '../../types';
import { getCategoryProtectionBreakdown } from '../../api/endpoints';
import { formatNumber, formatCompactNumber } from '../../utils/formatters';

interface CategoryDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  categoryName: string;
  displayName: string;
  brandName: string;
  context: 'protection' | 'market' | 'opportunity';
}

// ── Hero Stats Section ──────────────────────────────────────────────────────

function HeroStats({ data }: { data: CategoryProtectionBreakdown }) {
  const rateColor =
    data.win_rate >= 80
      ? 'text-emerald-600'
      : data.win_rate >= 50
      ? 'text-amber-600'
      : 'text-rose-600';

  const ringColor =
    data.win_rate >= 80
      ? 'stroke-emerald-500'
      : data.win_rate >= 50
      ? 'stroke-amber-500'
      : 'stroke-rose-500';

  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (data.win_rate / 100) * circumference;

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
              {data.win_rate.toFixed(0)}%
            </span>
          </div>
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-500 mb-1">Win Rate</div>
          <div className={`text-3xl font-bold ${rateColor}`}>
            {data.win_rate.toFixed(1)}%
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
            Won
          </div>
          <div className="text-lg font-bold text-emerald-700">
            {formatNumber(data.keywords_winning)}
          </div>
          <div className="text-xs text-emerald-600">
            {formatCompactNumber(data.volume_winning)} vol
          </div>
        </div>
        <div className="bg-rose-50 rounded-lg p-3 border border-rose-200 text-center">
          <div className="flex items-center justify-center gap-1 text-rose-600 text-xs mb-1">
            <TrendingDown className="h-3 w-3" />
            Lost
          </div>
          <div className="text-lg font-bold text-rose-700">
            {formatNumber(data.keywords_losing)}
          </div>
          <div className="text-xs text-rose-600">
            {formatCompactNumber(data.volume_losing)} vol
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Values Tab ──────────────────────────────────────────────────────────────

function ValuesTab({ values }: { values: CategoryValueProtectionStats[] }) {
  if (values.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic py-4 text-center">No values available</div>
    );
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

        const barPct =
          value.total_volume > 0 ? (value.volume_winning / value.total_volume) * 100 : 0;

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

            {/* Progress bar */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
                  style={{ width: `${barPct}%`, transition: 'width 0.4s ease' }}
                />
              </div>
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {formatCompactNumber(value.volume_winning)} /{' '}
                {formatCompactNumber(value.total_volume)}
              </span>
            </div>

            {/* Example keywords as rich rows */}
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

// ── Volume by Value (Custom Horizontal Stacked Bars) ────────────────────────

function VolumeByValue({ values }: { values: CategoryValueProtectionStats[] }) {
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
          const wonPct =
            v.total_volume > 0 ? (v.volume_winning / v.total_volume) * 100 : 0;

          return (
            <div key={v.value} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-700 font-medium truncate max-w-[200px]">
                  {v.value}
                </span>
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

// ── Competitors Tab ─────────────────────────────────────────────────────────

function CompetitorsTab({
  competitorsByType,
}: {
  competitorsByType: Record<string, CategoryCompetitor[]>;
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
                      {comp.wins_count} wins &middot;{' '}
                      {formatCompactNumber(comp.wins_volume)} volume
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

// ── Loss Distribution (Custom CSS) ──────────────────────────────────────────

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

export function CategoryDetailDrawer({
  isOpen,
  onClose,
  categoryName,
  displayName,
  brandName,
  context: _context,
}: CategoryDetailDrawerProps) {
  const [breakdown, setBreakdown] = useState<CategoryProtectionBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'values' | 'competitors' | 'keywords'>('values');

  const fetchData = () => {
    setLoading(true);
    setError(null);
    setActiveTab('values');
    getCategoryProtectionBreakdown(brandName, categoryName, 10)
      .then(setBreakdown)
      .catch((err) => setError(err.message || 'Failed to load data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen && categoryName && brandName) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, categoryName, brandName]);

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
      subtitle={`Category: ${categoryName}`}
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
          <HeroStats data={breakdown} />

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
            <div className="space-y-6">
              <VolumeByValue values={breakdown.top_values} />
              <ValuesTab values={breakdown.top_values} />
            </div>
          )}

          {activeTab === 'competitors' && (
            <CompetitorsTab competitorsByType={breakdown.competitors_by_type} />
          )}

          {activeTab === 'keywords' && (
            <ValuesTab values={breakdown.top_values} />
          )}

          {/* Loss Distribution */}
          {breakdown.loss_distribution_by_type.length > 0 && (
            <LossDistribution losses={breakdown.loss_distribution_by_type} />
          )}
        </div>
      ) : null}
    </Drawer>
  );
}

export default CategoryDetailDrawer;
