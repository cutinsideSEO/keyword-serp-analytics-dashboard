/**
 * Shared LossDistribution sub-component for drawers.
 * Shows "Who Beats You" chart (protection-only).
 */

import { BarChart3 } from 'lucide-react';
import { useMarketConfig } from '@/contexts/MarketConfigContext';
import { formatNumber, formatCompactNumber } from '@/utils/formatters';
import type { DomainTypeLossDetail } from '@/types';

interface LossDistributionProps {
  losses: DomainTypeLossDetail[];
}

export function LossDistribution({ losses }: LossDistributionProps) {
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

export default LossDistribution;
