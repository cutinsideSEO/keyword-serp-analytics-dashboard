/**
 * Unified DataExplorer component.
 * Replaces CategoryProtectionExplorer, ModifierGroupProtectionExplorer,
 * CategoryExplorer, and ModifierGroupExplorer with a single configurable component.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, Title, Text } from '@tremor/react';
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
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className={`p-2 rounded-lg ${iconBgClass}`}>{icon}</div>
        <div>
          <Title className="flex items-center gap-2">
            {title}
            {tooltipInfo && (
              <InfoTooltip
                title={tooltipInfo.title}
                description={tooltipInfo.description}
                calculation={tooltipInfo.calculation}
              />
            )}
          </Title>
          {description && <Text className="text-gray-500">{description}</Text>}
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  {columns.map((col) => (
                    <th
                      key={String(col.key)}
                      className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider ${
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
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
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
                          className={`px-4 py-3 text-sm ${
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
                        <td className="px-4 py-3 text-right">
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
    </Card>
  );
}

export default DataExplorer;
