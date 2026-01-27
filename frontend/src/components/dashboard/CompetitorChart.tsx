/**
 * Competitor bar chart using Recharts + shadcn ChartContainer.
 * Uses dynamic domain types from market configuration.
 */

import { motion } from 'framer-motion';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import { TrendingDown, ExternalLink } from 'lucide-react';
import type { CompetitorStats } from '../../types';
import { formatCompactNumber, formatNumber } from '../../utils/formatters';
import { InfoTooltip } from '../common/InfoTooltip';
import { useMarketConfig } from '../../contexts/MarketConfigContext';

interface CompetitorChartProps {
  competitors: CompetitorStats[];
  brandName: string;
}

export function CompetitorChart({ competitors, brandName }: CompetitorChartProps) {
  const { getHexColor } = useMarketConfig();
  // Get unique domain types present in the data
  const domainTypes = Array.from(
    new Set(competitors.map((comp) => comp.domain_type || 'Unknown'))
  );

  // Prepare data for the chart - each domain needs ALL domain types (with 0 for others)
  const chartData = competitors.map((comp) => {
    const domainType = comp.domain_type || 'Unknown';
    const dataPoint: Record<string, string | number> = { domain: comp.domain };

    // Add all domain types, setting the value to wins_volume for this domain's type, 0 for others
    domainTypes.forEach((type) => {
      dataPoint[type] = type === domainType ? comp.wins_volume : 0;
    });

    return dataPoint;
  });

  // Build chart config from dynamic domain types
  const chartConfig: ChartConfig = {};
  domainTypes.forEach((type) => {
    chartConfig[type] = {
      label: type,
      color: getHexColor(type),
    };
  });

  const totalVolumeStolen = competitors.reduce(
    (sum, comp) => sum + comp.wins_volume,
    0
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <div className="bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-all duration-300">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1 flex items-center">
              Competitor Analysis
              <InfoTooltip
                title="Competitor Analysis"
                description={`This chart shows which domains are ranking #1 on keywords containing "${brandName}". These competitors are capturing search traffic that should ideally go to your brand.`}
                calculation="For each competitor domain: Count keywords where they rank #1 (instead of you) and sum the monthly search volume. 'Total at Risk' = Sum of all competitor volumes from branded keywords where you don't rank #1."
              />
            </h3>
            <p className="text-sm text-gray-600">
              Domains ranking #1 on your "{brandName}" keywords
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 border border-red-100">
            <TrendingDown className="w-4 h-4 text-red-600" />
            <div className="text-right">
              <p className="text-xs font-medium text-red-600">Total at Risk</p>
              <p className="text-2xl font-semibold text-red-700">
                {formatCompactNumber(totalVolumeStolen)}
              </p>
            </div>
          </div>
        </div>

        {/* Chart */}
        <ChartContainer config={chartConfig} className="h-72 w-full mt-4">
          <RechartsBarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={(v) => formatCompactNumber(v)} />
            <YAxis dataKey="domain" type="category" width={80} tick={{ fontSize: 12 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            {domainTypes.map((type) => (
              <Bar
                key={type}
                dataKey={type}
                fill={`var(--color-${type})`}
                radius={[0, 4, 4, 0]}
              />
            ))}
          </RechartsBarChart>
        </ChartContainer>

        {/* Top Competitors List */}
        <div className="mt-6 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Top Competitors
          </p>
          {competitors.slice(0, 5).map((comp, index) => (
            <motion.div
              key={comp.domain}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-center gap-3 flex-1">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold flex-shrink-0 ${
                    index === 0
                      ? 'bg-red-50 text-red-600'
                      : index === 1
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-gray-50 text-gray-600'
                  }`}
                >
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                    {comp.domain}
                  </p>
                  <p className="text-xs text-gray-500">
                    {comp.wins_count} {comp.wins_count === 1 ? 'keyword' : 'keywords'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-semibold text-red-600">
                    {formatNumber(comp.wins_volume)}
                  </p>
                  <p className="text-xs text-gray-500">volume</p>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default CompetitorChart;
