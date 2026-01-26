'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import RewardCard from '@/components/RewardCard';
import { useAuthStore } from '@/lib/store';
import { vouchersAPI } from '@/lib/api';
import { ChevronDown, Search, X, Coffee, Utensils, Cake, Percent, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { PullToRefresh } from '@/components/PullToRefresh';
import { useTabSwipeNavigation } from '@/hooks/useSwipeNavigation';

interface Voucher {
  id: number;
  title: string;
  description: string;
  image_url?: string;
  points_required: number;
  cash_value: number;
  voucher_type: 'free_item' | 'discount_amount' | 'percentage_discount' | 'merch';
  is_featured: boolean;
  is_staff_voucher: boolean;
  expiry_type: string;
  expiry_days?: number;
  locations?: string;
  max_redemptions_per_user?: number;
  max_redemptions_per_user_per_day?: number;
  redeemed_today?: number;
  total_redemptions?: number;
}

// Voucher icon mapping based on title/type
const getVoucherIcon = (voucher: Voucher) => {
  const title = voucher.title.toLowerCase();
  if (title.includes('coffee')) return Coffee;
  if (title.includes('meal') || title.includes('food')) return Utensils;
  if (title.includes('birthday') || title.includes('cake')) return Cake;
  if (title.includes('discount') || title.includes('friends') || title.includes('family') || voucher.voucher_type === 'percentage_discount') return Percent;
  return Coffee; // Default
};

type SortOption = 'featured' | 'low_points' | 'high_points';
type CategoryFilter = 'all' | 'drinks' | 'food' | 'discount' | 'merch';

export default function RewardsPage() {
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Enable swipe navigation between tabs
  useTabSwipeNavigation();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Fetch vouchers even without auth (browsing mode)
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
      // Don't show error toast if not authenticated (will redirect anyway)
      if (user) {
        toast.error('Failed to load rewards');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await fetchVouchers();
  };

  const getSortedVouchers = useMemo(() => {
    if (!vouchers || !Array.isArray(vouchers)) return [];
    let filtered = [...vouchers];

    // Filter out staff-only vouchers for customers
    filtered = filtered.filter(v => !v.is_staff_voucher);

    // Filter by search
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(v =>
        v.title.toLowerCase().includes(lowerQuery) ||
        v.description.toLowerCase().includes(lowerQuery)
      );
    }

    // Filter by category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(v => {
        if (categoryFilter === 'drinks') return v.voucher_type === 'free_item' && v.title.toLowerCase().includes('coffee');
        if (categoryFilter === 'food') return v.voucher_type === 'free_item' && !v.title.toLowerCase().includes('coffee');
        if (categoryFilter === 'discount') return v.voucher_type === 'discount_amount' || v.voucher_type === 'percentage_discount';
        if (categoryFilter === 'merch') return v.voucher_type === 'merch';
        return true;
      });
    }

    // Sort
    if (sortBy === 'featured') {
      filtered.sort((a, b) => {
        if (a.is_featured && !b.is_featured) return -1;
        if (!a.is_featured && b.is_featured) return 1;
        return a.points_required - b.points_required;
      });
    } else if (sortBy === 'low_points') {
      filtered.sort((a, b) => a.points_required - b.points_required);
    } else if (sortBy === 'high_points') {
      filtered.sort((a, b) => b.points_required - a.points_required);
    }

    return filtered;
  }, [vouchers, searchQuery, categoryFilter, sortBy]);

  const groups = useMemo(() => {
    const featured = getSortedVouchers.filter(v => v.is_featured && !v.is_staff_voucher);
    const featuredIds = new Set(featured.map(v => v.id));

    return {
      featured,
      // Exclude featured items from other categories to prevent duplication
      drinks: getSortedVouchers.filter(v => v.voucher_type === 'free_item' && !v.is_staff_voucher && !featuredIds.has(v.id)),
      discounts: getSortedVouchers.filter(v => (v.voucher_type === 'discount_amount' || v.voucher_type === 'percentage_discount') && !v.is_staff_voucher && !featuredIds.has(v.id)),
      merch: getSortedVouchers.filter(v => v.voucher_type === 'merch' && !v.is_staff_voucher && !featuredIds.has(v.id)),
      // Only show staff rewards if user is staff
      staff: user?.role === 'staff' ? getSortedVouchers.filter(v => v.is_staff_voucher) : []
    };
  }, [getSortedVouchers, user?.role]);

  // Employee voucher card component
  const EmployeeVoucherCard = ({ voucher, isUsed = false }: { voucher: Voucher; isUsed?: boolean }) => {
    const Icon = getVoucherIcon(voucher);
    const remaining = voucher.max_redemptions_per_user_per_day
      ? voucher.max_redemptions_per_user_per_day - (voucher.redeemed_today || 0)
      : null;

    const getRemainingText = () => {
      if (isUsed) return null;
      if (remaining === null) return 'Unlimited uses';
      if (remaining <= 0) return 'No uses left today';
      if (remaining === 1) return '1 remaining today';
      return `${remaining} remaining today`;
    };

    const getRemainingColor = () => {
      if (remaining === null) return 'text-gray-500';
      if (remaining <= 0) return 'text-gray-400';
      if (remaining === 1) return 'text-orange-500';
      return 'text-green-600';
    };

    return (
      <button
        onClick={() => !isUsed && router.push(`/app/vouchers/${voucher.id}`)}
        className={`w-full flex items-center gap-3 p-4 bg-white border border-black/10 rounded-xl text-left transition-all ${
          isUsed ? 'opacity-60 cursor-default' : 'hover:bg-gray-50 active:scale-[0.99]'
        }`}
        disabled={isUsed}
      >
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isUsed ? 'bg-gray-200' : 'bg-mustard'
        }`}>
          <Icon className={`w-6 h-6 ${isUsed ? 'text-gray-500' : 'text-black'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-medium text-black truncate">{voucher.title}</h3>
          <p className="text-[13px] text-gray-500 truncate">{voucher.description}</p>
          <div className="flex items-center gap-2 mt-1">
            {isUsed ? (
              <span className="text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 bg-gray-200 rounded text-gray-500">
                Used
              </span>
            ) : (
              <span className={`text-xs ${getRemainingColor()}`}>
                {getRemainingText()}
              </span>
            )}
          </div>
        </div>
        {!isUsed && (
          <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
        )}
      </button>
    );
  };

  const renderSection = (title: string, vouchers: Voucher[], showIfEmpty = false) => {
    if (!showIfEmpty && vouchers.length === 0) return null;
    const isEmployee = user?.user_type === 'employee';

    return (
      <div className="mb-10">
        <div className="bg-white rounded-xl px-4 py-3 mb-5 border-l-4 border-black">
          <h2 className="text-heading text-black flex items-center gap-2">
            {title.toUpperCase()}
            <span className="text-caption text-black/50">({vouchers.length})</span>
          </h2>
        </div>

        {vouchers.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-black/10">
            <p className="text-body text-black/50">No rewards in this category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {vouchers.map(voucher => (
              <RewardCard
                key={voucher.id}
                {...voucher}
                userPoints={user?.points_balance || 0}
                onClick={() => router.push(`/app/vouchers/${voucher.id}`)}
                hidePoints={isEmployee}
                max_redemptions_per_user={voucher.max_redemptions_per_user}
                max_redemptions_per_user_per_day={voucher.max_redemptions_per_user_per_day}
                redeemed_today={voucher.redeemed_today}
                total_redemptions={voucher.total_redemptions}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  const isEmployee = user?.user_type === 'employee';

  // Get available and used vouchers for employee view
  // Must be called before any early returns to satisfy Rules of Hooks
  const employeeVouchers = useMemo(() => {
    if (!isEmployee) return { available: [], usedToday: [] };

    const staffVouchers = vouchers.filter(v => v.is_staff_voucher);
    const available: Voucher[] = [];
    const usedToday: Voucher[] = [];

    staffVouchers.forEach(v => {
      // Check if fully used today
      if (v.max_redemptions_per_user_per_day && v.redeemed_today && v.redeemed_today >= v.max_redemptions_per_user_per_day) {
        usedToday.push(v);
      } else {
        available.push(v);
      }
    });

    return { available, usedToday };
  }, [vouchers, isEmployee]);

  if (!mounted || !hasHydrated || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  // Employee-specific view
  if (isEmployee) {
    return (
      <AppLayout>
        <PullToRefresh onRefresh={handleRefresh}>
          <div className="pb-24 min-h-screen">
            {/* Simple Header */}
            <div className="px-5 pt-4 pb-4">
              <h1 className="text-2xl font-semibold text-black">Your Benefits</h1>
            </div>

            <div className="px-5">
              {/* Available Section */}
              <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-gray-500 mb-3">
                Available
              </p>
              <div className="space-y-3 mb-6">
                {employeeVouchers.available.length === 0 ? (
                  <div className="bg-white rounded-xl p-6 text-center border border-black/10">
                    <p className="text-sm text-gray-500">No vouchers available</p>
                  </div>
                ) : (
                  employeeVouchers.available.map(voucher => (
                    <EmployeeVoucherCard key={voucher.id} voucher={voucher} />
                  ))
                )}
              </div>

              {/* Used Today Section */}
              {employeeVouchers.usedToday.length > 0 && (
                <>
                  <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-gray-500 mb-3 mt-6">
                    Used Today
                  </p>
                  <div className="space-y-3">
                    {employeeVouchers.usedToday.map(voucher => (
                      <EmployeeVoucherCard key={voucher.id} voucher={voucher} isUsed />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </PullToRefresh>
      </AppLayout>
    );
  }

  // Customer view (original)
  return (
    <AppLayout>
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="pb-24 bg-white min-h-screen">
        {/* Header - Sarnies Brand */}
        <div className="bg-white border-b border-black/10 sticky top-0 z-40 px-6 py-5">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <h1 className="text-title text-black mb-2">VOUCHERS</h1>
              <div className="inline-flex items-center gap-2 bg-black/5 border border-black/10 rounded-full px-3 py-1.5">
                <span className="text-caption text-black">{user?.points_balance || 0} points</span>
              </div>
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-black/10 rounded-xl text-sm font-medium text-black/60 hover:border-black/30 transition-colors"
              >
                <span className="text-nav">SORT</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showSortMenu ? 'rotate-180' : ''}`} />
              </button>

              {showSortMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-black/10 overflow-hidden z-50">
                  <button
                    onClick={() => {
                      setSortBy('featured');
                      setShowSortMenu(false);
                    }}
                    className={`w-full text-left px-4 py-3 text-sm hover:bg-black/5 transition-colors ${
                      sortBy === 'featured' ? 'bg-black text-white font-semibold' : 'text-black/60'
                    }`}
                  >
                    Featured First
                  </button>
                  <button
                    onClick={() => {
                      setSortBy('low_points');
                      setShowSortMenu(false);
                    }}
                    className={`w-full text-left px-4 py-3 text-sm hover:bg-black/5 transition-colors ${
                      sortBy === 'low_points' ? 'bg-black text-white font-semibold' : 'text-black/60'
                    }`}
                  >
                    Low Points First
                  </button>
                  <button
                    onClick={() => {
                      setSortBy('high_points');
                      setShowSortMenu(false);
                    }}
                    className={`w-full text-left px-4 py-3 text-sm hover:bg-black/5 transition-colors ${
                      sortBy === 'high_points' ? 'bg-black text-white font-semibold' : 'text-black/60'
                    }`}
                  >
                    High Points First
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/30" />
            <input
              type="text"
              placeholder="Search vouchers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-12 py-3 bg-white border border-black/10 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-black/30 hover:text-black transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Category Filter Chips */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {(['all', 'drinks', 'food', 'discount', 'merch'] as CategoryFilter[]).map(category => (
              <button
                key={category}
                onClick={() => setCategoryFilter(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  categoryFilter === category
                    ? 'bg-black text-white'
                    : 'bg-white text-black/60 hover:bg-black/5 border border-black/10'
                }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 max-w-7xl mx-auto">
          {searchQuery || categoryFilter !== 'all' ? (
            // Search/Filter Results
            <div className="mb-8 sm:mb-10">
              <h2 className="text-heading text-black mb-4 sm:mb-5">
                {searchQuery ? `RESULTS FOR "${searchQuery.toUpperCase()}"` : `${categoryFilter.toUpperCase()} VOUCHERS`}
                <span className="text-caption text-black/50 ml-2">({getSortedVouchers.length})</span>
              </h2>

              {getSortedVouchers.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 sm:p-12 text-center border border-black/10">
                  <p className="text-body text-black/50">No vouchers found</p>
                  <p className="text-caption text-black/30 mt-2">Try adjusting your search or filters</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                  {getSortedVouchers.map(voucher => (
                    <RewardCard
                      key={voucher.id}
                      {...voucher}
                      userPoints={user?.points_balance || 0}
                      onClick={() => router.push(`/app/vouchers/${voucher.id}`)}
                      hidePoints={false}
                      max_redemptions_per_user={voucher.max_redemptions_per_user}
                      max_redemptions_per_user_per_day={voucher.max_redemptions_per_user_per_day}
                      redeemed_today={voucher.redeemed_today}
                      total_redemptions={voucher.total_redemptions}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Categorized View
            <>
              {renderSection('Featured Vouchers', groups.featured)}
              {renderSection('Drinks & Coffee', groups.drinks)}
              {renderSection('Discounts & Deals', groups.discounts)}
              {renderSection('Merch & Products', groups.merch)}
              {user?.role === 'staff' && renderSection('Staff Vouchers', groups.staff, true)}
            </>
          )}
        </div>
        </div>
      </PullToRefresh>
    </AppLayout>
  );
}
