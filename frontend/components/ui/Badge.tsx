'use client';

/**
 * Badge Component
 * Sarnies Design System v2.0
 *
 * Versatile badge/tag component for status, labels, and categories.
 */

import React from 'react';
import { Clock, AlertTriangle, CheckCircle, XCircle, Star, Flame } from 'lucide-react';

type BadgeVariant =
  // Status badges
  | 'active'
  | 'pending'
  | 'used'
  | 'expired'
  | 'featured'
  // Semantic badges
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral'
  // Solid variants
  | 'solid-accent'
  | 'solid-success'
  | 'solid-error'
  // Outline variants
  | 'outline'
  | 'outline-success'
  | 'outline-warning'
  | 'outline-error'
  // Special badges
  | 'expiry'
  | 'points'
  // Voucher types
  | 'freeItem'
  | 'discount'
  | 'promotion'
  // Legacy (backwards compatibility)
  | 'default'
  | 'primary'
  | 'danger'
  | 'statusActive'
  | 'statusInactive';

type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  label?: string;
  children?: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
  showIcon?: boolean;
  className?: string;
  // For expiry badge
  daysUntilExpiry?: number;
}

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'h-5 px-2 text-[10px]',
  md: 'h-[22px] px-2.5 text-xs',
  lg: 'h-7 px-3 text-sm',
};

const variantConfig: Record<
  BadgeVariant,
  { bg: string; text: string; border?: string; icon?: React.ReactNode }
> = {
  // Status badges
  active: {
    bg: 'bg-success-light',
    text: 'text-success',
    border: 'border border-success/20',
    icon: <CheckCircle className="w-3 h-3" />,
  },
  pending: {
    bg: 'bg-warning-light',
    text: 'text-warning',
    border: 'border border-warning/20',
    icon: <Clock className="w-3 h-3" />,
  },
  used: {
    bg: 'bg-stone-100',
    text: 'text-stone-500',
    border: 'border border-stone-200',
    icon: <CheckCircle className="w-3 h-3" />,
  },
  expired: {
    bg: 'bg-error-light',
    text: 'text-error',
    border: 'border border-error/20',
    icon: <XCircle className="w-3 h-3" />,
  },
  featured: {
    bg: 'bg-gradient-to-r from-amber-500 to-orange-500',
    text: 'text-white',
    icon: <Star className="w-3 h-3 fill-current" />,
  },

  // Semantic badges
  success: {
    bg: 'bg-success-light',
    text: 'text-success',
  },
  warning: {
    bg: 'bg-warning-light',
    text: 'text-warning',
  },
  error: {
    bg: 'bg-error-light',
    text: 'text-error',
  },
  info: {
    bg: 'bg-info-light',
    text: 'text-info',
  },
  neutral: {
    bg: 'bg-stone-100',
    text: 'text-stone-600',
  },

  // Solid variants
  'solid-accent': {
    bg: 'bg-accent',
    text: 'text-white',
  },
  'solid-success': {
    bg: 'bg-success',
    text: 'text-white',
  },
  'solid-error': {
    bg: 'bg-error',
    text: 'text-white',
  },

  // Outline variants
  outline: {
    bg: 'bg-transparent',
    text: 'text-text-secondary',
    border: 'border border-current',
  },
  'outline-success': {
    bg: 'bg-transparent',
    text: 'text-success',
    border: 'border border-success',
  },
  'outline-warning': {
    bg: 'bg-transparent',
    text: 'text-warning',
    border: 'border border-warning',
  },
  'outline-error': {
    bg: 'bg-transparent',
    text: 'text-error',
    border: 'border border-error',
  },

  // Special badges
  expiry: {
    bg: 'bg-gradient-to-r from-error to-red-700',
    text: 'text-white',
    icon: <Flame className="w-3 h-3" />,
  },
  points: {
    bg: 'bg-accent-muted',
    text: 'text-accent',
    icon: <Star className="w-3 h-3 fill-current" />,
  },

  // Voucher types
  freeItem: {
    bg: 'bg-info-light',
    text: 'text-info',
  },
  discount: {
    bg: 'bg-warning-light',
    text: 'text-warning',
  },
  promotion: {
    bg: 'bg-success-light',
    text: 'text-success',
  },

  // Legacy (backwards compatibility)
  default: {
    bg: 'bg-stone-100',
    text: 'text-stone-600',
  },
  primary: {
    bg: 'bg-info-light',
    text: 'text-info',
  },
  danger: {
    bg: 'bg-error-light',
    text: 'text-error',
  },
  statusActive: {
    bg: '',
    text: '',
  },
  statusInactive: {
    bg: '',
    text: '',
  },
};

export const Badge: React.FC<BadgeProps> = ({
  label,
  children,
  variant = 'neutral',
  size = 'md',
  icon,
  showIcon = false,
  className = '',
  daysUntilExpiry,
}) => {
  const content = label || children;
  const config = variantConfig[variant];
  const sizeClass = sizeClasses[size];

  // Handle status dot variants (legacy)
  if (variant === 'statusActive' || variant === 'statusInactive') {
    const isActive = variant === 'statusActive';
    return (
      <span className={`inline-flex items-center text-sm font-medium ${className}`}>
        <span
          className={`inline-block w-2 h-2 rounded-full mr-2 ${
            isActive ? 'bg-success shadow-sm shadow-success/30' : 'bg-stone-300'
          }`}
        />
        <span className={isActive ? 'text-text-primary' : 'text-text-tertiary'}>
          {content}
        </span>
      </span>
    );
  }

  // Special handling for expiry badge with days
  if (variant === 'expiry' && daysUntilExpiry !== undefined) {
    const urgencyText =
      daysUntilExpiry <= 1
        ? 'Expires today!'
        : daysUntilExpiry <= 3
        ? `${daysUntilExpiry}d left`
        : `${daysUntilExpiry} days`;

    return (
      <span
        className={`
          inline-flex items-center gap-1 rounded-full font-semibold uppercase tracking-wide
          ${sizeClass}
          ${config.bg}
          ${config.text}
          animate-pulse
          ${className}
        `}
      >
        <Flame className="w-3 h-3" />
        {urgencyText}
      </span>
    );
  }

  const displayIcon = icon || (showIcon && config.icon);

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full font-semibold uppercase tracking-wide
        ${sizeClass}
        ${config.bg}
        ${config.text}
        ${config.border || ''}
        ${className}
      `}
    >
      {displayIcon}
      {content}
    </span>
  );
};

// Convenience components for common badge types
export const StatusBadge: React.FC<{
  status: 'active' | 'pending' | 'used' | 'expired';
  label?: string;
  className?: string;
}> = ({ status, label, className }) => {
  const defaultLabels = {
    active: 'Active',
    pending: 'Pending',
    used: 'Used',
    expired: 'Expired',
  };

  return (
    <Badge
      variant={status}
      label={label || defaultLabels[status]}
      showIcon
      className={className}
    />
  );
};

export const ExpiryBadge: React.FC<{
  daysUntilExpiry: number;
  className?: string;
}> = ({ daysUntilExpiry, className }) => {
  // Only show for items expiring within 7 days
  if (daysUntilExpiry > 7) return null;

  return (
    <Badge variant="expiry" daysUntilExpiry={daysUntilExpiry} className={className} />
  );
};

export const PointsBadge: React.FC<{
  points: number;
  className?: string;
}> = ({ points, className }) => {
  return (
    <Badge variant="points" showIcon className={className}>
      {points} pts
    </Badge>
  );
};

export default Badge;
