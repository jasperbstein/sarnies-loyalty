'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { useAuthStore } from '@/lib/store';
import { vouchersAPI } from '@/lib/api';
import { ChevronDown, Search, X, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { PullToRefresh } from '@/components/PullToRefresh';
import { VouchersPageSkeleton } from '@/components/ui/SkeletonLoader';
import { useTabSwipeNavigation } from '@/hooks/useSwipeNavigation';
import { VoucherCard } from '@/components/ui/VoucherCard';

interface Voucher {
  id: number;
  title: string;
  description: string;
  image_url?: string;
  points_required: number;
  cash_value: number;
  voucher_type: 'free_item' | 'discount_amount' | 'percentage_discount' | 'merch';
  is_featured: boolean;
  is_staff_voucher?: boolean;
  target_user_types?: string[];
  expiry_type: string;
  expiry_days?: number;
  locations?: string;
  max_redemptions_per_user?: number;
  max_redemptions_per_user_per_day?: number;
  redeemed_today?: number;
  total_redemptions?: number;
}

type CategoryFilter = 'all' | 'drinks' | 'food' | 'discounts';

export default function VouchersPage() {
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [mounted, setMounted] = useState(false);

  const isEmployee = user?.user_type === 'employee';

  useTabSwipeNavigation();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && hasHydrated) {
      fetchVouchers();
    }
  }, [mounted, hasHydrated]);

  const fetchVouchers = async () => {
    try {
      const response = await vouchersAPI.getAll();
      setVouchers(response.data.vouchers);
    } catch (error) {
      console.error('Voucher fetch error:', error);
      if (user) {
        toast.error('Failed to load vouchers');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await fetchVouchers();
  };

  const filteredVouchers = useMemo(() => {
    if (!vouchers || !Array.isArray(vouchers)) return [];
    // Filter vouchers based on user type
    // - Employees see vouchers where target_user_types includes 'employee' OR is_staff_voucher is true
    // - Customers see vouchers where target_user_types includes 'customer' OR is_staff_voucher is false/undefined
    let filtered = [...vouchers].filter(v => {
      // Check target_user_types array if available (preferred method)
      if (v.target_user_types && Array.isArray(v.target_user_types) && v.target_user_types.length > 0) {
        return isEmployee
          ? v.target_user_types.includes('employee')
          : v.target_user_types.includes('customer');
      }
      // Fall back to is_staff_voucher boolean
      return isEmployee ? v.is_staff_voucher === true : v.is_staff_voucher !== true;
    });

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(v =>
        v.title.toLowerCase().includes(lowerQuery) ||
        v.description.toLowerCase().includes(lowerQuery)
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(v => {
        if (categoryFilter === 'drinks') return v.voucher_type === 'free_item' && v.title.toLowerCase().includes('coffee');
        if (categoryFilter === 'food') return v.voucher_type === 'free_item' && !v.title.toLowerCase().includes('coffee');
        if (categoryFilter === 'discounts') return v.voucher_type === 'discount_amount' || v.voucher_type === 'percentage_discount';
        return true;
      });
    }

    return filtered;
  }, [vouchers, searchQuery, categoryFilter, isEmployee]);

  const groups = useMemo(() => {
    // For employees, just show all perks without complex grouping
    if (isEmployee) {
      return {
        featured: filteredVouchers.filter(v => v.is_featured),
        perks: filteredVouchers.filter(v => !v.is_featured),
        drinks: [],
        discounts: [],
      };
    }

    // For customers, use the category grouping
    const featured = filteredVouchers.filter(v => v.is_featured);
    const featuredIds = new Set(featured.map(v => v.id));

    return {
      featured,
      perks: [],
      drinks: filteredVouchers.filter(v =>
        v.voucher_type === 'free_item' &&
        (v.title.toLowerCase().includes('coffee') || v.title.toLowerCase().includes('latte') || v.title.toLowerCase().includes('espresso') || v.title.toLowerCase().includes('brew')) &&
        !featuredIds.has(v.id)
      ),
      discounts: filteredVouchers.filter(v =>
        (v.voucher_type === 'discount_amount' || v.voucher_type === 'percentage_discount') &&
        !featuredIds.has(v.id)
      ),
    };
  }, [filteredVouchers, isEmployee]);

  // Render voucher card using unified component
  const renderVoucherCard = (voucher: Voucher) => (
    <VoucherCard
      key={voucher.id}
      id={voucher.id}
      title={voucher.title}
      description={voucher.description}
      imageUrl={voucher.image_url}
      voucherType={voucher.voucher_type}
      pointsRequired={voucher.points_required}
      isFeatured={voucher.is_featured}
      isEmployee={isEmployee}
      remainingToday={voucher.max_redemptions_per_user_per_day ? voucher.max_redemptions_per_user_per_day - (voucher.redeemed_today || 0) : undefined}
      maxPerDay={voucher.max_redemptions_per_user_per_day}
    />
  );

  if (!mounted || !hasHydrated || loading) {
    return (
      <AppLayout>
        <VouchersPageSkeleton />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="flex flex-col min-h-screen bg-[#FAFAF9]">
          {/* Header - 16px padding */}
          <div className="bg-[#FAFAF9] px-4 pt-4 pb-0">
            {/* Title Row */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-[20px] font-semibold text-[#1C1917]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                  {isEmployee ? 'Your Perks' : 'Vouchers'}
                </h1>
                {!isEmployee && (
                  <p className="text-[13px] text-[#D97706] flex items-center gap-1 mt-1" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                    <Star className="w-4 h-4 fill-current" />
                    {user?.points_balance || 0} points
                  </p>
                )}
                {isEmployee && (
                  <p className="text-[13px] text-[#78716C] mt-1" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                    Available employee benefits
                  </p>
                )}
              </div>

              {/* Sort Button */}
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="flex items-center gap-1 px-3 py-2 rounded-xl border border-[#E7E5E4] text-[13px] text-[#57534E] bg-white"
                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
              >
                Sort
                <ChevronDown className={`w-4 h-4 transition-transform ${showSortMenu ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A8A29E]" />
              <input
                type="text"
                placeholder="Search vouchers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-10 pr-10 bg-white border border-[#E7E5E4] rounded-xl text-[14px] focus:outline-none focus:border-[#1C1917] transition-colors"
                style={{ fontFamily: 'Instrument Sans, sans-serif' }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8A29E]"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Category Tabs */}
            <div className="flex gap-2 mt-4 pb-4 overflow-x-auto">
              {(['all', 'drinks', 'food', 'discounts'] as CategoryFilter[]).map((category) => (
                <button
                  key={category}
                  onClick={() => setCategoryFilter(category)}
                  className={`px-4 py-2 rounded-xl text-[13px] font-medium transition-colors whitespace-nowrap ${
                    categoryFilter === category
                      ? 'bg-[#1C1917] text-white'
                      : 'bg-white text-[#57534E] border border-[#E7E5E4]'
                  }`}
                  style={{ fontFamily: 'Instrument Sans, sans-serif' }}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Content - 24px section gaps */}
          <div className="flex-1 px-4 pb-24 space-y-6">
            {/* Featured Section */}
            {groups.featured.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-[#78716C] tracking-[1px] mb-3 uppercase" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                  Featured
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {groups.featured.map(renderVoucherCard)}
                </div>
              </div>
            )}

            {/* Employee Perks Section */}
            {groups.perks.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-[#78716C] tracking-[1px] mb-3 uppercase" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                  Your Benefits
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {groups.perks.map(renderVoucherCard)}
                </div>
              </div>
            )}

            {/* Drinks Section */}
            {groups.drinks.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-[#78716C] tracking-[1px] mb-3 uppercase" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                  Drinks & Coffee
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {groups.drinks.map(renderVoucherCard)}
                </div>
              </div>
            )}

            {/* Discounts Section */}
            {groups.discounts.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-[#78716C] tracking-[1px] mb-3 uppercase" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                  Discounts & Deals
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {groups.discounts.map(renderVoucherCard)}
                </div>
              </div>
            )}

            {/* Empty State */}
            {filteredVouchers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-xl bg-[#F5F5F4] flex items-center justify-center mb-4">
                  <span className="text-[28px]">🎫</span>
                </div>
                <h3 className="text-[15px] font-semibold text-[#1C1917] mb-1" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                  No vouchers found
                </h3>
                <p className="text-[13px] text-[#78716C]" style={{ fontFamily: 'Instrument Sans, sans-serif' }}>
                  Try adjusting your search or filters
                </p>
              </div>
            )}
          </div>
        </div>
      </PullToRefresh>
    </AppLayout>
  );
}
