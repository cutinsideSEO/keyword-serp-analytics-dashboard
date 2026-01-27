/**
 * Influential Voices table with flat styling.
 * Uses dynamic domain types from market configuration.
 */

import { motion } from 'framer-motion';
import { Crown, Layers, Award } from 'lucide-react';
import type { InfluentialDomain } from '../../types';
import { formatNumber } from '../../utils/formatters';
import { InfoTooltip } from '../common/InfoTooltip';
import { useMarketConfig } from '../../contexts/MarketConfigContext';

interface InfluentialVoicesTableProps {
  influentialVoices: InfluentialDomain[];
  brandName: string;
}

export function InfluentialVoicesTable({
  influentialVoices,
  brandName,
}: InfluentialVoicesTableProps) {
  const { getStyles, getDomainTypeNames } = useMarketConfig();

  if (influentialVoices.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className="bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-all duration-300"
    >
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1 flex items-center">
            Most Influential Voices
            <InfoTooltip
              title="Most Influential Voices"
              description={`Shows the single most dominant domain for each domain type (${getDomainTypeNames().join(', ')}) that appears frequently on your branded keywords.`}
              calculation="For each domain type: Find the domain with the highest number of rankings on your branded keywords, along with their total volume, average position, and #1 wins."
            />
          </h3>
          <p className="text-sm text-gray-600">
            Top performing domain for each type on {brandName} keywords
          </p>
        </div>
        <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
          <Crown className="w-5 h-5 text-purple-600" />
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
              const typeStyle = getStyles(voice.domain_type);

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
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${typeStyle.bgColor}`}
                      >
                        <Layers className={`w-4 h-4 ${typeStyle.textColor}`} />
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
                    <span className="font-semibold text-gray-900">
                      {formatNumber(voice.ranking_volume)}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="inline-flex items-center px-3 py-1.5 rounded-md bg-gray-50 text-gray-600 text-sm font-medium">
                      #{voice.avg_position.toFixed(1)}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    {voice.win_count > 0 ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-red-50 text-red-600 text-sm font-medium">
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
