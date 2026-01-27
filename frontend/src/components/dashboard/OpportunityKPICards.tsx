/**
 * KPI cards for Category Opportunities dashboard.
 * Uses emerald/teal theme to distinguish from Brand Protection.
 */

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Search, Target, Compass, Zap } from 'lucide-react';
import type { CategoryOpportunityKPIs } from '../../types';
import { formatNumber, formatCompactNumber, formatPercent } from '../../utils/formatters';
import { InfoTooltip } from '../common/InfoTooltip';

interface OpportunityKPICardsProps {
  kpis: CategoryOpportunityKPIs;
  variant?: 'nonbranded' | 'competitor';
}

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  icon: React.ReactNode;
  colorClass: string;
  delay: number;
  tooltipInfo?: {
    title: string;
    description: string;
    calculation: string;
  };
}

function KPICard({ title, value, subtitle, trend, icon, colorClass, delay, tooltipInfo }: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay }}
    >
      <div className="bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-all">
        {/* Icon */}
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center mb-4 ${colorClass}`}
        >
          {icon}
        </div>

        {/* Content */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600 flex items-center">
              {title}
              {tooltipInfo && (
                <InfoTooltip
                  title={tooltipInfo.title}
                  description={tooltipInfo.description}
                  calculation={tooltipInfo.calculation}
                />
              )}
            </p>
            {trend && (
              <span
                className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                  trend.isPositive
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-amber-50 text-amber-600'
                }`}
              >
                {trend.isPositive ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {trend.value}
              </span>
            )}
          </div>

          <h3 className="text-2xl font-semibold text-gray-900 mb-2">
            {value}
          </h3>

          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
      </div>
    </motion.div>
  );
}

export function OpportunityKPICards({ kpis, variant = 'nonbranded' }: OpportunityKPICardsProps) {
  const isCompetitor = variant === 'competitor';

  const cards = [
    {
      title: isCompetitor ? 'Competitor Keywords' : 'Non-Branded Keywords',
      value: formatNumber(kpis.total_nonbranded_keywords),
      subtitle: `${formatCompactNumber(kpis.total_nonbranded_volume)} search volume`,
      icon: <Search className="w-4 h-4" />,
      colorClass: isCompetitor
        ? 'bg-purple-50 text-purple-600'
        : 'bg-emerald-50 text-emerald-600',
      delay: 0,
      tooltipInfo: {
        title: isCompetitor ? 'Competitor Branded Keywords' : 'Non-Branded Keywords',
        description: isCompetitor
          ? 'Keywords that contain competitor brand mentions. These are opportunities to capture traffic from competitor searches.'
          : 'Keywords that don\'t contain any brand mention. These represent category/generic searches where you can capture market share.',
        calculation: isCompetitor
          ? 'Count of keywords with brand tags (excluding your brand)'
          : 'Count of keywords without brand tags in the database'
      }
    },
    {
      title: 'Capture Rate',
      value: formatNumber(kpis.keywords_captured),
      subtitle: 'keywords captured',
      trend: {
        value: formatPercent(kpis.overall_capture_rate),
        isPositive: kpis.overall_capture_rate >= 10,
      },
      icon: <Target className="w-4 h-4" />,
      colorClass: isCompetitor
        ? 'bg-purple-50 text-purple-600'
        : 'bg-teal-50 text-teal-600',
      delay: 0.03,
      tooltipInfo: {
        title: 'Capture Rate',
        description: isCompetitor
          ? 'Competitor branded keywords where your brand ranks #1. Shows how well you compete on competitor searches.'
          : 'Non-branded keywords where your brand ranks #1. This shows how well you compete on generic/category searches.',
        calculation: '(Keywords where you rank #1 / Total keywords) x 100'
      }
    },
    {
      title: 'Volume to Capture',
      value: formatCompactNumber(kpis.volume_uncaptured),
      subtitle: 'monthly search opportunity',
      trend: {
        value: formatPercent(100 - kpis.volume_capture_rate),
        isPositive: false,
      },
      icon: <Compass className="w-4 h-4" />,
      colorClass: 'bg-amber-50 text-amber-600',
      delay: 0.06,
      tooltipInfo: {
        title: 'Volume to Capture',
        description: isCompetitor
          ? 'Search volume from competitor keywords where you don\'t rank #1. Your opportunity to steal competitor traffic.'
          : 'Total search volume from non-branded keywords where competitors rank #1. This represents your opportunity for growth.',
        calculation: 'Total volume - Volume from keywords where you rank #1'
      }
    },
    {
      title: 'Biggest Opportunity',
      value: kpis.biggest_opportunity_group || 'N/A',
      subtitle: `${formatCompactNumber(kpis.biggest_opportunity_volume)} volume`,
      icon: <Zap className="w-4 h-4" />,
      colorClass: isCompetitor
        ? 'bg-pink-50 text-pink-600'
        : 'bg-violet-50 text-violet-600',
      delay: 0.09,
      tooltipInfo: {
        title: 'Biggest Opportunity',
        description: 'The modifier group with the highest uncaptured volume. Focus on this category for maximum impact.',
        calculation: 'Modifier group with MAX(total_volume - captured_volume)'
      }
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <KPICard key={index} {...card} />
      ))}
    </div>
  );
}

export default OpportunityKPICards;
