/**
 * InsightCard component.
 * Displays actionable insights with priority-based styling and CTA.
 */

import { motion } from 'framer-motion';
import { AlertTriangle, AlertCircle, Info, ChevronRight, TrendingDown, Zap } from 'lucide-react';

export interface InsightCardProps {
  priority: 'critical' | 'warning' | 'info';
  title: string;
  description?: string;
  volume?: number;
  keywords?: number;
  onAction?: () => void;
  actionLabel?: string;
}

const priorityConfig = {
  critical: {
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
    titleColor: 'text-rose-900',
    descColor: 'text-rose-700',
    Icon: AlertTriangle,
  },
  warning: {
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    titleColor: 'text-amber-900',
    descColor: 'text-amber-700',
    Icon: AlertCircle,
  },
  info: {
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    titleColor: 'text-blue-900',
    descColor: 'text-blue-700',
    Icon: Info,
  },
};

export function InsightCard({
  priority,
  title,
  description,
  volume,
  keywords,
  onAction,
  actionLabel = 'View Details',
}: InsightCardProps) {
  const config = priorityConfig[priority];
  const { Icon } = config;

  const formatVolume = (vol: number) => {
    if (vol >= 1000000) return `${(vol / 1000000).toFixed(1)}M`;
    if (vol >= 1000) return `${(vol / 1000).toFixed(1)}K`;
    return vol.toString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${config.bgColor} ${config.borderColor} border rounded-xl p-4`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`${config.iconBg} p-2 rounded-lg flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${config.iconColor}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className={`font-semibold ${config.titleColor}`}>{title}</h4>
          {description && (
            <p className={`text-sm ${config.descColor} mt-0.5`}>{description}</p>
          )}

          {/* Metrics */}
          {(volume !== undefined || keywords !== undefined) && (
            <div className="flex items-center gap-4 mt-2">
              {volume !== undefined && (
                <div className="flex items-center gap-1.5 text-sm">
                  <TrendingDown className={`w-4 h-4 ${config.iconColor}`} />
                  <span className={config.descColor}>
                    <span className="font-medium">{formatVolume(volume)}</span> volume
                  </span>
                </div>
              )}
              {keywords !== undefined && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Zap className={`w-4 h-4 ${config.iconColor}`} />
                  <span className={config.descColor}>
                    <span className="font-medium">{keywords}</span> keywords
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Button */}
        {onAction && (
          <button
            onClick={onAction}
            className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex-shrink-0 ${
              priority === 'critical'
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : priority === 'warning'
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {actionLabel}
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default InsightCard;
