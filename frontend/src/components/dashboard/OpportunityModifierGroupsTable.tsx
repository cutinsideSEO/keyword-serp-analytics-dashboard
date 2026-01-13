/**
 * Expandable table showing modifier group opportunities.
 * Shows top 3 competitors in table, full details on expand.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  Target,
  TrendingUp,
  FileText,
} from 'lucide-react';
import type { ModifierGroupOpportunity, OpportunityCompetitor } from '../../types';
import { formatNumber, formatCompactNumber, formatPercent } from '../../utils/formatters';
import { InfoTooltip } from '../common/InfoTooltip';
import { useMarketConfig } from '../../contexts/MarketConfigContext';
import { OpportunityExpandedDetails } from './OpportunityExpandedDetails';

interface OpportunityModifierGroupsTableProps {
  modifierGroups: ModifierGroupOpportunity[];
  brandName: string;
  keywordType?: 'nonbranded' | 'competitor_branded';
}

function CompetitorBadge({ competitor }: { competitor: OpportunityCompetitor }) {
  const { getStyles, getIcon } = useMarketConfig();
  const styles = getStyles(competitor.domain_type);
  const Icon = getIcon(competitor.domain_type);

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${styles.bgColor} ${styles.textColor} ${styles.borderColor} border`}
    >
      <Icon className="w-3 h-3" />
      {competitor.domain.length > 15 ? competitor.domain.substring(0, 15) + '...' : competitor.domain}
    </span>
  );
}

export function OpportunityModifierGroupsTable({
  modifierGroups,
  brandName,
  keywordType = 'nonbranded',
}: OpportunityModifierGroupsTableProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleExpand = (modifierGroup: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(modifierGroup)) {
        next.delete(modifierGroup);
      } else {
        next.add(modifierGroup);
      }
      return next;
    });
  };

  if (modifierGroups.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center">
        <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Opportunities Found</h3>
        <p className="text-gray-600">
          There are no non-branded keywords to analyze for this brand.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="bg-white rounded-2xl border border-gray-200 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden"
    >
      <div className="p-6 border-b border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-1 flex items-center">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center mr-3">
            <Target className="w-5 h-5 text-white" />
          </div>
          Opportunities by Modifier Group
          <InfoTooltip
            title="Modifier Group Opportunities"
            description="Non-branded keywords grouped by their modifier type. Shows opportunity size, current capture rate, and top competitors."
            calculation="For each modifier group: Total Volume - Volume where you rank #1 = Opportunity Volume"
          />
        </h3>
        <p className="text-sm text-gray-600 ml-13">
          Click a row to expand and see detailed competitor breakdown
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide w-8"></th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Modifier Group
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Opportunity Size
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Captured
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                To Capture
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Capture Rate
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Avg Position
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Top Competitors
              </th>
            </tr>
          </thead>
          <tbody>
            {modifierGroups.map((mg, index) => {
              const isExpanded = expandedGroups.has(mg.modifier_group);

              return (
                <React.Fragment key={mg.modifier_group}>
                  <motion.tr
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.03 }}
                    className={`border-b border-gray-100 cursor-pointer transition-colors ${
                      isExpanded ? 'bg-emerald-50/50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => toggleExpand(mg.modifier_group)}
                  >
                    {/* Expand Icon */}
                    <td className="py-4 px-4">
                      <motion.div
                        animate={{ rotate: isExpanded ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </motion.div>
                    </td>

                    {/* Modifier Group Name */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center flex-shrink-0">
                          <Target className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-semibold text-gray-900">
                          {mg.modifier_group}
                        </span>
                      </div>
                    </td>

                    {/* Opportunity Size - Volume first, then keywords */}
                    <td className="py-4 px-4 text-right">
                      <div className="space-y-0.5">
                        <div className="font-bold text-gray-900">
                          {formatCompactNumber(mg.total_volume)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatNumber(mg.total_keywords)} keywords
                        </div>
                      </div>
                    </td>

                    {/* Captured */}
                    <td className="py-4 px-4 text-right">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-emerald-700">
                          {formatNumber(mg.keywords_captured)}
                        </div>
                        <div className="text-xs text-emerald-600">
                          {formatCompactNumber(mg.volume_captured)} vol
                        </div>
                      </div>
                    </td>

                    {/* To Capture */}
                    <td className="py-4 px-4 text-right">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-amber-700">
                          {formatNumber(mg.keywords_uncaptured)}
                        </div>
                        <div className="text-xs text-amber-600">
                          {formatCompactNumber(mg.volume_uncaptured)} vol
                        </div>
                      </div>
                    </td>

                    {/* Capture Rate */}
                    <td className="py-4 px-4 text-right">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-bold ${
                          mg.capture_rate >= 50
                            ? 'bg-emerald-100 text-emerald-700'
                            : mg.capture_rate >= 25
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        <TrendingUp className="w-3 h-3" />
                        {formatPercent(mg.capture_rate)}
                      </span>
                    </td>

                    {/* Avg Position */}
                    <td className="py-4 px-4 text-right">
                      {mg.avg_brand_position != null ? (
                        <span
                          className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold ${
                            mg.avg_brand_position <= 3
                              ? 'bg-emerald-100 text-emerald-700'
                              : mg.avg_brand_position <= 10
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          #{mg.avg_brand_position.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Not ranked</span>
                      )}
                    </td>

                    {/* Top Competitors */}
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1">
                        {mg.top_competitors.slice(0, 3).map((comp, idx) => (
                          <CompetitorBadge key={idx} competitor={comp} />
                        ))}
                        {mg.top_competitors.length > 3 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-700 text-xs font-medium">
                            +{mg.top_competitors.length - 3}
                          </span>
                        )}
                        {mg.top_competitors.length === 0 && (
                          <span className="text-xs text-gray-400 italic">No competitors</span>
                        )}
                      </div>
                    </td>
                  </motion.tr>

                  {/* Expanded Details - Lazy loaded */}
                  <AnimatePresence>
                    {isExpanded && (
                      <tr>
                        <td colSpan={8} className="p-0">
                          <OpportunityExpandedDetails
                            brandName={brandName}
                            modifierGroup={mg.modifier_group}
                            keywordType={keywordType}
                          />
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between text-sm">
        <div className="text-gray-600">
          <span className="font-semibold text-gray-900">{modifierGroups.length}</span> modifier groups
        </div>
        <div className="flex gap-6">
          <div className="text-gray-600">
            Total Keywords:{' '}
            <span className="font-semibold text-gray-900">
              {formatNumber(modifierGroups.reduce((sum, mg) => sum + mg.total_keywords, 0))}
            </span>
          </div>
          <div className="text-emerald-600">
            Captured:{' '}
            <span className="font-semibold">
              {formatCompactNumber(modifierGroups.reduce((sum, mg) => sum + mg.volume_captured, 0))}
            </span>
          </div>
          <div className="text-amber-600">
            Opportunity:{' '}
            <span className="font-semibold">
              {formatCompactNumber(modifierGroups.reduce((sum, mg) => sum + mg.volume_uncaptured, 0))}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default OpportunityModifierGroupsTable;
