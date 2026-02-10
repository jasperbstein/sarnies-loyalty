'use client';

import React, { useState } from 'react';
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
 * - Image aspect ratio: 3:2
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
  // Expiry props
  expiresAt?: string | Date;
  expiryType?: string;
  expiryDays?: number;
  // Favorites
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
  expiryType,
  expiryDays,
  isFavorite = false,
  onToggleFavorite,
}: VoucherCardProps) {
  const router = useRouter();
  const daysUntilExpiry = getDaysUntilExpiry(expiresAt);
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 7;
  const hasExpiry = expiryType && expiryType !== 'no_expiry';

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

  const getFallbackImage = () => {
    const lowerTitle = title.toLowerCase();
    if (voucherType === 'merch') return '/images/content/vouchers/merch.jpg';
    if (voucherType === 'discount_amount' || voucherType === 'percentage_discount')
      return '/images/content/vouchers/coffee-beans.jpg';
    if (voucherType === 'free_item') {
      if (lowerTitle.includes('coffee') || lowerTitle.includes('drink') || lowerTitle.includes('latte') || lowerTitle.includes('espresso'))
        return '/images/content/vouchers/coffee.jpg';
      if (lowerTitle.includes('pastry') || lowerTitle.includes('cake') || lowerTitle.includes('croissant') || lowerTitle.includes('birthday'))
        return '/images/content/vouchers/pastry.jpg';
      return '/images/content/vouchers/bakery.jpg';
    }
    return '/images/content/vouchers/bakery.jpg';
  };

  const resolvedImage = imageUrl || getFallbackImage();
  const [imageLoaded, setImageLoaded] = useState(false);

  const getPriceLabel = () => {
    if (isEmployee) return 'PERK';
    if (pointsRequired === 0) return 'FREE';
    return `${pointsRequired} pts`;
  };

  // Featured variant - larger card with use now button
  if (variant === 'featured') {
    return (
      <div className="card overflow-hidden border-t-2 border-t-red-500">
        {/* Image */}
        <div className="h-36 w-full bg-stone-100 relative">
          <Image
            src={resolvedImage}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 300px"
          />
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
                className={`w-4 h-4 ${isFavorite ? 'fill-error text-error' : 'text-text-tertiary'}`}
              />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-2">
          <div>
            <p className="text-sm font-semibold text-text-primary">
              {title}
            </p>
            <p className="text-xs text-text-tertiary mt-0.5 line-clamp-2 leading-relaxed">
              {description}
            </p>
          </div>
          {onUseNow && (
            <button
              onClick={onUseNow}
              className="btn-primary w-full py-2.5 rounded-lg text-xs"
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
        className="w-full card overflow-hidden text-left hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ease-smooth active:scale-[0.99] flex"
      >
        {/* Image */}
        <div className={`w-20 h-20 flex-shrink-0 relative bg-stone-100 img-shimmer-container ${imageLoaded ? 'loaded' : ''}`}>
          <Image
            src={resolvedImage}
            alt={title}
            fill
            className="object-cover"
            sizes="96px"
            onLoad={() => setImageLoaded(true)}
          />
          {/* Expiry indicator for list */}
          {isExpiringSoon && daysUntilExpiry !== null && daysUntilExpiry <= 3 && (
            <div className="absolute bottom-1 left-1">
              <div className="badge-expiry text-[9px]">
                <Flame className="w-2.5 h-2.5 mr-0.5" />
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
          <p className="text-[11px] text-text-tertiary line-clamp-1 mt-0.5 leading-relaxed">
            {description}
          </p>
          <div className="flex items-center justify-between mt-1.5">
            {getPriceLabel() === 'FREE' || getPriceLabel() === 'PERK' ? (
              <span className="badge-free">{getPriceLabel()}</span>
            ) : (
              <span className="text-xs font-semibold text-text-primary">
                {getPriceLabel()}
              </span>
            )}
            {maxPerDay && remainingToday !== undefined && (
              <span className="text-[10px] text-text-tertiary">
                {remainingToday}/{maxPerDay}
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
                className={`w-4 h-4 ${isFavorite ? 'fill-error text-error' : 'text-text-tertiary'}`}
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
      className="w-full card overflow-hidden text-left hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ease-smooth active:scale-[0.99]"
    >
      {/* Image */}
      <div className={`relative w-full aspect-[3/2] bg-stone-100 img-shimmer-container ${imageLoaded ? 'loaded' : ''}`}>
        <Image
          src={resolvedImage}
          alt={title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 50vw, 300px"
          onLoad={() => setImageLoaded(true)}
        />

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
              <div className="badge-solid-accent text-[10px]">
                <Star className="w-3 h-3 fill-current mr-0.5" />
                Featured
              </div>
            )}
            {onToggleFavorite && (
              <button
                onClick={handleFavoriteClick}
                className="w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center transition-transform active:scale-90"
              >
                <Heart
                  className={`w-3.5 h-3.5 ${isFavorite ? 'fill-error text-error' : 'text-text-tertiary'}`}
                />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="text-xs font-semibold text-text-primary line-clamp-1">
          {title}
        </h3>
        <p className="text-[11px] text-text-tertiary line-clamp-2 mt-0.5 leading-relaxed">
          {description}
        </p>
        <div className="flex items-center justify-between mt-1.5">
          <div className="flex items-center gap-1">
            {getPriceLabel() === 'FREE' || getPriceLabel() === 'PERK' ? (
              <span className="badge-free">{getPriceLabel()}</span>
            ) : (
              <>
                <Star className="w-3 h-3 text-accent fill-accent" />
                <span className="text-xs font-bold text-text-primary">
                  {getPriceLabel()}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {hasExpiry && expiryDays && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-text-tertiary">
                <Clock className="w-2.5 h-2.5" />
                {expiryDays}d
              </span>
            )}
            {maxPerDay && remainingToday !== undefined && (
              <span className="text-[10px] text-text-tertiary">
                {remainingToday}/{maxPerDay}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

export default VoucherCard;
