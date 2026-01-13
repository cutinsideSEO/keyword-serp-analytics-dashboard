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
  gradient: string;
  glowColor: string;
  delay: number;
  tooltipInfo?: {
    title: string;
    description: string;
    calculation: string;
  };
}

function KPICard({ title, value, subtitle, trend, icon, gradient, glowColor, delay, tooltipInfo }: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="relative group"
    >
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"
        style={{ background: glowColor }}
      />
      <div
        className="relative bg-white rounded-2xl p-6 border border-gray-200 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden"
      >
        {/* Gradient Accent */}
        <div
          className="absolute top-0 right-0 w-32 h-32 opacity-10 rounded-full blur-3xl"
          style={{ background: gradient }}
        />

        {/* Icon */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 relative"
          style={{ background: gradient, boxShadow: `0 4px 12px ${glowColor}` }}
        >
          <div className="text-white">{icon}</div>
        </div>

        {/* Content */}
        <div className="relative z-10">
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
                className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                  trend.isPositive
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
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

          <motion.h3
            className="text-3xl font-bold mb-2 bg-clip-text text-transparent"
            style={{ backgroundImage: gradient }}
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: delay + 0.2 }}
          >
            {value}
          </motion.h3>

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
      icon: <Search className="w-6 h-6" />,
      gradient: isCompetitor
        ? 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)'
        : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      glowColor: isCompetitor
        ? 'rgba(139, 92, 246, 0.15)'
        : 'rgba(16, 185, 129, 0.15)',
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
      icon: <Target className="w-6 h-6" />,
      gradient: isCompetitor
        ? 'linear-gradient(135deg, #A855F7 0%, #9333EA 100%)'
        : 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
      glowColor: isCompetitor
        ? 'rgba(168, 85, 247, 0.15)'
        : 'rgba(20, 184, 166, 0.15)',
      delay: 0.1,
      tooltipInfo: {
        title: 'Capture Rate',
        description: isCompetitor
          ? 'Competitor branded keywords where your brand ranks #1. Shows how well you compete on competitor searches.'
          : 'Non-branded keywords where your brand ranks #1. This shows how well you compete on generic/category searches.',
        calculation: '(Keywords where you rank #1 / Total keywords) × 100'
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
      icon: <Compass className="w-6 h-6" />,
      gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
      glowColor: 'rgba(245, 158, 11, 0.15)',
      delay: 0.2,
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
      icon: <Zap className="w-6 h-6" />,
      gradient: isCompetitor
        ? 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)'
        : 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
      glowColor: isCompetitor
        ? 'rgba(236, 72, 153, 0.15)'
        : 'rgba(139, 92, 246, 0.15)',
      delay: 0.3,
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
