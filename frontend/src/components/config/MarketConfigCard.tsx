/**
 * Market Configuration Card
 * Displays read-only market configuration information.
 */

import { Card, Text } from '@tremor/react';
import { Globe, Languages, ArrowRight } from 'lucide-react';
import { useMarketConfig } from '../../contexts/MarketConfigContext';

export function MarketConfigCard() {
  const { marketConfig, loading } = useMarketConfig();

  if (loading) {
    return (
      <Card>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        </div>
      </Card>
    );
  }

  if (!marketConfig) {
    return (
      <Card>
        <Text className="text-gray-500">Failed to load market configuration</Text>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Market Identity */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Globe className="h-5 w-5 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold">Market Identity</h3>
        </div>

        <div className="space-y-4">
          <div>
            <Text className="text-gray-500 text-sm">Market Name</Text>
            <p className="font-semibold text-lg">{marketConfig.market_name}</p>
          </div>

          <div>
            <Text className="text-gray-500 text-sm">Market ID</Text>
            <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
              {marketConfig.market_id}
            </code>
          </div>

          <div>
            <Text className="text-gray-500 text-sm">Industry Context</Text>
            <p className="text-gray-700">{marketConfig.industry_context}</p>
          </div>
        </div>
      </Card>

      {/* Language Settings */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Languages className="h-5 w-5 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold">Language Settings</h3>
        </div>

        <div className="space-y-4">
          <div>
            <Text className="text-gray-500 text-sm">Language</Text>
            <p className="font-semibold text-lg uppercase">{marketConfig.language}</p>
          </div>

          <div>
            <Text className="text-gray-500 text-sm">Text Direction</Text>
            <div className="flex items-center gap-2">
              <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                {marketConfig.text_direction}
              </code>
              <span className="text-gray-500">
                {marketConfig.text_direction === 'rtl' ? '(Right to Left)' : '(Left to Right)'}
              </span>
            </div>
          </div>

          <div>
            <Text className="text-gray-500 text-sm">Domain Types Configured</Text>
            <p className="font-semibold">{marketConfig.domain_types?.length || 0} types</p>
          </div>
        </div>
      </Card>

      {/* Quick Stats */}
      <Card className="md:col-span-2">
        <h3 className="text-lg font-semibold mb-4">Configuration Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{marketConfig.domain_types?.length || 0}</p>
            <Text className="text-gray-500 text-sm">Domain Types</Text>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-purple-600">
              {marketConfig.domain_types?.filter(dt => dt.is_brand_type).length || 0}
            </p>
            <Text className="text-gray-500 text-sm">Brand Types</Text>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-emerald-600">
              {marketConfig.domain_types?.filter(dt => !dt.is_brand_type).length || 0}
            </p>
            <Text className="text-gray-500 text-sm">Non-Brand Types</Text>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-amber-600">
              {marketConfig.text_direction === 'rtl' ? 'RTL' : 'LTR'}
            </p>
            <Text className="text-gray-500 text-sm">Text Direction</Text>
          </div>
        </div>
      </Card>
    </div>
  );
}
