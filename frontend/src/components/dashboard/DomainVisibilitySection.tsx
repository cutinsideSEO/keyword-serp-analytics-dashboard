/**
 * Domain Visibility Section Component
 * Displays top domains by visibility score with dynamic styling from market config.
 */

import { motion } from 'framer-motion';
import { TrendingUp, Award } from 'lucide-react';
import type { DomainVisibilityItem } from '../../types';
import { useMarketConfig } from '../../contexts/MarketConfigContext';

interface DomainVisibilitySectionProps {
  title: string;
  subtitle: string;
  data: DomainVisibilityItem[];
  /** Optional: filter to only show these domain types. If not provided, shows all. */
  domainTypes?: string[];
  limit?: number;
}

export function DomainVisibilitySection({
  title,
  subtitle,
  data,
  domainTypes,
  limit = 5,
}: DomainVisibilitySectionProps) {
  const { getStyles, getIcon } = useMarketConfig();

  // Filter by domain types if specified
  const filteredData = domainTypes
    ? data.filter(d => domainTypes.includes(d.domain_type))
    : data;

  const topDomains = filteredData.slice(0, limit);

  // Get the primary domain type for section header icon (first domain's type)
  const primaryType = topDomains[0]?.domain_type || 'Unknown';
  const primaryStyles = getStyles(primaryType);
  const HeaderIcon = getIcon(primaryType);

  return (
    <div className="rounded-xl border border-gray-200 p-6 h-full">
      <div className="flex items-center gap-2 mb-2">
        <HeaderIcon className={`h-5 w-5 ${primaryStyles.textColor}`} />
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{subtitle}</p>

      <div className="space-y-3">
        {topDomains.map((domain, idx) => {
          const isTopPlayer = idx === 0;
          const styles = getStyles(domain.domain_type);
          const DomainIcon = getIcon(domain.domain_type);

          return (
            <motion.div
              key={domain.domain}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.03, duration: 0.3 }}
              className={`group relative ${
                isTopPlayer ? 'bg-gray-50' : ''
              }`}
            >
              <div className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-gray-50 transition-all border-b border-gray-100 last:border-0">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {/* Rank Badge with dynamic colors */}
                  <div
                    className={`flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full ${styles.bgColor} ${styles.textColor} font-bold text-sm`}
                  >
                    {idx + 1}
                  </div>

                  {/* Domain Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold truncate transition-colors">
                        {domain.domain}
                      </div>
                      {isTopPlayer && (
                        <Award className={`h-4 w-4 ${styles.textColor} flex-shrink-0`} />
                      )}
                    </div>
                    <div className="text-sm text-gray-500 flex items-center gap-2">
                      {/* Domain type badge */}
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${styles.bgColor} ${styles.textColor}`}>
                        <DomainIcon className="w-3 h-3" />
                        {domain.domain_type}
                      </span>
                      <span>·</span>
                      <span>{domain.win_count.toLocaleString()} #1 rankings</span>
                    </div>
                  </div>
                </div>

                {/* Visibility Score */}
                <div className="text-right flex-shrink-0 ml-4">
                  <div className={`font-bold ${styles.textColor} text-lg flex items-center gap-1`}>
                    {domain.visibility_score.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    visibility
                  </div>
                </div>
              </div>

              {/* Additional Stats on Hover */}
              {domain.top_brands && domain.top_brands.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  whileHover={{ opacity: 1, height: 'auto' }}
                  className="overflow-hidden"
                >
                  <div className="px-3 pb-2 text-xs text-gray-500">
                    Top brands: {domain.top_brands.slice(0, 3).join(', ')}
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Summary Stats */}
      {topDomains.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-3 gap-4"
        >
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">Total Domains</div>
            <div className="font-semibold text-gray-900">{filteredData.length}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">Total Wins</div>
            <div className="font-semibold text-gray-900">
              {topDomains.reduce((sum, d) => sum + d.win_count, 0).toLocaleString()}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">Avg Position</div>
            <div className="font-semibold text-gray-900">
              #{(topDomains.reduce((sum, d) => sum + (d.avg_position || 0), 0) / topDomains.length).toFixed(1)}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default DomainVisibilitySection;
