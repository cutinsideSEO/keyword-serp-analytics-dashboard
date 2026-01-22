/**
 * Brand Domain Manager
 * Allows viewing and editing brand-domain mappings.
 */

import { useState, useEffect } from 'react';
import { Card, Text, TextInput, Button, Badge, Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from '@tremor/react';
import { Search, Plus, Trash2, Star, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { useMarketConfig } from '../../contexts/MarketConfigContext';
import { getBrands, getBrandDetails, updateBrandDomains } from '../../api/endpoints';
import type { Brand, BrandWithDomains, BrandDomain } from '../../types';

export function BrandDomainManager() {
  const { getStyles, getIcon, marketConfig } = useMarketConfig();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [brandDetails, setBrandDetails] = useState<BrandWithDomains | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New domain form
  const [newDomain, setNewDomain] = useState('');
  const [newDomainType, setNewDomainType] = useState('');
  const [newDomainPrimary, setNewDomainPrimary] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load brands on mount
  useEffect(() => {
    loadBrands();
  }, []);

  // Load brand details when selected
  useEffect(() => {
    if (selectedBrand) {
      loadBrandDetails(selectedBrand);
    }
  }, [selectedBrand]);

  const loadBrands = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getBrands();
      setBrands(data.brands || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load brands');
    } finally {
      setLoading(false);
    }
  };

  const loadBrandDetails = async (brandName: string) => {
    try {
      setDetailsLoading(true);
      const data = await getBrandDetails(brandName);
      setBrandDetails(data);
    } catch (err) {
      console.error('Failed to load brand details:', err);
      setBrandDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleAddDomain = async () => {
    if (!selectedBrand || !newDomain.trim() || !newDomainType) return;

    try {
      setSaving(true);
      const existingDomains = brandDetails?.domains || [];
      const newDomains = [
        ...existingDomains.map(d => ({
          domain: d.domain,
          is_primary: d.is_primary,
          domain_type: d.domain_type,
        })),
        {
          domain: newDomain.trim(),
          is_primary: newDomainPrimary,
          domain_type: newDomainType,
        },
      ];

      await updateBrandDomains(selectedBrand, newDomains);
      await loadBrandDetails(selectedBrand);

      // Reset form
      setNewDomain('');
      setNewDomainType('');
      setNewDomainPrimary(false);
    } catch (err) {
      console.error('Failed to add domain:', err);
      setError('Failed to add domain');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveDomain = async (domainToRemove: string) => {
    if (!selectedBrand || !brandDetails) return;

    try {
      setSaving(true);
      const newDomains = brandDetails.domains
        .filter(d => d.domain !== domainToRemove)
        .map(d => ({
          domain: d.domain,
          is_primary: d.is_primary,
          domain_type: d.domain_type,
        }));

      await updateBrandDomains(selectedBrand, newDomains);
      await loadBrandDetails(selectedBrand);
    } catch (err) {
      console.error('Failed to remove domain:', err);
      setError('Failed to remove domain');
    } finally {
      setSaving(false);
    }
  };

  const handleSetPrimary = async (domainToSetPrimary: string) => {
    if (!selectedBrand || !brandDetails) return;

    try {
      setSaving(true);
      const newDomains = brandDetails.domains.map(d => ({
        domain: d.domain,
        is_primary: d.domain === domainToSetPrimary,
        domain_type: d.domain_type,
      }));

      await updateBrandDomains(selectedBrand, newDomains);
      await loadBrandDetails(selectedBrand);
    } catch (err) {
      console.error('Failed to set primary domain:', err);
      setError('Failed to set primary domain');
    } finally {
      setSaving(false);
    }
  };

  // Filter brands by search term
  const filteredBrands = brands.filter(b =>
    b.brand_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Brand List */}
      <Card className="lg:col-span-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Select Brand</h3>
          <Button
            size="xs"
            variant="secondary"
            icon={RefreshCw}
            onClick={loadBrands}
            loading={loading}
          >
            Refresh
          </Button>
        </div>

        <TextInput
          placeholder="Search brands..."
          icon={Search}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-4"
        />

        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm mb-4">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="space-y-1 max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : filteredBrands.length === 0 ? (
            <Text className="text-gray-500 text-center py-4">No brands found</Text>
          ) : (
            filteredBrands.slice(0, 50).map((brand) => (
              <button
                key={brand.brand_name}
                onClick={() => setSelectedBrand(brand.brand_name)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  selectedBrand === brand.brand_name
                    ? 'bg-blue-100 text-blue-700'
                    : 'hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate">{brand.brand_name}</span>
                  <span className="text-xs text-gray-500">{brand.keyword_count} kw</span>
                </div>
              </button>
            ))
          )}
          {filteredBrands.length > 50 && (
            <Text className="text-gray-500 text-center text-sm py-2">
              +{filteredBrands.length - 50} more brands
            </Text>
          )}
        </div>
      </Card>

      {/* Domain Details */}
      <Card className="lg:col-span-2">
        {!selectedBrand ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Search className="w-12 h-12 mb-4 text-gray-300" />
            <Text>Select a brand to view its domain mappings</Text>
          </div>
        ) : detailsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : brandDetails ? (
          <div className="space-y-6">
            {/* Brand Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">{brandDetails.brand_name}</h3>
                <Text className="text-gray-500">
                  {brandDetails.keyword_count} keywords · {brandDetails.total_volume?.toLocaleString()} volume
                </Text>
              </div>
              <Badge color="blue" size="lg">
                {brandDetails.domains?.length || 0} domains
              </Badge>
            </div>

            {/* Current Domains */}
            {brandDetails.domains && brandDetails.domains.length > 0 ? (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Domain</TableHeaderCell>
                    <TableHeaderCell>Type</TableHeaderCell>
                    <TableHeaderCell>Primary</TableHeaderCell>
                    <TableHeaderCell>Actions</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {brandDetails.domains.map((domain) => {
                    const styles = getStyles(domain.domain_type || 'Unknown');
                    const Icon = getIcon(domain.domain_type || 'Unknown');

                    return (
                      <TableRow key={domain.domain}>
                        <TableCell>
                          <span className="font-medium">{domain.domain}</span>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${styles.bgColor} ${styles.textColor}`}>
                            <Icon className="w-3 h-3" />
                            {domain.domain_type || 'Unknown'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {domain.is_primary ? (
                            <Badge color="yellow" icon={Star}>Primary</Badge>
                          ) : (
                            <Button
                              size="xs"
                              variant="secondary"
                              onClick={() => handleSetPrimary(domain.domain)}
                              disabled={saving}
                            >
                              Set Primary
                            </Button>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="xs"
                            variant="secondary"
                            color="red"
                            icon={Trash2}
                            onClick={() => handleRemoveDomain(domain.domain)}
                            disabled={saving}
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Text className="text-gray-500">No domains mapped to this brand</Text>
              </div>
            )}

            {/* Add New Domain Form */}
            <div className="border-t pt-6">
              <h4 className="font-semibold mb-4">Add New Domain</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <TextInput
                  placeholder="Domain (e.g., example.com)"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                />
                <select
                  value={newDomainType}
                  onChange={(e) => setNewDomainType(e.target.value)}
                  className="tremor-TextInput-root rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="">Select Type</option>
                  {marketConfig?.domain_types?.map((dt) => (
                    <option key={dt.id} value={dt.display_name}>
                      {dt.display_name}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newDomainPrimary}
                    onChange={(e) => setNewDomainPrimary(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Primary Domain</span>
                </label>
                <Button
                  icon={Plus}
                  onClick={handleAddDomain}
                  disabled={!newDomain.trim() || !newDomainType || saving}
                  loading={saving}
                >
                  Add Domain
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <Text>Failed to load brand details</Text>
          </div>
        )}
      </Card>
    </div>
  );
}
