/**
 * Brand picker dropdown component.
 */

import { useState, useEffect, useMemo } from 'react';
import { SearchSelect, SearchSelectItem } from '@tremor/react';
import { getBrands } from '../../api/endpoints';
import type { Brand } from '../../types';
import { formatCompactNumber } from '../../utils/formatters';

interface BrandPickerProps {
  value: string | null;
  onChange: (brandName: string | null) => void;
  minKeywords?: number;
  minVolume?: number;
  placeholder?: string;
}

export function BrandPicker({
  value,
  onChange,
  minKeywords = 3,
  minVolume = 100,
  placeholder = 'Select a brand...',
}: BrandPickerProps) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBrands() {
      try {
        setLoading(true);
        const response = await getBrands(minKeywords, minVolume);
        setBrands(response.items);
        setError(null);
      } catch (err) {
        setError('Failed to load brands');
        console.error('Error loading brands:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchBrands();
  }, [minKeywords, minVolume]);

  const sortedBrands = useMemo(() => {
    return [...brands].sort((a, b) => b.total_volume - a.total_volume);
  }, [brands]);

  if (loading) {
    return (
      <div className="h-10 w-64 animate-pulse rounded-md bg-gray-200" />
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-600">{error}</div>
    );
  }

  return (
    <SearchSelect
      value={value || ''}
      onValueChange={(val) => onChange(val || null)}
      placeholder={placeholder}
      className="w-64"
    >
      {sortedBrands.map((brand) => (
        <SearchSelectItem key={brand.brand_name} value={brand.brand_name}>
          <span className="flex items-center justify-between gap-4">
            <span className="font-medium">{brand.brand_name}</span>
            <span className="text-xs text-gray-500">
              {formatCompactNumber(brand.total_volume)} vol
            </span>
          </span>
        </SearchSelectItem>
      ))}
    </SearchSelect>
  );
}

export default BrandPicker;
