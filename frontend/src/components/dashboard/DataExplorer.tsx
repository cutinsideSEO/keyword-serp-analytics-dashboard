/**
 * Unified DataExplorer component.
 * Replaces CategoryProtectionExplorer, ModifierGroupProtectionExplorer,
 * CategoryExplorer, and ModifierGroupExplorer with a single configurable component.
 * Clean card styling, flat icon badge, bg-gray-50 thead, optional footer.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Loader2 } from 'lucide-react';
import { InfoTooltip } from '../common/InfoTooltip';

export interface ExplorerColumn<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

export interface DataExplorerProps<T> {
  title: string;
  description?: string;
  tooltipInfo?: {
    title: string;
    description: string;
    calculation?: string;
  };
  icon: React.ReactNode;
  iconBgClass?: string;
  data: T[];
  columns: ExplorerColumn<T>[];
  getRowKey: (item: T) => string;
  onRowClick?: (item: T) => void;
  isLoading?: boolean;
  loadingItemKey?: string;
  emptyMessage?: string;
  showMoreLabel?: string;
  initialVisibleCount?: number;
  footer?: React.ReactNode;
}

export function DataExplorer<T>({
  title,
  description,
  tooltipInfo,
  icon,
  iconBgClass = 'bg-blue-100',
  data,
  columns,
  getRowKey,
  onRowClick,
  isLoading = false,
  loadingItemKey,
  emptyMessage = 'No data available',
  showMoreLabel = 'items',
  initialVisibleCount = 10,
  footer,
}: DataExplorerProps<T>) {
  const [visibleCount, setVisibleCount] = useState(initialVisibleCount);

  const visibleData = data.slice(0, visibleCount);
  const hasMore = visibleCount < data.length;

  const renderCellValue = (item: T, column: ExplorerColumn<T>) => {
    if (column.render) {
      return column.render(item);
    }
    const value = (item as Record<string, unknown>)[column.key as string];
    return value !== undefined && value !== null ? String(value) : '-';
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBgClass}`}
        >
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            {title}
            {tooltipInfo && (
              <InfoTooltip
                title={tooltipInfo.title}
                description={tooltipInfo.description}
                calculation={tooltipInfo.calculation}
              />
            )}
          </h3>
          {description && (
            <p className="text-sm text-gray-600">{description}</p>
          )}
        </div>
      </div>

      {/* Table */}
      {isLoading && data.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">{emptyMessage}</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto -mx-6">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-y border-gray-200">
                  {columns.map((col) => (
                    <th
                      key={String(col.key)}
                      className={`px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider ${
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                      }`}
                      style={col.width ? { width: col.width } : undefined}
                    >
                      {col.header}
                    </th>
                  ))}
                  {onRowClick && <th className="w-10"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleData.map((item, idx) => {
                  const rowKey = getRowKey(item);
                  const isLoadingRow = loadingItemKey === rowKey;

                  return (
                    <motion.tr
                      key={rowKey}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.02 }}
                      onClick={() => onRowClick?.(item)}
                      className={`${
                        onRowClick
                          ? 'hover:bg-gray-50 cursor-pointer transition-colors'
                          : ''
                      }`}
                    >
                      {columns.map((col) => (
                        <td
                          key={String(col.key)}
                          className={`px-6 py-3.5 text-sm ${
                            col.align === 'right'
                              ? 'text-right'
                              : col.align === 'center'
                              ? 'text-center'
                              : 'text-left'
                          }`}
                        >
                          {renderCellValue(item, col)}
                        </td>
                      ))}
                      {onRowClick && (
                        <td className="px-4 py-3.5 text-right">
                          {isLoadingRow ? (
                            <Loader2 className="w-4 h-4 animate-spin text-gray-400 ml-auto" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                          )}
                        </td>
                      )}
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          {footer && (
            <div className="-mx-6 mt-0 px-6 py-3 bg-gray-50 border-t border-gray-200">
              {footer}
            </div>
          )}

          {/* Show More Button */}
          {hasMore && (
            <div className="mt-4 text-center">
              <button
                onClick={() =>
                  setVisibleCount((prev) =>
                    Math.min(prev + initialVisibleCount, data.length)
                  )
                }
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
              >
                Show More ({data.length - visibleCount} {showMoreLabel} remaining)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default DataExplorer;
