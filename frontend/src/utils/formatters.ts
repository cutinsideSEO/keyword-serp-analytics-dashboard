/**
 * Utility functions for formatting data.
 */

/**
 * Format a number with commas as thousands separators.
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Format a number as a compact string (e.g., 1.2K, 3.4M).
 */
export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
  }).format(value);
}

/**
 * Format a percentage value.
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a domain for display (remove common prefixes).
 */
export function formatDomain(domain: string): string {
  return domain.replace(/^www\./, '');
}

/**
 * Truncate a string to a maximum length.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 3)}...`;
}

/**
 * Get a color class based on win/loss status.
 */
export function getStatusColor(isWin: boolean): string {
  return isWin ? 'text-emerald-600' : 'text-red-600';
}

/**
 * Get a background color class based on position.
 */
export function getPositionColor(position: number): string {
  if (position === 1) return 'bg-emerald-100 text-emerald-800';
  if (position <= 3) return 'bg-yellow-100 text-yellow-800';
  if (position <= 10) return 'bg-blue-100 text-blue-800';
  return 'bg-gray-100 text-gray-800';
}

/**
 * Format position with ordinal suffix.
 */
export function formatPosition(position: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = position % 100;
  return position + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}
