/**
 * Domain types donut chart using Recharts PieChart + shadcn ChartContainer.
 * Uses dynamic domain types from market configuration.
 */

import { motion } from 'framer-motion';
import { PieChart, Pie, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import { Layers, TrendingDown } from 'lucide-react';
import type { DomainTypeLossStats } from '../../types';
import { formatCompactNumber } from '../../utils/formatters';
import { InfoTooltip } from '../common/InfoTooltip';
import { useMarketConfig } from '../../contexts/MarketConfigContext';

interface DomainTypesChartProps {
  domainTypes: DomainTypeLossStats[];
  brandName: string;
}

export function DomainTypesChart({ domainTypes, brandName }: DomainTypesChartProps) {
  const { getHexColor, getDomainTypeNames } = useMarketConfig();

  // Prepare data for the donut chart
  const chartData = domainTypes.map((dt) => ({
    name: dt.domain_type,
    value: dt.loss_volume,
  }));

  // Build chart config from dynamic domain types
  const chartConfig: ChartConfig = {};
  domainTypes.forEach((dt) => {
    chartConfig[dt.domain_type] = {
      label: dt.domain_type,
      color: getHexColor(dt.domain_type),
    };
  });

  const totalVolume = domainTypes.reduce((sum, dt) => sum + dt.loss_volume, 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.5 }}
    >
      <div className="bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-all duration-300">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1 flex items-center">
              Loss Distribution
              <InfoTooltip
                title="Loss Distribution by Domain Type"
                description={`This breaks down the search volume you're losing by domain type. Domain types: ${getDomainTypeNames().join(', ')}.`}
                calculation="For each domain type: Sum the search volume of all keywords where domains of that type rank #1 (and you don't). 'Total Lost' = Sum of all lost volume across all domain types."
              />
            </h3>
            <p className="text-sm text-gray-600">
              Domain types beating {brandName}
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 border border-red-100">
            <TrendingDown className="w-4 h-4 text-red-600" />
            <div className="text-right">
              <p className="text-xs font-medium text-red-600">Total Lost</p>
              <p className="text-2xl font-semibold text-red-700">
                {formatCompactNumber(totalVolume)}
              </p>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="flex items-center justify-center py-4">
          <ChartContainer config={chartConfig} className="h-60 w-full">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                strokeWidth={0}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={getHexColor(entry.name)} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        </div>

        {/* Legend */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          {domainTypes.map((dt, index) => {
            const hexColor = getHexColor(dt.domain_type);

            return (
              <motion.div
                key={dt.domain_type}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors group"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${hexColor}15` }}
                >
                  <Layers className="w-4 h-4" style={{ color: hexColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 truncate">
                    {dt.domain_type}
                  </p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-500">{dt.loss_count} kw</span>
                    <span className="text-gray-400">&bull;</span>
                    <span className="font-medium text-red-600">
                      {dt.percentage_of_losses.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 text-sm">
                    {formatCompactNumber(dt.loss_volume)}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

export default DomainTypesChart;
