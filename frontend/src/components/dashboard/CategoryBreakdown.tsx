/**
 * Category breakdown with expandable values.
 */

import { useState } from 'react';
import { Card, Title, Text, Flex, Bold, Badge } from '@tremor/react';
import { ChevronRightIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import type { CategoryLossStats, CategoryValueLossStats } from '../../types';
import { formatNumber, formatPercent } from '../../utils/formatters';
import { getCategoryValueLosses } from '../../api/endpoints';
import { InfoTooltip } from '../common/InfoTooltip';

interface CategoryBreakdownProps {
  categories: CategoryLossStats[];
  brandName: string;
}

export function CategoryBreakdown({ categories, brandName }: CategoryBreakdownProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [categoryValues, setCategoryValues] = useState<Record<string, CategoryValueLossStats[]>>({});
  const [loadingCategories, setLoadingCategories] = useState<Set<string>>(new Set());

  const toggleCategory = async (categoryName: string) => {
    const isExpanded = expandedCategories.has(categoryName);
    const newExpanded = new Set(expandedCategories);

    if (isExpanded) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);

      // Load values if not already loaded
      if (!categoryValues[categoryName]) {
        setLoadingCategories(new Set([...loadingCategories, categoryName]));
        try {
          const values = await getCategoryValueLosses(brandName, categoryName);
          setCategoryValues({ ...categoryValues, [categoryName]: values });
        } catch (error) {
          console.error(`Failed to load values for ${categoryName}:`, error);
        } finally {
          const newLoading = new Set(loadingCategories);
          newLoading.delete(categoryName);
          setLoadingCategories(newLoading);
        }
      }
    }

    setExpandedCategories(newExpanded);
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-md hover:shadow-xl transition-all duration-300">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-1 flex items-center">
          Losses by Category
          <InfoTooltip
            title="Losses by Category"
            description="Keywords are tagged with categories (bicycle type, model, price range, etc.). This shows which categories have the most losses and their specific values. Click any category to see the breakdown by value."
            calculation="For each category: Sum the search volume of lost keywords (where competitors rank #1). Within each category, values are ranked by their contribution to losses."
          />
        </h3>
        <p className="text-sm text-gray-600">
          Click to expand and see top values within each category
        </p>
      </div>

      <div className="mt-6">

        <div className="space-y-2">
          {categories.slice(0, 15).map((category) => {
            const isExpanded = expandedCategories.has(category.category);
            const isLoading = loadingCategories.has(category.category);
            const values = categoryValues[category.category] || [];

            return (
              <div key={category.category} className="space-y-2">
                {/* Category Row */}
                <button
                  onClick={() => toggleCategory(category.category)}
                  className="w-full text-left hover:bg-gray-50 rounded-xl p-4 transition-all group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-white transition-transform group-hover:scale-110">
                          {isExpanded ? (
                            <ChevronDownIcon className="h-4 w-4" />
                          ) : (
                            <ChevronRightIcon className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <span className="font-semibold text-gray-900">{category.display_name}</span>
                          <span className="ml-2 text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                            {category.loss_count}
                          </span>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-amber-600">
                        {formatNumber(category.loss_volume)} vol
                      </span>
                    </div>

                    {/* Example Keywords */}
                    {category.example_keywords && category.example_keywords.length > 0 && (
                      <div className="ml-11 flex flex-wrap gap-1.5">
                        {category.example_keywords.map((kw, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200 keyword-tag"
                            dir="auto"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="ml-11">
                    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="absolute left-0 top-0 h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, category.percentage_of_losses * 2)}%`,
                          background: 'linear-gradient(90deg, #F59E0B 0%, #D97706 100%)',
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 mt-1 inline-block">
                      {formatPercent(category.percentage_of_losses)} of losses
                    </span>
                  </div>
                </button>

                {/* Expanded Values */}
                {isExpanded && (
                  <div className="ml-8 mr-2 space-y-2 pb-2">
                    {isLoading && (
                      <Text className="text-sm text-gray-500 italic">Loading values...</Text>
                    )}

                    {!isLoading && values.length === 0 && (
                      <Text className="text-sm text-gray-500 italic">No values found</Text>
                    )}

                    {!isLoading && values.map((value) => (
                      <div key={value.value} className="p-3 rounded-lg bg-gray-50 border border-gray-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-800">{value.value}</span>
                          <span className="text-sm font-bold text-amber-600">
                            {formatNumber(value.loss_volume)} vol
                          </span>
                        </div>
                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200">
                          <div
                            className="absolute left-0 top-0 h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, value.percentage_of_category * 2)}%`,
                              background: 'linear-gradient(90deg, #FCD34D 0%, #F59E0B 100%)',
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">
                            {value.loss_count} {value.loss_count === 1 ? 'keyword' : 'keywords'}
                          </span>
                          <span className="font-medium text-amber-600">
                            {formatPercent(value.percentage_of_category)} of category
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {categories.length > 15 && (
        <p className="mt-6 text-center text-sm text-gray-500 font-medium">
          Showing top 15 of {categories.length} categories
        </p>
      )}
    </div>
  );
}

export default CategoryBreakdown;
