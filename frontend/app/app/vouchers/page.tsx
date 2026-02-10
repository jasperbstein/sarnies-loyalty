'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { useAuthStore } from '@/lib/store';
import { vouchersAPI } from '@/lib/api';
import { ChevronDown, Search, X, Star, Gift, Sparkles, Coffee, Coins, Ticket, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { PullToRefresh } from '@/components/PullToRefresh';
import { VouchersPageSkeleton } from '@/components/ui/SkeletonLoader';
import { useTabSwipeNavigation } from '@/hooks/useSwipeNavigation';
import { VoucherCard } from '@/components/ui/VoucherCard';
import { isEmployeeUser, isPerksOnlyUser } from '@/lib/authUtils';

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
type SortOption = 'featured' | 'points-low' | 'points-high' | 'name';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'featured', label: 'Featured First' },
  { value: 'points-low', label: 'Points: Low→High' },
  { value: 'points-high', label: 'Points: High→Low' },
  { value: 'name', label: 'Name A-Z' },
];

export default function VouchersPage() {
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [mounted, setMounted] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  const isEmployee = isEmployeeUser(user);
  const perksOnly = isPerksOnlyUser(user);

  useTabSwipeNavigation();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close sort dropdown on outside click
  useEffect(() => {
    if (!showSortMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setShowSortMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSortMenu]);

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

    // Sort
    switch (sortBy) {
      case 'points-low':
        filtered.sort((a, b) => (a.points_required || 0) - (b.points_required || 0));
        break;
      case 'points-high':
        filtered.sort((a, b) => (b.points_required || 0) - (a.points_required || 0));
        break;
      case 'name':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'featured':
      default:
        filtered.sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0));
        break;
    }

    return filtered;
  }, [vouchers, searchQuery, categoryFilter, isEmployee, sortBy]);

  const groups = useMemo(() => {
    // Perks-only users (employees or company members without points) see simplified view
    if (perksOnly) {
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
  }, [filteredVouchers, perksOnly]);

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
      isEmployee={perksOnly} // Use perksOnly to hide points display
      remainingToday={voucher.max_redemptions_per_user_per_day ? voucher.max_redemptions_per_user_per_day - getRedeemedToday(voucher) : undefined}
      maxPerDay={voucher.max_redemptions_per_user_per_day}
      expiryType={voucher.expiry_type}
      expiryDays={voucher.expiry_days}
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
            <div className="bg-bg-primary px-3 md:px-6 pt-2 pb-0">
              {/* Title Row */}
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h1 className="text-heading text-text-primary">
                    {perksOnly ? 'Your Perks' : 'Vouchers'}
                  </h1>
                  {!perksOnly && (
                    <p className="text-caption text-accent flex items-center gap-1 mt-0.5">
                      <Star className="w-3 h-3 fill-current" />
                      {user?.points_balance || 0} points
                    </p>
                  )}
                  {perksOnly && (
                    <p className="text-caption text-text-tertiary mt-0.5">
                      {isEmployee ? 'Available employee benefits' : 'Available member benefits'}
                    </p>
                  )}
                </div>

                {/* Sort Button */}
                <div className="relative" ref={sortRef}>
                  <button
                    onClick={() => setShowSortMenu(!showSortMenu)}
                    className="btn-ghost flex items-center gap-1 px-2.5 py-1 rounded-md border border-border text-caption text-text-secondary bg-surface"
                  >
                    {sortBy === 'featured' ? 'Sort' : `Sort: ${SORT_OPTIONS.find(o => o.value === sortBy)?.label}`}
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSortMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Sort Dropdown */}
                  {showSortMenu && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-surface border border-border rounded-lg shadow-md z-[var(--z-dropdown)] animate-scale-up overflow-hidden">
                      {SORT_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setSortBy(option.value);
                            setShowSortMenu(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 text-xs text-left transition-colors ${
                            sortBy === option.value
                              ? 'bg-stone-100 text-text-primary font-semibold'
                              : 'text-text-secondary hover:bg-stone-50'
                          }`}
                        >
                          {option.label}
                          {sortBy === option.value && <Check className="w-3.5 h-3.5 text-accent" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
                <input
                  type="text"
                  placeholder="Search vouchers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-search pl-9 pr-9 rounded-lg"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Category Tabs */}
              <div className="flex gap-2 mt-2 pb-2 overflow-x-auto scrollbar-hide">
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
              <p className="text-xs text-text-tertiary mt-1 px-1">
                {filteredVouchers.length} {filteredVouchers.length === 1 ? 'result' : 'results'}
              </p>
            </div>

            {/* Content */}
            <div className="flex-1 px-3 md:px-6 pb-24 space-y-4">
              {/* Featured Section */}
              {groups.featured.length > 0 && (
                <div className="animate-stagger-item stagger-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="w-3.5 h-3.5 text-red-500 fill-red-500" />
                    <p className="text-label text-text-primary">
                      Featured
                    </p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3 md:gap-4">
                    {groups.featured.map(renderVoucherCard)}
                  </div>
                </div>
              )}

              {/* Employee Perks Section */}
              {groups.perks.length > 0 && (
                <div className="animate-stagger-item stagger-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Gift className="w-3.5 h-3.5 text-red-500" />
                    <p className="text-label text-text-primary">
                      Your Benefits
                    </p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3 md:gap-4">
                    {groups.perks.map(renderVoucherCard)}
                  </div>
                </div>
              )}

              {/* Drinks Section */}
              {groups.drinks.length > 0 && (
                <div className="animate-stagger-item stagger-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Coffee className="w-3.5 h-3.5 text-red-500" />
                    <p className="text-label text-text-primary">
                      Drinks & Coffee
                    </p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3 md:gap-4">
                    {groups.drinks.map(renderVoucherCard)}
                  </div>
                </div>
              )}

              {/* Discounts Section */}
              {groups.discounts.length > 0 && (
                <div className="animate-stagger-item stagger-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Coins className="w-3.5 h-3.5 text-red-500" />
                    <p className="text-label text-text-primary">
                      Discounts & Deals
                    </p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3 md:gap-4">
                    {groups.discounts.map(renderVoucherCard)}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {filteredVouchers.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    {perksOnly ? (
                      <Gift className="w-7 h-7" />
                    ) : (
                      <Ticket className="w-7 h-7" />
                    )}
                  </div>
                  <p className="empty-state-title">
                    {perksOnly ? 'No perks available' : 'No vouchers found'}
                  </p>
                  <p className="empty-state-description">
                    {perksOnly
                      ? (searchQuery || categoryFilter !== 'all' ? 'No perks match your search' : 'Check back soon for member perks!')
                      : 'Try adjusting your search or filters'}
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
