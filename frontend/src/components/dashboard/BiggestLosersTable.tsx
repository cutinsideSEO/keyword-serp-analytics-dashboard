/**
 * Biggest Losers Table Component
 * Displays brands with worst brand protection performance
 */

import { motion } from 'framer-motion';
import { Card } from '@tremor/react';
import { TrendingDown, AlertCircle } from 'lucide-react';
import type { BrandLossItem } from '../../types';

interface BiggestLosersTableProps {
  data: BrandLossItem[];
  limit?: number;
}

export function BiggestLosersTable({ data, limit = 10 }: BiggestLosersTableProps) {
  const topLosers = data.slice(0, limit);

  const getWinRateColor = (winRate: number) => {
    if (winRate > 50) return 'text-green-600 bg-green-50';
    if (winRate > 20) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getSeverityColor = (winRate: number) => {
    if (winRate > 50) return 'border-green-200';
    if (winRate > 20) return 'border-yellow-200';
    return 'border-red-200';
  };

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-4 px-4 font-semibold text-gray-700 text-sm">#</th>
              <th className="text-left py-4 px-4 font-semibold text-gray-700 text-sm">Brand</th>
              <th className="text-right py-4 px-4 font-semibold text-gray-700 text-sm">
                <div className="flex items-center justify-end gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Keywords Lost
                </div>
              </th>
              <th className="text-right py-4 px-4 font-semibold text-gray-700 text-sm">
                <div className="flex items-center justify-end gap-1">
                  <TrendingDown className="h-4 w-4" />
                  Volume Lost
                </div>
              </th>
              <th className="text-right py-4 px-4 font-semibold text-gray-700 text-sm">Win Rate</th>
              <th className="text-left py-4 px-4 font-semibold text-gray-700 text-sm">Top Loss Areas</th>
            </tr>
          </thead>
          <tbody>
            {topLosers.map((brand, idx) => {
              const isTopLoser = idx < 3;

              return (
                <motion.tr
                  key={brand.brand_name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.3 }}
                  className={`border-b border-l-4 ${getSeverityColor(brand.win_rate)} ${
                    isTopLoser ? 'bg-red-50/30' : 'bg-white'
                  } hover:bg-gray-50 transition-colors`}
                >
                  {/* Rank */}
                  <td className="py-4 px-4">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        isTopLoser
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {idx + 1}
                    </div>
                  </td>

                  {/* Brand Name */}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold capitalize text-gray-900">
                        {brand.brand_name}
                      </span>
                      {isTopLoser && (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {brand.total_keywords.toLocaleString()} total keywords
                    </div>
                  </td>

                  {/* Keywords Lost */}
                  <td className="py-4 px-4 text-right">
                    <div className="font-bold text-red-600 text-lg">
                      {brand.keywords_lost.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {((brand.keywords_lost / brand.total_keywords) * 100).toFixed(1)}% of total
                    </div>
                  </td>

                  {/* Volume Lost */}
                  <td className="py-4 px-4 text-right">
                    <div className="font-bold text-red-600 text-lg">
                      {(brand.volume_lost / 1000).toFixed(0)}K
                    </div>
                    <div className="text-xs text-gray-500 mt-1">search volume</div>
                  </td>

                  {/* Win Rate */}
                  <td className="py-4 px-4 text-right">
                    <div
                      className={`inline-block px-3 py-1 rounded-full font-bold ${getWinRateColor(
                        brand.win_rate
                      )}`}
                    >
                      {brand.win_rate.toFixed(1)}%
                    </div>
                  </td>

                  {/* Top Loss Areas */}
                  <td className="py-4 px-4">
                    <div className="flex flex-wrap gap-2">
                      {brand.top_loss_modifier_groups.slice(0, 2).map((mg) => (
                        <div
                          key={mg.modifier_group}
                          className="group relative"
                        >
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded-md font-medium border border-red-200 hover:bg-red-200 transition-colors">
                            {mg.modifier_group}
                            <span className="text-[10px] opacity-75">
                              ({mg.loss_count})
                            </span>
                          </span>
                          {/* Tooltip on hover */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10 transition-opacity">
                            {mg.loss_count} keywords, {(mg.loss_volume / 1000).toFixed(0)}K volume
                          </div>
                        </div>
                      ))}
                      {brand.top_loss_modifier_groups.length > 2 && (
                        <span className="inline-block px-2 py-1 text-xs text-gray-500 bg-gray-100 rounded-md">
                          +{brand.top_loss_modifier_groups.length - 2} more
                        </span>
                      )}
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-500 mb-1">Total Keywords at Risk</div>
          <div className="text-2xl font-bold text-gray-900">
            {topLosers.reduce((sum, b) => sum + b.keywords_lost, 0).toLocaleString()}
          </div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-500 mb-1">Total Volume at Risk</div>
          <div className="text-2xl font-bold text-gray-900">
            {(topLosers.reduce((sum, b) => sum + b.volume_lost, 0) / 1000000).toFixed(2)}M
          </div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-500 mb-1">Average Win Rate</div>
          <div className="text-2xl font-bold text-gray-900">
            {(topLosers.reduce((sum, b) => sum + b.win_rate, 0) / topLosers.length).toFixed(1)}%
          </div>
        </div>
      </motion.div>
    </Card>
  );
}

export default BiggestLosersTable;
