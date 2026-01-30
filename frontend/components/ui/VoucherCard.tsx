'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Star, Heart, Clock, Flame } from 'lucide-react';
import { ExpiryBadge } from './Badge';

/**
 * VoucherCard - Unified voucher/perk card component
 * Sarnies Design System v2.0
 *
 * Design System:
 * - Border radius: 12px (rounded-xl)
 * - Border: 1px solid stone-200
 * - No shadows (flat design)
 * - Image aspect ratio: 4:3
 * - Content padding: 16px
 */

export interface VoucherCardProps {
  id: number;
  title: string;
  description: string;
  imageUrl?: string;
  voucherType: 'free_item' | 'discount_amount' | 'percentage_discount' | 'merch' | string;
  pointsRequired?: number;
  isFeatured?: boolean;
  isEmployee?: boolean;
  remainingToday?: number;
  maxPerDay?: number;
  onClick?: () => void;
  onUseNow?: () => void;
  variant?: 'grid' | 'featured' | 'list';
  // New props for expiry and favorites
  expiresAt?: string | Date;
  isFavorite?: boolean;
  onToggleFavorite?: (id: number) => void;
}

// Calculate days until expiry
function getDaysUntilExpiry(expiresAt?: string | Date): number | null {
  if (!expiresAt) return null;
  const expiry = new Date(expiresAt);
  const now = new Date();
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

export function VoucherCard({
  id,
  title,
  description,
  imageUrl,
  voucherType,
  pointsRequired = 0,
  isFeatured = false,
  isEmployee = false,
  remainingToday,
  maxPerDay,
  onClick,
  onUseNow,
  variant = 'grid',
  expiresAt,
  isFavorite = false,
  onToggleFavorite,
}: VoucherCardProps) {
  const router = useRouter();
  const daysUntilExpiry = getDaysUntilExpiry(expiresAt);
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 7;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.push(`/app/vouchers/${id}`);
    }
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.(id);
  };

  const getEmoji = () => {
    if (voucherType === 'free_item') {
      if (title.toLowerCase().includes('coffee') || title.toLowerCase().includes('drink') || title.toLowerCase().includes('latte')) {
        return '☕';
      }
      if (title.toLowerCase().includes('cake') || title.toLowerCase().includes('birthday')) {
        return '🎂';
      }
      if (title.toLowerCase().includes('snack') || title.toLowerCase().includes('food') || title.toLowerCase().includes('sandwich')) {
        return '🥪';
      }
      return '🎁';
    }
    if (voucherType === 'discount_amount' || voucherType === 'percentage_discount') {
      return '💰';
    }
    if (voucherType === 'merch') {
      return '👕';
    }
    return '🎫';
  };

  const getPriceLabel = () => {
    if (isEmployee) return 'FREE';
    if (pointsRequired === 0) return 'FREE';
    return `${pointsRequired} pts`;
  };

  // Featured variant - larger card with use now button
  if (variant === 'featured') {
    return (
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        {/* Image */}
        <div
          className="h-28 w-full bg-stone-100 bg-cover bg-center relative"
          style={{
            backgroundImage: imageUrl
              ? `url(${imageUrl})`
              : undefined
          }}
        >
          {!imageUrl && (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-[40px]">{getEmoji()}</span>
            </div>
          )}
          {/* Expiry badge */}
          {isExpiringSoon && daysUntilExpiry !== null && (
            <div className="absolute top-2 left-2">
              <ExpiryBadge daysUntilExpiry={daysUntilExpiry} />
            </div>
          )}
          {/* Favorite button */}
          {onToggleFavorite && (
            <button
              onClick={handleFavoriteClick}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center transition-transform active:scale-90"
            >
              <Heart
                className={`w-4 h-4 ${isFavorite ? 'fill-error text-error' : 'text-stone-400'}`}
              />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <div>
            <p className="text-base font-semibold text-text-primary">
              {title}
            </p>
            <p className="text-sm text-text-tertiary mt-1 line-clamp-2">
              {description}
            </p>
          </div>
          {onUseNow && (
            <button
              onClick={onUseNow}
              className="w-full bg-stone-900 text-white py-3 rounded-xl font-medium text-sm active:bg-stone-800 transition-colors"
            >
              Use Now
            </button>
          )}
        </div>
      </div>
    );
  }

  // List variant - horizontal layout
  if (variant === 'list') {
    return (
      <button
        onClick={handleClick}
        className="w-full bg-white rounded-xl border border-stone-200 overflow-hidden text-left active:scale-[0.99] transition-transform flex"
      >
        {/* Image */}
        <div className="w-24 h-24 bg-stone-100 flex-shrink-0 relative">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-[32px]">{getEmoji()}</span>
            </div>
          )}
          {/* Expiry indicator for list */}
          {isExpiringSoon && daysUntilExpiry !== null && daysUntilExpiry <= 3 && (
            <div className="absolute bottom-1 left-1">
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-error rounded text-[9px] text-white font-medium">
                <Flame className="w-2.5 h-2.5" />
                {daysUntilExpiry}d
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3 flex-1 flex flex-col justify-center">
          <p className="text-sm font-semibold text-text-primary line-clamp-1">
            {title}
          </p>
          <p className="text-xs text-text-tertiary line-clamp-1 mt-0.5">
            {description}
          </p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm font-semibold text-text-primary">
              {getPriceLabel()}
            </span>
            {maxPerDay && remainingToday !== undefined && (
              <span className="text-xs text-text-muted">
                {remainingToday}/{maxPerDay} left
              </span>
            )}
          </div>
        </div>

        {/* Favorite button */}
        {onToggleFavorite && (
          <div className="flex items-center pr-3">
            <button
              onClick={handleFavoriteClick}
              className="w-8 h-8 rounded-full flex items-center justify-center"
            >
              <Heart
                className={`w-4 h-4 ${isFavorite ? 'fill-error text-error' : 'text-stone-300'}`}
              />
            </button>
          </div>
        )}
      </button>
    );
  }

  // Grid variant (default) - standard card for 2-column grid
  return (
    <button
      onClick={handleClick}
      className="w-full bg-white rounded-xl border border-stone-200 overflow-hidden text-left active:scale-[0.99] transition-transform"
    >
      {/* Image */}
      <div className="relative w-full aspect-[4/3] bg-stone-100">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-[40px]">{getEmoji()}</span>
          </div>
        )}

        {/* Top badges row */}
        <div className="absolute top-2 left-2 right-2 flex items-start justify-between">
          {/* Expiry badge on left */}
          {isExpiringSoon && daysUntilExpiry !== null ? (
            <ExpiryBadge daysUntilExpiry={daysUntilExpiry} />
          ) : (
            <div /> // Spacer
          )}

          {/* Featured badge or favorite button on right */}
          <div className="flex items-center gap-1.5">
            {isFeatured && (
              <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-md text-[10px] font-semibold text-white">
                <Star className="w-3 h-3 fill-current" />
                Featured
              </div>
            )}
            {onToggleFavorite && (
              <button
                onClick={handleFavoriteClick}
                className="w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center transition-transform active:scale-90"
              >
                <Heart
                  className={`w-3.5 h-3.5 ${isFavorite ? 'fill-error text-error' : 'text-stone-400'}`}
                />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content - 16px padding */}
      <div className="p-4">
        <h3 className="text-sm font-semibold text-text-primary line-clamp-1">
          {title}
        </h3>
        <p className="text-xs text-text-tertiary line-clamp-1 mt-1">
          {description}
        </p>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1">
            {pointsRequired > 0 && !isEmployee && (
              <Star className="w-3.5 h-3.5 text-accent fill-accent" />
            )}
            <span className="text-sm font-semibold text-text-primary">
              {getPriceLabel()}
            </span>
          </div>
          {maxPerDay && remainingToday !== undefined && (
            <span className="text-xs text-text-muted">
              {remainingToday}/{maxPerDay} left
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export default VoucherCard;
