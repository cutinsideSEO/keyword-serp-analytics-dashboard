/**
 * Horizontal stacked bar chart showing top modifier groups by opportunity size.
 * Stacked bars: Volume Captured (emerald) vs Volume to Capture (amber).
 * Uses Recharts + shadcn ChartContainer.
 */

import { motion } from 'framer-motion';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import { BarChart3 } from 'lucide-react';
import type { ModifierGroupOpportunity } from '../../types';
import { formatCompactNumber } from '../../utils/formatters';
import { InfoTooltip } from '../common/InfoTooltip';

interface OpportunityBarChartProps {
  modifierGroups: ModifierGroupOpportunity[];
  limit?: number;
  onGroupClick?: (modifierGroup: string) => void;
}

const chartConfig = {
  'Volume Captured': { label: 'Volume Captured', color: '#10B981' },
  'Volume to Capture': { label: 'Volume to Capture', color: '#F59E0B' },
} satisfies ChartConfig;

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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-all duration-300"
    >
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1 flex items-center">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center mr-3">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
          </div>
          Top Opportunities by Modifier Group
          <InfoTooltip
            title="Top Opportunities"
            description="Shows the modifier groups with the highest uncaptured search volume. Focus on green (captured) vs amber (opportunity) split."
            calculation="Modifier groups sorted by (Total Volume - Captured Volume) descending"
          />
        </h3>
        <p className="text-sm text-gray-600 ml-11">
          Click a bar to scroll to its details in the table below
        </p>
      </div>

      <ChartContainer config={chartConfig} className="h-[400px] w-full">
        <RechartsBarChart
          data={chartData}
          layout="vertical"
          margin={{ left: 20, right: 20, top: 5, bottom: 5 }}
          onClick={(state) => {
            if (state && state.activePayload && onGroupClick) {
              const dataItem = state.activePayload[0]?.payload;
              if (dataItem) {
                onGroupClick(dataItem.fullName);
              }
            }
          }}
        >
          <CartesianGrid horizontal={false} strokeDasharray="3 3" />
          <XAxis type="number" tickFormatter={(v) => formatCompactNumber(v)} />
          <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="Volume Captured" stackId="a" fill="var(--color-Volume Captured)" radius={[0, 0, 0, 0]} />
          <Bar dataKey="Volume to Capture" stackId="a" fill="var(--color-Volume to Capture)" radius={[0, 4, 4, 0]} />
        </RechartsBarChart>
      </ChartContainer>

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
