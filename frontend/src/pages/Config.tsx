/**
 * Configuration Page
 *
 * Displays market configuration, domain types, and brand-domain mappings.
 * Market config and domain types are read-only (configured via code).
 * Brand-domain mappings can be edited.
 */

import { useState } from 'react';
import { Title, Text, TabGroup, TabList, Tab, TabPanels, TabPanel } from '@tremor/react';
import { Settings, Palette, Link2 } from 'lucide-react';
import { MarketConfigCard } from '../components/config/MarketConfigCard';
import { DomainTypesTable } from '../components/config/DomainTypesTable';
import { BrandDomainManager } from '../components/config/BrandDomainManager';

export function Config() {
  const [tabIndex, setTabIndex] = useState(0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-700 to-slate-500 mb-2">
            Configuration
          </h1>
          <p className="text-gray-600 text-lg">
            View market settings and manage brand-domain mappings
          </p>
        </div>
        <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-2xl shadow-lg border border-slate-200 p-6">
          <div className="flex items-center space-x-3">
            <Settings className="h-8 w-8 text-slate-600" />
            <div>
              <div className="text-sm text-gray-600">System Config</div>
              <div className="text-xl font-bold text-slate-700">Settings</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <TabGroup index={tabIndex} onIndexChange={setTabIndex}>
        <TabList className="mt-4">
          <Tab icon={Settings}>Market Config</Tab>
          <Tab icon={Palette}>Domain Types</Tab>
          <Tab icon={Link2}>Brand Domains</Tab>
        </TabList>

        <TabPanels>
          {/* Market Configuration Tab */}
          <TabPanel>
            <div className="mt-6">
              <Title>Market Configuration</Title>
              <Text className="text-gray-600 mb-6">
                Current market settings (configured in backend)
              </Text>
              <MarketConfigCard />
            </div>
          </TabPanel>

          {/* Domain Types Tab */}
          <TabPanel>
            <div className="mt-6">
              <Title>Domain Types</Title>
              <Text className="text-gray-600 mb-6">
                Domain classifications used in this market
              </Text>
              <DomainTypesTable />
            </div>
          </TabPanel>

          {/* Brand Domain Mappings Tab */}
          <TabPanel>
            <div className="mt-6">
              <Title>Brand-Domain Mappings</Title>
              <Text className="text-gray-600 mb-6">
                Manage which domains are associated with each brand
              </Text>
              <BrandDomainManager />
            </div>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </div>
  );
}
