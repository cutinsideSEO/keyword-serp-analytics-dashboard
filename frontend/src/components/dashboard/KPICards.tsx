/**
 * Modern KPI cards with gradients and animations.
 */

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Target, AlertTriangle, Search, Award } from 'lucide-react';
import type { BrandProtectionKPIs } from '../../types';
import { formatNumber, formatPercent } from '../../utils/formatters';
import { InfoTooltip } from '../common/InfoTooltip';

interface KPICardsProps {
  kpis: BrandProtectionKPIs;
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
                    : 'bg-red-100 text-red-700'
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

export function KPICards({ kpis }: KPICardsProps) {
  const cards = [
    {
      title: 'Total Keywords',
      value: formatNumber(kpis.total_branded_keywords),
      subtitle: `${formatNumber(kpis.total_branded_volume)} search volume`,
      icon: <Target className="w-6 h-6" />,
      gradient: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
      glowColor: 'rgba(59, 130, 246, 0.15)',
      delay: 0,
      tooltipInfo: {
        title: 'Total Keywords',
        description: 'The total number of branded keywords being tracked, along with their combined monthly search volume.',
        calculation: 'Count all keywords containing your brand name + Sum their monthly search volumes'
      }
    },
    {
      title: 'Win Rate',
      value: formatNumber(kpis.keywords_winning),
      subtitle: 'keywords ranking #1',
      trend: {
        value: formatPercent(kpis.win_rate_keywords),
        isPositive: kpis.win_rate_keywords >= 50,
      },
      icon: <Award className="w-6 h-6" />,
      gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      glowColor: 'rgba(16, 185, 129, 0.15)',
      delay: 0.1,
      tooltipInfo: {
        title: 'Win Rate',
        description: 'Keywords where your brand ranks #1 in search results. A higher percentage means better brand protection.',
        calculation: '(Keywords where you rank #1 / Total branded keywords) × 100'
      }
    },
    {
      title: 'Losses',
      value: formatNumber(kpis.keywords_losing),
      subtitle: 'keywords lost to competitors',
      trend: {
        value: formatPercent(100 - kpis.win_rate_keywords),
        isPositive: false,
      },
      icon: <AlertTriangle className="w-6 h-6" />,
      gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
      glowColor: 'rgba(239, 68, 68, 0.15)',
      delay: 0.2,
      tooltipInfo: {
        title: 'Losses',
        description: 'Keywords where competitors rank #1 instead of you. These represent opportunities to improve brand visibility.',
        calculation: 'Total branded keywords - Keywords where you rank #1'
      }
    },
    {
      title: 'Volume at Risk',
      value: formatNumber(kpis.volume_losing),
      subtitle: 'monthly searches lost',
      trend: {
        value: formatPercent(100 - kpis.win_rate_volume),
        isPositive: false,
      },
      icon: <Search className="w-6 h-6" />,
      gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
      glowColor: 'rgba(245, 158, 11, 0.15)',
      delay: 0.3,
      tooltipInfo: {
        title: 'Volume at Risk',
        description: 'Monthly search volume from keywords where competitors rank #1. This is potential traffic being captured by others.',
        calculation: 'Sum of monthly search volumes for all keywords where competitors rank #1'
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

export default KPICards;
