/**
 * Expandable table showing modifier group opportunities.
 * Shows top 3 competitors in table, full details on expand.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronRight,
  Target,
  TrendingUp,
  Users,
  Tag,
  FileText,
  Building2,
  ShoppingCart,
  MessageCircle,
  Newspaper,
} from 'lucide-react';
import type { ModifierGroupOpportunity, OpportunityCompetitor } from '../../types';
import { formatNumber, formatCompactNumber, formatPercent } from '../../utils/formatters';
import { InfoTooltip } from '../common/InfoTooltip';

interface OpportunityModifierGroupsTableProps {
  modifierGroups: ModifierGroupOpportunity[];
  brandName: string;
}

// Domain type configuration for icons and colors
const domainTypeConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string; textColor: string }> = {
  Brand: { icon: Building2, color: 'blue', bgColor: 'bg-blue-50', textColor: 'text-blue-700' },
  Reseller: { icon: ShoppingCart, color: 'purple', bgColor: 'bg-purple-50', textColor: 'text-purple-700' },
  UGC: { icon: MessageCircle, color: 'amber', bgColor: 'bg-amber-50', textColor: 'text-amber-700' },
  '3rd Party': { icon: Newspaper, color: 'teal', bgColor: 'bg-teal-50', textColor: 'text-teal-700' },
  Unknown: { icon: FileText, color: 'gray', bgColor: 'bg-gray-50', textColor: 'text-gray-700' },
};

function CompetitorBadge({ competitor }: { competitor: OpportunityCompetitor }) {
  const config = domainTypeConfig[competitor.domain_type] || domainTypeConfig.Unknown;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${config.bgColor} ${config.textColor} border border-${config.color}-200`}
    >
      <Icon className="w-3 h-3" />
      {competitor.domain.length > 15 ? competitor.domain.substring(0, 15) + '...' : competitor.domain}
    </span>
  );
}

function ExpandedDetails({
  mg,
  brandName,
}: {
  mg: ModifierGroupOpportunity;
  brandName: string;
}) {
  // Group competitors by domain type
  const competitorsByType = mg.top_competitors.reduce<Record<string, OpportunityCompetitor[]>>(
    (acc, comp) => {
      const type = comp.domain_type || 'Unknown';
      if (!acc[type]) acc[type] = [];
      acc[type].push(comp);
      return acc;
    },
    {}
  );

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="overflow-hidden"
    >
      <div className="py-4 px-6 bg-gradient-to-r from-gray-50 to-emerald-50/30 border-t border-gray-100">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Competitors by Domain Type */}
          <div className="lg:col-span-2">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              Top Competitors by Domain Type
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(competitorsByType).map(([type, competitors]) => {
                const config = domainTypeConfig[type] || domainTypeConfig.Unknown;
                const Icon = config.icon;

                return (
                  <div
                    key={type}
                    className={`p-3 rounded-lg border ${config.bgColor} border-${config.color}-200`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`w-4 h-4 ${config.textColor}`} />
                      <span className={`text-sm font-semibold ${config.textColor}`}>{type}</span>
                    </div>
                    <div className="space-y-1">
                      {competitors.map((comp, idx) => (
                        <div key={idx} className="flex justify-between text-xs">
                          <span className="text-gray-700 truncate max-w-[150px]">
                            {comp.domain}
                          </span>
                          <span className="font-medium text-gray-900">
                            {formatCompactNumber(comp.wins_volume)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {Object.keys(competitorsByType).length === 0 && (
                <div className="col-span-2 text-sm text-gray-500 italic">
                  No competitors ranking #1 on these keywords
                </div>
              )}
            </div>
          </div>

          {/* Tags & Example Keywords */}
          <div>
            {/* Top Tags */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-600" />
                Top Tags
              </h4>
              <div className="flex flex-wrap gap-1">
                {Object.entries(mg.top_tags).slice(0, 5).map(([tag, count]) => {
                  const [category, value] = tag.split(':');
                  return (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-1 rounded-md bg-white text-xs font-medium text-gray-700 border border-gray-200"
                    >
                      <span className="text-emerald-600 mr-1">{category}:</span>
                      {value} ({count})
                    </span>
                  );
                })}
                {Object.keys(mg.top_tags).length === 0 && (
                  <span className="text-sm text-gray-500 italic">No tags</span>
                )}
              </div>
            </div>

            {/* Example Keywords */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                Example Keywords
              </h4>
              <div className="flex flex-wrap gap-1">
                {mg.example_keywords.slice(0, 5).map((kw, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-2 py-1 rounded-md bg-white text-gray-700 border border-gray-200 keyword-tag"
                    dir="auto"
                  >
                    {kw}
                  </span>
                ))}
                {mg.example_keywords.length === 0 && (
                  <span className="text-sm text-gray-500 italic">No examples</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function OpportunityModifierGroupsTable({
  modifierGroups,
  brandName,
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

                    {/* Opportunity Size */}
                    <td className="py-4 px-4 text-right">
                      <div className="space-y-0.5">
                        <div className="font-bold text-gray-900">
                          {formatNumber(mg.total_keywords)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatCompactNumber(mg.total_volume)} vol
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

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <tr>
                        <td colSpan={8} className="p-0">
                          <ExpandedDetails mg={mg} brandName={brandName} />
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
