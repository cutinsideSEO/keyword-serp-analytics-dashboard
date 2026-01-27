/**
 * Modifier Groups table with flat styling.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Target, Award } from 'lucide-react';
import type { ModifierGroupStats } from '../../types';
import { formatNumber, formatPercent } from '../../utils/formatters';
import { InfoTooltip } from '../common/InfoTooltip';

interface ModifierGroupsTableProps {
  modifierGroups: ModifierGroupStats[];
  brandName: string;
}

export function ModifierGroupsTable({
  modifierGroups,
  brandName,
}: ModifierGroupsTableProps) {
  if (modifierGroups.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.7 }}
      className="bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-all duration-300"
    >
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1 flex items-center">
          Performance by Modifier Group
          <InfoTooltip
            title="Performance by Modifier Group"
            description="Keywords are grouped by their modifiers (e.g., 'brand', 'brand + model', 'bicycle type + brand'). This shows how well you perform across different keyword types."
            calculation="For each modifier group: Count wins vs losses, sum volumes, and calculate win rate percentage."
          />
        </h3>
        <p className="text-sm text-gray-600">
          Breakdown of {brandName} keywords by modifier group showing wins, losses, and win rate
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Modifier Group
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Keywords
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Total Volume
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Win Rate
              </th>
            </tr>
          </thead>
          <tbody>
            {modifierGroups.map((mg, index) => (
              <React.Fragment key={mg.modifier_group}>
                <motion.tr
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + index * 0.05 }}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <Target className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="font-semibold text-gray-900">
                      {mg.modifier_group}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-medium">
                      <Award className="w-3 h-3" />
                      {mg.keywords_winning}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-red-600 text-xs font-medium">
                      {mg.keywords_losing}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4 text-right">
                  <div className="space-y-1">
                    <div className="font-semibold text-gray-900">
                      {formatNumber(mg.total_volume)}
                    </div>
                    <div className="flex items-center justify-end gap-2 text-xs">
                      <span className="text-emerald-600 font-medium">
                        {formatNumber(mg.volume_winning)}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="text-red-600 font-medium">
                        {formatNumber(mg.volume_losing)}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 text-right">
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium ${
                      mg.win_rate >= 80
                        ? 'bg-emerald-50 text-emerald-600'
                        : mg.win_rate >= 50
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-red-50 text-red-600'
                    }`}
                  >
                    <TrendingUp className="w-3 h-3" />
                    {formatPercent(mg.win_rate)}
                  </span>
                </td>
              </motion.tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

export default ModifierGroupsTable;
