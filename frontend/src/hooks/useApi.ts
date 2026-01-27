/**
 * Custom hooks for API data fetching.
 * Powered by TanStack Query for caching, deduplication, and automatic cancellation.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

function getMarketId(): string {
  return localStorage.getItem('selectedMarketId') || 'insurance_il';
}

/**
 * Generic hook for fetching data from the API.
 */
export function useApi<T>(
  fetchFn: () => Promise<T>,
  dependencies: unknown[] = []
): UseApiResult<T> {
  const queryClient = useQueryClient();
  const marketId = getMarketId();

  const { data, isLoading, error } = useQuery<T, Error>({
    queryKey: ['api', marketId, ...dependencies],
    queryFn: fetchFn,
  });

  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['api', marketId, ...dependencies] });
  }, [queryClient, marketId, ...dependencies]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    data: data ?? null,
    loading: isLoading,
    error: error ?? null,
    refetch,
  };
}

/**
 * Hook for fetching data with a parameter that might be null.
 */
export function useApiWithParam<T, P>(
  fetchFn: (param: P) => Promise<T>,
  param: P | null,
  dependencies: unknown[] = []
): UseApiResult<T> {
  const queryClient = useQueryClient();
  const marketId = getMarketId();

  const { data, isLoading, error } = useQuery<T, Error>({
    queryKey: ['api', marketId, param, ...dependencies],
    queryFn: () => fetchFn(param as P),
    enabled: param !== null,
  });

  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['api', marketId, param, ...dependencies] });
  }, [queryClient, marketId, param, ...dependencies]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    data: data ?? null,
    loading: param !== null && isLoading,
    error: error ?? null,
    refetch,
  };
}
