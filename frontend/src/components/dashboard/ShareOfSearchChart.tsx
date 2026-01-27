/**
 * Share of Search Chart Component
 * Displays top brands with bar chart, pie chart, and market concentration.
 * Uses Recharts + shadcn ChartContainer (no Tremor).
 */

import { motion } from 'framer-motion';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import { TrendingUp } from 'lucide-react';
import type { ShareOfSearchItem } from '../../types';
import { formatCompactNumber } from '../../utils/formatters';

const PIE_COLORS = [
  '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6',
  '#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899',
];

interface ShareOfSearchChartProps {
  data: ShareOfSearchItem[];
  topN?: number;
}

export function ShareOfSearchChart({ data, topN = 10 }: ShareOfSearchChartProps) {
  const topBrands = data.slice(0, topN);

  // Calculate concentration metrics
  const top3Share = topBrands.slice(0, 3).reduce((sum, b) => sum + b.share_percentage, 0);
  const top5Share = topBrands.slice(0, 5).reduce((sum, b) => sum + b.share_percentage, 0);
  const top10Share = topBrands.slice(0, 10).reduce((sum, b) => sum + b.share_percentage, 0);

  // Prepare data for volume bar chart
  const volumeChartData = topBrands.map((brand) => ({
    brand: brand.brand_name,
    volume: brand.total_volume,
  }));

  // Prepare data for pie chart
  const pieChartData = topBrands.map((brand) => ({
    name: brand.brand_name,
    value: brand.share_percentage,
  }));

  const barChartConfig = {
    volume: { label: 'Search Volume', color: '#10B981' },
  } satisfies ChartConfig;

  // Build pie chart config dynamically
  const pieChartConfig: ChartConfig = {};
  topBrands.forEach((brand, idx) => {
    pieChartConfig[brand.brand_name] = {
      label: brand.brand_name,
      color: PIE_COLORS[idx % PIE_COLORS.length],
    };
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Left Half - Volume Bar Chart */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            <h3 className="text-lg font-semibold text-gray-900">Top Brands by Search Volume</h3>
          </div>
          <p className="mb-6 text-sm text-gray-600">
            Total search volume per brand
          </p>
          <ChartContainer config={barChartConfig} className="h-[600px] w-full">
            <RechartsBarChart data={volumeChartData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(v) => formatCompactNumber(v)} />
              <YAxis dataKey="brand" type="category" width={70} tick={{ fontSize: 12 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="volume" fill="var(--color-volume)" radius={[0, 4, 4, 0]} />
            </RechartsBarChart>
          </ChartContainer>
        </motion.div>
      </div>

      {/* Right Half - Two Quarters */}
      <div className="space-y-6">
        {/* Top Quarter - Market Share Pie Chart */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-teal-600" />
              <h3 className="text-lg font-semibold text-gray-900">Top Brands by Market Share</h3>
            </div>
            <p className="mb-6 text-sm text-gray-600">
              Percentage of total market demand
            </p>
            <ChartContainer config={pieChartConfig} className="h-60 w-full">
              <PieChart>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => `${Number(value).toFixed(1)}%`}
                    />
                  }
                />
                <Pie
                  data={pieChartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {pieChartData.map((_entry, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          </motion.div>
        </div>

        {/* Bottom Quarter - Market Concentration */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            <h3 className="text-lg font-semibold text-gray-900">Market Concentration</h3>
            <p className="mb-6 text-sm text-gray-600">
              How much of the market is dominated by top players
            </p>

            <div className="space-y-4">
              {/* Top 3 Brands */}
              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-sm font-semibold text-gray-700">Top 3 Brands</span>
                  <span className="text-lg font-semibold text-emerald-600">
                    {top3Share.toFixed(1)}%
                  </span>
                </div>
                <div className="relative w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${top3Share}%` }}
                    transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
                    className="absolute top-0 left-0 h-full bg-emerald-500 rounded-full"
                  />
                </div>
              </div>

              {/* Top 5 Brands */}
              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-sm font-semibold text-gray-700">Top 5 Brands</span>
                  <span className="text-lg font-semibold text-emerald-600">
                    {top5Share.toFixed(1)}%
                  </span>
                </div>
                <div className="relative w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${top5Share}%` }}
                    transition={{ delay: 0.6, duration: 0.8, ease: 'easeOut' }}
                    className="absolute top-0 left-0 h-full bg-emerald-400 rounded-full"
                  />
                </div>
              </div>

              {/* Top 10 Brands */}
              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-sm font-semibold text-gray-700">Top 10 Brands</span>
                  <span className="text-lg font-semibold text-emerald-600">
                    {top10Share.toFixed(1)}%
                  </span>
                </div>
                <div className="relative w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${top10Share}%` }}
                    transition={{ delay: 0.7, duration: 0.8, ease: 'easeOut' }}
                    className="absolute top-0 left-0 h-full bg-emerald-300 rounded-full"
                  />
                </div>
              </div>
            </div>

            {/* Insight Box */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="text-sm text-gray-700">
                <span className="font-semibold text-gray-900">
                  {top3Share < 50 ? 'Fragmented' : top3Share < 70 ? 'Moderately Concentrated' : 'Highly Concentrated'}
                </span>
                {' '}market with {data.length} brands
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default ShareOfSearchChart;
