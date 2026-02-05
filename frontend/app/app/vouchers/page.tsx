'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { useAuthStore } from '@/lib/store';
import { vouchersAPI } from '@/lib/api';
import { ChevronDown, Search, X, Star, Gift, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { PullToRefresh } from '@/components/PullToRefresh';
import { VouchersPageSkeleton } from '@/components/ui/SkeletonLoader';
import { useTabSwipeNavigation } from '@/hooks/useSwipeNavigation';
import { VoucherCard } from '@/components/ui/VoucherCard';
import { isEmployeeUser } from '@/lib/authUtils';

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
  today_redemptions?: number;
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

  const isEmployee = isEmployeeUser(user);

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
      const currentUser = useAuthStore.getState().user;
      const currentIsEmployee = isEmployeeUser(currentUser);

      if (currentIsEmployee && currentUser?.id) {
        const response = await vouchersAPI.getEmployeeVouchers(currentUser.id);
        setVouchers(response.data.vouchers || []);
      } else {
        const response = await vouchersAPI.getAll();
        setVouchers(response.data.vouchers || []);
      }
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

    let filtered = [...vouchers].filter(v => {
      if (v.target_user_types && Array.isArray(v.target_user_types) && v.target_user_types.length > 0) {
        return isEmployee
          ? v.target_user_types.includes('employee')
          : v.target_user_types.includes('customer');
      }
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
    if (isEmployee) {
      return {
        featured: filteredVouchers.filter(v => v.is_featured),
        perks: filteredVouchers.filter(v => !v.is_featured),
        drinks: [],
        discounts: [],
      };
    }

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

  const getRedeemedToday = (voucher: Voucher) => voucher.today_redemptions ?? voucher.redeemed_today ?? 0;

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
      remainingToday={voucher.max_redemptions_per_user_per_day ? voucher.max_redemptions_per_user_per_day - getRedeemedToday(voucher) : undefined}
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
        <div className="flex flex-col min-h-screen bg-bg-primary">
          <div className="max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto w-full">
            {/* Header */}
            <div className="bg-bg-primary px-4 md:px-6 pt-3 pb-0">
              {/* Title Row */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h1 className="text-heading text-text-primary">
                    {isEmployee ? 'Your Perks' : 'Vouchers'}
                  </h1>
                  {!isEmployee && (
                    <p className="text-caption text-accent flex items-center gap-1 mt-0.5">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      {user?.points_balance || 0} points
                    </p>
                  )}
                  {isEmployee && (
                    <p className="text-caption text-text-tertiary mt-0.5">
                      Available employee benefits
                    </p>
                  )}
                </div>

                {/* Sort Button */}
                <button
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  className="btn-ghost flex items-center gap-1 px-3 py-1.5 rounded-md border border-border text-caption text-text-secondary bg-surface"
                >
                  Sort
                  <ChevronDown className={`w-4 h-4 transition-transform ${showSortMenu ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  type="text"
                  placeholder="Search vouchers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-search h-10 pl-10 pr-10 rounded-lg"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Category Tabs */}
              <div className="flex gap-2 mt-3 pb-3 overflow-x-auto scrollbar-hide">
                {(['all', 'drinks', 'food', 'discounts'] as CategoryFilter[]).map((category) => (
                  <button
                    key={category}
                    onClick={() => setCategoryFilter(category)}
                    className={categoryFilter === category ? 'chip-active shadow-sm' : 'chip-default'}
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 px-4 md:px-6 pb-24 space-y-6">
              {/* Featured Section */}
              {groups.featured.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-4 bg-accent rounded-full" />
                    <p className="text-label">
                      Featured
                    </p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                    {groups.featured.map(renderVoucherCard)}
                  </div>
                </div>
              )}

              {/* Employee Perks Section */}
              {groups.perks.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-4 bg-stone-400 rounded-full" />
                    <p className="text-label">
                      Your Benefits
                    </p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                    {groups.perks.map(renderVoucherCard)}
                  </div>
                </div>
              )}

              {/* Drinks Section */}
              {groups.drinks.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-4 bg-accent-light rounded-full" />
                    <p className="text-label">
                      Drinks & Coffee
                    </p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                    {groups.drinks.map(renderVoucherCard)}
                  </div>
                </div>
              )}

              {/* Discounts Section */}
              {groups.discounts.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-4 bg-stone-300 rounded-full" />
                    <p className="text-label">
                      Discounts & Deals
                    </p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                    {groups.discounts.map(renderVoucherCard)}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {filteredVouchers.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    {isEmployee ? (
                      <Gift className="w-7 h-7" />
                    ) : (
                      <span className="text-3xl">🎫</span>
                    )}
                  </div>
                  <p className="empty-state-title">
                    {isEmployee ? 'No perks available' : 'No vouchers found'}
                  </p>
                  <p className="empty-state-description">
                    {isEmployee ? 'Check back soon for employee perks!' : 'Try adjusting your search or filters'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </PullToRefresh>
    </AppLayout>
  );
}
