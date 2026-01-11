/**
 * Modern Influential Voices table with gradient styling.
 */

import { motion } from 'framer-motion';
import { Crown, Layers, TrendingUp, Award } from 'lucide-react';
import type { InfluentialDomain } from '../../types';
import { formatNumber } from '../../utils/formatters';
import { InfoTooltip } from '../common/InfoTooltip';

interface InfluentialVoicesTableProps {
  influentialVoices: InfluentialDomain[];
  brandName: string;
}

const DOMAIN_TYPE_STYLES: Record<string, { gradient: string; bgColor: string; textColor: string }> = {
  Brand: {
    gradient: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
  },
  Reseller: {
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-700',
  },
  UGC: {
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-700',
  },
  '3rd Party': {
    gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    bgColor: 'bg-emerald-100',
    textColor: 'text-emerald-700',
  },
};

export function InfluentialVoicesTable({
  influentialVoices,
  brandName,
}: InfluentialVoicesTableProps) {
  if (influentialVoices.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className="bg-white rounded-2xl p-6 border border-gray-200 shadow-md hover:shadow-xl transition-all duration-300"
    >
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-1 flex items-center">
            Most Influential Voices
            <InfoTooltip
              title="Most Influential Voices"
              description="Shows the single most dominant domain for each domain type (Brand, Reseller, UGC, 3rd Party) that appears frequently on your branded keywords."
              calculation="For each domain type: Find the domain with the highest number of rankings on your branded keywords, along with their total volume, average position, and #1 wins."
            />
          </h3>
          <p className="text-sm text-gray-600">
            Top performing domain for each type on {brandName} keywords
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-lg">
          <Crown className="w-6 h-6 text-white" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Domain
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Type
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Rankings
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Volume
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Avg Position
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                #1 Wins
              </th>
            </tr>
          </thead>
          <tbody>
            {influentialVoices.map((voice, index) => {
              const typeStyle = DOMAIN_TYPE_STYLES[voice.domain_type] || {
                gradient: 'linear-gradient(135deg, #64748B 0%, #475569 100%)',
                bgColor: 'bg-gray-100',
                textColor: 'text-gray-700',
              };

              return (
                <motion.tr
                  key={voice.domain}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-4 px-4">
                    <a
                      href={`https://${voice.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      {voice.domain}
                    </a>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: typeStyle.gradient }}
                      >
                        <Layers className="w-4 h-4 text-white" />
                      </div>
                      <span className={`text-sm font-semibold ${typeStyle.textColor}`}>
                        {voice.domain_type}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="font-medium text-gray-900">
                      {formatNumber(voice.ranking_count)}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="font-bold text-gray-900">
                      {formatNumber(voice.ranking_volume)}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-bold">
                      #{voice.avg_position.toFixed(1)}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    {voice.win_count > 0 ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-sm font-bold">
                        <Award className="w-3 h-3" />
                        {voice.win_count}
                      </span>
                    ) : (
                      <span className="text-gray-400 font-medium">0</span>
                    )}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

export default InfluentialVoicesTable;
