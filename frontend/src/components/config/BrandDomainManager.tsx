/**
 * Brand Domain Manager
 * Allows viewing and editing brand-domain mappings.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Plus, Trash2, Star, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { useMarketConfig } from '../../contexts/MarketConfigContext';
import { getBrands, getBrandDetails, updateBrandDomains } from '../../api/endpoints';
import type { Brand, BrandWithDomains } from '../../types';

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
      setBrands(data.items || []);
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
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Select Brand</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={loadBrands}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-1" />
              )}
              Refresh
            </Button>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search brands..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

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
              <p className="text-sm text-muted-foreground text-center py-4">No brands found</p>
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
              <p className="text-sm text-muted-foreground text-center py-2">
                +{filteredBrands.length - 50} more brands
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Domain Details */}
      <Card className="lg:col-span-2">
        <CardContent className="pt-6">
          {!selectedBrand ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Search className="w-12 h-12 mb-4 text-gray-300" />
              <p className="text-sm text-muted-foreground">Select a brand to view its domain mappings</p>
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
                  <h3 className="text-lg font-semibold">{brandDetails.brand_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {brandDetails.keyword_count} keywords · {brandDetails.total_volume?.toLocaleString()} volume
                  </p>
                </div>
                <Badge variant="secondary" className="bg-blue-50 text-blue-600 font-medium">
                  {brandDetails.domains?.length || 0} domains
                </Badge>
              </div>

              {/* Current Domains */}
              {brandDetails.domains && brandDetails.domains.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Domain</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Primary</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
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
                              <Badge variant="secondary" className="bg-yellow-50 text-yellow-600 font-medium">
                                <Star className="w-3 h-3 mr-1" />
                                Primary
                              </Badge>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSetPrimary(domain.domain)}
                                disabled={saving}
                              >
                                Set Primary
                              </Button>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveDomain(domain.domain)}
                              disabled={saving}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
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
                  <p className="text-sm text-muted-foreground">No domains mapped to this brand</p>
                </div>
              )}

              {/* Add New Domain Form */}
              <div className="border-t pt-6">
                <h4 className="font-semibold mb-4">Add New Domain</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Input
                    placeholder="Domain (e.g., example.com)"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                  />
                  <select
                    value={newDomainType}
                    onChange={(e) => setNewDomainType(e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm"
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
                    onClick={handleAddDomain}
                    disabled={!newDomain.trim() || !newDomainType || saving}
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <Plus className="w-4 h-4 mr-1" />
                    )}
                    Add Domain
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm text-muted-foreground">Failed to load brand details</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
