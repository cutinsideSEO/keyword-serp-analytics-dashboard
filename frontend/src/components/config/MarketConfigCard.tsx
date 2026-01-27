/**
 * Market Configuration Card
 * Displays read-only market configuration information.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Globe, Languages } from 'lucide-react';
import { useMarketConfig } from '../../contexts/MarketConfigContext';

export function MarketConfigCard() {
  const { marketConfig, loading } = useMarketConfig();

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!marketConfig) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Failed to load market configuration</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Market Identity */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Globe className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold">Market Identity</h3>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Market Name</p>
              <p className="font-semibold text-lg">{marketConfig.market_name}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Market ID</p>
              <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                {marketConfig.market_id}
              </code>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Industry Context</p>
              <p className="text-gray-700">{marketConfig.industry_context}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Language Settings */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Languages className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold">Language Settings</h3>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Language</p>
              <p className="font-semibold text-lg uppercase">{marketConfig.language}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Text Direction</p>
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
              <p className="text-sm text-muted-foreground">Domain Types Configured</p>
              <p className="font-semibold">{marketConfig.domain_types?.length || 0} types</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card className="md:col-span-2">
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Configuration Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-semibold text-blue-600">{marketConfig.domain_types?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Domain Types</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-semibold text-purple-600">
                {marketConfig.domain_types?.filter(dt => dt.is_brand_type).length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Brand Types</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-semibold text-emerald-600">
                {marketConfig.domain_types?.filter(dt => !dt.is_brand_type).length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Non-Brand Types</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-semibold text-amber-600">
                {marketConfig.text_direction === 'rtl' ? 'RTL' : 'LTR'}
              </p>
              <p className="text-sm text-muted-foreground">Text Direction</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
