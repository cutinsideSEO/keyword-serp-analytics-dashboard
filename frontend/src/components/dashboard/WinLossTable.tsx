/**
 * Modern Win/Loss tables with tabs and search functionality.
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, ExternalLink, Award, AlertTriangle } from 'lucide-react';
import { TabGroup, TabList, Tab, TabPanels, TabPanel, Select, SelectItem } from '@tremor/react';
import type { BrandProtectionWin, BrandProtectionLoss } from '../../types';
import { formatNumber, truncate } from '../../utils/formatters';
import { InfoTooltip } from '../common/InfoTooltip';

interface WinLossTableProps {
  wins: BrandProtectionWin[];
  losses: BrandProtectionLoss[];
}

export function WinLossTable({ wins, losses }: WinLossTableProps) {
  const [searchWins, setSearchWins] = useState('');
  const [searchLosses, setSearchLosses] = useState('');
  const [modifierFilter, setModifierFilter] = useState<string>('all');

  // Get unique modifier groups from losses
  const modifierGroups = useMemo(() => {
    const groups = new Set<string>();
    losses.forEach((loss) => {
      if (loss.modifier_group) {
        groups.add(loss.modifier_group);
      }
    });
    return Array.from(groups).sort();
  }, [losses]);

  const filteredWins = wins.filter((w) =>
    w.keyword.toLowerCase().includes(searchWins.toLowerCase())
  );

  const filteredLosses = losses.filter((l) => {
    const matchesSearch = l.keyword.toLowerCase().includes(searchLosses.toLowerCase());
    const matchesModifier =
      modifierFilter === 'all' ||
      (modifierFilter === 'none' && !l.modifier_group) ||
      l.modifier_group === modifierFilter;
    return matchesSearch && matchesModifier;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.8 }}
      className="bg-white rounded-2xl p-6 border border-gray-200 shadow-md hover:shadow-xl transition-all duration-300"
    >
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-1 flex items-center">
          Keyword Details
          <InfoTooltip
            title="Wins & Losses Breakdown"
            description="Wins are keywords where you rank #1. Losses are keywords where competitors rank #1 instead of you. Use search and filters to find specific keywords and identify opportunities."
            calculation="Wins: Keywords with your domain at position #1. Losses: Keywords where any other domain is at position #1 (and you're not)."
          />
        </h3>
        <p className="text-sm text-gray-600">
          Search and filter through your winning and losing keywords
        </p>
      </div>

      <TabGroup>
        <TabList variant="solid" className="bg-gray-100 p-1 rounded-xl">
          <Tab className="data-[selected]:bg-white data-[selected]:text-emerald-700 data-[selected]:shadow-sm rounded-lg transition-all">
            <span className="flex items-center gap-2 px-2 py-1">
              <Award className="w-4 h-4" />
              Wins
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                {wins.length}
              </span>
            </span>
          </Tab>
          <Tab className="data-[selected]:bg-white data-[selected]:text-red-700 data-[selected]:shadow-sm rounded-lg transition-all">
            <span className="flex items-center gap-2 px-2 py-1">
              <AlertTriangle className="w-4 h-4" />
              Losses
              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                {losses.length}
              </span>
            </span>
          </Tab>
        </TabList>

        <TabPanels>
          {/* Wins Panel */}
          <TabPanel>
            <div className="mt-6">
              {/* Search Bar */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search winning keywords..."
                  value={searchWins}
                  onChange={(e) => setSearchWins(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all outline-none"
                />
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Keyword
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Volume
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Position
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Tags
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWins.slice(0, 200).map((win, index) => (
                      <tr
                        key={`${win.keyword}-${index}`}
                        className="border-b border-gray-100 hover:bg-emerald-50 transition-colors"
                      >
                        <td className="py-4 px-4 keyword-cell">
                          <a
                            href={win.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-2 group"
                            dir="auto"
                          >
                            <span className="keyword-text">{truncate(win.keyword, 50)}</span>
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                          </a>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="font-medium text-gray-900">
                            {formatNumber(win.volume)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 text-sm font-bold">
                            #{win.rank_absolute}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(win.tags)
                              .filter(([key]) => key !== 'brand')
                              .slice(0, 3)
                              .map(([key, value]) => (
                                <span
                                  key={key}
                                  className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-700 text-xs font-medium"
                                >
                                  {value}
                                </span>
                              ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredWins.length > 200 && (
                <p className="mt-6 text-center text-sm text-gray-500 font-medium">
                  Showing 200 of {filteredWins.length} results
                </p>
              )}
            </div>
          </TabPanel>

          {/* Losses Panel */}
          <TabPanel>
            <div className="mt-6">
              {/* Search and Filter */}
              <div className="flex gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search lost keywords..."
                    value={searchLosses}
                    onChange={(e) => setSearchLosses(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all outline-none"
                  />
                </div>
                {modifierGroups.length > 0 && (
                  <div className="relative min-w-[200px]">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10 pointer-events-none" />
                    <Select
                      value={modifierFilter}
                      onValueChange={setModifierFilter}
                      placeholder="All Modifier Groups"
                      className="pl-8"
                    >
                      <SelectItem value="all">All Modifier Groups</SelectItem>
                      <SelectItem value="none">No Modifier Group</SelectItem>
                      {modifierGroups.map((group) => (
                        <SelectItem key={group} value={group}>
                          {group}
                        </SelectItem>
                      ))}
                    </Select>
                  </div>
                )}
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Keyword
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Volume
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Winner
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Your Position
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Tags
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLosses.slice(0, 200).map((loss, index) => (
                      <tr
                        key={`${loss.keyword}-${index}`}
                        className="border-b border-gray-100 hover:bg-red-50 transition-colors"
                      >
                        <td className="py-4 px-4 keyword-cell">
                          <span className="font-semibold text-gray-900 keyword-text" dir="auto">
                            {truncate(loss.keyword, 50)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="font-medium text-gray-900">
                            {formatNumber(loss.volume)}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <a
                            href={loss.winner_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-2 group"
                          >
                            {truncate(loss.winner_domain, 30)}
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </a>
                        </td>
                        <td className="py-4 px-4 text-right">
                          {loss.brand_position ? (
                            <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 text-sm font-bold">
                              #{loss.brand_position}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-sm font-bold">
                              Not ranking
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(loss.tags)
                              .filter(([key]) => key !== 'brand')
                              .slice(0, 3)
                              .map(([key, value]) => (
                                <span
                                  key={key}
                                  className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-700 text-xs font-medium"
                                >
                                  {value}
                                </span>
                              ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredLosses.length > 200 && (
                <p className="mt-6 text-center text-sm text-gray-500 font-medium">
                  Showing 200 of {filteredLosses.length} results
                </p>
              )}
            </div>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </motion.div>
  );
}

export default WinLossTable;
