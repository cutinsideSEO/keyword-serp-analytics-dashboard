/**
 * Domain Types Configuration
 *
 * Provides centralized configuration for domain types styling and display.
 * This config is loaded from the backend API at runtime.
 */

import {
  Building2,
  Scale,
  ShoppingCart,
  MessageCircle,
  Newspaper,
  HelpCircle,
  LucideIcon,
} from 'lucide-react';

export interface DomainTypeConfig {
  id: string;
  displayName: string;
  tremorColor: string;
  hexColor: string;
  gradient: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  icon: string;
}

export interface MarketConfig {
  marketId: string;
  marketName: string;
  industryContext: string;
  language: string;
  textDirection: string;
  domainTypes: DomainTypeConfig[];
}

// Icon mapping from string names to Lucide components
const iconMap: Record<string, LucideIcon> = {
  Building2,
  Scale,
  ShoppingCart,
  MessageCircle,
  Newspaper,
};

/**
 * Get the Lucide icon component for a domain type
 */
export function getDomainTypeIcon(iconName: string): LucideIcon {
  return iconMap[iconName] || HelpCircle;
}

/**
 * Get styling configuration for a domain type by name
 */
export function getDomainTypeStyles(
  domainTypes: DomainTypeConfig[],
  typeName: string
): DomainTypeConfig | undefined {
  return domainTypes.find(
    (dt) => dt.displayName === typeName || dt.id === typeName
  );
}

/**
 * Get all domain type names
 */
export function getDomainTypeNames(domainTypes: DomainTypeConfig[]): string[] {
  return domainTypes.map((dt) => dt.displayName);
}

/**
 * Build color mapping for charts (domain type name -> tremor color)
 */
export function buildTremorColorMap(
  domainTypes: DomainTypeConfig[]
): Record<string, string> {
  const map: Record<string, string> = {};
  domainTypes.forEach((dt) => {
    map[dt.displayName] = dt.tremorColor;
  });
  // Add fallback for unknown types
  map['Unknown'] = 'gray';
  return map;
}

/**
 * Build color mapping for charts (domain type name -> hex color)
 */
export function buildHexColorMap(
  domainTypes: DomainTypeConfig[]
): Record<string, string> {
  const map: Record<string, string> = {};
  domainTypes.forEach((dt) => {
    map[dt.displayName] = dt.hexColor;
  });
  // Add fallback
  map['Unknown'] = '#6B7280';
  return map;
}

/**
 * Build gradient mapping for charts (domain type name -> CSS gradient)
 */
export function buildGradientMap(
  domainTypes: DomainTypeConfig[]
): Record<string, string> {
  const map: Record<string, string> = {};
  domainTypes.forEach((dt) => {
    map[dt.displayName] = dt.gradient;
  });
  // Add fallback
  map['Unknown'] = 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)';
  return map;
}

/**
 * Build full styles mapping (domain type name -> all style properties)
 */
export function buildStylesMap(
  domainTypes: DomainTypeConfig[]
): Record<string, { gradient: string; bgColor: string; textColor: string; borderColor: string; icon: LucideIcon }> {
  const map: Record<string, { gradient: string; bgColor: string; textColor: string; borderColor: string; icon: LucideIcon }> = {};
  domainTypes.forEach((dt) => {
    map[dt.displayName] = {
      gradient: dt.gradient,
      bgColor: dt.bgClass,
      textColor: dt.textClass,
      borderColor: dt.borderClass,
      icon: getDomainTypeIcon(dt.icon),
    };
  });
  // Add fallback
  map['Unknown'] = {
    gradient: 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-200',
    icon: HelpCircle,
  };
  return map;
}

// Default fallback config (used if API fails)
export const DEFAULT_DOMAIN_TYPES: DomainTypeConfig[] = [
  {
    id: 'insurance_company',
    displayName: 'Insurance Company',
    tremorColor: 'blue',
    hexColor: '#3B82F6',
    gradient: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-700',
    borderClass: 'border-blue-200',
    icon: 'Building2',
  },
  {
    id: 'comparison_site',
    displayName: 'Comparison Site',
    tremorColor: 'purple',
    hexColor: '#8B5CF6',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
    bgClass: 'bg-purple-50',
    textClass: 'text-purple-700',
    borderClass: 'border-purple-200',
    icon: 'Scale',
  },
  {
    id: 'ugc',
    displayName: 'UGC',
    tremorColor: 'amber',
    hexColor: '#F59E0B',
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    borderClass: 'border-amber-200',
    icon: 'MessageCircle',
  },
  {
    id: 'third_party',
    displayName: '3rd Party',
    tremorColor: 'teal',
    hexColor: '#14B8A6',
    gradient: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
    bgClass: 'bg-teal-50',
    textClass: 'text-teal-700',
    borderClass: 'border-teal-200',
    icon: 'Newspaper',
  },
];

export const DEFAULT_MARKET_CONFIG: MarketConfig = {
  marketId: 'insurance_il',
  marketName: 'Israeli Insurance Market',
  industryContext: 'insurance industry in Israel',
  language: 'he',
  textDirection: 'rtl',
  domainTypes: DEFAULT_DOMAIN_TYPES,
};
