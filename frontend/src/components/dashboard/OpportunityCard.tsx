/**
 * OpportunityCard component.
 * Displays volume at risk / opportunity size.
 * Clean, Linear/Notion-inspired design.
 */

import { motion } from 'framer-motion';
import { Target, ArrowRight } from 'lucide-react';
import { InfoTooltip } from '../common/InfoTooltip';

export interface OpportunityCardProps {
  volume: number;
  keywords: number;
  label?: string;
  onClick?: () => void;
}

export function OpportunityCard({
  volume,
  keywords,
  label = 'Volume at Risk',
  onClick,
}: OpportunityCardProps) {
  const formatVolume = (vol: number) => {
    if (vol >= 1000000) return `${(vol / 1000000).toFixed(1)}M`;
    if (vol >= 1000) return `${(vol / 1000).toFixed(1)}K`;
    return vol.toString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.05 }}
      onClick={onClick}
      className={`group bg-white rounded-xl p-5 border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-500">
          <Target className="w-5 h-5 text-white" />
        </div>
      </div>

      {/* Label */}
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <InfoTooltip
          title="Volume at Risk"
          description="Monthly search volume from branded keywords where competitors rank #1 instead of you. This represents potential traffic you could reclaim."
          calculation="Sum of volume for all branded keywords where you don't rank #1"
        />
      </div>

      {/* Volume */}
      <div className="flex items-baseline gap-1.5 mb-3">
        <span className="text-3xl font-semibold tracking-tight text-amber-600">
          {formatVolume(volume)}
        </span>
        <span className="text-sm text-gray-400 font-medium">monthly</span>
      </div>

      {/* Stats */}
      <div className="text-xs text-gray-500">
        {keywords.toLocaleString()} keywords to reclaim
      </div>

      {/* Action hint */}
      {onClick && (
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-400">View opportunities</span>
          <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
        </div>
      )}
    </motion.div>
  );
}

export default OpportunityCard;
