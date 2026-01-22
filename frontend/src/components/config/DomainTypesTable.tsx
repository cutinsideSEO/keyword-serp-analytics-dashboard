/**
 * Domain Types Table
 * Displays all domain types with their styling preview.
 */

import { Card, Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell, Badge } from '@tremor/react';
import { Check } from 'lucide-react';
import { useMarketConfig } from '../../contexts/MarketConfigContext';

export function DomainTypesTable() {
  const { marketConfig, getStyles, getIcon, loading } = useMarketConfig();

  if (loading) {
    return (
      <Card>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-full"></div>
          <div className="h-8 bg-gray-200 rounded w-full"></div>
          <div className="h-8 bg-gray-200 rounded w-full"></div>
        </div>
      </Card>
    );
  }

  if (!marketConfig?.domain_types) {
    return (
      <Card>
        <p className="text-gray-500">No domain types configured</p>
      </Card>
    );
  }

  return (
    <Card>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Domain Type</TableHeaderCell>
            <TableHeaderCell>ID</TableHeaderCell>
            <TableHeaderCell>Color Preview</TableHeaderCell>
            <TableHeaderCell>Icon</TableHeaderCell>
            <TableHeaderCell>Brand Type</TableHeaderCell>
            <TableHeaderCell>CSS Classes</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {marketConfig.domain_types.map((dt) => {
            const styles = getStyles(dt.display_name);
            const Icon = getIcon(dt.display_name);

            return (
              <TableRow key={dt.id}>
                {/* Display Name with Badge */}
                <TableCell>
                  <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${styles.bgColor} ${styles.textColor} font-medium`}>
                    <Icon className="w-4 h-4" />
                    {dt.display_name}
                  </span>
                </TableCell>

                {/* ID */}
                <TableCell>
                  <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                    {dt.id}
                  </code>
                </TableCell>

                {/* Color Preview */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full border-2 border-white shadow"
                      style={{ backgroundColor: dt.hex_color }}
                    />
                    <span className="text-sm text-gray-600">{dt.tremor_color}</span>
                    <code className="text-xs text-gray-400">{dt.hex_color}</code>
                  </div>
                </TableCell>

                {/* Icon */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${styles.textColor}`} />
                    <span className="text-sm text-gray-500">{dt.icon}</span>
                  </div>
                </TableCell>

                {/* Is Brand Type */}
                <TableCell>
                  {dt.is_brand_type ? (
                    <Badge color="blue" icon={Check}>
                      Yes
                    </Badge>
                  ) : (
                    <span className="text-gray-400">No</span>
                  )}
                </TableCell>

                {/* CSS Classes */}
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    <code className="text-xs px-1.5 py-0.5 bg-gray-100 rounded">{dt.bg_class}</code>
                    <code className="text-xs px-1.5 py-0.5 bg-gray-100 rounded">{dt.text_class}</code>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Gradient Preview */}
      <div className="mt-6 pt-6 border-t">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Gradient Previews</h4>
        <div className="flex flex-wrap gap-3">
          {marketConfig.domain_types.map((dt) => (
            <div
              key={dt.id}
              className="px-4 py-2 rounded-lg text-white font-medium text-sm shadow"
              style={{ background: dt.gradient }}
            >
              {dt.display_name}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
