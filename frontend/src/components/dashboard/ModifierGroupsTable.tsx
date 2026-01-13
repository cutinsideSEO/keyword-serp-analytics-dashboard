/**
 * Modern Modifier Groups table with gradient styling.
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.7 }}
      className="bg-white rounded-2xl p-6 border border-gray-200 shadow-md hover:shadow-xl transition-all duration-300"
    >
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-1 flex items-center">
          Performance by Modifier Group
          <InfoTooltip
            title="Performance by Modifier Group"
            description="Keywords are grouped by their modifiers (e.g., 'brand', 'brand + model', 'bicycle type + brand'). This shows how well you perform across different keyword types."
            calculation="For each modifier group: Count wins vs losses, sum volumes, calculate win rate percentage, and compute average ranking position for your brand."
          />
        </h3>
        <p className="text-sm text-gray-600">
          Breakdown of {brandName} keywords by modifier group showing wins, losses, and average position
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
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Avg Position
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Top Tags
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
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                      <Target className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-semibold text-gray-900">
                      {mg.modifier_group}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                      <Award className="w-3 h-3" />
                      {mg.keywords_winning}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                      {mg.keywords_losing}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4 text-right">
                  <div className="space-y-1">
                    <div className="font-bold text-gray-900">
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
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-bold ${
                      mg.win_rate >= 80
                        ? 'bg-emerald-100 text-emerald-700'
                        : mg.win_rate >= 50
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    <TrendingUp className="w-3 h-3" />
                    {formatPercent(mg.win_rate)}
                  </span>
                </td>
                <td className="py-4 px-4 text-right">
                  {mg.avg_brand_position !== null ? (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-bold">
                      #{mg.avg_brand_position.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-sm">N/A</span>
                  )}
                </td>
                <td className="py-4 px-4">
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(mg.top_tags)
                      .slice(0, 3)
                      .map(([tag, count]) => {
                        const [category, value] = tag.split(':');
                        const categoryDisplay = category
                          .split('_')
                          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                          .join(' ');
                        return (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium border border-blue-200"
                          >
                            <span className="font-semibold">{categoryDisplay}:</span>
                            <span className="ml-1">{value} ({count})</span>
                          </span>
                        );
                      })}
                    {Object.keys(mg.top_tags).length > 3 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-700 text-xs font-medium">
                        +{Object.keys(mg.top_tags).length - 3} more
                      </span>
                    )}
                  </div>
                </td>
              </motion.tr>
              {/* Example Keywords Row */}
              {mg.example_keywords && mg.example_keywords.length > 0 && (
                <tr>
                  <td colSpan={6} className="py-2 px-4 bg-gray-50">
                    <div className="flex items-center gap-2 ml-14">
                      <span className="text-xs font-semibold text-gray-500">Examples:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {mg.example_keywords.map((kw, kidx) => (
                          <span
                            key={kidx}
                            className="text-xs px-2 py-1 rounded-md bg-white text-gray-700 border border-gray-200 keyword-tag"
                            dir="auto"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

export default ModifierGroupsTable;
