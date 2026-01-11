/**
 * Share of Search Chart Component
 * Displays top brands with bar chart, pie chart, and market concentration
 */

import { motion } from 'framer-motion';
import { Card, Title, Text, BarChart, DonutChart, Grid } from '@tremor/react';
import { TrendingUp } from 'lucide-react';
import type { ShareOfSearchItem } from '../../types';

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
    'Search Volume': brand.total_volume,
  }));

  // Prepare data for pie chart
  const pieChartData = topBrands.map((brand) => ({
    name: brand.brand_name,
    value: brand.share_percentage,
  }));

  return (
    <Grid numItems={1} numItemsMd={2} className="gap-6">
      {/* Left Half - Volume Bar Chart */}
      <Card className="md:col-span-1">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            <Title>Top Brands by Search Volume</Title>
          </div>
          <Text className="mb-6 text-gray-600">
            Total search volume per brand
          </Text>
          <BarChart
            data={volumeChartData}
            index="brand"
            categories={['Search Volume']}
            colors={['emerald']}
            valueFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
            showLegend={false}
            yAxisWidth={70}
            className="h-[600px]"
          />
        </motion.div>
      </Card>

      {/* Right Half - Two Quarters */}
      <div className="md:col-span-1 space-y-6">
        {/* Top Quarter - Market Share Pie Chart */}
        <Card>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-teal-600" />
              <Title>Top Brands by Market Share</Title>
            </div>
            <Text className="mb-6 text-gray-600">
              Percentage of total market demand
            </Text>
            <DonutChart
              data={pieChartData}
              category="value"
              index="name"
              valueFormatter={(value) => `${value.toFixed(1)}%`}
              colors={['emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink']}
              className="h-60"
            />
          </motion.div>
        </Card>

        {/* Bottom Quarter - Market Concentration */}
        <Card>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            <Title>Market Concentration</Title>
            <Text className="mb-6 text-gray-600">
              How much of the market is dominated by top players
            </Text>

            <div className="space-y-4">
              {/* Top 3 Brands */}
              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-sm font-semibold text-gray-700">Top 3 Brands</span>
                  <span className="text-lg font-bold text-emerald-600">
                    {top3Share.toFixed(1)}%
                  </span>
                </div>
                <div className="relative w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${top3Share}%` }}
                    transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                  />
                </div>
              </div>

              {/* Top 5 Brands */}
              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-sm font-semibold text-gray-700">Top 5 Brands</span>
                  <span className="text-lg font-bold text-emerald-600">
                    {top5Share.toFixed(1)}%
                  </span>
                </div>
                <div className="relative w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${top5Share}%` }}
                    transition={{ delay: 0.6, duration: 0.8, ease: 'easeOut' }}
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full"
                  />
                </div>
              </div>

              {/* Top 10 Brands */}
              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-sm font-semibold text-gray-700">Top 10 Brands</span>
                  <span className="text-lg font-bold text-emerald-600">
                    {top10Share.toFixed(1)}%
                  </span>
                </div>
                <div className="relative w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${top10Share}%` }}
                    transition={{ delay: 0.7, duration: 0.8, ease: 'easeOut' }}
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-300 to-teal-300 rounded-full"
                  />
                </div>
              </div>
            </div>

            {/* Insight Box */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="mt-4 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200"
            >
              <div className="text-sm text-gray-700">
                <span className="font-semibold text-emerald-700">
                  {top3Share < 50 ? 'Fragmented' : top3Share < 70 ? 'Moderately Concentrated' : 'Highly Concentrated'}
                </span>
                {' '}market with {data.length} brands
              </div>
            </motion.div>
          </motion.div>
        </Card>
      </div>
    </Grid>
  );
}

export default ShareOfSearchChart;
