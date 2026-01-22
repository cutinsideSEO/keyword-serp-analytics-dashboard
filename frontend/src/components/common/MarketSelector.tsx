/**
 * Market Selector Component
 *
 * Dropdown to select the current market.
 * Persists selection to localStorage and triggers config reload.
 */

import { Select, SelectItem } from '@tremor/react';
import { Globe } from 'lucide-react';
import { useMarketConfig } from '../../contexts/MarketConfigContext';

export function MarketSelector() {
  const { currentMarketId, availableMarkets, setCurrentMarket, isLoading } = useMarketConfig();

  if (availableMarkets.length === 0) {
    return null;
  }

  // Don't show selector if only one market
  if (availableMarkets.length === 1) {
    return (
      <div className="px-3 py-2 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4" />
          <span>{availableMarkets[0].name}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 py-2">
      <label className="block text-xs font-medium text-gray-500 mb-1">Market</label>
      <Select
        value={currentMarketId}
        onValueChange={setCurrentMarket}
        disabled={isLoading}
        icon={Globe}
      >
        {availableMarkets.map((market) => (
          <SelectItem key={market.id} value={market.id}>
            {market.name}
          </SelectItem>
        ))}
      </Select>
    </div>
  );
}

export default MarketSelector;
