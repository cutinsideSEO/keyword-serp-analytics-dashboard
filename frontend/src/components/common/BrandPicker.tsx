/**
 * Brand picker dropdown component.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Combobox } from '@/components/ui/combobox';
import { getBrands } from '../../api/endpoints';
import { formatCompactNumber } from '../../utils/formatters';
import { useMarketConfig } from '../../contexts/MarketConfigContext';

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
  const { currentMarketId } = useMarketConfig();

  const { data, isLoading: loading, error } = useQuery({
    queryKey: ['brands', currentMarketId, minKeywords, minVolume],
    queryFn: () => getBrands(minKeywords, minVolume),
  });

  const brands = data?.items ?? [];

  const sortedBrands = useMemo(() => {
    return [...brands].sort((a, b) => b.total_volume - a.total_volume);
  }, [brands]);

  const options = useMemo(() => {
    return sortedBrands.map((brand) => ({
      value: brand.brand_name,
      label: `${brand.brand_name} (${formatCompactNumber(brand.total_volume)} vol)`,
    }));
  }, [sortedBrands]);

  if (loading) {
    return (
      <div className="h-10 w-64 animate-pulse rounded-md bg-gray-200" />
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-600">Failed to load brands</div>
    );
  }

  return (
    <Combobox
      options={options}
      value={value || ''}
      onValueChange={(val) => onChange(val || null)}
      placeholder={placeholder}
      searchPlaceholder="Search brands..."
      emptyText="No brands found."
    />
  );
}

export default BrandPicker;
