'use client';

import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'text':
        return 'h-4 rounded';
      case 'circular':
        return 'rounded-full';
      case 'rectangular':
        return 'rounded-lg';
      default:
        return 'rounded-lg';
    }
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`skeleton ${getVariantClasses()} ${className}`}
      style={style}
      role="status"
      aria-label="Loading..."
    />
  );
};

// Pre-built skeleton components for common patterns
export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 p-6 ${className}`}>
      <Skeleton variant="rectangular" height={160} className="mb-4" />
      <Skeleton variant="text" width="60%" className="mb-2" />
      <Skeleton variant="text" width="80%" className="mb-2" />
      <Skeleton variant="text" width="40%" />
    </div>
  );
};

export const SkeletonTable: React.FC<{ rows?: number; className?: string }> = ({
  rows = 5,
  className = '',
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex gap-4">
        <Skeleton variant="text" className="flex-1" />
        <Skeleton variant="text" className="flex-1" />
        <Skeleton variant="text" className="flex-1" />
        <Skeleton variant="text" width={80} />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex gap-4 items-center">
          <Skeleton variant="text" className="flex-1" />
          <Skeleton variant="text" className="flex-1" />
          <Skeleton variant="text" className="flex-1" />
          <Skeleton variant="rectangular" width={80} height={32} />
        </div>
      ))}
    </div>
  );
};

export const SkeletonList: React.FC<{ items?: number; className?: string }> = ({
  items = 3,
  className = '',
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="flex items-center gap-4">
          <Skeleton variant="circular" width={48} height={48} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="40%" />
          </div>
          <Skeleton variant="rectangular" width={80} height={32} />
        </div>
      ))}
    </div>
  );
};

export const SkeletonProfile: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" width={80} height={80} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="40%" height={24} />
          <Skeleton variant="text" width="60%" />
        </div>
      </div>
      {/* Content */}
      <div className="space-y-4">
        <Skeleton variant="rectangular" height={120} />
        <Skeleton variant="rectangular" height={120} />
        <Skeleton variant="rectangular" height={120} />
      </div>
    </div>
  );
};

// ========================================
// PAGE-SPECIFIC SKELETONS
// ========================================

/**
 * HomePageSkeleton - Matches the home page layout
 * Member card, points card, quick actions, referral, featured rewards
 */
export const HomePageSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <div className="px-5 pt-4 pb-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Skeleton variant="text" width={100} height={24} />
          <Skeleton variant="circular" width={40} height={40} />
        </div>

        {/* Member Hero Card Skeleton */}
        <div className="w-full h-[200px] rounded-2xl overflow-hidden relative bg-[#E5E5E5]">
          <div className="absolute inset-0 p-6 flex items-end justify-between">
            <div className="space-y-2">
              <Skeleton variant="text" width={80} height={12} className="bg-[#D4D4D4]" />
              <Skeleton variant="text" width={150} height={24} className="bg-[#D4D4D4]" />
              <Skeleton variant="text" width={100} height={14} className="bg-[#D4D4D4]" />
            </div>
            <Skeleton variant="rectangular" width={56} height={56} className="rounded-lg bg-white/50" />
          </div>
        </div>

        {/* Points Progress Card Skeleton */}
        <div className="w-full bg-white rounded-md p-6 border border-[#F0F0F0]">
          <div className="flex items-center justify-between mb-3">
            <Skeleton variant="text" width={100} height={14} />
            <Skeleton variant="rectangular" width={100} height={28} className="rounded" />
          </div>
          <Skeleton variant="text" width={120} height={40} className="mb-4" />
          <div className="space-y-2">
            <Skeleton variant="rectangular" height={4} className="rounded-sm" />
            <div className="flex items-center justify-between">
              <Skeleton variant="text" width={80} height={14} />
              <Skeleton variant="text" width={100} height={14} />
            </div>
          </div>
        </div>

        {/* Quick Actions Skeleton */}
        <div className="space-y-2">
          <Skeleton variant="text" width={120} height={14} />
          <div className="flex gap-3">
            <div className="flex-1 flex flex-col items-center gap-2">
              <Skeleton variant="rectangular" width={56} height={56} className="rounded-2xl" />
              <Skeleton variant="text" width={40} height={12} />
            </div>
            <div className="flex-1 flex flex-col items-center gap-2">
              <Skeleton variant="rectangular" width={56} height={56} className="rounded-2xl" />
              <Skeleton variant="text" width={50} height={12} />
            </div>
          </div>
        </div>

        {/* Referral Card Skeleton */}
        <Skeleton variant="rectangular" height={88} className="rounded-2xl" />

        {/* Featured Rewards Skeleton */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton variant="text" width={140} height={14} />
            <Skeleton variant="text" width={60} height={16} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <RewardCardSkeleton />
            <RewardCardSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * EmployeeHomePageSkeleton - Matches EmployeeHome layout
 * Dark employee card, perks summary, 2x2 perk grid, invite button
 */
export const EmployeeHomePageSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-2xl lg:max-w-4xl mx-auto">
        <div className="px-3 md:px-6 pt-3 pb-24 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Skeleton variant="text" width={100} height={24} />
            <Skeleton variant="rectangular" width={90} height={28} className="rounded-full" />
          </div>

          {/* Employee Card */}
          <div className="w-full rounded-xl bg-stone-900 px-4 py-3 flex items-center justify-between gap-3">
            <div className="space-y-1.5">
              <Skeleton variant="text" width={70} height={10} className="!bg-stone-700" />
              <Skeleton variant="text" width={140} height={18} className="!bg-stone-700" />
              <Skeleton variant="text" width={100} height={14} className="!bg-stone-700" />
            </div>
            <div className="w-12 h-12 rounded-lg bg-white/20 flex-shrink-0" />
          </div>

          {/* Perks Summary */}
          <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2.5 border border-stone-200">
            <Skeleton variant="rectangular" width={14} height={14} className="rounded-sm" />
            <Skeleton variant="text" width={130} height={14} />
          </div>

          {/* Your Perks Section */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Skeleton variant="text" width={80} height={14} />
              <Skeleton variant="text" width={55} height={14} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-full bg-white rounded-lg border border-stone-200 overflow-hidden">
                  <Skeleton variant="rectangular" className="w-full aspect-[3/2] rounded-none" />
                  <div className="p-2.5 space-y-1.5">
                    <Skeleton variant="text" width="70%" height={14} />
                    <Skeleton variant="text" width={40} height={12} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Invite Friends */}
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-stone-200">
            <div className="flex items-center gap-3">
              <Skeleton variant="rectangular" width={36} height={36} className="rounded-lg" />
              <div className="space-y-1">
                <Skeleton variant="text" width={100} height={14} />
                <Skeleton variant="text" width={130} height={12} />
              </div>
            </div>
            <Skeleton variant="rectangular" width={16} height={16} className="rounded-sm" />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * RewardCardSkeleton - Single reward card skeleton
 */
export const RewardCardSkeleton: React.FC = () => {
  return (
    <div className="w-full bg-white rounded-md overflow-hidden border border-[#F0F0F0]">
      <Skeleton variant="rectangular" height={100} className="rounded-none" />
      <div className="p-3 space-y-2">
        <div>
          <Skeleton variant="text" width="80%" height={16} className="mb-1" />
          <Skeleton variant="text" width="60%" height={14} />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton variant="text" width={60} height={14} />
          <Skeleton variant="text" width={40} height={12} />
        </div>
      </div>
    </div>
  );
};

/**
 * VoucherCardSkeleton - Voucher card skeleton for vouchers page
 */
export const VoucherCardSkeleton: React.FC = () => {
  return (
    <div className="w-full bg-white rounded-xl border border-[#F0F0F0] shadow-[0_2px_8px_rgba(0,0,0,0.08)] overflow-hidden">
      {/* Image placeholder */}
      <Skeleton variant="rectangular" className="w-full aspect-[4/3] rounded-none" />
      {/* Content */}
      <div className="p-3">
        <Skeleton variant="text" width="80%" height={16} className="mb-1" />
        <Skeleton variant="text" width="60%" height={14} className="mb-2" />
        <div className="flex items-center justify-between">
          <Skeleton variant="text" width={60} height={16} />
          <Skeleton variant="text" width={40} height={12} />
        </div>
      </div>
    </div>
  );
};

/**
 * VouchersPageSkeleton - Full vouchers page skeleton
 */
export const VouchersPageSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-[#FAFAF8]">
      {/* Header */}
      <div className="bg-[#FAFAF8] px-5 pt-4 pb-0">
        {/* Title Row */}
        <div className="flex items-center justify-between mb-1">
          <div>
            <Skeleton variant="text" width={120} height={28} className="mb-1" />
            <Skeleton variant="text" width={100} height={16} />
          </div>
          <Skeleton variant="rectangular" width={70} height={36} className="rounded-md" />
        </div>

        {/* Search */}
        <Skeleton variant="rectangular" height={44} className="rounded-lg mt-4" />

        {/* Category Tabs */}
        <div className="flex gap-2 mt-4 pb-4">
          <Skeleton variant="rectangular" width={50} height={36} className="rounded-full" />
          <Skeleton variant="rectangular" width={60} height={36} className="rounded-full" />
          <Skeleton variant="rectangular" width={50} height={36} className="rounded-full" />
          <Skeleton variant="rectangular" width={75} height={36} className="rounded-full" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pb-24 space-y-6">
        {/* Featured Section */}
        <div>
          <Skeleton variant="text" width={80} height={14} className="mb-3" />
          <div className="grid grid-cols-2 gap-3">
            <VoucherCardSkeleton />
            <VoucherCardSkeleton />
          </div>
        </div>

        {/* Drinks Section */}
        <div>
          <Skeleton variant="text" width={130} height={14} className="mb-3" />
          <div className="grid grid-cols-2 gap-3">
            <VoucherCardSkeleton />
            <VoucherCardSkeleton />
          </div>
        </div>

        {/* Discounts Section */}
        <div>
          <Skeleton variant="text" width={140} height={14} className="mb-3" />
          <div className="grid grid-cols-2 gap-3">
            <VoucherCardSkeleton />
            <VoucherCardSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
};
