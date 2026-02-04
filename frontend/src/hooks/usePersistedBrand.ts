/**
 * Hook that persists the selected brand across page navigation.
 * Scoped per market — switching markets reads that market's stored brand.
 *
 * IMPORTANT: Uses synchronous state reset pattern to avoid race conditions.
 * When market changes, brand state must be updated BEFORE render completes,
 * not in useEffect (which runs after render). Otherwise, stale brand values
 * cause API calls with mismatched brand/market, returning zeros that get cached.
 */

import { useState, useCallback } from 'react';
import { useMarketConfig } from '../contexts/MarketConfigContext';

const STORAGE_PREFIX = 'selectedBrand_';

export function usePersistedBrand(): [string | null, (brand: string | null) => void] {
  const { currentMarketId } = useMarketConfig();
  const storageKey = `${STORAGE_PREFIX}${currentMarketId}`;

  const [brand, setBrandState] = useState<string | null>(() => {
    return localStorage.getItem(storageKey);
  });

  // Track the storageKey we last synced with.
  // When it changes (market switch), reset brand state SYNCHRONOUSLY during render.
  // This prevents the race condition where useEffect runs AFTER render,
  // causing one render cycle with stale brand + new market = API returns zeros.
  const [prevStorageKey, setPrevStorageKey] = useState(storageKey);
  if (storageKey !== prevStorageKey) {
    setPrevStorageKey(storageKey);
    // Read brand for new market immediately, before this render completes
    setBrandState(localStorage.getItem(storageKey));
  }

  const setBrand = useCallback((newBrand: string | null) => {
    setBrandState(newBrand);
    if (newBrand) {
      localStorage.setItem(storageKey, newBrand);
    } else {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  return [brand, setBrand];
}
