'use client';

import { AlertTriangle, X, Calendar } from 'lucide-react';
import { useState } from 'react';

interface PointsExpirationWarningProps {
  pointsBalance: number;
  lastActivityDate: string | null;
  expiryMonths?: number; // Default 12
  warningMonths?: number; // Default 11
  onDismiss?: () => void;
}

export default function PointsExpirationWarning({
  pointsBalance,
  lastActivityDate,
  expiryMonths = 12,
  warningMonths = 11,
  onDismiss
}: PointsExpirationWarningProps) {
  const [dismissed, setDismissed] = useState(false);

  // Don't show if no points
  if (!pointsBalance || pointsBalance <= 0) return null;

  // Don't show if no last activity date
  if (!lastActivityDate) return null;

  // Calculate months since last activity
  const lastActivity = new Date(lastActivityDate);
  const now = new Date();
  const monthsDiff = (now.getFullYear() - lastActivity.getFullYear()) * 12 +
                     (now.getMonth() - lastActivity.getMonth());

  // Don't show if activity is recent (not in warning period yet)
  if (monthsDiff < warningMonths) return null;

  // Don't show if dismissed
  if (dismissed) return null;

  // Calculate expiry date
  const expiryDate = new Date(lastActivity);
  expiryDate.setMonth(expiryDate.getMonth() + expiryMonths);

  // Calculate days remaining
  const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // If already expired, don't show warning (points should be 0)
  if (daysRemaining <= 0) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const isUrgent = daysRemaining <= 7;
  const isCritical = daysRemaining <= 3;

  return (
    <div className={`
      relative rounded-xl p-4 mb-4
      ${isCritical
        ? 'bg-red-50 border border-red-200'
        : isUrgent
          ? 'bg-orange-50 border border-orange-200'
          : 'bg-amber-50 border border-amber-200'
      }
    `}>
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 rounded-full hover:bg-black/5 transition-colors"
      >
        <X className="w-4 h-4 text-gray-400" />
      </button>

      <div className="flex gap-3">
        {/* Icon */}
        <div className={`
          flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
          ${isCritical
            ? 'bg-red-100'
            : isUrgent
              ? 'bg-orange-100'
              : 'bg-amber-100'
          }
        `}>
          <AlertTriangle className={`
            w-5 h-5
            ${isCritical
              ? 'text-red-600'
              : isUrgent
                ? 'text-orange-600'
                : 'text-amber-600'
            }
          `} />
        </div>

        {/* Content */}
        <div className="flex-1 pr-6">
          <h3 className={`
            text-sm font-semibold mb-1
            ${isCritical
              ? 'text-red-800'
              : isUrgent
                ? 'text-orange-800'
                : 'text-amber-800'
            }
          `}>
            {isCritical
              ? 'Points Expiring Very Soon!'
              : isUrgent
                ? 'Points Expiring Soon'
                : 'Points Expiration Warning'
            }
          </h3>

          <p className={`
            text-sm mb-2
            ${isCritical
              ? 'text-red-700'
              : isUrgent
                ? 'text-orange-700'
                : 'text-amber-700'
            }
          `}>
            Your <span className="font-bold">{pointsBalance.toLocaleString()} points</span> will expire
            {daysRemaining === 1
              ? ' tomorrow'
              : ` in ${daysRemaining} days`
            } due to inactivity.
          </p>

          <div className={`
            flex items-center gap-1.5 text-xs
            ${isCritical
              ? 'text-red-600'
              : isUrgent
                ? 'text-orange-600'
                : 'text-amber-600'
            }
          `}>
            <Calendar className="w-3.5 h-3.5" />
            <span>Expires: {expiryDate.toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}</span>
          </div>

          <p className={`
            text-xs mt-2
            ${isCritical
              ? 'text-red-600'
              : isUrgent
                ? 'text-orange-600'
                : 'text-amber-600'
            }
          `}>
            Make a purchase or redeem a voucher to keep your points!
          </p>
        </div>
      </div>
    </div>
  );
}
