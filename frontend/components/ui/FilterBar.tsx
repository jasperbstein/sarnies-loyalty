'use client';

import React from 'react';
import { SearchInput } from './SearchInput';
import { X } from 'lucide-react';

export interface FilterOption {
  label: string;
  value: string;
}

export interface ActiveFilter {
  key: string;
  label: string;
  value: string;
}

interface FilterBarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: {
    key: string;
    label: string;
    options: FilterOption[];
    value: string;
  }[];
  onFilterChange?: (key: string, value: string) => void;
  activeFilters?: ActiveFilter[];
  onClearFilter?: (key: string) => void;
  onClearAll?: () => void;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  onFilterChange,
  activeFilters = [],
  onClearFilter,
  onClearAll,
  className = '',
}) => {
  const hasActiveFilters = activeFilters.length > 0 || (searchValue && searchValue.length > 0);

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        {onSearchChange && (
          <div className="flex-1">
            <SearchInput
              value={searchValue || ''}
              onChange={onSearchChange}
              placeholder={searchPlaceholder}
            />
          </div>
        )}

        {/* Filter Dropdowns */}
        {filters.map((filter) => (
          <select
            key={filter.key}
            value={filter.value}
            onChange={(e) => onFilterChange?.(filter.key, e.target.value)}
            className="px-4 py-3 border border-gray-200 rounded-xl bg-white text-sm
              focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent
              transition-all duration-100 min-w-[160px] shadow-sm hover:shadow-md
              cursor-pointer"
          >
            <option value="">{filter.label}</option>
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ))}

        {/* Clear All Button */}
        {hasActiveFilters && onClearAll && (
          <button
            onClick={onClearAll}
            className="px-4 py-3 text-sm font-semibold text-gray-700 hover:text-gray-900
              border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-100
              whitespace-nowrap shadow-sm hover:shadow-md press-scale"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Active Filter Tags */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 animate-fade-in">
          {activeFilters.map((filter) => (
            <div
              key={filter.key}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-gray-100 to-gray-50
                text-gray-700 text-sm rounded-full border border-gray-200 shadow-sm"
            >
              <span className="font-semibold text-xs">{filter.label}:</span>
              <span className="text-xs">{filter.value}</span>
              {onClearFilter && (
                <button
                  onClick={() => onClearFilter(filter.key)}
                  className="ml-1 hover:text-gray-900 transition-all duration-100 p-0.5
                    hover:bg-gray-200 rounded-full press-scale"
                  aria-label={`Clear ${filter.label} filter`}
                >
                  <X className="w-3 h-3" strokeWidth={2.5} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
