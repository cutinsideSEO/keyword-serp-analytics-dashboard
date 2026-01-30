/**
 * Utility functions for parsing and working with modifier groups.
 * Modifier groups can contain one or two categories (comma-separated).
 * Two-category groups enable heatmap visualization.
 */

export interface ParsedModifierGroup {
  /** Whether this modifier group contains exactly two categories */
  isTwoCategory: boolean;
  /** The category names (1 or 2 items) */
  categories: string[];
}

/**
 * Parse a modifier group string to extract category information.
 *
 * Examples:
 * - "parts" → { isTwoCategory: false, categories: ["parts"] }
 * - "bicycle type, parts" → { isTwoCategory: true, categories: ["bicycle type", "parts"] }
 * - " bicycle type , wheels " → { isTwoCategory: true, categories: ["bicycle type", "wheels"] }
 */
export function parseModifierGroup(modifierGroup: string): ParsedModifierGroup {
  if (!modifierGroup) {
    return { isTwoCategory: false, categories: [] };
  }

  const parts = modifierGroup
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  return {
    isTwoCategory: parts.length === 2,
    categories: parts,
  };
}

/**
 * Check if a modifier group has two categories (supports heatmap).
 */
export function isTwoCategoryGroup(modifierGroup: string): boolean {
  return parseModifierGroup(modifierGroup).isTwoCategory;
}
