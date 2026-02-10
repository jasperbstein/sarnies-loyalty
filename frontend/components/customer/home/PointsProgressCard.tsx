/**
 * PointsProgressCard - Points Display with Tier Progress
 * Sarnies Design System v2.0
 *
 * Shows current points, tier badge, and progress to next tier
 * Tier thresholds are fetched from the API
 */

import React, { useEffect, useState } from "react";
import { settingsAPI } from "@/lib/api";
import { useCountUp } from "@/hooks/useCountUp";

interface PointsProgressCardProps {
  points: number;
  nextRewardAt: number;
  tier?: string;
  nextTier?: string;
}

interface TierThresholds {
  bronze: number;
  silver: number;
  gold: number;
  platinum: number;
}

// Default tier thresholds (fallback if API fails)
const DEFAULT_TIER_THRESHOLDS: TierThresholds = {
  bronze: 0,
  silver: 1000,
  gold: 2000,
  platinum: 3000,
};

// Cache for tier thresholds to avoid repeated API calls
let cachedThresholds: TierThresholds | null = null;

function getTierInfo(points: number, thresholds: TierThresholds) {
  if (points >= thresholds.platinum) {
    return { current: 'Platinum', next: null, nextAt: null, progress: 1 };
  } else if (points >= thresholds.gold) {
    return {
      current: 'Gold',
      next: 'Platinum',
      nextAt: thresholds.platinum,
      progress: (points - thresholds.gold) / (thresholds.platinum - thresholds.gold)
    };
  } else if (points >= thresholds.silver) {
    return {
      current: 'Silver',
      next: 'Gold',
      nextAt: thresholds.gold,
      progress: (points - thresholds.silver) / (thresholds.gold - thresholds.silver)
    };
  } else {
    return {
      current: 'Bronze',
      next: 'Silver',
      nextAt: thresholds.silver,
      progress: thresholds.silver > 0 ? points / thresholds.silver : 0
    };
  }
}

export const PointsProgressCard: React.FC<PointsProgressCardProps> = ({
  points,
  nextRewardAt,
  tier,
  nextTier,
}) => {
  const [thresholds, setThresholds] = useState<TierThresholds>(
    cachedThresholds || DEFAULT_TIER_THRESHOLDS
  );

  useEffect(() => {
    // If we already have cached thresholds, don't fetch again
    if (cachedThresholds) return;

    const fetchThresholds = async () => {
      try {
        const response = await settingsAPI.getTiers();
        const data = response.data as TierThresholds;
        cachedThresholds = data;
        setThresholds(data);
      } catch (error) {
        console.error('Failed to fetch tier thresholds, using defaults:', error);
        // Keep using default thresholds on error
      }
    };

    fetchThresholds();
  }, []);

  const tierInfo = getTierInfo(points, thresholds);
  const displayTier = tier || tierInfo.current;
  const displayNextTier = nextTier || tierInfo.next;
  const nextTierAt = tierInfo.nextAt || nextRewardAt;
  const progress = tierInfo.progress;
  const animatedPoints = useCountUp(points);

  const getTierBadgeStyles = (t: string) => {
    switch (t) {
      case 'Platinum': return 'bg-stone-800 text-white';
      case 'Gold': return 'bg-amber-100 text-amber-700';
      case 'Silver': return 'bg-stone-200 text-stone-700';
      case 'Bronze':
      default: return 'bg-amber-50 text-amber-600';
    }
  };

  return (
    <div
      className="w-full bg-white rounded-md p-4"
      style={{
        boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(28,25,23,0.08)',
        border: '1px solid #E8E5E1'
      }}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-label">
          YOUR POINTS
        </span>
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${getTierBadgeStyles(displayTier)}`}>
          {displayTier}
        </span>
      </div>

      {/* Points Value + Progress inline */}
      <div className="flex items-end justify-between mb-2">
        <p className="text-3xl font-semibold text-text-primary tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {animatedPoints.toLocaleString()}
        </p>
        {displayNextTier && nextTierAt && (
          <span className="text-[11px] font-medium text-text-tertiary pb-1">
            {(nextTierAt - points).toLocaleString()} to {displayNextTier}
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="h-2 rounded-full bg-stone-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 progress-bar-shimmer ${progress > 0.9 ? 'progress-glow' : ''}`}
          style={{
            width: `${Math.min(progress * 100, 100)}%`,
            background: 'linear-gradient(90deg, #DC2626, #EF4444, #DC2626)',
          }}
        />
      </div>
    </div>
  );
};
