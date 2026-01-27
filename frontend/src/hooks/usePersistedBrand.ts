/**
 * Hook that persists the selected brand across page navigation.
 * Scoped per market — switching markets reads that market's stored brand.
 */

import { useState, useEffect, useCallback } from 'react';
import { useMarketConfig } from '../contexts/MarketConfigContext';

const STORAGE_PREFIX = 'selectedBrand_';

export function usePersistedBrand(): [string | null, (brand: string | null) => void] {
  const { currentMarketId } = useMarketConfig();
  const storageKey = `${STORAGE_PREFIX}${currentMarketId}`;

  const [brand, setBrandState] = useState<string | null>(() => {
    return localStorage.getItem(storageKey);
  });

  const setBrand = useCallback((newBrand: string | null) => {
    setBrandState(newBrand);
    if (newBrand) {
      localStorage.setItem(storageKey, newBrand);
    } else {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  // When market changes, read the stored brand for that market
  useEffect(() => {
    setBrandState(localStorage.getItem(storageKey));
  }, [storageKey]);

  return [brand, setBrand];
}
