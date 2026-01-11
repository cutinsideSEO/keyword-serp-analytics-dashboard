/**
 * Modern domain types donut chart with gradient styling.
 */

import { motion } from 'framer-motion';
import { DonutChart } from '@tremor/react';
import { Layers, TrendingDown } from 'lucide-react';
import type { DomainTypeLossStats } from '../../types';
import { formatCompactNumber, formatNumber } from '../../utils/formatters';
import { InfoTooltip } from '../common/InfoTooltip';

interface DomainTypesChartProps {
  domainTypes: DomainTypeLossStats[];
  brandName: string;
}

const DOMAIN_TYPE_COLORS: Record<string, string> = {
  'Brand': 'blue',
  'Reseller': 'orange',
  'UGC': 'purple',
  '3rd Party': 'emerald',
};

const DOMAIN_TYPE_GRADIENTS: Record<string, string> = {
  'Brand': 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
  'Reseller': 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
  'UGC': 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
  '3rd Party': 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
};

export function DomainTypesChart({ domainTypes, brandName }: DomainTypesChartProps) {
  // Prepare data for the donut chart
  const chartData = domainTypes.map((dt) => ({
    name: dt.domain_type,
    value: dt.loss_volume,
  }));

  // Map each domain type to its corresponding color
  const chartColors = domainTypes.map((dt) => DOMAIN_TYPE_COLORS[dt.domain_type] || 'gray');

  const totalVolume = domainTypes.reduce((sum, dt) => sum + dt.loss_volume, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
    >
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-md hover:shadow-xl transition-all duration-300">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-1 flex items-center">
              Loss Distribution
              <InfoTooltip
                title="Loss Distribution by Domain Type"
                description={`This breaks down the search volume you're losing by domain type. Domain types are classified as: Brand (other brand sites), Reseller (Amazon, Walmart, etc.), UGC (Reddit, forums), and 3rd Party (review sites, affiliates).`}
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
              <p className="text-lg font-bold text-red-700">
                {formatCompactNumber(totalVolume)}
              </p>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="flex items-center justify-center py-4">
          <DonutChart
            className="h-60"
            data={chartData}
            category="value"
            index="name"
            valueFormatter={(value) => formatCompactNumber(value)}
            colors={chartColors}
            showAnimation
            showLabel={true}
          />
        </div>

        {/* Legend */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          {domainTypes.map((dt, index) => (
            <motion.div
              key={dt.domain_type}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors group"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: DOMAIN_TYPE_GRADIENTS[dt.domain_type] || '#64748B' }}
              >
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900 truncate">
                  {dt.domain_type}
                </p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500">{dt.loss_count} kw</span>
                  <span className="text-gray-400">•</span>
                  <span className="font-medium text-red-600">
                    {dt.percentage_of_losses.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900 text-sm">
                  {formatCompactNumber(dt.loss_volume)}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default DomainTypesChart;
