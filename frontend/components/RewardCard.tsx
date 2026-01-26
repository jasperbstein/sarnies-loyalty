'use client';

import Image from 'next/image';
import { Star, Calendar, Gift, Coffee, Utensils, Percent, ShoppingBag } from 'lucide-react';

interface RewardCardProps {
  id: number;
  title: string;
  description: string;
  image_url?: string;
  points_required: number;
  cash_value: number;
  voucher_type: string;
  is_featured: boolean;
  is_staff_voucher: boolean;
  expiry_type: string;
  expiry_days?: number;
  locations?: string;
  userPoints: number;
  onClick: () => void;
  hidePoints?: boolean; // For employee benefits
  max_redemptions_per_user_per_day?: number;
  max_redemptions_per_user?: number;
  redeemed_today?: number;
  total_redemptions?: number;
}

export default function RewardCard({
  id,
  title,
  description,
  image_url,
  points_required,
  cash_value,
  voucher_type,
  is_featured,
  is_staff_voucher,
  expiry_type,
  expiry_days,
  locations,
  userPoints,
  onClick,
  hidePoints = false,
  max_redemptions_per_user_per_day,
  max_redemptions_per_user,
  redeemed_today = 0,
  total_redemptions = 0
}: RewardCardProps) {
  const dailyLimitReached = max_redemptions_per_user_per_day && redeemed_today >= max_redemptions_per_user_per_day;
  const totalLimitReached = max_redemptions_per_user && total_redemptions >= max_redemptions_per_user;
  const isLimitReached = dailyLimitReached || totalLimitReached;
  const eligible = hidePoints ? !isLimitReached : (userPoints >= points_required && !isLimitReached);
  const pointsNeeded = points_required - userPoints;

  const getExpiryText = () => {
    if (expiry_type === 'no_expiry') {
      return 'No expiry';
    } else if (expiry_type === 'days_after_redeem' && expiry_days) {
      return `Valid for ${expiry_days} days after redemption`;
    } else if (expiry_type === 'fixed_date') {
      return 'Limited time offer';
    }
    return 'No expiry';
  };

  const getCategoryIcon = () => {
    // Determine category from voucher type and title
    const titleLower = title.toLowerCase();

    if (titleLower.includes('coffee') || titleLower.includes('espresso') ||
        titleLower.includes('latte') || titleLower.includes('cappuccino') ||
        titleLower.includes('americano') || titleLower.includes('drink')) {
      return <Coffee className="w-12 h-12 text-sarnies-accent-gold" strokeWidth={1.5} />;
    }

    if (voucher_type === 'merch') {
      return <ShoppingBag className="w-12 h-12 text-sarnies-accent-gold" strokeWidth={1.5} />;
    }

    if (voucher_type === 'percentage_discount' || voucher_type === 'discount_amount') {
      return <Percent className="w-12 h-12 text-sarnies-accent-gold" strokeWidth={1.5} />;
    }

    if (voucher_type === 'free_item') {
      return <Utensils className="w-12 h-12 text-sarnies-accent-gold" strokeWidth={1.5} />;
    }

    return <Gift className="w-12 h-12 text-sarnies-accent-gold" strokeWidth={1.5} />;
  };

  // Determine if we should show image section
  // Remove image section for percentage/discount vouchers (they're text-based benefits)
  const shouldShowImageSection =
    voucher_type !== 'percentage_discount' &&
    voucher_type !== 'discount_amount';

  return (
    <div
      className={`bg-white rounded-2xl overflow-hidden border border-sarnies-card-border hover:shadow-lg hover:border-sarnies-accent-gold transition-all duration-300 cursor-pointer group flex flex-col h-full ${isLimitReached ? 'opacity-50 grayscale' : ''}`}
      onClick={onClick}
    >
      {/* Image Section - Conditionally Rendered */}
      {shouldShowImageSection && (
        <div className="relative h-48 bg-sarnies-background flex-shrink-0">
          {image_url ? (
            <Image
              src={image_url}
              alt={title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 100vw, 50vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sarnies-background to-sarnies-card-border">
              {getCategoryIcon()}
            </div>
          )}

          {/* Featured Badge - Fixed Position */}
          {is_featured && (
            <div className="absolute top-3 left-3">
              <div className="bg-sarnies-accent-gold text-white px-2.5 py-1 rounded-full flex items-center gap-1 text-xs font-semibold shadow-lg">
                <Star className="w-3 h-3 fill-white" />
                FEATURED
              </div>
            </div>
          )}

          {/* Price Badge - Fixed Position (hide for employee benefits) */}
          {!hidePoints && (
            <div className="absolute top-3 right-3">
              <div className="bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg min-w-[80px] text-center">
                <span className="text-sm font-bold text-sarnies-text-primary">฿{Number(cash_value).toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content Section - Flex Grow */}
      <div className="p-4 flex flex-col flex-grow">
        {/* Badges for cards without image section */}
        {!shouldShowImageSection && (
          <div className="flex items-center justify-between mb-3">
            {is_featured && (
              <div className="bg-sarnies-accent-gold text-white px-2.5 py-1 rounded-full flex items-center gap-1 text-xs font-semibold shadow-sm">
                <Star className="w-3 h-3 fill-white" />
                FEATURED
              </div>
            )}
            {!hidePoints && (
              <div className={`bg-sarnies-background px-3 py-1.5 rounded-full shadow-sm min-w-[80px] text-center ${!is_featured ? 'ml-auto' : ''}`}>
                <span className="text-sm font-bold text-sarnies-text-primary">฿{Number(cash_value).toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        {/* Title - Fixed 2 Lines */}
        <h3 className="text-base font-bold text-sarnies-text-primary mb-2 line-clamp-2 h-12 group-hover:text-sarnies-accent-gold transition-colors">
          {title}
        </h3>

        {/* Description - Fixed 2 Lines */}
        <p className="text-sm text-sarnies-text-secondary mb-4 line-clamp-2 h-10 leading-relaxed">
          {description}
        </p>

        {/* Points Required or Daily Redemptions - Fixed Height */}
        {!hidePoints ? (
          <div className="flex items-center justify-between mb-3 h-6">
            <span className="text-xs text-sarnies-text-secondary">Points Required</span>
            <span className="font-bold text-sarnies-text-primary text-sm">{points_required} pts</span>
          </div>
        ) : (
          max_redemptions_per_user_per_day && (
            <div className="flex items-center justify-between mb-3 h-6">
              <span className="text-xs text-sarnies-text-secondary">Remaining Today</span>
              <span className="font-bold text-sarnies-text-primary text-sm">{Math.max(0, max_redemptions_per_user_per_day - redeemed_today)} of {max_redemptions_per_user_per_day}</span>
            </div>
          )
        )}

        {/* Expiry - Always Show, Fixed Height */}
        <div className="flex items-center gap-2 mb-4 h-5">
          <Calendar className="w-3.5 h-3.5 text-sarnies-text-muted flex-shrink-0" />
          <span className="text-xs text-sarnies-text-secondary line-clamp-1">{getExpiryText()}</span>
        </div>

        {/* Spacer to push button to bottom */}
        <div className="flex-grow"></div>

        {/* Action Button - Fixed Height */}
        {isLimitReached ? (
          <button
            className="w-full bg-sarnies-background text-sarnies-text-muted h-11 rounded-xl font-semibold cursor-not-allowed border border-sarnies-card-border"
            disabled
          >
            {dailyLimitReached ? 'Daily Limit Reached' : 'Already Used'}
          </button>
        ) : hidePoints || eligible ? (
          <button className="w-full bg-sarnies-button-primary text-white h-11 rounded-xl font-semibold hover:bg-sarnies-accent-gold transition-all shadow-sm hover:shadow-md">
            View Details
          </button>
        ) : (
          <button
            className="w-full bg-sarnies-background text-sarnies-text-muted h-11 rounded-xl font-semibold cursor-not-allowed border border-sarnies-card-border"
            disabled
          >
            Need {pointsNeeded} more pt{pointsNeeded === 1 ? '' : 's'}
          </button>
        )}
      </div>
    </div>
  );
}
