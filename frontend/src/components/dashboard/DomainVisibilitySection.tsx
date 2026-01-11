/**
 * Domain Visibility Section Component
 * Displays top domains by visibility score (retailers, influential voices, etc.)
 */

import { motion } from 'framer-motion';
import { Card, Title, Text } from '@tremor/react';
import { Store, Users, TrendingUp, Award } from 'lucide-react';
import type { DomainVisibilityItem } from '../../types';

interface DomainVisibilitySectionProps {
  title: string;
  subtitle: string;
  data: DomainVisibilityItem[];
  variant: 'retailer' | 'influencer';
  limit?: number;
}

export function DomainVisibilitySection({
  title,
  subtitle,
  data,
  variant,
  limit = 5,
}: DomainVisibilitySectionProps) {
  const topDomains = data.slice(0, limit);

  // Color schemes based on variant
  const colors = {
    retailer: {
      badge: 'bg-purple-100 text-purple-700',
      text: 'text-purple-600',
      gradient: 'from-purple-500 to-purple-600',
      icon: Store,
    },
    influencer: {
      badge: 'bg-amber-100 text-amber-700',
      text: 'text-amber-600',
      gradient: 'from-amber-500 to-amber-600',
      icon: Users,
    },
  };

  const config = colors[variant];
  const Icon = config.icon;

  return (
    <Card className="h-full">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-5 w-5 ${config.text}`} />
        <Title>{title}</Title>
      </div>
      <Text className="mb-4 text-gray-600">{subtitle}</Text>

      <div className="space-y-3">
        {topDomains.map((domain, idx) => {
          const isTopPlayer = idx === 0;

          return (
            <motion.div
              key={domain.domain}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.08, duration: 0.3 }}
              className={`group relative ${
                isTopPlayer ? 'bg-gradient-to-r from-gray-50 to-transparent' : ''
              }`}
            >
              <div className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-gray-50 transition-all border-b border-gray-100 last:border-0">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {/* Rank Badge */}
                  <div
                    className={`flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full ${config.badge} font-bold text-sm transition-transform group-hover:scale-110`}
                  >
                    {idx + 1}
                  </div>

                  {/* Domain Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className={`font-semibold truncate group-hover:${config.text} transition-colors`}>
                        {domain.domain}
                      </div>
                      {isTopPlayer && (
                        <Award className={`h-4 w-4 ${config.text} flex-shrink-0`} />
                      )}
                    </div>
                    <div className="text-sm text-gray-500 flex items-center gap-2">
                      {variant === 'influencer' && (
                        <span className="capitalize">{domain.domain_type}</span>
                      )}
                      {variant === 'influencer' && <span>·</span>}
                      <span>{domain.win_count.toLocaleString()} {variant === 'retailer' ? '#1 rankings' : 'wins'}</span>
                    </div>
                  </div>
                </div>

                {/* Visibility Score */}
                <div className="text-right flex-shrink-0 ml-4">
                  <div className={`font-bold ${config.text} text-lg flex items-center gap-1`}>
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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className={`mt-4 pt-4 border-t border-gray-200 grid grid-cols-3 gap-4`}
      >
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">Total Domains</div>
          <div className="font-bold text-gray-900">{data.length}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">Total Wins</div>
          <div className="font-bold text-gray-900">
            {topDomains.reduce((sum, d) => sum + d.win_count, 0).toLocaleString()}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">Avg Position</div>
          <div className="font-bold text-gray-900">
            #{(topDomains.reduce((sum, d) => sum + d.avg_position, 0) / topDomains.length).toFixed(1)}
          </div>
        </div>
      </motion.div>
    </Card>
  );
}

export default DomainVisibilitySection;
