/**
 * HeatmapModal component for two-category modifier group visualization.
 * Displays a grid of (row_value x col_value) combinations with opportunity metrics.
 */

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Loader2, Grid3X3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getModifierGroupHeatmap } from '../../api/endpoints';
import { getHeatmapColor, formatHeatmapVolume } from '../../utils/colorScale';
import { formatPercent } from '../../utils/formatters';
import { parseModifierGroup } from '../../utils/modifierGroup';
import { useMarketConfig } from '../../contexts/MarketConfigContext';
import type { HeatmapResponse, HeatmapCell } from '../../types';

interface HeatmapModalProps {
  isOpen: boolean;
  onClose: () => void;
  modifierGroup: string;
  brandName: string;
  keywordType: 'nonbranded' | 'competitor_branded';
  onCellClick: (rowValue: string, colValue: string) => void;
}

export function HeatmapModal({
  isOpen,
  onClose,
  modifierGroup,
  brandName,
  keywordType,
  onCellClick,
}: HeatmapModalProps) {
  const { currentMarketId } = useMarketConfig();

  // Parse categories from modifier group
  const { categories } = parseModifierGroup(modifierGroup);
  const rowCategory = categories[0] || '';
  const colCategory = categories[1] || '';

  // Fetch heatmap data
  const {
    data,
    isLoading,
    error,
  } = useQuery<HeatmapResponse>({
    queryKey: ['heatmap', currentMarketId, modifierGroup, brandName, keywordType],
    queryFn: () =>
      getModifierGroupHeatmap(
        brandName,
        modifierGroup,
        rowCategory,
        colCategory,
        keywordType
      ),
    enabled: isOpen && !!modifierGroup && !!brandName && categories.length === 2,
  });

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Build cell lookup map for quick access
  const cellMap = new Map<string, HeatmapCell>();
  if (data?.cells) {
    data.cells.forEach((cell) => {
      cellMap.set(`${cell.row_value}|${cell.col_value}`, cell);
    });
  }

  const getCell = (rowValue: string, colValue: string): HeatmapCell | undefined => {
    return cellMap.get(`${rowValue}|${colValue}`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-4 md:inset-8 lg:inset-12 z-50 flex items-center justify-center"
          >
            <div
              className="bg-white rounded-xl border border-gray-200 shadow-lg w-full max-w-5xl max-h-full overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Grid3X3 className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {modifierGroup}
                    </h2>
                    <p className="text-sm text-gray-500">
                      Opportunity Heatmap
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-auto p-6">
                {isLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  </div>
                ) : error ? (
                  <div className="text-center py-20">
                    <p className="text-red-500">Failed to load heatmap data</p>
                  </div>
                ) : data && data.row_values.length > 0 && data.col_values.length > 0 ? (
                  <div className="space-y-4">
                    {/* Category Labels */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Rows:</span>
                        <span className="font-medium text-gray-900">
                          {data.row_category_display}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Columns:</span>
                        <span className="font-medium text-gray-900">
                          {data.col_category_display}
                        </span>
                      </div>
                    </div>

                    {/* Heatmap Grid */}
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr>
                            {/* Empty corner cell */}
                            <th className="p-2 text-left text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 sticky left-0 z-10 min-w-[120px]">
                              {data.row_category_display}
                            </th>
                            {/* Column headers */}
                            {data.col_values.map((colValue) => (
                              <th
                                key={colValue}
                                className="p-2 text-center text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 min-w-[80px]"
                                title={colValue}
                              >
                                <span className="block truncate max-w-[100px]">
                                  {colValue}
                                </span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {data.row_values.map((rowValue) => (
                            <tr key={rowValue}>
                              {/* Row header */}
                              <td
                                className="p-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 sticky left-0 z-10"
                                title={rowValue}
                              >
                                <span className="block truncate max-w-[120px]">
                                  {rowValue}
                                </span>
                              </td>
                              {/* Data cells */}
                              {data.col_values.map((colValue) => {
                                const cell = getCell(rowValue, colValue);
                                const colors = getHeatmapColor(
                                  cell?.volume_uncaptured || 0,
                                  data.max_volume_uncaptured
                                );

                                return (
                                  <td
                                    key={`${rowValue}-${colValue}`}
                                    className={`p-2 text-center border border-gray-200 cursor-pointer transition-all hover:ring-2 hover:ring-blue-400 hover:ring-inset ${colors.bg}`}
                                    onClick={() => cell && onCellClick(rowValue, colValue)}
                                    title={
                                      cell
                                        ? `${rowValue} + ${colValue}\nVolume to capture: ${cell.volume_uncaptured.toLocaleString()}\nCapture rate: ${formatPercent(cell.capture_rate)}\nKeywords: ${cell.total_keywords}`
                                        : `${rowValue} + ${colValue}\nNo data`
                                    }
                                  >
                                    {cell ? (
                                      <span className={`text-sm font-semibold ${colors.text}`}>
                                        {formatHeatmapVolume(cell.volume_uncaptured)}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400 text-sm">—</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Legend */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div className="text-sm text-gray-500">
                        Showing top {data.row_values.length} × {data.col_values.length} combinations by opportunity volume
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">Color intensity =</span>
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-4 rounded bg-green-100 border border-gray-200" />
                          <span className="text-gray-400">Low</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-4 rounded bg-green-400" />
                          <span className="text-gray-500">Med</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-4 rounded bg-green-600" />
                          <span className="text-gray-600">High</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20">
                    <Grid3X3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No heatmap data available for this modifier group</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
                <p className="text-xs text-gray-500 text-center">
                  Click any cell to see keyword details for that combination
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default HeatmapModal;
