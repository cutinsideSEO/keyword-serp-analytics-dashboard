/**
 * BrandHealthCard component.
 * Displays a composite brand health score (0-100) based on win rate and volume.
 * Clean, Linear/Notion-inspired design.
 */

import { motion } from 'framer-motion';
import { Shield, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { InfoTooltip } from '../common/InfoTooltip';

export interface BrandHealthCardProps {
  score: number;
  winRateKeywords: number;
  winRateVolume: number;
  trend?: 'up' | 'down' | 'stable';
  onClick?: () => void;
}

export function BrandHealthCard({
  score,
  winRateKeywords,
  winRateVolume,
  trend,
  onClick,
}: BrandHealthCardProps) {
  const getScoreColor = (s: number) => {
    if (s >= 70) return { bg: 'bg-emerald-50', icon: 'bg-emerald-500', text: 'text-emerald-600', border: 'border-emerald-100' };
    if (s >= 40) return { bg: 'bg-amber-50', icon: 'bg-amber-500', text: 'text-amber-600', border: 'border-amber-100' };
    return { bg: 'bg-rose-50', icon: 'bg-rose-500', text: 'text-rose-600', border: 'border-rose-100' };
  };

  const getScoreLabel = (s: number) => {
    if (s >= 70) return 'Healthy';
    if (s >= 40) return 'At Risk';
    return 'Critical';
  };

  const colors = getScoreColor(score);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={`group bg-white rounded-xl p-5 border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors.icon}`}>
          <Shield className="w-5 h-5 text-white" />
        </div>
        {trend && (
          <span
            className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md ${
              trend === 'up'
                ? 'bg-emerald-50 text-emerald-600'
                : trend === 'down'
                ? 'bg-rose-50 text-rose-600'
                : 'bg-gray-50 text-gray-500'
            }`}
          >
            {trend === 'up' ? (
              <TrendingUp className="w-3 h-3" />
            ) : trend === 'down' ? (
              <TrendingDown className="w-3 h-3" />
            ) : null}
            {trend === 'up' ? 'Up' : trend === 'down' ? 'Down' : 'Stable'}
          </span>
        )}
      </div>

      {/* Label */}
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-sm font-medium text-gray-500">Brand Health</span>
        <InfoTooltip
          title="Brand Health Score"
          description="A composite score measuring how well you protect your branded keywords. Based on keyword win rate (60%) and volume win rate (40%)."
          calculation="Score = (Keyword Win Rate * 0.6) + (Volume Win Rate * 0.4)"
        />
      </div>

      {/* Score */}
      <div className="flex items-baseline gap-1.5 mb-3">
        <span className={`text-3xl font-semibold tracking-tight ${colors.text}`}>
          {score}
        </span>
        <span className="text-sm text-gray-400 font-medium">/100</span>
        <span
          className={`ml-2 text-xs font-medium px-2 py-0.5 rounded-md ${colors.bg} ${colors.text}`}
        >
          {getScoreLabel(score)}
        </span>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span>{(winRateKeywords ?? 0).toFixed(0)}% keywords</span>
        <span className="text-gray-300">|</span>
        <span>{(winRateVolume ?? 0).toFixed(0)}% volume</span>
      </div>

      {/* Action hint */}
      {onClick && (
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-400">View details</span>
          <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
        </div>
      )}
    </motion.div>
  );
}

export default BrandHealthCard;
