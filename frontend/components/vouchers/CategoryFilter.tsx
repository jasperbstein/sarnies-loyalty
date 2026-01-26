'use client';

import { Coffee, Utensils, ShoppingBag, Percent, LayoutGrid } from 'lucide-react';

export type VoucherCategory = 'all' | 'food' | 'drinks' | 'merchandise' | 'discounts';

interface CategoryFilterProps {
  selected: VoucherCategory;
  onChange: (category: VoucherCategory) => void;
  counts?: Record<VoucherCategory, number>;
}

const categories: { value: VoucherCategory; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All', icon: <LayoutGrid className="w-4 h-4" /> },
  { value: 'drinks', label: 'Drinks', icon: <Coffee className="w-4 h-4" /> },
  { value: 'food', label: 'Food', icon: <Utensils className="w-4 h-4" /> },
  { value: 'discounts', label: 'Discounts', icon: <Percent className="w-4 h-4" /> },
  { value: 'merchandise', label: 'Merch', icon: <ShoppingBag className="w-4 h-4" /> },
];

export default function CategoryFilter({ selected, onChange, counts }: CategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1 -mx-1 px-1">
      {categories.map(({ value, label, icon }) => {
        const isActive = selected === value;
        const count = counts?.[value];

        return (
          <button
            key={value}
            onClick={() => onChange(value)}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium
              whitespace-nowrap transition-all duration-200 flex-shrink-0
              ${isActive
                ? 'bg-black text-white shadow-sm'
                : 'bg-white text-black/60 hover:bg-black/5 border border-black/10'
              }
            `}
          >
            {icon}
            <span>{label}</span>
            {count !== undefined && count > 0 && (
              <span className={`
                text-xs px-1.5 py-0.5 rounded-full
                ${isActive ? 'bg-white/20 text-white' : 'bg-black/5 text-black/40'}
              `}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Helper function to map backend category to filter category
export function mapApiCategory(apiCategory: string | null): VoucherCategory {
  if (!apiCategory) return 'all';

  const normalized = apiCategory.toLowerCase();
  if (normalized === 'food') return 'food';
  if (normalized === 'drinks' || normalized === 'beverages' || normalized === 'coffee') return 'drinks';
  if (normalized === 'merchandise' || normalized === 'merch') return 'merchandise';
  if (normalized === 'discounts' || normalized === 'discount') return 'discounts';
  return 'all';
}
