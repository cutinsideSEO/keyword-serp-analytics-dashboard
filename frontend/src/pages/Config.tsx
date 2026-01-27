/**
 * Configuration Page
 *
 * Displays market configuration, domain types, and brand-domain mappings.
 * Market config and domain types are read-only (configured via code).
 * Brand-domain mappings can be edited.
 */

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Settings, Palette, Link2 } from 'lucide-react';
import { MarketConfigCard } from '../components/config/MarketConfigCard';
import { DomainTypesTable } from '../components/config/DomainTypesTable';
import { BrandDomainManager } from '../components/config/BrandDomainManager';

export function Config() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">
            Configuration
          </h1>
          <p className="text-sm text-muted-foreground">
            View market settings and manage brand-domain mappings
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
              <Settings className="h-4 w-4 text-gray-600" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">System Config</div>
              <div className="text-xl font-semibold text-gray-900">Settings</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="market">
        <TabsList>
          <TabsTrigger value="market" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Market Config
          </TabsTrigger>
          <TabsTrigger value="domains" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Domain Types
          </TabsTrigger>
          <TabsTrigger value="brands" className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Brand Domains
          </TabsTrigger>
        </TabsList>

        {/* Market Configuration Tab */}
        <TabsContent value="market">
          <div className="mt-6">
            <h3 className="font-semibold text-gray-900">Market Configuration</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Current market settings (configured in backend)
            </p>
            <MarketConfigCard />
          </div>
        </TabsContent>

        {/* Domain Types Tab */}
        <TabsContent value="domains">
          <div className="mt-6">
            <h3 className="font-semibold text-gray-900">Domain Types</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Domain classifications used in this market
            </p>
            <DomainTypesTable />
          </div>
        </TabsContent>

        {/* Brand Domain Mappings Tab */}
        <TabsContent value="brands">
          <div className="mt-6">
            <h3 className="font-semibold text-gray-900">Brand-Domain Mappings</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Manage which domains are associated with each brand
            </p>
            <BrandDomainManager />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
