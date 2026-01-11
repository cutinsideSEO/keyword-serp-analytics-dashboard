/**
 * Horizontal bar chart showing top modifier groups by opportunity size.
 * Stacked bars: Volume Captured (emerald) vs Volume to Capture (amber).
 */

import { motion } from 'framer-motion';
import { BarChart } from '@tremor/react';
import { BarChart3 } from 'lucide-react';
import type { ModifierGroupOpportunity } from '../../types';
import { formatCompactNumber } from '../../utils/formatters';
import { InfoTooltip } from '../common/InfoTooltip';

interface OpportunityBarChartProps {
  modifierGroups: ModifierGroupOpportunity[];
  limit?: number;
  onGroupClick?: (modifierGroup: string) => void;
}

export function OpportunityBarChart({
  modifierGroups,
  limit = 10,
  onGroupClick,
}: OpportunityBarChartProps) {
  // Prepare chart data - top groups by uncaptured volume
  const chartData = modifierGroups.slice(0, limit).map((mg) => ({
    name: mg.modifier_group.length > 25
      ? mg.modifier_group.substring(0, 25) + '...'
      : mg.modifier_group,
    fullName: mg.modifier_group,
    'Volume Captured': mg.volume_captured,
    'Volume to Capture': mg.volume_uncaptured,
  }));

  const valueFormatter = (value: number) => formatCompactNumber(value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="bg-white rounded-2xl p-6 border border-gray-200 shadow-md hover:shadow-xl transition-all duration-300"
    >
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-1 flex items-center">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center mr-3">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          Top Opportunities by Modifier Group
          <InfoTooltip
            title="Top Opportunities"
            description="Shows the modifier groups with the highest uncaptured search volume. Focus on green (captured) vs amber (opportunity) split."
            calculation="Modifier groups sorted by (Total Volume - Captured Volume) descending"
          />
        </h3>
        <p className="text-sm text-gray-600 ml-13">
          Click a bar to scroll to its details in the table below
        </p>
      </div>

      <BarChart
        className="h-[400px]"
        data={chartData}
        index="name"
        categories={['Volume Captured', 'Volume to Capture']}
        colors={['emerald', 'amber']}
        valueFormatter={valueFormatter}
        stack={true}
        layout="horizontal"
        showAnimation={true}
        showLegend={true}
        showGridLines={true}
        onValueChange={(value) => {
          if (value && onGroupClick) {
            const dataItem = chartData.find(d => d.name === value.name);
            if (dataItem) {
              onGroupClick(dataItem.fullName);
            }
          }
        }}
      />

      {/* Summary Stats */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-gray-600">Volume Captured</span>
          <span className="font-semibold text-gray-900">
            {formatCompactNumber(
              modifierGroups.slice(0, limit).reduce((sum, mg) => sum + mg.volume_captured, 0)
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-gray-600">Volume to Capture</span>
          <span className="font-semibold text-gray-900">
            {formatCompactNumber(
              modifierGroups.slice(0, limit).reduce((sum, mg) => sum + mg.volume_uncaptured, 0)
            )}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default OpportunityBarChart;
