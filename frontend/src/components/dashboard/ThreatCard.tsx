/**
 * ThreatCard component.
 * Displays top competitor threat information.
 * Clean, Linear/Notion-inspired design.
 */

import { motion } from 'framer-motion';
import { AlertTriangle, ExternalLink, ArrowRight } from 'lucide-react';
import { InfoTooltip } from '../common/InfoTooltip';
import { useMarketConfig } from '../../contexts/MarketConfigContext';

export interface ThreatCardProps {
  domain: string;
  domainType?: string;
  keywords: number;
  volume: number;
  avgPosition?: number;
  onClick?: () => void;
}

export function ThreatCard({
  domain,
  domainType,
  keywords,
  volume,
  avgPosition,
  onClick,
}: ThreatCardProps) {
  const { getStyles, getIcon } = useMarketConfig();

  const formatVolume = (vol: number) => {
    if (vol >= 1000000) return `${(vol / 1000000).toFixed(1)}M`;
    if (vol >= 1000) return `${(vol / 1000).toFixed(1)}K`;
    return vol.toString();
  };

  const styles = domainType ? getStyles(domainType) : null;
  const DomainIcon = domainType ? getIcon(domainType) : ExternalLink;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.1 }}
      onClick={onClick}
      className={`group bg-white rounded-xl p-5 border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-rose-500">
          <AlertTriangle className="w-5 h-5 text-white" />
        </div>
        {domainType && styles && (
          <span
            className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md ${styles.bgColor} ${styles.textColor}`}
          >
            <DomainIcon className="w-3 h-3" />
            {domainType}
          </span>
        )}
      </div>

      {/* Label */}
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-sm font-medium text-gray-500">Top Threat</span>
        <InfoTooltip
          title="Top Threat"
          description="The competitor domain that is winning the most branded keywords from you. Focus on understanding their strategy to reclaim lost positions."
          calculation="Competitor with highest win count on your branded keywords"
        />
      </div>

      {/* Domain */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg font-semibold text-gray-900 truncate max-w-[180px]">
          {domain}
        </span>
        <ExternalLink className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span>
          <span className="font-medium text-rose-600">{keywords}</span> keywords
        </span>
        <span className="text-gray-300">|</span>
        <span>
          <span className="font-medium text-rose-600">{formatVolume(volume)}</span> vol
        </span>
        {avgPosition && (
          <>
            <span className="text-gray-300">|</span>
            <span>#{avgPosition.toFixed(1)}</span>
          </>
        )}
      </div>

      {/* Action hint */}
      {onClick && (
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-400">Analyze threat</span>
          <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
        </div>
      )}
    </motion.div>
  );
}

export default ThreatCard;
