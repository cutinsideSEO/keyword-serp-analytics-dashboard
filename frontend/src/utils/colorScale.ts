/**
 * Color scale utilities for heatmap visualization.
 * Uses green gradient to indicate opportunity size (volume_uncaptured).
 */

export interface HeatmapColorResult {
  /** Tailwind background class */
  bg: string;
  /** Tailwind text class for contrast */
  text: string;
}

/**
 * Get heatmap cell colors based on value relative to max.
 * Higher values = darker green = more opportunity.
 *
 * @param value - The cell's volume_uncaptured
 * @param maxValue - The maximum volume_uncaptured across all cells
 * @returns Tailwind classes for background and text colors
 */
export function getHeatmapColor(value: number, maxValue: number): HeatmapColorResult {
  // Empty or zero cells
  if (!value || value === 0) {
    return { bg: 'bg-gray-50', text: 'text-gray-400' };
  }

  // Prevent division by zero
  if (!maxValue || maxValue === 0) {
    return { bg: 'bg-green-100', text: 'text-gray-700' };
  }

  const intensity = value / maxValue;

  // 5-level color scale
  if (intensity > 0.8) {
    return { bg: 'bg-green-600', text: 'text-white' };
  }
  if (intensity > 0.6) {
    return { bg: 'bg-green-500', text: 'text-white' };
  }
  if (intensity > 0.4) {
    return { bg: 'bg-green-400', text: 'text-gray-900' };
  }
  if (intensity > 0.2) {
    return { bg: 'bg-green-300', text: 'text-gray-900' };
  }
  return { bg: 'bg-green-100', text: 'text-gray-700' };
}

/**
 * Format volume for display in heatmap cells.
 * Keeps it compact: 1200 -> "1.2K", 1500000 -> "1.5M"
 */
export function formatHeatmapVolume(volume: number): string {
  if (volume >= 1_000_000) {
    return `${(volume / 1_000_000).toFixed(1)}M`;
  }
  if (volume >= 1_000) {
    return `${(volume / 1_000).toFixed(1)}K`;
  }
  return volume.toString();
}
